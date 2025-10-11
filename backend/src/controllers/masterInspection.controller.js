const InspectionConfig = require("../models/InspectionConfig");
const TradeinConfig = require("../models/TradeinConfig");
const Vehicle = require("../models/Vehicle");
const Company = require("../models/Company");
const DropdownMaster = require("../models/DropdownMaster");

// @desc    Get master configuration for inspection/tradein (Public - No auth required)
// @route   GET /api/master-inspection/config/:company_id/:vehicle_type
// @access  Public
const getMasterConfiguration = async (req, res) => {
  try {
    const { company_id, vehicle_type } = req.params;
    const { configId, vehicle_stock_id } = req.query;

    // Validate company exists
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    let config;
    let query = {
      company_id,
      is_active: true,
    };
    let lastConfigId;

    // If configId is provided, use it instead of is_active
    if (configId) {
            query = {
        company_id,
        _id: configId,
      };
    } else if (vehicle_stock_id) {
      // Check if vehicle has last used configuration
      const vehicle = await Vehicle.findOne({
        company_id,
        vehicle_stock_id: parseInt(vehicle_stock_id),
        vehicle_type,
      });

      if (vehicle) {
        lastConfigId =
          vehicle_type === "inspection"
            ? vehicle.last_inspection_config_id
            : vehicle.last_tradein_config_id;

        if (lastConfigId) {
          query = {
            company_id,
            _id: lastConfigId,
          };
        }
      }
    }

    if (vehicle_type === "inspection") {
      config = await InspectionConfig.findOne(query).populate(
        "categories.sections.fields.dropdown_config.dropdown_id"
      );
    } else if (vehicle_type === "tradein") {
      config = await TradeinConfig.findOne(query).populate(
        "categories.sections.fields.dropdown_config.dropdown_id"
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type. Must be "inspection" or "tradein"',
      });
    }

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Configuration not found.`,
              });
    }

    // Get workshop sections from vehicle data if vehicle_stock_id is provided
    let workshopSections = [];
    if (vehicle_stock_id) {
      const vehicle = await Vehicle.findOne({
        company_id,
        vehicle_stock_id: parseInt(vehicle_stock_id),
        vehicle_type,
      });

      if (vehicle) {
        // Extract workshop sections from vehicle data
        const resultData =
          vehicle_type === "inspection"
            ? vehicle.inspection_result
            : vehicle.trade_in_result;

        if (resultData && resultData.length > 0) {
          if (vehicle_type === "inspection") {
            // For inspection: look for workshop sections in categories
            resultData.forEach((category) => {
              if (category.sections) {
                category.sections.forEach((section) => {
                  if (
                    section.section_display_name === "at_workshop_onstaging" ||
                    section.section_name?.includes("Workshop")
                  ) {
                    workshopSections.push({
                      ...section,
                      category_id: category.category_id,
                      category_name: category.category_name,
                    });
                  }
                });
              }
            });
          } else {
            // For tradein: look for workshop sections directly
            resultData.forEach((category) => {
              if (category.sections) {
                category.sections.forEach((section) => {
                  if (
                    section.section_display_name === "at_workshop_onstaging" ||
                    section.section_name?.includes("Workshop") ||
                section.section_id?.includes("workshop_section")
                  ) {
                    workshopSections.push({
                      ...section,
                      category_id: category.category_id,
                      category_name: category.category_name,
                    });
                  }
                });
              }
            });
          }
        }
      }
    }

    // Merge workshop sections into the configuration
    if (workshopSections.length > 0) {
      if (vehicle_type === "inspection") {
        // Add workshop sections to their respective categories
        workshopSections.forEach((workshopSection) => {
          const categoryIndex = config.categories.findIndex(
            (cat) => cat.category_id === workshopSection.category_id
          );

          if (categoryIndex !== -1) {
            // Check if section already exists in this category
            const existingSectionIndex = config.categories[
              categoryIndex
            ].sections.findIndex(
              (sec) => sec.section_id === workshopSection.section_id
            );

            if (existingSectionIndex === -1) {
              // Add new workshop section to the category
              config.categories[categoryIndex].sections.push(workshopSection);
            }
          } else {
            // Create a new category for workshop sections if category not found
            const workshopCategory = {
              category_id: `workshop_category_${Date.now()}`,
              category_name: "Workshop Additions",
              description: "Dynamically added workshop fields",
              display_order: config.categories.length,
              is_active: true,
              sections: [workshopSection],
            };
            config.categories.push(workshopCategory);
          }
        });
      } else {
        // Tradein logic (same as inspection for now)
        workshopSections.forEach((workshopSection) => {
          const categoryIndex = config.categories.findIndex(
            (cat) => cat.category_id === workshopSection.category_id
          );

          if (categoryIndex !== -1) {
            // Check if section already exists in this category
            const existingSectionIndex = config.categories[
              categoryIndex
            ].sections.findIndex(
              (sec) => sec.section_id === workshopSection.section_id
            );

            if (existingSectionIndex === -1) {
              // Add new workshop section to the category
              config.categories[categoryIndex].sections.push(workshopSection);
            }
          } else {
            // Create a new category for workshop sections if category not found
            const workshopCategory = {
              category_id: `workshop_category_${Date.now()}`,
              category_name: "Workshop Additions",
              description: "Dynamically added workshop fields",
              display_order: config.categories.length,
              is_active: true,
              sections: [workshopSection],
            };
            config.categories.push(workshopCategory);
          }
        });
      }
    }

    // Get company S3 configuration
    const s3Config =
      company.s3_config && company.s3_config.bucket
        ? {
            bucket: company.s3_config.bucket,
            region: company.s3_config.region,
            access_key: company.s3_config.access_key,
            secret_key: company.s3_config.secret_key,
            url: company.s3_config.url,
          }
        : null;

    // Get all dropdown dependencies (including workshop fields)
    const dropdownIds = [];

    if (vehicle_type === "inspection") {
      config.categories.forEach((category) => {
        category.sections.forEach((section) => {
          section.fields.forEach((field) => {
            if (field.dropdown_config?.dropdown_id) {
              dropdownIds.push(field.dropdown_config.dropdown_id);
            }
          });
        });
      });
    } else {
      config.categories.forEach((category) => {
        category.sections.forEach((section) => {
          section.fields.forEach((field) => {
            if (field.dropdown_config?.dropdown_id) {
              dropdownIds.push(field.dropdown_config.dropdown_id);
            }
          });
        });
      });
    }

    // Populate dropdown values
    const dropdowns = await DropdownMaster.find({
      _id: { $in: dropdownIds },
    });

    res.status(200).json({
      success: true,
      data: {
        config,
        s3Config,
        dropdowns,
        company: {
          _id: company._id,
          name: company.company_name,
          last_config_id: lastConfigId,
        },
        workshopSections:
          workshopSections.length > 0 ? workshopSections : undefined,
      },
    });
  } catch (error) {
    console.error("Get master configuration error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving configuration",
    });
  }
};

// Update the saveInspectionData function to save the configuration ID
const saveInspectionData = async (req, res) => {
  try {
    const { company_id, vehicle_stock_id, vehicle_type } = req.params;
    const { inspection_result, inspection_report_pdf, tradein_report_pdf, config_id, current_category } = req.body;

    const vehicle = await Vehicle.findOne({
      company_id,
      vehicle_stock_id: parseInt(vehicle_stock_id),
      vehicle_type,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle_type === "inspection") {
      if (inspection_result) {
        vehicle.inspection_result = inspection_result;
      }
      
      // Handle category-specific PDFs for inspection vehicles
      if (inspection_report_pdf && current_category) {
        if (!vehicle.inspection_report_pdf) {
          vehicle.inspection_report_pdf = [];
        }

        // Remove existing PDF for the current category
        vehicle.inspection_report_pdf = vehicle.inspection_report_pdf.filter(
          existingReport => existingReport.category !== current_category
        );

        // Add new PDF for the current category
        vehicle.inspection_report_pdf.push({
          category: current_category,
          link: inspection_report_pdf
        });
      }

      if (config_id) {
        vehicle.last_inspection_config_id = config_id;
      }
    } else if (vehicle_type === "tradein") {
      if (inspection_result) {
        vehicle.trade_in_result = inspection_result;
      }

      // Handle category-specific PDFs for trade-in vehicles
      if (tradein_report_pdf && current_category) {
        if (!vehicle.tradein_report_pdf) {
          vehicle.tradein_report_pdf = [];
        }

        // Remove existing PDF for the current category
        vehicle.tradein_report_pdf = vehicle.tradein_report_pdf.filter(
          existingReport => existingReport.category !== current_category
        );

        // Add new PDF for the current category
        vehicle.tradein_report_pdf.push({
          category: current_category,
          link: tradein_report_pdf
        });
      }

      if (config_id) {
        vehicle.last_tradein_config_id = config_id;
      }
    }

    // Mark fields as modified
    if (vehicle_type === "inspection") {
      if (inspection_report_pdf) {
        vehicle.markModified('inspection_report_pdf');
      }
      if (inspection_result) {
        vehicle.markModified('inspection_result');
      }
    } else if (vehicle_type === "tradein") {
      if (tradein_report_pdf) {
        vehicle.markModified('tradein_report_pdf');
      }
      if (inspection_result) {
        vehicle.markModified('trade_in_result');
      }
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `${vehicle_type} data saved successfully`,
      data: vehicle,
    });
  } catch (error) {
    console.error("Save inspection data error:", error);
    res.status(500).json({
      success: false,
      message: "Error saving inspection data",
      error: error.message
    });
  }
};


// @desc    Get vehicle inspection/tradein data (Public - No auth required for viewing)
// @route   GET /api/master-inspection/view/:company_id/:vehicle_stock_id/:vehicle_type
// @access  Public
const getVehicleInspectionData = async (req, res) => {
  try {
    const { company_id, vehicle_stock_id, vehicle_type } = req.params;

    const vehicle = await Vehicle.findOne({
      company_id,
      vehicle_stock_id: parseInt(vehicle_stock_id),
      vehicle_type,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Get the relevant result data
    const resultData =
      vehicle_type === "inspection"
        ? vehicle.inspection_result
        : vehicle.trade_in_result;

    res.status(200).json({
      success: true,
      data: {
        vehicle: {
          vehicle_stock_id: vehicle.vehicle_stock_id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
          plate_no: vehicle.plate_no,
          vehicle_type: vehicle.vehicle_type,
          vehicle_hero_image: vehicle.vehicle_hero_image,
          inspection_report_pdf: vehicle.inspection_report_pdf,
        },
        result: resultData || [],
      },
    });
  } catch (error) {
    console.error("Get vehicle inspection data error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving vehicle data",
    });
  }
};

// @desc    Get all active configurations for inspection/tradein
// @route   GET /api/master-inspection/active-configs/:company_id/:vehicle_type
// @access  Public
const getActiveConfigurations = async (req, res) => {
  try {
    const { company_id, vehicle_type } = req.params;

    // Validate company exists
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    let configs;
    if (vehicle_type === "inspection") {
      configs = await InspectionConfig.find({
        company_id,
        is_active: true,
      }).select("config_name description version created_at");
    } else if (vehicle_type === "tradein") {
      configs = await TradeinConfig.find({
        company_id,
        is_active: true,
      }).select("config_name description version created_at");
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type. Must be "inspection" or "tradein"',
      });
    }

    res.status(200).json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error("Get active configurations error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving active configurations",
    });
  }
};

module.exports = {
  getMasterConfiguration,
  getVehicleInspectionData,
  saveInspectionData,
  getActiveConfigurations, // Add this
};
