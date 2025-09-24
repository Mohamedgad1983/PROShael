import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  family_id: string;
}

export interface AuthResponse {
  status: string;
  message_ar: string;
  message_en: string;
  data?: {
    token: string;
    refresh_token: string;
    user: User;
    expires_in: number;
  };
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = Cookies.get('auth_token') || null;
    const userData = Cookies.get('user_data');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.logout();
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      const authData = response.data;

      if (authData.status === 'success' && authData.data) {
        this.token = authData.data.token;
        this.user = authData.data.user;

        // Store in cookies
        if (this.token) {
          Cookies.set('auth_token', this.token, { expires: 7 });
        }
        if (this.user) {
          Cookies.set('user_data', JSON.stringify(this.user), { expires: 7 });
        }

        // Set default auth header
        this.setAuthHeader();
      }

      return authData;
    } catch (error: any) {
      throw {
        status: 'error',
        message_ar: 'خطأ في تسجيل الدخول',
        message_en: 'Login error',
        error: error.response?.data || error.message
      };
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    Cookies.remove('auth_token');
    Cookies.remove('user_data');
    delete axios.defaults.headers.common['Authorization'];
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  hasRole(requiredRole: string): boolean {
    if (!this.user) return false;

    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'financial_manager': 2,
      'organizer': 1,
      'member': 0
    };

    const userLevel = roleHierarchy[this.user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  private setAuthHeader(): void {
    if (this.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }
  }

  // Initialize auth header on service creation
  init(): void {
    this.setAuthHeader();
  }
}

export const authService = new AuthService();
authService.init();