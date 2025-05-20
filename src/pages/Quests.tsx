import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import type { Quest } from '../types';

const Quests = () => {
  const [tab, setTab] = useState(0);
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuests = async () => {
      if (!user) return;

      try {
        const questsRef = collection(db, 'quests');
        const availableQuery = query(
          questsRef,
          where('completedBy', 'array-contains', user.id)
        );
        const completedQuery = query(
          questsRef,
          where('completedBy', 'array-contains', user.id)
        );

        const [availableSnapshot, completedSnapshot] = await Promise.all([
          getDocs(availableQuery),
          getDocs(completedQuery),
        ]);

        const available = availableSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Quest[];

        const completed = completedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Quest[];

        setAvailableQuests(available);
        setCompletedQuests(completed);
      } catch (error) {
        console.error('Error fetching quests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, [user]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={handleTabChange} centered sx={{ mb: 2 }}>
        <Tab label="Available Quests" />
        <Tab label="Completed Quests" />
      </Tabs>

      <Stack spacing={2}>
        {(tab === 0 ? availableQuests : completedQuests).map((quest) => (
          <Box key={quest.id}>
            <Card>
              <CardMedia
                component="img"
                height="140"
                image={quest.imageUrl}
                alt={quest.title}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {quest.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {quest.description}
                </Typography>
                <Typography variant="subtitle2" color="primary">
                  Points: {quest.points}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    href={quest.googleMapsUrl}
                    target="_blank"
                    sx={{ mr: 1 }}
                  >
                    Get Directions
                  </Button>
                  {tab === 0 && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {/* TODO: Implement quest completion */}}
                    >
                      Complete Quest
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default Quests; 