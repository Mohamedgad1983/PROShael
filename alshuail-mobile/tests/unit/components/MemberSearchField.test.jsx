import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MemberSearchField from '../../../src/components/MemberSearchField'
import paymentService from '../../../src/services/paymentService'

// Mock paymentService
vi.mock('../../../src/services/paymentService', () => ({
  default: {
    searchMembers: vi.fn(),
  },
}))

describe('MemberSearchField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render search input with default placeholder', () => {
      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')
      expect(input).toBeDefined()
    })

    it('should render search input with custom placeholder', () => {
      render(<MemberSearchField onSelect={vi.fn()} placeholder="ابحث هنا..." />)

      const input = screen.getByPlaceholderText('ابحث هنا...')
      expect(input).toBeDefined()
    })

    it('should render search icon', () => {
      const { container } = render(<MemberSearchField onSelect={vi.fn()} />)

      const searchIcon = container.querySelector('.text-gray-400')
      expect(searchIcon).toBeDefined()
    })

    it('should show helper text', () => {
      render(<MemberSearchField onSelect={vi.fn()} />)

      expect(screen.getByText(/ابحث برقم العضوية/)).toBeDefined()
    })
  })

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<MemberSearchField onSelect={vi.fn()} disabled={true} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')
      expect(input.disabled).toBe(true)
    })

    it('should not disable input by default', () => {
      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')
      expect(input.disabled).toBe(false)
    })
  })

  describe('search functionality', () => {
    it('should not search when query is less than 2 characters', async () => {
      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'a' } })

      // Wait a bit to ensure debounce would have triggered if it was going to
      await new Promise(resolve => setTimeout(resolve, 400))

      expect(paymentService.searchMembers).not.toHaveBeenCalled()
    })

    it('should debounce search by 300ms', async () => {
      paymentService.searchMembers.mockResolvedValue({ success: true, data: [] })

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      // Should not be called immediately
      expect(paymentService.searchMembers).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(() => {
        expect(paymentService.searchMembers).toHaveBeenCalledWith('محمد', 10)
      }, { timeout: 500 })
    })

    it('should search when query is 2 or more characters', async () => {
      paymentService.searchMembers.mockResolvedValue({
        success: true,
        data: [{ id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }]
      })

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(paymentService.searchMembers).toHaveBeenCalledWith('محمد', 10)
      }, { timeout: 500 })
    })

    it('should display loading spinner during search', async () => {
      // Delay the resolution to observe loading state
      paymentService.searchMembers.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      )

      const { container } = render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeDefined()
      }, { timeout: 500 })
    })
  })

  describe('search results', () => {
    it('should display search results in dropdown', async () => {
      const mockResults = [
        { id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001', phone: '12345678' },
        { id: 2, full_name_ar: 'أحمد محمد', membership_number: 'SH-0002' }
      ]

      paymentService.searchMembers.mockResolvedValue({ success: true, data: mockResults })

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
        expect(screen.getByText('أحمد محمد')).toBeDefined()
        expect(screen.getByText('SH-0001')).toBeDefined()
        expect(screen.getByText('SH-0002')).toBeDefined()
      }, { timeout: 500 })
    })

    it('should show "no results" message when no members found', async () => {
      paymentService.searchMembers.mockResolvedValue({ success: true, data: [] })

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'xyz' } })

      await waitFor(() => {
        expect(screen.getByText('لا توجد نتائج')).toBeDefined()
      }, { timeout: 500 })
    })

    it('should handle search error gracefully', async () => {
      paymentService.searchMembers.mockRejectedValue(new Error('Network error'))

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(screen.getByText('حدث خطأ في البحث')).toBeDefined()
      }, { timeout: 500 })
    })
  })

  describe('member selection', () => {
    it('should call onSelect when member is clicked', async () => {
      const mockMember = { id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }
      paymentService.searchMembers.mockResolvedValue({ success: true, data: [mockMember] })

      const onSelectMock = vi.fn()
      render(<MemberSearchField onSelect={onSelectMock} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      }, { timeout: 500 })

      const memberItem = screen.getByText('محمد أحمد').closest('div')
      fireEvent.click(memberItem)

      expect(onSelectMock).toHaveBeenCalledWith(mockMember)
    })

    it('should clear search query after selection', async () => {
      const mockMember = { id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }
      paymentService.searchMembers.mockResolvedValue({ success: true, data: [mockMember] })

      render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      }, { timeout: 500 })

      const memberItem = screen.getByText('محمد أحمد').closest('div')
      fireEvent.click(memberItem)

      expect(input.value).toBe('')
    })
  })

  describe('selected member card', () => {
    it('should display selected member card when member is selected', () => {
      const selectedMember = {
        id: 1,
        full_name_ar: 'محمد أحمد',
        membership_number: 'SH-0001'
      }

      render(<MemberSearchField onSelect={vi.fn()} selectedMember={selectedMember} />)

      expect(screen.getByText('تم اختيار العضو')).toBeDefined()
      expect(screen.getByText('محمد أحمد')).toBeDefined()
      expect(screen.getByText('SH-0001')).toBeDefined()
    })

    it('should call onClear when clear button is clicked', () => {
      const selectedMember = { id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }
      const onClearMock = vi.fn()

      const { container } = render(
        <MemberSearchField
          onSelect={vi.fn()}
          onClear={onClearMock}
          selectedMember={selectedMember}
        />
      )

      const clearButton = container.querySelector('.bg-red-100')
      fireEvent.click(clearButton)

      expect(onClearMock).toHaveBeenCalled()
    })

    it('should not show search input when member is selected', () => {
      const selectedMember = { id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }

      render(<MemberSearchField onSelect={vi.fn()} selectedMember={selectedMember} />)

      const input = screen.queryByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')
      expect(input).toBeNull()
    })
  })

  describe('click outside to close', () => {
    it('should close dropdown when clicking outside', async () => {
      paymentService.searchMembers.mockResolvedValue({
        success: true,
        data: [{ id: 1, full_name_ar: 'محمد أحمد', membership_number: 'SH-0001' }]
      })

      const { container } = render(<MemberSearchField onSelect={vi.fn()} />)

      const input = screen.getByPlaceholderText('ابحث برقم العضوية أو الاسم أو الهاتف...')

      fireEvent.change(input, { target: { value: 'محمد' } })

      await waitFor(() => {
        expect(screen.getByText('محمد أحمد')).toBeDefined()
      }, { timeout: 500 })

      // Click outside the search component
      fireEvent.mouseDown(document.body)

      await waitFor(() => {
        expect(screen.queryByText('محمد أحمد')).toBeNull()
      })
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<MemberSearchField onSelect={vi.fn()} className="custom-class" />)

      const searchField = container.querySelector('.member-search-field')
      expect(searchField.className).toContain('custom-class')
    })
  })
})
