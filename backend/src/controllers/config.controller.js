
const InspectionConfig = require("../models/InspectionConfig");
const TradeinConfig = require("../models/TradeinConfig");
const DropdownMaster = require("../models/DropdownMaster");
const { logEvent } = require("./logs.controller");

// ... keep existing code (getInspectionConfigs, getInspectionConfigDetails, createInspectionConfig, updateInspectionConfig, deleteInspectionConfig, addInspectionSection, addInspectionField, updateInspectionField, deleteInspectionField, deleteInspectionSection, updateSectionsOrder, updateFieldsOrder functions)

const getInspectionConfigs = async (req, res) => {
  try {
    const { page = 1, limit = 6, search = "", status = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {
      company_id: req.user.company_id,
    };

    if (search) {
      searchQuery.config_name = { $regex: search, $options: "i" };
    }

    // Apply status filter only if it's not "all"
    if (status && status !== "all") {
      searchQuery.is_active = status === "active";
    }

    const configs = await InspectionConfig.find(searchQuery)
      .select(
        "config_name description version is_active is_default created_at updated_at dealership_id"
      )
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add categories_count to each config
    const configsWithCount = await Promise.all(
      configs.map(async (config) => {
        const configObj = config.toObject();
        configObj.categories_count = config.categories ? config.categories.length : 0;
        return configObj;
      })
    );

    const total = await InspectionConfig.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: configsWithCount,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get inspection configs error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inspection configurations",
    });
  }
};

const getInspectionConfigDetails = async (req, res) => {
  try {
    const config = await InspectionConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Get inspection config details error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving configuration details",
    });
  }
};

const createInspectionConfig = async (req, res) => {
  try {
    // Check if config name already exists for this company
    const existingConfig = await InspectionConfig.findOne({
      config_name: req.body.config_name,
      company_id: req.user.company_id,
    });

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message: "Configuration name already exists",
      });
    }

    // // If this is set as default, deactivate other defaults
    // if (req.body.is_default) {
    //   await InspectionConfig.updateMany(
    //     { company_id: req.user.company_id, is_default: true },
    //     { is_default: false }
    //   );
    // }

    // // If this is set as active, deactivate other active configs
    // if (req.body.is_active) {
    //   await InspectionConfig.updateMany(
    //     { company_id: req.user.company_id, is_active: true },
    //     { is_active: false }
    //   );
    // }

    const config = new InspectionConfig({
      ...req.body,
      company_id: req.user.company_id,
      created_by: req.user.id,
      categories: [],
    });

    await config.save();

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Create inspection config error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating inspection configuration",
    });
  }
};

const addInspectionCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_id, description } = req.body;
    const companyId = req.user.company_id;

    // Validate required fields
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Find the configuration
    const config = await InspectionConfig.findOne({
      _id: id,
      company_id: companyId
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Check if category_id already exists
    const existingCategory = config.categories.find(
      cat => cat.category_id === category_id
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category ID already exists'
      });
    }

    // Create new category
    const newCategory = {
      category_id: category_id || category_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      category_name,
      description: description || '',
      display_order: config.categories.length,
      is_active: true,
      sections: []
    };

    // Add category to configuration
    config.categories.push(newCategory);
    await config.save();

    res.json({
      success: true,
      message: 'Category added successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Add inspection category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add category'
    });
  }
};

const updateInspectionConfig = async (req, res) => {
  try {
    // Check if new config name already exists for this company (excluding current config)
    if (req.body.config_name) {
      const existingConfig = await InspectionConfig.findOne({
        config_name: req.body.config_name,
        company_id: req.user.company_id,
        _id: { $ne: req.params.id },
      });

      if (existingConfig) {
        return res.status(400).json({
          success: false,
          message: "Configuration name already exists",
        });
      }
    }

    // // If this is set as active, deactivate other active configs
    // if (req.body.is_active) {
    //   await InspectionConfig.updateMany(
    //     {
    //       company_id: req.user.company_id,
    //       is_active: true,
    //       _id: { $ne: req.params.id },
    //     },
    //     { is_active: false }
    //   );
    // }

    const config = await InspectionConfig.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Update inspection config error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating inspection configuration",
    });
  }
};

