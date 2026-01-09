import { describe, it, expect } from 'vitest'
import initiativeService from '../../../src/services/initiativeService'

describe('initiativeService', () => {
  describe('getAllInitiatives', () => {
    it('should fetch all initiatives', async () => {
      const result = await initiativeService.getAllInitiatives()

      expect(result.initiatives).toBeDefined()
      expect(Array.isArray(result.initiatives)).toBe(true)
      expect(result.initiatives.length).toBeGreaterThan(0)
    })
  })

  describe('getInitiativeById', () => {
    it('should fetch specific initiative', async () => {
      const initiative = await initiativeService.getInitiativeById(1)

      expect(initiative).toBeDefined()
      expect(initiative.title_ar).toBe('مشروع بناء مسجد')
      expect(initiative.target_amount).toBe('50000.00')
    })
  })

  describe('contribute', () => {
    it('should contribute to initiative successfully', async () => {
      const result = await initiativeService.contribute(1, '500.00')

      expect(result.success).toBe(true)
      expect(result.payment_id).toBeDefined()
    })
  })

  describe('getMyContributions', () => {
    it('should fetch user contributions', async () => {
      const result = await initiativeService.getMyContributions()

      // Should return user's contribution history
      expect(result).toBeDefined()
    })
  })
})
