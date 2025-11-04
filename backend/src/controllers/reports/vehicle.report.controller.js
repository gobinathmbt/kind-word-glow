/**
 * Vehicle Report Controller
 * Handles all vehicle-related analytics and reporting endpoints
 */

const Vehicle = require('../../models/Vehicle');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Vehicle Overview by Type
 * Provides comprehensive analytics on vehicle distribution by type (inspection, tradein, master, advertisement)
 * Includes status distribution, monthly trends, dealership comparison, and heat map data
 * 
 * @route GET /api/company/reports/vehicle/overview-by-type
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleOverviewByType = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    // Base match criteria
    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };
console.log(baseMatch)
    // 1. Type Distribution with Status Breakdown
    const typeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            type: '$vehicle_type',
            status: '$status'
          },
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { 
              $arrayElemAt: ['$vehicle_other_details.retail_price', 0] 
            } 
          },
          avgPurchasePrice: { 
            $avg: { 
              $arrayElemAt: ['$vehicle_other_details.purchase_price', 0] 
            } 
          }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          totalCount: { $sum: '$count' },
          avgRetailPrice: { $avg: '$avgRetailPrice' },
          avgPurchasePrice: { $avg: '$avgPurchasePrice' },
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 2. Monthly Trends
    const monthlyTrends = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            type: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $group: {
          _id: '$_id.type',
          trends: {
            $push: {
              year: '$_id.year',
              month: '$_id.month',
              count: '$count'
            }
          }
        }
      }
    ]);

    // 3. Dealership Comparison (if multiple dealerships)
    const dealershipComparison = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            type: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          typeBreakdown: {
            $push: {
              type: '$_id.type',
              count: '$count'
            }
          },
          totalVehicles: { $sum: '$count' }
        }
      },
      { $sort: { totalVehicles: -1 } }
    ]);

    // 4. Heat Map Data (Day of Week vs Hour of Day for vehicle creation)
    const heatMapData = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$created_at' },
            hour: { $hour: '$created_at' },
            type: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          heatMap: {
            $push: {
              dayOfWeek: '$_id.dayOfWeek',
              hour: '$_id.hour',
              count: '$count'
            }
          }
        }
      }
    ]);

    // 5. Detailed Breakdown by Make, Year, and Pricing
    const detailedBreakdown = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            type: '$vehicle_type',
            make: '$make',
            year: '$year'
          },
          count: { $sum: 1 },
          avgRetailPrice: { 
            $avg: { 
              $arrayElemAt: ['$vehicle_other_details.retail_price', 0] 
            } 
          },
          minRetailPrice: { 
            $min: { 
              $arrayElemAt: ['$vehicle_other_details.retail_price', 0] 
            } 
          },
          maxRetailPrice: { 
            $max: { 
              $arrayElemAt: ['$vehicle_other_details.retail_price', 0] 
            } 
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 50 // Top 50 combinations
      }
    ]);

    // 6. Overall Summary Statistics
    const summary = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          uniqueMakes: { $addToSet: '$make' },
          uniqueModels: { $addToSet: '$model' },
          avgYear: { $avg: '$year' },
          minYear: { $min: '$year' },
          maxYear: { $max: '$year' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          uniqueMakesCount: { $size: '$uniqueMakes' },
          uniqueModelsCount: { $size: '$uniqueModels' },
          avgYear: { $round: ['$avgYear', 0] },
          minYear: 1,
          maxYear: 1
        }
      }
    ]);

    // Compile response
    const responseData = {
      typeDistribution,
      monthlyTrends,
      dealershipComparison,
      heatMapData,
      detailedBreakdown,
      summary: summary[0] || {
        totalVehicles: 0,
        uniqueMakesCount: 0,
        uniqueModelsCount: 0,
        avgYear: 0,
        minYear: 0,
        maxYear: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-overview-by-type',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Overview by Type');
  }
};


