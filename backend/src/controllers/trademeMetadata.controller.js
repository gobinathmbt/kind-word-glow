const TrademeMetadata = require("../models/TrademeMetadata");

const trademeMetadataController = {
  // Get all trademe metadata with pagination and filters
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        metadata_type,
        parent_id,
        category_id,
        is_active,
      } = req.query;

      const skip = (page - 1) * limit;
      const filter = {};

      // Apply filters
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { value_id: parseInt(search) || 0 },
        ];
      }

      if (metadata_type) {
        filter.metadata_type = metadata_type;
      }

      if (parent_id) {
        filter.parent_id = parseInt(parent_id);
      }

      if (category_id) {
        filter.category_id = parseInt(category_id);
      }

      if (is_active !== undefined && is_active !== "" && is_active !== "all") {
        const parsedIsActive = parseInt(is_active);
        if (!isNaN(parsedIsActive)) {
          filter.is_active = parsedIsActive;
        }
      }

      const [data, total] = await Promise.all([
        TrademeMetadata.find(filter)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        TrademeMetadata.countDocuments(filter),
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
      console.error("Error retrieving trademe metadata:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving trademe metadata",
        error: error.message,
      });
    }
  },

  // Get single trademe metadata by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TrademeMetadata.findById(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Trademe metadata not found",
        });
      }

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error("Error retrieving trademe metadata:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving trademe metadata",
        error: error.message,
      });
    }
  },

  // Update trademe metadata
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Don't allow updating value_id to avoid conflicts
      delete updateData.value_id;

      const updatedData = await TrademeMetadata.findByIdAndUpdate(
        id,
        { ...updateData, updated_at: Date.now() },
        { new: true }
      );

      if (!updatedData) {
        return res.status(404).json({
          success: false,
          message: "Trademe metadata not found",
        });
      }

      res.json({
        success: true,
        data: updatedData,
        message: "Trademe metadata updated successfully",
      });
    } catch (error) {
      console.error("Error updating trademe metadata:", error);
      res.status(500).json({
        success: false,
        message: "Error updating trademe metadata",
        error: error.message,
      });
    }
  },

  // Delete trademe metadata
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedData = await TrademeMetadata.findByIdAndDelete(id);

      if (!deletedData) {
        return res.status(404).json({
          success: false,
          message: "Trademe metadata not found",
        });
      }

      res.json({
        success: true,
        message: "Trademe metadata deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting trademe metadata:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting trademe metadata",
        error: error.message,
      });
    }
  },

  // Toggle active status
  toggleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const updatedData = await TrademeMetadata.findByIdAndUpdate(
        id,
        { is_active, updated_at: Date.now() },
        { new: true }
      );

      if (!updatedData) {
        return res.status(404).json({
          success: false,
          message: "Trademe metadata not found",
        });
      }

      res.json({
        success: true,
        data: updatedData,
        message: "Status updated successfully",
      });
    } catch (error) {
      console.error("Error toggling status:", error);
      res.status(500).json({
        success: false,
        message: "Error toggling status",
        error: error.message,
      });
    }
  },

  // Get counts by metadata type
  getCounts: async (req, res) => {
    try {
      const counts = await TrademeMetadata.aggregate([
        {
          $group: {
            _id: "$metadata_type",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalCount = await TrademeMetadata.countDocuments({
        is_active: 1,
      });

      const countsByType = {};
      counts.forEach((item) => {
        countsByType[item._id] = item.count;
      });

      res.json({
        success: true,
        data: {
          total: totalCount,
          ...countsByType,
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


};

module.exports = trademeMetadataController;
