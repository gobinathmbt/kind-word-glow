import apiClient from "@/api/axios";

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
    apiClient.patch(`/api/tender/${id}/toggle`, data),

  // Send tender to selected dealerships
  sendTender: (id: string, data: any) =>
    apiClient.post(`/api/tender/${id}/send`, data),

  // Get dealerships that received the tender
  getTenderRecipients: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/recipients`, { params }),

  // Get available dealerships for sending tender
  getAvailableDealerships: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/available-dealerships`, { params }),

  // Get tender history
  getTenderHistory: (id: string, params?: any) =>
    apiClient.get(`/api/tender/${id}/history`, { params }),

  // Approve a quote
  approveQuote: (id: string, data: any) =>
    apiClient.post(`/api/tender/${id}/approve-quote`, data),

  // Close tender
  closeTender: (id: string, data?: any) =>
    apiClient.post(`/api/tender/${id}/close`, data),
};