const deleteInspectionConfig = async (req, res) => {
  try {
    const config = await InspectionConfig.findOneAndDelete({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error) {
    console.error("Delete inspection config error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inspection configuration",
    });
  }
};

const addInspectionSection = async (req, res) => {
  try {
    const config = await InspectionConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Check for unique section name across all categories within the company
    const sectionNameExists = config.categories.some(category =>
      category.sections.some(section => 
        section.section_name.toLowerCase() === req.body.section_name.toLowerCase()
      )
    );

    if (sectionNameExists) {
      return res.status(400).json({
        success: false,
        message: "Section name must be unique within the company",
      });
    }

    const category = config.categories.find(
      (cat) => cat.category_id === req.params.categoryId
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const newSection = {
      ...req.body,
      section_id: `section_${Date.now()}`,
      display_order: category.sections.length,
      fields: [],
    };

    category.sections.push(newSection);
    await config.save();

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Add inspection section error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding section",
    });
  }
};

const addInspectionField = async (req, res) => {
  try {
    const config = await InspectionConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Check for unique field name across all categories and sections within the company
    const fieldNameExists = config.categories.some(category =>
      category.sections.some(section =>
        section.fields.some(field => 
          field.field_name.toLowerCase() === req.body.field_name.toLowerCase()
        )
      )
    );

    if (fieldNameExists) {
      return res.status(400).json({
        success: false,
        message: "Field name must be unique within the company",
      });
    }

    // Find section across all categories
    let targetSection = null;
    for (const category of config.categories) {
      targetSection = category.sections.find(
        (section) => section.section_id === req.params.sectionId
      );
      if (targetSection) break;
    }

    if (!targetSection) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const newField = {
      ...req.body,
      field_id: `field_${Date.now()}`,
      display_order: targetSection.fields.length,
    };

    // Validate dropdown configuration if field type is dropdown
    if (newField.field_type === "dropdown") {
      if (
        !newField.dropdown_config ||
        !newField.dropdown_config.dropdown_name
      ) {
        return res.status(400).json({
          success: false,
          message: "Dropdown configuration is required for dropdown field type",
        });
      }

      // Verify that the dropdown exists and belongs to the company
      const dropdown = await DropdownMaster.findOne({
        dropdown_name: newField.dropdown_config.dropdown_name,
        company_id: req.user.company_id,
        is_active: true,
      });

      if (!dropdown) {
        return res.status(400).json({
          success: false,
          message: "Selected dropdown not found or inactive",
        });
      }

      // Set the dropdown_id reference
      newField.dropdown_config.dropdown_id = dropdown._id;
    }

    targetSection.fields.push(newField);
    await config.save();

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Add inspection field error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding field",
    });
  }
};

const updateInspectionField = async (req, res) => {
  try {
    const config = await InspectionConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find field across all categories and sections
    let targetField = null;
    let targetSection = null;
    for (const category of config.categories) {
      for (const section of category.sections) {
        targetField = section.fields.find(
          (field) => field.field_id === req.params.fieldId
        );
        if (targetField) {
          targetSection = section;
          break;
        }
      }
      if (targetField) break;
    }

    if (!targetField) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Check for unique field name if it's being changed
    if (req.body.field_name && req.body.field_name.toLowerCase() !== targetField.field_name.toLowerCase()) {
      const fieldNameExists = config.categories.some(category =>
        category.sections.some(section =>
          section.fields.some(field => 
            field.field_id !== req.params.fieldId &&
            field.field_name.toLowerCase() === req.body.field_name.toLowerCase()
          )
        )
      );

      if (fieldNameExists) {
        return res.status(400).json({
          success: false,
          message: "Field name must be unique within the company",
        });
      }
    }

    // Validate dropdown configuration if field type is dropdown
    if (req.body.field_type === "dropdown") {
      if (
        !req.body.dropdown_config ||
        (!req.body.dropdown_config.dropdown_name &&
          !req.body.dropdown_config.dropdown_id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Dropdown configuration (dropdown_id or dropdown_name) is required",
        });
      }

      // Build query dynamically
      const query = {
        company_id: req.user.company_id,
        is_active: true,
      };

      if (req.body.dropdown_config.dropdown_id) {
        query._id = req.body.dropdown_config.dropdown_id;
      } else {
        query.dropdown_name = req.body.dropdown_config.dropdown_name;
      }

      // Verify that the dropdown exists and belongs to the company
      const dropdown = await DropdownMaster.findOne(query);

      if (!dropdown) {
        return res.status(400).json({
          success: false,
          message: "Selected dropdown not found or inactive",
        });
      }

      // Set the dropdown_id reference
      req.body.dropdown_config.dropdown_id = dropdown._id;
    }

    // Update field properties
    Object.assign(targetField, req.body);
    await config.save();

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Update inspection field error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating field",
    });
  }
};

