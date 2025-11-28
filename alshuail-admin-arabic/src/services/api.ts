import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://api.alshailfund.com/api');

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message_ar: string;
  message_en: string;
  data?: T;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface Activity {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  category_id: string;
  category_name_ar: string;
  organizer_id: string;
  event_date: string;
  location_ar: string;
  location_en: string;
  max_participants: number;
  current_participants: number;
  cost: number;
  is_featured: boolean;
  status: string;
  created_at: string;
}

export interface Statistics {
  overview: {
    total_activities: number;
    upcoming_activities: number;
    completed_activities: number;
    cancelled_activities: number;
    total_participants: number;
    total_revenue: number;
  };
  by_category: Array<{
    category_name_ar: string;
    category_name_en: string;
    count: number;
    percentage: number;
  }>;
  by_month: Array<{
    month: string;
    activities_count: number;
    participants_count: number;
  }>;
}

class ApiService {
  // Dashboard & Statistics
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    const response = await axios.get(`${API_BASE_URL}/api/activities/statistics`);
    return response.data;
  }

  // Activities
  async getActivities(params?: {
    category?: string;
    type?: string;
    is_featured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ activities: Activity[] }>> {
    const response = await axios.get(`${API_BASE_URL}/api/activities`, { params });
    return response.data;
  }

  async getActivity(id: string): Promise<ApiResponse<{ activity: Activity }>> {
    const response = await axios.get(`${API_BASE_URL}/api/activities/${id}`);
    return response.data;
  }

  async createActivity(activity: Partial<Activity>): Promise<ApiResponse<{ activity: Activity }>> {
    const response = await axios.post(`${API_BASE_URL}/api/activities`, activity);
    return response.data;
  }

  async updateActivity(id: string, activity: Partial<Activity>): Promise<ApiResponse<{ activity: Activity }>> {
    const response = await axios.put(`${API_BASE_URL}/api/activities/${id}`, activity);
    return response.data;
  }

  async deleteActivity(id: string): Promise<ApiResponse> {
    const response = await axios.delete(`${API_BASE_URL}/api/activities/${id}`);
    return response.data;
  }

  // Search
  async searchActivities(query: string, filters?: {
    category?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<{ search_results: Activity[] }>> {
    const params = { q: query, ...filters };
    const response = await axios.get(`${API_BASE_URL}/api/activities/search`, { params });
    return response.data;
  }

  // Featured Activities
  async getFeaturedActivities(limit?: number): Promise<ApiResponse<{ featured_activities: Activity[] }>> {
    const response = await axios.get(`${API_BASE_URL}/api/activities/featured`, {
      params: { limit }
    });
    return response.data;
  }

  // Occasions
  async getOccasions(params?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ occasions: any[] }>> {
    const response = await axios.get(`${API_BASE_URL}/api/occasions`, { params });
    return response.data;
  }

  async createOccasion(occasion: any): Promise<ApiResponse<{ occasion: any }>> {
    const response = await axios.post(`${API_BASE_URL}/api/occasions`, occasion);
    return response.data;
  }
}

export const apiService = new ApiService();