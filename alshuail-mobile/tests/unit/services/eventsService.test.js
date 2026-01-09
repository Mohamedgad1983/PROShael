import { describe, it, expect } from 'vitest'
import eventsService from '../../../src/services/eventsService'

describe('eventsService', () => {
  describe('getAllEvents', () => {
    it('should fetch all events', async () => {
      const result = await eventsService.getAllEvents()

      expect(result.events).toBeDefined()
      expect(Array.isArray(result.events)).toBe(true)
      expect(result.events.length).toBeGreaterThan(0)
    })
  })

  describe('getUpcomingEvents', () => {
    it('should fetch upcoming events', async () => {
      const result = await eventsService.getUpcomingEvents()

      expect(result).toBeDefined()
    })
  })

  describe('getEventById', () => {
    it('should fetch specific event', async () => {
      const result = await eventsService.getEventById(1)

      expect(result).toBeDefined()
    })
  })

  describe('updateRSVP', () => {
    it('should update event RSVP', async () => {
      const result = await eventsService.updateRSVP(1, {
        status: 'attending',
        guests: 2
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('RSVP updated')
    })
  })

  describe('getMyRSVP', () => {
    it('should fetch user RSVP status', async () => {
      const result = await eventsService.getMyRSVP(1)

      expect(result).toBeDefined()
    })
  })

  describe('getAttendees', () => {
    it('should fetch event attendees list', async () => {
      const result = await eventsService.getAttendees(1)

      expect(result).toBeDefined()
    })
  })
})
