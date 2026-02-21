import apiClient from "@/api/axios";

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
