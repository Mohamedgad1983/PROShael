import { describe, it, expect } from 'vitest'

describe('Test Setup Sanity Check', () => {
  it('vitest is working correctly', () => {
    expect(true).toBe(true)
  })

  it('can perform basic assertions', () => {
    const value = 42
    expect(value).toBe(42)
    expect(value).toBeGreaterThan(40)
    expect(value).toBeLessThan(50)
  })

  it('can test async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })

  it('localStorage mock is available', () => {
    localStorage.setItem('test', 'value')
    expect(localStorage.getItem('test')).toBe('value')
    localStorage.removeItem('test')
    expect(localStorage.getItem('test')).toBeNull()
  })
})
