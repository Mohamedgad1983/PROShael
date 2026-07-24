/// Numeric coercion helpers for values coming from the backend API.
///
/// PostgreSQL (via the Express API) frequently serialises numeric columns as
/// strings, e.g. `"50000.00"`, while other endpoints return native numbers.
/// A hard `as double` cast or `.toDouble()` on a String throws at runtime, so
/// all money/amount fields decoded from JSON should go through [asDouble].
double asDouble(dynamic value, [double fallback = 0.0]) {
  if (value == null) return fallback;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim()) ?? fallback;
  return fallback;
}

/// Integer variant of [asDouble] for count-like fields.
int asInt(dynamic value, [int fallback = 0]) {
  if (value == null) return fallback;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value.trim()) ?? asDouble(value, fallback.toDouble()).toInt();
  return fallback;
}
