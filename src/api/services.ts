import apiClient from "./axios";

// Auth Services
export const authServices = {
  login: (email: string, password: string) =>
    apiClient.post("/api/auth/login", { email, password }),

  registerCompany: (data: any) =>
    apiClient.post("/api/auth/register-company", data),

  getMe: () => apiClient.get("/api/auth/me"),

  getCurrentUserPermissions: () => apiClient.get("/api/auth/me/permissions"),

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

  // Invoice Services
  getInvoices: (params = {}) => apiClient.get("/api/invoices", { params }),

  getInvoice: (invoiceId) => apiClient.get(`/api/invoices/${invoiceId}`),

  getInvoiceStats: () => apiClient.get("/api/invoices/stats"),

  updateInvoicePaymentStatus: (invoiceId, data) =>
    apiClient.patch(`/api/invoices/${invoiceId}/payment-status`, data),
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
  // Get all workflows
  getWorkflows: (params?: any) => apiClient.get("/api/workflows", { params }),

  // Get workflow by ID
  getWorkflow: (id: string) => apiClient.get(`/api/workflows/${id}`),

  // Create workflow
  createWorkflow: (data: any) => apiClient.post("/api/workflows", data),

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
  // Dashboard
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

  // ... keep existing code (users, permissions, settings)

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
  
  deleteCostType: (costTypeId: string) =>
    apiClient.delete(`/api/company/cost-configuration/cost-types/${costTypeId}`),
  
  reorderCostTypes: (data: any) =>
    apiClient.put("/api/company/cost-configuration/cost-types/reorder", data),
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

  // Category services
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

  addTradeinSection: (configId: string, data: any) =>
    apiClient.post(`/api/config/tradein/${configId}/sections`, data),

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

  updateTradeinSectionsOrder: (configId: string, data: any) =>
    apiClient.put(`/api/config/tradein/${configId}/sections/reorder`, data),

  updateTradeinFieldsOrder: (configId: string, sectionId: string, data: any) =>
    apiClient.put(
      `/api/config/tradein/${configId}/sections/${sectionId}/fields/reorder`,
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

  // Trade-in Calculation services
  addTradeinCalculation: async (configId: string, calculationData: any) => {
    return await apiClient.post(
      `/api/config/tradein/${configId}/calculations`,
      calculationData
    );
  },

  updateTradeinCalculationFormula: async (
    configId: string,
    calculationId: string,
    formula: any
  ) => {
    return await apiClient.put(
      `/api/config/tradein/${configId}/calculations/${calculationId}/formula`,
      { formula }
    );
  },

  deleteTradeinCalculation: async (configId: string, calculationId: string) => {
    return await apiClient.delete(
      `/api/config/tradein/${configId}/calculations/${calculationId}`
    );
  },

  toggleTradeinCalculationStatus: async (
    configId: string,
    calculationId: string,
    isActive: boolean
  ) => {
    return await apiClient.patch(
      `/api/config/tradein/${configId}/calculations/${calculationId}/toggle`,
      { is_active: isActive }
    );
  },
  saveTradeinConfig: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/config/tradein/${id}`, data);
    return response.data;
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

  createVehicleStock: (data: any) =>
    apiClient.post("/api/vehicle/create-stock", data),

  bulkImportVehicles: (data: any) =>
    apiClient.post("/api/vehicle/bulk-import", data),

  updateVehicle: (id: string, vehicleType: string, data: any) =>
    apiClient.put(`/api/vehicle/${id}/${vehicleType}`, data),

  deleteVehicle: (id: string) => apiClient.delete(`/api/vehicle/${id}`),

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

  updateVehicleSafetyFeatures: (
    vehicleId: string,
    vehicleType: string,
    data: any
  ) => apiClient.put(`/api/vehicle/${vehicleId}/${vehicleType}/safety`, data),

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
    attachmentId: string
  ) =>
    apiClient.delete(
      `/api/vehicle/${vehicleId}/${vehicleType}/attachments/${attachmentId}`
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
  login: (email: string, password: string) =>
    apiClient.post("/api/supplier-auth/login", { email, password }),

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
    const url = `/api/master-inspection/config/${companyId}/${vehicleType}${
      queryString ? `?${queryString}` : ""
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

  publishAdVehicle: (id: string) =>
    apiClient.post(`/api/adpublishing/${id}/publish`),
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
  commonVehicle:commonVehicleServices,
  serviceBayServices:serviceBayServices,
  bayQuoteServices:bayQuoteServices,
};
