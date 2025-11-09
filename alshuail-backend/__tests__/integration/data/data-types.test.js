/**
 * Data Type Validation Tests
 * Phase 2: Data Integrity Testing - Data Types (3 tests)
 */

import { jest } from '@jest/globals';

describe('Data Type Validation Tests', () => {
  class DataTypeValidator {
    constructor() {
      this.typeDefinitions = {
        string: {
          validate: (value) => typeof value === 'string',
          sanitize: (value) => String(value),
          constraints: ['minLength', 'maxLength', 'pattern', 'enum']
        },
        number: {
          validate: (value) => typeof value === 'number' && !isNaN(value) && isFinite(value),
          sanitize: (value) => Number(value),
          constraints: ['min', 'max', 'integer', 'precision']
        },
        boolean: {
          validate: (value) => typeof value === 'boolean',
          sanitize: (value) => Boolean(value),
          constraints: []
        },
        date: {
          validate: (value) => value instanceof Date || !isNaN(Date.parse(value)),
          sanitize: (value) => new Date(value).toISOString(),
          constraints: ['min', 'max', 'future', 'past']
        },
        array: {
          validate: (value) => Array.isArray(value),
          sanitize: (value) => Array.isArray(value) ? value : [value],
          constraints: ['minItems', 'maxItems', 'itemType', 'unique']
        },
        object: {
          validate: (value) => typeof value === 'object' && !Array.isArray(value) && value !== null,
          sanitize: (value) => typeof value === 'object' ? value : {},
          constraints: ['schema', 'required', 'additionalProperties']
        },
        json: {
          validate: (value) => {
            try {
              JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
              return true;
            } catch {
              return false;
            }
          },
          sanitize: (value) => {
            if (typeof value === 'string') {
              return JSON.parse(value);
            }
            return JSON.parse(JSON.stringify(value));
          },
          constraints: ['schema']
        },
        decimal: {
          validate: (value) => {
            if (typeof value === 'string') {
              return /^-?\d+(\.\d+)?$/.test(value);
            }
            return typeof value === 'number' && !isNaN(value);
          },
          sanitize: (value) => parseFloat(value),
          constraints: ['precision', 'scale', 'min', 'max']
        }
      };
    }

    validateType(value, type, constraints = {}) {
      const typeDef = this.typeDefinitions[type];
      if (!typeDef) {
        return { valid: false, error: `Unknown type: ${type}` };
      }

      // Basic type validation
      if (!typeDef.validate(value)) {
        return {
          valid: false,
          error: `Value is not a valid ${type}`,
          received: typeof value
        };
      }

      // Apply constraints
      const constraintErrors = this.applyConstraints(value, type, constraints);
      if (constraintErrors.length > 0) {
        return {
          valid: false,
          error: constraintErrors[0],
          constraints: constraintErrors
        };
      }

      return { valid: true, sanitized: typeDef.sanitize(value) };
    }

    applyConstraints(value, type, constraints) {
      const errors = [];

      switch (type) {
        case 'string':
          if (constraints.minLength && value.length < constraints.minLength) {
            errors.push(`String length must be at least ${constraints.minLength}`);
          }
          if (constraints.maxLength && value.length > constraints.maxLength) {
            errors.push(`String length cannot exceed ${constraints.maxLength}`);
          }
          if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
            errors.push(`String does not match required pattern`);
          }
          if (constraints.enum && !constraints.enum.includes(value)) {
            errors.push(`Value must be one of: ${constraints.enum.join(', ')}`);
          }
          break;

        case 'number':
        case 'decimal':
          if (constraints.min !== undefined && value < constraints.min) {
            errors.push(`Value must be at least ${constraints.min}`);
          }
          if (constraints.max !== undefined && value > constraints.max) {
            errors.push(`Value cannot exceed ${constraints.max}`);
          }
          if (constraints.integer && !Number.isInteger(value)) {
            errors.push('Value must be an integer');
          }
          if (constraints.precision) {
            const digits = value.toString().replace(/[^\d]/g, '').length;
            if (digits > constraints.precision) {
              errors.push(`Value exceeds precision of ${constraints.precision} digits`);
            }
          }
          if (constraints.scale) {
            const decimalPart = value.toString().split('.')[1];
            if (decimalPart && decimalPart.length > constraints.scale) {
              errors.push(`Decimal places exceed scale of ${constraints.scale}`);
            }
          }
          break;

        case 'date': {
          const dateValue = new Date(value);
          const now = new Date();
          if (constraints.min) {
            const minDate = new Date(constraints.min);
            if (dateValue < minDate) {
              errors.push(`Date must be after ${minDate.toISOString()}`);
            }
          }
          if (constraints.max) {
            const maxDate = new Date(constraints.max);
            if (dateValue > maxDate) {
              errors.push(`Date must be before ${maxDate.toISOString()}`);
            }
          }
          if (constraints.future && dateValue <= now) {
            errors.push('Date must be in the future');
          }
          if (constraints.past && dateValue >= now) {
            errors.push('Date must be in the past');
          }
          break;
        }

        case 'array':
          if (constraints.minItems && value.length < constraints.minItems) {
            errors.push(`Array must have at least ${constraints.minItems} items`);
          }
          if (constraints.maxItems && value.length > constraints.maxItems) {
            errors.push(`Array cannot have more than ${constraints.maxItems} items`);
          }
          if (constraints.unique) {
            const uniqueValues = new Set(value);
            if (uniqueValues.size !== value.length) {
              errors.push('Array must contain unique values');
            }
          }
          if (constraints.itemType) {
            value.forEach((item, index) => {
              const itemValidation = this.validateType(item, constraints.itemType);
              if (!itemValidation.valid) {
                errors.push(`Item at index ${index}: ${itemValidation.error}`);
              }
            });
          }
          break;
      }

      return errors;
    }

    coerceType(value, targetType) {
      const typeDef = this.typeDefinitions[targetType];
      if (!typeDef) {
        return { success: false, error: `Unknown type: ${targetType}` };
      }

      try {
        const coerced = typeDef.sanitize(value);
        if (typeDef.validate(coerced)) {
          return { success: true, value: coerced };
        }
        return { success: false, error: `Cannot coerce to ${targetType}` };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    validateSchema(data, schema) {
      const errors = [];
      const validated = {};

      for (const [field, definition] of Object.entries(schema)) {
        const value = data[field];

        if (value === undefined || value === null) {
          if (definition.required) {
            errors.push({
              field,
              error: `${field} is required`
            });
          }
          continue;
        }

        const validation = this.validateType(value, definition.type, definition.constraints || {});
        if (!validation.valid) {
          errors.push({
            field,
            error: validation.error,
            details: validation.constraints
          });
        } else {
          validated[field] = validation.sanitized;
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        data: validated
      };
    }
  }

  describe('Data Type Operations', () => {
    let validator;

    beforeEach(() => {
      validator = new DataTypeValidator();
    });

    test('should validate and coerce basic data types', () => {
      // String validation
      expect(validator.validateType('hello', 'string').valid).toBe(true);
      expect(validator.validateType(123, 'string').valid).toBe(false);

      // Number validation
      expect(validator.validateType(42, 'number').valid).toBe(true);
      expect(validator.validateType('42', 'number').valid).toBe(false);
      expect(validator.validateType(NaN, 'number').valid).toBe(false);
      expect(validator.validateType(Infinity, 'number').valid).toBe(false);

      // Boolean validation
      expect(validator.validateType(true, 'boolean').valid).toBe(true);
      expect(validator.validateType(false, 'boolean').valid).toBe(true);
      expect(validator.validateType(1, 'boolean').valid).toBe(false);

      // Date validation
      expect(validator.validateType(new Date(), 'date').valid).toBe(true);
      expect(validator.validateType('2025-01-01', 'date').valid).toBe(true);
      expect(validator.validateType('invalid-date', 'date').valid).toBe(false);

      // Array validation
      expect(validator.validateType([1, 2, 3], 'array').valid).toBe(true);
      expect(validator.validateType('not-array', 'array').valid).toBe(false);

      // Type coercion
      const stringCoerce = validator.coerceType(123, 'string');
      expect(stringCoerce.success).toBe(true);
      expect(stringCoerce.value).toBe('123');

      const numberCoerce = validator.coerceType('42.5', 'number');
      expect(numberCoerce.success).toBe(true);
      expect(numberCoerce.value).toBe(42.5);

      const dateCoerce = validator.coerceType('2025-01-15', 'date');
      expect(dateCoerce.success).toBe(true);
      expect(dateCoerce.value).toContain('2025-01-15');
    });

    test('should validate complex constraints on data types', () => {
      // String with constraints
      const stringConstraints = {
        minLength: 5,
        maxLength: 10,
        pattern: '^[A-Z]',
        enum: ['ACTIVE', 'INACTIVE', 'PENDING']
      };

      const shortString = validator.validateType('Hi', 'string', { minLength: 5 });
      expect(shortString.valid).toBe(false);
      expect(shortString.error).toContain('must be at least 5');

      const longString = validator.validateType('This is too long', 'string', { maxLength: 10 });
      expect(longString.valid).toBe(false);
      expect(longString.error).toContain('cannot exceed 10');

      const patternString = validator.validateType('lowercase', 'string', { pattern: '^[A-Z]' });
      expect(patternString.valid).toBe(false);
      expect(patternString.error).toContain('does not match required pattern');

      const enumString = validator.validateType('ACTIVE', 'string', { enum: ['ACTIVE', 'INACTIVE'] });
      expect(enumString.valid).toBe(true);

      // Number with constraints
      const rangeNumber = validator.validateType(5, 'number', { min: 1, max: 10 });
      expect(rangeNumber.valid).toBe(true);

      const outOfRange = validator.validateType(15, 'number', { min: 1, max: 10 });
      expect(outOfRange.valid).toBe(false);

      const integerOnly = validator.validateType(3.14, 'number', { integer: true });
      expect(integerOnly.valid).toBe(false);
      expect(integerOnly.error).toContain('must be an integer');

      // Decimal with precision and scale
      const decimal = validator.validateType(123.45, 'decimal', { precision: 5, scale: 2 });
      expect(decimal.valid).toBe(true);

      const tooMuchPrecision = validator.validateType(123456.78, 'decimal', { precision: 5 });
      expect(tooMuchPrecision.valid).toBe(false);

      const tooMuchScale = validator.validateType(123.456, 'decimal', { scale: 2 });
      expect(tooMuchScale.valid).toBe(false);

      // Array with constraints
      const uniqueArray = validator.validateType([1, 2, 2, 3], 'array', { unique: true });
      expect(uniqueArray.valid).toBe(false);
      expect(uniqueArray.error).toContain('unique values');

      const typedArray = validator.validateType([1, '2', 3], 'array', { itemType: 'number' });
      expect(typedArray.valid).toBe(false);

      const sizedArray = validator.validateType([1, 2], 'array', { minItems: 3 });
      expect(sizedArray.valid).toBe(false);
    });

    test('should validate complete data schemas', () => {
      const memberSchema = {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true, constraints: { minLength: 2, maxLength: 100 } },
        age: { type: 'number', required: false, constraints: { min: 0, max: 150, integer: true } },
        email: { type: 'string', required: true },
        isActive: { type: 'boolean', required: true },
        joinDate: { type: 'date', required: true },
        tags: { type: 'array', required: false, constraints: { itemType: 'string', unique: true } },
        balance: { type: 'decimal', required: true, constraints: { precision: 10, scale: 2 } }
      };

      // Valid data
      const validData = {
        id: 'MEM-001',
        name: 'Ali Hassan',
        age: 30,
        email: 'ali@example.com',
        isActive: true,
        joinDate: '2025-01-01',
        tags: ['premium', 'verified'],
        balance: 1250.50
      };

      const validResult = validator.validateSchema(validData, memberSchema);
      expect(validResult.valid).toBe(true);
      expect(validResult.data.name).toBe('Ali Hassan');
      expect(validResult.data.balance).toBe(1250.50);

      // Invalid data
      const invalidData = {
        id: 'MEM-002',
        name: 'A', // Too short
        age: 200, // Too old
        email: 'invalid',
        isActive: 'yes', // Wrong type
        joinDate: 'not-a-date',
        tags: ['tag1', 'tag1'], // Duplicates
        balance: 12345678901.123 // Exceeds precision and scale
      };

      const invalidResult = validator.validateSchema(invalidData, memberSchema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      const errorFields = invalidResult.errors.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('age');
      expect(errorFields).toContain('isActive');
      expect(errorFields).toContain('joinDate');
    });
  });
});