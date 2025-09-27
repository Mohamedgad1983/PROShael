// Utility to sanitize JSON data and prevent parsing errors
export const sanitizeJSON = (data) => {
  if (typeof data === 'string') {
    try {
      // Remove problematic characters
      const cleaned = data
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/"/g, '\\"') // Escape quotes
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse JSON after sanitization:', error);
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
      // Convert undefined or null to empty string for database
      if (data[field] === undefined || data[field] === null) {
        result[field] = '';
      } else if (typeof data[field] === 'string') {
        // Clean string values
        result[field] = data[field].trim();
      } else {
        result[field] = data[field];
      }
    }
  });

  // Add timestamp
  result.updated_at = new Date().toISOString();

  return result;
};