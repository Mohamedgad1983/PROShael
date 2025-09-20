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