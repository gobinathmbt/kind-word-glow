const Vehicle = require("../models/Vehicle");
const WorkshopQuote = require("../models/WorkshopQuote");
const WorkshopReport = require("../models/WorkshopReport");
const Supplier = require("../models/Supplier");
const Conversation = require("../models/Conversation");
const Company = require("../models/Company");
const User = require("../models/User");
const { logEvent } = require("./logs.controller");

// Check if workshop can be completed (all fields have completed_jobs status)
const checkWorkshopCompletion = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;

    // Get vehicle and all its quotes
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Get all quotes for this vehicle
    const quotes = await WorkshopQuote.find({
      vehicle_type: vehicleType,
      company_id: req.user.company_id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
    });

    // Get all field IDs from vehicle results
    const resultData =
      vehicleType === "inspection"
        ? vehicle.inspection_result
        : vehicle.trade_in_result;

    const allFieldIds = [];
    if (resultData && resultData.length > 0) {
      resultData.forEach((item) => {
        if (vehicleType === "inspection" && item.sections) {
          // Inspection structure with categories
          item.sections.forEach((section) => {
            if (section.fields) {
              section.fields.forEach((field) => {
                allFieldIds.push(field.field_id);
              });
            }
          });
        } else if (vehicleType === "tradein") {
          // Handle both category and direct section structures for tradein
          if (item.sections) {
            // Category structure
            item.sections.forEach((section) => {
              if (section.fields) {
                section.fields.forEach((field) => {
                  allFieldIds.push(field.field_id);
                });
              }
            });
          } else if (item.fields) {
            // Direct section structure
            item.fields.forEach((field) => {
              allFieldIds.push(field.field_id);
            });
          }
        }
      });
    }

    // Check if all fields have completed_jobs status
    const completedFields = quotes
      .filter((quote) => quote.status === "completed_jobs")
      .map((q) => q.field_id);
    const incompleteFields = allFieldIds.filter(
      (fieldId) => !completedFields.includes(fieldId)
    );

    const canComplete = incompleteFields.length === 0 && allFieldIds.length > 0;

    res.json({
      success: true,
      data: {
        canComplete,
        totalFields: allFieldIds.length,
        completedFields: completedFields.length,
        incompleteFields: incompleteFields.length,
        incompleteFieldIds: incompleteFields,
      },
    });
  } catch (error) {
    console.error("Check workshop completion error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking workshop completion status",
    });
  }
};