const deleteInspectionField = async (req, res) => {
  try {
    const config = await InspectionConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find and remove field across all categories and sections
    let fieldRemoved = false;
    for (const category of config.categories) {
      for (const section of category.sections) {
        const fieldIndex = section.fields.findIndex(
          (field) => field.field_id === req.params.fieldId
        );
        if (fieldIndex !== -1) {
          section.fields.splice(fieldIndex, 1);
          fieldRemoved = true;
          break;
        }
      }
      if (fieldRemoved) break;
    }

    if (!fieldRemoved) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    await config.save();

    res.status(200).json({
      success: true,
      data: config,
      message: "Field deleted successfully",
    });
  } catch (error) {
    console.error("Delete inspection field error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting field",
    });
  }
};

const deleteInspectionSection = async (req, res) => {
  try {
    const { id: configId, sectionId } = req.params;
    const { company_id } = req.user;

    const config = await InspectionConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find and remove the section from all categories
    let sectionRemoved = false;
    config.categories.forEach((category) => {
      const initialLength = category.sections.length;
      category.sections = category.sections.filter(
        (section) => section.section_id !== sectionId
      );
      if (category.sections.length < initialLength) {
        sectionRemoved = true;
      }
    });

    if (!sectionRemoved) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
    });
  }
};

// Update sections order
const updateSectionsOrder = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { sections } = req.body;
    const { company_id } = req.user;

    const config = await InspectionConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    const category = config.categories.find(
      (cat) => cat.category_id === categoryId
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Update display order for sections based on the array received
    sections.forEach((sectionUpdate, index) => {
      const section = category.sections.find(
        (s) => s.section_id === sectionUpdate.section_id
      );
      if (section) {
        section.display_order = sectionUpdate.display_order !== undefined ? sectionUpdate.display_order : index;
      }
    });

    // Sort sections by display_order to maintain consistency
    category.sections.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    await config.save();

    res.status(200).json({
      success: true,
      message: "Section order updated successfully",
    });
  } catch (error) {
    console.error("Update sections order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update section order",
    });
  }
};

// Update fields order
const updateFieldsOrder = async (req, res) => {
  try {
    const { id: configId, sectionId } = req.params;
    const { fields } = req.body;
    const { company_id } = req.user;

    const config = await InspectionConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find the section in any category
    let targetSection = null;
    config.categories.forEach((category) => {
      const section = category.sections.find((s) => s.section_id === sectionId);
      if (section) {
        targetSection = section;
      }
    });

    if (!targetSection) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Update display order for fields based on the array received
    fields.forEach((fieldUpdate, index) => {
      const field = targetSection.fields.find(
        (f) => f.field_id === fieldUpdate.field_id
      );
      if (field) {
        field.display_order = fieldUpdate.display_order !== undefined ? fieldUpdate.display_order : index;
      }
    });

    // Sort fields by display_order to maintain consistency
    targetSection.fields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    await config.save();

    res.status(200).json({
      success: true,
      message: "Field order updated successfully",
    });
  } catch (error) {
    console.error("Update fields order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update field order",
    });
  }
};

