/**
 * Family Tree Service
 * Handles family tree API calls
 *
 * Note: Backend has two route files:
 * - /api/family-tree/* - older routes (member/:id, visualization/:id, my-branch, search)
 * - /api/tree/* - newer routes (/, branches, stats, generations, members, relationships)
 */
import api from '../utils/api'

const familyTreeService = {
  /**
   * Get full family tree (uses /api/tree/)
   */
  getFullTree: async () => {
    const response = await api.get('/tree')
    return response.data
  },

  /**
   * Get all branches (uses /api/tree/branches)
   */
  getBranches: async () => {
    const response = await api.get('/tree/branches')
    return response.data
  },

  /**
   * Get tree statistics (uses /api/tree/stats)
   */
  getStats: async () => {
    const response = await api.get('/tree/stats')
    return response.data
  },

  /**
   * Get all generations (uses /api/tree/generations)
   */
  getGenerations: async () => {
    const response = await api.get('/tree/generations')
    return response.data
  },

  /**
   * Get all members in the tree (uses /api/tree/members)
   */
  getMembers: async () => {
    const response = await api.get('/tree/members')
    return response.data
  },

  /**
   * Get all relationships (uses /api/tree/relationships)
   */
  getRelationships: async () => {
    const response = await api.get('/tree/relationships')
    return response.data
  },

  /**
   * Search members in the tree (uses /api/tree/search)
   */
  searchMembers: async (query) => {
    const response = await api.get('/tree/search', { params: { q: query } })
    return response.data
  },

  /**
   * Get visualization data for a specific member (uses /api/tree/visualization/:id)
   */
  getVisualization: async (memberId) => {
    const response = await api.get(`/tree/visualization/${memberId}`)
    return response.data
  },

  /**
   * Get member's relationships (uses /api/tree/:id/relationships)
   */
  getMemberRelationships: async (memberId) => {
    const response = await api.get(`/tree/${memberId}/relationships`)
    return response.data
  },

  /**
   * Get members by branch ID
   */
  getMembersByBranch: async (branchId) => {
    const response = await api.get('/tree/members', { params: { branch_id: branchId } })
    return response.data
  },

  /**
   * Get my branch (current user's tribal section) - uses /api/family-tree/my-branch
   */
  getMyBranch: async () => {
    const response = await api.get('/family-tree/my-branch')
    return response.data
  },

  /**
   * Get my family tree - used by DataCacheContext (uses /api/tree/)
   */
  getMyFamilyTree: async () => {
    const response = await api.get('/tree')
    return response.data
  },

  /**
   * Add a child to current user
   */
  addChild: async (childData) => {
    const response = await api.post('/family-tree/add-child', childData)
    return response.data
  }
}

export default familyTreeService
