/**
 * Required Field Validation Tests
 * Phase 2: Data Integrity Testing - Required Fields (4 tests)
 */

import { jest } from '@jest/globals';

describe('Required Field Validation Tests', () => {
  class RequiredFieldValidator {
    constructor() {
      this.schemas = {
        members: {
          id: { required: true, autoGenerate: true },
          name: { required: true, minLength: 2, maxLength: 100 },
          email: { required: true, format: 'email' },
          membershipNumber: { required: true, format: 'membership' },
          status: { required: true, default: 'active' },
          createdAt: { required: true, autoGenerate: true },
          updatedAt: { required: true, autoGenerate: true }
        },
        payments: {
          id: { required: true, autoGenerate: true },
          memberId: { required: true, foreignKey: 'members.id' },
          amount: { required: true, type: 'number', min: 0.01 },
          currency: { required: true, enum: ['SAR', 'KWD', 'USD', 'EUR'] },
          status: { required: true, default: 'pending' },
          paymentDate: { required: true, autoGenerate: true }
        },
        subscriptions: {
          id: { required: true, autoGenerate: true },
          memberId: { required: true, foreignKey: 'members.id' },
          planType: { required: true, enum: ['basic', 'premium', 'vip'] },
          startDate: { required: true },
          endDate: { required: true },
          amount: { required: true, type: 'number', min: 0 },
          isActive: { required: true, default: true }
        },
        documents: {
          id: { required: true, autoGenerate: true },
          filename: { required: true, minLength: 1, maxLength: 255 },
          fileType: { required: true },
          uploadedBy: { required: false, foreignKey: 'members.id' },
          uploadDate: { required: true, autoGenerate: true },
          size: { required: true, type: 'number', min: 0 }
        }
      };
    }

    validateRequiredFields(table, data) {
      const schema = this.schemas[table];
      if (!schema) {
        throw new Error(`Unknown table: ${table}`);
      }

      const errors = [];
      const processed = {};

      // Check each field in schema
      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        // Handle auto-generated fields
        if (rules.autoGenerate && (value === undefined || value === null)) {
          processed[field] = this.generateFieldValue(field, rules);
          continue;
        }

        // Handle default values
        if (rules.default !== undefined && (value === undefined || value === null)) {
          processed[field] = rules.default;
          continue;
        }

        // Check required fields
        if (rules.required) {
          if (value === undefined || value === null || value === '') {
            errors.push({
              field,
              error: `${field} is required`,
              type: 'missing'
            });
            continue;
          }
        } else if (value === undefined || value === null) {
          // Optional field with no value
          continue;
        }

        // Validate field value
        const validation = this.validateFieldValue(field, value, rules);
        if (!validation.valid) {
          errors.push({
            field,
            error: validation.error,
            type: validation.type
          });
        } else {
          processed[field] = value;
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        processed
      };
    }

    validateFieldValue(field, value, rules) {
      // Type validation
      if (rules.type) {
        if (rules.type === 'number' && typeof value !== 'number') {
          return { valid: false, error: `${field} must be a number`, type: 'type' };
        }
        if (rules.type === 'boolean' && typeof value !== 'boolean') {
          return { valid: false, error: `${field} must be a boolean`, type: 'type' };
        }
      }

      // String length validation
      if (rules.minLength && value.length < rules.minLength) {
        return {
          valid: false,
          error: `${field} must be at least ${rules.minLength} characters`,
          type: 'length'
        };
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return {
          valid: false,
          error: `${field} cannot exceed ${rules.maxLength} characters`,
          type: 'length'
        };
      }

      // Number range validation
      if (rules.min !== undefined && value < rules.min) {
        return {
          valid: false,
          error: `${field} must be at least ${rules.min}`,
          type: 'range'
        };
      }
      if (rules.max !== undefined && value > rules.max) {
        return {
          valid: false,
          error: `${field} cannot exceed ${rules.max}`,
          type: 'range'
        };
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        return {
          valid: false,
          error: `${field} must be one of: ${rules.enum.join(', ')}`,
          type: 'enum'
        };
      }

      // Format validation
      if (rules.format) {
        const formatValid = this.validateFormat(value, rules.format);
        if (!formatValid) {
          return {
            valid: false,
            error: `${field} has invalid format for ${rules.format}`,
            type: 'format'
          };
        }
      }

      return { valid: true };
    }

    validateFormat(value, format) {
      const formats = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        membership: /^MEM-\d{4}-\d{4}$/,
        date: /^\d{4}-\d{2}-\d{2}$/,
        datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      };

      const regex = formats[format];
      return regex ? regex.test(value) : true;
    }

    generateFieldValue(field, rules) {
      const generators = {
        id: () => `${field.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: () => new Date().toISOString(),
        updatedAt: () => new Date().toISOString(),
        paymentDate: () => new Date().toISOString(),
        uploadDate: () => new Date().toISOString()
      };

      const generator = generators[field];
      return generator ? generator() : null;
    }

    validateBulkInsert(table, records) {
      const results = {
        valid: [],
        invalid: [],
        summary: {
          total: records.length,
          valid: 0,
          invalid: 0,
          errors: {}
        }
      };

      records.forEach((record, index) => {
        const validation = this.validateRequiredFields(table, record);

        if (validation.valid) {
          results.valid.push({
            index,
            record: validation.processed
          });
          results.summary.valid++;
        } else {
          results.invalid.push({
            index,
            record,
            errors: validation.errors
          });
          results.summary.invalid++;

          // Track error types
          validation.errors.forEach(error => {
            const key = `${error.field}:${error.type}`;
            results.summary.errors[key] = (results.summary.errors[key] || 0) + 1;
          });
        }
      });

      return results;
    }
  }

  describe('Required Field Operations', () => {
    let validator;

    beforeEach(() => {
      validator = new RequiredFieldValidator();
    });

    test('should validate all required fields for members', () => {
      // Missing required fields
      const invalidMember = {
        name: 'Ali'
      };

      const validation = validator.validateRequiredFields('members', invalidMember);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual({
        field: 'email',
        error: 'email is required',
        type: 'missing'
      });
      expect(validation.errors).toContainEqual({
        field: 'membershipNumber',
        error: 'membershipNumber is required',
        type: 'missing'
      });

      // Valid member with all required fields
      const validMember = {
        name: 'Ali Hassan',
        email: 'ali@example.com',
        membershipNumber: 'MEM-2025-0001'
      };

      const validValidation = validator.validateRequiredFields('members', validMember);
      expect(validValidation.valid).toBe(true);
      expect(validValidation.processed.status).toBe('active'); // Default value
      expect(validValidation.processed.id).toBeDefined(); // Auto-generated
      expect(validValidation.processed.createdAt).toBeDefined(); // Auto-generated
    });

    test('should validate field formats and constraints', () => {
      // Invalid email format
      const invalidEmail = {
        name: 'Test User',
        email: 'invalid-email',
        membershipNumber: 'MEM-2025-0001'
      };

      const emailValidation = validator.validateRequiredFields('members', invalidEmail);
      expect(emailValidation.valid).toBe(false);
      expect(emailValidation.errors[0].error).toContain('invalid format for email');

      // Invalid membership number format
      const invalidMembership = {
        name: 'Test User',
        email: 'test@example.com',
        membershipNumber: 'INVALID'
      };

      const membershipValidation = validator.validateRequiredFields('members', invalidMembership);
      expect(membershipValidation.valid).toBe(false);
      expect(membershipValidation.errors[0].error).toContain('invalid format for membership');

      // Name too short
      const shortName = {
        name: 'A',
        email: 'test@example.com',
        membershipNumber: 'MEM-2025-0001'
      };

      const nameValidation = validator.validateRequiredFields('members', shortName);
      expect(nameValidation.valid).toBe(false);
      expect(nameValidation.errors[0].error).toContain('must be at least 2 characters');
    });

    test('should validate payment required fields with constraints', () => {
      // Invalid payment - missing required fields
      const invalidPayment = {
        amount: -10
      };

      const validation = validator.validateRequiredFields('payments', invalidPayment);
      expect(validation.valid).toBe(false);

      const errorFields = validation.errors.map(e => e.field);
      expect(errorFields).toContain('memberId');
      expect(errorFields).toContain('currency');

      // Amount validation
      expect(validation.errors).toContainEqual({
        field: 'amount',
        error: 'amount must be at least 0.01',
        type: 'range'
      });

      // Valid payment
      const validPayment = {
        memberId: 'MEM-001',
        amount: 150.50,
        currency: 'SAR'
      };

      const validValidation = validator.validateRequiredFields('payments', validPayment);
      expect(validValidation.valid).toBe(true);
      expect(validValidation.processed.status).toBe('pending'); // Default
      expect(validValidation.processed.paymentDate).toBeDefined(); // Auto-generated

      // Invalid currency enum
      const invalidCurrency = {
        memberId: 'MEM-001',
        amount: 100,
        currency: 'BTC'
      };

      const currencyValidation = validator.validateRequiredFields('payments', invalidCurrency);
      expect(currencyValidation.valid).toBe(false);
      expect(currencyValidation.errors[0].error).toContain('must be one of: SAR, KWD, USD, EUR');
    });

    test('should handle bulk insert validation', () => {
      const bulkMembers = [
        {
          name: 'Valid Member 1',
          email: 'valid1@example.com',
          membershipNumber: 'MEM-2025-0001'
        },
        {
          name: 'V', // Too short
          email: 'valid2@example.com',
          membershipNumber: 'MEM-2025-0002'
        },
        {
          name: 'Valid Member 3',
          email: 'invalid-email', // Invalid format
          membershipNumber: 'MEM-2025-0003'
        },
        {
          name: 'Valid Member 4',
          email: 'valid4@example.com',
          membershipNumber: 'MEM-2025-0004'
        }
      ];

      const results = validator.validateBulkInsert('members', bulkMembers);

      expect(results.summary.total).toBe(4);
      expect(results.summary.valid).toBe(2);
      expect(results.summary.invalid).toBe(2);

      // Check valid records
      expect(results.valid).toHaveLength(2);
      expect(results.valid[0].index).toBe(0);
      expect(results.valid[1].index).toBe(3);

      // Check invalid records
      expect(results.invalid).toHaveLength(2);
      expect(results.invalid[0].index).toBe(1);
      expect(results.invalid[0].errors[0].field).toBe('name');
      expect(results.invalid[1].index).toBe(2);
      expect(results.invalid[1].errors[0].field).toBe('email');

      // Check error summary
      expect(results.summary.errors['name:length']).toBe(1);
      expect(results.summary.errors['email:format']).toBe(1);
    });
  });
});