// Trade-in Configuration Controllers
const getTradeinConfigs = async (req, res) => {
  try {
    const { page = 1, limit = 6, search = "", status = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {
      company_id: req.user.company_id,
    };

    if (search) {
      searchQuery.config_name = { $regex: search, $options: "i" };
    }

    // Apply status filter only if it's not "all"
    if (status && status !== "all") {
      searchQuery.is_active = status === "active";
    }

    const configs = await TradeinConfig.find(searchQuery)
      .select(
        "config_name description version is_active is_default created_at updated_at dealership_id"
      )
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add categories_count to each config
    const configsWithCount = await Promise.all(
      configs.map(async (config) => {
        const configObj = config.toObject();
        configObj.categories_count = config.categories ? config.categories.length : 0;
        return configObj;
      })
    );

    const total = await TradeinConfig.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: configsWithCount,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get tradein configs error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving trade-in configurations",
    });
  }
};

const getTradeinConfigDetails = async (req, res) => {
  try {
    const config = await TradeinConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Get tradein config details error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving configuration details",
    });
  }
};

const createTradeinConfig = async (req, res) => {
  try {
    // Check if config name already exists for this company
    const existingConfig = await TradeinConfig.findOne({
      config_name: req.body.config_name,
      company_id: req.user.company_id,
    });

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message: "Configuration name already exists",
      });
    }

    // // If this is set as active, deactivate other active configs
    // if (req.body.is_active) {
    //   await TradeinConfig.updateMany(
    //     { company_id: req.user.company_id, is_active: true },
    //     { is_active: false }
    //   );
    // }

    const config = new TradeinConfig({
      ...req.body,
      company_id: req.user.company_id,
      created_by: req.user.id,
      sections: [],
    });

    await config.save();

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Create tradein config error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating trade-in configuration",
    });
  }
};

const updateTradeinConfig = async (req, res) => {
  try {
    // Check if new config name already exists for this company (excluding current config)
    if (req.body.config_name) {
      const existingConfig = await TradeinConfig.findOne({
        config_name: req.body.config_name,
        company_id: req.user.company_id,
        _id: { $ne: req.params.id },
      });

      if (existingConfig) {
        return res.status(400).json({
          success: false,
          message: "Configuration name already exists",
        });
      }
    }

    // If this is set as active, deactivate other active configs
    // if (req.body.is_active) {
    //   await TradeinConfig.updateMany(
    //     {
    //       company_id: req.user.company_id,
    //       is_active: true,
    //       _id: { $ne: req.params.id },
    //     },
    //     { is_active: false }
    //   );
    // }

    const config = await TradeinConfig.findOneAndUpdate(
      { _id: req.params.id, company_id: req.user.company_id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Update tradein config error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating trade-in configuration",
    });
  }
};

const deleteTradeinConfig = async (req, res) => {
  try {
    const config = await TradeinConfig.findOneAndDelete({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Configuration deleted successfully",
    });
  } catch (error) {
    console.error("Delete tradein config error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting trade-in configuration",
    });
  }
};

const addTradeinCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, category_id, description } = req.body;
    const companyId = req.user.company_id;

    // Validate required fields
    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Find the configuration
    const config = await TradeinConfig.findOne({
      _id: id,
      company_id: companyId
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Check if category_id already exists
    const existingCategory = config.categories.find(
      cat => cat.category_id === category_id
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category ID already exists'
      });
    }

    // Create new category
    const newCategory = {
      category_id: category_id || category_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      category_name,
      description: description || '',
      display_order: config.categories.length,
      is_active: true,
      sections: [],
      calculations: []
    };

    // Add category to configuration
    config.categories.push(newCategory);
    await config.save();

    res.json({
      success: true,
      message: 'Category added successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Add tradein category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add category'
    });
  }
};

