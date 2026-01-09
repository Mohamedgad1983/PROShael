import { describe, it, expect } from 'vitest'
import familyTreeService from '../../../src/services/familyTreeService'

describe('familyTreeService', () => {
  describe('getFullTree', () => {
    it('should fetch full family tree', async () => {
      const result = await familyTreeService.getFullTree()

      expect(result.branches).toBeDefined()
      expect(Array.isArray(result.branches)).toBe(true)
      expect(result.total_members).toBe(347)
    })
  })

  describe('getBranches', () => {
    it('should fetch all family branches', async () => {
      const result = await familyTreeService.getBranches()

      expect(result.branches).toBeDefined()
      expect(Array.isArray(result.branches)).toBe(true)
      expect(result.branches.length).toBeGreaterThan(0)
    })
  })

  describe('getMembersByBranch', () => {
    it('should fetch members of specific branch', async () => {
      const result = await familyTreeService.getMembersByBranch(1)

      expect(result.branch).toBeDefined()
      expect(result.members).toBeDefined()
      expect(Array.isArray(result.members)).toBe(true)
    })
  })

  describe('searchMembers', () => {
    it('should search family members', async () => {
      const result = await familyTreeService.searchMembers('محمد')

      expect(result.members).toBeDefined()
      expect(Array.isArray(result.members)).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should fetch tree statistics', async () => {
      const result = await familyTreeService.getStats()

      expect(result).toBeDefined()
    })
  })

  describe('getGenerations', () => {
    it('should fetch all generations', async () => {
      const result = await familyTreeService.getGenerations()

      expect(result).toBeDefined()
    })
  })

  describe('getMembers', () => {
    it('should fetch all tree members', async () => {
      const result = await familyTreeService.getMembers()

      expect(result.members).toBeDefined()
      expect(Array.isArray(result.members)).toBe(true)
    })
  })

  describe('getRelationships', () => {
    it('should fetch all relationships', async () => {
      const result = await familyTreeService.getRelationships()

      expect(result).toBeDefined()
    })
  })

  describe('getVisualization', () => {
    it('should fetch visualization data for member', async () => {
      const result = await familyTreeService.getVisualization(1)

      expect(result).toBeDefined()
    })
  })

  describe('getMemberRelationships', () => {
    it('should fetch member relationships', async () => {
      const result = await familyTreeService.getMemberRelationships(1)

      expect(result).toBeDefined()
    })
  })
})
