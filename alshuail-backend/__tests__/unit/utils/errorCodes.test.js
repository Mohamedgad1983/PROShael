/**
 * Unit Tests for ErrorCodes Utility
 * Tests error code structure, response generation, and error handling
 */

import { describe, test, expect, jest } from '@jest/globals';
import { ErrorCodes, createErrorResponse, errorHandler, asyncErrorWrapper } from '../../../src/utils/errorCodes.js';

describe('ErrorCodes Utility', () => {

  describe('ErrorCodes Structure', () => {
    test('should have all required properties for each error code', () => {
      Object.entries(ErrorCodes).forEach(([key, error]) => {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('messageAr');
        expect(error).toHaveProperty('httpStatus');
        expect(typeof error.code).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.messageAr).toBe('string');
        expect(typeof error.httpStatus).toBe('number');
      });
    });

    test('should have unique error codes', () => {
      const codes = Object.values(ErrorCodes).map(e => e.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    test('should use correct HTTP status codes', () => {
      const validStatusCodes = [400, 401, 402, 403, 404, 409, 413, 415, 429, 500, 503, 504];
      Object.values(ErrorCodes).forEach(error => {
        expect(validStatusCodes).toContain(error.httpStatus);
      });
    });

    test('should have bilingual messages (English and Arabic)', () => {
      Object.values(ErrorCodes).forEach(error => {
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.messageAr.length).toBeGreaterThan(0);
        // Arabic text check (contains Arabic characters)
        expect(/[\u0600-\u06FF]/.test(error.messageAr)).toBe(true);
      });
    });
  });

  describe('createErrorResponse', () => {
    test('should create error response with valid error key', () => {
      const response = createErrorResponse('AUTH_INVALID_CREDENTIALS');

      expect(response.success).toBe(false);
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('messageAr');
      expect(response.error).toHaveProperty('timestamp');
      expect(response.error.code).toBe('AUTH_1001');
    });

    test('should fallback to SYSTEM_ERROR for invalid error key', () => {
      const response = createErrorResponse('INVALID_ERROR_KEY');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('SYS_9001');
      expect(response.error.message).toContain('system error');
    });

    test('should include additional info in error response', () => {
      const additionalInfo = { field: 'email', value: 'test@example.com' };
      const response = createErrorResponse('VALIDATION_INVALID_EMAIL', additionalInfo);

      expect(response.error).toHaveProperty('field');
      expect(response.error).toHaveProperty('value');
      expect(response.error.field).toBe('email');
    });

    test('should include ISO timestamp', () => {
      const response = createErrorResponse('AUTH_INVALID_CREDENTIALS');
      const timestamp = new Date(response.error.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.error.timestamp);
    });
  });

  describe('errorHandler middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('should handle known error codes', () => {
      const error = { code: 'AUTH_1001' };
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTH_1001');
    });

    test('should handle JWT errors with AUTH_TOKEN_INVALID', () => {
      const error = new Error('JWT verification failed');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('AUTH_1003');
    });

    test('should handle duplicate entry errors', () => {
      const error = new Error('duplicate key value');
      error.field = 'email';
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('DB_3005');
    });

    test('should handle timeout errors', () => {
      const error = new Error('connection timeout');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(504);
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('DB_3004');
    });

    test('should default to SYSTEM_ERROR for unknown errors', () => {
      const error = new Error('Unknown error occurred');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('SYS_9001');
    });
  });

  describe('asyncErrorWrapper', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {};
      next = jest.fn();
    });

    test('should call function and handle success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncErrorWrapper(fn);

      await wrapped(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should catch errors and call next', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncErrorWrapper(fn);

      await wrapped(req, res, next);

      expect(fn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const fn = jest.fn(() => {
        throw error;
      });
      const wrapped = asyncErrorWrapper(fn);

      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