const updateTradeinCategory = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { category_name, description } = req.body;

    // Generate category_id from category_name
    const generated_category_id = category_name.toLowerCase().replace(/\s+/g, '_');

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Find and update the category
    const categoryIndex = config.categories.findIndex(cat => cat.category_id === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update category data
    config.categories[categoryIndex].category_name = category_name;
    config.categories[categoryIndex].category_id = generated_category_id;
    config.categories[categoryIndex].description = description;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: config.categories[categoryIndex]
    });
  } catch (error) {
    console.error('Update tradein category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const toggleTradeinCategoryStatus = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { is_active } = req.body;

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Find and update the category status
    const categoryIndex = config.categories.findIndex(cat => cat.category_id === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    config.categories[categoryIndex].is_active = is_active;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Category status updated successfully',
      data: config.categories[categoryIndex]
    });
  } catch (error) {
    console.error('Toggle tradein category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const addTradeinSection = async (req, res) => {
  try {
    const config = await TradeinConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    const category = config.categories.find(
      (cat) => cat.category_id === req.params.categoryId
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check for unique section name across all categories within the company
    const sectionNameExists = config.categories.some(category =>
      category.sections.some(section => 
        section.section_name.toLowerCase() === req.body.section_name.toLowerCase()
      )
    );

    if (sectionNameExists) {
      return res.status(400).json({
        success: false,
        message: "Section name must be unique within the company",
      });
    }

    const newSection = {
      ...req.body,
      section_id: `section_${Date.now()}`,
      display_order: category.sections.length,
      fields: [],
    };

    category.sections.push(newSection);
    await config.save();

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Add tradein section error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding section",
    });
  }
};

const addTradeinField = async (req, res) => {
  try {
    const config = await TradeinConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      }); 
    }

    // Find the category that contains the section
    const category = config.categories.find(cat => 
      cat.sections.some(section => section.section_id === req.params.sectionId)
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category containing the section not found",
      });
    }

    // Find the section within the category
    const section = category.sections.find(
      (section) => section.section_id === req.params.sectionId
    );
    
    console.log("Found section:", section);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    console.log("Section fields:", section.fields);

    // Initialize fields array if it doesn't exist
    if (!section.fields) {
      section.fields = [];
    }

    // Check for unique field name within the same section only
    const fieldNameExists = section.fields.some(field => 
      field.field_name && field.field_name.toLowerCase() === req.body.field_name.toLowerCase()
    );

    if (fieldNameExists) {
      return res.status(400).json({
        success: false,
        message: "Field name must be unique within this section",
      });
    }

    // Create new field with proper structure
    const newField = {
      field_id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field_name: req.body.field_name,
      field_type: req.body.field_type,
      is_required: req.body.is_required || false,
      has_image: req.body.has_image || false,
      has_notes: req.body.has_notes || false,
      placeholder: req.body.placeholder || "",
      help_text: req.body.help_text || "",
      display_order: section.fields.length,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Validate dropdown configuration if field type is dropdown
    if (req.body.field_type === "dropdown") {
      if (
        !req.body.dropdown_config ||
        !req.body.dropdown_config.dropdown_name
      ) {
        return res.status(400).json({
          success: false,
          message: "Dropdown configuration is required for dropdown field type",
        });
      }

      // Verify that the dropdown exists and belongs to the company
      const dropdown = await DropdownMaster.findOne({
        dropdown_name: req.body.dropdown_config.dropdown_name,
        company_id: req.user.company_id,
        is_active: true,
      });

      if (!dropdown) {
        return res.status(400).json({
          success: false,
          message: "Selected dropdown not found or inactive",
        });
      }

      // Set the dropdown configuration
      newField.dropdown_config = {
        dropdown_id: dropdown._id,
        dropdown_name: dropdown.dropdown_name,
        allow_multiple: req.body.dropdown_config.allow_multiple || false,
      };
    }

    // Add validation rules if provided
    if (req.body.validation_rules) {
      newField.validation_rules = req.body.validation_rules;
    }

    // Add the field to the section
    section.fields.push(newField);
    
    // Mark the entire path as modified to ensure Mongoose detects the change
    config.markModified('categories');
    
    await config.save();

    res.status(201).json({
      success: true,
      message: "Field added successfully",
      data: newField,
    });
  } catch (error) {
    console.error("Add tradein field error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding field: " + error.message,
    });
  }
};

