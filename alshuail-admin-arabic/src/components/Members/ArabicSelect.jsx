import React, { useState, useEffect, useRef } from 'react';

const ArabicSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = "اختر...",
  name,
  id
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Map value to display text
  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.value === value);
      if (option) {
        setDisplayValue(option.label);
      } else {
        // If value doesn't match any option, show the value itself
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value, options]);

  const handleSelect = (optionValue, optionLabel) => {
    onChange({ target: { value: optionValue, name } });
    setDisplayValue(optionLabel);
    setIsOpen(false);
  };

  return (
    <div className="form-group arabic-select-container">
      <label>{label}</label>
      <div ref={wrapperRef} className="custom-select-wrapper" style={{ position: 'relative' }}>
        <div
          className="form-input custom-select-display"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            cursor: 'pointer',
            position: 'relative',
            paddingLeft: '35px',
            backgroundColor: 'white',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{
            color: displayValue ? '#1f2937' : '#9ca3af',
            fontSize: '15px',
            fontFamily: 'system-ui, -apple-system, Arial, sans-serif'
          }}>
            {displayValue || placeholder}
          </span>
          <svg
            style={{
              position: 'absolute',
              left: '10px',
              width: '20px',
              height: '20px',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div
            className="custom-select-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div
              className="custom-select-option"
              onClick={() => handleSelect('', '')}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {placeholder}
            </div>
            {options.map((option) => (
              <div
                key={option.value}
                className="custom-select-option"
                onClick={() => handleSelect(option.value, option.label)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  color: '#1f2937',
                  fontSize: '15px',
                  fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
                  backgroundColor: value === option.value ? '#eff6ff' : 'white',
                  fontWeight: value === option.value ? '600' : '400'
                }}
                onMouseEnter={(e) => {
                  if (value !== option.value) {
                    e.target.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option.value) {
                    e.target.style.backgroundColor = 'white';
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden native select for form compatibility */}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e)}
        style={{ display: 'none' }}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

export default ArabicSelect;