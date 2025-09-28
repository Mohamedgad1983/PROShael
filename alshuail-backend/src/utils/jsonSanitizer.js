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

  // List of valid fields that exist in the database
  // Removed 'district' as it doesn't exist in the schema
  const validFields = [
    'full_name', 'phone', 'email', 'national_id', 'gender',
    'tribal_section', 'date_of_birth', 'nationality', 'city',
    'address', 'occupation', 'employer',
    'membership_status', 'membership_type', 'membership_date',
    'membership_number', 'notes', 'profile_completed'
  ];

  validFields.forEach(field => {
    if (field in data) {
      const value = data[field];

      // Special handling for date fields
      if ((field === 'date_of_birth' || field === 'membership_date') &&
          (value === '' || value === undefined || value === null)) {
        result[field] = null;
      }
      // Special handling for gender field
      else if (field === 'gender' && value) {
        result[field] = value.toLowerCase().trim();
      }
      // Special handling for tribal_section field
      else if (field === 'tribal_section' && value) {
        result[field] = value.trim();
      }
      // Handle empty strings and null values
      else if (value === undefined || value === null || value === '') {
        result[field] = null;
      }
      // Handle string values
      else if (typeof value === 'string') {
        const trimmed = value.trim();
        result[field] = trimmed === '' ? null : trimmed;
      }
      // Keep other values as-is
      else {
        result[field] = value;
      }
    }
  });

  // Add timestamp
  result.updated_at = new Date().toISOString();

  return result;
};