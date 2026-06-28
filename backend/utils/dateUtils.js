/**
 * Helper to safely convert an AI-generated local time string to a true UTC Date object
 * using the user's browser timezone offset.
 * 
 * @param {string} localIsoString - The time string from Gemini (e.g., '2026-06-28T21:00:00')
 * @param {string} timezoneOffset - The user's browser offset (e.g., '+05:30' or '-04:00')
 * @returns {Date} - A JavaScript Date object perfectly aligned to UTC
 */
function parseLocalToUTC(localIsoString, timezoneOffset) {
  if (!localIsoString) return new Date();

  // 1. Ensure string is exactly 19 chars (YYYY-MM-DDTHH:mm:ss) 
  // removing any Z, timezone offset, or milliseconds Gemini might have appended
  let naiveIso = localIsoString;
  if (naiveIso.includes('Z')) naiveIso = naiveIso.split('Z')[0];
  if (naiveIso.includes('+')) naiveIso = naiveIso.split('+')[0];
  if (naiveIso.length > 19 && naiveIso.includes('-') && naiveIso.lastIndexOf('-') > 10) {
     naiveIso = naiveIso.substring(0, naiveIso.lastIndexOf('-'));
  }
  if (naiveIso.includes('.')) naiveIso = naiveIso.split('.')[0];
  
  // 2. Parse the offset into minutes
  const offsetMatch = (timezoneOffset || '+00:00').match(/^([+-])(\d{2}):?(\d{2})$/);
  const offsetMinutes = offsetMatch 
    ? (offsetMatch[1] === '+' ? 1 : -1) * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]))
    : 0;

  // 3. Force JavaScript to parse the naive string as UTC by explicitly appending 'Z'
  const forcedUtcMs = new Date(`${naiveIso}Z`).getTime();

  // 4. Mathematically shift by the user's offset to get the TRUE UTC time
  return new Date(forcedUtcMs - offsetMinutes * 60000);
}

module.exports = {
  parseLocalToUTC
};