const updateTradeinField = async (req, res) => {
  try {
    const { id: configId, fieldId } = req.params;
    const updateData = { ...req.body };

    console.log(`Updating field: config=${configId}, field=${fieldId}`);

    const config = await TradeinConfig.findOne({
      _id: configId,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find the field
    let targetField = null;
    let fieldPath = '';

    for (const [catIndex, category] of config.categories.entries()) {
      for (const [secIndex, section] of category.sections.entries()) {
        const fieldIndex = section.fields.findIndex(
          field => field.field_id === fieldId
        );
        
        if (fieldIndex !== -1) {
          targetField = section.fields[fieldIndex];
          fieldPath = `categories.${catIndex}.sections.${secIndex}.fields.${fieldIndex}`;
          break;
        }
      }
      if (targetField) break;
    }

    if (!targetField) {
      return res.status(404).json({
        success: false,
        message: "Field not found in configuration",
      });
    }

    // Check for unique field name
    if (updateData.field_name && updateData.field_name.toLowerCase() !== targetField.field_name.toLowerCase()) {
      const fieldNameExists = config.categories.some(category =>
        category.sections.some(section =>
          section.fields.some(field => 
            field.field_id !== fieldId &&
            field.field_name.toLowerCase() === updateData.field_name.toLowerCase()
          )
        )
      );

      if (fieldNameExists) {
        return res.status(400).json({
          success: false,
          message: "Field name must be unique within the configuration",
        });
      }
    }

    // Handle dropdown configuration
    if (updateData.field_type === "dropdown" || targetField.field_type === "dropdown") {
      if (updateData.field_type === "dropdown" && (!updateData.dropdown_config || (!updateData.dropdown_config.dropdown_id && !updateData.dropdown_config.dropdown_name))) {
        return res.status(400).json({
          success: false,
          message: "Dropdown configuration is required for dropdown fields",
        });
      }

      if (updateData.dropdown_config) {
        const query = {
          company_id: req.user.company_id,
          is_active: true,
        };

        if (updateData.dropdown_config.dropdown_id) {
          query._id = updateData.dropdown_config.dropdown_id;
        } else if (updateData.dropdown_config.dropdown_name) {
          query.dropdown_name = updateData.dropdown_config.dropdown_name;
        }

        const dropdown = await DropdownMaster.findOne(query);

        if (!dropdown) {
          return res.status(400).json({
            success: false,
            message: "Selected dropdown not found or inactive",
          });
        }

        // Update dropdown config
        updateData.dropdown_config = {
          dropdown_id: dropdown._id,
          dropdown_name: dropdown.dropdown_name,
          allow_multiple: updateData.dropdown_config.allow_multiple || false,
        };
      }
    }

    // Remove dropdown_config from updateData if we're not changing to dropdown
    if (updateData.field_type !== "dropdown" && targetField.field_type !== "dropdown") {
      delete updateData.dropdown_config;
    }

    // Update the field
    Object.assign(targetField, updateData);
    targetField.updated_at = new Date();

    // Mark the specific path as modified
    config.markModified(fieldPath);
    
    await config.save();

    console.log("Field updated successfully:", targetField.field_name);

    res.status(200).json({
      success: true,
      message: "Field updated successfully",
      data: targetField,
    });
  } catch (error) {
    console.error("Update tradein field error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating field: " + error.message,
    });
  }
};

const deleteTradeinField = async (req, res) => {
  try {
    const config = await TradeinConfig.findOne({
      _id: req.params.id,
      company_id: req.user.company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find and remove field across all categories and sections
    let fieldRemoved = false;
    let targetCategory = null;
    let targetSection = null;

    for (const category of config.categories) {
      for (const section of category.sections) {
        const fieldIndex = section.fields.findIndex(
          (field) => field.field_id === req.params.fieldId
        );
        if (fieldIndex !== -1) {
          section.fields.splice(fieldIndex, 1);
          fieldRemoved = true;
          targetCategory = category;
          targetSection = section;
          break;
        }
      }
      if (fieldRemoved) break;
    }

    if (!fieldRemoved) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Update display orders for remaining fields in the section
    if (targetSection && targetSection.fields) {
      targetSection.fields.forEach((field, index) => {
        field.display_order = index;
      });
    }

    // Mark the entire path as modified to ensure Mongoose detects the change
    config.markModified('categories');
    
    await config.save();

    res.status(200).json({
      success: true,
      message: "Field deleted successfully",
      data: {
        field_id: req.params.fieldId,
        category_id: targetCategory?.category_id,
        section_id: targetSection?.section_id
      },
    });
  } catch (error) {
    console.error("Delete tradein field error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting field: " + error.message,
    });
  }
};

const deleteTradeinSection = async (req, res) => {
  try {
    const { id: configId, sectionId } = req.params;
    const { company_id } = req.user;

    const config = await TradeinConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find and remove the section from all categories
    let sectionRemoved = false;
    config.categories.forEach((category) => {
      const initialLength = category.sections.length;
      category.sections = category.sections.filter(
        (section) => section.section_id !== sectionId
      );
      if (category.sections.length < initialLength) {
        sectionRemoved = true;
      }
    });

    if (!sectionRemoved) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete tradein section error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete section",
    });
  }
};

