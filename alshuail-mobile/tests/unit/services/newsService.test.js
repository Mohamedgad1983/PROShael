import { describe, it, expect } from 'vitest'
import newsService from '../../../src/services/newsService'

describe('newsService', () => {
  describe('getNews', () => {
    it('should fetch all news articles', async () => {
      const result = await newsService.getNews()

      expect(result.news).toBeDefined()
      expect(Array.isArray(result.news)).toBe(true)
      expect(result.news.length).toBeGreaterThan(0)
    })
  })

  describe('getNewsById', () => {
    it('should fetch specific news article', async () => {
      const article = await newsService.getNewsById(1)

      expect(article).toBeDefined()
      expect(article.title_ar).toBe('إعلان هام')
      expect(article.category).toBe('announcement')
    })

    it('should handle non-existent news ID', async () => {
      const article = await newsService.getNewsById(9999)

      expect(article).toEqual({})
    })
  })

  describe('getNewsByCategory', () => {
    it('should fetch news by category', async () => {
      const result = await newsService.getNewsByCategory('announcement')

      expect(result).toBeDefined()
    })
  })

  describe('reactToNews', () => {
    it('should react to news article', async () => {
      const result = await newsService.reactToNews(1, 'like')

      expect(result).toBeDefined()
    })
  })
})