// Trigger workshop report generation
const completeWorkshop = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;
    const { confirmation, stageName } = req.body; // stageName for inspection
    console.log(confirmation, stageName);

    // Validate confirmation
    if (confirmation !== "CONFIRM") {
      return res.status(400).json({
        success: false,
        message: "Please type CONFIRM to complete workshop",
      });
    }

    const vehicle = await Vehicle.findOne({
      vehicle_stock_id: vehicleId,
      company_id: req.user.company_id,
      vehicle_type: vehicleType,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicleType === "inspection" && stageName) {
      // Handle stage completion for inspection - FORCE UPDATE ARRAYS

      console.log("Before update:", {
        workshop_progress: vehicle.workshop_progress,
        workshop_report_preparing: vehicle.workshop_report_preparing,
        workshop_report_ready: vehicle.workshop_report_ready,
        is_workshop: vehicle.is_workshop,
      });

      // Ensure arrays are properly initialized
      if (!Array.isArray(vehicle.workshop_progress)) {
        vehicle.workshop_progress = [];
      }
      if (!Array.isArray(vehicle.workshop_report_preparing)) {
        vehicle.workshop_report_preparing = [];
      }
      if (!Array.isArray(vehicle.workshop_report_ready)) {
        vehicle.workshop_report_ready = [];
      }
      if (!Array.isArray(vehicle.is_workshop)) {
        vehicle.is_workshop = [];
      }

      // FORCE UPDATE workshop_progress for specific stage
      const progressIndex = vehicle.workshop_progress.findIndex(
        (item) => item.stage_name === stageName
      );
      if (progressIndex !== -1) {
        vehicle.workshop_progress[progressIndex].progress = "completed";
        vehicle.workshop_progress[progressIndex].completed_at = new Date();
        console.log(`Updated existing progress for ${stageName}`);
      } else {
        // Force add if doesn't exist
        vehicle.workshop_progress.push({
          stage_name: stageName,
          progress: "completed",
          completed_at: new Date(),
          started_at: new Date(), // Add started date as well
        });
        console.log(`Added new progress entry for ${stageName}`);
      }

      // FORCE UPDATE workshop_report_preparing for specific stage
      const preparingIndex = vehicle.workshop_report_preparing.findIndex(
        (item) => item.stage_name === stageName
      );
      if (preparingIndex !== -1) {
        vehicle.workshop_report_preparing[preparingIndex].preparing = true;
        console.log(`Updated existing preparing status for ${stageName}`);
      } else {
        // Force add if doesn't exist
        vehicle.workshop_report_preparing.push({
          stage_name: stageName,
          preparing: true,
        });
        console.log(`Added new preparing entry for ${stageName}`);
      }

      // FORCE UPDATE workshop_report_ready for specific stage (set to false initially)
      const reportReadyIndex = vehicle.workshop_report_ready.findIndex(
        (item) => item.stage_name === stageName
      );
      if (reportReadyIndex !== -1) {
        vehicle.workshop_report_ready[reportReadyIndex].ready = false;
        vehicle.workshop_report_ready[reportReadyIndex].generated_at =
          new Date();
        console.log(`Updated existing report ready status for ${stageName}`);
      } else {
        // Force add if doesn't exist
        vehicle.workshop_report_ready.push({
          stage_name: stageName,
          ready: false,
          generated_at: new Date(),
        });
        console.log(`Added new report ready entry for ${stageName}`);
      }

      // FORCE UPDATE is_workshop for specific stage (mark as completed in workshop)
      const workshopIndex = vehicle.is_workshop.findIndex(
        (item) => item.stage_name === stageName
      );
      if (workshopIndex !== -1) {
        vehicle.is_workshop[workshopIndex].in_workshop = true; // Keep in workshop but mark as completed
        vehicle.is_workshop[workshopIndex].completed_at = new Date();
        console.log(`Updated existing workshop status for ${stageName}`);
      } else {
        // Force add if doesn't exist
        vehicle.is_workshop.push({
          stage_name: stageName,
          in_workshop: true,
          pushed_at: new Date(),
          completed_at: new Date(),
        });
        console.log(`Added new workshop entry for ${stageName}`);
      }

      console.log("After update:", {
        workshop_progress: vehicle.workshop_progress,
        workshop_report_preparing: vehicle.workshop_report_preparing,
        workshop_report_ready: vehicle.workshop_report_ready,
        is_workshop: vehicle.is_workshop,
      });

      // Mark arrays as modified to ensure Mongoose saves them
      vehicle.markModified("workshop_progress");
      vehicle.markModified("workshop_report_preparing");
      vehicle.markModified("workshop_report_ready");
      vehicle.markModified("is_workshop");

      // Save with force
      const savedVehicle = await vehicle.save();
      console.log(
        "Vehicle saved successfully with stage completion:",
        savedVehicle._id
      );

      // Send stage-specific data to SQS
      const {
        sendToWorkshopReportQueue,
      } = require("./workshopReportSqs.controller");
      const queueResult = await sendToWorkshopReportQueue({
        vehicle_id: vehicle._id,
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicleType,
        stage_name: stageName,
        completed_by: req.user.id,
      });

      if (!queueResult.success) {
        console.log("Queue failed, rolling back changes");

        // ROLLBACK: Restore previous states
        const rollbackProgressIndex = vehicle.workshop_progress.findIndex(
          (item) => item.stage_name === stageName
        );
        if (rollbackProgressIndex !== -1) {
          vehicle.workshop_progress[rollbackProgressIndex].progress =
            "in_progress";
          delete vehicle.workshop_progress[rollbackProgressIndex].completed_at;
        }

        const rollbackPreparingIndex =
          vehicle.workshop_report_preparing.findIndex(
            (item) => item.stage_name === stageName
          );
        if (rollbackPreparingIndex !== -1) {
          vehicle.workshop_report_preparing[
            rollbackPreparingIndex
          ].preparing = false;
        }

        const rollbackReadyIndex = vehicle.workshop_report_ready.findIndex(
          (item) => item.stage_name === stageName
        );
        if (rollbackReadyIndex !== -1) {
          vehicle.workshop_report_ready.splice(rollbackReadyIndex, 1); // Remove the entry
        }

        // Mark as modified and save rollback
        vehicle.markModified("workshop_progress");
        vehicle.markModified("workshop_report_preparing");
        vehicle.markModified("workshop_report_ready");

        await vehicle.save();

        return res.status(500).json({
          success: false,
          message: "Failed to queue report generation",
        });
      }

      res.json({
        success: true,
        message: `Stage "${stageName}" completed successfully. Report will be available shortly.`,
        data: {
          queue_id: queueResult.queueId,
          vehicle_id: vehicle._id,
          stage_name: stageName,
        },
      });
    } else {
      // Handle full workshop completion for tradein (existing logic with force updates)
      const quotes = await WorkshopQuote.find({
        vehicle_type: vehicleType,
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
      });

      const completedQuotes = quotes.filter(
        (quote) => quote.status === "completed_jobs"
      );
      if (completedQuotes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No completed jobs found for this vehicle",
        });
      }

      // FORCE UPDATE for tradein
      vehicle.workshop_progress = "completed";
      vehicle.workshop_report_preparing = true;
      vehicle.is_workshop = true; // Ensure is_workshop is set

      // Initialize workshop_report_ready for tradein if it doesn't exist
      if (typeof vehicle.workshop_report_ready === "undefined") {
        vehicle.workshop_report_ready = false;
      }

      // Mark fields as modified for tradein
      vehicle.markModified("workshop_progress");
      vehicle.markModified("workshop_report_preparing");
      vehicle.markModified("workshop_report_ready");
      vehicle.markModified("is_workshop");

      const savedVehicle = await vehicle.save();
      console.log("Tradein vehicle saved successfully:", savedVehicle._id);

      const {
        sendToWorkshopReportQueue,
      } = require("./workshopReportSqs.controller");
      const queueResult = await sendToWorkshopReportQueue({
        vehicle_id: vehicle._id,
        company_id: req.user.company_id,
        vehicle_stock_id: vehicle.vehicle_stock_id,
        vehicle_type: vehicleType,
        completed_by: req.user.id,
      });

      if (!queueResult.success) {
        // ROLLBACK for tradein
        vehicle.workshop_progress = "in_progress";
        vehicle.workshop_report_preparing = false;

        vehicle.markModified("workshop_progress");
        vehicle.markModified("workshop_report_preparing");

        await vehicle.save();

        return res.status(500).json({
          success: false,
          message: "Failed to queue report generation",
        });
      }

      res.json({
        success: true,
        message:
          "Workshop completed successfully. Report will be available shortly.",
        data: {
          queue_id: queueResult.queueId,
          vehicle_id: vehicle._id,
        },
      });
    }
  } catch (error) {
    console.error("Complete workshop error:", error);
    res.status(500).json({
      success: false,
      message: "Error completing workshop",
      error: error.message,
    });
  }
};
// Generate workshop report (called by SQS processor)
const generateWorkshopReport = async (messageData) => {
  console.log(messageData);
  try {
    const {
      vehicle_id,
      company_id,
      vehicle_stock_id,
      vehicle_type,
      completed_by,
    } = messageData;

    console.log(
      `🏗️ Generating workshop report for vehicle ${vehicle_stock_id}`
    );

    // Get all required data
    const vehicle = await Vehicle.findById(vehicle_id);
    const company = await Company.findById(company_id);
    const quotes = await WorkshopQuote.find({
      vehicle_type,
      company_id,
      vehicle_stock_id,
    }).populate("selected_suppliers approved_supplier");

    const conversations = await Conversation.find({
      quote_id: { $in: quotes.map((q) => q._id) },
    });

    if (!vehicle || !company) {
      throw new Error("Vehicle or company not found");
    }

    // Generate report data based on vehicle type
    if (vehicle_type === "inspection") {
      await generateInspectionReport(
        vehicle,
        company,
        quotes,
        conversations,
        completed_by
      );
    } else {
      await generateTradeinReport(
        vehicle,
        company,
        quotes,
        conversations,
        completed_by
      );
    }

    console.log(`✅ Workshop report generated for vehicle ${vehicle_stock_id}`);
    return { success: true };
  } catch (error) {
    console.error("Generate workshop report error:", error);
    throw error;
  }
};