// Update sections order for tradein
const updateTradeinSectionsOrder = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { sections } = req.body;
    const { company_id } = req.user;

    const config = await TradeinConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    const category = config.categories.find(
      (cat) => cat.category_id === categoryId
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Update display order for sections based on the array received
    sections.forEach((sectionUpdate, index) => {
      const section = category.sections.find(
        (s) => s.section_id === sectionUpdate.section_id
      );
      if (section) {
        section.display_order = sectionUpdate.display_order !== undefined ? sectionUpdate.display_order : index;
      }
    });

    // Sort sections by display_order to maintain consistency
    category.sections.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    await config.save();

    res.status(200).json({
      success: true,
      message: "Section order updated successfully",
    });
  } catch (error) {
    console.error("Update tradein sections order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update section order",
    });
  }
};

// Update fields order for tradein
const updateTradeinFieldsOrder = async (req, res) => {
  try {
    const { id: configId, sectionId } = req.params;
    const { fields } = req.body;
    const { company_id } = req.user;

    const config = await TradeinConfig.findOne({
      _id: configId,
      company_id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find the section
    const targetSection = config.sections.find((s) => s.section_id === sectionId);

    if (!targetSection) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Update display order for fields based on the array received
    fields.forEach((fieldUpdate, index) => {
      const field = targetSection.fields.find(
        (f) => f.field_id === fieldUpdate.field_id
      );
      if (field) {
        field.display_order = fieldUpdate.display_order !== undefined ? fieldUpdate.display_order : index;
      }
    });

    // Sort fields by display_order to maintain consistency
    targetSection.fields.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    await config.save();

    res.status(200).json({
      success: true,
      message: "Field order updated successfully",
    });
  } catch (error) {
    console.error("Update tradein fields order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update field order",
    });
  }
};

const updateInspectionCategory = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { category_name, description } = req.body;

    // Generate category_id from category_name
    const generated_category_id = category_name.toLowerCase().replace(/\s+/g, '_');

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Find and update the category
    const categoryIndex = config.categories.findIndex(cat => cat.category_id === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update category data
    config.categories[categoryIndex].category_name = category_name;
    config.categories[categoryIndex].category_id = generated_category_id;
    config.categories[categoryIndex].description = description;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: config.categories[categoryIndex]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const toggleInspectionCategoryStatus = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { is_active } = req.body;

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Find and update the category status
    const categoryIndex = config.categories.findIndex(cat => cat.category_id === categoryId);
    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    config.categories[categoryIndex].is_active = is_active;
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Category status updated successfully',
      data: config.categories[categoryIndex]
    });
  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Calculation management for inspection configs
const addInspectionCalculation = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { display_name, internal_name } = req.body;

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if calculation name already exists in this category
    const existingCalculation = category.calculations?.find(calc => 
      calc.internal_name === internal_name || calc.display_name === display_name
    );

    if (existingCalculation) {
      return res.status(400).json({
        success: false,
        message: 'Calculation with this name already exists'
      });
    }

    const newCalculation = {
      calculation_id: `calc_${Date.now()}`,
      display_name,
      internal_name,
      formula: [],
      is_active: true
    };

    if (!category.calculations) {
      category.calculations = [];
    }
    category.calculations.push(newCalculation);
    
    await config.save();

    res.status(201).json({
      success: true,
      data: newCalculation
    });
  } catch (error) {
    console.error('Add calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add calculation'
    });
  }
};

const updateInspectionCalculationFormula = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;
    const { formula } = req.body;

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const calculation = category.calculations?.find(calc => calc.calculation_id === calculationId);
    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    calculation.formula = formula;
    await config.save();

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Update calculation formula error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calculation formula'
    });
  }
};

