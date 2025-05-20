import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  CircularProgress,
  Paper,
} from '@mui/material';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardEntry } from '../types';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('points', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        
        const entries = snapshot.docs.map((doc, index) => ({
          userId: doc.id,
          displayName: doc.data().displayName,
          photoURL: doc.data().photoURL,
          points: doc.data().points,
          rank: index + 1,
        })) as LeaderboardEntry[];

        setLeaderboard(entries);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        Leaderboard
      </Typography>
      
      <Paper elevation={2}>
        <List>
          {leaderboard.map((entry) => (
            <ListItem
              key={entry.userId}
              sx={{
                backgroundColor: entry.userId === user?.id ? 'action.selected' : 'inherit',
              }}
            >
              <ListItemAvatar>
                <Avatar src={entry.photoURL || undefined}>
                  {entry.displayName?.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between">
                    <Typography>
                      {entry.rank}. {entry.displayName}
                    </Typography>
                    <Typography color="primary">
                      {entry.points} pts
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Leaderboard; 