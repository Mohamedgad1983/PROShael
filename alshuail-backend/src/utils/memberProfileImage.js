/**
 * Resolve the canonical member photo written by the mobile upload endpoint.
 * `photo_url` is retained only as a fallback for older imported records.
 */
export function resolveMemberProfileImage(member) {
  const value = member?.profile_image_url || member?.photo_url || null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
