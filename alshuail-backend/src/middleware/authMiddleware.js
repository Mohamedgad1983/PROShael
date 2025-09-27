// Simple auth middleware for development
export const authenticateToken = (req, res, next) => {
  // For development, we'll allow all requests
  next();
};

export const authorize = (roles) => {
  return (req, res, next) => {
    // For development, we'll allow all roles
    next();
  };
};

export default {
  authenticateToken,
  authorize
};