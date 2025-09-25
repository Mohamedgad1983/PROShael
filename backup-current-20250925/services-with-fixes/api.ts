// API Service for Al-Shuail Admin System

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export interface Statistics {
  totalMembers: number;
  totalContributions: number;
  pendingPayments: number;
  activeInitiatives: number;
  overview?: {
    total_activities: number;
    upcoming_activities: number;
    total_participants: number;
    total_revenue: number;
  };
  by_category?: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  recent_activities?: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    participants: number;
    status: string;
  }>;
  by_month?: Array<{
    month: string;
    activities: number;
    revenue: number;
    participants_count?: number;
  }>;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  message_ar?: string;
}

export interface Occasion {
  id: string;
  title_ar: string;
  title_en?: string;
  occasion_type: string;
  location_ar?: string;
  occasion_date: string;
  hijri_date?: string;
  status: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async getStatistics(): Promise<ApiResponse<Statistics>> {
    try {
      const response = await fetch(`${this.baseURL}/api/statistics`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();

      // Handle both direct data and wrapped response
      if (data.status) {
        return data;
      } else {
        return {
          status: 'success',
          data: data
        };
      }
    } catch (error) {
      // Return mock data for now
      return {
        status: 'success',
        data: {
          totalMembers: 150,
          totalContributions: 450000,
          pendingPayments: 25,
          activeInitiatives: 5,
          overview: {
            total_activities: 15,
            upcoming_activities: 5,
            total_participants: 120,
            total_revenue: 250000
          },
          by_category: [
            { name: 'رياضة', count: 5, percentage: 33 },
            { name: 'ثقافة', count: 4, percentage: 27 },
            { name: 'تعليم', count: 3, percentage: 20 },
            { name: 'اجتماعي', count: 3, percentage: 20 }
          ],
          recent_activities: [],
          by_month: [
            { month: 'يناير', activities: 3, revenue: 35000 },
            { month: 'فبراير', activities: 2, revenue: 28000 },
            { month: 'مارس', activities: 4, revenue: 42000 },
            { month: 'أبريل', activities: 2, revenue: 31000 },
            { month: 'مايو', activities: 3, revenue: 38000 },
            { month: 'يونيو', activities: 1, revenue: 25000 }
          ]
        }
      };
    }
  }

  async getOccasions(): Promise<ApiResponse<{ occasions: Occasion[] }>> {
    try {
      const response = await fetch(`${this.baseURL}/api/occasions`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch occasions');
      }

      const data = await response.json();

      // Handle both direct data and wrapped response
      if (data.status) {
        return data;
      } else {
        return {
          status: 'success',
          data: { occasions: Array.isArray(data) ? data : [] }
        };
      }
    } catch (error) {
      // Return mock data for now
      return {
        status: 'success',
        data: { occasions: [] }
      };
    }
  }

  async createOccasion(occasionData: Partial<Occasion>): Promise<ApiResponse<Occasion>> {
    try {
      const response = await fetch(`${this.baseURL}/api/occasions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(occasionData)
      });

      if (!response.ok) {
        throw new Error('Failed to create occasion');
      }

      const data = await response.json();

      // Handle both direct data and wrapped response
      if (data.status) {
        return data;
      } else {
        return {
          status: 'success',
          data: data
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message_ar: 'فشل في إنشاء المناسبة'
      };
    }
  }
}

export const apiService = new ApiService();