// Get workshop reports for vehicle
const getWorkshopReports = async (req, res) => {
  try {
    const { vehicleId, vehicleType } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    let reports;
    if (vehicleType === "inspection") {
      // Get all stage reports
      reports = await WorkshopReport.find({
        vehicle_id: vehicleId,
        report_type: "stage_workshop",
      }).sort({ created_at: -1 });
    } else {
      // Get single tradein report
      reports = await WorkshopReport.find({
        vehicle_id: vehicleId,
        report_type: "full_workshop",
      }).sort({ created_at: -1 });
    }

    res.json({
      success: true,
      data: {
        reports,
        vehicle_report_status: vehicle.workshop_report_ready,
        report_preparing: vehicle.workshop_report_preparing,
      },
    });
  } catch (error) {
    console.error("Get workshop reports error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching workshop reports",
    });
  }
};

// Get specific workshop report
const getWorkshopReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await WorkshopReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Workshop report not found",
      });
    }

    // Check if user has access to this report
    if (report.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get workshop report error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching workshop report",
    });
  }
};

// Enhanced statistics calculation function
const calculateStageStatistics = (quotes) => {
  const stats = {
    fields_by_status: {
      completed_jobs: 0,
      work_review: 0,
      work_in_progress: 0,
      quote_approved: 0,
      quote_sent: 0,
      quote_request: 0,
      rework: 0,
    },
    work_entries_summary: {
      total_entries: 0,
      completed_entries: 0,
      pending_entries: 0,
      total_parts_cost: 0,
      total_labor_cost: 0,
      total_gst: 0,
    },
    quality_metrics: {
      visual_inspection_passed: 0,
      functional_test_passed: 0,
      road_test_passed: 0,
      safety_check_passed: 0,
    },
    supplier_performance: new Map(),
    technician_performance: new Map(),
    cost_breakdown: {
      parts: 0,
      labor: 0,
      gst: 0,
      other: 0,
    },
  };

  const completionTimes = [];
  let totalCost = 0;
  let totalGst = 0;
  let totalPartsCost = 0;
  let totalLaborCost = 0;

  quotes.forEach((quote) => {
    // Count by status
    if (stats.fields_by_status.hasOwnProperty(quote.status)) {
      stats.fields_by_status[quote.status]++;
    }

    // Process work entries if they exist
    if (quote.work_details?.work_entries) {
      quote.work_details.work_entries.forEach((entry) => {
        stats.work_entries_summary.total_entries++;

        if (entry.completed) {
          stats.work_entries_summary.completed_entries++;
        } else {
          stats.work_entries_summary.pending_entries++;
        }

        // Sum up costs
        const partsCost = entry.parts_cost || 0;
        const laborCost = entry.labor_cost || 0;
        const gst = entry.gst || 0;

        stats.work_entries_summary.total_parts_cost += partsCost;
        stats.work_entries_summary.total_labor_cost += laborCost;
        stats.work_entries_summary.total_gst += gst;

        totalPartsCost += partsCost;
        totalLaborCost += laborCost;
        totalGst += gst;

        // Quality metrics
        if (entry.quality_check) {
          if (entry.quality_check.visual_inspection)
            stats.quality_metrics.visual_inspection_passed++;
          if (entry.quality_check.functional_test)
            stats.quality_metrics.functional_test_passed++;
          if (entry.quality_check.road_test)
            stats.quality_metrics.road_test_passed++;
          if (entry.quality_check.safety_check)
            stats.quality_metrics.safety_check_passed++;
        }

        // Technician performance
        if (entry.technician) {
          const techKey = entry.technician;
          if (!stats.technician_performance.has(techKey)) {
            stats.technician_performance.set(techKey, {
              technician_name: entry.technician,
              work_entries_completed: 0,
              total_time: 0,
              quality_checks: 0,
              quality_passed: 0,
            });
          }

          const techStats = stats.technician_performance.get(techKey);
          techStats.work_entries_completed++;

          if (entry.quality_check) {
            techStats.quality_checks++;
            const passedCount = Object.values(entry.quality_check).filter(
              (val) => val === true
            ).length;
            techStats.quality_passed += passedCount;
          }

          // Calculate completion time if dates are available
          if (entry.entry_date_time && entry.estimated_time) {
            const startTime = new Date(entry.entry_date_time);
            const endTime = new Date(entry.estimated_time);
            const timeDiff = (endTime - startTime) / (1000 * 60 * 60 * 24); // Days
            techStats.total_time += timeDiff;
          }
        }
      });
    }

    // Overall quote costs
    const quoteCost =
      quote.work_details?.total_amount || quote.quote_amount || 0;
    totalCost += quoteCost;

    // Supplier performance
    if (quote.approved_supplier) {
      const supplierId = quote.approved_supplier.supplier_id.toString();
      if (!stats.supplier_performance.has(supplierId)) {
        stats.supplier_performance.set(supplierId, {
          supplier_id: quote.approved_supplier.supplier_id,
          supplier_name: quote.approved_supplier.supplier_name,
          jobs_completed: 0,
          work_entries_completed: 0,
          total_earned: 0,
          total_time: 0,
          quality_score: 0,
        });
      }

      const supplierStats = stats.supplier_performance.get(supplierId);
      supplierStats.jobs_completed++;
      supplierStats.total_earned += quoteCost;

      if (quote.work_details?.work_entries) {
        supplierStats.work_entries_completed +=
          quote.work_details.work_entries.length;
      }

      // Calculate completion time
      if (quote.quote_created_at && quote.work_completed_at) {
        const startTime = new Date(quote.quote_created_at);
        const endTime = new Date(quote.work_completed_at);
        const timeDiff = (endTime - startTime) / (1000 * 60 * 60 * 24); // Days
        supplierStats.total_time += timeDiff;
        completionTimes.push(timeDiff);
      }
    }
  });

  // Calculate averages and convert Maps to Arrays
  const supplierPerfArray = Array.from(stats.supplier_performance.values()).map(
    (supplier) => ({
      ...supplier,
      avg_cost:
        supplier.jobs_completed > 0
          ? supplier.total_earned / supplier.jobs_completed
          : 0,
      avg_time:
        supplier.jobs_completed > 0
          ? supplier.total_time / supplier.jobs_completed
          : 0,
      quality_score: 95, // Placeholder - could be calculated based on quality metrics
    })
  );

  const techPerfArray = Array.from(stats.technician_performance.values()).map(
    (tech) => ({
      ...tech,
      avg_completion_time:
        tech.work_entries_completed > 0
          ? tech.total_time / tech.work_entries_completed
          : 0,
      quality_score:
        tech.quality_checks > 0
          ? (tech.quality_passed / (tech.quality_checks * 4)) * 100
          : 0, // 4 quality check types
    })
  );

  const avgCompletionTime =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  // Cost breakdown
  stats.cost_breakdown = {
    parts: totalPartsCost,
    labor: totalLaborCost,
    gst: totalGst,
    other: Math.max(0, totalCost - totalPartsCost - totalLaborCost - totalGst),
  };

  return {
    summary: {
      total_fields: quotes.length,
      total_quotes: quotes.length,
      total_work_completed: stats.fields_by_status.completed_jobs,
      total_work_entries: stats.work_entries_summary.total_entries,
      total_cost: totalCost,
      total_gst: totalGst,
      grand_total: totalCost + totalGst,
      parts_cost: totalPartsCost,
      labor_cost: totalLaborCost,
      start_date:
        quotes.length > 0
          ? new Date(
              Math.min(...quotes.map((q) => new Date(q.quote_created_at)))
            )
          : null,
      completion_date:
        quotes.length > 0
          ? new Date(
              Math.max(
                ...quotes
                  .filter((q) => q.work_completed_at)
                  .map((q) => new Date(q.work_completed_at))
              )
            )
          : null,
      duration_days: avgCompletionTime,
    },
    detailed: {
      ...stats,
      supplier_performance: supplierPerfArray,
      technician_performance: techPerfArray,
      avg_completion_time: avgCompletionTime,
      cost_breakdown: stats.cost_breakdown,
    },
  };
};

