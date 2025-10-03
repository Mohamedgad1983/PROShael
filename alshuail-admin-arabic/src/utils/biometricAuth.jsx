// Biometric Auth - Simplified version (Complex version has build issues)

export const isBiometricAvailable = async () => {
  return false; // Disabled for now
};

export const getBiometricType = () => {
  return 'البصمة';
};

export const registerBiometric = async (userId, userName) => {
  return { success: false, error: 'قريباً' };
};

export const authenticateBiometric = async () => {
  return { success: false, error: 'قريباً' };
};

export const disableBiometric = () => {
  localStorage.removeItem('biometric_credential_id');
  localStorage.removeItem('biometric_enabled');
  localStorage.removeItem('biometric_user_id');
};

export const isBiometricEnabled = () => {
  return false;
};

export const getBiometricUserId = () => {
  return null;
};
