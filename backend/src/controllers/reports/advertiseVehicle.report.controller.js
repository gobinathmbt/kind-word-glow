/**
 * AdvertiseVehicle Report Controller
 * Handles all advertise vehicle-related analytics and reporting endpoints
 */

const AdvertiseVehicle = require('../../models/AdvertiseVehicle');
const { 
  getDealershipFilter, 
  getDateFilter, 
  formatReportResponse, 
  handleReportError,
  buildBasePipeline 
} = require('../../utils/reportHelpers');

/**
 * Get Advertisement Performance
 * Provides advertisement metrics and KPIs for advertise vehicles
 * 
 * @route GET /api/company/reports/advertise-vehicle/performance
 * @access Private (company_super_admin, company_admin)
 */
const getAdvertisementPerformance = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'advertisement',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Performance Summary
    const performanceSummary = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalAdvertisements: { $sum: 1 },
          activeAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          pendingAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          processingAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'processing'] }, 1, 0]
            }
          },
          failedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          },
          totalListingValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalAdvertisements: 1,
          activeAds: 1,
          pendingAds: 1,
          processingAds: 1,
          failedAds: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$activeAds', '$totalAdvertisements'] }, 100] },
              1
            ]
          },
          failureRate: {
            $round: [
              { $multiply: [{ $divide: ['$failedAds', '$totalAdvertisements'] }, 100] },
              1
            ]
          },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          totalListingValue: { $round: ['$totalListingValue', 2] }
        }
      }
    ]);

    // 2. Status Distribution Over Time
    const statusTimeline = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 3. Performance by Dealership
    const performanceByDealership = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$dealership_id',
          totalAds: { $sum: 1 },
          completedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          failedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          },
          totalListingValue: {
            $sum: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalAds: 1,
          completedAds: 1,
          failedAds: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedAds', '$totalAds'] }, 100] },
              1
            ]
          },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          totalListingValue: { $round: ['$totalListingValue', 2] }
        }
      },
      { $sort: { totalAds: -1 } }
    ]);

    // 4. Performance by Make and Model
    const performanceByMakeModel = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          avgRetailPrice: { 
            $avg: { $arrayElemAt: ['$vehicle_other_details.retail_price', 0] } 
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          completedCount: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedCount', '$count'] }, 100] },
              1
            ]
          },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 5. Queue Processing Performance
    const queuePerformance = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$queue_status',
          count: { $sum: 1 },
          avgProcessingAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgProcessingAttempts: { $round: ['$avgProcessingAttempts', 1] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 6. Advertisement Age Analysis
    const ageAnalysis = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          status: 1,
          ageInDays: {
            $divide: [
              { $subtract: [new Date(), '$created_at'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$ageInDays',
          boundaries: [0, 7, 14, 30, 60, 90, 180, 365, 10000],
          default: '365+',
          output: {
            count: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            }
          }
        }
      }
    ]);

    const responseData = {
      performanceSummary: performanceSummary[0] || {
        totalAdvertisements: 0,
        activeAds: 0,
        pendingAds: 0,
        processingAds: 0,
        failedAds: 0,
        completionRate: 0,
        failureRate: 0,
        avgRetailPrice: 0,
        totalListingValue: 0
      },
      statusTimeline,
      performanceByDealership,
      performanceByMakeModel,
      queuePerformance,
      ageAnalysis
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'advertisement-performance',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Advertisement Performance');
  }
};

/**
 * Get Advertisement Pricing Analysis
 * Analyzes pricing effectiveness for advertise vehicles
 * 
 * @route GET /api/company/reports/advertise-vehicle/pricing-analysis
 * @access Private (company_super_admin, company_admin)
 */
