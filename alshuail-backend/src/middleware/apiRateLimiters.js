import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

const retryAfterSeconds = (req) => {
  const resetTime = req.rateLimit?.resetTime;
  if (!(resetTime instanceof Date)) {
    return 60;
  }
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
};

const arabicRateLimitHandler = (req, res) => {
  const retryAfter = retryAfterSeconds(req);
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({
    success: false,
    code: 'RATE_LIMITED',
    error: 'تم إرسال طلبات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
    retry_after_seconds: retryAfter
  });
};

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: arabicRateLimitHandler
};

// Reads and writes use independent counters. Previously every dashboard refresh,
// notification fetch, and image/data request consumed the same 2,000-request
// bucket as a payment/contribution submission. On shared mobile/Wi-Fi IPs this
// could block a valid contribution before it reached authentication.
export const createAdaptiveApiLimiter = ({
  windowMs = FIFTEEN_MINUTES_MS,
  readMax = 12_000,
  writeMax = 2_000
} = {}) => {
  const readLimiter = rateLimit({
    ...commonOptions,
    windowMs,
    max: readMax
  });

  const writeLimiter = rateLimit({
    ...commonOptions,
    windowMs,
    max: writeMax
  });

  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return readLimiter(req, res, next);
    }
    return writeLimiter(req, res, next);
  };
};

export const adaptiveApiLimiter = createAdaptiveApiLimiter();

// This limiter is mounted after authenticateToken, so it is keyed by the
// authenticated member rather than the shared public IP. Failed validation does
// not consume the member's allowance, while successful submissions are capped
// to prevent accidental/replayed rapid contributions.
export const initiativeContributionLimiter = rateLimit({
  ...commonOptions,
  windowMs: ONE_MINUTE_MS,
  max: 5,
  keyGenerator: (req) => `member:${req.user?.id || req.user?.user_id || 'unknown'}`,
  skipFailedRequests: true
});

export const rateLimitResponse = {
  retryAfterSeconds,
  arabicRateLimitHandler
};
