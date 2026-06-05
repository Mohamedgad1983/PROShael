import crypto from 'crypto';

export const LEGACY_DEFAULT_PASSWORD = '123456';

const TEMP_PASSWORD_LENGTH = 14;
const TEMP_PASSWORD_CHARSETS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%^&*'
];
const TEMP_PASSWORD_ALPHABET = TEMP_PASSWORD_CHARSETS.join('');

const randomCharacter = (characters) => characters[crypto.randomInt(0, characters.length)];

const shuffleCharacters = (characters) => {
  for (let i = characters.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters;
};

export const generateTemporaryPassword = () => {
  const passwordCharacters = TEMP_PASSWORD_CHARSETS.map(randomCharacter);

  for (let i = passwordCharacters.length; i < TEMP_PASSWORD_LENGTH; i++) {
    passwordCharacters.push(randomCharacter(TEMP_PASSWORD_ALPHABET));
  }

  return shuffleCharacters(passwordCharacters).join('');
};

export const validateStrongPassword = (password) => {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      message_en: 'Password must be at least 8 characters'
    };
  }

  if (password === LEGACY_DEFAULT_PASSWORD) {
    return {
      valid: false,
      message: 'لا يمكن استخدام كلمة المرور الافتراضية القديمة',
      message_en: 'The legacy default password cannot be used'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل',
      message_en: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل',
      message_en: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل',
      message_en: 'Password must contain at least one number'
    };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل',
      message_en: 'Password must contain at least one special character'
    };
  }

  return { valid: true };
};
