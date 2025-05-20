import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Quest } from '../types';
import { parseCoordsFromGoogleMapsLink } from '../utils/parseCoords';
import { useAuth } from '../context/AuthContext';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDkKwVbdR2ysG2g4SVSFL1T-I1VGt7zV1o';

const Map = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const { user } = useAuth();

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
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    } else {
      initializeMap();
    }
    // eslint-disable-next-line
  }, [loading, quests, user]);

  const initializeMap = () => {
    if (!mapRef.current) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40.2518, lng: -111.6493 }, // BYU coordinates
      zoom: 15,
    });

    // Only show markers for quests the user has not completed
    quests
      .filter(quest => !quest.completedBy?.includes(user?.id))
      .forEach(quest => {
        let lat = quest.location?.coordinates?.latitude;
        let lng = quest.location?.coordinates?.longitude;
        if ((lat === undefined || lng === undefined) && quest.googleMapsLink) {
          const coords = parseCoordsFromGoogleMapsLink(quest.googleMapsLink);
          if (coords) {
            lat = coords.latitude;
            lng = coords.longitude;
          }
        }
        if (lat === undefined || lng === undefined) return;
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current!,
          title: quest.title,
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="text-align:center;max-width:220px;">
              <img src="${quest.photoURL}" alt="${quest.title}" style="width:200px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
              <h3>${quest.title}</h3>
              <p>${quest.description}</p>
              <p>Points: ${quest.points}</p>
              <a href="${quest.googleMapsLink}" target="_blank">Get Directions</a>
            </div>
          `,
        });
        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current!, marker);
          // TODO: Open quest modal here if desired
        });
      });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
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