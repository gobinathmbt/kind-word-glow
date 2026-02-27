

import apiClient from "./axios";

// Auth Services
export const authServices = {
  login: (email: string, password: string) =>
    apiClient.post("/api/auth/login", { email, password }),

  registerCompany: (data: any) =>
    apiClient.post("/api/auth/register-company", data),

  getMe: () => apiClient.get("/api/auth/me"),

  getCurrentUserPermissions: (module_name?: string) =>
    apiClient.get("/api/auth/me/permissions", {
      params: module_name ? { module_name } : {}
    }),

  getCurrentUserModule: () => apiClient.get("/api/auth/me/module"),
};

// Subscription Services
export const subscriptionServices = {
  getPricingConfig: () => apiClient.get("/api/subscription/pricing-config"),

  calculatePrice: (data: any) =>
    apiClient.post("/api/subscription/calculate-price", data),

  createSubscription: (data: any) =>
    apiClient.post("/api/subscription/create", data),

  updatePaymentStatus: (subscriptionId: string, data: any) =>
    apiClient.patch(`/api/subscription/${subscriptionId}/payment-status`, data),

  getCurrentSubscription: () => apiClient.get("/api/subscription/current"),

  getSubscriptionHistory: (currentPage, limit) => {
    return apiClient.get(`api/subscription/history?page=${currentPage}&limit=${limit}`);
  },

  getCompanySubscriptionInfo: () =>
    apiClient.get("/api/subscription/company-info"),

  // Fetch invoice from payment gateway
  fetchInvoiceFromGateway: (subscriptionId: string) =>
    apiClient.get(`/api/subscription/${subscriptionId}/invoice-from-gateway`),

  // Get invoice receipt URL
  getInvoiceReceiptUrl: (subscriptionId: string) =>
    apiClient.get(`/api/subscription/${subscriptionId}/receipt-url`),

  // Send Stripe receipt via email
  sendStripeReceiptEmail: (subscriptionId: string) =>
    apiClient.post(`/api/subscription/${subscriptionId}/send-stripe-receipt`),

  // Send PayPal receipt via email
  sendPayPalReceiptEmail: (subscriptionId: string) =>
    apiClient.post(`/api/subscription/${subscriptionId}/send-paypal-receipt`),

  // Send Razorpay receipt via email
  sendRazorpayReceiptEmail: (subscriptionId: string) =>
    apiClient.post(`/api/subscription/${subscriptionId}/send-razorpay-receipt`),

  // Invoice Services
  getInvoices: (params = {}) => apiClient.get("/api/invoices", { params }),

  getInvoice: (invoiceId) => apiClient.get(`/api/invoices/${invoiceId}`),

  getInvoiceStats: () => apiClient.get("/api/invoices/stats"),

  updateInvoicePaymentStatus: (invoiceId, data) =>
    apiClient.patch(`/api/invoices/${invoiceId}/payment-status`, data),
};

// Payment Settings Services (Public)
export const paymentSettingsServices = {
  getPublicPaymentSettings: () => apiClient.get("/api/payment-settings/public"),
  getGoogleMapsApiKey: () => apiClient.get("/api/payment-settings/google-maps-key"),
};

// Master Admin Services
export const masterServices = {
  // Dashboard
  getDashboardStats: () => apiClient.get("/api/master/dashboard"),

  // Companies
  getCompanies: (params?: any) =>
    apiClient.get("/api/master/companies", { params }),

  getCompany: (id: string) => apiClient.get(`/api/master/companies/${id}`),

  updateCompany: (id: string, data: any) =>
    apiClient.put(`/api/master/companies/${id}`, data),

  deleteCompany: (id: string) =>
    apiClient.delete(`/api/master/companies/${id}`),

  toggleCompanyStatus: (id: string, data: any) =>
    apiClient.patch(`/api/master/companies/${id}/status`, data),

  // Plans
  getPlans: () => apiClient.get("/api/subscription/pricing-config"),

  createPlan: (data: any) => apiClient.post("/api/master/plans", data),

  updatePlan: (id: string, data: any) =>
    apiClient.put(`/api/master/plans/${id}`, data),

  deletePlan: (id: string) => apiClient.delete(`/api/master/plans/${id}`),

  getDropdowns: (params?: any) =>
    apiClient.get("api/master/dropdowns", { params }),

  getMasterdropdownvalues: (data: any) =>
    apiClient.post("api/master/dropdowns/dropdown_values", data),

  // Permissions
  getPermissions: (params?: any) =>
    apiClient.get("/api/master/permissions", { params }),

  getPermission: (id: string) => apiClient.get(`/api/master/permissions/${id}`),

  createPermission: (data: any) =>
    apiClient.post("/api/master/permissions", data),

  updatePermission: (id: string, data: any) =>
    apiClient.put(`/api/master/permissions/${id}`, data),

  deletePermission: (id: string) =>
    apiClient.delete(`/api/master/permissions/${id}`),

  togglePermissionStatus: (id: string, data: any) =>
    apiClient.patch(`/api/master/permissions/${id}/status`, data),

  // Settings
  updateProfile: (data: any) => apiClient.put("/api/master/profile", data),

  updateSmtpSettings: (data: any) =>
    apiClient.put("/api/master/smtp-settings", data),

  testSmtp: (data: any) => apiClient.post("/api/master/test-smtp", data),

  // Payment Settings
  updatePaymentSettings: (data: any) =>
    apiClient.put("/api/master/payment-settings", data),

  getPaymentSettings: () => apiClient.get("/api/master/payment-settings"),

  // Maintenance Settings
  getMaintenanceSettings: () => apiClient.get("/api/master/maintenance"),

  updateMaintenanceSettings: (data: any) =>
    apiClient.put("/api/master/maintenance", data),

  // Public maintenance settings (no auth required)
  getPublicMaintenanceSettings: () =>
    apiClient.get("/api/master/maintenance/public"),
};

// Trademe Metadata Services
export const trademeMetadataServices = {
  // Get all trademe metadata with pagination and filters
  getAll: (params = {}) =>
    apiClient.get("/api/master/trademe-metadata", { params }),

  // Get single trademe metadata by ID
  getById: (id: string) =>
    apiClient.get(`/api/master/trademe-metadata/${id}`),

  // Update trademe metadata
  update: (id: string, data: any) =>
    apiClient.put(`/api/master/trademe-metadata/${id}`, data),

  // Delete trademe metadata
  delete: (id: string) =>
    apiClient.delete(`/api/master/trademe-metadata/${id}`),

  // Toggle active status
  toggleStatus: (id: string, data: any) =>
    apiClient.patch(`/api/master/trademe-metadata/${id}/status`, data),

  // Get counts by metadata type
  getCounts: () =>
    apiClient.get("/api/master/trademe-metadata/counts"),
};

// Vehicle Metadata Services
export const vehicleMetadataServices = {
  // Get list data for tables
  getMakes: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/makes", { params }),

  getModels: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/models", { params }),

  getModelsByMake: (makeId, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/models", {
      params: { ...params, makeId },
    }),

  getVariants: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/variants", { params }),

  getVariantsByModel: (modelId, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/variants", {
      params: { ...params, modelId },
    }),

  getBodies: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/bodies", { params }),

  getVariantYears: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/years", { params }),

  getVehicleMetadata: (params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/metadata", { params }),

  // Get dropdown data
  getDropdownData: (type, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/dropdown", {
      params: { type, ...params },
    }),

  // Get counts for dashboard
  getCounts: () => apiClient.get("/api/master/vehicle-metadata/counts"),

  // Get schema fields
  getSchemaFields: () =>
    apiClient.get("/api/master/vehicle-metadata/schema-fields"),

  // Create single entries
  addMake: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/make", data),

  addModel: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/model", data),

  addVariant: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/variant", data),

  addBody: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/body", data),

  addVariantYear: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/year", data),

  addVehicleMetadata: (data) =>
    apiClient.post("/api/master/vehicle-metadata/create/metadata", data),

  // Bulk create
  bulkCreate: (type, items) =>
    apiClient.post("/api/master/vehicle-metadata/bulk-create", { type, items }),

  // Update entries
  updateMake: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/make/${id}`, data),

  updateModel: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/model/${id}`, data),

  updateVariant: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/variant/${id}`, data),

  updateBody: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/body/${id}`, data),

  updateVariantYear: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/year/${id}`, data),

  updateVehicleMetadata: (id, data) =>
    apiClient.put(`/api/master/vehicle-metadata/update/metadata/${id}`, data),

  // Delete entries
  deleteMake: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/make/${id}`),

  deleteModel: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/model/${id}`),

  deleteVariant: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/variant/${id}`),

  deleteBody: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/body/${id}`),

  deleteVariantYear: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/year/${id}`),

  deleteVehicleMetadata: (id) =>
    apiClient.delete(`/api/master/vehicle-metadata/delete/metadata/${id}`),

  // Get years by variant or model
  getVariantYearsByVariant: (variantId, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/years", {
      params: { ...params, variantId },
    }),

  getYearsByModel: (modelId, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/years", {
      params: { ...params, modelId },
    }),

  getYearsByModelAndVariant: (modelId, variantId, params = {}) =>
    apiClient.get("/api/master/vehicle-metadata/list/years", {
      params: { ...params, modelId, variantId },
    }),
};

