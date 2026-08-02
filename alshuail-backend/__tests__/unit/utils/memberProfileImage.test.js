import { describe, expect, test } from '@jest/globals';
import { resolveMemberProfileImage } from '../../../src/utils/memberProfileImage.js';

describe('resolveMemberProfileImage', () => {
  test('returns the durable profile_image_url saved by mobile uploads', () => {
    expect(resolveMemberProfileImage({
      profile_image_url: '/api/uploads/member-documents/member-1/member-photos/photo.jpg',
      photo_url: '/legacy.jpg',
    })).toBe('/api/uploads/member-documents/member-1/member-photos/photo.jpg');
  });

  test('falls back to legacy photo_url and rejects empty values', () => {
    expect(resolveMemberProfileImage({ profile_image_url: '', photo_url: '/legacy.jpg' }))
      .toBe('/legacy.jpg');
    expect(resolveMemberProfileImage({ profile_image_url: '   ' })).toBeNull();
    expect(resolveMemberProfileImage(null)).toBeNull();
  });
});
