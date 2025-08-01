'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getZipCodeCoordinates, GeoError, GeoErrorType } from '@/lib/geo-utils';
import { useToast } from '@/components/ui/use-toast';

// Fix Leaflet icon issues in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define types for listing location
export type ListingLocation = {
  zipCode: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

// Define type for listings with location
export type ListingWithLocation = {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  location: ListingLocation;
  uri: string;
};

// Component to update map center when centerZipCode changes
function MapCenterUpdater({ zipCode, onError }: { zipCode?: string; onError: (error: Error) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!zipCode) return;

    let isMounted = true;

    const updateCenter = async () => {
      try {
        const coordinates = await getZipCodeCoordinates(zipCode);
        if (isMounted && coordinates) {
          map.setView([coordinates.lat, coordinates.lng], 10);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error setting map center:', error);
          if (error instanceof GeoError) {
            // Only show toast for invalid ZIP code, not for network errors
            if (error.type === GeoErrorType.INVALID_ZIPCODE) {
              onError(error);
            }
          } else {
            onError(new Error('Failed to set map center'));
          }
        }
      }
    };

    updateCenter();

    return () => {
      isMounted = false;
    };
  }, [zipCode, map, onError]);

  return null;
}

// Main MapView component
export default function MapView({
  listings,
  centerZipCode,
  radius
}: {
  listings: ListingWithLocation[];
  centerZipCode?: string;
  radius?: number;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultCenter, setDefaultCenter] = useState<[number, number]>([39.8283, -98.5795]); // US center
  const [defaultZoom, setDefaultZoom] = useState(4);

  // Handle map errors
  const handleMapError = (error: Error) => {
    if (error instanceof GeoError) {
      switch (error.type) {
        case GeoErrorType.INVALID_ZIPCODE:
          toast({
            variant: "destructive",
            title: "Invalid ZIP Code",
            description: `${centerZipCode} is not a valid ZIP code.`
          });
          setError(`Invalid ZIP code: ${centerZipCode}`);
          break;
        case GeoErrorType.NETWORK_ERROR:
          toast({
            variant: "destructive",
            title: "Network Error",
            description: "Network error loading map data. Please check your connection."
          });
          setError('Network error loading map data');
          break;
        case GeoErrorType.API_ERROR:
          toast({
            variant: "destructive",
            title: "Service Error",
            description: "Error loading location data. Please try again later."
          });
          setError('Error loading location data');
          break;
        default:
          toast({
            variant: "destructive",
            title: "Map Error",
            description: "An error occurred with the map. Please try again."
          });
          setError('Map error');
      }
    } else {
      toast({
        variant: "destructive",
        title: "Map Error",
        description: "An error occurred with the map. Please try again."
      });
      setError('Map error');
    }
  };

  // Set initial map center based on centerZipCode
  useEffect(() => {
    if (!centerZipCode) return;

    let isMounted = true;

    const setInitialCenter = async () => {
      try {
        setLoading(true);
        const coordinates = await getZipCodeCoordinates(centerZipCode);
        if (isMounted && coordinates) {
          setDefaultCenter([coordinates.lat, coordinates.lng]);
          setDefaultZoom(10); // Zoom in when we have a specific center
          setError(null);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error setting initial map center:', error);
          // Don't set error state here as it will be handled by MapCenterUpdater
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setInitialCenter();

    return () => {
      isMounted = false;
    };
  }, [centerZipCode]);

  // Prevent hydration issues
  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="h-[600px] w-full flex items-center justify-center bg-gray-100">Loading map...</div>;
  }

  if (error) {
    return (
      <div className="h-[600px] w-full flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-500 mb-4">{error}</p>
        <p>Showing listings in list view instead</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {centerZipCode && <MapCenterUpdater zipCode={centerZipCode} onError={handleMapError} />}
        
        {listings.map((listing) => {
          // Skip listings without coordinates
          if (!listing.location.coordinates) return null;
          
          const { lat, lng } = listing.location.coordinates;
          
          // Validate coordinates
          if (isNaN(lat) || isNaN(lng)) return null;
          
          return (
            <Marker 
              key={listing.id} 
              position={[lat, lng]}
              icon={DefaultIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg">{listing.title}</h3>
                  <p className="font-semibold text-blue-600">${listing.price}</p>
                  {listing.location.address && (
                    <p className="text-sm text-gray-600">{listing.location.address}</p>
                  )}
                  <p className="text-sm mt-2 line-clamp-2">{listing.description}</p>
                  <p className="text-xs mt-1 text-gray-500">Category: {listing.category}</p>
                  <a 
                    href={`/listings/${listing.uri.split('/').pop()}`} 
                    className="block mt-2 text-sm text-blue-600 hover:underline"
                  >
                    View Listing
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Show radius circle if centerZipCode and radius are provided */}
        {centerZipCode && radius && defaultCenter && (
          <RadiusCircle center={defaultCenter} radius={radius} />
        )}
      </MapContainer>
      
      {/* Map overlay with stats */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow z-[1000]">
        <p className="text-xs">Showing {listings.filter(l => l.location.coordinates).length} listings on map</p>
        {centerZipCode && radius && (
          <p className="text-xs">Within {radius} miles of {centerZipCode}</p>
        )}
      </div>
    </div>
  );
}

// Component to show radius circle
function RadiusCircle({ center, radius }: { center: [number, number]; radius: number }) {
  const map = useMap();
  
  useEffect(() => {
    // Convert miles to meters for the circle
    const radiusInMeters = radius * 1609.34;
    
    // Create circle
    const circle = L.circle(center, {
      radius: radiusInMeters,
      color: '#3B82F6',
      fillColor: '#93C5FD',
      fillOpacity: 0.2,
      weight: 1
    }).addTo(map);
    
    return () => {
      map.removeLayer(circle);
    };
  }, [center, radius, map]);
  
  return null;
}