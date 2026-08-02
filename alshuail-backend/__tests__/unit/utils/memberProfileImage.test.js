import { describe, expect, test } from '@jest/globals';
import { resolveMemberProfileImage } from '../../../src/utils/memberProfileImage.js';

describe('resolveMemberProfileImage', () => {
  test('returns the durable profile_image_url saved by mobile uploads', () => {
    expect(resolveMemberProfileImage({
      profile_image_url: '/api/uploads/member-documents/member-1/member-photos/photo.jpg',
    })).toBe('/api/uploads/member-documents/member-1/member-photos/photo.jpg');
  });

  test('rejects empty and missing values', () => {
    expect(resolveMemberProfileImage({ profile_image_url: '   ' })).toBeNull();
    expect(resolveMemberProfileImage(null)).toBeNull();
  });
});
