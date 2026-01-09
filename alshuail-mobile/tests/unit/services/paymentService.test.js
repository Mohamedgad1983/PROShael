import { describe, it, expect } from 'vitest'
import paymentService from '../../../src/services/paymentService'

describe('paymentService', () => {
  describe('paySubscription', () => {
    it('should process subscription payment successfully', async () => {
      const payment = {
        year: 2026,
        months: [1, 2, 3],
        payment_method: 'cash'
      }
      const result = await paymentService.paySubscription(payment)

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
      expect(result.reference_number).toBeDefined()
    })
  })

  describe('payDiya', () => {
    it('should contribute to diya case successfully', async () => {
      const contribution = {
        diya_case_id: 1,
        amount: '100.00'
      }
      const result = await paymentService.payDiya(contribution)

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
    })
  })

  describe('payInitiative', () => {
    it('should contribute to initiative successfully', async () => {
      const contribution = {
        initiative_id: 1,
        amount: '500.00'
      }
      const result = await paymentService.payInitiative(contribution)

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
    })
  })

  describe('submitBankTransfer', () => {
    it('should submit bank transfer successfully', async () => {
      const transfer = {
        amount: 1000,
        reference: 'BANK-REF-001'
      }
      const result = await paymentService.submitBankTransfer(transfer)

      expect(result.success).toBe(true)
      expect(result.status).toBe('pending_verification')
    })
  })

  describe('getPaymentHistory', () => {
    it('should fetch payment history with pagination', async () => {
      const result = await paymentService.getPaymentHistory(1, 20)

      expect(result.payments).toBeDefined()
      expect(Array.isArray(result.payments)).toBe(true)
      expect(result.total).toBeDefined()
      expect(result.page).toBe(1)
    })
  })

  describe('searchMembers', () => {
    it('should search for members to pay on behalf', async () => {
      const result = await paymentService.searchMembers('محمد')

      expect(result.members).toBeDefined()
      expect(Array.isArray(result.members)).toBe(true)
    })
  })

  describe('getMemberById', () => {
    it('should get member details by ID', async () => {
      const result = await paymentService.getMemberById(1)

      expect(result).toBeDefined()
      expect(result.id).toBe(1)
    })
  })

  describe('payDiya', () => {
    it('should contribute to diya case', async () => {
      const data = { beneficiary_id: 1, case_id: 'case-1', amount: '100.00' }
      const result = await paymentService.payDiya(data)

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
    })
  })

  describe('payInitiative', () => {
    it('should contribute to initiative', async () => {
      const data = { beneficiary_id: 1, initiative_id: 1, amount: '50.00' }
      const result = await paymentService.payInitiative(data)

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
    })
  })

  describe('getMyBankTransfers', () => {
    it('should fetch my bank transfer requests', async () => {
      const result = await paymentService.getMyBankTransfers()

      expect(result).toBeDefined()
    })
  })

  describe('getActiveDiyaCases', () => {
    it('should fetch active diya cases', async () => {
      const result = await paymentService.getActiveDiyaCases()

      expect(result).toBeDefined()
    })
  })

  describe('getAvailableMonths', () => {
    it('should fetch available subscription months', async () => {
      const result = await paymentService.getAvailableMonths(1)

      expect(result).toBeDefined()
    })
  })

  describe('getPaymentHistory', () => {
    it('should fetch payment history', async () => {
      const result = await paymentService.getPaymentHistory()

      expect(result).toBeDefined()
    })
  })
})
