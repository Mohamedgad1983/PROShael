/**
 * Unique Constraints Tests
 * Phase 2: Data Integrity Testing - Unique Constraints (3 tests)
 */

import { jest } from '@jest/globals';

describe('Unique Constraints Tests', () => {
  class UniqueConstraintManager {
    constructor() {
      this.constraints = {
        members: {
          email: { type: 'unique', caseSensitive: false },
          nationalId: { type: 'unique', caseSensitive: true },
          membershipNumber: { type: 'unique', caseSensitive: true },
          phoneEmail: { type: 'compound', fields: ['phone', 'email'] }
        },
        payments: {
          transactionId: { type: 'unique', caseSensitive: true }
        },
        subscriptions: {
          memberPlan: { type: 'compound', fields: ['memberId', 'planType', 'year'] }
        }
      };

      this.indexes = new Map();
      this.initializeIndexes();
    }

    initializeIndexes() {
      for (const table of Object.keys(this.constraints)) {
        this.indexes.set(table, new Map());
      }
    }

    normalizeValue(value, caseSensitive) {
      if (!caseSensitive && typeof value === 'string') {
        return value.toLowerCase();
      }
      return value;
    }

    buildCompoundKey(record, fields) {
      return fields.map(field => record[field] || '').join('|');
    }

    checkUniqueConstraint(table, field, value, recordId = null) {
      const tableIndexes = this.indexes.get(table);
      const constraint = this.constraints[table]?.[field];

      if (!constraint) return { valid: true };

      if (constraint.type === 'unique') {
        const normalizedValue = this.normalizeValue(value, constraint.caseSensitive);
        const indexKey = `${field}:${normalizedValue}`;

        if (tableIndexes.has(indexKey)) {
          const existingId = tableIndexes.get(indexKey);
          if (existingId !== recordId) {
            return {
              valid: false,
              error: `Duplicate value for ${field}: ${value}`,
              existingRecordId: existingId
            };
          }
        }
      }

      return { valid: true };
    }

    checkCompoundUnique(table, record, recordId = null) {
      const tableConstraints = this.constraints[table];
      const tableIndexes = this.indexes.get(table);
      const violations = [];

      for (const [constraintName, constraint] of Object.entries(tableConstraints)) {
        if (constraint.type === 'compound') {
          const compoundKey = this.buildCompoundKey(record, constraint.fields);
          const indexKey = `${constraintName}:${compoundKey}`;

          if (tableIndexes.has(indexKey)) {
            const existingId = tableIndexes.get(indexKey);
            if (existingId !== recordId) {
              violations.push({
                constraint: constraintName,
                fields: constraint.fields,
                error: `Duplicate compound key (${constraint.fields.join(', ')}): ${compoundKey}`,
                existingRecordId: existingId
              });
            }
          }
        }
      }

      return {
        valid: violations.length === 0,
        violations
      };
    }

    updateIndexes(table, record, recordId) {
      const tableIndexes = this.indexes.get(table);
      const tableConstraints = this.constraints[table];

      for (const [field, constraint] of Object.entries(tableConstraints)) {
        if (constraint.type === 'unique') {
          const value = record[field];
          if (value !== undefined && value !== null) {
            const normalizedValue = this.normalizeValue(value, constraint.caseSensitive);
            const indexKey = `${field}:${normalizedValue}`;
            tableIndexes.set(indexKey, recordId);
          }
        } else if (constraint.type === 'compound') {
          const compoundKey = this.buildCompoundKey(record, constraint.fields);
          const indexKey = `${field}:${compoundKey}`;
          tableIndexes.set(indexKey, recordId);
        }
      }
    }

    removeFromIndexes(table, record, recordId) {
      const tableIndexes = this.indexes.get(table);
      const tableConstraints = this.constraints[table];

      for (const [field, constraint] of Object.entries(tableConstraints)) {
        if (constraint.type === 'unique') {
          const value = record[field];
          if (value !== undefined && value !== null) {
            const normalizedValue = this.normalizeValue(value, constraint.caseSensitive);
            const indexKey = `${field}:${normalizedValue}`;
            if (tableIndexes.get(indexKey) === recordId) {
              tableIndexes.delete(indexKey);
            }
          }
        } else if (constraint.type === 'compound') {
          const compoundKey = this.buildCompoundKey(record, constraint.fields);
          const indexKey = `${field}:${compoundKey}`;
          if (tableIndexes.get(indexKey) === recordId) {
            tableIndexes.delete(indexKey);
          }
        }
      }
    }
  }

  describe('Unique Constraint Operations', () => {
    let manager;

    beforeEach(() => {
      manager = new UniqueConstraintManager();
    });

    test('should enforce case-insensitive unique constraints on email', () => {
      const record1 = {
        id: 'MEM-001',
        email: 'User@Example.COM'
      };

      // First record should be valid
      const check1 = manager.checkUniqueConstraint('members', 'email', record1.email, record1.id);
      expect(check1.valid).toBe(true);

      // Update indexes
      manager.updateIndexes('members', record1, record1.id);

      // Same email with different case should violate constraint
      const record2 = {
        id: 'MEM-002',
        email: 'user@example.com'
      };

      const check2 = manager.checkUniqueConstraint('members', 'email', record2.email, record2.id);
      expect(check2.valid).toBe(false);
      expect(check2.error).toContain('Duplicate value for email');
      expect(check2.existingRecordId).toBe('MEM-001');

      // Different email should be valid
      const record3 = {
        id: 'MEM-003',
        email: 'another@example.com'
      };

      const check3 = manager.checkUniqueConstraint('members', 'email', record3.email, record3.id);
      expect(check3.valid).toBe(true);

      // Updating same record should be valid
      const updateCheck = manager.checkUniqueConstraint('members', 'email', record1.email, 'MEM-001');
      expect(updateCheck.valid).toBe(true);
    });

    test('should enforce compound unique constraints', () => {
      // First subscription
      const sub1 = {
        id: 'SUB-001',
        memberId: 'MEM-001',
        planType: 'premium',
        year: 2025
      };

      const compoundCheck1 = manager.checkCompoundUnique('subscriptions', sub1, sub1.id);
      expect(compoundCheck1.valid).toBe(true);

      manager.updateIndexes('subscriptions', sub1, sub1.id);

      // Same member, same plan, same year - should violate
      const sub2 = {
        id: 'SUB-002',
        memberId: 'MEM-001',
        planType: 'premium',
        year: 2025
      };

      const compoundCheck2 = manager.checkCompoundUnique('subscriptions', sub2, sub2.id);
      expect(compoundCheck2.valid).toBe(false);
      expect(compoundCheck2.violations[0].constraint).toBe('memberPlan');
      expect(compoundCheck2.violations[0].fields).toEqual(['memberId', 'planType', 'year']);

      // Same member, different year - should be valid
      const sub3 = {
        id: 'SUB-003',
        memberId: 'MEM-001',
        planType: 'premium',
        year: 2026
      };

      const compoundCheck3 = manager.checkCompoundUnique('subscriptions', sub3, sub3.id);
      expect(compoundCheck3.valid).toBe(true);

      // Different member, same plan and year - should be valid
      const sub4 = {
        id: 'SUB-004',
        memberId: 'MEM-002',
        planType: 'premium',
        year: 2025
      };

      const compoundCheck4 = manager.checkCompoundUnique('subscriptions', sub4, sub4.id);
      expect(compoundCheck4.valid).toBe(true);
    });

    test('should handle index updates and removals correctly', () => {
      const record = {
        id: 'MEM-001',
        email: 'test@example.com',
        nationalId: '1234567890',
        membershipNumber: 'MEM-2025-0001',
        phone: '+966501234567'
      };

      // Add to indexes
      manager.updateIndexes('members', record, record.id);

      // Check indexes are set
      const emailCheck = manager.checkUniqueConstraint('members', 'email', 'test@example.com', 'MEM-002');
      expect(emailCheck.valid).toBe(false);

      const nationalIdCheck = manager.checkUniqueConstraint('members', 'nationalId', '1234567890', 'MEM-002');
      expect(nationalIdCheck.valid).toBe(false);

      // Remove from indexes
      manager.removeFromIndexes('members', record, record.id);

      // Check indexes are removed
      const emailCheckAfter = manager.checkUniqueConstraint('members', 'email', 'test@example.com', 'MEM-003');
      expect(emailCheckAfter.valid).toBe(true);

      const nationalIdCheckAfter = manager.checkUniqueConstraint('members', 'nationalId', '1234567890', 'MEM-003');
      expect(nationalIdCheckAfter.valid).toBe(true);
    });
  });
});