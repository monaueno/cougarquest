import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Quest } from '../types';
import { parseCoordsFromGoogleMapsLink } from '../utils/parseCoords';
import { useAuth } from '../context/AuthContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
console.log('Google Maps API Key loaded:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

const Map = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Get user's current location
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

  useEffect(() => {
    if (loading) return;
    if (!mapRef.current) return;
    if (!user) return;

    // Load Google Maps script if not already loaded
    if (!window.google) {
      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        initializeMap();
      };
      script.onerror = (error) => {
        console.error('Error loading Google Maps script:', error);
        setError('Failed to load Google Maps');
      };
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    } else {
      console.log('Google Maps already loaded, initializing map...');
      initializeMap();
    }
    // eslint-disable-next-line
  }, [loading, quests, user, userLocation]);

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('Map container not found');
      return;
    }

    try {
      console.log('Initializing map with center:', userLocation || { lat: 40.2518, lng: -111.6493 });
      const defaultCenter = userLocation || { lat: 40.2518, lng: -111.6493 };
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
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

          // Classic teardrop pin in BYU royal blue with a white 'Y' positioned higher
          const pinSvg = `
            <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C9.373 2 4 7.373 4 14c0 7.732 8.5 20.5 11.2 24.4a2 2 0 0 0 3.6 0C19.5 34.5 28 21.732 28 14c0-6.627-5.373-12-12-12z" fill="#0062B8"/>
              <circle cx="16" cy="16" r="8" fill="#0062B8"/>
              <text x="16" y="15" text-anchor="middle" font-size="14" font-family="Arial Black,Arial,sans-serif" font-weight="bold" fill="#fff" dy="0.35em">Y</text>
            </svg>
          `;
          const icon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg),
            scaledSize: new window.google.maps.Size(32, 48),
            anchor: new window.google.maps.Point(16, 48),
          };

          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance.current,
            title: quest.title,
            icon,
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
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default Map; 