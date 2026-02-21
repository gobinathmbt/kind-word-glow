import apiClient from "@/api/axios";

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
    apiClient.patch(`/api/tender-dealership-user/${id}/toggle`, data),

  // Reset tender dealership user password
  resetTenderDealershipUserPassword: (id: string) =>
    apiClient.post(`/api/tender-dealership-user/reset-password/${id}`),
};
