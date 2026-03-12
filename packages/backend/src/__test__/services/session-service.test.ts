import { ManagedRuntime, Exit, Effect } from 'effect'
import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'
import { describe, it, expect, beforeEach } from 'vitest'

import type { JWTPayload } from '../../types/auth'

import { resolveConfig } from '../../services/config-service'
import { SessionService } from '../../services/session'
import { mockRedis, resetMockRedis } from '../helpers/mock-redis'
import { TestRepositoryLayer } from '../helpers/test-layers'

const testRuntime = ManagedRuntime.make(TestRepositoryLayer)

const REFRESH_TOKEN_PREFIX = 'auth:refresh:'

const testPayload: JWTPayload = {
  userId: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
}

describe('SessionService', () => {
  beforeEach(() => {
    resetMockRedis()
  })

  describe('createSession', () => {
    it('should generate a token and store payload in Redis with TTL', async () => {
      mockRedis.set.mockResolvedValue('OK')

      const refreshToken = await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.createSession(testPayload)
        })
      )

      expect(typeof refreshToken).toBe('string')
      expect(refreshToken.length).toBeGreaterThan(0)

      expect(mockRedis.set).toHaveBeenCalledOnce()

      const call = mockRedis.set.mock.calls[0]!
      const key = call[0] as string
      expect(key).toMatch(new RegExp(`^${REFRESH_TOKEN_PREFIX}`))

      const storedValue = JSON.parse(call[1] as string) as JWTPayload
      expect(storedValue).toEqual({
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      })

      expect(call[2]).toBe('EX')
      expect(call[3]).toBe(60 * 60 * 24 * 30)
    })

    it('should return SessionError when Redis write fails', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection error'))

      const result = await testRuntime.runPromiseExit(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.createSession(testPayload)
        })
      )

      expect(Exit.isFailure(result)).toBe(true)
    })
  })

  describe('getSession', () => {
    it('should return parsed JWTPayload when Redis has valid data', async () => {
      const token = 'valid-refresh-token'
      const expectedKey = `${REFRESH_TOKEN_PREFIX}${createHash('sha256').update(token).digest('hex')}`

      mockRedis.get.mockResolvedValue(JSON.stringify(testPayload))

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.getSession(token)
        })
      )

      expect(result).toEqual({
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      })

      expect(mockRedis.get).toHaveBeenCalledWith(expectedKey)
    })

    it('should return null when token not found in Redis', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.getSession('nonexistent-token')
        })
      )

      expect(result).toBeNull()
    })

    it('should return null and delete key when Redis has invalid data', async () => {
      const token = 'corrupt-token'
      const expectedKey = `${REFRESH_TOKEN_PREFIX}${createHash('sha256').update(token).digest('hex')}`

      mockRedis.get.mockResolvedValue('not-valid-json{{{')
      mockRedis.del.mockResolvedValue(1)

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.getSession(token)
        })
      )

      expect(result).toBeNull()
      expect(mockRedis.del).toHaveBeenCalledWith(expectedKey)
    })
  })

  describe('clearSession', () => {
    it('should delete the correct key from Redis', async () => {
      const token = 'token-to-clear'
      const expectedKey = `${REFRESH_TOKEN_PREFIX}${createHash('sha256').update(token).digest('hex')}`

      mockRedis.del.mockResolvedValue(1)

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.clearSession(token)
        })
      )

      expect(mockRedis.del).toHaveBeenCalledWith(expectedKey)
    })
  })

  describe('signAccessToken', () => {
    it('should return a valid JWT signed with config secret', async () => {
      const token = await testRuntime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.signAccessToken(testPayload)
        })
      )

      expect(typeof token).toBe('string')

      const config = resolveConfig()
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload

      expect(decoded.userId).toBe('user-123')
      expect(decoded.username).toBe('testuser')
      expect(decoded.email).toBe('test@example.com')
    })
  })
})
