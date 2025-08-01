/**
 * Geolocation utilities for the Bluesky Listings app
 * Provides functions for calculating distances between coordinates and ZIP codes
 */

// Define error types for better error handling
export enum GeoErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ZIPCODE = 'INVALID_ZIPCODE',
  API_ERROR = 'API_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class GeoError extends Error {
  type: GeoErrorType;
  
  constructor(message: string, type: GeoErrorType) {
    super(message);
    this.type = type;
    this.name = 'GeoError';
  }
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point in decimal degrees
 * @param lng1 Longitude of first point in decimal degrees
 * @param lat2 Latitude of second point in decimal degrees
 * @param lng2 Longitude of second point in decimal degrees
 * @param miles Whether to return the distance in miles (true) or kilometers (false)
 * @returns Distance in miles or kilometers
 */
export function getDistanceFromLatLng(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number, 
  miles = true
): number {
  // Validate inputs
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    throw new GeoError('Invalid coordinates provided', GeoErrorType.INVALID_ZIPCODE);
  }
  
  // Radius of the earth in km
  const R = 6371;
  
  // Convert degrees to radians
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  
  // Convert coordinates to radians
  const rlat1 = deg2rad(lat1);
  const rlat2 = deg2rad(lat2);
  const rlng1 = deg2rad(lng1);
  const rlng2 = deg2rad(lng2);
  
  // Calculate differences
  const dLat = rlat2 - rlat1;
  const dLng = rlng2 - rlng1;
  
  // Haversine formula
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rlat1) * Math.cos(rlat2) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return miles ? distance * 0.621371 : distance; // Convert to miles if requested
}

// Simple cache for ZIP code coordinates to avoid repeated lookups
type ZipCoordinates = {
  lat: number;
  lng: number;
};

const zipCache: Record<string, ZipCoordinates> = {};

/**
 * Validate a US ZIP code format
 * @param zipCode The ZIP code to validate
 * @returns True if valid format, false otherwise
 */
export function isValidUSZipCode(zipCode: string): boolean {
  // Basic US ZIP code validation (5 digits or ZIP+4 format)
  return /^\d{5}(-\d{4})?$/.test(zipCode);
}

/**
 * Get coordinates for a ZIP code using a geocoding service
 * @param zipCode The ZIP code to look up
 * @returns Promise resolving to coordinates or throws GeoError
 */
export async function getZipCodeCoordinates(zipCode: string): Promise<ZipCoordinates> {
  // Validate ZIP code format
  if (!zipCode || !isValidUSZipCode(zipCode)) {
    throw new GeoError(`Invalid ZIP code format: ${zipCode}`, GeoErrorType.INVALID_ZIPCODE);
  }
  
  // Check cache first
  if (zipCache[zipCode]) {
    return zipCache[zipCode];
  }
  
  try {
    // This is a placeholder for a real API call
    // In a production app, you would use a geocoding service like:
    // - Google Maps Geocoding API
    // - Mapbox Geocoding API
    // - OpenStreetMap Nominatim
    // - A self-hosted ZIP code database
    
    // For demo purposes, we'll use a free API
    // Note: In production, you should use a more reliable service with proper error handling
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new GeoError(`ZIP code not found: ${zipCode}`, GeoErrorType.INVALID_ZIPCODE);
      } else if (response.status >= 500) {
        throw new GeoError(`Geocoding service error: ${response.statusText}`, GeoErrorType.API_ERROR);
      } else {
        throw new GeoError(`Failed to get coordinates for ZIP code ${zipCode}: ${response.statusText}`, GeoErrorType.API_ERROR);
      }
    }
    
    const data = await response.json();
    
    if (!data || !data.places || data.places.length === 0) {
      throw new GeoError(`No location data found for ZIP code: ${zipCode}`, GeoErrorType.INVALID_ZIPCODE);
    }
    
    // Extract coordinates
    const coordinates: ZipCoordinates = {
      lat: parseFloat(data.places[0].latitude),
      lng: parseFloat(data.places[0].longitude)
    };
    
    // Validate coordinates
    if (isNaN(coordinates.lat) || isNaN(coordinates.lng)) {
      throw new GeoError(`Invalid coordinates returned for ZIP code: ${zipCode}`, GeoErrorType.API_ERROR);
    }
    
    // Cache the result
    zipCache[zipCode] = coordinates;
    
    return coordinates;
  } catch (error) {
    // Rethrow GeoErrors
    if (error instanceof GeoError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new GeoError(`Network error while fetching coordinates for ZIP code: ${zipCode}`, GeoErrorType.NETWORK_ERROR);
    }
    
    // Handle other errors
    console.error('Error fetching ZIP code coordinates:', error);
    throw new GeoError(`Unknown error fetching coordinates for ZIP code: ${zipCode}`, GeoErrorType.UNKNOWN_ERROR);
  }
}

/**
 * Calculate the distance between two ZIP codes
 * @param zipCode1 First ZIP code
 * @param zipCode2 Second ZIP code
 * @param miles Whether to return the distance in miles (true) or kilometers (false)
 * @returns Promise resolving to the distance or throws GeoError
 */
export async function getDistanceBetweenZipCodes(
  zipCode1: string,
  zipCode2: string,
  miles = true
): Promise<number> {
  try {
    const coords1 = await getZipCodeCoordinates(zipCode1);
    const coords2 = await getZipCodeCoordinates(zipCode2);
    
    return getDistanceFromLatLng(coords1.lat, coords1.lng, coords2.lat, coords2.lng, miles);
  } catch (error) {
    // Rethrow GeoErrors
    if (error instanceof GeoError) {
      throw error;
    }
    
    // Handle other errors
    throw new GeoError(`Error calculating distance between ZIP codes: ${zipCode1} and ${zipCode2}`, GeoErrorType.UNKNOWN_ERROR);
  }
}

/**
 * Check if a ZIP code is within a specified radius of another ZIP code
 * @param centerZip The center ZIP code
 * @param targetZip The ZIP code to check
 * @param radiusMiles The radius in miles
 * @returns Promise resolving to true if within radius, false otherwise
 */
export async function isZipCodeWithinRadius(
  centerZip: string,
  targetZip: string,
  radiusMiles: number
): Promise<boolean> {
  try {
    const distance = await getDistanceBetweenZipCodes(centerZip, targetZip, true);
    return distance <= radiusMiles;
  } catch (error) {
    console.error(`Error checking if ZIP code ${targetZip} is within radius of ${centerZip}:`, error);
    return false; // Default to false on error
  }
}