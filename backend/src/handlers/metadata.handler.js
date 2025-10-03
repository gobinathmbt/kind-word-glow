// metadata.handler.js - Metadata namespace socket handlers
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const MasterAdmin = require("../models/MasterAdmin");
const Env_Configuration = require("../config/env");
const { v4: uuidv4 } = require("uuid");
const { logEvent } = require("../controllers/logs.controller");
const VehicleMetadata = require("../models/VehicleMetadata");
const Make = require("../models/Make");
const Model = require("../models/Model");
const Variant = require("../models/Variant");
const Body = require("../models/Body");
const VariantYear = require("../models/VariantYear");

const metaConnectedUsers = new Map();
const activeBulkOperations = new Map(); // Track active operations by socket ID

// Batch processing configuration
const BATCH_SIZE = 100;
const BATCH_DELAY = 200; // Reduced delay for better performance

// Transform display name to display value
const transformToDisplayValue = (text) => {
  console.log("Transforming to display value:", text);
  if (text === null || text === undefined) return "";

  // If it's a number, just return as a string
  if (typeof text === "number") {
    return String(text);
  }

  // Otherwise, transform string as before
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .trim();
};

// Data type conversion helpers
const convertToType = (value, targetType, fieldName) => {
  if (value === null || value === undefined || value === "") return null;

  try {
    switch (targetType) {
      case "Number":
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      case "Integer":
        const int = parseInt(value);
        return isNaN(int) ? null : int;
      case "Boolean":
        if (typeof value === "boolean") return value;
        return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
      case "String":
        return String(value).trim();
      case "Date":
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      default:
        return value;
    }
  } catch (error) {
    console.warn(
      `Failed to convert ${fieldName}: ${value} to ${targetType}`,
      error
    );
    return null;
  }
};

// Enhanced create/update helper
const createOrUpdateEntry = async (Model, findCriteria, data, options = {}) => {
  try {
    const existing = await Model.findOne(findCriteria);
    if (existing) {
      if (options.updateExisting !== false) {
        Object.assign(existing, data);
        await existing.save();
      }
      return existing;
    }

    const newEntry = new Model(data);
    await newEntry.save();
    return newEntry;
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Model.findOne(findCriteria);
      if (existing) return existing;
    }
    throw error;
  }
};

