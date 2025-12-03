const express = require("express");
const router = express.Router();
const axios = require("axios");
const MasterAdmin = require("../models/MasterAdmin");
const Env_Configuration = require("../config/env");

// @desc    Get address autocomplete suggestions
// @route   GET /api/googlemaps/autocomplete
// @access  Public
router.get("/autocomplete", async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || input.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Input query is required and must be at least 2 characters",
      });
    }

    // Fetch Google Maps API key from database
    const masterAdmin = await MasterAdmin.findOne();
    const GOOGLE_MAPS_API_KEY = masterAdmin?.payment_settings?.google_maps_api_key;

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Google Maps API key is not configured. Please configure it in Master Admin → Settings → Payment Settings",
      });
    }

    // Call Google Maps Places Autocomplete API
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      {
        params: {
          input,
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status === "OK") {
      const suggestions = response.data.predictions.map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
      }));

      return res.status(200).json({
        success: true,
        suggestions,
      });
    } else if (response.data.status === "ZERO_RESULTS") {
      return res.status(200).json({
        success: true,
        suggestions: [],
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `Google Maps API error: ${response.data.status}`,
      });
    }
  } catch (error) {
    console.error("Google Maps autocomplete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch address suggestions",
    });
  }
});

// @desc    Get place details by place_id
// @route   GET /api/googlemaps/place-details
// @access  Public
router.get("/place-details", async (req, res) => {
  try {
    const { place_id } = req.query;

    if (!place_id) {
      return res.status(400).json({
        success: false,
        message: "place_id is required",
      });
    }

    // Fetch Google Maps API key from database
    const masterAdmin = await MasterAdmin.findOne();
    const GOOGLE_MAPS_API_KEY = masterAdmin?.payment_settings?.google_maps_api_key;

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Google Maps API key is not configured. Please configure it in Master Admin → Settings → Payment Settings",
      });
    }

    // Call Google Maps Place Details API
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id,
          fields: "address_components,formatted_address",
          key: GOOGLE_MAPS_API_KEY,
        },
      }
    );

    if (response.data.status === "OK") {
      const place = response.data.result;
      
      let city = "";
      let state = "";
      let country = "";
      let pincode = "";

      // Parse address components
      place.address_components?.forEach((component) => {
        const types = component.types;

        if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_3") && !city) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_2") && !city) {
          city = component.long_name;
        }

        if (types.includes("administrative_area_level_1")) {
          state = component.long_name;
        }

        if (types.includes("country")) {
          country = component.long_name;
        }

        if (types.includes("postal_code")) {
          pincode = component.long_name;
        }
      });

      return res.status(200).json({
        success: true,
        place: {
          formatted_address: place.formatted_address,
          city,
          state,
          country,
          pincode,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `Google Maps API error: ${response.data.status}`,
      });
    }
  } catch (error) {
    console.error("Google Maps place details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch place details",
    });
  }
});

module.exports = router;