// Enhanced attachment collection function
const collectAttachments = (quote) => {
  const attachments = [];

  // Field images and videos
  if (quote.field_images) {
    quote.field_images.forEach((img) => {
      attachments.push({
        type: "field_image",
        url: img,
        field_id: quote.field_id,
        uploaded_at: quote.quote_created_at,
      });
    });
  }

  if (quote.field_videos) {
    quote.field_videos.forEach((video) => {
      attachments.push({
        type: "field_video",
        url: video,
        field_id: quote.field_id,
        uploaded_at: quote.quote_created_at,
      });
    });
  }

  // Work entry attachments
  if (quote.work_details?.work_entries) {
    quote.work_details.work_entries.forEach((entry) => {
      // Invoices
      if (entry.invoices) {
        entry.invoices.forEach((invoice) => {
          attachments.push({
            type: "work_entry_invoice",
            url: invoice.url,
            key: invoice.key,
            filename: invoice.description,
            description: invoice.description,
            field_id: quote.field_id,
            work_entry_id: entry.id,
            uploaded_at: entry.entry_date_time,
          });
        });
      }

      // PDFs
      if (entry.pdfs) {
        entry.pdfs.forEach((pdf) => {
          attachments.push({
            type: "work_entry_pdf",
            url: pdf.url,
            key: pdf.key,
            filename: pdf.description,
            description: pdf.description,
            field_id: quote.field_id,
            work_entry_id: entry.id,
            uploaded_at: entry.entry_date_time,
          });
        });
      }

      // Videos
      if (entry.videos) {
        entry.videos.forEach((video) => {
          attachments.push({
            type: "work_entry_video",
            url: video.url,
            key: video.key,
            filename: video.description,
            description: video.description,
            field_id: quote.field_id,
            work_entry_id: entry.id,
            uploaded_at: entry.entry_date_time,
          });
        });
      }

      // Images
      if (entry.images) {
        entry.images.forEach((image) => {
          attachments.push({
            type: "work_entry_image",
            url: image.url,
            key: image.key,
            filename: image.description,
            description: image.description,
            field_id: quote.field_id,
            work_entry_id: entry.id,
            uploaded_at: entry.entry_date_time,
          });
        });
      }

      // Documents
      if (entry.documents) {
        entry.documents.forEach((doc) => {
          attachments.push({
            type: "work_entry_document",
            url: doc.url,
            key: doc.key,
            filename: doc.description,
            description: doc.description,
            field_id: quote.field_id,
            work_entry_id: entry.id,
            uploaded_at: entry.entry_date_time,
          });
        });
      }

      // Warranty documents
      if (entry.warranties) {
        entry.warranties.forEach((warranty) => {
          if (warranty.document) {
            attachments.push({
              type: "warranty_document",
              url: warranty.document.url,
              key: warranty.document.key,
              filename: warranty.document.description,
              description: `${warranty.part} warranty - ${warranty.months} months`,
              field_id: quote.field_id,
              work_entry_id: entry.id,
              uploaded_at: entry.entry_date_time,
            });
          }
        });
      }
    });
  }

  // Overall work images
  if (quote.work_details?.work_images) {
    quote.work_details.work_images.forEach((img) => {
      attachments.push({
        type: "work_image",
        url: img.url,
        key: img.key,
        field_id: quote.field_id,
        uploaded_at: quote.work_details.submitted_at,
      });
    });
  }

  return attachments;
};

