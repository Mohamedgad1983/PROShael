/**
 * Dynamic Minimum-Amount Validator
 *
 * Resolves the minimum acceptable payment amount from the DB at request time,
 * per payment category, instead of relying on the hardcoded MIN_AMOUNT in
 * payment-validator.js. This way the floor auto-adjusts when plans change.
 *
 * Categories supported:
 *   - 'subscription' → min(base_amount) from active subscription_plans
 *   - 'initiative'   → reasonable absolute floor (plans' targets aren't a
 *                      per-contribution minimum, so keep a safety floor)
 *   - 'diya'         → reasonable absolute floor
 *   - 'for_member'   → smallest active subscription plan (same as subscription)
 *
 * Cached for 5 minutes via cacheService (Redis with in-memory fallback).
 * If the DB query errors, falls back to ABSOLUTE_FLOOR_SAR.
 *
 * Usage in routes/payments.js:
 *   router.post('/mobile/subscription',
 *     requireRole(['member']),
 *     validateMinimumAmount('subscription'),
 *     validatePaymentInitiation,
 *     paySubscription
 *   );
 */

import { query } from '../services/database.js';
import cacheService from '../services/cacheService.js';
import { log } from '../utils/logger.js';

// Absolute safety floor — no payment below this ever accepted
const ABSOLUTE_FLOOR_SAR = 1;

// Cache TTL in seconds
const CACHE_TTL = 300; // 5 minutes

/**
 * Resolve the minimum amount for a given category.
 * Returns ABSOLUTE_FLOOR_SAR on error so validation never blocks indefinitely.
 *
 * @param {string} category - 'subscription' | 'initiative' | 'diya' | 'for_member'
 * @returns {Promise<number>} minimum acceptable amount in SAR
 */
export async function getMinimumAmountForCategory(category) {
  const cacheKey = `min_amount:${category}`;

  try {
    const cached = await cacheService.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Number(cached);
    }
  } catch (e) {
    // Cache errors shouldn't break the flow
    log.warn('Cache lookup failed for min amount', { category, error: e.message });
  }

  let min = ABSOLUTE_FLOOR_SAR;

  try {
    switch (category) {
      case 'subscription':
      case 'for_member': {
        // Smallest active subscription plan
        const { rows } = await query(
          `SELECT MIN(base_amount) AS min_amount
             FROM subscription_plans
            WHERE is_active = TRUE
              AND base_amount > 0`
        );
        const dbMin = Number(rows?.[0]?.min_amount);
        if (Number.isFinite(dbMin) && dbMin > 0) {
          min = Math.max(ABSOLUTE_FLOOR_SAR, dbMin);
        }
        break;
      }
      case 'initiative':
      case 'diya':
        // Campaigns/diyas don't define a per-contribution minimum. Use a
        // sensible floor until we add a dedicated column (e.g. min_contribution).
        min = ABSOLUTE_FLOOR_SAR;
        break;
      default:
        min = ABSOLUTE_FLOOR_SAR;
    }

    try {
      await cacheService.set(cacheKey, min, CACHE_TTL);
    } catch (e) {
      log.warn('Cache write failed for min amount', { category, error: e.message });
    }

    return min;
  } catch (err) {
    log.error('Failed to resolve dynamic min amount; using floor', {
      category,
      error: err.message
    });
    return ABSOLUTE_FLOOR_SAR;
  }
}

/**
 * Express middleware factory — enforces the dynamic minimum for the given category.
 * Rejects the request with 400 if `req.body.amount` is below the current minimum.
 * Also attaches `req.dynamicMinAmount` so downstream handlers can reference it.
 *
 * @param {string} category
 * @returns {Function} Express middleware
 */
export function validateMinimumAmount(category) {
  return async function dynamicAmountMiddleware(req, res, next) {
    try {
      const rawAmount = req.body?.amount;
      const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;

      if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        // Let the downstream payment-validator produce the canonical error.
        // We only care about the minimum floor here.
        return next();
      }

      const min = await getMinimumAmountForCategory(category);
      req.dynamicMinAmount = min;

      if (amount < min) {
        return res.status(400).json({
          success: false,
          message: `الحد الأدنى للمبلغ هو ${min} ريال سعودي`,
          message_en: `Minimum amount is ${min} SAR`,
          error_code: 'AMOUNT_BELOW_MINIMUM',
          min_amount: min,
          category
        });
      }

      return next();
    } catch (err) {
      log.error('dynamicAmountMiddleware error', { error: err.message, category });
      // Don't block on middleware error — pass through to next validator
      return next();
    }
  };
}

/**
 * Invalidate the cached min for a category (or all if no arg).
 * Call this after admin edits subscription plans so the new minimum is picked
 * up immediately instead of waiting for TTL.
 */
export async function invalidateMinAmountCache(category) {
  const keys = category
    ? [`min_amount:${category}`]
    : ['min_amount:subscription', 'min_amount:for_member',
       'min_amount:initiative',   'min_amount:diya'];
  await Promise.all(
    keys.map((k) => {
      if (typeof cacheService.del !== 'function') return null;
      try {
        const out = cacheService.del(k);
        return out && typeof out.catch === 'function'
          ? out.catch(() => null)
          : out;
      } catch {
        return null;
      }
    })
  );
}

export const __internals = { ABSOLUTE_FLOOR_SAR, CACHE_TTL };
