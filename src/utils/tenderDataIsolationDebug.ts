/**
 * Tender Dealership Data Isolation Utilities
 * 
 * This file contains utilities to help verify and debug data isolation
 * between different dealerships in the tender system.
 */

/**
 * Validates that a dealership user can only see their own data
 */
export const validateDealershipDataIsolation = (
  dealershipUser: any,
  data: any[]
): boolean => {
  if (!dealershipUser || !dealershipUser.tenderDealership_id) {
    console.error("Invalid dealership user context");
    return false;
  }

  // For quotes/vehicles, check that they all belong to this dealership
  const belongsToThisDealership = data.every(
    (item) =>
      item.tenderDealership_id === dealershipUser.tenderDealership_id ||
      !item.tenderDealership_id
  );

  if (!belongsToThisDealership) {
    console.warn(
      "⚠️ DATA ISOLATION VIOLATION: Found items from different dealerships",
      {
        expectedDealership: dealershipUser.tenderDealership_id,
        foundDealerships: [
          ...new Set(
            data
              .map((item) => item.tenderDealership_id)
              .filter((id) => id)
          ),
        ],
      }
    );
    return false;
  }

  console.log("✅ Data isolation verified:", {
    dealershipUser: dealershipUser.tenderDealership_id,
    recordCount: data.length,
  });

  return true;
};

/**
 * Filters data to ensure only this dealership's data is shown
 */
export const filterByDealershipOwnership = (
  dealershipUser: any,
  data: any[]
): any[] => {
  if (!dealershipUser || !dealershipUser.tenderDealership_id) {
    console.error("Cannot filter without valid dealership user context");
    return [];
  }

  const filtered = data.filter(
    (item) => item.tenderDealership_id === dealershipUser.tenderDealership_id
  );

  if (filtered.length < data.length) {
    console.warn(
      `⚠️ Filtered ${data.length - filtered.length} items not belonging to dealership`
    );
  }

  return filtered;
};

/**
 * Logs detailed information about a tender and its dealership allocations
 */
export const logTenderDealershipAllocation = (
  tenderId: string,
  recipients: any[]
): void => {
  console.group(
    `📋 Tender Dealership Allocation - ${tenderId}`
  );

  const summary = {
    totalDealerships: recipients.length,
    byStatus: recipients.reduce((acc: any, recipient: any) => {
      const status = recipient.dealership_status || recipient.quote_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}),
    dealerships: recipients.map((r) => ({
      name: r.dealership_name,
      id: r.dealership_id,
      status: r.dealership_status || r.quote_status,
      responded: !!r.response_date,
      quotes: r.alternate_vehicles_count ? r.alternate_vehicles_count + 1 : 1,
    })),
  };

  console.table(summary.dealerships);
  console.log("Status Summary:", summary.byStatus);
  console.groupEnd();
};

/**
 * Validates the integrity of dealership-scoped API responses
 */
export const validateDealershipAPIResponse = (
  response: any,
  expectedDealershipId?: string
): boolean => {
  // Check for data isolation at the response level
  if (response.data && Array.isArray(response.data)) {
    const dealershipIds = new Set(
      response.data
        .map((item) => item.tenderDealership_id)
        .filter((id) => id)
    );

    if (dealershipIds.size > 1) {
      console.error(
        "❌ CRITICAL: API response contains data from multiple dealerships:",
        Array.from(dealershipIds)
      );
      return false;
    }

    if (
      expectedDealershipId &&
      dealershipIds.size > 0 &&
      !dealershipIds.has(expectedDealershipId)
    ) {
      console.error(
        "❌ CRITICAL: API response contains wrong dealership data:",
        {
          expected: expectedDealershipId,
          found: Array.from(dealershipIds)[0],
        }
      );
      return false;
    }
  }

  console.log("✅ API response passed data isolation check");
  return true;
};

/**
 * Debugs the dealership context by logging all relevant info
 */
export const debugDealershipContext = (dealershipUser: any): void => {
  console.group("🔍 Dealership Context Debug");
  console.log("User Info:", {
    id: dealershipUser?.id,
    username: dealershipUser?.username,
    email: dealershipUser?.email,
  });
  console.log("Dealership Scope:", {
    tenderDealership_id: dealershipUser?.tenderDealership_id,
    company_id: dealershipUser?.company_id,
  });
  console.log("Session Storage:", {
    token: !!sessionStorage.getItem("tender_dealership_token"),
    user: !!sessionStorage.getItem("tender_dealership_user"),
    info: !!sessionStorage.getItem("tender_dealership_info"),
  });
  console.groupEnd();
};

/**
 * Checks if a tender belongs to a specific admin user (company)
 * and shows dealership allocations
 */
export const debugTenderAdminView = (tender: any, recipients: any[]): void => {
  console.group(`📊 Tender Admin View - ${tender.tender_id}`);
  console.log("Tender:", {
    id: tender._id,
    status: tender.tender_status,
    createdAt: new Date(tender.created_at).toLocaleString(),
  });
  console.log("Dealership Recipients:", recipients.length);
  logTenderDealershipAllocation(tender.tender_id, recipients);
  console.groupEnd();
};

export default {
  validateDealershipDataIsolation,
  filterByDealershipOwnership,
  logTenderDealershipAllocation,
  validateDealershipAPIResponse,
  debugDealershipContext,
  debugTenderAdminView,
};