// Generate inspection workshop report (multiple stages)
const generateInspectionReport = async (
  vehicle,
  company,
  quotes,
  conversations,
  completed_by
) => {
  const resultData = vehicle.inspection_result || [];

  const stagesToGenerate = [];

  if (Array.isArray(vehicle.workshop_progress)) {
    for (const progressItem of vehicle.workshop_progress) {
      if (progressItem.progress === "completed") {
        // Check if report is not ready for this stage
        const reportReadyItem = Array.isArray(vehicle.workshop_report_ready)
          ? vehicle.workshop_report_ready.find(
              (item) => item.stage_name === progressItem.stage_name
            )
          : null;

        // Generate report if: no report ready entry exists OR report ready is false
        if (!reportReadyItem || reportReadyItem.ready === false) {
          stagesToGenerate.push(progressItem.stage_name);
        }
      }
    }
  }

  // If no stages need report generation, exit early
  if (stagesToGenerate.length === 0) {
    console.log("No stages require report generation at this time");
    return;
  }

  console.log(`Generating reports for stages: ${stagesToGenerate.join(", ")}`);

  // Filter resultData to only include stages that need report generation
  const stagesToProcess = resultData.filter((category) =>
    stagesToGenerate.includes(category.category_name)
  );

  const reportReadyFlags = [];

  // Initialize arrays if they don't exist or are not arrays
  if (!Array.isArray(vehicle.workshop_report_ready)) {
    vehicle.workshop_report_ready = [];
  }
  if (!Array.isArray(vehicle.workshop_report_preparing)) {
    vehicle.workshop_report_preparing = [];
  }

  // Process each category (stage)
  for (const category of stagesToProcess) {
    if (!category.sections || category.sections.length === 0) continue;

    const stageQuotes = [];
    const stageCommunications = [];
    const stageAttachments = [];

    // Collect all data for this stage
    for (const section of category.sections) {
      if (!section.fields) continue;

      for (const field of section.fields) {
        const fieldQuotes = quotes.filter((q) => q.field_id === field.field_id);

        for (const quote of fieldQuotes) {
          // Build enhanced quote data with new work_details structure
          const quoteData = {
            field_id: field.field_id,
            field_name: field.field_name,
            category_name: category.category_name,
            section_name: section.section_name,
            quote_amount: quote.quote_amount,
            quote_description: quote.quote_description,
            selected_suppliers: quote.selected_suppliers.map((s) => ({
              supplier_id: s._id,
              supplier_name: s.name,
              supplier_email: s.email,
              supplier_shop_name: s.supplier_shop_name,
            })),
            approved_supplier: quote.approved_supplier
              ? {
                  supplier_id: quote.approved_supplier._id,
                  supplier_name: quote.approved_supplier.name,
                  supplier_email: quote.approved_supplier.email,
                  supplier_shop_name:
                    quote.approved_supplier.supplier_shop_name,
                  approved_at: quote.approved_at,
                }
              : null,
            work_details: quote.comment_sheet || {},
            field_images: quote.images || [],
            field_videos: quote.videos || [],
            quote_responses: (quote.supplier_responses || []).map(
              (response) => ({
                supplier_id: response.supplier_id,
                supplier_name: response.supplier_name || "Unknown",
                estimated_cost: response.estimated_cost,
                estimated_time: response.estimated_time,
                comments: response.comments,
                quote_pdf_url: response.quote_pdf_url,
                quote_pdf_key: response.quote_pdf_key,
                status: response.status,
                responded_at: response.responded_at,
              })
            ),
            quote_created_at: quote.created_at,
            work_started_at: quote.work_started_at,
            work_submitted_at: quote.work_submitted_at,
            work_completed_at: quote.work_completed_at,
            status: quote.status,
          };

          stageQuotes.push(quoteData);

          // Collect enhanced attachments
          const quoteAttachments = collectAttachments(quoteData);
          stageAttachments.push(...quoteAttachments);

          // Collect conversations
          const fieldConversations = conversations.filter(
            (c) => c.quote_id.toString() === quote._id.toString()
          );
          fieldConversations.forEach((conv) => {
            stageCommunications.push({
              conversation_id: conv._id,
              supplier_id: conv.supplier_id,
              field_id: field.field_id,
              field_name: field.field_name,
              total_messages: conv.messages.length,
              last_message_at: conv.last_message_at,
              messages: conv.messages.slice(0, 50), // Limit messages for performance
            });
          });
        }
      }
    }

    // Calculate enhanced stage statistics
    const stageStats = calculateStageStatistics(stageQuotes);

    // Create workshop report for this stage
    const reportData = {
      vehicle_id: vehicle._id,
      company_id: company._id,
      vehicle_stock_id: vehicle.vehicle_stock_id,
      vehicle_type: "inspection",
      report_type: "stage_workshop",
      stage_name: category.category_name,
      vehicle_details: {
        vin: vehicle.vin,
        plate_no: vehicle.plate_no,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        chassis_no: vehicle.chassis_no,
        variant: vehicle.variant,
        hero_image: vehicle.vehicle_hero_image,
        name: vehicle.name,
      },
      workshop_summary: stageStats.summary,
      quotes_data: stageQuotes,
      communications: stageCommunications,
      attachments: stageAttachments,
      statistics: stageStats.detailed,
      generated_by: completed_by,
    };

    await WorkshopReport.findOneAndUpdate(
      {
        vehicle_id: vehicle._id,
        report_type: "stage_workshop",
        stage_name: category.category_name,
      },
      reportData,
      { upsert: true, new: true }
    );

    reportReadyFlags.push({
      stage_name: category.category_name,
      ready: true,
      generated_at: new Date(),
    });

    // FORCE UPDATE: workshop_report_ready for this specific stage
    const readyIndex = vehicle.workshop_report_ready.findIndex(
      (item) => item.stage_name === category.category_name
    );

    if (readyIndex !== -1) {
      // Update existing entry
      vehicle.workshop_report_ready[readyIndex] = {
        ...vehicle.workshop_report_ready[readyIndex],
        ready: true,
        generated_at: new Date(),
      };
    } else {
      // Add new entry
      vehicle.workshop_report_ready.push({
        stage_name: category.category_name,
        ready: true,
        generated_at: new Date(),
      });
    }

    // FORCE UPDATE: workshop_report_preparing for this specific stage
    const preparingIndex = vehicle.workshop_report_preparing.findIndex(
      (item) => item.stage_name === category.category_name
    );

    if (preparingIndex !== -1) {
      // Update existing entry
      vehicle.workshop_report_preparing[preparingIndex] = {
        ...vehicle.workshop_report_preparing[preparingIndex],
        preparing: false,
        updated_at: new Date(),
      };
    } else {
      // Add new entry if it doesn't exist
      vehicle.workshop_report_preparing.push({
        stage_name: category.category_name,
        preparing: false,
        updated_at: new Date(),
      });
    }

    // Mark the specific fields as modified to ensure Mongoose saves them
    vehicle.markModified("workshop_report_ready");
    vehicle.markModified("workshop_report_preparing");

    console.log(
      `Report generated successfully for stage: ${category.category_name}`
    );
  }

  // Force save the vehicle document with explicit field updates
  try {
    await vehicle.save();
    console.log(
      `Vehicle document saved with updated workshop_report_ready and workshop_report_preparing fields`
    );
  } catch (error) {
    console.error("Error saving vehicle document:", error);
    throw error;
  }

  console.log(
    `Report generation completed for ${reportReadyFlags.length} stages`
  );
};