/**
 * Get Vehicle Import Timeline
 * Analyzes import details, ETD/ETA analysis, and port distribution
 * 
 * @route GET /api/company/reports/vehicle/import-timeline
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleImportTimeline = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Import Overview
    const importOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_import_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          vehiclesWithImportDetails: {
            $sum: {
              $cond: [
                { $ne: ['$vehicle_import_details', null] },
                1,
                0
              ]
            }
          },
          importedAsDamaged: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_import_details.imported_as_damaged', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          vehiclesWithImportDetails: 1,
          importedAsDamaged: 1,
          importRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithImportDetails', '$totalVehicles'] }, 100] },
              1
            ]
          },
          damagedRate: {
            $round: [
              { $multiply: [{ $divide: ['$importedAsDamaged', '$vehiclesWithImportDetails'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Port Distribution
    const portDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_import_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_import_details.delivery_port',
          count: { $sum: 1 },
          vehicleTypes: { $addToSet: '$vehicle_type' },
          avgDaysInYard: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$vehicle_import_details.date_on_yard'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          vehicleTypes: 1,
          avgDaysInYard: { $round: ['$avgDaysInYard', 1] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. ETD/ETA Analysis
    const etdEtaAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_import_details', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vehicle_type: 1,
          etd: '$vehicle_import_details.etd',
          eta: '$vehicle_import_details.eta',
          date_on_yard: '$vehicle_import_details.date_on_yard',
          transitDays: {
            $divide: [
              { $subtract: ['$vehicle_import_details.eta', '$vehicle_import_details.etd'] },
              1000 * 60 * 60 * 24
            ]
          },
          yardDelayDays: {
            $divide: [
              { $subtract: ['$vehicle_import_details.date_on_yard', '$vehicle_import_details.eta'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: '$vehicle_type',
          count: { $sum: 1 },
          avgTransitDays: { $avg: '$transitDays' },
          avgYardDelayDays: { $avg: '$yardDelayDays' },
          minTransitDays: { $min: '$transitDays' },
          maxTransitDays: { $max: '$transitDays' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgTransitDays: { $round: ['$avgTransitDays', 1] },
          avgYardDelayDays: { $round: ['$avgYardDelayDays', 1] },
          minTransitDays: { $round: ['$minTransitDays', 1] },
          maxTransitDays: { $round: ['$maxTransitDays', 1] }
        }
      }
    ]);

    // 4. Vessel Analysis
    const vesselAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_import_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            vessel: '$vehicle_import_details.vessel_name',
            voyage: '$vehicle_import_details.voyage'
          },
          count: { $sum: 1 },
          ports: { $addToSet: '$vehicle_import_details.delivery_port' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 5. Import Timeline Trends
    const importTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_import_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$vehicle_import_details.eta' },
            month: { $month: '$vehicle_import_details.eta' }
          },
          count: { $sum: 1 },
          damagedCount: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_import_details.imported_as_damaged', true] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const responseData = {
      importOverview,
      portDistribution,
      etdEtaAnalysis,
      vesselAnalysis,
      importTimeline
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-import-timeline',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Import Timeline');
  }
};

/**
 * Get Vehicle Engine Specifications
 * Analyzes engine types, transmission, and fuel type distribution
 * 
 * @route GET /api/company/reports/vehicle/engine-specifications
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleEngineSpecifications = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Engine Type Distribution
    const engineTypeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            engineType: '$vehicle_eng_transmission.engine_type',
            vehicleType: '$vehicle_type'
          },
          count: { $sum: 1 },
          avgEngineSize: { $avg: '$vehicle_eng_transmission.engine_size' },
          avgCylinders: { $avg: '$vehicle_eng_transmission.no_of_cylinders' }
        }
      },
      {
        $group: {
          _id: '$_id.engineType',
          totalCount: { $sum: '$count' },
          avgEngineSize: { $avg: '$avgEngineSize' },
          avgCylinders: { $avg: '$avgCylinders' },
          vehicleTypeBreakdown: {
            $push: {
              type: '$_id.vehicleType',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalCount: 1,
          avgEngineSize: { $round: ['$avgEngineSize', 0] },
          avgCylinders: { $round: ['$avgCylinders', 1] },
          vehicleTypeBreakdown: 1
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 2. Transmission Type Distribution
    const transmissionDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_eng_transmission.transmission_type',
          count: { $sum: 1 },
          vehicleTypes: { $addToSet: '$vehicle_type' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Fuel Type Analysis
    const fuelTypeAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            fuelType: '$vehicle_eng_transmission.primary_fuel_type',
            vehicleType: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.fuelType',
          totalCount: { $sum: '$count' },
          vehicleTypeBreakdown: {
            $push: {
              type: '$_id.vehicleType',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 4. Turbo Analysis
    const turboAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_eng_transmission.turbo',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. Engine Size Distribution (Bucketing)
    const engineSizeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_eng_transmission.engine_size',
          boundaries: [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000],
          default: '10000+',
          output: {
            count: { $sum: 1 },
            avgCylinders: { $avg: '$vehicle_eng_transmission.no_of_cylinders' }
          }
        }
      }
    ]);

    // 6. Cylinder Count Distribution
    const cylinderDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_eng_transmission.no_of_cylinders',
          count: { $sum: 1 },
          avgEngineSize: { $avg: '$vehicle_eng_transmission.engine_size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgEngineSize: { $round: ['$avgEngineSize', 0] }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 7. Engine Features Analysis
    const engineFeaturesAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_eng_transmission', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$vehicle_eng_transmission.engine_features', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_eng_transmission.engine_features',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const responseData = {
      engineTypeDistribution,
      transmissionDistribution,
      fuelTypeAnalysis,
      turboAnalysis,
      engineSizeDistribution,
      cylinderDistribution,
      engineFeaturesAnalysis
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-engine-specifications',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Engine Specifications');
  }
};
/**
 * Get Vehicle Odometer Trends
 * Analyzes odometer reading patterns and trends
 * 
 * @route GET /api/company/reports/vehicle/odometer-trends
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleOdometerTrends = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Odometer Overview
    const odometerOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_odometer', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          avgReading: { $avg: '$vehicle_odometer.reading' },
          minReading: { $min: '$vehicle_odometer.reading' },
          maxReading: { $max: '$vehicle_odometer.reading' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          avgReading: { $round: ['$avgReading', 0] },
          minReading: 1,
          maxReading: 1
        }
      }
    ]);

    // 2. Odometer Range Distribution
    const odometerRangeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_odometer', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_odometer.reading',
          boundaries: [0, 50000, 100000, 150000, 200000, 300000, 500000, 1000000],
          default: '1000000+',
          output: {
            count: { $sum: 1 },
            vehicleTypes: { $addToSet: '$vehicle_type' }
          }
        }
      }
    ]);

    // 3. Odometer by Vehicle Age
    const odometerByAge = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_odometer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vehicleAge: { $subtract: [new Date().getFullYear(), '$year'] },
          reading: '$vehicle_odometer.reading',
          vehicle_type: 1
        }
      },
      {
        $group: {
          _id: {
            ageGroup: {
              $switch: {
                branches: [
                  { case: { $lte: ['$vehicleAge', 3] }, then: '0-3 years' },
                  { case: { $lte: ['$vehicleAge', 5] }, then: '4-5 years' },
                  { case: { $lte: ['$vehicleAge', 10] }, then: '6-10 years' },
                  { case: { $lte: ['$vehicleAge', 15] }, then: '11-15 years' }
                ],
                default: '15+ years'
              }
            },
            type: '$vehicle_type'
          },
          count: { $sum: 1 },
          avgReading: { $avg: '$reading' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgReading: { $round: ['$avgReading', 0] }
        }
      },
      { $sort: { '_id.ageGroup': 1 } }
    ]);

    // 4. Odometer Certification Status
    const certificationStatus = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            certified: '$vehicle_other_details.odometer_certified',
            status: '$vehicle_other_details.odometer_status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. Odometer Trends Over Time
    const odometerTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_odometer', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$vehicle_odometer.reading_date' },
            month: { $month: '$vehicle_odometer.reading_date' }
          },
          count: { $sum: 1 },
          avgReading: { $avg: '$vehicle_odometer.reading' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgReading: { $round: ['$avgReading', 0] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const responseData = {
      odometerOverview,
      odometerRangeDistribution,
      odometerByAge,
      certificationStatus,
      odometerTimeline
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-odometer-trends',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Odometer Trends');
  }
};

/**
 * Get Vehicle Ownership History
 * Analyzes ownership patterns and PPSR analysis
 * 
 * @route GET /api/company/reports/vehicle/ownership-history
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleOwnershipHistory = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Ownership Overview
    const ownershipOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_ownership', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          avgPreviousOwners: { $avg: '$vehicle_ownership.no_of_previous_owners' },
          withPpsrInterest: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_ownership.security_interest_on_ppsr', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          avgPreviousOwners: { $round: ['$avgPreviousOwners', 1] },
          withPpsrInterest: 1,
          ppsrInterestRate: {
            $round: [
              { $multiply: [{ $divide: ['$withPpsrInterest', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Previous Owners Distribution
    const previousOwnersDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_ownership', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_ownership.no_of_previous_owners',
          count: { $sum: 1 },
          vehicleTypes: { $addToSet: '$vehicle_type' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Origin Distribution
    const originDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_ownership', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_ownership.origin',
          count: { $sum: 1 },
          avgPreviousOwners: { $avg: '$vehicle_ownership.no_of_previous_owners' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPreviousOwners: { $round: ['$avgPreviousOwners', 1] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. PPSR Security Interest Analysis
    const ppsrAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_ownership', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            hasPpsr: '$vehicle_ownership.security_interest_on_ppsr',
            vehicleType: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.hasPpsr',
          totalCount: { $sum: '$count' },
          vehicleTypeBreakdown: {
            $push: {
              type: '$_id.vehicleType',
              count: '$count'
            }
          }
        }
      }
    ]);

    // 5. Ownership by Make and Model
    const ownershipByMakeModel = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_ownership', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          avgPreviousOwners: { $avg: '$vehicle_ownership.no_of_previous_owners' },
          ppsrCount: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_ownership.security_interest_on_ppsr', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPreviousOwners: { $round: ['$avgPreviousOwners', 1] },
          ppsrCount: 1,
          ppsrRate: {
            $round: [
              { $multiply: [{ $divide: ['$ppsrCount', '$count'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const responseData = {
      ownershipOverview,
      previousOwnersDistribution,
      originDistribution,
      ppsrAnalysis,
      ownershipByMakeModel
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-ownership-history',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Ownership History');
  }
};

/**
 * Get Vehicle Queue Processing
 * Analyzes queue status, processing attempts, and failure analysis
 * 
 * @route GET /api/company/reports/vehicle/queue-processing
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleQueueProcessing = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Queue Status Overview
    const queueStatusOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            queueStatus: '$queue_status',
            vehicleType: '$vehicle_type'
          },
          count: { $sum: 1 },
          avgProcessingAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $group: {
          _id: '$_id.queueStatus',
          totalCount: { $sum: '$count' },
          avgProcessingAttempts: { $avg: '$avgProcessingAttempts' },
          vehicleTypeBreakdown: {
            $push: {
              type: '$_id.vehicleType',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalCount: 1,
          avgProcessingAttempts: { $round: ['$avgProcessingAttempts', 1] },
          vehicleTypeBreakdown: 1
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 2. Processing Attempts Distribution
    const processingAttemptsDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$processing_attempts',
          count: { $sum: 1 },
          queueStatuses: { $addToSet: '$queue_status' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Failed Processing Analysis
    const failedProcessingAnalysis = await Vehicle.aggregate([
      { 
        $match: { 
          ...baseMatch,
          queue_status: 'failed'
        } 
      },
      {
        $group: {
          _id: {
            vehicleType: '$vehicle_type',
            errorPattern: {
              $substr: ['$last_processing_error', 0, 50]
            }
          },
          count: { $sum: 1 },
          avgAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgAttempts: { $round: ['$avgAttempts', 1] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 4. Queue Processing Timeline
    const processingTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            queueStatus: '$queue_status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 5. Dealership Queue Performance
    const dealershipQueuePerformance = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$queue_status', 'pending'] },
                1,
                0
              ]
            }
          },
          processing: {
            $sum: {
              $cond: [
                { $eq: ['$queue_status', 'processing'] },
                1,
                0
              ]
            }
          },
          processed: {
            $sum: {
              $cond: [
                { $eq: ['$queue_status', 'processed'] },
                1,
                0
              ]
            }
          },
          failed: {
            $sum: {
              $cond: [
                { $eq: ['$queue_status', 'failed'] },
                1,
                0
              ]
            }
          },
          avgProcessingAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          pending: 1,
          processing: 1,
          processed: 1,
          failed: 1,
          avgProcessingAttempts: { $round: ['$avgProcessingAttempts', 1] },
          successRate: {
            $round: [
              { $multiply: [{ $divide: ['$processed', '$totalVehicles'] }, 100] },
              1
            ]
          },
          failureRate: {
            $round: [
              { $multiply: [{ $divide: ['$failed', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { successRate: -1 } }
    ]);

    const responseData = {
      queueStatusOverview,
      processingAttemptsDistribution,
      failedProcessingAnalysis,
      processingTimeline,
      dealershipQueuePerformance
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-queue-processing',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Queue Processing');
  }
};

/**
 * Get Vehicle Cost Details
 * Analyzes cost configuration effectiveness and pricing
 * 
 * @route GET /api/company/reports/vehicle/cost-details
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleCostDetails = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Cost Configuration Overview
    const costConfigOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          vehiclesWithCostDetails: {
            $sum: {
              $cond: [
                { $ne: ['$cost_details', null] },
                1,
                0
              ]
            }
          },
          vehiclesWithPricingReady: {
            $sum: {
              $cond: [
                { $eq: ['$is_pricing_ready', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          vehiclesWithCostDetails: 1,
          vehiclesWithPricingReady: 1,
          costConfigRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithCostDetails', '$totalVehicles'] }, 100] },
              1
            ]
          },
          pricingReadyRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithPricingReady', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Pricing Readiness by Status
    const pricingReadinessByStatus = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            status: '$status',
            pricingReady: '$is_pricing_ready'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.status',
          totalCount: { $sum: '$count' },
          pricingReadyBreakdown: {
            $push: {
              pricingReady: '$_id.pricingReady',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 3. Cost Details Effectiveness
    const costEffectiveness = await Vehicle.aggregate([
      { 
        $match: { 
          ...baseMatch,
          cost_details: { $ne: null }
        } 
      },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          count: { $sum: 1 },
          avgExactExpenses: { $avg: '$vehicle_other_details.exact_expenses' },
          avgEstimatedExpenses: { $avg: '$vehicle_other_details.estimated_expenses' },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          gstInclusiveCount: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_other_details.gst_inclusive', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgExactExpenses: { $round: ['$avgExactExpenses', 2] },
          avgEstimatedExpenses: { $round: ['$avgEstimatedExpenses', 2] },
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          gstInclusiveCount: 1,
          gstInclusiveRate: {
            $round: [
              { $multiply: [{ $divide: ['$gstInclusiveCount', '$count'] }, 100] },
              1
            ]
          },
          expenseToRevenueRatio: {
            $round: [
              { $divide: ['$avgExactExpenses', '$avgRetailPrice'] },
              3
            ]
          }
        }
      }
    ]);

    // 4. Dealership Cost Configuration Performance
    const dealershipCostPerformance = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          withCostDetails: {
            $sum: {
              $cond: [
                { $ne: ['$cost_details', null] },
                1,
                0
              ]
            }
          },
          pricingReady: {
            $sum: {
              $cond: [
                { $eq: ['$is_pricing_ready', true] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          withCostDetails: 1,
          pricingReady: 1,
          costConfigRate: {
            $round: [
              { $multiply: [{ $divide: ['$withCostDetails', '$totalVehicles'] }, 100] },
              1
            ]
          },
          pricingReadyRate: {
            $round: [
              { $multiply: [{ $divide: ['$pricingReady', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { pricingReadyRate: -1 } }
    ]);

    // 5. Cost Configuration Timeline
    const costConfigTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          totalVehicles: { $sum: 1 },
          withCostDetails: {
            $sum: {
              $cond: [
                { $ne: ['$cost_details', null] },
                1,
                0
              ]
            }
          },
          pricingReady: {
            $sum: {
              $cond: [
                { $eq: ['$is_pricing_ready', true] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const responseData = {
      costConfigOverview,
      pricingReadinessByStatus,
      costEffectiveness,
      dealershipCostPerformance,
      costConfigTimeline
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-cost-details',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Cost Details');
  }
};



/**
 * Get Vehicle Pricing Analysis
 * Analyzes purchase price, retail price, and sold price by vehicle type
 * Calculates profit margins, revenue metrics, and price range distributions
 * 
 * @route GET /api/company/reports/vehicle/pricing-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getVehiclePricingAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Pricing Analysis by Vehicle Type
    const pricingByType = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          count: { $sum: 1 },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' },
          totalPurchaseCost: { $sum: '$vehicle_other_details.purchase_price' },
          totalRetailValue: { $sum: '$vehicle_other_details.retail_price' },
          totalRevenue: { $sum: '$vehicle_other_details.sold_price' },
          avgExactExpenses: { $avg: '$vehicle_other_details.exact_expenses' },
          avgEstimatedExpenses: { $avg: '$vehicle_other_details.estimated_expenses' },
          minPurchasePrice: { $min: '$vehicle_other_details.purchase_price' },
          maxPurchasePrice: { $max: '$vehicle_other_details.purchase_price' },
          minRetailPrice: { $min: '$vehicle_other_details.retail_price' },
          maxRetailPrice: { $max: '$vehicle_other_details.retail_price' },
          minSoldPrice: { $min: '$vehicle_other_details.sold_price' },
          maxSoldPrice: { $max: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] },
          totalPurchaseCost: { $round: ['$totalPurchaseCost', 2] },
          totalRetailValue: { $round: ['$totalRetailValue', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgExactExpenses: { $round: ['$avgExactExpenses', 2] },
          avgEstimatedExpenses: { $round: ['$avgEstimatedExpenses', 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$avgSoldPrice', '$avgPurchasePrice'] },
                      '$avgPurchasePrice'
                    ]
                  },
                  100
                ]
              },
              2
            ]
          },
          retailMarkup: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$avgRetailPrice', '$avgPurchasePrice'] },
                      '$avgPurchasePrice'
                    ]
                  },
                  100
                ]
              },
              2
            ]
          },
          priceRange: {
            purchase: {
              min: '$minPurchasePrice',
              max: '$maxPurchasePrice'
            },
            retail: {
              min: '$minRetailPrice',
              max: '$maxRetailPrice'
            },
            sold: {
              min: '$minSoldPrice',
              max: '$maxSoldPrice'
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 2. Price Range Distribution (bucketing)
    const priceRangeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_other_details.retail_price',
          boundaries: [0, 10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000, 500000],
          default: '500000+',
          output: {
            count: { $sum: 1 },
            avgPrice: { $avg: '$vehicle_other_details.retail_price' },
            types: { $addToSet: '$vehicle_type' }
          }
        }
      }
    ]);

    // 3. Pricing Trends Over Time
    const pricingTrends = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            type: '$vehicle_type'
          },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // 4. Pricing by Make and Model (Top performers)
    const pricingByMakeModel = await Vehicle.aggregate([
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
          profitMargin: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$avgSoldPrice', '$avgPurchasePrice'] },
                      '$avgPurchasePrice'
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);

    // 5. Revenue Metrics Summary
    const revenueMetrics = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          totalPurchaseCost: { $sum: '$vehicle_other_details.purchase_price' },
          totalRetailValue: { $sum: '$vehicle_other_details.retail_price' },
          totalRevenue: { $sum: '$vehicle_other_details.sold_price' },
          totalExactExpenses: { $sum: '$vehicle_other_details.exact_expenses' },
          totalEstimatedExpenses: { $sum: '$vehicle_other_details.estimated_expenses' },
          vehiclesWithSoldPrice: {
            $sum: {
              $cond: [{ $gt: ['$vehicle_other_details.sold_price', 0] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          totalPurchaseCost: { $round: ['$totalPurchaseCost', 2] },
          totalRetailValue: { $round: ['$totalRetailValue', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalExactExpenses: { $round: ['$totalExactExpenses', 2] },
          totalEstimatedExpenses: { $round: ['$totalEstimatedExpenses', 2] },
          vehiclesWithSoldPrice: 1,
          grossProfit: {
            $round: [
              { $subtract: ['$totalRevenue', '$totalPurchaseCost'] },
              2
            ]
          },
          netProfit: {
            $round: [
              { 
                $subtract: [
                  '$totalRevenue', 
                  { $add: ['$totalPurchaseCost', '$totalExactExpenses'] }
                ] 
              },
              2
            ]
          },
          avgProfitPerVehicle: {
            $round: [
              {
                $divide: [
                  { $subtract: ['$totalRevenue', '$totalPurchaseCost'] },
                  '$vehiclesWithSoldPrice'
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    const responseData = {
      pricingByType,
      priceRangeDistribution,
      pricingTrends,
      pricingByMakeModel,
      revenueMetrics: revenueMetrics[0] || {
        totalVehicles: 0,
        totalPurchaseCost: 0,
        totalRetailValue: 0,
        totalRevenue: 0,
        grossProfit: 0,
        netProfit: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-pricing-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Pricing Analysis');
  }
};

/**
 * Get Vehicle Status Distribution
 * Groups vehicles by status across all types
 * Includes status transition timeline analysis and dealership-wise breakdown
 * 
 * @route GET /api/company/reports/vehicle/status-distribution
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleStatusDistribution = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Status Distribution
    const statusDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          types: { $addToSet: '$vehicle_type' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 2. Status Distribution by Vehicle Type
    const statusByType = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            status: '$status',
            type: '$vehicle_type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.status',
          totalCount: { $sum: '$count' },
          typeBreakdown: {
            $push: {
              type: '$_id.type',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 3. Status Transition Timeline (based on created_at and updated_at)
    const statusTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$updated_at' },
            month: { $month: '$updated_at' },
            status: '$status'
          },
          count: { $sum: 1 },
          avgDaysSinceCreation: {
            $avg: {
              $divide: [
                { $subtract: ['$updated_at', '$created_at'] },
                1000 * 60 * 60 * 24 // Convert milliseconds to days
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // 4. Dealership-wise Status Breakdown
    const dealershipStatusBreakdown = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            dealership: '$dealership_id',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.dealership',
          totalVehicles: { $sum: '$count' },
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalVehicles: -1 } }
    ]);

    // 5. Status with Additional Metrics
    const statusMetrics = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgPurchasePrice: { $avg: '$vehicle_other_details.purchase_price' },
          avgDaysSinceCreation: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$created_at'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          vehiclesWithWorkshop: {
            $sum: {
              $cond: [
                { $ne: ['$is_workshop', false] },
                1,
                0
              ]
            }
          },
          vehiclesWithAttachments: {
            $sum: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$vehicle_attachments', []] } }, 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          avgDaysSinceCreation: { $round: ['$avgDaysSinceCreation', 1] },
          vehiclesWithWorkshop: 1,
          vehiclesWithAttachments: 1,
          workshopPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithWorkshop', '$count'] }, 100] },
              1
            ]
          },
          attachmentPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithAttachments', '$count'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 6. Queue Status Distribution
    const queueStatusDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            queueStatus: '$queue_status',
            vehicleStatus: '$status'
          },
          count: { $sum: 1 },
          avgProcessingAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $group: {
          _id: '$_id.queueStatus',
          totalCount: { $sum: '$count' },
          avgProcessingAttempts: { $avg: '$avgProcessingAttempts' },
          vehicleStatusBreakdown: {
            $push: {
              status: '$_id.vehicleStatus',
              count: '$count'
            }
          }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 7. Summary Statistics
    const summary = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          uniqueStatuses: { $addToSet: '$status' },
          avgDaysSinceCreation: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$created_at'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          avgDaysSinceUpdate: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$updated_at'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          uniqueStatusCount: { $size: '$uniqueStatuses' },
          avgDaysSinceCreation: { $round: ['$avgDaysSinceCreation', 1] },
          avgDaysSinceUpdate: { $round: ['$avgDaysSinceUpdate', 1] }
        }
      }
    ]);

    const responseData = {
      statusDistribution,
      statusByType,
      statusTimeline,
      dealershipStatusBreakdown,
      statusMetrics,
      queueStatusDistribution,
      summary: summary[0] || {
        totalVehicles: 0,
        uniqueStatusCount: 0,
        avgDaysSinceCreation: 0,
        avgDaysSinceUpdate: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-status-distribution',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Status Distribution');
  }
};

/**
 * Get Vehicle Workshop Integration
 * Analyzes workshop status and progress for vehicles
 * Includes workshop readiness metrics and report preparation status
 * 
 * @route GET /api/company/reports/vehicle/workshop-integration
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleWorkshopIntegration = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Workshop Status Overview
    const workshopStatusOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          vehiclesInWorkshop: {
            $sum: {
              $cond: [
                { $ne: ['$is_workshop', false] },
                1,
                0
              ]
            }
          },
          vehiclesWithReportReady: {
            $sum: {
              $cond: [
                { $ne: ['$workshop_report_ready', false] },
                1,
                0
              ]
            }
          },
          vehiclesWithReportPreparing: {
            $sum: {
              $cond: [
                { $ne: ['$workshop_report_preparing', false] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          vehiclesInWorkshop: 1,
          vehiclesWithReportReady: 1,
          vehiclesWithReportPreparing: 1,
          workshopPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesInWorkshop', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reportReadyPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithReportReady', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reportPreparingPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithReportPreparing', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Workshop Progress Analysis
    const workshopProgressAnalysis = await Vehicle.aggregate([
      { 
        $match: { 
          ...baseMatch,
          is_workshop: { $ne: false }
        } 
      },
      {
        $group: {
          _id: {
            type: '$vehicle_type',
            progress: '$workshop_progress'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          totalInWorkshop: { $sum: '$count' },
          progressBreakdown: {
            $push: {
              progress: '$_id.progress',
              count: '$count'
            }
          }
        }
      }
    ]);

    // 3. Workshop Readiness Metrics by Vehicle Type
    const workshopReadinessMetrics = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          inspectionTradein: [
            {
              $match: {
                vehicle_type: { $in: ['inspection', 'tradein'] }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                totalVehicles: { $sum: 1 },
                withWorkshopArray: {
                  $sum: {
                    $cond: [
                      { $isArray: '$is_workshop' },
                      1,
                      0
                    ]
                  }
                },
                withProgressArray: {
                  $sum: {
                    $cond: [
                      { $isArray: '$workshop_progress' },
                      1,
                      0
                    ]
                  }
                },
                withReportReadyArray: {
                  $sum: {
                    $cond: [
                      { $isArray: '$workshop_report_ready' },
                      1,
                      0
                    ]
                  }
                },
                withReportPreparingArray: {
                  $sum: {
                    $cond: [
                      { $isArray: '$workshop_report_preparing' },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],
          otherTypes: [
            {
              $match: {
                vehicle_type: { $nin: ['inspection', 'tradein'] }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                totalVehicles: { $sum: 1 },
                withWorkshopBoolean: {
                  $sum: {
                    $cond: [
                      { $eq: ['$is_workshop', true] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    // 4. Workshop Report Preparation Status
    const reportPreparationStatus = await Vehicle.aggregate([
      { 
        $match: { 
          ...baseMatch,
          vehicle_type: { $in: ['inspection', 'tradein'] }
        } 
      },
      {
        $project: {
          vehicle_type: 1,
          dealership_id: 1,
          reportReadyCount: {
            $cond: [
              { $isArray: '$workshop_report_ready' },
              { $size: '$workshop_report_ready' },
              0
            ]
          },
          reportPreparingCount: {
            $cond: [
              { $isArray: '$workshop_report_preparing' },
              { $size: '$workshop_report_preparing' },
              0
            ]
          },
          workshopStageCount: {
            $cond: [
              { $isArray: '$is_workshop' },
              { $size: '$is_workshop' },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          avgReportReadyCount: { $avg: '$reportReadyCount' },
          avgReportPreparingCount: { $avg: '$reportPreparingCount' },
          avgWorkshopStageCount: { $avg: '$workshopStageCount' },
          vehiclesWithMultipleStages: {
            $sum: {
              $cond: [
                { $gt: ['$workshopStageCount', 1] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          avgReportReadyCount: { $round: ['$avgReportReadyCount', 2] },
          avgReportPreparingCount: { $round: ['$avgReportPreparingCount', 2] },
          avgWorkshopStageCount: { $round: ['$avgWorkshopStageCount', 2] },
          vehiclesWithMultipleStages: 1,
          multipleStagesPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithMultipleStages', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 5. Dealership Workshop Performance
    const dealershipWorkshopPerformance = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          vehiclesInWorkshop: {
            $sum: {
              $cond: [
                { $ne: ['$is_workshop', false] },
                1,
                0
              ]
            }
          },
          vehiclesWithReportReady: {
            $sum: {
              $cond: [
                { $ne: ['$workshop_report_ready', false] },
                1,
                0
              ]
            }
          },
          inspectionVehicles: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_type', 'inspection'] },
                1,
                0
              ]
            }
          },
          tradeinVehicles: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_type', 'tradein'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          vehiclesInWorkshop: 1,
          vehiclesWithReportReady: 1,
          inspectionVehicles: 1,
          tradeinVehicles: 1,
          workshopUtilization: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesInWorkshop', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reportCompletionRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithReportReady', '$vehiclesInWorkshop'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { workshopUtilization: -1 } }
    ]);

    // 6. Workshop Timeline Analysis
    const workshopTimelineAnalysis = await Vehicle.aggregate([
      { 
        $match: { 
          ...baseMatch,
          is_workshop: { $ne: false }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            type: '$vehicle_type'
          },
          count: { $sum: 1 },
          withReportReady: {
            $sum: {
              $cond: [
                { $ne: ['$workshop_report_ready', false] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const responseData = {
      workshopStatusOverview,
      workshopProgressAnalysis,
      workshopReadinessMetrics: workshopReadinessMetrics[0] || { inspectionTradein: [], otherTypes: [] },
      reportPreparationStatus,
      dealershipWorkshopPerformance,
      workshopTimelineAnalysis
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-workshop-integration',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Workshop Integration');
  }
};

/**
 * Get Vehicle Attachment Analysis
 * Aggregates attachment counts by type (images, files)
 * Calculates average attachments per vehicle and analyzes categories and sizes
 * 
 * @route GET /api/company/reports/vehicle/attachment-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleAttachmentAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Attachment Overview by Type
    const attachmentOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_attachments.type',
          count: { $sum: 1 },
          totalSize: { $sum: '$vehicle_attachments.size' },
          avgSize: { $avg: '$vehicle_attachments.size' },
          uniqueVehicles: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          totalSize: { $round: ['$totalSize', 0] },
          avgSize: { $round: ['$avgSize', 0] },
          totalSizeMB: { $round: [{ $divide: ['$totalSize', 1048576] }, 2] },
          avgSizeMB: { $round: [{ $divide: ['$avgSize', 1048576] }, 2] },
          uniqueVehicleCount: { $size: '$uniqueVehicles' }
        }
      }
    ]);

    // 2. Average Attachments per Vehicle
    const avgAttachmentsPerVehicle = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          vehicle_type: 1,
          attachmentCount: {
            $size: { $ifNull: ['$vehicle_attachments', []] }
          },
          imageCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$vehicle_attachments', []] },
                as: 'attachment',
                cond: { $eq: ['$$attachment.type', 'image'] }
              }
            }
          },
          fileCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$vehicle_attachments', []] },
                as: 'attachment',
                cond: { $eq: ['$$attachment.type', 'file'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          avgAttachments: { $avg: '$attachmentCount' },
          avgImages: { $avg: '$imageCount' },
          avgFiles: { $avg: '$fileCount' },
          vehiclesWithAttachments: {
            $sum: {
              $cond: [
                { $gt: ['$attachmentCount', 0] },
                1,
                0
              ]
            }
          },
          vehiclesWithoutAttachments: {
            $sum: {
              $cond: [
                { $eq: ['$attachmentCount', 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          avgAttachments: { $round: ['$avgAttachments', 2] },
          avgImages: { $round: ['$avgImages', 2] },
          avgFiles: { $round: ['$avgFiles', 2] },
          vehiclesWithAttachments: 1,
          vehiclesWithoutAttachments: 1,
          attachmentCoverage: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithAttachments', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 3. Attachment Categories Analysis (Images)
    const imageCategoryAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicle_attachments.type': 'image'
        }
      },
      {
        $group: {
          _id: '$vehicle_attachments.image_category',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' },
          totalSize: { $sum: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSizeMB: { $round: [{ $divide: ['$avgSize', 1048576] }, 2] },
          totalSizeMB: { $round: [{ $divide: ['$totalSize', 1048576] }, 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Attachment Categories Analysis (Files)
    const fileCategoryAnalysis = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicle_attachments.type': 'file'
        }
      },
      {
        $group: {
          _id: '$vehicle_attachments.file_category',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' },
          totalSize: { $sum: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSizeMB: { $round: [{ $divide: ['$avgSize', 1048576] }, 2] },
          totalSizeMB: { $round: [{ $divide: ['$totalSize', 1048576] }, 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. MIME Type Distribution
    const mimeTypeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_attachments.mime_type',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSizeMB: { $round: [{ $divide: ['$avgSize', 1048576] }, 2] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 6. Attachment Size Distribution (Bucketing)
    const sizeDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_attachments.size',
          boundaries: [0, 102400, 512000, 1048576, 5242880, 10485760, 52428800], // 0, 100KB, 500KB, 1MB, 5MB, 10MB, 50MB
          default: '50MB+',
          output: {
            count: { $sum: 1 },
            types: { $addToSet: '$vehicle_attachments.type' }
          }
        }
      }
    ]);

    // 7. Attachment Upload Timeline
    const uploadTimeline = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$vehicle_attachments.uploaded_at' },
            month: { $month: '$vehicle_attachments.uploaded_at' },
            type: '$vehicle_attachments.type'
          },
          count: { $sum: 1 },
          totalSize: { $sum: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          totalSizeMB: { $round: [{ $divide: ['$totalSize', 1048576] }, 2] }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // 8. Dealership Attachment Comparison
    const dealershipComparison = await Vehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          dealership_id: 1,
          attachmentCount: {
            $size: { $ifNull: ['$vehicle_attachments', []] }
          },
          totalSize: {
            $sum: {
              $map: {
                input: { $ifNull: ['$vehicle_attachments', []] },
                as: 'attachment',
                in: '$$attachment.size'
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          totalAttachments: { $sum: '$attachmentCount' },
          avgAttachmentsPerVehicle: { $avg: '$attachmentCount' },
          totalStorageSize: { $sum: '$totalSize' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          totalAttachments: 1,
          avgAttachmentsPerVehicle: { $round: ['$avgAttachmentsPerVehicle', 2] },
          totalStorageSizeMB: { $round: [{ $divide: ['$totalStorageSize', 1048576] }, 2] },
          avgStoragePerVehicleMB: {
            $round: [
              { $divide: [{ $divide: ['$totalStorageSize', 1048576] }, '$totalVehicles'] },
              2
            ]
          }
        }
      },
      { $sort: { totalAttachments: -1 } }
    ]);

    const responseData = {
      attachmentOverview,
      avgAttachmentsPerVehicle,
      imageCategoryAnalysis,
      fileCategoryAnalysis,
      mimeTypeDistribution,
      sizeDistribution,
      uploadTimeline,
      dealershipComparison
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-attachment-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Attachment Analysis');
  }
};

/**
 * Get Vehicle Registration Compliance
 * Tracks registration status and compliance rates
 * Identifies expiring licenses and WOF/COF, analyzes local vs imported patterns
 * 
 * @route GET /api/company/reports/vehicle/registration-compliance
 * @access Private (company_super_admin, company_admin)
 */