const deleteInspectionCalculation = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (!category.calculations) {
      return res.status(404).json({
        success: false,
        message: 'No calculations found'
      });
    }

    const calculationIndex = category.calculations.findIndex(calc => calc.calculation_id === calculationId);
    if (calculationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    category.calculations.splice(calculationIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    console.error('Delete calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calculation'
    });
  }
};

const toggleInspectionCalculationStatus = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;
    const { is_active } = req.body;

    const config = await InspectionConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const calculation = category.calculations?.find(calc => calc.calculation_id === calculationId);
    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    calculation.is_active = is_active;
    await config.save();

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Toggle calculation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle calculation status'
    });
  }
};

// Calculation management for tradein configs
const addTradeinCalculation = async (req, res) => {
  try {
    const { id: configId, categoryId } = req.params;
    const { display_name, internal_name } = req.body;

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if calculation name already exists in this category
    const existingCalculation = category.calculations?.find(calc => 
      calc.internal_name === internal_name || calc.display_name === display_name
    );

    if (existingCalculation) {
      return res.status(400).json({
        success: false,
        message: 'Calculation with this name already exists'
      });
    }

    const newCalculation = {
      calculation_id: `calc_${Date.now()}`,
      display_name,
      internal_name,
      formula: [],
      is_active: true
    };

    if (!category.calculations) {
      category.calculations = [];
    }
    category.calculations.push(newCalculation);
    
    await config.save();

    res.status(201).json({
      success: true,
      data: newCalculation
    });
  } catch (error) {
    console.error('Add tradein calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add calculation'
    });
  }
};

const updateTradeinCalculationFormula = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;
    const { formula } = req.body;

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const calculation = category.calculations?.find(calc => calc.calculation_id === calculationId);
    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    calculation.formula = formula;
    await config.save();

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Update calculation formula error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update calculation formula',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteTradeinCalculation = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Find the category within the config
    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (!category.calculations || category.calculations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No calculations found in this category'
      });
    }

    const calculationIndex = category.calculations.findIndex(calc => calc.calculation_id === calculationId);
    if (calculationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    category.calculations.splice(calculationIndex, 1);
    await config.save();

    res.status(200).json({
      success: true,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    console.error('Delete tradein calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete calculation'
    });
  }
};

const toggleTradeinCalculationStatus = async (req, res) => {
  try {
    const { id: configId, categoryId, calculationId } = req.params;
    const { is_active } = req.body;

    const config = await TradeinConfig.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    const category = config.categories.find(cat => cat.category_id === categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const calculation = category.calculations?.find(calc => calc.calculation_id === calculationId);
    if (!calculation) {
      return res.status(404).json({
        success: false,
        message: 'Calculation not found'
      });
    }

    calculation.is_active = is_active;
    await config.save();

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Toggle calculation status error:', error); // Changed to match inspection
    res.status(500).json({
      success: false,
      message: 'Failed to toggle calculation status'
    });
  }
};
module.exports = {
  getInspectionConfigs,
  getInspectionConfigDetails,
  createInspectionConfig,
  updateInspectionConfig,
  deleteInspectionConfig,
  addInspectionSection,
  addInspectionField,
  updateInspectionField,
  deleteInspectionField,
  deleteInspectionSection,
  updateSectionsOrder,
  updateFieldsOrder,
  getTradeinConfigs,
  getTradeinConfigDetails,
  createTradeinConfig,
  updateTradeinConfig,
  deleteTradeinConfig,
  addTradeinSection,
  addTradeinField,
  updateTradeinField,
  deleteTradeinField,
  deleteTradeinSection,
  updateTradeinSectionsOrder,
  updateTradeinFieldsOrder,
  addInspectionCategory,
  addTradeinCategory,
  updateTradeinCategory,
  toggleTradeinCategoryStatus,
  updateInspectionCategory,
  toggleInspectionCategoryStatus,
  addInspectionCalculation,
  updateInspectionCalculationFormula,
  deleteInspectionCalculation,
  toggleInspectionCalculationStatus,
  addTradeinCalculation,
  updateTradeinCalculationFormula,
  deleteTradeinCalculation,
  toggleTradeinCalculationStatus,
};
 