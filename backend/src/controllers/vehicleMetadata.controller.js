const Make = require("../models/Make");
const Model = require("../models/Model");
const Variant = require("../models/Variant");
const Body = require("../models/Body");
const VariantYear = require("../models/VariantYear");
const VehicleMetadata = require("../models/VehicleMetadata");

const createController = {
  // Universal create handler
  create: async (req, res) => {
    try {
      const { type } = req.params; // make, model, body, year, metadata
      const data = req.body;

      let result;
      let successMessage;

      switch (type) {
        case "make":
          result = await createOrUpdateEntry(
            Make,
            { displayValue: transformToDisplayValue(data.displayName) },
            {
              displayName: data.displayName,
              displayValue: transformToDisplayValue(data.displayName),
              isActive: data.isActive !== undefined ? data.isActive : true,
            }
          );
          successMessage = "Make created successfully";
          break;

        case "model":
          if (!data.displayName || !data.makeId) {
            return res.status(400).json({
              success: false,
              message: "Display name and make ID are required",
            });
          }
          result = await createOrUpdateEntry(
            Model,
            {
              make: data.makeId,
              displayValue: transformToDisplayValue(data.displayName),
            },
            {
              displayName: data.displayName,
              displayValue: transformToDisplayValue(data.displayName),
              make: data.makeId,
              isActive: data.isActive !== undefined ? data.isActive : true,
            }
          );
          await result.populate("make", "displayName displayValue");
          successMessage = "Model created successfully";
          break;

        case "variant":
          if (!data.displayName || !data.models || data.models.length === 0) {
            return res.status(400).json({
              success: false,
              message: "Display name and at least one model are required",
            });
          }
          result = await createOrUpdateEntry(
            Variant,
            { displayValue: transformToDisplayValue(data.displayName) },
            {
              displayName: data.displayName,
              displayValue: transformToDisplayValue(data.displayName),
              models: data.models,
              isActive: data.isActive !== undefined ? data.isActive : true,
            }
          );
          await result.populate("models", "displayName displayValue");
          successMessage = "Variant created successfully";
          break;

        case "body":
          result = await createOrUpdateEntry(
            Body,
            { displayValue: transformToDisplayValue(data.displayName) },
            {
              displayName: data.displayName,
              displayValue: transformToDisplayValue(data.displayName),
              isActive: data.isActive !== undefined ? data.isActive : true,
            }
          );
          successMessage = "Body type created successfully";
          break;

        case "year":
          const yearInt = parseInt(data.year);
          if (
            isNaN(yearInt) ||
            yearInt < 1900 ||
            yearInt > new Date().getFullYear() + 1
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid year provided",
            });
          }

          // Validate that either model or variant is provided
          if (!data.modelId && !data.variantId) {
            return res.status(400).json({
              success: false,
              message: "Either model ID or variant ID must be provided",
            });
          }

          // Prepare year data
          const yearData = {
            year: yearInt,
            displayName: data.displayName || yearInt.toString(),
            displayValue: transformToDisplayValue(yearInt.toString()),
            isActive: true,
          };

          // Add model reference if provided
          if (data.modelId) {
            yearData.model = data.modelId;
          }

          // Add variant reference if provided
          if (data.variantId) {
            yearData.variant = data.variantId;
          }

          // Create unique identifier for finding existing records
          let findCriteria = { year: yearInt };

          if (data.modelId && data.variantId) {
            // Both model and variant provided
            findCriteria.model = data.modelId;
            findCriteria.variant = data.variantId;
          } else if (data.modelId) {
            // Only model provided
            findCriteria.model = data.modelId;
            findCriteria.variant = null;
          } else if (data.variantId) {
            // Only variant provided
            findCriteria.variant = data.variantId;
            findCriteria.model = null;
          }

          // Check for existing year entry with same criteria
          const existingYear = await VariantYear.findOne(findCriteria);

          if (existingYear) {
            return res.status(400).json({
              success: false,
              message:
                "Year entry already exists for this model/variant combination",
            });
          }

          result = await VariantYear.create(yearData);

          await result.populate([
            { path: "model", select: "displayName displayValue" },
            { path: "variant", select: "displayName displayValue" },
          ]);

          successMessage = "Year created successfully";
          break;

        case "metadata":
          // Validate required fields
          if (!data.make || !data.model) {
            return res.status(400).json({
              success: false,
              message: "Make and model are required",
            });
          }
          result = await VehicleMetadata.create({
            make: data.make,
            model: data.model,
            variant: data.variant,
            body: data.body,
            variantYear: data.variantYear,
            fuelType: data.fuelType,
            transmission: data.transmission,
            engineCapacity: data.engineCapacity,
            power: data.power,
            torque: data.torque,
            seatingCapacity: data.seatingCapacity,
            source: data.source || "manual",
            isActive: data.isActive !== undefined ? data.isActive : true,
          });
          await result.populate([
            { path: "make", select: "displayName displayValue" },
            { path: "model", select: "displayName displayValue" },
            { path: "variant", select: "displayName displayValue" },
            { path: "body", select: "displayName displayValue" },
            { path: "variantYear", select: "displayName displayValue year" },
          ]);
          successMessage = "Vehicle metadata created successfully";
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid type specified",
          });
      }

      res.json({
        success: true,
        data: result,
        message: successMessage,
      });
    } catch (error) {
      console.error(`Error creating ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        message: `Error creating ${req.params.type}`,
        error: error.message,
      });
    }
  },

  // Bulk create handler
  bulkCreate: async (req, res) => {
    try {
      const { type, items } = req.body;
      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          // Reuse the single create logic
          const mockReq = { params: { type }, body: item };
          const mockRes = {
            json: (data) => data,
            status: (code) => ({
              json: (data) => ({ ...data, statusCode: code }),
            }),
          };

          const result = await createController.create(mockReq, mockRes);
          if (result.success) {
            results.push(result.data);
          } else {
            errors.push({ item, error: result.message });
          }
        } catch (error) {
          errors.push({ item, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          created: results,
          errors: errors,
          summary: {
            total: items.length,
            successful: results.length,
            failed: errors.length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error in bulk create operation",
        error: error.message,
      });
    }
  },
};

const modifyController = {
  // Universal update handler
  update: async (req, res) => {
    try {
      const { type, id } = req.params;
      const data = req.body;

      let result;
      let Model;
      let successMessage;

      // Transform display values if displayName is provided
      if (data.displayName) {
        data.displayValue = transformToDisplayValue(data.displayName);
      }

      switch (type) {
        case "make":
          Model = Make;
          successMessage = "Make updated successfully";
          break;
        case "model":
          Model = require("../models/Model");
          successMessage = "Model updated successfully";
          break;
        case "variant":
          Model = Variant;
          successMessage = "Variant updated successfully";
          break;
        case "body":
          Model = Body;
          successMessage = "Body type updated successfully";
          break;
        case "year":
          Model = VariantYear;

          // Special handling for year updates
          if (data.year) {
            const yearInt = parseInt(data.year);
            if (
              isNaN(yearInt) ||
              yearInt < 1900 ||
              yearInt > new Date().getFullYear() + 1
            ) {
              return res.status(400).json({
                success: false,
                message: "Invalid year provided",
              });
            }
            data.year = yearInt;
            data.displayName = data.displayName || yearInt.toString();
            data.displayValue = transformToDisplayValue(yearInt.toString());
          }

          // Validate model/variant requirements for year updates
          if (
            data.hasOwnProperty("modelId") ||
            data.hasOwnProperty("variantId")
          ) {
            // If updating model or variant references, ensure at least one is provided
            const currentYear = await VariantYear.findById(id);
            const newModelId = data.hasOwnProperty("modelId")
              ? data.modelId
              : currentYear.model;
            const newVariantId = data.hasOwnProperty("variantId")
              ? data.variantId
              : currentYear.variant;

            if (!newModelId && !newVariantId) {
              return res.status(400).json({
                success: false,
                message: "Either model or variant must be specified",
              });
            }

            // Update the references
            if (data.hasOwnProperty("modelId")) {
              data.model = data.modelId || null;
              delete data.modelId;
            }
            if (data.hasOwnProperty("variantId")) {
              data.variant = data.variantId || null;
              delete data.variantId;
            }
          }

          successMessage = "Year updated successfully";
          break;
        case "metadata":
          Model = VehicleMetadata;
          successMessage = "Vehicle metadata updated successfully";
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid type specified",
          });
      }

      result = await Model.findByIdAndUpdate(id, data, { new: true });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `${type} not found`,
        });
      }

      // Populate if it's model, variant, year, or metadata
      if (type === "model") {
        await result.populate("make", "displayName displayValue");
      } else if (type === "variant") {
        await result.populate("models", "displayName displayValue");
      } else if (type === "year") {
        await result.populate([
          { path: "model", select: "displayName displayValue" },
          { path: "variant", select: "displayName displayValue" },
        ]);
      } else if (type === "metadata") {
        await result.populate([
          { path: "make", select: "displayName displayValue" },
          { path: "model", select: "displayName displayValue" },
          { path: "variant", select: "displayName displayValue" },
          { path: "body", select: "displayName displayValue" },
          { path: "variantYear", select: "displayName displayValue year" },
        ]);
      }

      res.json({
        success: true,
        data: result,
        message: successMessage,
      });
    } catch (error) {
      console.error(`Error updating ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        message: `Error updating ${req.params.type}`,
        error: error.message,
      });
    }
  },

  // Universal delete handler
  delete: async (req, res) => {
    try {
      const { type, id } = req.params;

      let Model;
      let successMessage;
      let dependencyChecks = [];

      switch (type) {
        case "make":
          Model = Make;
          dependencyChecks = [
            { model: Model, field: "make", message: "models" },
            {
              model: VehicleMetadata,
              field: "make",
              message: "vehicle metadata",
            },
          ];
          successMessage = "Make deleted successfully";
          break;
        case "model":
          Model = require("../models/Model");
          dependencyChecks = [
            {
              model: VehicleMetadata,
              field: "model",
              message: "vehicle metadata",
            },
            { model: Variant, field: "models", message: "variants" },
            { model: VariantYear, field: "model", message: "variant years" },
          ];
          successMessage = "Model deleted successfully";
          break;
        case "variant":
          Model = Variant;
          dependencyChecks = [
            {
              model: VehicleMetadata,
              field: "variant",
              message: "vehicle metadata",
            },
            { model: VariantYear, field: "variant", message: "variant years" },
          ];
          successMessage = "Variant deleted successfully";
          break;
        case "body":
          Model = Body;
          dependencyChecks = [
            {
              model: VehicleMetadata,
              field: "body",
              message: "vehicle metadata",
            },
          ];
          successMessage = "Body type deleted successfully";
          break;
        case "year":
          Model = VariantYear;
          dependencyChecks = [
            {
              model: VehicleMetadata,
              field: "variantYear",
              message: "vehicle metadata",
            },
          ];
          successMessage = "Year deleted successfully";
          break;
        case "metadata":
          Model = VehicleMetadata;
          successMessage = "Vehicle metadata deleted successfully";
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid type specified",
          });
      }

      // Check dependencies before deletion (except for metadata)
      if (type !== "metadata") {
        for (const check of dependencyChecks) {
          const filter = {};
          filter[check.field] = id;
          const count = await check.model.countDocuments(filter);
          if (count > 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot delete ${type} as it is being used in ${check.message}`,
            });
          }
        }
      }

      const result = await Model.findByIdAndDelete(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `${type} not found`,
        });
      }

      res.json({
        success: true,
        message: successMessage,
      });
    } catch (error) {
      console.error(`Error deleting ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        message: `Error deleting ${req.params.type}`,
        error: error.message,
      });
    }
  },
};

