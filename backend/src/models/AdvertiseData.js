const mongoose = require("mongoose");
const ModelRegistry = require('./modelRegistry');

const AdvertiseDataSchema = new mongoose.Schema({
  vehicle_stock_id: {
    type: Number,
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealership",
    required: true,
  },
  vehicle_type: {
    type: String,
    enum: ["inspection", "tradein", "advertisement", "master"],
    required: true,
  },
  provider: {
    type: String,
    enum: ["OnlyCars", "TradeMe"],
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published", "failed", "sold", "withdrawn"],
    default: "draft",
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  payload: mongoose.Schema.Types.Mixed,
  final_payload: mongoose.Schema.Types.Mixed, // The final transformed payload sent to the API
  history: [
    {
      payload: mongoose.Schema.Types.Mixed,
      updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      updated_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  published_at: Date,
  published_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  withdrawn_at: Date,
  withdrawn_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  external_listing_id: String,
  last_api_response: mongoose.Schema.Types.Mixed,
});

AdvertiseDataSchema.index(
  { 
    vehicle_stock_id: 1, 
    company_id: 1, 
    dealership_id: 1, 
    vehicle_type: 1,
    provider: 1 
  },
  { unique: true }
);

AdvertiseDataSchema.index({ company_id: 1, status: 1 });
AdvertiseDataSchema.index({ vehicle_stock_id: 1, company_id: 1 });
AdvertiseDataSchema.index({ created_at: -1 });

AdvertiseDataSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});


ModelRegistry.registerModel('AdvertiseData', AdvertiseDataSchema, 'company');
module.exports = mongoose.model("AdvertiseData", AdvertiseDataSchema);
