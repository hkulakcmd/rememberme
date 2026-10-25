const FALLBACK = [
  'UTC',
  'Europe/Warsaw',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Kyiv',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function listTimezones() {
  try {
    const values = Intl.supportedValuesOf('timeZone');
    return values.includes('UTC') ? values : ['UTC', ...values];
  } catch {
    return FALLBACK;
  }
}
