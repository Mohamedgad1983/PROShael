/**
 * Resolve the canonical member photo written by the mobile upload endpoint.
 * The production members table stores this value in `profile_image_url`.
 */
export function resolveMemberProfileImage(member) {
  const value = member?.profile_image_url || null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