const retrieveController = {
  // Universal list handler for tables
  list: async (req, res) => {
    try {
      const { type } = req.params;
      const {
        page = 1,
        limit = 10,
        search = "",
        isActive,
        // Filters for metadata
        make,
        model,
        body,
        variantYear,
        fuelType,
        transmission,
      } = req.query;

      const skip = (page - 1) * limit;
      let Model;
      let populateFields = [];
      let sortCriteria = {};
      let filter = {};

      // Set up model and basic filters
      switch (type) {
        case "makes":
          Model = Make;
          sortCriteria = { displayName: 1 };
          break;
        case "models":
          Model = require("../models/Model");
          populateFields = ["make"];
          sortCriteria = { displayName: 1 };
          if (req.query.makeId) {
            filter.make = req.query.makeId;
          }
          break;
        case "variants":
          Model = Variant;
          populateFields = ["models"];
          sortCriteria = { displayName: 1 };
          if (req.query.modelId) {
            filter.models = req.query.modelId;
          }
          break;
        case "bodies":
          Model = Body;
          sortCriteria = { displayName: 1 };
          break;
        case "years":
          Model = VariantYear;
          populateFields = [
            { path: "model", select: "displayName displayValue" },
            { path: "variant", select: "displayName displayValue" },
          ];
          sortCriteria = { year: -1 };
          if (req.query.modelId) {
            filter.model = req.query.modelId;
          }
          if (req.query.variantId) {
            filter.variant = req.query.variantId;
          }
          break;
        case "metadata":
          Model = VehicleMetadata;
          populateFields = [
            { path: "make", select: "displayName displayValue" },
            { path: "model", select: "displayName displayValue" },
            { path: "variant", select: "displayName displayValue" },
            { path: "body", select: "displayName displayValue" },
            { path: "variantYear", select: "displayName displayValue year" },
          ];
          sortCriteria = { createdAt: -1 };

          // Apply metadata specific filters
          if (make) filter.make = make;
          if (model) filter.model = model;
          if (req.query.variant) filter.variant = req.query.variant;
          if (body) filter.body = body;
          if (variantYear) filter.variantYear = variantYear;
          if (fuelType) filter.fuelType = { $regex: fuelType, $options: "i" };
          if (transmission)
            filter.transmission = { $regex: transmission, $options: "i" };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid type specified",
          });
      }

      // Apply common filters
      if (search) {
        if (type === "years") {
          filter.$or = [
            { displayName: { $regex: search, $options: "i" } },
            { displayValue: { $regex: search, $options: "i" } },
            { year: parseInt(search) || 0 },
          ];
        } else {
          filter.$or = [
            { displayName: { $regex: search, $options: "i" } },
            { displayValue: { $regex: search, $options: "i" } },
          ];
        }
      }

      if (isActive !== undefined) {
        filter.isActive = isActive === "true";
      }

      // Execute query
      let query = Model.find(filter)
        .sort(sortCriteria)
        .skip(skip)
        .limit(parseInt(limit));

      if (populateFields.length > 0) {
        query = query.populate(populateFields);
      }

      const [data, total] = await Promise.all([
        query.exec(),
        Model.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: data,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      });
    } catch (error) {
      console.error(`Error retrieving ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        message: `Error retrieving ${req.params.type}`,
        error: error.message,
      });
    }
  },

  // Dropdown data handler - Enhanced for better year filtering
dropdown: async (req, res) => {
    try {
      const { type, makeId, modelId, variantId } = req.query;

      let data = [];

      switch (type) {
        case "makes":
          data = await Make.find({ isActive: true })
            .select("_id displayName displayValue")
            .sort({ displayName: 1 });
          break;

        case "models":
          const modelFilter = makeId
            ? { make: makeId, isActive: true }
            : { isActive: true };
          data = await Model.find(modelFilter)
            .select("_id displayName displayValue make")
            .populate("make", "displayName displayValue")
            .sort({ displayName: 1 });
          break;

        case "variants":
          const variantFilter = modelId
            ? { models: modelId, isActive: true }
            : { isActive: true };
          data = await Variant.find(variantFilter)
            .select("_id displayName displayValue models")
            .populate("models", "displayName displayValue")
            .sort({ displayName: 1 });
          break;

        case "bodies":
          data = await Body.find({ isActive: true })
            .select("_id displayName displayValue")
            .sort({ displayName: 1 });
          break;

        case "years":
          let yearFilter = { isActive: true };

          // Enhanced filtering logic for years
          if (modelId && variantId) {
            // Both model and variant specified - find years for this combination
            yearFilter = {
              $and: [
                { isActive: true },
                {
                  $or: [
                    { model: modelId, variant: variantId }, // Exact match
                    { model: modelId, variant: null }, // Model only
                    { model: null, variant: variantId }, // Variant only
                    { model: modelId, variant: { $exists: false } }, // Model with no variant field
                    { variant: variantId, model: { $exists: false } }, // Variant with no model field
                  ],
                },
              ],
            };
          } else if (modelId) {
            // Only model specified
            yearFilter = {
              $and: [
                { isActive: true },
                {
                  $or: [
                    { model: modelId },
                    { model: modelId, variant: null },
                    { model: modelId, variant: { $exists: false } },
                  ],
                },
              ],
            };
          } else if (variantId) {
            // Only variant specified
            yearFilter = {
              $and: [
                { isActive: true },
                {
                  $or: [
                    { variant: variantId },
                    { variant: variantId, model: null },
                    { variant: variantId, model: { $exists: false } },
                  ],
                },
              ],
            };
          }
          const distinctYears = await VariantYear.distinct("year", yearFilter);
            data = distinctYears
            .filter(year => year !== null && year !== undefined)
            .sort((a, b) => b - a) // Sort descending
            .map(year => ({
              _id: year,
              displayName: year.toString(),
              displayValue: year.toString(),
              year: year
            }));
          break;

        case "fuel-types":
          data = await VehicleMetadata.distinct("fuelType", {
            fuelType: { $ne: null, $ne: "" },
          });
          break;

        case "transmissions":
          data = await VehicleMetadata.distinct("transmission", {
            transmission: { $ne: null, $ne: "" },
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid dropdown type specified",
          });
      }

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error(`Error retrieving dropdown data:`, error);
      res.status(500).json({
        success: false,
        message: "Error retrieving dropdown data",
        error: error.message,
      });
    }
  },

  // Counts for dashboard
  counts: async (req, res) => {
    try {
      const [
        makesCount,
        modelsCount,
        variantsCount,
        bodiesCount,
        yearsCount,
        metadataCount,
      ] = await Promise.all([
        Make.countDocuments({ isActive: true }),
        Model.countDocuments({ isActive: true }),
        Variant.countDocuments({ isActive: true }),
        Body.countDocuments({ isActive: true }),
        VariantYear.countDocuments({ isActive: true }),
        VehicleMetadata.countDocuments({ isActive: true }),
      ]);

      res.json({
        success: true,
        data: {
          makes: makesCount,
          models: modelsCount,
          variants: variantsCount,
          bodies: bodiesCount,
          years: yearsCount,
          metadata: metadataCount,
        },
      });
    } catch (error) {
      console.error("Error retrieving counts:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving counts",
        error: error.message,
      });
    }
  },

  // Schema fields for form building
  schemaFields: async (req, res) => {
    try {
      const schemaFields = {
        required: [
          {
            name: "make",
            type: "String",
            description: "Vehicle make/manufacturer (e.g., Toyota, Honda)",
          },
          {
            name: "model",
            type: "String",
            description: "Vehicle model (e.g., Camry, Civic)",
          },
        ],
        optional: [
          {
            name: "variant",
            type: "String",
            description:
              "Specific trim/variant of the model (e.g., XLE, LX, Sport)",
          },
          {
            name: "body",
            type: "String",
            description: "Body type (sedan, suv, hatchback, convertible, etc.)",
          },
          {
            name: "year",
            type: "Integer",
            description: "Manufacturing year (1900-2026)",
          },
          {
            name: "fuelType",
            type: "String",
            description: "Fuel type (petrol, diesel, electric, hybrid, etc.)",
          },
          {
            name: "transmission",
            type: "String",
            description: "Transmission type (manual, automatic, cvt, etc.)",
          },
          {
            name: "engineCapacity",
            type: "String",
            description: "Engine capacity/displacement (e.g., 2.0L, 1600cc)",
          },
          {
            name: "power",
            type: "String",
            description: "Engine power output (e.g., 200hp, 150kW)",
          },
          {
            name: "torque",
            type: "String",
            description: "Engine torque (e.g., 300Nm, 250 lb-ft)",
          },
          {
            name: "seatingCapacity",
            type: "Integer",
            description: "Number of seats (2-50)",
          },
        ],
        dataTypes: ["String", "Integer", "Number", "Boolean", "Date"],
        examples: {
          make: ["Toyota", "Honda", "BMW", "Mercedes-Benz"],
          model: ["Camry", "Civic", "X3", "C-Class"],
          variant: ["XLE", "LX", "Sport", "M Sport"],
          body: ["Sedan", "SUV", "Hatchback", "Coupe"],
          fuelType: ["Petrol", "Diesel", "Electric", "Hybrid"],
          transmission: ["Manual", "Automatic", "CVT", "AMT"],
        },
      };

      res.json({
        success: true,
        data: schemaFields,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching schema fields",
        error: error.message,
      });
    }
  },
};

const transformToDisplayValue = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .trim();
};

const createOrUpdateEntry = async (Model, findCriteria, data) => {
  try {
    const existing = await Model.findOne(findCriteria);
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    } else {
      return await Model.create(data);
    }
  } catch (error) {
    if (error.code === 11000) {
      return await Model.findOne(findCriteria);
    }
    throw error;
  }
};

module.exports = {
  createController,
  modifyController,
  retrieveController,
};