// Process batch with proper error handling and sequencing
const processBatchWithSocket = async (
  socketId,
  batch,
  fieldMapping,
  dataTypes,
  customFieldTypes,
  options,
  batchInfo,
  metaIO
) => {
  const { batchId, user, batchNumber, totalBatches } = options;
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (!metaIO) {
    throw new Error("MetaIO instance not initialized");
  }

  console.log(
    `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`
  );

  // Send batch start notification
  metaIO.to(socketId).emit("batch_start", {
    batchId,
    batchNumber,
    totalBatches,
    recordsInBatch: batch.length,
  });

  for (let index = 0; index < batch.length; index++) {
    const item = batch[index];

    try {
      // Check if operation was cancelled
      const operation = activeBulkOperations.get(socketId);
      if (!operation || operation.status === "cancelled") {
        console.log(`Operation cancelled, stopping batch ${batchNumber}`);
        break;
      }

      // Validate required fields
      const makeName = item[fieldMapping.make];
      const modelName = item[fieldMapping.model];

      if (!makeName || !modelName) {
        results.skipped++;
        results.processed++;
        continue;
      }

      // Process make
      const make = await createOrUpdateEntry(
        Make,
        { displayValue: transformToDisplayValue(makeName) },
        {
          displayName: makeName,
          displayValue: transformToDisplayValue(makeName),
          isActive: true,
        },
        { updateExisting: options.updateExisting }
      );

      // Process model
      const model = await createOrUpdateEntry(
        Model,
        {
          make: make._id,
          displayValue: transformToDisplayValue(modelName),
        },
        {
          displayName: modelName,
          displayValue: transformToDisplayValue(modelName),
          make: make._id,
          isActive: true,
        },
        { updateExisting: options.updateExisting }
      );

      // Process optional variant
      let variant = null;
      if (fieldMapping.variant && item[fieldMapping.variant]) {
        const variantName = item[fieldMapping.variant];

        // Check if variant exists
        let existingVariant = await Variant.findOne({
          displayValue: transformToDisplayValue(variantName),
        });

        if (existingVariant) {
          // Check if this model is already associated with the variant
          if (!existingVariant.models.includes(model._id)) {
            existingVariant.models.push(model._id);
            await existingVariant.save();
          }
          variant = existingVariant;
        } else {
          // Create new variant with this model
          variant = await Variant.create({
            displayName: variantName,
            displayValue: transformToDisplayValue(variantName),
            models: [model._id],
            isActive: true,
          });
        }
      }

      // Process optional body
      let body = null;
      if (fieldMapping.body && item[fieldMapping.body]) {
        const bodyName = item[fieldMapping.body];
        body = await createOrUpdateEntry(
          Body,
          { displayValue: transformToDisplayValue(bodyName) },
          {
            displayName: bodyName,
            displayValue: transformToDisplayValue(bodyName),
            isActive: true,
          },
          { updateExisting: options.updateExisting }
        );
      }

      // Process optional variant year
      // Process optional variant year
      let variantYear = null;
      if (fieldMapping.year && item[fieldMapping.year]) {
        const yearValue = convertToType(
          item[fieldMapping.year],
          "Integer",
          "year"
        );

        if (
          yearValue &&
          yearValue >= 1900 &&
          yearValue <= new Date().getFullYear() + 2
        ) {
          // Always require model
          const yearData = {
            year: yearValue,
            displayName: yearValue.toString(),
            displayValue: transformToDisplayValue(yearValue.toString()),
            model: model._id, // <-- Always include model
            isActive: true,
          };

          // Add variant if available
          if (variant) {
            yearData.variant = variant._id;
          }

          // Lookup criteria
          const findCriteria = {
            year: yearValue,
            model: model._id,
          };
          if (variant) {
            findCriteria.variant = variant._id;
          }

          // Find or create VariantYear
          const existingYear = await VariantYear.findOne(findCriteria);
          if (!existingYear) {
            variantYear = await VariantYear.create(yearData);
          } else if (options.updateExisting !== false) {
            Object.assign(existingYear, yearData);
            await existingYear.save();
            variantYear = existingYear;
          } else {
            variantYear = existingYear;
          }
        }
      }

      // Process standard fields with type conversion
      const standardFields = {};
      const standardFieldMap = {
        fuelType: dataTypes?.fuelType || "String",
        transmission: dataTypes?.transmission || "String",
        engineCapacity: dataTypes?.engineCapacity || "String",
        power: dataTypes?.power || "String",
        torque: dataTypes?.torque || "String",
        seatingCapacity: "Integer",
      };

      Object.keys(standardFieldMap).forEach((field) => {
        if (fieldMapping[field] && item[fieldMapping[field]]) {
          const value = convertToType(
            item[fieldMapping[field]],
            standardFieldMap[field],
            field
          );
          if (value !== null) {
            standardFields[field] = value;
          }
        }
      });

      // Process custom fields
      const customFields = {};
      if (fieldMapping.customFields) {
        Object.keys(fieldMapping.customFields).forEach((customField) => {
          const sourceField = fieldMapping.customFields[customField];
          if (
            item[sourceField] !== undefined &&
            item[sourceField] !== null &&
            item[sourceField] !== ""
          ) {
            const targetType = customFieldTypes?.[customField] || "String";
            const value = convertToType(
              item[sourceField],
              targetType,
              customField
            );
            if (value !== null) {
              customFields[customField] = value;
            }
          }
        });
      }

      // Generate tags for better searchability
      const tags = [
        make.displayName.toLowerCase(),
        model.displayName.toLowerCase(),
        variant?.displayName?.toLowerCase(),
        body?.displayName?.toLowerCase(),
        variantYear?.year?.toString(),
        standardFields.fuelType?.toLowerCase(),
        standardFields.transmission?.toLowerCase(),
      ].filter(Boolean);

      // Create metadata object
      const metadataObj = {
        make: make._id,
        model: model._id,
        variant: variant?._id || null,
        body: body?._id || null,
        variantYear: variantYear?._id || null,
        ...standardFields,
        customFields:
          Object.keys(customFields).length > 0 ? customFields : undefined,
        tags,
        source: "bulk_upload",
        batchId,
        batchNumber,
        isActive: true,
      };

      // Clean up undefined fields
      Object.keys(metadataObj).forEach((key) => {
        if (metadataObj[key] === undefined) {
          delete metadataObj[key];
        }
      });

      // Check for existing metadata with same core attributes
      const filter = {
        make: make._id,
        model: model._id,
        variant: variant?._id || null,
        body: body?._id || null,
        variantYear: variantYear?._id || null,
      };

      const existingMetadata = await VehicleMetadata.findOne(filter);

      if (existingMetadata) {
        if (options.updateExisting !== false) {
          Object.assign(existingMetadata, metadataObj);
          await existingMetadata.save();
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await VehicleMetadata.create(metadataObj);
        results.created++;
      }

      results.processed++;

      // Send progress update for every 10 records within batch
      if (results.processed % 10 === 0) {
        metaIO.to(socketId).emit("batch_progress", {
          batchId,
          batchNumber,
          totalBatches,
          recordsProcessed: results.processed,
          totalRecordsInBatch: batch.length,
          progressInBatch: Math.round((results.processed / batch.length) * 100),
        });
      }
    } catch (error) {
      console.error(
        `Error processing item ${index} in batch ${batchNumber}:`,
        error
      );
      results.errors.push({
        batchNumber,
        row: index,
        item: item,
        error: error.message,
      });

      // Continue processing other records
      results.processed++;
    }
  }

  console.log(
    `Batch ${batchNumber}/${totalBatches} completed: ${results.processed} processed, ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`
  );

  return results;
};

// Metadata namespace authentication middleware
const metaAuthMiddleware = async (socket, next) => {
  console.log("Metadata socket authentication middleware triggered");
  try {
    const token = socket.handshake.auth.token;
    console.log(
      "Authenticating metadata socket with token:",
      token ? "present" : "missing"
    );
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, Env_Configuration.JWT_SECRET);
    console.log(
      `Metadata socket authentication attempt for user ID: ${decoded.id}, role: ${decoded.role}`
    );

    // Allow both master admin and company users for metadata operations
    if (decoded.role === "master_admin") {
      const user = await MasterAdmin.findById(decoded.id);
      if (!user) {
        return next(new Error("Master Admin not found"));
      }

      socket.user = {
        ...user.toObject(),
        type: "master",
        _id: user._id.toString(),
      };
    } else if (
      decoded.role === "company_super_admin" ||
      decoded.role === "company_admin"
    ) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Company user not found"));
      }

      socket.user = {
        ...user.toObject(),
        type: "company",
        _id: user._id.toString(),
        company_id: user.company_id.toString(),
      };
    } else {
      return next(
        new Error(
          "Unauthorized: Metadata operations restricted to company users and master admins"
        )
      );
    }

    next();
  } catch (error) {
    console.error("Metadata socket authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
};

// Initialize Metadata namespace handlers
const initializeMetaHandlers = (metaIO) => {
  console.log("Initializing Meta handlers with proper batch sequencing...");

  metaIO.on("connection", (socket) => {
    console.log(
      `Metadata User connected: ${
        socket.user.username || socket.user.first_name
      } (${socket.user.type}) - Socket ID: ${socket.id}`
    );

    // Add user to metadata connected users map
    const userKey = `meta_${socket.user.type}_${socket.user._id}`;
    metaConnectedUsers.set(userKey, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date(),
      online: true,
      namespace: "metadata",
    });

    // Join user to their personal metadata room
    const userRoom = `meta_${socket.user.type}_${socket.user._id}`;
    socket.join(userRoom);

    // Join company/master admin room for bulk operations
    if (socket.user.type === "company") {
      socket.join(`meta_company_${socket.user.company_id}`);
    } else if (socket.user.type === "master") {
      socket.join(`meta_master_admin`);
    }

    // Emit connection success
    socket.emit("meta_connected", {
      message: "Successfully connected to metadata server",
      user: {
        id: socket.user._id,
        name: socket.user.username || socket.user.name,
        type: socket.user.type,
      },
      namespace: "metadata",
    });

    // Bulk upload configuration handler
    socket.on("start_bulk_upload_config", async (configData) => {
      console.log("Received bulk upload configuration");

      const batchId = uuidv4();
      const {
        fieldMapping,
        dataTypes,
        customFieldTypes,
        options = {},
        totalRecords,
        totalBatches,
      } = configData;

      // Validate field mapping
      if (!fieldMapping.make || !fieldMapping.model) {
        socket.emit("upload_error", {
          message: "Make and model field mappings are required",
        });
        return;
      }

      // Store configuration for this upload
      activeBulkOperations.set(socket.id, {
        batchId,
        fieldMapping,
        dataTypes,
        customFieldTypes,
        options: {
          updateExisting: options.updateExisting !== false, // Default to true
          ...options,
        },
        totalRecords,
        totalBatches,
        processedBatches: 0,
        currentBatch: 0,
        startTime: new Date(),
        status: "initialized",
        results: {
          processed: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [],
        },
      });

      socket.emit("upload_started", {
        batchId,
        totalRecords,
        totalBatches,
        estimatedTime: Math.ceil(totalBatches * 2),
        message: "Upload configuration saved. Ready to process batches.",
      });
    });

    // Sequential batch processing handler
    socket.on("upload_batch", async (batchData) => {
      const { batchNumber, totalBatches, data: batch } = batchData;
      const operation = activeBulkOperations.get(socket.id);

      if (!operation) {
        console.log("No upload operation found for socket", socket.id);
        socket.emit("upload_error", {
          message:
            "No upload operation configured. Please start upload configuration first.",
          batchNumber,
        });
        return;
      }

      if (operation.status === "cancelled") {
        console.log(`Upload cancelled, ignoring batch ${batchNumber}`);
        return;
      }

      // Validate batch sequence to prevent duplicates
      if (batchNumber !== operation.currentBatch + 1) {
        console.log(
          `Batch sequence error: expected ${
            operation.currentBatch + 1
          }, received ${batchNumber}`
        );
        socket.emit("upload_error", {
          message: `Batch sequence error: expected batch ${
            operation.currentBatch + 1
          }, received ${batchNumber}`,
          batchNumber,
        });
        return;
      }

      // Validate batch data
      if (!Array.isArray(batch) || batch.length === 0) {
        socket.emit("upload_error", {
          message: "Invalid batch data: expected non-empty array",
          batchNumber,
        });
        return;
      }

      // Update operation status
      if (operation.status === "initialized") {
        operation.status = "processing";
      }

      operation.currentBatch = batchNumber;

      try {
        console.log(
          `Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`
        );

        // Process the batch
        const batchResults = await processBatchWithSocket(
          socket.id,
          batch,
          operation.fieldMapping,
          operation.dataTypes,
          operation.customFieldTypes,
          {
            ...operation.options,
            batchId: operation.batchId,
            user: socket.user,
            batchNumber,
            totalBatches,
          },
          {},
          metaIO
        );

        // Update overall results
        operation.results.processed += batchResults.processed;
        operation.results.created += batchResults.created;
        operation.results.updated += batchResults.updated;
        operation.results.skipped += batchResults.skipped;
        operation.results.errors.push(...batchResults.errors);
        operation.processedBatches = batchNumber;

        // Send progress update
        const overallProgress = Math.round((batchNumber / totalBatches) * 100);
        socket.emit("upload_progress", {
          batchId: operation.batchId,
          progress: overallProgress,
          currentBatch: batchNumber,
          totalBatches,
          results: {
            processed: operation.results.processed,
            created: operation.results.created,
            updated: operation.results.updated,
            skipped: operation.results.skipped,
            errors: operation.results.errors.length,
          },
          estimatedTimeRemaining: Math.ceil((totalBatches - batchNumber) * 2),
        });

        // Single batch completion notification
        socket.emit("batch_complete", {
          batchId: operation.batchId,
          batchNumber,
          totalBatches,
          results: {
            processed: batchResults.processed,
            created: batchResults.created,
            updated: batchResults.updated,
            skipped: batchResults.skipped,
            errors: batchResults.errors.length,
          },
        });

        // If this is the last batch, complete the upload
        if (batchNumber === totalBatches) {
          operation.status = "completed";
          operation.endTime = new Date();

          // Log the operation
          try {
            await logEvent({
              event_type: "meta_operation",
              event_action: "bulk_upload_completed",
              event_description: `Bulk uploaded ${operation.results.processed} vehicle metadata entries in ${totalBatches} batches`,
              user_id: socket.user._id,
              user_role: socket.user.role || socket.user.type,
              metadata: {
                batchId: operation.batchId,
                totalRecords: operation.totalRecords,
                results: operation.results,
              },
            });
          } catch (logError) {
            console.error("Error logging bulk upload completion:", logError);
          }

          // Send final completion notification
          socket.emit("upload_completed", {
            success: true,
            message: "Bulk upload completed successfully",
            data: operation.results,
            duration: operation.endTime - operation.startTime,
            summary: {
              totalRecords: operation.totalRecords,
              processed: operation.results.processed,
              created: operation.results.created,
              updated: operation.results.updated,
              skipped: operation.results.skipped,
              errors: operation.results.errors.length,
              successRate: Math.round(
                (operation.results.processed / operation.totalRecords) * 100
              ),
            },
          });

          // Clean up operation tracking after delay
          setTimeout(() => {
            activeBulkOperations.delete(socket.id);
          }, 30000);
        }
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);

        operation.status = "failed";
        operation.error = error.message;
        operation.endTime = new Date();

        socket.emit("upload_error", {
          message: `Error processing batch ${batchNumber}: ${error.message}`,
          error: error.message,
          batchNumber,
        });

        // Still emit batch complete for sequencing
        socket.emit("batch_complete", {
          batchId: operation.batchId,
          batchNumber,
          totalBatches,
          error: error.message,
          results: {
            processed: 0,
            created: 0,
            updated: 0,
            skipped: batch.length,
            errors: batch.length,
          },
        });
      }
    });

    // Handle upload cancellation
    socket.on("cancel_upload", (data) => {
      const { batchId } = data || {};
      const operation = activeBulkOperations.get(socket.id);

      if (operation && (!batchId || operation.batchId === batchId)) {
        operation.status = "cancelled";
        operation.endTime = new Date();

        socket.emit("upload_cancelled", {
          batchId: operation.batchId,
          message: "Upload cancelled by user",
          results: operation.results,
        });

        console.log(
          `Upload cancelled by user: ${socket.user.username}, batchId: ${operation.batchId}`
        );

        // Clean up after short delay
        setTimeout(() => {
          activeBulkOperations.delete(socket.id);
        }, 5000);
      } else {
        socket.emit("upload_error", {
          message: "No active upload found to cancel",
        });
      }
    });

    // Get upload status
    socket.on("get_upload_status", () => {
      const operation = activeBulkOperations.get(socket.id);
      socket.emit("upload_status", {
        hasActiveUpload: !!operation,
        operation: operation
          ? {
              batchId: operation.batchId,
              status: operation.status,
              currentBatch: operation.currentBatch,
              totalBatches: operation.totalBatches,
              results: operation.results,
              startTime: operation.startTime,
              endTime: operation.endTime,
            }
          : null,
      });
    });

    // Test connection
    socket.on("test_connection", () => {
      socket.emit("connection_test_result", {
        status: "success",
        timestamp: new Date(),
        user_id: socket.user._id,
        namespace: "metadata",
        message: "Connection test successful",
      });
    });

    // Heartbeat for long operations
    socket.on("heartbeat", () => {
      const operation = activeBulkOperations.get(socket.id);
      socket.emit("heartbeat_ack", {
        timestamp: new Date(),
        user_id: socket.user._id,
        hasActiveOperation: !!operation,
        operationStatus: operation?.status || null,
      });
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(
        `Metadata User disconnected: ${
          socket.user.username || socket.user.first_name
        } (${socket.user.type}) - ${reason}`
      );

      // Clean up active operations
      const operation = activeBulkOperations.get(socket.id);
      if (operation && operation.status === "processing") {
        operation.status = "disconnected";
        operation.endTime = new Date();
        console.log(`Marking upload as disconnected: ${operation.batchId}`);
      }

      // Update user status
      const userKey = `meta_${socket.user.type}_${socket.user._id}`;
      const userData = metaConnectedUsers.get(userKey);
      if (userData) {
        userData.online = false;
        userData.lastSeen = new Date();
        metaConnectedUsers.set(userKey, userData);
      }

      // Clean up after delay
      setTimeout(() => {
        activeBulkOperations.delete(socket.id);
        metaConnectedUsers.delete(userKey);
      }, 60000);

      socket.leaveAll();
    });
  });
};

module.exports = {
  initializeMetaHandlers,
  metaAuthMiddleware,
  metaConnectedUsers,
  activeBulkOperations,
  convertToType,
  createOrUpdateEntry,
  processBatchWithSocket,
  transformToDisplayValue,
  BATCH_SIZE,
  BATCH_DELAY,
};