// Notification Configuration Services
export const notificationConfigServices = {
  getNotificationConfigurations: (params = {}) =>
    apiClient.get("/api/notification-config", { params }),

  getNotificationConfiguration: (id) =>
    apiClient.get(`/api/notification-config/${id}`),

  createNotificationConfiguration: (data) =>
    apiClient.post("/api/notification-config", data),

  updateNotificationConfiguration: (id, data) =>
    apiClient.put(`/api/notification-config/${id}`, data),

  deleteNotificationConfiguration: (id) =>
    apiClient.delete(`/api/notification-config/${id}`),

  toggleNotificationConfigurationStatus: (id, data) =>
    apiClient.patch(`/api/notification-config/${id}/status`, data),

  getAvailableSchemas: () =>
    apiClient.get("/api/notification-config/schemas"),

  getCompanyUsers: () =>
    apiClient.get("/api/notification-config/users"),
};

// Notification Services
export const notificationServices = {
  getNotifications: (params = {}) =>
    apiClient.get("/api/notifications", { params }),

  getNotificationStats: () =>
    apiClient.get("/api/notifications/stats"),

  getUnreadCount: () =>
    apiClient.get("/api/notifications/unread-count"),

  markNotificationAsRead: (id) =>
    apiClient.patch(`/api/notifications/${id}/read`),

  markMultipleAsRead: (notificationIds) =>
    apiClient.patch("/api/notifications/mark-multiple-read", { notification_ids: notificationIds }),

  markAllAsRead: () =>
    apiClient.patch("/api/notifications/mark-all-read"),

  deleteNotification: (id) =>
    apiClient.delete(`/api/notifications/${id}`),
};

// Workflow Services
export const workflowServices = {
  getWorkflows: (params?: any) => apiClient.get("/api/workflows", { params }),
  getWorkflow: (id: string) => apiClient.get(`/api/workflows/${id}`),
  createWorkflow: (data: any) => apiClient.post("/api/workflows", data),
  getWorkflowExecutionLogs: (workflowId: string, params?: any) =>
    apiClient.get(`/api/workflow-execute/logs/${workflowId}`, { params }),

  // Update workflow
  updateWorkflow: (id: string, data: any) =>
    apiClient.put(`/api/workflows/${id}`, data),

  // Delete workflow
  deleteWorkflow: (id: string) => apiClient.delete(`/api/workflows/${id}`),

  // Toggle workflow status
  toggleWorkflowStatus: (id: string, data: any) =>
    apiClient.patch(`/api/workflows/${id}/status`, data),

  // Get workflow statistics
  getWorkflowStats: () => apiClient.get("/api/workflows/stats"),

  // Get vehicle schema fields for mapping
  getVehicleSchemaFields: () => apiClient.get("/api/workflows/vehicle-schema"),

  // Get all available schemas
  getAvailableSchemas: (workflowType?: string) =>
    apiClient.get("/api/workflows/available-schemas", {
      params: workflowType ? { workflow_type: workflowType } : {}
    }),

  // Get schema fields for target schema node
  getSchemaFields: (schemaType: string) =>
    apiClient.get(`/api/workflows/schema-fields/${schemaType}`),

  // Get common fields between multiple schemas
  getCommonFields: (schemaTypes: string[]) =>
    apiClient.post('/api/workflows/common-fields', { schemaTypes }),

  // Test workflow configuration
  testWorkflow: (id: string, data: any) =>
    apiClient.post(`/api/workflows/${id}/test`, data),
};

// Custom Module Services
export const customModuleServices = {
  getCustomModuleConfigs: (params?: any) =>
    apiClient.get("/api/master/custom-modules", { params }),

  getCustomModuleConfig: (id: string) =>
    apiClient.get(`/api/master/custom-modules/${id}`),

  getCustomModuleConfigByCompany: (companyId: string) =>
    apiClient.get(`/api/master/custom-modules/company/${companyId}`),

  // Company route version (no master_admin required)
  getCustomModuleConfigByCompanyFromCompanyRoute: (companyId: string) =>
    apiClient.get(`/api/company/custom-modules/company/${companyId}`),

  createCustomModuleConfig: (data: any) =>
    apiClient.post("/api/master/custom-modules", data),

  updateCustomModuleConfig: (id: string, data: any) =>
    apiClient.put(`/api/master/custom-modules/${id}`, data),

  deleteCustomModuleConfig: (id: string) =>
    apiClient.delete(`/api/master/custom-modules/${id}`),

  toggleCustomModuleConfigStatus: (id: string, data: any) =>
    apiClient.patch(`/api/master/custom-modules/${id}/status`, data),

  getCompaniesWithoutConfig: () =>
    apiClient.get("/api/master/custom-modules/companies-without-config"),
};

export const masterDropdownServices = {
  getMasterDropdowns: (params?: any) =>
    apiClient.get("/api/master/dropdowns", { params }),

  createMasterDropdown: (data: any) =>
    apiClient.post("/api/master/dropdowns", data),

  updateMasterDropdown: (id: string, data: any) =>
    apiClient.put(`/api/master/dropdowns/${id}`, data),

  deleteMasterDropdown: (id: string) =>
    apiClient.delete(`/api/master/dropdowns/${id}`),

  addMasterValue: (dropdownId: string, data: any) =>
    apiClient.post(`/api/master/dropdowns/${dropdownId}/values`, data),

  updateMasterValue: (dropdownId: string, valueId: string, data: any) =>
    apiClient.put(
      `/api/master/dropdowns/${dropdownId}/values/${valueId}`,
      data
    ),

  deleteMasterValue: (dropdownId: string, valueId: string) =>
    apiClient.delete(`/api/master/dropdowns/${dropdownId}/values/${valueId}`),

  reorderMasterValues: (dropdownId: string, data: any) =>
    apiClient.put(`/api/master/dropdowns/${dropdownId}/reorder/values`, data),
};

