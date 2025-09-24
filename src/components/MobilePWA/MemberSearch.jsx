/**
 * MemberSearch Component
 * Auto-complete member search for pay-on-behalf functionality
 * Optimized for mobile touch interaction with Arabic RTL support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { paymentService } from './PaymentService.js';
import '../../styles/pwa-emergency-fix.css';

const MemberSearch = ({
  onMemberSelect,
  selectedMember,
  excludeMemberId,
  placeholder = "ابحث عن عضو...",
  className = "",
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setMembers([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const results = await paymentService.searchMembers(searchQuery, excludeMemberId);
      setMembers(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1);
    } catch (err) {
      setError('فشل في البحث عن الأعضاء');
      setMembers([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [excludeMemberId]);

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 300);
  };

  // Handle member selection
  const handleMemberSelect = (member) => {
    setQuery(member.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onMemberSelect(member);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || members.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < members.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : members.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && members[highlightedIndex]) {
          handleMemberSelect(members[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Clear search when selectedMember changes externally
  useEffect(() => {
    if (selectedMember) {
      setQuery(selectedMember.name);
    } else {
      setQuery('');
    }
  }, [selectedMember]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const formatBalance = (balance) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(balance);
  };

  const getBalanceStatus = (member) => {
    if (member.hasMinimumBalance) {
      return {
        text: 'رصيد كافي',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '✓'
      };
    } else {
      return {
        text: 'رصيد غير كافي',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '⚠️'
      };
    }
  };

  return (
    <div className={`relative ${className}`} dir="rtl">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && members.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-12 pl-4 text-right
            border-2 rounded-xl transition-all duration-200
            bg-white text-gray-800 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-300'}
            ${error ? 'border-red-300' : 'border-gray-200'}
            ${selectedMember ? 'border-green-300 bg-green-50' : ''}
          `}
          autoComplete="off"
        />

        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Selected Member Indicator */}
        {selectedMember && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="flex items-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto"
        >
          {members.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20v-2a3 3 0 00-3-3H8a3 3 0 00-3 3v2m7-10a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <p>لا توجد نتائج</p>
              <p className="text-xs text-gray-400 mt-1">جرب البحث بالاسم أو رقم العضوية</p>
            </div>
          ) : (
            <ul className="py-2">
              {members.map((member, index) => {
                const balanceStatus = getBalanceStatus(member);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li key={member.id}>
                    <button
                      onClick={() => handleMemberSelect(member)}
                      className={`
                        w-full text-right px-4 py-3 transition-colors duration-150
                        hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                        ${isHighlighted ? 'bg-blue-50' : ''}
                        ${!member.hasMinimumBalance ? 'opacity-75' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                  {member.name.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Member Details */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {member.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  #{member.membershipNumber}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500" dir="ltr">
                                  {member.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Balance Status */}
                        <div className="flex-shrink-0 mr-3">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${balanceStatus.bgColor} ${balanceStatus.color}`}>
                            <span className="ml-1">{balanceStatus.icon}</span>
                            <span>{formatBalance(member.balance)}</span>
                          </div>
                          <div className={`text-xs mt-1 ${balanceStatus.color}`}>
                            {balanceStatus.text}
                          </div>
                        </div>
                      </div>

                      {/* Minimum Balance Warning */}
                      {!member.hasMinimumBalance && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center text-xs text-amber-600">
                            <span className="ml-1">⚠️</span>
                            <span>العضو لا يملك الحد الأدنى من الرصيد (3000 ريال)</span>
                          </div>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Helper Text */}
      {!selectedMember && !error && (
        <div className="mt-2 text-xs text-gray-500">
          اكتب على الأقل حرفين للبحث عن الأعضاء
        </div>
      )}
    </div>
  );
};

export default MemberSearch;