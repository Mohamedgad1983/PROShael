<<<<<<< HEAD
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
=======
// API Service for Al-Shuail Admin Dashboard
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors and token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshAuthToken(refreshToken);
              const newToken = response.data.accessToken;
              
              localStorage.setItem('token', newToken);
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async refreshAuthToken(refreshToken: string) {
    return await this.api.post('/auth/refresh', { refreshToken });
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return response.data;
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await this.api.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await this.api.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await this.api.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await this.api.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await this.api.delete(url, config);
  }

  // File upload with progress
  async uploadFile(
    url: string,
    file: File,
    onProgress?: (progressEvent: any) => void
  ) {
    const formData = new FormData();
    formData.append('file', file);

    return await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  }

  // Members API
  async getMembers(filters?: any, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return await this.get(`/members?${params}`);
  }

  async getMember(id: string) {
    return await this.get(`/members/${id}`);
  }

  async createMember(memberData: any) {
    return await this.post('/members', memberData);
  }

  async updateMember(id: string, memberData: any) {
    return await this.put(`/members/${id}`, memberData);
  }

  async deleteMember(id: string) {
    return await this.delete(`/members/${id}`);
  }

  async getMemberStatistics() {
    return await this.get('/members/statistics');
  }

  // Payments API
  async getPayments(filters?: any, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return await this.get(`/payments?${params}`);
  }

  async createPayment(paymentData: any) {
    return await this.post('/payments', paymentData);
  }

  async getPaymentStatistics() {
    return await this.get('/payments/statistics');
  }

  // Registration tokens
  async generateRegistrationToken(memberData: any) {
    return await this.post('/registration/generate-token', memberData);
  }

  async validateRegistrationToken(token: string) {
    return await this.get(`/registration/validate-token/${token}`);
  }

  async completeRegistration(token: string, registrationData: any) {
    return await this.post(`/registration/complete/${token}`, registrationData);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
>>>>>>> a5fb1535e6a5072e663226a993218935989cb409
