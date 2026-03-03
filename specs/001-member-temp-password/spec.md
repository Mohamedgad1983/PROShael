# Feature Specification: Temporary Password Login for All Members

**Feature Branch**: `001-member-temp-password`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "Add temporary password 123456 for all members so they can login to mobile app, then change password from their account. Remove WhatsApp OTP login per Apple review team request."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Member Logs In with Temporary Password (Priority: P1)

A family member who has never set a personal password opens the mobile app and sees a login screen with phone number and password fields. They enter their phone number and the default temporary password "123456". The system authenticates them and immediately redirects them to a password change screen, requiring them to set a new personal password before accessing the app.

**Why this priority**: This is the core feature - without password-based login, members cannot access the app. WhatsApp OTP is being removed per Apple's review team request, making this the sole login method.

**Independent Test**: Can be fully tested by entering a member's phone number + "123456" on the login screen and verifying successful authentication followed by forced password change redirect.

**Acceptance Scenarios**:

1. **Given** a member with no personal password set, **When** they enter their phone number and "123456" on the login screen, **Then** they are authenticated and redirected to a mandatory password change screen.
2. **Given** a member with no personal password set, **When** they enter their phone number and an incorrect password, **Then** they see an error message in Arabic indicating invalid credentials.
3. **Given** a member on the forced password change screen, **When** they attempt to navigate away without changing password, **Then** they are blocked and must complete the password change first.

---

### User Story 2 - Member Changes Password from Account (Priority: P1)

After being forced to change their temporary password (or at any time later), a member can access a "Change Password" option from the Settings page. They enter their current password and a new password (with confirmation), and the system updates their credentials.

**Why this priority**: Equal to P1 because the temporary password flow requires password change to complete. Members also need ongoing ability to update their password.

**Independent Test**: Can be tested by navigating to Settings > Change Password, entering current and new password, and verifying the new password works on next login.

**Acceptance Scenarios**:

1. **Given** a logged-in member on the Settings page, **When** they tap "Change Password", **Then** they see a form with current password, new password, and confirm password fields.
2. **Given** a member on the Change Password form, **When** they submit valid current password and a new password meeting strength requirements, **Then** the password is updated and a success confirmation is shown.
3. **Given** a member on the Change Password form, **When** they enter a wrong current password, **Then** they see an error message and the password is not changed.
4. **Given** a member on the Change Password form, **When** new password and confirmation don't match, **Then** they see a validation error before submission.

---

### User Story 3 - Member Logs In with Personal Password (Priority: P2)

A member who has already changed their temporary password to a personal one can log in using their phone number and personal password. They are taken directly to the dashboard without any forced password change prompt.

**Why this priority**: Natural follow-on from P1 - once a member has set their password, subsequent logins should work smoothly.

**Independent Test**: Can be tested by logging in with a phone number and previously-set personal password, verifying direct access to dashboard.

**Acceptance Scenarios**:

1. **Given** a member who has already set a personal password, **When** they enter phone number and personal password, **Then** they are authenticated and taken directly to the dashboard.
2. **Given** a member who has set a personal password, **When** they enter the old temporary password "123456", **Then** authentication fails with an error message.

---

### User Story 4 - Admin Resets Member Password (Priority: P2)

When a member forgets their password, they contact a family admin. The admin can reset the member's password back to the temporary "123456" from the admin dashboard, which re-enables the forced password change flow on next login.

**Why this priority**: With WhatsApp OTP removed, there is no self-service password recovery. Admin reset is the necessary fallback for forgotten passwords.

**Independent Test**: Can be tested by an admin resetting a member's password in the admin panel, then the member logging in with "123456" and being forced to set a new one.

**Acceptance Scenarios**:

1. **Given** an admin on the member details page, **When** they click "Reset Password", **Then** the member's password is reset to "123456" and the "requires password change" flag is set.
2. **Given** a member whose password was reset by admin, **When** they log in with "123456", **Then** they are redirected to the forced password change screen.

---

### Edge Cases

- What happens when a member enters the wrong password 5 times? Account is temporarily locked for 15 minutes to prevent brute force attacks.
- What happens when a member forgets their personal password? They contact a family admin who can reset their password back to "123456" via the admin dashboard.
- What happens when a new member is added to the system after the initial bulk password setup? New members should also receive the default temporary password "123456" with the forced change flag.
- What happens if the password change screen is interrupted (app crash, network loss)? The member remains in "must change password" state and will be prompted again on next login.
- What happens when a member tries to set "123456" as their new password? The system rejects it - new password must differ from the temporary one and meet minimum strength requirements.
- What happens to the existing WhatsApp OTP login code? It is fully removed from the mobile app login screen per Apple's requirement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST set a temporary password "123456" for all existing members who do not already have a personal password set.
- **FR-002**: System MUST mark all members receiving the temporary password with a "requires password change" flag.
- **FR-003**: Mobile app login screen MUST use phone number and password as the sole authentication method (WhatsApp OTP removed per Apple review).
- **FR-004**: System MUST authenticate members using their phone number and password.
- **FR-005**: System MUST redirect members with the "requires password change" flag to a mandatory password change screen immediately after login.
- **FR-006**: System MUST prevent members from accessing any app content until they change their temporary password.
- **FR-007**: Mobile app MUST provide a "Change Password" option accessible from the Settings page.
- **FR-008**: Password change form MUST require current password, new password, and password confirmation.
- **FR-009**: System MUST enforce minimum password strength: at least 8 characters, including uppercase, lowercase, and numbers.
- **FR-010**: System MUST lock an account after 5 consecutive failed login attempts for 15 minutes.
- **FR-011**: System MUST clear the "requires password change" flag after successful password update.
- **FR-012**: System MUST display all login and password-related messages in Arabic.
- **FR-013**: New members added after the initial setup MUST also receive the default temporary password with the forced change flag.
- **FR-014**: Admin dashboard MUST provide a "Reset Password" action (super_admin role only) on member details that resets the password to "123456" and sets the forced change flag.
- **FR-015**: System MUST remove all WhatsApp OTP login functionality from the mobile app.

### Key Entities

- **Member Password**: Represents a member's authentication credentials. Linked to a member record. Tracks whether the password is temporary or personally set, last update timestamp, and failed attempt count.
- **Password Change Request**: Represents a member's action to update their password. Contains current password verification, new password, and audit timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing members (347+) can log in to the mobile app using phone number and temporary password "123456" on first attempt.
- **SC-002**: 100% of members logging in with the temporary password are redirected to the password change screen before accessing any content.
- **SC-003**: Members can complete the password change process in under 1 minute.
- **SC-004**: After changing password, members can log in with their new personal password on the next attempt.
- **SC-005**: No WhatsApp OTP login option exists in the mobile app (Apple compliance).
- **SC-006**: Account lockout activates after exactly 5 failed password attempts and unlocks after 15 minutes.
- **SC-007**: All password-related screens display correctly in Arabic RTL layout.
- **SC-008**: Admins can reset a member's password in under 30 seconds from the member details page.

## Assumptions

- The temporary password "123456" is acceptable for initial rollout since members will be forced to change it immediately.
- Password strength requirements (8+ chars, uppercase, lowercase, numbers) provide adequate security for a family fund app.
- Members who already have a personal password set will not be affected by the bulk password setup.
- Admin-assisted password reset is sufficient for forgotten passwords in a family fund context (no self-service recovery needed).
- Account lockout of 15 minutes after 5 failed attempts balances security with usability for family members.
- Apple's review team requires removal of WhatsApp OTP as a login method from the mobile app.