// Company Services
export const companyServices = {
  getDashboardStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/stats", { params }),

  getVehicleStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/vehicles", { params }),

  getInspectionStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/inspections", { params }),

  getAppraisalStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/appraisals", { params }),

  getMasterdropdownvalues: (data: any) =>
    apiClient.post("api/company/company/dropdowns/dropdown_values", data),

  getCompanyMasterdropdownvalues: (data: any) =>
    apiClient.post(
      "api/company/company_dropdowns/dropdowns/dropdown_values",
      data
    ),

  getUserStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/users", { params }),

  getRevenueStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/revenue", { params }),

  getActivityStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/activity", { params }),

  getPerformanceStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/performance", { params }),

  getSystemStats: (params?: any) =>
    apiClient.get("/api/company/dashboard/system", { params }),

  getRecentActivity: (params?: any) =>
    apiClient.get("/api/company/dashboard/recent-activity", { params }),

  // Users
  getUsers: (params?: any) => apiClient.get("/api/company/users", { params }),

  createUser: (data: any) => apiClient.post("/api/company/users", data),

  updateUser: (id: string, data: any) =>
    apiClient.put(`/api/company/users/${id}`, data),

  deleteUser: (id: string) => apiClient.delete(`/api/company/users/${id}`),

  toggleUserStatus: (id: string, data: any) =>
    apiClient.patch(`/api/company/users/${id}/status`, data),

  getCompanyMetaData: (type, params = {}) =>
    apiClient.get("/api/company/company/meta-data", {
      params: { type, ...params },
    }),

  getTenderDealershipMetaData: (type, params = {}) =>
    apiClient.get("/api/tender-dealership-auth/meta-data", {
      params: { type, ...params },
    }),

  createMake: (data: any) => apiClient.post("/api/company/create/make", data),
  createModel: (data: any) => apiClient.post("/api/company/create/model", data),
  createVariant: (data: any) =>
    apiClient.post("/api/company/create/variant", data),
  createBodyType: (data: any) => apiClient.post("/api/company/create/body", data),
  createYear: (data: any) => apiClient.post("/api/company/create/year", data),

  sendWelcomeEmail: (id: string) =>
    apiClient.post(`/api/company/users/${id}/send-welcome`),

  // Permissions
  getAvailablePermissions: () =>
    apiClient.get("/api/company/permissions/available"),

  getUsersWithPermissions: (params?: any) =>
    apiClient.get("/api/company/users-permissions", { params }),

  getUserPermissions: (userId: string) =>
    apiClient.get(`/api/company/users/${userId}/permissions`),

  updateUserPermissions: (userId: string, data: any) =>
    apiClient.put(`/api/company/users/${userId}/permissions`, data),

  // Module Access
  getUserModules: (userId: string) =>
    apiClient.get(`/api/company/users/${userId}/modules`),

  updateUserModules: (userId: string, data: any) =>
    apiClient.put(`/api/company/users/${userId}/modules`, data),

  // Group Permissions
  getGroupPermissions: (params?: any) =>
    apiClient.get("/api/company/group-permissions", { params }),

  getGroupPermission: (id: string) =>
    apiClient.get(`/api/company/group-permissions/${id}`),

  createGroupPermission: (data: any) =>
    apiClient.post("/api/company/group-permissions", data),

  updateGroupPermission: (id: string, data: any) =>
    apiClient.put(`/api/company/group-permissions/${id}`, data),

  deleteGroupPermission: (id: string) =>
    apiClient.delete(`/api/company/group-permissions/${id}`),

  assignGroupPermissionToUser: (userId: string, data: any) =>
    apiClient.put(`/api/company/users/${userId}/group-permission`, data),

  // Settings
  getS3Config: () => apiClient.get("/api/company/settings/s3"),

  updateS3Config: (data: any) =>
    apiClient.put("/api/company/settings/s3", data),

  getCallbackConfig: () => apiClient.get("/api/company/settings/callback"),

  updateCallbackConfig: (data: any) =>
    apiClient.put("/api/company/settings/callback", data),

  getBillingInfo: () => apiClient.get("/api/company/settings/billing"),

  testS3Connection: (data: any) =>
    apiClient.post("/api/company/settings/test-s3", data),

  testWebhook: (data: any) =>
    apiClient.post("/api/company/settings/test-webhook", data),

  // Company Info
  getCompanyInfo: () => apiClient.get("/api/company/info"),

  updateCompanyInfo: (data: any) => apiClient.put("/api/company/info", data),

  updateCompanyPassword: (data: any) =>
    apiClient.put("/api/company/password", data),

  // Currency Services
  getCurrencies: (params?: any) =>
    apiClient.get("/api/company/currencies", { params }),

  getCurrency: (id: string) =>
    apiClient.get(`/api/company/currencies/${id}`),

  createCurrency: (data: any) =>
    apiClient.post("/api/company/currencies", data),

  updateCurrency: (id: string, data: any) =>
    apiClient.put(`/api/company/currencies/${id}`, data),

  deleteCurrency: (id: string) =>
    apiClient.delete(`/api/company/currencies/${id}`),

  // Cost Configuration Services
  getCostConfiguration: () =>
    apiClient.get("/api/company/cost-configuration"),

  addCostType: (data: any) =>
    apiClient.post("/api/company/cost-configuration/cost-types", data),

  updateCostType: (costTypeId: string, data: any) =>
    apiClient.put(`/api/company/cost-configuration/cost-types/${costTypeId}`, data),

  getCostConfigurationByVehicleType: (vehiclePurchaseType: string) =>
    apiClient.get(`/api/company/cost-configuration/vehicle-type/${vehiclePurchaseType}`),

  deleteCostType: (costTypeId: string) =>
    apiClient.delete(`/api/company/cost-configuration/cost-types/${costTypeId}`),

  reorderCostTypes: (data: any) =>
    apiClient.put("/api/company/cost-configuration/cost-types/reorder", data),

  // Cost Setter Services
  getCostSetter: () =>
    apiClient.get("/api/company/cost-setter"),

  updateCostSetter: (data: any) =>
    apiClient.put("/api/company/cost-setter", data),

  deleteCostSetter: (vehiclePurchaseType: string) =>
    apiClient.delete(`/api/company/cost-setter/${vehiclePurchaseType}`),
};

// Dealership Services
export const dealershipServices = {
  getDealerships: (params?: any) =>
    apiClient.get("/api/dealership", { params }),

  getDealership: (id: string) => apiClient.get(`/api/dealership/${id}`),

  createDealership: (data: any) => apiClient.post("/api/dealership", data),

  updateDealership: (id: string, data: any) =>
    apiClient.put(`/api/dealership/${id}`, data),

  deleteDealership: (id: string) => apiClient.delete(`/api/dealership/${id}`),

  toggleDealershipStatus: (id: string, data: any) =>
    apiClient.patch(`/api/dealership/${id}/status`, data),

  getDealershipsDropdown: () => apiClient.get("/api/dealership/dropdown"),
};

// ... keep existing code (other services remain the same)

// Dropdown Services
export const dropdownServices = {
  getDropdowns: (params?: any) => apiClient.get("/api/dropdown", { params }),

  createDropdown: (data: any) => apiClient.post("/api/dropdown", data),

  updateDropdown: (id: string, data: any) =>
    apiClient.put(`/api/dropdown/${id}`, data),

  deleteDropdown: (id: string) => apiClient.delete(`/api/dropdown/${id}`),

  addValue: (dropdownId: string, data: any) =>
    apiClient.post(`/api/dropdown/${dropdownId}/values`, data),

  updateValue: (dropdownId: string, valueId: string, data: any) =>
    apiClient.put(`/api/dropdown/${dropdownId}/values/${valueId}`, data),

  deleteValue: (dropdownId: string, valueId: string) =>
    apiClient.delete(`/api/dropdown/${dropdownId}/values/${valueId}`),

  reorderValues: (dropdownId: string, data: any) =>
    apiClient.put(`/api/dropdown/${dropdownId}/reorder/values`, data),

  getMasterInspection: () => apiClient.get("/api/dropdown/master_inspection"),
};

// Configuration Services
export const configServices = {
  // Inspection Config
  getInspectionConfigs: (params?: any) =>
    apiClient.get("/api/config/inspection", { params }),

  // Get active configurations
  getActiveConfigurations: (companyId: string, vehicleType: string) =>
    apiClient.get(
      `/api/master-inspection/active-configs/${companyId}/${vehicleType}`
    ),

  getInspectionConfigDetails: (id: string) =>
    apiClient.get(`/api/config/inspection/${id}`),

  createInspectionConfig: (data: any) =>
    apiClient.post("/api/config/inspection", data),

  updateInspectionConfig: (id: string, data: any) =>
    apiClient.put(`/api/config/inspection/${id}`, data),

  deleteInspectionConfig: (id: string) =>
    apiClient.delete(`/api/config/inspection/${id}`),

  updateInspectionField: (configId: string, fieldId: string, data: any) =>
    apiClient.put(`/api/config/inspection/${configId}/fields/${fieldId}`, data),

  deleteInspectionField: (configId: string, fieldId: string) =>
    apiClient.delete(`/api/config/inspection/${configId}/fields/${fieldId}`),

  deleteInspectionSection: (configId: string, sectionId: string) =>
    apiClient.delete(
      `/api/config/inspection/${configId}/sections/${sectionId}`
    ),

  updateSectionsOrder: (configId: string, categoryId: string, data: any) =>
    apiClient.put(
      `/api/config/inspection/${configId}/categories/${categoryId}/sections/reorder`,
      data
    ),

  updateFieldsOrder: (configId: string, sectionId: string, data: any) =>
    apiClient.put(
      `/api/config/inspection/${configId}/sections/${sectionId}/fields/reorder`,
      data
    ),

  saveInspectionConfig: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/config/inspection/${id}`, data);
    return response.data;
  },

  // Inspection Category services
  addInspectionCategory: (configId: string, categoryData: any) =>
    apiClient.post(
      `/api/config/inspection/${configId}/categories`,
      categoryData
    ),

  addInspectionSection: (configId: string, categoryId: string, data: any) =>
    apiClient.post(
      `/api/config/inspection/${configId}/categories/${categoryId}/sections`,
      data
    ),

  addInspectionField: (configId: string, sectionId: string, data: any) =>
    apiClient.post(
      `/api/config/inspection/${configId}/sections/${sectionId}/fields`,
      data
    ),

  updateInspectionCategory: async (
    configId: string,
    categoryId: string,
    categoryData: any
  ) => {
    return await apiClient.put(
      `/api/config/inspection/${configId}/categories/${categoryId}`,
      categoryData
    );
  },

  toggleInspectionCategoryStatus: async (
    configId: string,
    categoryId: string,
    isActive: boolean
  ) => {
    return await apiClient.patch(
      `/api/config/inspection/${configId}/categories/${categoryId}/toggle`,
      { is_active: isActive }
    );
  },

  // Trade-in Config
  getTradeinConfigs: (params?: any) =>
    apiClient.get("/api/config/tradein", { params }),

  getTradeinConfigDetails: (id: string) =>
    apiClient.get(`/api/config/tradein/${id}`),

  createTradeinConfig: (data: any) =>
    apiClient.post("/api/config/tradein", data),

  updateTradeinConfig: (id: string, data: any) =>
    apiClient.put(`/api/config/tradein/${id}`, data),

  deleteTradeinConfig: (id: string) =>
    apiClient.delete(`/api/config/tradein/${id}`),

  // Trade-in Category services (NEW - Added to match inspection pattern)
  addTradeinCategory: (configId: string, categoryData: any) =>
    apiClient.post(
      `/api/config/tradein/${configId}/categories`,
      categoryData
    ),

  updateTradeinCategory: async (
    configId: string,
    categoryId: string,
    categoryData: any
  ) => {
    return await apiClient.put(
      `/api/config/tradein/${configId}/categories/${categoryId}`,
      categoryData
    );
  },

  toggleTradeinCategoryStatus: async (
    configId: string,
    categoryId: string,
    isActive: boolean
  ) => {
    return await apiClient.patch(
      `/api/config/tradein/${configId}/categories/${categoryId}/toggle`,
      { is_active: isActive }
    );
  },

  // Trade-in Section services (Updated to include categoryId)
  addTradeinSection: (configId: string, categoryId: string, data: any) =>
    apiClient.post(
      `/api/config/tradein/${configId}/categories/${categoryId}/sections`,
      data
    ),

  updateTradeinSectionsOrder: (configId: string, categoryId: string, data: any) =>
    apiClient.put(
      `/api/config/tradein/${configId}/categories/${categoryId}/sections/reorder`,
      data
    ),

  addTradeinField: (configId: string, sectionId: string, data: any) =>
    apiClient.post(
      `/api/config/tradein/${configId}/sections/${sectionId}/fields`,
      data
    ),

  updateTradeinField: (configId: string, fieldId: string, data: any) =>
    apiClient.put(
      `/api/config/update/tradein/${configId}/fields/${fieldId}`,
      data
    ),

  deleteTradeinField: (configId: string, fieldId: string) =>
    apiClient.delete(`/api/config/tradein/${configId}/fields/${fieldId}`),

  deleteTradeinSection: (configId: string, sectionId: string) =>
    apiClient.delete(`/api/config/tradein/${configId}/sections/${sectionId}`),

  updateTradeinFieldsOrder: (configId: string, sectionId: string, data: any) =>
    apiClient.put(
      `/api/config/tradein/${configId}/sections/${sectionId}/fields/reorder`,
      data
    ),

  saveTradeinConfig: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/config/tradein/${id}`, data);
    return response.data;
  },



  // Inspection Calculation services
  addInspectionCalculation: async (
    configId: string,
    categoryId: string,
    calculationData: any
  ) => {
    return await apiClient.post(
      `/api/config/inspection/${configId}/categories/${categoryId}/calculations`,
      calculationData
    );
  },

  updateInspectionCalculationFormula: async (
    configId: string,
    categoryId: string,
    calculationId: string,
    formula: any
  ) => {
    return await apiClient.put(
      `/api/config/inspection/${configId}/categories/${categoryId}/calculations/${calculationId}/formula`,
      { formula }
    );
  },

  deleteInspectionCalculation: async (
    configId: string,
    categoryId: string,
    calculationId: string
  ) => {
    return await apiClient.delete(
      `/api/config/inspection/${configId}/categories/${categoryId}/calculations/${calculationId}`
    );
  },

  toggleInspectionCalculationStatus: async (
    configId: string,
    categoryId: string,
    calculationId: string,
    isActive: boolean
  ) => {
    return await apiClient.patch(
      `/api/config/inspection/${configId}/categories/${categoryId}/calculations/${calculationId}/toggle`,
      { is_active: isActive }
    );
  },

  // Trade-in Calculation services (Updated to include categoryId)
  addTradeinCalculation: async (
    configId: string,
    categoryId: string,
    calculationData: any
  ) => {
    return await apiClient.post(
      `/api/config/tradein/${configId}/categories/${categoryId}/calculations`,
      calculationData
    );
  },

  updateTradeinCalculationFormula: async (
    configId: string,
    categoryId: string,
    calculationId: string,
    formula: any
  ) => {
    return await apiClient.put(
      `/api/config/tradein/${configId}/categories/${categoryId}/calculations/${calculationId}/formula`,
      { formula }
    );
  },

  deleteTradeinCalculation: async (
    configId: string,
    categoryId: string,
    calculationId: string
  ) => {
    return await apiClient.delete(
      `/api/config/tradein/${configId}/categories/${categoryId}/calculations/${calculationId}`
    );
  },

  toggleTradeinCalculationStatus: async (
    configId: string,
    categoryId: string,
    calculationId: string,
    isActive: boolean
  ) => {
    return await apiClient.patch(
      `/api/config/tradein/${configId}/categories/${categoryId}/calculations/${calculationId}/toggle`,
      { is_active: isActive }
    );
  },

  // S3 Configuration
  getS3Config: () => apiClient.get("/api/company/settings/s3"),
};

