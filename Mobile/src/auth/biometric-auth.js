/**
 * Biometric Authentication - Al-Shuail Mobile PWA
 * Phase 1: WebAuthn Implementation
 *
 * Features:
 * - Biometric registration (fingerprint, Face ID, face unlock)
 * - Biometric login flow
 * - Fallback to OTP authentication
 * - Device credential management
 * - Platform authenticator support (iOS, Android)
 */

class BiometricAuth {
  constructor() {
    this.config = {
      rpName: 'Al-Shuail Family Fund',
      rpId: window.location.hostname,
      apiUrl: import.meta.env.VITE_API_URL || 'https://proshael.onrender.com',
      timeout: 60000, // 60 seconds
      attestation: 'none', // none, indirect, direct
      authenticatorAttachment: 'platform', // platform (built-in), cross-platform (external)
      userVerification: 'required', // required, preferred, discouraged
    };

    // Feature detection
    this.isSupported = this.checkSupport();

    // Error messages
    this.errors = {
      notSupported: {
        ar: 'المصادقة البيومترية غير مدعومة على هذا الجهاز',
        en: 'Biometric authentication not supported on this device'
      },
      registrationFailed: {
        ar: 'فشل تسجيل بصمة الإصبع',
        en: 'Biometric registration failed'
      },
      authenticationFailed: {
        ar: 'فشلت المصادقة البيومترية',
        en: 'Biometric authentication failed'
      },
      userCancelled: {
        ar: 'تم إلغاء العملية',
        en: 'Operation cancelled'
      },
      networkError: {
        ar: 'خطأ في الاتصال',
        en: 'Network error'
      }
    };
  }

  /**
   * Check if WebAuthn is supported
   * @returns {boolean} - True if supported
   */
  checkSupport() {
    if (!window.PublicKeyCredential) {
      console.warn('[BiometricAuth] WebAuthn not supported');
      return false;
    }

    console.log('[BiometricAuth] WebAuthn is supported');
    return true;
  }