const getVehicleRegistrationCompliance = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      ...dealershipFilter,
      ...dateFilter
    };

    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Registration Status Overview
    const registrationOverview = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          registeredLocal: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_registration.registered_in_local', true] },
                1,
                0
              ]
            }
          },
          reRegistered: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_registration.re_registered', true] },
                1,
                0
              ]
            }
          },
          withLicenseExpiry: {
            $sum: {
              $cond: [
                { $ne: ['$vehicle_registration.license_expiry_date', null] },
                1,
                0
              ]
            }
          },
          withWofCofExpiry: {
            $sum: {
              $cond: [
                { $ne: ['$vehicle_registration.wof_cof_expiry_date', null] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          registeredLocal: 1,
          reRegistered: 1,
          withLicenseExpiry: 1,
          withWofCofExpiry: 1,
          localRegistrationRate: {
            $round: [
              { $multiply: [{ $divide: ['$registeredLocal', '$totalVehicles'] }, 100] },
              1
            ]
          },
          reRegistrationRate: {
            $round: [
              { $multiply: [{ $divide: ['$reRegistered', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Expiring Licenses (within 30 and 90 days)
    const expiringLicenses = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vehicle_type: 1,
          dealership_id: 1,
          make: 1,
          model: 1,
          year: 1,
          plate_no: 1,
          license_expiry_date: '$vehicle_registration.license_expiry_date',
          daysUntilExpiry: {
            $divide: [
              { $subtract: ['$vehicle_registration.license_expiry_date', currentDate] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $facet: {
          expiredLicenses: [
            {
              $match: {
                license_expiry_date: { $lt: currentDate }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 }
              }
            }
          ],
          expiringWithin30Days: [
            {
              $match: {
                license_expiry_date: {
                  $gte: currentDate,
                  $lte: thirtyDaysFromNow
                }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 },
                vehicles: {
                  $push: {
                    make: '$make',
                    model: '$model',
                    year: '$year',
                    plate_no: '$plate_no',
                    daysUntilExpiry: { $round: ['$daysUntilExpiry', 0] }
                  }
                }
              }
            }
          ],
          expiringWithin90Days: [
            {
              $match: {
                license_expiry_date: {
                  $gte: currentDate,
                  $lte: ninetyDaysFromNow
                }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // 3. Expiring WOF/COF (within 30 and 90 days)
    const expiringWofCof = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vehicle_type: 1,
          dealership_id: 1,
          make: 1,
          model: 1,
          year: 1,
          plate_no: 1,
          wof_cof_expiry_date: '$vehicle_registration.wof_cof_expiry_date',
          daysUntilExpiry: {
            $divide: [
              { $subtract: ['$vehicle_registration.wof_cof_expiry_date', currentDate] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $facet: {
          expiredWofCof: [
            {
              $match: {
                wof_cof_expiry_date: { $lt: currentDate }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 }
              }
            }
          ],
          expiringWithin30Days: [
            {
              $match: {
                wof_cof_expiry_date: {
                  $gte: currentDate,
                  $lte: thirtyDaysFromNow
                }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 },
                vehicles: {
                  $push: {
                    make: '$make',
                    model: '$model',
                    year: '$year',
                    plate_no: '$plate_no',
                    daysUntilExpiry: { $round: ['$daysUntilExpiry', 0] }
                  }
                }
              }
            }
          ],
          expiringWithin90Days: [
            {
              $match: {
                wof_cof_expiry_date: {
                  $gte: currentDate,
                  $lte: ninetyDaysFromNow
                }
              }
            },
            {
              $group: {
                _id: '$vehicle_type',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // 4. Local vs Imported Registration Patterns
    const localVsImported = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            type: '$vehicle_type',
            registeredLocal: '$vehicle_registration.registered_in_local'
          },
          count: { $sum: 1 },
          avgFirstRegisteredYear: { $avg: '$vehicle_registration.first_registered_year' },
          avgYearFirstRegisteredLocal: { $avg: '$vehicle_registration.year_first_registered_local' },
          countries: { $addToSet: '$vehicle_registration.last_registered_country' }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          totalCount: { $sum: '$count' },
          registrationBreakdown: {
            $push: {
              registeredLocal: '$_id.registeredLocal',
              count: '$count',
              avgFirstRegisteredYear: { $round: ['$avgFirstRegisteredYear', 0] },
              avgYearFirstRegisteredLocal: { $round: ['$avgYearFirstRegisteredLocal', 0] },
              uniqueCountries: { $size: '$countries' }
            }
          }
        }
      }
    ]);

    // 5. Road User Charges Analysis
    const roadUserCharges = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_type',
          totalVehicles: { $sum: 1 },
          rucApplies: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_registration.road_user_charges_apply', true] },
                1,
                0
              ]
            }
          },
          outstandingRuc: {
            $sum: {
              $cond: [
                { $eq: ['$vehicle_registration.outstanding_road_user_charges', true] },
                1,
                0
              ]
            }
          },
          avgRucEndDistance: { $avg: '$vehicle_registration.ruc_end_distance' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          rucApplies: 1,
          outstandingRuc: 1,
          avgRucEndDistance: { $round: ['$avgRucEndDistance', 0] },
          rucApplicableRate: {
            $round: [
              { $multiply: [{ $divide: ['$rucApplies', '$totalVehicles'] }, 100] },
              1
            ]
          },
          outstandingRucRate: {
            $round: [
              { $multiply: [{ $divide: ['$outstandingRuc', '$rucApplies'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 6. Registration Country Distribution
    const countryDistribution = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_registration.last_registered_country',
          count: { $sum: 1 },
          vehicleTypes: { $addToSet: '$vehicle_type' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 7. Compliance Summary by Dealership
    const dealershipCompliance = await Vehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_registration', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          dealership_id: 1,
          hasValidLicense: {
            $cond: [
              { $gte: ['$vehicle_registration.license_expiry_date', currentDate] },
              1,
              0
            ]
          },
          hasValidWofCof: {
            $cond: [
              { $gte: ['$vehicle_registration.wof_cof_expiry_date', currentDate] },
              1,
              0
            ]
          },
          isCompliant: {
            $cond: [
              {
                $and: [
                  { $gte: ['$vehicle_registration.license_expiry_date', currentDate] },
                  { $gte: ['$vehicle_registration.wof_cof_expiry_date', currentDate] }
                ]
              },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$dealership_id',
          totalVehicles: { $sum: 1 },
          validLicenses: { $sum: '$hasValidLicense' },
          validWofCof: { $sum: '$hasValidWofCof' },
          compliantVehicles: { $sum: '$isCompliant' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVehicles: 1,
          validLicenses: 1,
          validWofCof: 1,
          compliantVehicles: 1,
          complianceRate: {
            $round: [
              { $multiply: [{ $divide: ['$compliantVehicles', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { complianceRate: -1 } }
    ]);

    const responseData = {
      registrationOverview,
      expiringLicenses: expiringLicenses[0] || { expiredLicenses: [], expiringWithin30Days: [], expiringWithin90Days: [] },
      expiringWofCof: expiringWofCof[0] || { expiredWofCof: [], expiringWithin30Days: [], expiringWithin90Days: [] },
      localVsImported,
      roadUserCharges,
      countryDistribution,
      dealershipCompliance
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'vehicle-registration-compliance',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Vehicle Registration Compliance');
  }
};



module.exports = {
  getVehicleOverviewByType,
  getVehiclePricingAnalysis,
  getVehicleStatusDistribution,
  getVehicleWorkshopIntegration,
  getVehicleAttachmentAnalysis,
  getVehicleRegistrationCompliance,
  getVehicleImportTimeline,
  getVehicleEngineSpecifications,
  getVehicleOdometerTrends,
  getVehicleOwnershipHistory,
  getVehicleQueueProcessing,
  getVehicleCostDetails
};