// Generate tradein workshop report (single report)
const generateTradeinReport = async (
  vehicle,
  company,
  quotes,
  conversations,
  completed_by
) => {
  const allQuotes = [];
  const allCommunications = [];
  const allAttachments = [];

  // Process all quotes for tradein
  for (const quote of quotes) {
    const quoteData = {
      field_id: quote.field_id,
      field_name: quote.field_name,
      quote_amount: quote.quote_amount,
      quote_description: quote.quote_description,
      selected_suppliers: quote.selected_suppliers.map((s) => ({
        supplier_id: s._id,
        supplier_name: s.name,
        supplier_email: s.email,
        supplier_shop_name: s.supplier_shop_name,
      })),
      approved_supplier: quote.approved_supplier
        ? {
            supplier_id: quote.approved_supplier._id,
            supplier_name: quote.approved_supplier.name,
            supplier_email: quote.approved_supplier.email,
            supplier_shop_name: quote.approved_supplier.supplier_shop_name,
            approved_at: quote.approved_at,
          }
        : null,
      work_details: quote.comment_sheet || {},
      field_images: quote.images || [],
      field_videos: quote.videos || [],
      quote_responses: (quote.supplier_responses || []).map((response) => ({
        supplier_id: response.supplier_id,
        supplier_name: response.supplier_name || "Unknown",
        estimated_cost: response.estimated_cost,
        estimated_time: response.estimated_time,
        comments: response.comments,
        quote_pdf_url: response.quote_pdf_url,
        quote_pdf_key: response.quote_pdf_key,
        status: response.status,
        responded_at: response.responded_at,
      })),
      quote_created_at: quote.created_at,
      work_started_at: quote.work_started_at,
      work_submitted_at: quote.work_submitted_at,
      work_completed_at: quote.work_completed_at,
      status: quote.status,
    };

    allQuotes.push(quoteData);

    // Collect enhanced attachments and conversations (same as inspection)
    const quoteAttachments = collectAttachments(quoteData);
    allAttachments.push(...quoteAttachments);

    const fieldConversations = conversations.filter(
      (c) => c.quote_id.toString() === quote._id.toString()
    );
    fieldConversations.forEach((conv) => {
      allCommunications.push({
        conversation_id: conv._id,
        supplier_id: conv.supplier_id,
        field_id: quote.field_id,
        field_name: quote.field_name,
        total_messages: conv.messages.length,
        last_message_at: conv.last_message_at,
        messages: conv.messages.slice(0, 50),
      });
    });
  }

  const stats = calculateStageStatistics(allQuotes);

  // Create single tradein workshop report
  const reportData = {
    vehicle_id: vehicle._id,
    company_id: company._id,
    vehicle_stock_id: vehicle.vehicle_stock_id,
    vehicle_type: "tradein",
    report_type: "full_workshop",
    vehicle_details: {
      vin: vehicle.vin,
      plate_no: vehicle.plate_no,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      chassis_no: vehicle.chassis_no,
      variant: vehicle.variant,
      hero_image: vehicle.vehicle_hero_image,
      name: vehicle.name,
    },
    workshop_summary: stats.summary,
    quotes_data: allQuotes,
    communications: allCommunications,
    attachments: allAttachments,
    statistics: stats.detailed,
    generated_by: completed_by,
  };

  await WorkshopReport.findOneAndUpdate(
    {
      vehicle_id: vehicle._id,
      report_type: "full_workshop",
    },
    reportData,
    { upsert: true, new: true }
  );

  // Update vehicle report status
  vehicle.workshop_report_ready = true;
  vehicle.workshop_report_preparing = false;
  await vehicle.save();

  console.log(
    `Tradein workshop report generated successfully for vehicle: ${vehicle.vehicle_stock_id}`
  );
};

module.exports = {
  checkWorkshopCompletion,
  completeWorkshop,
  generateWorkshopReport,
  getWorkshopReports,
  getWorkshopReport,
};