const getAdvertisementPricingAnalysis = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'advertisement',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Pricing Overview
    const pricingOverview = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          minRetailPrice: { $min: '$vehicle_other_details.retail_price' },
          maxRetailPrice: { $max: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' },
          totalListingValue: { $sum: '$vehicle_other_details.retail_price' },
          totalSoldValue: { $sum: '$vehicle_other_details.sold_price' },
          vehiclesIncludedInExports: {
            $sum: {
              $cond: [{ $eq: ['$vehicle_other_details.included_in_exports', true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          minRetailPrice: { $round: ['$minRetailPrice', 2] },
          maxRetailPrice: { $round: ['$maxRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] },
          totalListingValue: { $round: ['$totalListingValue', 2] },
          totalSoldValue: { $round: ['$totalSoldValue', 2] },
          vehiclesIncludedInExports: 1,
          exportInclusionRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesIncludedInExports', '$totalVehicles'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Price Range Distribution
    const priceRangeDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_other_details.retail_price',
          boundaries: [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000, 1000000],
          default: '1000000+',
          output: {
            count: { $sum: 1 },
            avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      }
    ]);

    // 3. Pricing by Status
    const pricingByStatus = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_other_details.status',
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
      { $sort: { count: -1 } }
    ]);

    // 4. Pricing by Make and Model
    const pricingByMakeModel = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          count: { $sum: 1 },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          minRetailPrice: { $min: '$vehicle_other_details.retail_price' },
          maxRetailPrice: { $max: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          minRetailPrice: { $round: ['$minRetailPrice', 2] },
          maxRetailPrice: { $round: ['$maxRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 5. Pricing by Year
    const pricingByYear = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$year',
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
      { $sort: { _id: -1 } }
    ]);

    // 6. Pricing Trends Over Time
    const pricingTrends = await AdvertiseVehicle.aggregate([
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

    // 7. GST Inclusive Analysis
    const gstAnalysis = await AdvertiseVehicle.aggregate([
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

    const responseData = {
      pricingOverview: pricingOverview[0] || {
        totalVehicles: 0,
        avgRetailPrice: 0,
        minRetailPrice: 0,
        maxRetailPrice: 0,
        avgSoldPrice: 0,
        totalListingValue: 0,
        totalSoldValue: 0,
        vehiclesIncludedInExports: 0,
        exportInclusionRate: 0
      },
      priceRangeDistribution,
      pricingByStatus,
      pricingByMakeModel,
      pricingByYear,
      pricingTrends,
      gstAnalysis
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'advertisement-pricing-analysis',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Advertisement Pricing Analysis');
  }
};

/**
 * Get Advertisement Attachment Quality
 * Analyzes media quality assessment for advertise vehicles
 * 
 * @route GET /api/company/reports/advertise-vehicle/attachment-quality
 * @access Private (company_super_admin, company_admin)
 */
const getAdvertisementAttachmentQuality = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'advertisement',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Attachment Overview
    const attachmentOverview = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          totalAttachments: { $size: { $ifNull: ['$vehicle_attachments', []] } },
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
          },
          hasHeroImage: { $cond: [{ $ne: ['$vehicle_hero_image', null] }, 1, 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          totalAttachments: { $sum: '$totalAttachments' },
          totalImages: { $sum: '$imageCount' },
          totalFiles: { $sum: '$fileCount' },
          vehiclesWithHeroImage: { $sum: '$hasHeroImage' },
          avgAttachmentsPerVehicle: { $avg: '$totalAttachments' },
          avgImagesPerVehicle: { $avg: '$imageCount' },
          avgFilesPerVehicle: { $avg: '$fileCount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          totalAttachments: 1,
          totalImages: 1,
          totalFiles: 1,
          vehiclesWithHeroImage: 1,
          heroImageRate: {
            $round: [
              { $multiply: [{ $divide: ['$vehiclesWithHeroImage', '$totalVehicles'] }, 100] },
              1
            ]
          },
          avgAttachmentsPerVehicle: { $round: ['$avgAttachmentsPerVehicle', 1] },
          avgImagesPerVehicle: { $round: ['$avgImagesPerVehicle', 1] },
          avgFilesPerVehicle: { $round: ['$avgFilesPerVehicle', 1] }
        }
      }
    ]);

    // 2. Attachment Distribution by Count
    const attachmentDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          attachmentCount: { $size: { $ifNull: ['$vehicle_attachments', []] } }
        }
      },
      {
        $bucket: {
          groupBy: '$attachmentCount',
          boundaries: [0, 1, 5, 10, 15, 20, 50, 100],
          default: '100+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // 3. Image Category Distribution
    const imageCategoryDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicle_attachments.type': 'image' } },
      {
        $group: {
          _id: '$vehicle_attachments.image_category',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSize: { $round: ['$avgSize', 0] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. File Category Distribution
    const fileCategoryDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      { $match: { 'vehicle_attachments.type': 'file' } },
      {
        $group: {
          _id: '$vehicle_attachments.file_category',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSize: { $round: ['$avgSize', 0] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. Attachment Size Analysis
    const sizeAnalysis = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_attachments.type',
          count: { $sum: 1 },
          avgSize: { $avg: '$vehicle_attachments.size' },
          minSize: { $min: '$vehicle_attachments.size' },
          maxSize: { $max: '$vehicle_attachments.size' },
          totalSize: { $sum: '$vehicle_attachments.size' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgSize: { $round: ['$avgSize', 0] },
          minSize: 1,
          maxSize: 1,
          totalSize: 1
        }
      }
    ]);

    // 6. MIME Type Distribution
    const mimeTypeDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vehicle_attachments.mime_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // 7. Attachment Quality Score
    const qualityScore = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          hasHeroImage: { $cond: [{ $ne: ['$vehicle_hero_image', null] }, 1, 0] },
          imageCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$vehicle_attachments', []] },
                as: 'attachment',
                cond: { $eq: ['$$attachment.type', 'image'] }
              }
            }
          },
          hasMinimumImages: {
            $cond: [
              {
                $gte: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ['$vehicle_attachments', []] },
                        as: 'attachment',
                        cond: { $eq: ['$$attachment.type', 'image'] }
                      }
                    }
                  },
                  5
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
          _id: null,
          totalVehicles: { $sum: 1 },
          withHeroImage: { $sum: '$hasHeroImage' },
          withMinimumImages: { $sum: '$hasMinimumImages' },
          avgImageCount: { $avg: '$imageCount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          withHeroImage: 1,
          withMinimumImages: 1,
          avgImageCount: { $round: ['$avgImageCount', 1] },
          qualityScore: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ['$withHeroImage', '$withMinimumImages'] },
                      { $multiply: ['$totalVehicles', 2] }
                    ]
                  },
                  100
                ]
              },
              1
            ]
          }
        }
      }
    ]);

    const responseData = {
      attachmentOverview: attachmentOverview[0] || {
        totalVehicles: 0,
        totalAttachments: 0,
        totalImages: 0,
        totalFiles: 0,
        vehiclesWithHeroImage: 0,
        heroImageRate: 0,
        avgAttachmentsPerVehicle: 0,
        avgImagesPerVehicle: 0,
        avgFilesPerVehicle: 0
      },
      attachmentDistribution,
      imageCategoryDistribution,
      fileCategoryDistribution,
      sizeAnalysis,
      mimeTypeDistribution,
      qualityScore: qualityScore[0] || {
        totalVehicles: 0,
        withHeroImage: 0,
        withMinimumImages: 0,
        avgImageCount: 0,
        qualityScore: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'advertisement-attachment-quality',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Advertisement Attachment Quality');
  }
};

