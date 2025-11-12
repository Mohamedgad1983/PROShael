/**
 * ProfileSettings Component Tests
 * Comprehensive test suite for avatar upload and profile management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import ProfileSettings from '../ProfileSettings';
import { useRole } from '../../../contexts/RoleContext';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../contexts/RoleContext');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedUseRole = useRole as jest.MockedFunction<typeof useRole>;

describe('ProfileSettings Component', () => {
  const mockUser = {
    id: 'user-123',
    name: 'أحمد محمد',
    email: 'ahmad@example.com',
    phone: '0501234567',
    role: 'super_admin',
    roleAr: 'المدير الأعلى'
  };

  const mockRefreshUserRole = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'mock-token');

    // Mock useRole hook
    mockedUseRole.mockReturnValue({
      user: mockUser,
      refreshUserRole: mockRefreshUserRole,
      hasRole: jest.fn(),
      loading: false
    });
  });

  // TEST 1: Component Renders Successfully
  describe('Component Rendering', () => {
    it('should render ProfileSettings component without errors', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            avatar_url: null
          }
        }
      });

      render(<ProfileSettings />);

      expect(screen.getByText('الملف الشخصي')).toBeInTheDocument();
      expect(screen.getByText('الصورة الشخصية')).toBeInTheDocument();
    });

    it('should display user information fields', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('أحمد محمد')).toBeInTheDocument();
        expect(screen.getByDisplayValue('ahmad@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('0501234567')).toBeInTheDocument();
        expect(screen.getByDisplayValue('المدير الأعلى')).toBeInTheDocument();
      });
    });
  });

  // TEST 2: Profile Data Fetching
  describe('Profile Data Fetching', () => {
    it('should fetch user profile on component mount', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/user/profile'),
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer mock-token' }
          })
        );
      });
    });

    it('should handle profile fetch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      render(<ProfileSettings />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  // TEST 3: Avatar Display Logic
  describe('Avatar Display', () => {
    it('should display avatar image when URL exists', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';

      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: { avatar_url: avatarUrl }
        }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        const avatarImage = screen.getByAltText('Avatar');
        expect(avatarImage).toBeInTheDocument();
        expect(avatarImage).toHaveAttribute('src', avatarUrl);
      });
    });

    it('should display initials when no avatar exists', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: { avatar_url: null }
        }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        // Should show initials "أح" for "أحمد محمد"
        expect(screen.getByText(/^[أ-ي]{1,2}$/)).toBeInTheDocument();
      });
    });

    it('should handle single-name users for initials', async () => {
      mockedUseRole.mockReturnValue({
        user: { ...mockUser, name: 'أحمد' },
        refreshUserRole: mockRefreshUserRole,
        hasRole: jest.fn(),
        loading: false
      });

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        // Should show first 2 characters "أح"
        expect(screen.getByText(/^[أ-ي]{1,2}$/)).toBeInTheDocument();
      });
    });
  });

  // TEST 4: File Selection and Validation
  describe('File Selection and Validation', () => {
    it('should accept valid image file (PNG)', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'avatar.png', { type: 'image/png' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file]
      });

      fireEvent.change(input);

      await waitFor(() => {
        // Preview modal should appear
        expect(screen.getByText('معاينة الصورة الشخصية')).toBeInTheDocument();
      });
    });

    it('should reject invalid file type (PDF)', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file]
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/نوع الملف غير مدعوم/)).toBeInTheDocument();
      });
    });

    it('should reject oversized file (>2MB)', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      // Create 3MB file
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [largeFile]
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/حجم الملف يتجاوز 2 ميجابايت/)).toBeInTheDocument();
      });
    });
  });

  // TEST 5: Avatar Upload Flow
  describe('Avatar Upload', () => {
    it('should successfully upload avatar', async () => {
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString()
          }
        }
      });

      render(<ProfileSettings />);

      // Select file
      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText('معاينة الصورة الشخصية')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText('حفظ الصورة');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/api/user/profile/avatar'),
          expect.any(FormData),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'multipart/form-data'
            })
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('تم رفع الصورة بنجاح')).toBeInTheDocument();
        expect(mockRefreshUserRole).toHaveBeenCalled();
      });
    });

    it('should handle upload errors', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'فشل في رفع الصورة'
          }
        }
      });

      render(<ProfileSettings />);

      // Select and try to upload file
      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByText('حفظ الصورة');
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/فشل في رفع الصورة/)).toBeInTheDocument();
      });
    });

    it('should show loading state during upload', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ProfileSettings />);

      // Select file
      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByText('حفظ الصورة');
        fireEvent.click(uploadButton);
      });

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText('جاري الرفع...')).toBeInTheDocument();
      });
    });
  });

  // TEST 6: Avatar Removal
  describe('Avatar Removal', () => {
    it('should successfully remove avatar', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: avatarUrl } }
      });

      mockedAxios.delete.mockResolvedValue({
        data: {
          success: true,
          message: 'تم حذف الصورة بنجاح'
        }
      });

      // Mock window.confirm
      global.confirm = jest.fn(() => true);

      render(<ProfileSettings />);

      await waitFor(() => {
        const removeButton = screen.getByText('حذف الصورة');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(mockedAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/api/user/profile/avatar'),
          expect.objectContaining({
            headers: { 'Authorization': 'Bearer mock-token' }
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('تم حذف الصورة بنجاح')).toBeInTheDocument();
        expect(mockRefreshUserRole).toHaveBeenCalled();
      });
    });

    it('should cancel removal on user confirmation decline', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: avatarUrl } }
      });

      // Mock window.confirm to return false
      global.confirm = jest.fn(() => false);

      render(<ProfileSettings />);

      await waitFor(() => {
        const removeButton = screen.getByText('حذف الصورة');
        fireEvent.click(removeButton);
      });

      // Should not call delete endpoint
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });

    it('should handle removal errors', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: avatarUrl } }
      });

      mockedAxios.delete.mockRejectedValue({
        response: {
          data: {
            message: 'فشل في حذف الصورة'
          }
        }
      });

      global.confirm = jest.fn(() => true);

      render(<ProfileSettings />);

      await waitFor(() => {
        const removeButton = screen.getByText('حذف الصورة');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/فشل في حذف الصورة/)).toBeInTheDocument();
      });
    });
  });

  // TEST 7: Preview Modal Functionality
  describe('Preview Modal', () => {
    it('should show preview modal after file selection', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText('معاينة الصورة الشخصية')).toBeInTheDocument();
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
      });
    });

    it('should close preview modal on cancel', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText('معاينة الصورة الشخصية')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('إلغاء');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('معاينة الصورة الشخصية')).not.toBeInTheDocument();
      });
    });
  });

  // TEST 8: Message Auto-Dismiss
  describe('Success Message Auto-Dismiss', () => {
    it('should auto-dismiss success message after 5 seconds', async () => {
      jest.useFakeTimers();

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            avatar_url: 'https://example.com/avatar.jpg',
            updated_at: new Date().toISOString()
          }
        }
      });

      render(<ProfileSettings />);

      // Upload file
      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByText('حفظ الصورة');
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText('تم رفع الصورة بنجاح')).toBeInTheDocument();
      });

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByText('تم رفع الصورة بنجاح')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  // TEST 9: Button States
  describe('Button States and UI Interactions', () => {
    it('should show "تغيير الصورة" button when avatar exists', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: { avatar_url: 'https://example.com/avatar.jpg' }
        }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText('تغيير الصورة')).toBeInTheDocument();
        expect(screen.getByText('حذف الصورة')).toBeInTheDocument();
      });
    });

    it('should show "رفع صورة" button when no avatar exists', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      render(<ProfileSettings />);

      await waitFor(() => {
        expect(screen.getByText('رفع صورة')).toBeInTheDocument();
        expect(screen.queryByText('حذف الصورة')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during upload', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByText('حفظ الصورة');
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        const loadingButton = screen.getByText('جاري الرفع...');
        expect(loadingButton).toBeDisabled();
      });
    });
  });

  // TEST 10: Integration with RoleContext
  describe('RoleContext Integration', () => {
    it('should call refreshUserRole after successful avatar upload', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { avatar_url: null } }
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          data: {
            avatar_url: 'https://example.com/avatar.jpg',
            updated_at: new Date().toISOString()
          }
        }
      });

      render(<ProfileSettings />);

      const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /رفع صورة/ }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', { value: [file] });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByText('حفظ الصورة');
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(mockRefreshUserRole).toHaveBeenCalled();
      });
    });

    it('should call refreshUserRole after successful avatar removal', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: { avatar_url: 'https://example.com/avatar.jpg' }
        }
      });

      mockedAxios.delete.mockResolvedValue({
        data: {
          success: true,
          message: 'تم حذف الصورة بنجاح'
        }
      });

      global.confirm = jest.fn(() => true);

      render(<ProfileSettings />);

      await waitFor(() => {
        const removeButton = screen.getByText('حذف الصورة');
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(mockRefreshUserRole).toHaveBeenCalled();
      });
    });
  });
});