  /**
   * Check if platform authenticator is available (biometric)
   * @returns {Promise<boolean>} - True if available
   */
  async isPlatformAuthenticatorAvailable() {
    if (!this.isSupported) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('[BiometricAuth] Platform authenticator available:', available);
      return available;
    } catch (error) {
      console.error('[BiometricAuth] Error checking platform authenticator:', error);
      return false;
    }
  }

  /**
   * Register biometric credential
   * @param {string} userId - User ID
   * @param {string} userName - User name or phone
   * @param {string} lang - Language preference
   * @returns {Promise<Object>} - Registration result
   */
  async registerBiometric(userId, userName, lang = 'ar') {
    try {
      // Check support
      if (!this.isSupported) {
        return {
          success: false,
          error: this.errors.notSupported[lang],
          errorCode: 'NOT_SUPPORTED'
        };
      }

      // Check platform authenticator
      const isAvailable = await this.isPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: this.errors.notSupported[lang],
          errorCode: 'AUTHENTICATOR_NOT_AVAILABLE'
        };
      }

      // Get challenge from server
      const challengeResponse = await fetch(`${this.config.apiUrl}/api/auth/biometric/register-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, userName })
      });

      if (!challengeResponse.ok) {
        throw new Error(`HTTP ${challengeResponse.status}`);
      }

      const challengeData = await challengeResponse.json();

      // Create credential
      const publicKeyCredentialCreationOptions = {
        challenge: this.base64ToArrayBuffer(challengeData.challenge),
        rp: {
          name: this.config.rpName,
          id: this.config.rpId,
        },
        user: {
          id: this.stringToArrayBuffer(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: this.config.authenticatorAttachment,
          userVerification: this.config.userVerification,
        },
        timeout: this.config.timeout,
        attestation: this.config.attestation,
      };

      console.log('[BiometricAuth] Creating credential...');

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      console.log('[BiometricAuth] Credential created:', credential);

      // Send credential to server for verification
      const verifyResponse = await fetch(`${this.config.apiUrl}/api/auth/biometric/register-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          credential: {
            id: credential.id,
            rawId: this.arrayBufferToBase64(credential.rawId),
            response: {
              clientDataJSON: this.arrayBufferToBase64(credential.response.clientDataJSON),
              attestationObject: this.arrayBufferToBase64(credential.response.attestationObject),
            },
            type: credential.type,
          }
        })
      });

      if (!verifyResponse.ok) {
        throw new Error(`HTTP ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();

      return {
        success: true,
        message: lang === 'ar'
          ? 'تم تسجيل بصمة الإصبع بنجاح'
          : 'Biometric registered successfully',
        credentialId: credential.id
      };

    } catch (error) {
      console.error('[BiometricAuth] Registration error:', error);

      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: this.errors.userCancelled[lang],
          errorCode: 'USER_CANCELLED'
        };
      }

      return {
        success: false,
        error: this.errors.registrationFailed[lang],
        errorCode: 'REGISTRATION_FAILED',
        details: error.message
      };
    }
  }

  /**
   * Authenticate with biometric
   * @param {string} lang - Language preference
   * @returns {Promise<Object>} - Authentication result with token
   */
  async authenticateWithBiometric(lang = 'ar') {
    try {
      // Check support
      if (!this.isSupported) {
        return {
          success: false,
          error: this.errors.notSupported[lang],
          errorCode: 'NOT_SUPPORTED'
        };
      }

      // Get challenge from server
      const challengeResponse = await fetch(`${this.config.apiUrl}/api/auth/biometric/auth-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!challengeResponse.ok) {
        throw new Error(`HTTP ${challengeResponse.status}`);
      }

      const challengeData = await challengeResponse.json();

      // Get credential
      const publicKeyCredentialRequestOptions = {
        challenge: this.base64ToArrayBuffer(challengeData.challenge),
        timeout: this.config.timeout,
        rpId: this.config.rpId,
        userVerification: this.config.userVerification,
        allowCredentials: challengeData.allowCredentials?.map(cred => ({
          type: 'public-key',
          id: this.base64ToArrayBuffer(cred.id),
        })) || [],
      };

      console.log('[BiometricAuth] Requesting credential...');

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      console.log('[BiometricAuth] Credential obtained:', assertion);

      // Send assertion to server for verification
      const verifyResponse = await fetch(`${this.config.apiUrl}/api/auth/biometric/auth-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: assertion.id,
            rawId: this.arrayBufferToBase64(assertion.rawId),
            response: {
              clientDataJSON: this.arrayBufferToBase64(assertion.response.clientDataJSON),
              authenticatorData: this.arrayBufferToBase64(assertion.response.authenticatorData),
              signature: this.arrayBufferToBase64(assertion.response.signature),
              userHandle: assertion.response.userHandle
                ? this.arrayBufferToBase64(assertion.response.userHandle)
                : null,
            },
            type: assertion.type,
          }
        })
      });

      if (!verifyResponse.ok) {
        throw new Error(`HTTP ${verifyResponse.status}`);
      }

      const verifyData = await verifyResponse.json();

      return {
        success: true,
        message: lang === 'ar'
          ? 'تم تسجيل الدخول بنجاح'
          : 'Authentication successful',
        token: verifyData.token,
        user: verifyData.user
      };

    } catch (error) {
      console.error('[BiometricAuth] Authentication error:', error);

      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: this.errors.userCancelled[lang],
          errorCode: 'USER_CANCELLED'
        };
      }

      return {
        success: false,
        error: this.errors.authenticationFailed[lang],
        errorCode: 'AUTHENTICATION_FAILED',
        details: error.message
      };
    }
  }

  /**
   * Check if user has registered biometric credential
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - True if registered
   */
  async hasRegisteredBiometric(userId) {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/auth/biometric/check-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.registered || false;

    } catch (error) {
      console.error('[BiometricAuth] Check registration error:', error);
      return false;
    }
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   * @param {ArrayBuffer} buffer - ArrayBuffer to convert
   * @returns {string} - Base64 string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   * @param {string} base64 - Base64 string
   * @returns {ArrayBuffer} - ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Utility: Convert string to ArrayBuffer
   * @param {string} str - String to convert
   * @returns {ArrayBuffer} - ArrayBuffer
   */
  stringToArrayBuffer(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Get device info for debugging
   * @returns {Object} - Device and browser info
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      webAuthnSupported: this.isSupported,
      languages: navigator.languages,
    };
  }
}

// Export singleton instance
const biometricAuth = new BiometricAuth();
export default biometricAuth;