/**
 * Get Advertisement Status Tracking
 * Provides lifecycle tracking for advertise vehicles
 * 
 * @route GET /api/company/reports/advertise-vehicle/status-tracking
 * @access Private (company_super_admin, company_admin)
 */
const getAdvertisementStatusTracking = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'advertisement',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Status Distribution
    const statusDistribution = await AdvertiseVehicle.aggregate([
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

    // 2. Queue Status Distribution
    const queueStatusDistribution = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$queue_status',
          count: { $sum: 1 },
          avgProcessingAttempts: { $avg: '$processing_attempts' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgProcessingAttempts: { $round: ['$avgProcessingAttempts', 1] }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Status Timeline
    const statusTimeline = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 4. Status by Dealership
    const statusByDealership = await AdvertiseVehicle.aggregate([
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
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { totalCount: -1 } }
    ]);

    // 5. Processing Attempts Analysis
    const processingAttemptsAnalysis = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $bucket: {
          groupBy: '$processing_attempts',
          boundaries: [0, 1, 2, 3, 5, 10, 20],
          default: '20+',
          output: {
            count: { $sum: 1 },
            failedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
              }
            }
          }
        }
      }
    ]);

    // 6. Lifecycle Duration Analysis
    const lifecycleDuration = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      {
        $project: {
          status: 1,
          ageInDays: {
            $divide: [
              { $subtract: [new Date(), '$created_at'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgAgeInDays: { $avg: '$ageInDays' },
          minAgeInDays: { $min: '$ageInDays' },
          maxAgeInDays: { $max: '$ageInDays' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgAgeInDays: { $round: ['$avgAgeInDays', 1] },
          minAgeInDays: { $round: ['$minAgeInDays', 1] },
          maxAgeInDays: { $round: ['$maxAgeInDays', 1] }
        }
      }
    ]);

    // 7. Failed Advertisements Analysis
    const failedAnalysis = await AdvertiseVehicle.aggregate([
      { $match: { ...baseMatch, status: 'failed' } },
      {
        $group: {
          _id: null,
          totalFailed: { $sum: 1 },
          avgProcessingAttempts: { $avg: '$processing_attempts' },
          withErrorMessage: {
            $sum: {
              $cond: [{ $ne: ['$last_processing_error', null] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalFailed: 1,
          avgProcessingAttempts: { $round: ['$avgProcessingAttempts', 1] },
          withErrorMessage: 1,
          errorMessageRate: {
            $round: [
              { $multiply: [{ $divide: ['$withErrorMessage', '$totalFailed'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    const responseData = {
      statusDistribution,
      queueStatusDistribution,
      statusTimeline,
      statusByDealership,
      processingAttemptsAnalysis,
      lifecycleDuration,
      failedAnalysis: failedAnalysis[0] || {
        totalFailed: 0,
        avgProcessingAttempts: 0,
        withErrorMessage: 0,
        errorMessageRate: 0
      }
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'advertisement-status-tracking',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Advertisement Status Tracking');
  }
};

/**
 * Get Advertisement Conversion Rates
 * Analyzes success rate for advertise vehicles
 * 
 * @route GET /api/company/reports/advertise-vehicle/conversion-rates
 * @access Private (company_super_admin, company_admin)
 */
const getAdvertisementConversionRates = async (req, res) => {
  try {
    const { company_id } = req.user;
    const dealershipFilter = getDealershipFilter(req.user);
    const dateFilter = getDateFilter(req.query);

    const baseMatch = {
      company_id,
      vehicle_type: 'advertisement',
      ...dealershipFilter,
      ...dateFilter
    };

    // 1. Overall Conversion Metrics
    const conversionMetrics = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalAdvertisements: { $sum: 1 },
          completedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          soldVehicles: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: ['$vehicle_other_details.sold_price', 0] },
                  { $ne: ['$vehicle_other_details.sold_price', null] }
                ]},
                1,
                0
              ]
            }
          },
          totalListingValue: { $sum: '$vehicle_other_details.retail_price' },
          totalSoldValue: { $sum: '$vehicle_other_details.sold_price' },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 0,
          totalAdvertisements: 1,
          completedAds: 1,
          soldVehicles: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedAds', '$totalAdvertisements'] }, 100] },
              1
            ]
          },
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalAdvertisements'] }, 100] },
              1
            ]
          },
          totalListingValue: { $round: ['$totalListingValue', 2] },
          totalSoldValue: { $round: ['$totalSoldValue', 2] },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] },
          priceRealizationRate: {
            $round: [
              { $multiply: [{ $divide: ['$avgSoldPrice', '$avgRetailPrice'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 2. Conversion by Dealership
    const conversionByDealership = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$dealership_id',
          totalAds: { $sum: 1 },
          completedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          soldVehicles: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: ['$vehicle_other_details.sold_price', 0] },
                  { $ne: ['$vehicle_other_details.sold_price', null] }
                ]},
                1,
                0
              ]
            }
          },
          totalSoldValue: { $sum: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAds: 1,
          completedAds: 1,
          soldVehicles: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedAds', '$totalAds'] }, 100] },
              1
            ]
          },
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalAds'] }, 100] },
              1
            ]
          },
          totalSoldValue: { $round: ['$totalSoldValue', 2] }
        }
      },
      { $sort: { conversionRate: -1 } }
    ]);

    // 3. Conversion by Make and Model
    const conversionByMakeModel = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            make: '$make',
            model: '$model'
          },
          totalAds: { $sum: 1 },
          completedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          soldVehicles: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: ['$vehicle_other_details.sold_price', 0] },
                  { $ne: ['$vehicle_other_details.sold_price', null] }
                ]},
                1,
                0
              ]
            }
          },
          avgRetailPrice: { $avg: '$vehicle_other_details.retail_price' },
          avgSoldPrice: { $avg: '$vehicle_other_details.sold_price' }
        }
      },
      {
        $project: {
          _id: 1,
          totalAds: 1,
          completedAds: 1,
          soldVehicles: 1,
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalAds'] }, 100] },
              1
            ]
          },
          avgRetailPrice: { $round: ['$avgRetailPrice', 2] },
          avgSoldPrice: { $round: ['$avgSoldPrice', 2] }
        }
      },
      { $sort: { conversionRate: -1 } },
      { $limit: 20 }
    ]);

    // 4. Conversion by Price Range
    const conversionByPriceRange = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $bucket: {
          groupBy: '$vehicle_other_details.retail_price',
          boundaries: [0, 10000, 20000, 30000, 50000, 100000, 1000000],
          default: '1000000+',
          output: {
            totalAds: { $sum: 1 },
            soldVehicles: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gt: ['$vehicle_other_details.sold_price', 0] },
                    { $ne: ['$vehicle_other_details.sold_price', null] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          totalAds: 1,
          soldVehicles: 1,
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalAds'] }, 100] },
              1
            ]
          }
        }
      }
    ]);

    // 5. Conversion Timeline
    const conversionTimeline = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' }
          },
          totalAds: { $sum: 1 },
          completedAds: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          soldVehicles: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: ['$vehicle_other_details.sold_price', 0] },
                  { $ne: ['$vehicle_other_details.sold_price', null] }
                ]},
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
          totalAds: 1,
          completedAds: 1,
          soldVehicles: 1,
          conversionRate: {
            $round: [
              { $multiply: [{ $divide: ['$soldVehicles', '$totalAds'] }, 100] },
              1
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 6. Time to Conversion Analysis
    const timeToConversion = await AdvertiseVehicle.aggregate([
      { $match: baseMatch },
      { $unwind: { path: '$vehicle_other_details', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vehicle_other_details.sold_price': { $gt: 0 }
        }
      },
      {
        $project: {
          daysToSale: {
            $divide: [
              { $subtract: [new Date(), '$created_at'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$daysToSale',
          boundaries: [0, 7, 14, 30, 60, 90, 180, 365, 10000],
          default: '365+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const responseData = {
      conversionMetrics: conversionMetrics[0] || {
        totalAdvertisements: 0,
        completedAds: 0,
        soldVehicles: 0,
        completionRate: 0,
        conversionRate: 0,
        totalListingValue: 0,
        totalSoldValue: 0,
        avgRetailPrice: 0,
        avgSoldPrice: 0,
        priceRealizationRate: 0
      },
      conversionByDealership,
      conversionByMakeModel,
      conversionByPriceRange,
      conversionTimeline,
      timeToConversion
    };

    res.json(formatReportResponse(responseData, {
      reportType: 'advertisement-conversion-rates',
      filters: {
        dealership: dealershipFilter,
        dateRange: dateFilter
      }
    }));

  } catch (error) {
    return handleReportError(error, res, 'Advertisement Conversion Rates');
  }
};

module.exports = {
  getAdvertisementPerformance,
  getAdvertisementPricingAnalysis,
  getAdvertisementAttachmentQuality,
  getAdvertisementStatusTracking,
  getAdvertisementConversionRates
};
