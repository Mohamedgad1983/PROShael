import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { config } from '../../src/config/env.js';

describe('SQL Injection Prevention Tests', () => {
  let validToken;

  beforeAll(() => {
    const jwtSecret = config.jwt.secret || 'test-secret';
    validToken = jwt.sign(
      { id: 'user-123', role: 'admin', email: 'admin@example.com' },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  describe('Search Parameter Injection', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE members; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "1'; DELETE FROM members WHERE '1'='1",
      "' OR 1=1--",
      "'; EXEC xp_cmdshell('dir'); --",
      "\\'; DROP TABLE members; --",
      "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
      "' UNION ALL SELECT NULL,NULL,NULL--",
      "%27%20OR%20%271%27%3D%271",  // URL encoded
      "Robert'); DROP TABLE members;--",
      "1' UNION SELECT username, password FROM users--",
      "<script>alert('XSS')</script>",
      "'; UPDATE members SET role='admin' WHERE '1'='1"
    ];

    sqlInjectionPayloads.forEach((payload) => {
      test(`should sanitize SQL injection attempt: ${payload.substring(0, 30)}...`, async () => {
        const response = await request(app)
          .get('/api/members')
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`);

        // Should not cause server error
        expect(response.status).not.toBe(500);

        // Should return valid response structure
        expect(response.body).toHaveProperty('success');

        // If successful, should return empty or filtered results
        if (response.status === 200) {
          expect(response.body.data).toBeDefined();
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });
    });

    test('should handle nested SQL injection attempts', async () => {
      const nestedPayload = "test' AND (SELECT CASE WHEN (1=1) THEN 1 ELSE 0 END)--";

      const response = await request(app)
        .get('/api/members')
        .query({ search: nestedPayload })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(500);
      expect(response.body.success).toBeDefined();
    });

    test('should sanitize wildcard characters in search', async () => {
      const wildcardPayloads = [
        '%',
        '_',
        '%%',
        '%admin%',
        '_dmin'
      ];

      for (const payload of wildcardPayloads) {
        const response = await request(app)
          .get('/api/members')
          .query({ search: payload })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.success).toBeDefined();
      }
    });
  });

  describe('Pagination Parameter Injection', () => {
    test('should sanitize page parameter injection', async () => {
      const injectionPayloads = [
        "1; DROP TABLE members",
        "-1 UNION SELECT * FROM users",
        "999999999999999999999",
        "1 OR 1=1",
        "'; DELETE FROM members--",
        "<script>alert(1)</script>",
        "NaN",
        "undefined",
        "null",
        "1.5; UPDATE members SET role='admin'"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .get('/api/members')
          .query({ page: payload })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);

        if (response.status === 200) {
          // Page should be sanitized to a valid number
          expect(response.body.pagination.page).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(response.body.pagination.page)).toBe(true);
        }
      }
    });

    test('should sanitize limit parameter injection', async () => {
      const injectionPayloads = [
        "100; DROP TABLE members",
        "-1",
        "999999",
        "25 OR 1=1",
        "'; SELECT * FROM passwords--"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .get('/api/members')
          .query({ limit: payload })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);

        if (response.status === 200) {
          // Limit should be within bounds
          expect(response.body.pagination.limit).toBeGreaterThanOrEqual(1);
          expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('Boolean Parameter Injection', () => {
    test('should sanitize profile_completed parameter', async () => {
      const injectionPayloads = [
        "true; DELETE FROM members",
        "1 OR 1=1",
        "'; DROP TABLE members--",
        "<script>alert('XSS')</script>",
        "true' AND '1'='1"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .get('/api/members')
          .query({ profile_completed: payload })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.success).toBeDefined();
      }
    });

    test('should sanitize status parameter', async () => {
      const injectionPayloads = [
        "active'; DROP TABLE members--",
        "active' OR '1'='1",
        "inactive; DELETE FROM members",
        "'; UPDATE members SET role='admin'--"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .get('/api/members')
          .query({ status: payload })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.success).toBeDefined();
      }
    });
  });

  describe('Combined Injection Attempts', () => {
    test('should handle multiple injection vectors simultaneously', async () => {
      const response = await request(app)
        .get('/api/members')
        .query({
          search: "admin' OR '1'='1",
          page: "1; DROP TABLE members",
          limit: "100 UNION SELECT * FROM passwords",
          status: "active'; DELETE FROM members--"
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(500);
      expect(response.body.success).toBeDefined();

      if (response.status === 200) {
        expect(response.body.pagination.page).toBeGreaterThanOrEqual(1);
        expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
      }
    });

    test('should prevent second-order SQL injection', async () => {
      // First, try to store malicious data
      const maliciousData = {
        name: "'; DROP TABLE members; --",
        email: "test@test.com' OR '1'='1",
        phone: "1234567890'; DELETE FROM members--"
      };

      // Attempt to create member with injection payloads
      const createResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send(maliciousData);

      // Whether creation succeeds or fails, the injection should be neutralized
      if (createResponse.status === 200 || createResponse.status === 201) {
        // Try to search for the created member
        const searchResponse = await request(app)
          .get('/api/members')
          .query({ search: maliciousData.name })
          .set('Authorization', `Bearer ${validToken}`);

        expect(searchResponse.status).not.toBe(500);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should prevent NoSQL injection through JSON payloads', async () => {
      const noSqlPayloads = [
        { $gt: "" },
        { $ne: null },
        { $regex: ".*" },
        { $where: "this.password == 'test'" },
        { password: { $ne: 1 } }
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/members/search')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        // Should not cause server error or bypass authentication
        expect([400, 404, 200]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.success).toBeDefined();
        }
      }
    });
  });

  describe('Special Character Handling', () => {
    test('should safely handle special characters in search', async () => {
      const specialCharacters = [
        "O'Reilly",  // Apostrophe in name
        "user@domain.com",  // Email format
        "+1-234-567-8900",  // Phone with special chars
        "Test & Co.",  // Ampersand
        "50% discount",  // Percentage
        "$100.00",  // Currency
        "user\\domain",  // Backslash
        "first|last",  // Pipe character
        "name*",  // Asterisk
        "test?query"  // Question mark
      ];

      for (const query of specialCharacters) {
        const response = await request(app)
          .get('/api/members')
          .query({ search: query })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.success).toBeDefined();
      }
    });
  });

  describe('Input Length Validation', () => {
    test('should handle extremely long input strings', async () => {
      const longString = 'a'.repeat(10000);
      const longInjection = longString + "'; DROP TABLE members; --";

      const response = await request(app)
        .get('/api/members')
        .query({ search: longInjection })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(500);
      expect(response.body.success).toBeDefined();
    });

    test('should handle empty and null inputs', async () => {
      const emptyInputs = ['', null, undefined, '   ', '\n', '\t'];

      for (const input of emptyInputs) {
        const response = await request(app)
          .get('/api/members')
          .query({ search: input })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500);
        expect(response.body.success).toBeDefined();
      }
    });
  });
});