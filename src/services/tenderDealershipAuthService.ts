import apiClient from "@/api/axios";

export const tenderDealershipAuthService = {
  // Login with username, password, company_id, dealership_id
  login: (data: {
    username: string;
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

  // Submit or update quote
  submitQuote: (id: string, data: any) =>
    apiClient.post(`/api/tender-dealership-auth/tenders/${id}/quote`, data),

  // Withdraw quote
  withdrawQuote: (id: string, data?: any) =>
    apiClient.post(`/api/tender-dealership-auth/tenders/${id}/withdraw`, data),

  // Get quotes by status
  getQuotesByStatus: (params?: any) =>
    apiClient.get("/api/tender-dealership-auth/quotes", { params }),

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
