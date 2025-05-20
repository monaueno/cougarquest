import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Quest } from '../types';

declare global {
  interface Window {
    initMap?: () => void;
  }
}

const Map = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Initialize Google Maps
    const initMap = () => {
      const map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
        center: { lat: 40.2518, lng: -111.6493 }, // BYU coordinates
        zoom: 15,
      });

      // Add markers for each quest
      quests.forEach(quest => {
        const marker = new google.maps.Marker({
          position: {
            lat: quest.location.coordinates.latitude,
            lng: quest.location.coordinates.longitude,
          },
          map,
          title: quest.title,
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <h3>${quest.title}</h3>
              <p>${quest.description}</p>
              <p>Points: ${quest.points}</p>
              <a href="${quest.googleMapsUrl}" target="_blank">Get Directions</a>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });
    };

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap`;
    script.async = true;
    script.defer = true;
    window.initMap = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      window.initMap = undefined;
    };
  }, [quests]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      <div id="map" style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default Map; 