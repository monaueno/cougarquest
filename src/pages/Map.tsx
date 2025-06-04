import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Quest } from '../types';
import { parseCoordsFromGoogleMapsLink } from '../utils/parseCoords';
import { useAuth } from '../context/AuthContext';

// Add type declaration for initMap
declare global {
  interface Window {
    initMap?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const Map = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const { user } = useAuth();

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation(null);
        }
      );
    }
  }, []);

  // Fetch quests
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const questsRef = collection(db, 'quests');
        const snapshot = await getDocs(questsRef);
        const questsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Quest[];
        setQuests(questsData);
      } catch (error) {
        console.error('Error fetching quests:', error);
        setError('Failed to load quests');
      } finally {
        setLoading(false);
      }
    };
    fetchQuests();
  }, []);

  // Load Google Maps
  useEffect(() => {
    if (loading || !mapRef.current || !user) return;

    let scriptLoadAttempts = 0;
    const maxAttempts = 3;

    const loadGoogleMapsScript = () => {
      if (scriptLoadAttempts >= maxAttempts) {
        setError('Failed to load Google Maps after multiple attempts. Please refresh the page.');
        return;
      }

      // Remove any existing Google Maps script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        try {
          initializeMap();
        } catch (error) {
          setError('Failed to initialize map. Please refresh the page.');
        }
      };

      script.onerror = () => {
        scriptLoadAttempts++;
        setTimeout(loadGoogleMapsScript, 1000);
      };

      document.head.appendChild(script);
    };

    // Always reload the script when navigating to the map
    loadGoogleMapsScript();

    return () => {
      const script = document.querySelector('script[src*="maps.googleapis.com"]');
      if (script) {
        script.remove();
      }
      delete window.initMap;
    };
  }, [loading, quests, user, userLocation]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) {
      setError('Failed to initialize map. Please refresh the page.');
      return;
    }

    try {
      const defaultCenter = userLocation || { lat: 40.2518, lng: -111.6493 };
      
      // Clear any existing map instance
      if (mapInstance.current) {
        mapInstance.current = null;
      }

      // Create the map with explicit dimensions
      const mapElement = mapRef.current;
      mapElement.style.height = '100vh';
      mapElement.style.width = '100vw';
      mapElement.style.position = 'fixed';
      mapElement.style.top = '0';
      mapElement.style.left = '0';
      mapElement.style.zIndex = '1';

      // Create the map instance
      mapInstance.current = new window.google.maps.Map(mapElement, {
        center: defaultCenter,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        }
      });

      // Add user location marker (blue dot)
      if (userLocation) {
        new window.google.maps.Marker({
          position: userLocation,
          map: mapInstance.current,
          title: 'Your Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#1976D2',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });
      }

      // Only show markers for quests the user has not completed
      quests
        .filter(quest => user?.id ? !quest.completedBy?.includes(user.id) : true)
        .forEach(quest => {
          let lat: number | undefined;
          let lng: number | undefined;
          if (quest.location && quest.location.coordinates) {
            lat = quest.location.coordinates.latitude;
            lng = quest.location.coordinates.longitude;
          }
          if ((lat === undefined || lng === undefined) && quest.googleMapsLink) {
            const coords = parseCoordsFromGoogleMapsLink(quest.googleMapsLink);
            if (coords) {
              lat = coords.latitude;
              lng = coords.longitude;
            }
          }
          if (lat === undefined || lng === undefined) {
            console.warn('Quest missing coordinates:', quest);
            return;
          }

          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance.current,
            title: quest.title,
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="text-align:center;max-width:220px;">
                <img src="${quest.photoURL || ''}" alt="${quest.title}" style="width:200px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
                <h3>${quest.title}</h3>
                <p>${quest.description}</p>
                <p>Points: ${quest.points}</p>
                <a href="${quest.googleMapsLink}" target="_blank">Get Directions</a>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current!, marker);
          });
        });

      // Force a resize event after a short delay
      setTimeout(() => {
        if (window.google?.maps && mapInstance.current) {
          window.google.maps.event.trigger(mapInstance.current, 'resize');
          mapInstance.current.setCenter(defaultCenter);
        }
      }, 100);
    } catch (error) {
      setError('Failed to initialize map. Please refresh the page.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
        <Typography color="error" align="center" variant="h6">
          {error}
          <br/>
          <br/>
          API Key Status: {GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}
          <br/>
          Please check your .env file and refresh the page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: { xs: 'calc(100vh - 48px)', sm: 'calc(100vh - 56px)' }, 
      width: '100%', 
      position: 'relative',
      zIndex: 0,
      overflow: 'hidden',
      backgroundColor: '#f0f0f0'
    }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          touchAction: 'pan-x pan-y',
          backgroundColor: '#e0e0e0'
        }} 
      />
    </Box>
  );
};

export default Map; 