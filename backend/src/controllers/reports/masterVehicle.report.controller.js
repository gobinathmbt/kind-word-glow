/**
 * MasterVehicle Report Controller
 * Handles all master vehicle-related analytics and reporting endpoints
 */

const MasterVehicle = require('../../models/MasterVehicle');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Master Vehicle Inventory
 * Provides stock analysis and status distribution for master vehicles
 * 
 * @route GET /api/company/reports/master-vehicle/inventory
 * @access Private (company_super_admin, company_admin)
 */
const getMasterVehicleInventory = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'master',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Inventory Summary
    const inventorySummary = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          pricingReady: {
            $sum: {
              $cond: [{ $eq: ['$is_pricing_ready', true] }, 1, 0]
            }
          },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          },
          avgPurchasePrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] } 
          },
          totalInventoryValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          pricingReady: 1,
          pricingReadyRate: {
            $round: [
              { $multiply: [{ $divide: ['$pricingReady', '$totalVehicles'] }, 100] },
              1
            ]
          },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] }
        }
      }
    ]);

    // 2. Status Distribution
    const statusDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Dealership-wise Inventory
    const dealershipInventory = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          count: { $sum: 1 },
          pricingReady: {
            $sum: {
              $cond: [{ $eq: ['$is_pricing_ready', true] }, 1, 0]
            }
          },
          totalValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          pricingReady: 1,
          totalValue: { $round: ['$totalValue', 2] },
          avgValuePerVehicle: {
            $round: [{ $divide: ['$totalValue', '$count'] }, 2]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Make and Model Distribution
    const makeModelDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          },
          pricingReady: {
            $sum: {
              $cond: [{ $eq: ['$is_pricing_ready', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          pricingReady: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 5. Year Distribution
    const yearDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // 6. Monthly Inventory Trends
    const monthlyTrends = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          count: { $sum: 1 },
          pricingReady: {
            $sum: {
              $cond: [{ $eq: ['$is_pricing_ready', true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const responseData = {
      inventorySummary: inventorySummary[0] || {
        totalVehicles: 0,
        pricingReady: 0,
        pricingReadyRate: 0,
        avgRetailPrice: 0,
        avgPurchasePrice: 0,
        totalInventoryValue: 0
      },
      statusDistribution,
      dealershipInventory,
      makeModelDistribution,
      yearDistribution,
      monthlyTrends
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'master-vehicle-inventory',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Master Vehicle Inventory');
  }
};

/**
 * Get Master Vehicle Specifications
 * Provides detailed specification analysis for master vehicles
 * 
 * @route GET /api/company/reports/master-vehicle/specifications
 * @access Private (company_super_admin, company_admin)
 */
const getMasterVehicleSpecifications = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'master',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Engine Specifications Overview
    const engineSpecifications = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            engineType: '$vehicle_eng_transmission.engine_type',
            transmissionType: '$vehicle_eng_transmission.transmission_type'
          },
          count: { $sum: 1 },
          avgEngineSize: { $avg: '$vehicle_eng_transmission.engine_size' },
          avgCylinders: { $avg: '$vehicle_eng_transmission.no_of_cylinders' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgEngineSize: { $round: ['$avgEngineSize', 0] },
          avgCylinders: { $round: ['$avgCylinders', 1] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 2. Fuel Type Distribution
    const fuelTypeDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_eng_transmission.primary_fuel_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Body Style Distribution
    const bodyStyleDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$body_style',
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Interior and Exterior Features
    const interiorExteriorFeatures = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_specifications', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          avgSeats: { $avg: '$vehicle_specifications.number_of_seats' },
          avgDoors: { $avg: '$vehicle_specifications.number_of_doors' },
          sunroofCount: {
            $sum: {
              $cond: [{ $eq: ['$vehicle_specifications.sunroof', true] }, 1, 0]
            }
          },
          totalVehicles: { $sum: 1 },
          interiorColors: { $addToSet: '$vehicle_specifications.interior_color' },
          exteriorColors: { $addToSet: '$vehicle_specifications.exterior_primary_color' }
        }
      },
      {
        $project: {
          _id: 0,
          avgSeats: { $round: ['$avgSeats', 1] },
          avgDoors: { $round: ['$avgDoors', 1] },
          sunroofCount: 1,
          sunroofRate: {
            $round: [
              { $multiply: [{ $divide: ['$sunroofCount', '$totalVehicles'] }, 100] },
              1
            ]
          },
          uniqueInteriorColors: { $size: '$interiorColors' },
          uniqueExteriorColors: { $size: '$exteriorColors' }
        }
      }
    ]);

    // 5. Steering Type Distribution
    const steeringTypeDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_specifications', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_specifications.steering_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 6. Specification Completeness Score
    const specificationCompleteness = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          hasEngineSpec: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$vehicle_eng_transmission', []] } }, 0] },
              1,
              0
            ]
          },
          hasVehicleSpec: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$vehicle_specifications', []] } }, 0] },
              1,
              0
            ]
          },
          hasOdometer: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$vehicle_odometer', []] } }, 0] },
              1,
              0
            ]
          },
          hasRegistration: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$vehicle_registration', []] } }, 0] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          withEngineSpec: { $sum: '$hasEngineSpec' },
          withVehicleSpec: { $sum: '$hasVehicleSpec' },
          withOdometer: { $sum: '$hasOdometer' },
          withRegistration: { $sum: '$hasRegistration' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          engineSpecRate: {
            $round: [
              { $multiply: [{ $divide: ['$withEngineSpec', '$totalVehicles'] }, 100] },
              1
            ]
          },
          vehicleSpecRate: {
            $round: [
              { $multiply: [{ $divide: ['$withVehicleSpec', '$totalVehicles'] }, 100] },
              1
            ]
          },
          odometerRate: {
            $round: [
              { $multiply: [{ $divide: ['$withOdometer', '$totalVehicles'] }, 100] },
              1
            ]
          },
          registrationRate: {
            $round: [
              { $multiply: [{ $divide: ['$withRegistration', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    const responseData = {
      engineSpecifications,
      fuelTypeDistribution,
      bodyStyleDistribution,
      interiorExteriorFeatures: interiorExteriorFeatures[0] || {},
      steeringTypeDistribution,
      specificationCompleteness: specificationCompleteness[0] || {}
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'master-vehicle-specifications',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Master Vehicle Specifications');
  }
};

/**
 * Get Master Vehicle Source Analysis
 * Analyzes source and supplier tracking for master vehicles
 * 
 * @route GET /api/company/reports/master-vehicle/source-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getMasterVehicleSourceAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'master',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Source Overview
    const sourceOverview = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_source', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          vehiclesWithSource: {
            $sum: {
              $cond: [{ $ne: ['$vehicle_source', null] }, 1, 0]
            }
          },
          uniqueSuppliers: { $addToSet: '$vehicle_source.supplier' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          vehiclesWithSource: 1,
          sourceRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithSource', '$totalVehicles'] }, 100] },
              1
            ]
          },
          uniqueSuppliersCount: { $size: '$uniqueSuppliers' }
        }
      }
    ]);

    // 2. Supplier Distribution
    const supplierDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_source', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_source.supplier',
          count: { $sum: 1 },
          avgPurchasePrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] } 
          },
          totalPurchaseValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          totalPurchaseValue: { $round: ['$totalPurchaseValue', 2] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 3. Purchase Type Distribution
    const purchaseTypeDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_source', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_source.purchase_type',
          count: { $sum: 1 },
          avgPurchasePrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] } 
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Purchase Timeline
    const purchaseTimeline = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_source', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$vehicle_source.purchase_date' },
            month: { $month: '$vehicle_source.purchase_date' }
          },
          count: { $sum: 1 },
          totalPurchaseValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          totalPurchaseValue: { $round: ['$totalPurchaseValue', 2] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Supplier Performance by Make
    const supplierByMake = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_source', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            supplier: '$vehicle_source.supplier',
            make: '$make'
          },
          count: { $sum: 1 },
          avgPurchasePrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] } 
          }
        }
      },
      {
        $group: {
          _id: '$_id.supplier',
          makes: {
            $push: {
              make: '$_id.make',
              count: '$count',
              avgPrice: { $round: ['$avgPurchasePrice', 2] }
            }
          },
          totalVehicles: { $sum: '$count' }
        }
      },
      { $sort: { totalVehicles: -1 } },
      { $limit: 10 }
    ]);

    // 6. Trader Acquisition Analysis
    const traderAcquisitionAnalysis = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_other_details.trader_acquisition',
          count: { $sum: 1 },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const responseData = {
      sourceOverview: sourceOverview[0] || {
        totalVehicles: 0,
        vehiclesWithSource: 0,
        sourceRate: 0,
        uniqueSuppliersCount: 0
      },
      supplierDistribution,
      purchaseTypeDistribution,
      purchaseTimeline,
      supplierByMake,
      traderAcquisitionAnalysis
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'master-vehicle-source-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Master Vehicle Source Analysis');
  }
};

/**
 * Get Master Vehicle Workshop Status
 * Analyzes workshop integration metrics for master vehicles
 * 
 * @route GET /api/company/reports/master-vehicle/workshop-status
 * @access Private (company_super_admin, company_admin)
 */
const getMasterVehicleWorkshopStatus = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'master',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Workshop Status Overview
    const workshopOverview = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          workshopEnabled: {
            $sum: {
              $cond: [{ $eq: ['$is_workshop', true] }, 1, 0]
            }
          },
          reportReady: {
            $sum: {
              $cond: [{ $eq: ['$workshop_report_ready', true] }, 1, 0]
            }
          },
          reportPreparing: {
            $sum: {
              $cond: [{ $eq: ['$workshop_report_preparing', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          workshopEnabled: 1,
          workshopRate: {
            $round: [
              { $multiply: [{ $divide: ['$workshopEnabled', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reportReady: 1,
          reportReadyRate: {
            $round: [
              { $multiply: [{ $divide: ['$reportReady', '$workshopEnabled'] }, 100] },
              1
            ]
          },
          reportPreparing: 1
        }
      }
    ]);

    // 2. Workshop Progress Distribution
    const workshopProgressDistribution = await MasterVehicle.aggregate([
      { $match: { ...baseMatch, is_workshop: true } },
      {
        $group: {
          _id: '$workshop_progress',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Workshop Status by Dealership
    const workshopByDealership = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          workshopEnabled: {
            $sum: {
              $cond: [{ $eq: ['$is_workshop', true] }, 1, 0]
            }
          },
          reportReady: {
            $sum: {
              $cond: [{ $eq: ['$workshop_report_ready', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          workshopEnabled: 1,
          workshopRate: {
            $round: [
              { $multiply: [{ $divide: ['$workshopEnabled', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reportReady: 1
        }
      },
      { $sort: { workshopEnabled: -1 } }
    ]);

    // 4. Workshop Timeline Analysis
    const workshopTimeline = await MasterVehicle.aggregate([
      { $match: { ...baseMatch, is_workshop: true } },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          count: { $sum: 1 },
          reportReady: {
            $sum: {
              $cond: [{ $eq: ['$workshop_report_ready', true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Workshop Status by Make and Model
    const workshopByMakeModel = await MasterVehicle.aggregate([
      { $match: { ...baseMatch, is_workshop: true } },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          reportReady: {
            $sum: {
              $cond: [{ $eq: ['$workshop_report_ready', true] }, 1, 0]
            }
          },
          inProgress: {
            $sum: {
              $cond: [{ $eq: ['$workshop_progress', 'in_progress'] }, 1, 0]
            }
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$workshop_progress', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 6. Workshop Report Preparation Status
    const reportPreparationStatus = await MasterVehicle.aggregate([
      { $match: { ...baseMatch, is_workshop: true } },
      {
        $group: {
          _id: {
            reportReady: '$workshop_report_ready',
            reportPreparing: '$workshop_report_preparing'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const responseData = {
      workshopOverview: workshopOverview[0] || {
        totalVehicles: 0,
        workshopEnabled: 0,
        workshopRate: 0,
        reportReady: 0,
        reportReadyRate: 0,
        reportPreparing: 0
      },
      workshopProgressDistribution,
      workshopByDealership,
      workshopTimeline,
      workshopByMakeModel,
      reportPreparationStatus
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'master-vehicle-workshop-status',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Master Vehicle Workshop Status');
  }
};

/**
 * Get Master Vehicle Pricing Strategy
 * Analyzes pricing and valuation for master vehicles
 * 
 * @route GET /api/company/reports/master-vehicle/pricing-strategy
 * @access Private (company_super_admin, company_admin)
 */
const getMasterVehiclePricingStrategy = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'master',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Pricing Overview
    const pricingOverview = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          pricingReady: {
            $sum: {
              $cond: [{ $eq: ['$is_pricing_ready', true] }, 1, 0]
            }
          },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' },
          avgExactExpenses: { $avg: '$vehicle_other_details.exact_expenses' },
          avgEstimatedExpenses: { $avg: '$vehicle_other_details.estimated_expenses' },
          totalInventoryValue: { $sum: '$vehicle_other_details.retail_price' },
          totalRevenue: { $sum: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          pricingReady: 1,
          pricingReadyRate: {
            $round: [
              { $multiply: [{ $divide: ['$pricingReady', '$totalVehicles'] }, 100] },
              1
            ]
          },
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] },
          avgExactExpenses: { $round: ['$avgExactExpenses', 2] },
          avgEstimatedExpenses: { $round: ['$avgEstimatedExpenses', 2] },
          totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgProfitMargin: {
            $round: [
              { $subtract: ['$avgSoldPrice', { $add: ['$avgPurchasePrice', '$avgExactExpenses'] }] },
              2
            ]
          }
        }
      }
    ]);

    // 2. Pricing by Status
    const pricingByStatus = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_other_details.status',
          count: { $sum: 1 },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Price Range Distribution
    const priceRangeDistribution = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_other_details.retail_price',
          boundaries: [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000, 1000000],
          default: '1000000+',
          output: {
            count: { $sum: 1 },
            avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
            avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      }
    ]);

    // 4. Pricing by Make and Model
    const pricingByMakeModel = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' },
          totalRevenue: { $sum: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgProfitMargin: {
            $round: [
              { $subtract: ['$avgSoldPrice', '$avgPurchasePrice'] },
              2
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);

    // 5. GST Inclusive Analysis
    const gstAnalysis = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_other_details.gst_inclusive',
          count: { $sum: 1 },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] }
        }
      }
    ]);

    // 6. Pricing Trends Over Time
    const pricingTrends = await MasterVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          count: { $sum: 1 },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 7. Cost Details Analysis
    const costDetailsAnalysis = await MasterVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          vehiclesWithCostDetails: {
            $sum: {
              $cond: [{ $ne: ['$cost_details', null] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          vehiclesWithCostDetails: 1,
          costDetailsRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithCostDetails', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    const responseData = {
      pricingOverview: pricingOverview[0] || {
        totalVehicles: 0,
        pricingReady: 0,
        pricingReadyRate: 0,
        avgPurchasePrice: 0,
        avgRetailPrice: 0,
        avgSoldPrice: 0,
        avgExactExpenses: 0,
        avgEstimatedExpenses: 0,
        totalInventoryValue: 0,
        totalRevenue: 0,
        avgProfitMargin: 0
      },
      pricingByStatus,
      priceRangeDistribution,
      pricingByMakeModel,
      gstAnalysis,
      pricingTrends,
      costDetailsAnalysis: costDetailsAnalysis[0] || {
        totalVehicles: 0,
        vehiclesWithCostDetails: 0,
        costDetailsRate: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'master-vehicle-pricing-strategy',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Master Vehicle Pricing Strategy');
  }
};

module.exports = {
  getMasterVehicleInventory,
  getMasterVehicleSpecifications,
  getMasterVehicleSourceAnalysis,
  getMasterVehicleWorkshopStatus,
  getMasterVehiclePricingStrategy
};
