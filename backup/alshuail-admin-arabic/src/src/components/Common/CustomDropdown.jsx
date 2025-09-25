import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder = 'اختر',
  required = false,
  width = '100%'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    setSelectedValue(optionValue);
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width }}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 14px',
          border: '3px solid #000080',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '900',
          color: '#FFFFFF',
          backgroundColor: '#000080',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          fontFamily: 'Arial Black, Helvetica, sans-serif'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#0000A0';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#000080';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <span style={{
          fontSize: '18px',
          fontWeight: '900',
          color: '#FFFFFF',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          style={{
            width: '24px',
            height: '24px',
            color: '#FFFFFF',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#FFFFFF',
          border: '3px solid #000080',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 99999
        }}>
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              style={{
                padding: '14px 18px',
                fontSize: '18px',
                fontWeight: '800',
                color: '#000080',
                cursor: 'pointer',
                borderBottom: index < options.length - 1 ? '2px solid #E0E0E0' : 'none',
                backgroundColor: selectedValue === option.value ? '#FFD700' : '#FFFFFF',
                transition: 'all 0.15s ease',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (selectedValue !== option.value) {
                  e.target.style.backgroundColor = '#F0F0FF';
                  e.target.style.color = '#000080';
                  e.target.style.fontWeight = '900';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedValue !== option.value) {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.color = '#000080';
                  e.target.style.fontWeight = '800';
                } else {
                  e.target.style.backgroundColor = '#FFD700';
                  e.target.style.color = '#000080';
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;