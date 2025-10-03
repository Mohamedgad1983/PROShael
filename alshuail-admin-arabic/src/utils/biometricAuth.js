/**
 * ============================================
 * AL-SHUAIL MOBILE PWA
 * Biometric Authentication Utility
 * ============================================
 * Supports: Face ID (iOS), Touch ID (iOS), Fingerprint (Android)
 * Uses: Web Authentication API (WebAuthn)
 * ============================================
 */

/**
 * Check if biometric authentication is available on this device
 * @returns {Promise<boolean>} True if biometric is available
 */
export const isBiometricAvailable = async () => {
  try {
    // Check if browser supports Web Authentication API
    if (!window.PublicKeyCredential) {
      console.log('Web Authentication API not supported');
      return false;
    }

    // Check if platform authenticator is available (Face ID, Touch ID, Fingerprint)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    console.log('Biometric available:', available);
    return available;

  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Get device-specific biometric type name
 * @returns {string} Name of biometric type
 */
export const getBiometricType = () => {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(userAgent)) {
    // iOS device - could be Face ID or Touch ID
    // iPhone X and later have Face ID
    if (/iPhone (X|1[1-9]|[2-9][0-9])/.test(userAgent)) {
      return 'Face ID';
    }
    return 'Touch ID';
  } else if (/Android/.test(userAgent)) {
    return 'البصمة';
  }

  return 'البصمة البيومترية';
};

/**
 * Register biometric authentication for a user
 * @param {string} userId - User's unique ID
 * @param {string} userName - User's display name
 * @returns {Promise<{success: boolean, credentialId?: string, error?: string}>}
 */
export const registerBiometric = async (userId, userName) => {
  try {
    // Generate random challenge (in production, this should come from server)
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Create credential options
    const credentialCreationOptions = {
      publicKey: {
        challenge: challenge,
        rp: {
          name: "Al-Shuail Family",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" } // RS256
        },
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use device biometric only
          requireResidentKey: false,
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    };

    // Create credential
    const credential = await navigator.credentials.create(credentialCreationOptions);

    if (!credential) {
      throw new Error('فشل إنشاء بيانات الاعتماد');
    }

    // Store credential ID in localStorage
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem('biometric_credential_id', credentialId);
    localStorage.setItem('biometric_enabled', 'true');
    localStorage.setItem('biometric_user_id', userId);

    console.log('Biometric registration successful');

    return {
      success: true,
      credentialId: credentialId
    };

  } catch (error) {
    console.error('Biometric registration error:', error);

    let errorMessage = 'فشل تسجيل البصمة';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'تم إلغاء العملية أو رفض الإذن';
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'البصمة غير مدعومة على هذا الجهاز';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Authenticate user using biometric
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export const authenticateBiometric = async () => {
  try {
    const credentialId = localStorage.getItem('biometric_credential_id');
    const userId = localStorage.getItem('biometric_user_id');

    if (!credentialId || !userId) {
      throw new Error('البصمة غير مسجلة. الرجاء تسجيل الدخول بكلمة المرور أولاً');
    }

    // Generate random challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Get credential options
    const credentialRequestOptions = {
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
          type: 'public-key',
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: "required"
      }
    };

    // Authenticate
    const assertion = await navigator.credentials.get(credentialRequestOptions);

    if (!assertion) {
      throw new Error('فشل التحقق البيومتري');
    }

    console.log('Biometric authentication successful');

    return {
      success: true,
      userId: userId
    };

  } catch (error) {
    console.error('Biometric authentication error:', error);

    let errorMessage = 'فشل التحقق البيومتري';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'تم إلغاء العملية أو فشل التحقق';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'البصمة غير مسجلة';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = () => {
  localStorage.removeItem('biometric_credential_id');
  localStorage.removeItem('biometric_enabled');
  localStorage.removeItem('biometric_user_id');
  console.log('Biometric authentication disabled');
};

/**
 * Check if biometric is currently enabled
 * @returns {boolean} True if enabled
 */
export const isBiometricEnabled = () => {
  return localStorage.getItem('biometric_enabled') === 'true';
};

/**
 * Get stored user ID for biometric auth
 * @returns {string|null} User ID or null
 */
export const getBiometricUserId = () => {
  return localStorage.getItem('biometric_user_id');
};
