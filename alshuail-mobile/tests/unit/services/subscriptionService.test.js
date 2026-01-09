import { describe, it, expect } from 'vitest'
import subscriptionService from '../../../src/services/subscriptionService'

describe('subscriptionService', () => {
  describe('getPlans', () => {
    it('should fetch subscription plans', async () => {
      const result = await subscriptionService.getPlans()

      expect(result.plans).toBeDefined()
      expect(Array.isArray(result.plans)).toBe(true)
      expect(result.plans[0].name_ar).toBe('الاشتراك الشهري')
    })
  })

  describe('getMySubscriptions', () => {
    it('should fetch user subscriptions', async () => {
      const result = await subscriptionService.getMySubscriptions()

      expect(result.subscriptions).toBeDefined()
      expect(Array.isArray(result.subscriptions)).toBe(true)
    })
  })

  describe('getYearlyStatus', () => {
    it('should fetch subscription status by year', async () => {
      const result = await subscriptionService.getYearlyStatus(2026)

      expect(result).toBeDefined()
      expect(result.year).toBe(2026)
    })
  })

  describe('getStatement', () => {
    it('should fetch financial statement', async () => {
      const result = await subscriptionService.getStatement()

      expect(result.member).toBeDefined()
      expect(result.balance).toBe('1500.00')
      expect(result.transactions).toBeDefined()
      expect(Array.isArray(result.transactions)).toBe(true)
    })
  })

  describe('getPaymentHistory', () => {
    it('should fetch payment history', async () => {
      const result = await subscriptionService.getPaymentHistory()

      expect(result).toBeDefined()
    })
  })
})
