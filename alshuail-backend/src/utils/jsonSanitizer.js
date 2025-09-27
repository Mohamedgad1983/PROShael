// Utility to sanitize JSON data and prevent parsing errors
export const sanitizeJSON = (data) => {
  // If data is already an object (parsed by Express), return it as-is
  if (typeof data === 'object' && data !== null) {
    return data;
  }

  // Only parse if it's actually a string
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse JSON string:', error);
      return {};
    }
  }

  return data;
};

export const prepareUpdateData = (data) => {
  const result = {};

  // List of valid fields
  const validFields = [
    'full_name', 'phone', 'email', 'national_id', 'gender',
    'tribal_section', 'date_of_birth', 'nationality', 'city',
    'district', 'address', 'occupation', 'employer',
    'membership_status', 'membership_type', 'membership_date',
    'membership_number', 'notes', 'profile_completed'
  ];

  validFields.forEach(field => {
    if (field in data) {
      const value = data[field];

      // Handle null or undefined - convert to null for database (not empty string)
      if (value === undefined || value === null || value === '') {
        result[field] = null;
      } else if (typeof value === 'string') {
        // Trim whitespace but preserve the actual content
        const trimmed = value.trim();
        result[field] = trimmed === '' ? null : trimmed;
      } else {
        result[field] = value;
      }
    }
  });

  // Add timestamp
  result.updated_at = new Date().toISOString();

  return result;
};