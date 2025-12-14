export type City = 'London' | 'Sydney' | 'Melbourne' | 'New York';

interface CityData {
  timezone: string;
  country: string;
  emoji: string;
  coordinates: { lat: number; lng: number };
}

export const CITY_DATA: Record<City, CityData> = {
  'London': {
    timezone: 'Europe/London',
    country: 'United Kingdom',
    emoji: '🇬🇧',
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
  'Sydney': {
    timezone: 'Australia/Sydney',
    country: 'Australia',
    emoji: '🦘',
    coordinates: { lat: -33.8688, lng: 151.2093 },
  },
  'Melbourne': {
    timezone: 'Australia/Melbourne',
    country: 'Australia',
    emoji: '☕',
    coordinates: { lat: -37.8136, lng: 144.9631 },
  },
  'New York': {
    timezone: 'America/New_York',
    country: 'United States',
    emoji: '🗽',
    coordinates: { lat: 40.7128, lng: -74.0060 },
  },
};

/**
 * Get current local time for a city
 */
export const getCityTime = (city: City): Date => {
  const timezone = CITY_DATA[city].timezone;
  const now = new Date();
  
  // Convert to city's timezone
  const cityTime = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  );
  
  return cityTime;
};

/**
 * Format time for a specific city
 */
export const formatCityTime = (city: City, format: 'short' | 'long' = 'short'): string => {
  const time = getCityTime(city);
  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }
    : { hour: '2-digit', minute: '2-digit' };
  
  return time.toLocaleString('en-US', {
    ...options,
    timeZone: CITY_DATA[city].timezone,
  });
};

/**
 * Check if it's a good time for activities in the city (8am - 10pm)
 */
export const isGoodTimeForActivities = (city: City): boolean => {
  const time = getCityTime(city);
  const hour = time.getHours();
  return hour >= 8 && hour < 22;
};

/**
 * Get time of day for contextual suggestions
 */
export const getTimeOfDay = (city: City): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = getCityTime(city).getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

/**
 * Get season for location-aware suggestions
 */
export const getSeason = (city: City): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const now = getCityTime(city);
  const month = now.getMonth();
  
  // Southern hemisphere (Sydney, Melbourne)
  if (city === 'Sydney' || city === 'Melbourne') {
    if (month >= 9 && month <= 11) return 'spring';
    if (month >= 0 && month <= 2) return 'summer';
    if (month >= 3 && month <= 5) return 'autumn';
    return 'winter';
  }
  
  // Northern hemisphere (London, New York)
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

/**
 * Get location context for AI ritual generation
 */
export const getLocationContext = (city: City) => {
  const season = getSeason(city);
  const timeOfDay = getTimeOfDay(city);
  const isGoodTime = isGoodTimeForActivities(city);
  const cityData = CITY_DATA[city];
  
  return {
    city,
    timezone: cityData.timezone,
    country: cityData.country,
    season,
    timeOfDay,
    isGoodTime,
    coordinates: cityData.coordinates,
    localTime: formatCityTime(city, 'long'),
  };
};

/**
 * FIX #3: Get week start date (Monday) in a specific city's timezone
 * This ensures both partners use the same week boundary regardless of their local timezone
 */
export const getWeekStartDate = (city: City): string => {
  const timezone = CITY_DATA[city].timezone;
  
  // Get current date in the city's timezone
  const now = new Date();
  const cityDateStr = now.toLocaleString('en-US', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });
  
  // Parse the date components
  const cityDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = cityDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days to subtract to get to Monday (start of week)
  // If Sunday (0), subtract 6 days; if Monday (1), subtract 0 days, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Create date for Monday of current week in city's timezone
  const mondayDate = new Date(cityDate);
  mondayDate.setDate(cityDate.getDate() - daysToSubtract);
  mondayDate.setHours(0, 0, 0, 0);
  
  // Return as YYYY-MM-DD string
  const year = mondayDate.getFullYear();
  const month = String(mondayDate.getMonth() + 1).padStart(2, '0');
  const day = String(mondayDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
