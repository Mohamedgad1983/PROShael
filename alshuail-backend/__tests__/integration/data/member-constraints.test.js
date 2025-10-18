/**
 * Member Constraints Tests
 * Phase 2: Data Integrity Testing - Member Constraints (4 tests)
 */

import { jest } from '@jest/globals';

describe('Member Data Integrity Tests', () => {
  class MemberDataValidator {
    constructor() {
      this.members = new Map();
      this.uniqueConstraints = {
        email: new Set(),
        phone: new Set(),
        nationalId: new Set()
      };
    }

    validateMemberConstraints(memberData) {
      const errors = [];

      // Required field validation
      const requiredFields = ['name', 'email', 'membershipNumber'];
      requiredFields.forEach(field => {
        if (!memberData[field]) {
          errors.push(`${field} is required`);
        }
      });

      // Name constraints
      if (memberData.name) {
        if (memberData.name.length < 2) {
          errors.push('Name must be at least 2 characters');
        }
        if (memberData.name.length > 100) {
          errors.push('Name cannot exceed 100 characters');
        }
        // Arabic and English names allowed
        const namePattern = /^[\u0600-\u06FF\u0750-\u077Fa-zA-Z\s\-'.]+$/;
        if (!namePattern.test(memberData.name)) {
          errors.push('Name contains invalid characters');
        }
      }

      // Email validation
      if (memberData.email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(memberData.email)) {
          errors.push('Invalid email format');
        }
      }

      // Phone validation
      if (memberData.phone) {
        // Saudi/Kuwait phone patterns
        const phonePattern = /^(\+966|0)?5\d{8}$|^(\+965|0)?[569]\d{7}$/;
        if (!phonePattern.test(memberData.phone)) {
          errors.push('Invalid phone number format (Saudi/Kuwait)');
        }
      }

      // Membership number format
      if (memberData.membershipNumber) {
        const membershipPattern = /^MEM-\d{4}-\d{4}$/;
        if (!membershipPattern.test(memberData.membershipNumber)) {
          errors.push('Invalid membership number format (MEM-XXXX-XXXX)');
        }
      }

      // Birth date validation
      if (memberData.birthDate) {
        const birthDate = new Date(memberData.birthDate);
        const now = new Date();
        const age = (now - birthDate) / (365.25 * 24 * 60 * 60 * 1000);

        if (age < 0) {
          errors.push('Birth date cannot be in the future');
        }
        if (age > 150) {
          errors.push('Invalid birth date (too old)');
        }
      }

      return errors;
    }

    enforceUniqueConstraints(memberData) {
      const violations = [];

      // Check email uniqueness
      if (memberData.email && this.uniqueConstraints.email.has(memberData.email)) {
        violations.push({
          field: 'email',
          value: memberData.email,
          constraint: 'unique',
          message: `Email ${memberData.email} already exists`
        });
      }

      // Check phone uniqueness
      if (memberData.phone && this.uniqueConstraints.phone.has(memberData.phone)) {
        violations.push({
          field: 'phone',
          value: memberData.phone,
          constraint: 'unique',
          message: `Phone ${memberData.phone} already exists`
        });
      }

      // Check national ID uniqueness
      if (memberData.nationalId && this.uniqueConstraints.nationalId.has(memberData.nationalId)) {
        violations.push({
          field: 'nationalId',
          value: memberData.nationalId,
          constraint: 'unique',
          message: `National ID ${memberData.nationalId} already exists`
        });
      }

      return violations;
    }

    saveMember(memberData) {
      // Validate constraints
      const errors = this.validateMemberConstraints(memberData);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
      }

      // Check unique constraints
      const violations = this.enforceUniqueConstraints(memberData);
      if (violations.length > 0) {
        throw new Error(`Unique constraint violation: ${violations[0].message}`);
      }

      // Save member
      const memberId = memberData.id || `MEM-${Date.now()}`;
      this.members.set(memberId, {
        ...memberData,
        id: memberId,
        createdAt: new Date().toISOString()
      });

      // Update unique constraint sets
      if (memberData.email) this.uniqueConstraints.email.add(memberData.email);
      if (memberData.phone) this.uniqueConstraints.phone.add(memberData.phone);
      if (memberData.nationalId) this.uniqueConstraints.nationalId.add(memberData.nationalId);

      return memberId;
    }
  }

  describe('Member Constraint Operations', () => {
    let validator;

    beforeEach(() => {
      validator = new MemberDataValidator();
    });

    test('should validate required member fields', () => {
      // Missing required fields
      const invalidMember = {
        phone: '+966501234567'
      };

      const errors = validator.validateMemberConstraints(invalidMember);
      expect(errors).toContain('name is required');
      expect(errors).toContain('email is required');
      expect(errors).toContain('membershipNumber is required');

      // Valid member
      const validMember = {
        name: 'أحمد محمد',
        email: 'ahmad@example.com',
        membershipNumber: 'MEM-2025-0001'
      };

      const noErrors = validator.validateMemberConstraints(validMember);
      expect(noErrors).toHaveLength(0);
    });

    test('should enforce unique constraints on member data', () => {
      // First member
      const member1 = {
        name: 'Ali Hassan',
        email: 'ali@example.com',
        phone: '+966501234567',
        nationalId: '1234567890',
        membershipNumber: 'MEM-2025-0001'
      };

      const id1 = validator.saveMember(member1);
      expect(id1).toBeDefined();

      // Try to save duplicate email
      const duplicateEmail = {
        name: 'Another Person',
        email: 'ali@example.com', // Duplicate
        phone: '+966509876543',
        membershipNumber: 'MEM-2025-0002'
      };

      expect(() => validator.saveMember(duplicateEmail))
        .toThrow('Unique constraint violation: Email ali@example.com already exists');

      // Try to save duplicate phone
      const duplicatePhone = {
        name: 'Third Person',
        email: 'third@example.com',
        phone: '+966501234567', // Duplicate
        membershipNumber: 'MEM-2025-0003'
      };

      expect(() => validator.saveMember(duplicatePhone))
        .toThrow('Unique constraint violation: Phone +966501234567 already exists');
    });

    test('should validate member name with Arabic and English characters', () => {
      // Valid Arabic name
      const arabicMember = {
        name: 'محمد عبد الله الشعيل',
        email: 'mohammed@example.com',
        membershipNumber: 'MEM-2025-0001'
      };

      expect(validator.validateMemberConstraints(arabicMember)).toHaveLength(0);

      // Valid English name
      const englishMember = {
        name: 'John Smith-Williams',
        email: 'john@example.com',
        membershipNumber: 'MEM-2025-0002'
      };

      expect(validator.validateMemberConstraints(englishMember)).toHaveLength(0);

      // Mixed Arabic-English name
      const mixedMember = {
        name: 'Ahmed أحمد Hassan',
        email: 'ahmed@example.com',
        membershipNumber: 'MEM-2025-0003'
      };

      expect(validator.validateMemberConstraints(mixedMember)).toHaveLength(0);

      // Invalid characters
      const invalidName = {
        name: 'Name@123#',
        email: 'invalid@example.com',
        membershipNumber: 'MEM-2025-0004'
      };

      const errors = validator.validateMemberConstraints(invalidName);
      expect(errors).toContain('Name contains invalid characters');
    });

    test('should validate Saudi and Kuwait phone numbers', () => {
      // Valid Saudi numbers
      const saudiNumbers = [
        '+966501234567',
        '0501234567',
        '+966551234567',
        '0591234567'
      ];

      saudiNumbers.forEach(phone => {
        const member = {
          name: 'Test User',
          email: `test${phone}@example.com`,
          phone: phone,
          membershipNumber: 'MEM-2025-0001'
        };
        expect(validator.validateMemberConstraints(member)).toHaveLength(0);
      });

      // Valid Kuwait numbers
      const kuwaitNumbers = [
        '+96551234567',
        '+96560123456',
        '+96599123456'
      ];

      kuwaitNumbers.forEach(phone => {
        const member = {
          name: 'Test User',
          email: `test${phone}@example.com`,
          phone: phone,
          membershipNumber: 'MEM-2025-0002'
        };
        expect(validator.validateMemberConstraints(member)).toHaveLength(0);
      });

      // Invalid phone numbers
      const invalidNumbers = [
        '+1234567890', // Wrong country
        '123456', // Too short
        'notanumber' // Not a number
      ];

      invalidNumbers.forEach(phone => {
        const member = {
          name: 'Test User',
          email: 'test@example.com',
          phone: phone,
          membershipNumber: 'MEM-2025-0003'
        };
        const errors = validator.validateMemberConstraints(member);
        expect(errors).toContain('Invalid phone number format (Saudi/Kuwait)');
      });
    });
  });
});