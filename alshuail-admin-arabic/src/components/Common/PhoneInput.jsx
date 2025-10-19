import React, { useState, useCallback, memo } from 'react';
import { PhoneIcon } from '@heroicons/react/24/outline';
import { validatePhone, formatPhone, COUNTRY_CODES, getPhoneFormatDescription } from '../../utils/phoneValidator';

const PhoneInput = memo(({
  value = '',
  onChange,
  onValidationChange,
  label = 'رقم الهاتف',
  required = false,
  defaultCountry = 'SA',
  allowCountrySelection = true,
  className = ''
}) => {
  const [country, setCountry] = useState(defaultCountry);
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);

  const handlePhoneChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Validate
    const valid = validatePhone(newValue, country);
    setIsValid(valid);

    if (onValidationChange) {
      onValidationChange(valid, newValue, country);
    }
  }, [country, onChange, onValidationChange]);

  const handleCountryChange = useCallback((e) => {
    const newCountry = e.target.value;
    setCountry(newCountry);

    // Re-validate with new country
    const valid = validatePhone(value, newCountry);
    setIsValid(valid);

    if (onValidationChange) {
      onValidationChange(valid, value, newCountry);
    }
  }, [value, onValidationChange]);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const showError = touched && !isValid && value.length > 0;

  return (
    <div className={`phone-input-container ${className}`}>
      {label && (
        <label className="phone-input-label">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}

      <div className="phone-input-wrapper">
        {allowCountrySelection && (
          <select
            value={country}
            onChange={handleCountryChange}
            className="country-select"
            aria-label="اختر الدولة"
          >
            {Object.entries(COUNTRY_CODES).map(([code, config]) => (
              <option key={code} value={code}>
                {config.flag} {config.nameAr} (+{config.code})
              </option>
            ))}
          </select>
        )}

        <div className="phone-input-field">
          <PhoneIcon className="phone-icon" />
          <input
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            onBlur={handleBlur}
            placeholder={COUNTRY_CODES[country].placeholder}
            className={`phone-input ${showError ? 'error' : ''} ${isValid && value ? 'valid' : ''}`}
            dir="ltr"
            aria-invalid={showError}
            aria-describedby={showError ? 'phone-error' : undefined}
          />
        </div>
      </div>

      {showError && (
        <div id="phone-error" className="phone-error-message">
          ⚠️ {getPhoneFormatDescription(country)}
        </div>
      )}

      {isValid && value && (
        <div className="phone-success-message">
          ✅ {formatPhone(value, country, true)}
        </div>
      )}

      <style jsx>{`
        .phone-input-container {
          margin-bottom: 1rem;
        }

        .phone-input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .phone-input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: stretch;
        }

        .country-select {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background-color: white;
          cursor: pointer;
          min-width: 140px;
          transition: border-color 0.2s;
        }

        .country-select:hover {
          border-color: #9ca3af;
        }

        .country-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .phone-input-field {
          position: relative;
          flex: 1;
        }

        .phone-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9ca3af;
          pointer-events: none;
        }

        .phone-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .phone-input:hover {
          border-color: #9ca3af;
        }

        .phone-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .phone-input.error {
          border-color: #ef4444;
          background-color: #fef2f2;
        }

        .phone-input.valid {
          border-color: #10b981;
        }

        .phone-error-message {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .phone-success-message {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      `}</style>
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;