// Vehicle Services
export const vehicleServices = {

  getTadeins: (params?: any) => apiClient.get("/api/tradein", { params }),

  getVehicleStock: (params?: any) =>
    apiClient.get("/api/vehicle/stock", { params }),

  getVehicleDetail: (vehicleId: string, vehicleType: string) =>
    apiClient.get(`/api/vehicle/detail/${vehicleId}/${vehicleType}`),

  getActivityLogs: (
    vehicleType: string,
    stockId: string | number,
    params?: {
      page?: number;
      limit?: number;
      field?: string;
      user_id?: string;
      action?: string;
      date_from?: string;
      date_to?: string;
      module_name?: string;
      status?: string;
    }
  ) => apiClient.get(`/api/vehicle-activity/${vehicleType}/${stockId}`, { params }),

  getFieldHistory: (params: {
    vehicle_stock_id: string | number;
    company_id: string;
    vehicle_type: string;
    module_name: string;
    field: string;
  }) => apiClient.get('/api/vehicle-activity/field-history', { params }),

  createVehicleStock: (data: any) =>
    apiClient.post("/api/vehicle/create-stock", data),

  bulkImportVehicles: (data: any) =>
    apiClient.post("/api/vehicle/bulk-import", data),

  updateVehicle: (id: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${id}/${vehicleType}`, data),

  deleteVehicle: (id: string) => apiClient.delete(`/api/vehicle/${id}`),

  // Soft delete vehicle (set isActive = false)
  softDeleteVehicle: (id: string, vehicleType: string) => {
    console.log("Making soft delete API call:", `/api/vehicle/${id}/${vehicleType}/soft-delete`);
    return apiClient.patch(`/api/vehicle/${id}/${vehicleType}/soft-delete`);
  },

  // Restore vehicle (set isActive = true)
  restoreVehicle: (id: string, vehicleType: string) =>
    apiClient.patch(`/api/vehicle/${id}/${vehicleType}/restore`),

  // Vehicle Section Updates
  updateVehicleOverview: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/overview`, data),

  updateVehicleGeneralInfo: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.put(
      `/api/vehicle/${vehicleId}/${vehicleType}/general-info`,
      data
    ),

  updateVehicleSource: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/source`, data),

  updateVehicleRegistration: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.put(
      `/api/vehicle/${vehicleId}/${vehicleType}/registration`,
      data
    ),

  updateVehicleImport: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/import`, data),

  updateVehicleEngine: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/engine`, data),

  updateVehicleSpecifications: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.put(
      `/api/vehicle/${vehicleId}/${vehicleType}/specifications`,
      data
    ),

  updateVehicleOdometer: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/odometer`, data),

  updateVehicleOwnership: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/ownership`, data),

  // Vehicle Attachments
  getVehicleAttachments: (vehicleId: string, vehicleType: string) =>
    apiClient.get(`/api/vehicle/${vehicleId}/${vehicleType}/attachments`),

  uploadVehicleAttachment: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.post(
      `/api/vehicle/${vehicleId}/${vehicleType}/attachments`,
      data
    ),

  deleteVehicleAttachment: (
    vehicleId: string,
    vehicleType: string,
    attachmentId: string,
    data?: any
  ) =>
    apiClient.delete(
      `/api/vehicle/${vehicleId}/${vehicleType}/attachments/${attachmentId}`,
      { data }
    ),

  // Workshop Status
  updateVehicleWorkshopStatus: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.put(
      `/api/vehicle/${vehicleId}/${vehicleType}/workshop-status`,
      data
    ),
};

// Inspection Services
export const inspectionServices = {
  getInspections: (params?: any) =>
    apiClient.get("/api/inspection", { params }),

  startInspection: (vehicleId: string) =>
    apiClient.post(`/api/inspection/start/${vehicleId}`),

  getInspection: (id: string) => apiClient.get(`/api/inspection/${id}`),

  updateInspection: (id: string, data: any) =>
    apiClient.put(`/api/inspection/${id}`, data),

  completeInspection: (id: string, data: any) =>
    apiClient.post(`/api/inspection/${id}/complete`, data),

  getInspectionReport: (id: string) =>
    apiClient.get(`/api/inspection/${id}/report`),
};

// Trade-in Services
export const tradeinServices = {
  getTadeins: (params?: any) => apiClient.get("/api/tradein", { params }),

  startAppraisal: (vehicleId: string, vehicleType: string) =>
    apiClient.post(`/api/tradein/start/${vehicleId}/${vehicleType}`),

  getTradein: (id: string) => apiClient.get(`/api/tradein/${id}`),

  updateTradein: (id: string, data: any) =>
    apiClient.put(`/api/tradein/${id}`, data),

  completeAppraisal: (id: string, data: any) =>
    apiClient.post(`/api/tradein/${id}/complete`, data),

  makeOffer: (id: string, data: any) =>
    apiClient.post(`/api/tradein/${id}/offer`, data),

  getTradeinReport: (id: string) => apiClient.get(`/api/tradein/${id}/report`),
};

// Supplier Services
export const supplierServices = {
  getSuppliers: (params?: any) => apiClient.get("/api/supplier", { params }),

  getSupplier: (id: string) => apiClient.get(`/api/supplier/${id}`),

  createSupplier: (data: any) => apiClient.post("/api/supplier", data),

  updateSupplier: (id: string, data: any) =>
    apiClient.put(`/api/supplier/${id}`, data),

  deleteSupplier: (id: string) => apiClient.delete(`/api/supplier/${id}`),

  searchSuppliersByTags: (data: any) =>
    apiClient.post("/api/supplier/search-by-tags", data),
};

// Workshop Services
export const workshopServices = {
  getWorkshopVehicles: (params?: any) =>
    apiClient.get("/api/workshop/vehicles", { params }),

  getWorkshopVehicleDetails: (vehicleId: string, vehicleType: string) =>
    apiClient.get(`/api/workshop/vehicle/${vehicleId}/${vehicleType}`),

  createQuote: (data: any) => apiClient.post("/api/workshop/quote", data),

  getQuotesForField: (
    vehicleType: string,
    vehicleStockId: number,
    fieldId: string
  ) =>
    apiClient.get(
      `/api/workshop/quotes/${vehicleType}/${vehicleStockId}/${fieldId}`
    ),

  approveSupplierQuote: (quoteId: string, supplierId: string) =>
    apiClient.post(`/api/workshop/quote/${quoteId}/approve/${supplierId}`),

  acceptWork: (quoteId: string) =>
    apiClient.post(`/api/workshop/quote/${quoteId}/accept-work`),

  requestRework: (quoteId: string, reason: string) =>
    apiClient.post(`/api/workshop/quote/${quoteId}/request-rework`, { reason }),

  // Manual completion services
  createManualQuote: (data: any) => apiClient.post("/api/workshop/manual-quote", data),

  createManualBayQuote: (data: any) => apiClient.post("/api/workshop/manual-bay-quote", data),

  completeManualQuote: (quoteId: string, data: any) =>
    apiClient.post(`/api/workshop/manual-quote/${quoteId}/complete`, data),

  // Workshop field management
  addWorkshopField: (data: any) =>
    apiClient.post("/api/config/workshop/field", data),

  updateWorkshopField: (fieldId: string, data: any) =>
    apiClient.put(`/api/config/workshop/field/${fieldId}`, data),

  checkWorkshopCompletion: (vehicleId: string, vehicleType: string) =>
    apiClient.get(
      `/api/workshop-report/vehicle/${vehicleId}/${vehicleType}/check-completion`
    ),

  completeWorkshop: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.post(
      `/api/workshop-report/vehicle/${vehicleId}/${vehicleType}/complete`,
      data
    ),

  getWorkshopReports: (vehicleId: string, vehicleType: string, params?: any) =>
    apiClient.get(`/api/workshop-report/vehicle/${vehicleId}/${vehicleType}`, {
      params,
    }),

  getWorkshopReport: (reportId: string) =>
    apiClient.get(`/api/workshop-report/report/${reportId}`),
};

// Service Bay Services
export const serviceBayServices = {
  getServiceBays: (params?: any) =>
    apiClient.get("/api/service-bay", { params }),

  getServiceBay: (id: string) =>
    apiClient.get(`/api/service-bay/${id}`),

  createServiceBay: (data: any) =>
    apiClient.post("/api/service-bay", data),

  updateServiceBay: (id: string, data: any) =>
    apiClient.put(`/api/service-bay/${id}`, data),

  deleteServiceBay: (id: string) =>
    apiClient.delete(`/api/service-bay/${id}`),

  toggleServiceBayStatus: (id: string, data: any) =>
    apiClient.patch(`/api/service-bay/${id}/status`, data),

  addBayHoliday: (id: string, data: any) =>
    apiClient.post(`/api/service-bay/${id}/holiday`, data),


  getBayHolidays: (startDate: string, endDate: string, bayId?: string) =>
    apiClient.get("/api/service-bay/bay-holiday", {
      params: { start_date: startDate, end_date: endDate, bay_id: bayId }
    }),


  removeBayHoliday: (id: string, holidayId: string) =>
    apiClient.delete(`/api/service-bay/${id}/holiday/${holidayId}`),

  getBaysDropdown: (dealershipId?: string) =>
    apiClient.get("/api/service-bay/dropdown", {
      params: dealershipId ? { dealership_id: dealershipId } : {}
    }),
};

// Bay Quote Services (using WorkshopQuote model)
export const bayQuoteServices = {
  createBayQuote: (data: any) =>
    apiClient.post("/api/workshop/bay-quote", data),

  updateBayQuote: (id: string, data: any) =>
    apiClient.put(`/api/workshop/bay-quote/${id}`, data),

  getBayCalendar: (startDate: string, endDate: string, bayId?: string) =>
    apiClient.get("/api/workshop/bay-calendar", {
      params: { start_date: startDate, end_date: endDate, bay_id: bayId }
    }),

  getBayQuoteForField: (vehicleType: string, vehicleStockId: string, fieldId: string) =>
    apiClient.get(`/api/workshop/bay-quote/${vehicleType}/${vehicleStockId}/${fieldId}`),

  acceptBayQuote: (id: string) =>
    apiClient.post(`/api/workshop/bay-quote/${id}/accept`),

  rejectBayQuote: (id: string, reason: string) =>
    apiClient.post(`/api/workshop/bay-quote/${id}/reject`, { reason }),

  startBayWork: (id: string) =>
    apiClient.post(`/api/workshop/bay-quote/${id}/start-work`),

  submitBayWork: (id: string, data: any) =>
    apiClient.post(`/api/workshop/bay-quote/${id}/submit-work`, data),

  acceptWork: (id: string) =>
    apiClient.post(`/api/workshop/quote/${id}/accept-work`),

  requestRework: (id: string, reason: string) =>
    apiClient.post(`/api/workshop/quote/${id}/request-rework`, { reason }),

  // In your bayQuoteServices
  rebookBayQuote: (quoteId: string, data: any) =>
    apiClient.put(`/api/workshop/bay-quote/${quoteId}/rebook`, data),


};

// Supplier Auth Services
export const supplierAuthServices = {
  login: (email: string, password: string, company_id: string) =>
    apiClient.post("/api/supplier-auth/login", { email, password, company_id }),

  getProfile: () => apiClient.get("/api/supplier-auth/profile"),

  getVehicles: () => apiClient.get("/api/supplier-auth/vehicles"),

  getVehicleDetails: (vehicleStockId: string, vehicleType: string) =>
    apiClient.get(
      `/api/supplier-auth/vehicle/${vehicleStockId}/${vehicleType}`
    ),

  submitResponse: (quoteId: string, data: any) =>
    apiClient.post(`/api/supplier-auth/quote/${quoteId}/respond`, data),

  markNotInterested: (quoteId: string) =>
    apiClient.patch(`/api/supplier-auth/quote/${quoteId}/not-interested`),
};

// Supplier Dashboard Services
export const supplierDashboardServices = {
  getStats: () => apiClient.get("/api/supplier-dashboard/stats"),

  getsupplierS3Config: () =>
    apiClient.get("/api/supplier-dashboard/supplier_s3"),

  getQuotesByStatus: (status: string, params?: any) =>
    apiClient.get(`/api/supplier-dashboard/quotes/${status}`, { params }),

  startWork: (quoteId: string) =>
    apiClient.post(`/api/supplier-dashboard/quote/${quoteId}/start-work`),

  submitWork: (quoteId: string, data: any) =>
    apiClient.post(
      `/api/supplier-dashboard/quote/${quoteId}/submit-work`,
      data
    ),

  updateProfile: (data: any) =>
    apiClient.put("/api/supplier-dashboard/profile", data),
};

export const masterInspectionServices = {
  // Get configuration with optional vehicle stock id for last used config
  getMasterConfiguration: (
    companyId: string,
    vehicleType: string,
    vehicleStockId?: string,
    configId?: string
  ) => {
    const params = new URLSearchParams();
    if (vehicleStockId) params.append("vehicle_stock_id", vehicleStockId);
    if (configId) params.append("configId", configId);

    const queryString = params.toString();
    const url = `/api/master-inspection/config/${companyId}/${vehicleType}${queryString ? `?${queryString}` : ""
      }`;

    return apiClient.get(url);
  },

  getActiveConfigurations: (companyId: string, vehicleType: string) =>
    apiClient.get(
      `/api/master-inspection/active-configs/${companyId}/${vehicleType}`
    ),

  getVehicleInspectionData: (
    companyId: string,
    vehicleStockId: string,
    vehicleType: string
  ) =>
    apiClient.get(
      `/api/master-inspection/view/${companyId}/${vehicleStockId}/${vehicleType}`
    ),

  saveInspectionData: (
    companyId: string,
    vehicleStockId: string,
    vehicleType: string,
    data: any
  ) =>
    apiClient.post(
      `/api/master-inspection/save/${companyId}/${vehicleStockId}/${vehicleType}`,
      data
    ),
};

// Add these to your services.ts file in the logServices section
export const logServices = {
  // Get logs with optimized parameters and caching
  getLogs: (queryString: string) =>
    apiClient.get(`/api/logs?${queryString}`, {
      timeout: 30000, // 30 second timeout
    }),

  getDailyAnalytics: (queryString: string) =>
    apiClient.get(`/api/logs/analytics/daily?${queryString}`, {
      timeout: 15000, // 15 second timeout for daily analytics
    }),

  // Cached user and company lookups
  getLogUsers: (params?: any) =>
    apiClient.get("/api/logs/users", {
      params,
      timeout: 10000,
    }),

  getLogCompanies: (params?: any) =>
    apiClient.get("/api/logs/companies", {
      params,
      timeout: 10000,
    }),

  // Export with longer timeout and blob response
  exportLogs: (queryString: string) =>
    apiClient.get(`/api/logs/export?${queryString}`, {
      responseType: "blob",
      timeout: 300000, // 5 minute timeout for exports
      headers: {
        Accept: "text/csv",
      },
    }),

  // Get single log by ID
  getLogById: (id: string) =>
    apiClient.get(`/api/logs/${id}`, {
      timeout: 10000,
    }),
};

// Master Vehicle Services
export const masterVehicleServices = {
  getMasterVehicles: (params?: any) =>
    apiClient.get("/api/mastervehicle", { params }),

  getMasterVehicle: (id: string) => apiClient.get(`/api/mastervehicle/${id}`),

  createMasterVehicle: (data: any) =>
    apiClient.post("/api/mastervehicle", data),

  updateMasterVehicle: (id: string, data: any) =>
    apiClient.put(`/api/mastervehicle/${id}`, data),

  deleteMasterVehicle: (id: string) =>
    apiClient.delete(`/api/mastervehicle/${id}`),

  // Soft delete master vehicle (set isActive = false)
  softDeleteMasterVehicle: (id: string) => {
    console.log("Making master vehicle soft delete API call:", `/api/mastervehicle/${id}/soft-delete`);
    return apiClient.patch(`/api/mastervehicle/${id}/soft-delete`);
  },

  // Restore master vehicle (set isActive = true)
  restoreMasterVehicle: (id: string) => {
    console.log("Making master vehicle restore API call:", `/api/mastervehicle/${id}/restore`);
    return apiClient.patch(`/api/mastervehicle/${id}/restore`);
  },

  // Master vehicle attachment methods
  getVehicleAttachments: (vehicleId: string) =>
    apiClient.get(`/api/mastervehicle/${vehicleId}/attachments`),

  uploadVehicleAttachment: (vehicleId: string, data: any) =>
    apiClient.post(`/api/mastervehicle/${vehicleId}/attachments`, data),

  deleteVehicleAttachment: (vehicleId: string, attachmentId: string, data?: any) =>
    apiClient.delete(`/api/mastervehicle/${vehicleId}/attachments/${attachmentId}`, { data }),
};

// Ad Publishing Services
export const adPublishingServices = {
  getAdVehicles: (params?: any) =>
    apiClient.get("/api/adpublishing", { params }),

  getAdVehicle: (id: string) => apiClient.get(`/api/adpublishing/${id}`),

  createAdVehicle: (data: any) => apiClient.post("/api/adpublishing", data),

  updateAdVehicle: (id: string, data: any) =>
    apiClient.put(`/api/adpublishing/${id}`, data),

  deleteAdVehicle: (id: string) => apiClient.delete(`/api/adpublishing/${id}`),

  // Soft delete advertisement vehicle (set isActive = false)
  softDeleteAdVehicle: (id: string) => {
    console.log("Making advertisement vehicle soft delete API call:", `/api/adpublishing/${id}/soft-delete`);
    return apiClient.patch(`/api/adpublishing/${id}/soft-delete`);
  },

  // Restore advertisement vehicle (set isActive = true)
  restoreAdVehicle: (id: string) => {
    console.log("Making advertisement vehicle restore API call:", `/api/adpublishing/${id}/restore`);
    return apiClient.patch(`/api/adpublishing/${id}/restore`);
  },

  publishAdVehicle: (id: string) =>
    apiClient.post(`/api/adpublishing/${id}/publish`),

  // Advertisement vehicle attachment methods
  getVehicleAttachments: (vehicleId: string) =>
    apiClient.get(`/api/adpublishing/${vehicleId}/attachments`),

  uploadVehicleAttachment: (vehicleId: string, data: any) =>
    apiClient.post(`/api/adpublishing/${vehicleId}/attachments`, data),

  deleteVehicleAttachment: (vehicleId: string, attachmentId: string, data?: any) =>
    apiClient.delete(`/api/adpublishing/${vehicleId}/attachments/${attachmentId}`, { data }),
};


// Common Vehicle Services
export const commonVehicleServices = {
  updateVehicleDealership: (data: any) =>
    apiClient.put("/api/common-vehicle/update-dealership", data),

  getVehiclesForBulkOperations: (params?: any) =>
    apiClient.get("/api/common-vehicle/bulk-operations", { params }),

  getPricingReadyVehicles: (params?: any) =>
    apiClient.get("/api/common-vehicle/pricing-ready", { params }),

  togglePricingReady: (vehicleId: string, data: any) =>
    apiClient.patch(`/api/common-vehicle/pricing-ready/${vehicleId}`, data),

  saveVehicleCostDetails: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/common-vehicle/${vehicleId}/${vehicleType}/cost-details`, data),

  updateVehiclePricing: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/common-vehicle/${vehicleId}/${vehicleType}/pricing`, data),

  // Pricing attachment functions
  getPricingVehicleAttachments: (vehicleId: string, vehicleType: string) =>
    apiClient.get(`/api/common-vehicle/${vehicleId}/${vehicleType}/attachments`),

  uploadPricingVehicleAttachment: (vehicleId: string, vehicleType: string, data: any) =>
    apiClient.post(`/api/common-vehicle/${vehicleId}/${vehicleType}/attachments`, data),

  deletePricingVehicleAttachment: (vehicleId: string, vehicleType: string, attachmentId: string, data?: any) =>
    apiClient.delete(`/api/common-vehicle/${vehicleId}/${vehicleType}/attachments/${attachmentId}`, { data }),
};

// Integration Services
export const integrationServices = {
  getIntegrations: (params?: any) =>
    apiClient.get("/api/integrations", { params }),

  getIntegration: (id: string) =>
    apiClient.get(`/api/integrations/${id}`),

  createIntegration: (data: any) =>
    apiClient.post("/api/integrations", data),

  updateIntegration: (id: string, data: any) =>
    apiClient.put(`/api/integrations/${id}`, data),

  deleteIntegration: (id: string) =>
    apiClient.delete(`/api/integrations/${id}`),

  toggleIntegrationStatus: (id: string, data: any) =>
    apiClient.patch(`/api/integrations/${id}/status`, data),
};

// Dashboard Report Services
export const dashboardReportServices = {
  getVehiclesByStatus: (params?: any) =>
    apiClient.get("/api/dashboard-report/vehicles-by-status", { params }),

  getWorkshopQuotesByStatus: (params?: any) =>
    apiClient.get("/api/dashboard-report/workshop-quotes-by-status", { params }),

  getLicenseExpiryTracking: (params?: any) =>
    apiClient.get("/api/dashboard-report/license-expiry", { params }),

  getReportCompletion: (params?: any) =>
    apiClient.get("/api/dashboard-report/report-completion", { params }),

  getWorkshopProgress: (params?: any) =>
    apiClient.get("/api/dashboard-report/workshop-progress", { params }),

  getCostAnalysis: (params?: any) =>
    apiClient.get("/api/dashboard-report/cost-analysis", { params }),

  getSupplierPerformance: (params?: any) =>
    apiClient.get("/api/dashboard-report/supplier-performance", { params }),

  getTimelineAnalysis: (params?: any) =>
    apiClient.get("/api/dashboard-report/timeline-analysis", { params }),

  getQualityMetrics: (params?: any) =>
    apiClient.get("/api/dashboard-report/quality-metrics", { params }),

  getWorkloadDistribution: (params?: any) =>
    apiClient.get("/api/dashboard-report/workload-distribution", { params }),

  getCompletionRateAnalysis: (params?: any) =>
    apiClient.get("/api/dashboard-report/completion-rate", { params }),

  getWorkshopReportsSummary: (params?: any) =>
    apiClient.get("/api/dashboard-report/workshop-reports-summary", { params }),

  getVehicleRecords: (data: any) =>
    apiClient.post("/api/dashboard-report/vehicle-records", data),
};

// Advanced Dashboard Analytics Services
export const dashboardAnalyticsServices = {
  // Vehicle Reports (12 endpoints)
  getVehicleOverviewByType: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/overview-by-type", { params }),

  getVehiclePricingAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/pricing-analysis", { params }),

  getVehicleStatusDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/status-distribution", { params }),

  getVehicleWorkshopIntegration: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/workshop-integration", { params }),

  getVehicleAttachmentAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/attachment-analysis", { params }),

  getVehicleRegistrationCompliance: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/registration-compliance", { params }),

  getVehicleImportTimeline: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/import-timeline", { params }),

  getVehicleEngineSpecifications: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/engine-specifications", { params }),

  getVehicleOdometerTrends: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/odometer-trends", { params }),

  getVehicleOwnershipHistory: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/ownership-history", { params }),

  getVehicleQueueProcessing: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/queue-processing", { params }),

  getVehicleCostDetails: (params?: any) =>
    apiClient.get("/api/company/reports/vehicle/cost-details", { params }),

  // WorkshopQuote Reports (12 endpoints)
  getQuoteOverviewByStatus: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/overview-by-status", { params }),

  getQuoteLifecycleAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/lifecycle-analysis", { params }),

  getQuoteSupplierPerformance: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/supplier-performance", { params }),

  getQuoteCostAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/cost-analysis", { params }),

  getQuoteApprovalRates: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/approval-rates", { params }),

  getQuoteResponseTimeAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/response-time-analysis", { params }),

  getQuoteTypeDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/type-distribution", { params }),

  getQuoteBayBookingAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/bay-booking-analysis", { params }),

  getQuoteWorkEntryAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/work-entry-analysis", { params }),

  getQuoteInvoiceAccuracy: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/invoice-accuracy", { params }),

  getQuoteReworkPatterns: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/rework-patterns", { params }),

  getQuoteConversationMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-quote/conversation-metrics", { params }),

  // WorkshopReport Reports (8 endpoints)
  getWorkshopReportOverview: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/overview", { params }),

  getWorkshopCostBreakdown: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/cost-breakdown", { params }),

  getWorkshopQualityMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/quality-metrics", { params }),

  getWorkshopTechnicianPerformance: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/technician-performance", { params }),

  getWorkshopSupplierScorecard: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/supplier-scorecard", { params }),

  getWorkshopWarrantyTracking: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/warranty-tracking", { params }),

  getWorkshopCompletionTimeAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/completion-time-analysis", { params }),

  getWorkshopRevenueAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/workshop-report/revenue-analysis", { params }),

  // Dealership Reports (6 endpoints)
  getDealershipOverview: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/overview", { params }),

  getDealershipVehicleDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/vehicle-distribution", { params }),

  getDealershipWorkshopPerformance: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/workshop-performance", { params }),

  getDealershipUserActivity: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/user-activity", { params }),

  getDealershipRevenueComparison: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/revenue-comparison", { params }),

  getDealershipServiceBayUtilization: (params?: any) =>
    apiClient.get("/api/company/reports/dealership/service-bay-utilization", { params }),

  // User Reports (5 endpoints)
  getUserPerformanceMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/user/performance-metrics", { params }),

  getUserLoginPatterns: (params?: any) =>
    apiClient.get("/api/company/reports/user/login-patterns", { params }),

  getUserRoleDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/user/role-distribution", { params }),

  getUserDealershipAssignment: (params?: any) =>
    apiClient.get("/api/company/reports/user/dealership-assignment", { params }),

  getUserPermissionUtilization: (params?: any) =>
    apiClient.get("/api/company/reports/user/permission-utilization", { params }),

  // Supplier Reports (4 endpoints)
  getSupplierOverview: (params?: any) =>
    apiClient.get("/api/company/reports/supplier/overview", { params }),

  getSupplierPerformanceRanking: (params?: any) =>
    apiClient.get("/api/company/reports/supplier/performance-ranking", { params }),

  getSupplierTagAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/supplier/tag-analysis", { params }),

  getSupplierRelationshipMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/supplier/relationship-metrics", { params }),

  // ServiceBay Reports (4 endpoints)
  getServiceBayUtilization: (params?: any) =>
    apiClient.get("/api/company/reports/service-bay/utilization", { params }),

  getServiceBayBookingPatterns: (params?: any) =>
    apiClient.get("/api/company/reports/service-bay/booking-patterns", { params }),

  getServiceBayUserAssignment: (params?: any) =>
    apiClient.get("/api/company/reports/service-bay/user-assignment", { params }),

  getServiceBayHolidayImpact: (params?: any) =>
    apiClient.get("/api/company/reports/service-bay/holiday-impact", { params }),

  // Conversation Reports (3 endpoints)
  getConversationVolumeAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/conversation/volume-analysis", { params }),

  getConversationResponseTimes: (params?: any) =>
    apiClient.get("/api/company/reports/conversation/response-times", { params }),

  getConversationEngagementMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/conversation/engagement-metrics", { params }),

  // CostConfiguration Reports (3 endpoints)
  getCostTypeUtilization: (params?: any) =>
    apiClient.get("/api/company/reports/cost-configuration/type-utilization", { params }),

  getCostSetterEffectiveness: (params?: any) =>
    apiClient.get("/api/company/reports/cost-configuration/setter-effectiveness", { params }),

  getCostCurrencyDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/cost-configuration/currency-distribution", { params }),

  // DropdownMaster Reports (3 endpoints)
  getDropdownUsageAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/dropdown-master/usage-analysis", { params }),

  getDropdownValueDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/dropdown-master/value-distribution", { params }),

  getDropdownConfigurationHealth: (params?: any) =>
    apiClient.get("/api/company/reports/dropdown-master/configuration-health", { params }),

  // InspectionConfig Reports (3 endpoints)
  getInspectionConfigUsage: (params?: any) =>
    apiClient.get("/api/company/reports/inspection-config/usage", { params }),

  getInspectionFieldAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/inspection-config/field-analysis", { params }),

  getInspectionCategoryEffectiveness: (params?: any) =>
    apiClient.get("/api/company/reports/inspection-config/category-effectiveness", { params }),

  // TradeinConfig Reports (3 endpoints)
  getTradeinConfigUsage: (params?: any) =>
    apiClient.get("/api/company/reports/tradein-config/usage", { params }),

  getTradeinFieldAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/tradein-config/field-analysis", { params }),

  getTradeinCategoryEffectiveness: (params?: any) =>
    apiClient.get("/api/company/reports/tradein-config/category-effectiveness", { params }),

  // Integration Reports (3 endpoints)
  getIntegrationStatusOverview: (params?: any) =>
    apiClient.get("/api/company/reports/integration/status-overview", { params }),

  getIntegrationEnvironmentUsage: (params?: any) =>
    apiClient.get("/api/company/reports/integration/environment-usage", { params }),

  getIntegrationTypeDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/integration/type-distribution", { params }),

  // NotificationConfiguration Reports (3 endpoints)
  getNotificationEngagementMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/notification-config/engagement-metrics", { params }),

  getNotificationTriggerAnalysis: (params?: any) =>
    apiClient.get("/api/company/reports/notification-config/trigger-analysis", { params }),

  getNotificationChannelPerformance: (params?: any) =>
    apiClient.get("/api/company/reports/notification-config/channel-performance", { params }),

  // GroupPermission Reports (2 endpoints)
  getGroupPermissionUsage: (params?: any) =>
    apiClient.get("/api/company/reports/group-permission/usage", { params }),

  getGroupPermissionEffectiveness: (params?: any) =>
    apiClient.get("/api/company/reports/group-permission/effectiveness", { params }),

  // Workflow Reports (3 endpoints)
  getWorkflowExecutionMetrics: (params?: any) =>
    apiClient.get("/api/company/reports/workflow/execution-metrics", { params }),

  getWorkflowTypeDistribution: (params?: any) =>
    apiClient.get("/api/company/reports/workflow/type-distribution", { params }),

  getWorkflowSuccessRates: (params?: any) =>
    apiClient.get("/api/company/reports/workflow/success-rates", { params }),

  // Export functionality
  exportReport: (reportType: string, format: 'csv' | 'pdf' | 'excel', params?: any) =>
    apiClient.get(`/api/company/reports/export/${reportType}`, {
      params: { ...params, format },
      responseType: 'blob',
      timeout: 300000, // 5 minute timeout for exports
    }),
};

// Tender Module Services
export const tenderDealershipService = {
  // Get all tender dealerships with pagination and search
  getTenderDealerships: (params?: any) =>
    apiClient.get("/api/tender-dealership", { params }),

  // Get single tender dealership by ID
  getTenderDealership: (id: string) =>
    apiClient.get(`/api/tender-dealership/${id}`),

  // Create new tender dealership
  createTenderDealership: (data: any) =>
    apiClient.post("/api/tender-dealership", data),

  // Update tender dealership
  updateTenderDealership: (id: string, data: any) =>
    apiClient.put(`/api/tender-dealership/${id}`, data),

  // Delete tender dealership (permanent)
  deleteTenderDealership: (id: string) =>
    apiClient.delete(`/api/tender-dealership/${id}`),

  // Toggle tender dealership active status
  toggleTenderDealershipStatus: (id: string, data: any) =>
    apiClient.patch(`/api/tender-dealership/${id}/status`, data),

  // Get users for a specific tender dealership
  getTenderDealershipUsers: (id: string, params?: any) =>
    apiClient.get(`/api/tender-dealership/${id}/users`, { params }),
};

export const tenderDealershipUserService = {
  // Get all tender dealership users (filtered by dealership)
  getTenderDealershipUsers: (params?: any) =>
    apiClient.get("/api/tender-dealership-user", { params }),

  // Get single tender dealership user by ID
  getTenderDealershipUser: (id: string) =>
    apiClient.get(`/api/tender-dealership-user/${id}`),

  // Create new tender dealership user
  createTenderDealershipUser: (data: any) =>
    apiClient.post("/api/tender-dealership-user", data),

  // Update tender dealership user
  updateTenderDealershipUser: (id: string, data: any) =>
    apiClient.put(`/api/tender-dealership-user/${id}`, data),

  // Delete tender dealership user (permanent)
  deleteTenderDealershipUser: (id: string) =>
    apiClient.delete(`/api/tender-dealership-user/${id}`),

  // Toggle tender dealership user active status
  toggleTenderDealershipUserStatus: (id: string, data: any) =>
    apiClient.patch(`/api/tender-dealership-user/${id}/status`, data),
};

export const tenderService = {
  // Get all tenders with pagination, search, and filters
  getTenders: (params?: any) =>
    apiClient.get("/api/tender", { params }),

  // Get single tender by ID
  getTender: (id: string) =>
    apiClient.get(`/api/tender/${id}`),

  // Create new tender
  createTender: (data: any) =>
    apiClient.post("/api/tender", data),

  // Update tender
  updateTender: (id: string, data: any) =>
    apiClient.put(`/api/tender/${id}`, data),

  // Delete tender (permanent)
  deleteTender: (id: string) =>
    apiClient.delete(`/api/tender/${id}`),

  // Toggle tender active status
  toggleTenderStatus: (id: string, data: any) =>
    apiClient.patch(`/api/tender/${id}/status`, data),

  // Send tender to selected dealerships
  sendTender: (id: string, data: any) =>
    apiClient.post(`/api/tender/${id}/send`, data),

  // Get dealerships that received the tender
  getTenderRecipients: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/recipients`, { params }),

  // Get dealership status summary for a tender
  getTenderDealershipStatusSummary: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/dealership-status-summary`, { params }),

  // Get complete dealership quote details (sent + alternate vehicles)
  getDealershipQuoteDetails: (tenderId: string, dealershipId: string) =>
    apiClient.get(`/api/tender/${tenderId}/dealership-quote/${dealershipId}`),

  // Get available dealerships for sending tender
  getAvailableDealerships: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/available-dealerships`, { params }),

  // Get tender history
  getTenderHistory: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/history`, { params }),

  // Approve a quote
  approveQuote: (id: string, data: any) =>
    apiClient.post(`/api/tender/${id}/approve-quote`, data, {
      timeout: 60000, // 60 seconds timeout for approve quote (sends emails to multiple dealerships)
    }),

  // Close tender
  closeTender: (id: string, data?: any) =>
    apiClient.post(`/api/tender/${id}/close`, data),
};

export const tenderDealershipAuthService = {
  // Login with email, password, company_id, dealership_id
  login: (data: {
    email: string;
    password: string;
    company_id: string;
    dealership_id: string;
  }) => apiClient.post("/api/tender-dealership-auth/login", data),

  // Get dealership user profile
  getProfile: () =>
    apiClient.get("/api/tender-dealership-auth/profile"),

  // Update dealership user profile
  updateProfile: (data: any) =>
    apiClient.put("/api/tender-dealership-auth/profile", data),

  // Change password
  changePassword: (data: any) =>
    apiClient.post("/api/tender-dealership-auth/change-password", data),

  // Get tenders for dealership
  getTenders: (params?: any) =>
    apiClient.get("/api/tender-dealership-auth/tenders", { params }),

  // Get tender details by ID
  getTender: (id: string) =>
    apiClient.get(`/api/tender-dealership-auth/tenders/${id}`),

  // Submit or update quote (with extended timeout for email processing)
  submitQuote: (id: string, data: any) =>
    apiClient.post(`/api/tender-dealership-auth/tenders/${id}/quote`, data, {
      timeout: 60000, // 60 seconds to allow for email sending to multiple admins
    }),

  // Withdraw quote
  withdrawQuote: (id: string, data?: any) =>
    apiClient.post(`/api/tender-dealership-auth/tenders/${id}/withdraw`, data),

  // Get quotes by status
  getQuotesByStatus: (params?: any) =>
    apiClient.get("/api/tender-dealership-auth/quotes", { params }),

  // Get expiring soon quotes (within 7 days)
  getExpiringQuotes: (params?: any) =>
    apiClient.get("/api/tender-dealership-auth/quotes/expiring-soon", { params }),

  // Get orders by status
  getOrdersByStatus: (params?: any) =>
    apiClient.get("/api/tender-dealership-auth/orders", { params }),

  // Accept order
  acceptOrder: (id: string, data?: any) =>
    apiClient.post(`/api/tender-dealership-auth/orders/${id}/accept`, data),

  // Mark order as delivered
  deliverOrder: (id: string, data?: any) =>
    apiClient.post(`/api/tender-dealership-auth/orders/${id}/deliver`, data),
};

export const tenderConversationService = {
  // Get conversation messages for a tender-dealership pair
  getConversation: (tenderId: string, dealershipId: string, params?: any) =>
    apiClient.get(`/api/tender-conversation/${tenderId}/${dealershipId}`, { params }),

  // Send message in conversation
  sendMessage: (tenderId: string, dealershipId: string, data: any) =>
    apiClient.post(`/api/tender-conversation/${tenderId}/${dealershipId}`, data),

  // Mark messages as read
  markAsRead: (tenderId: string, dealershipId: string, data?: any) =>
    apiClient.patch(`/api/tender-conversation/${tenderId}/${dealershipId}/read`, data),
};

// E-Sign Services
export const esignServices = {
  // Provider Configuration
  getProviders: (params?: any) =>
    apiClient.get("/api/company/esign/settings/providers", { params }),
  
  getProvider: (id: string) =>
    apiClient.get(`/api/company/esign/settings/providers/${id}`),
  
  createProvider: (data: any) =>
    apiClient.post("/api/company/esign/settings/providers", data),
  
  updateProvider: (id: string, data: any) =>
    apiClient.put(`/api/company/esign/settings/providers/${id}`, data),
  
  deleteProvider: (id: string) =>
    apiClient.delete(`/api/company/esign/settings/providers/${id}`),
  
  testProvider: (id: string, data?: any) =>
    apiClient.post(`/api/company/esign/settings/providers/${id}/test`, data),
  
  // API Key Management
  getAPIKeys: (params?: any) =>
    apiClient.get("/api/company/esign/settings/api-keys", { params }),
  
  generateAPIKey: (data: any) =>
    apiClient.post("/api/company/esign/settings/api-keys", data),
  
  revokeAPIKey: (id: string, data?: any) =>
    apiClient.delete(`/api/company/esign/settings/api-keys/${id}`, { data }),
  
  // Template Management
  getTemplates: (params?: any) =>
    apiClient.get("/api/company/esign/templates", { params }),
  
  getTemplate: (id: string) =>
    apiClient.get(`/api/company/esign/templates/${id}`),
  
  createTemplate: (data: any) =>
    apiClient.post("/api/company/esign/templates", data),
  
  updateTemplate: (id: string, data: any) =>
    apiClient.put(`/api/company/esign/templates/${id}`, data),
  
  deleteTemplate: (id: string) =>
    apiClient.delete(`/api/company/esign/templates/${id}`),
  
  duplicateTemplate: (id: string) =>
    apiClient.post(`/api/company/esign/templates/${id}/duplicate`),
  
  activateTemplate: (id: string) =>
    apiClient.post(`/api/company/esign/templates/${id}/activate`),
  
  uploadPDF: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return apiClient.post(`/api/company/esign/templates/${id}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  extractDelimiters: (id: string) =>
    apiClient.post(`/api/company/esign/templates/${id}/extract-delimiters`),
  
  previewTemplate: (id: string, sampleValues?: Record<string, any>) =>
    apiClient.get(`/api/company/esign/templates/${id}/preview`, {
      params: sampleValues ? { sample_values: JSON.stringify(sampleValues) } : {}
    }),
  
  getTemplateSchema: (id: string) =>
    apiClient.get(`/api/company/esign/templates/${id}/schema`),
};

export default {
  auth: authServices,
  subscription: subscriptionServices,
  master: masterServices,
  company: companyServices,
  dealership: dealershipServices,
  dropdown: dropdownServices,
  masterDropdown: masterDropdownServices,
  config: configServices,
  vehicle: vehicleServices,
  inspection: inspectionServices,
  tradein: tradeinServices,
  logs: logServices,
  supplier: supplierServices,
  workshop: workshopServices,
  supplierAuth: supplierAuthServices,
  supplierDashboard: supplierDashboardServices,
  masterInspectionServices: masterInspectionServices,
  masterVehicle: masterVehicleServices,
  adPublishing: adPublishingServices,
  commonVehicle: commonVehicleServices,
  serviceBayServices: serviceBayServices,
  bayQuoteServices: bayQuoteServices,
  dashboardReportServices: dashboardReportServices,
  dashboardAnalytics: dashboardAnalyticsServices,
  tenderDealershipService: tenderDealershipService,
  tenderDealershipUserService: tenderDealershipUserService,
  tenderService: tenderService,
  tenderDealershipAuthService: tenderDealershipAuthService,
  tenderConversationService: tenderConversationService,
};


