import apiClient from "@/api/axios";

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
    apiClient.patch(`/api/tender-dealership/${id}/toggle`, data),

  // Get users for a specific tender dealership
  getTenderDealershipUsers: (id: string, params?: any) =>
    apiClient.get(`/api/tender-dealership/${id}/users`, { params }),
};
