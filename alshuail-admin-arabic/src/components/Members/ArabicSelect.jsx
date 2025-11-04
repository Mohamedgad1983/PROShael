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
    <div className={`form-group arabic-select-container ${isOpen ? 'dropdown-open' : ''}`}>
      <label className="form-label">
        <span className="label-icon">🏛️</span>
        <span>{label}</span>
      </label>
      <div ref={wrapperRef} className="custom-select-wrapper select-wrapper" style={{ position: 'relative', isolation: 'isolate' }}>
        <div
          className="form-input custom-select-display enhanced-dropdown"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            cursor: 'pointer',
            position: 'relative',
            paddingLeft: '45px',
            backgroundColor: 'white',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{
            color: displayValue ? '#2d3748' : '#a0aec0',
            fontSize: '16px',
            fontFamily: 'inherit'
          }}>
            {displayValue || placeholder}
          </span>
          <span className="select-arrow" style={{
            position: 'absolute',
            left: '18px',
            fontSize: '18px',
            color: '#667eea',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
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
              border: '2px solid #667eea',
              borderRadius: '12px',
              marginTop: '4px',
              maxHeight: '250px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
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
            {options && options.length > 0 ? options.map((option) => (
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
            )) : null}
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