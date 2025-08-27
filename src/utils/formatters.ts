/**
 * Safely formats a number or string as a localized number string
 * @param value - The value to format (number, string, or other)
 * @param fallback - Fallback string when value cannot be parsed (default: 'N/A')
 * @returns Formatted number string or fallback
 */
export function formatNumber(value: any, fallback: string = 'N/A'): string {
  if (typeof value === 'number' && !isNaN(value)) {
    return value.toLocaleString();
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed.toLocaleString();
    }
  }
  
  return fallback;
}

/**
 * Safely formats a number or string with abbreviated suffixes (K, M, B)
 * @param value - The value to format
 * @param fallback - Fallback string when value cannot be parsed
 * @returns Formatted number string with suffix or fallback
 */
export function formatNumberShort(value: any, fallback: string = 'N/A'): string {
  let num: number;
  
  if (typeof value === 'number' && !isNaN(value)) {
    num = value;
  } else if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      num = parsed;
    } else {
      return fallback;
    }
  } else {
    return fallback;
  }
  
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}