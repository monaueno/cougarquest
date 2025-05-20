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
        const q = query(usersRef, orderBy('points', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        
        const entries = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          // Team display logic
          let teamDisplayName = '';
          if (data.teamName && data.teamName.trim()) {
            teamDisplayName = data.teamName;
          } else {
            // Use father's name, grandpa, and sons
            const fatherName = data.name || data.displayName || 'Anonymous';
            const grandpa = data.grandpa ? data.grandpa : null;
            const sons = Array.isArray(data.sons) ? data.sons.filter(Boolean) : [];
            const names = [fatherName];
            if (grandpa) names.push(grandpa);
            names.push(...sons);
            teamDisplayName = names.filter(Boolean).join(' & ') || 'Anonymous Team';
          }
          return {
            userId: doc.id,
            displayName: teamDisplayName,
            photoURL: data.photoURL || undefined,
            points: data.points || 0,
            rank: index + 1,
          };
        }) as LeaderboardEntry[];

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
        Top 10 Leaderboard
      </Typography>
      
      <Paper elevation={2}>
        <List>
          {leaderboard.map((entry) => (
            <ListItem
              key={entry.userId}
              sx={{
                backgroundColor: entry.userId === user?.id ? 'action.selected' : 'inherit',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  src={entry.photoURL || undefined}
                  sx={{ 
                    bgcolor: entry.photoURL ? undefined : 'primary.main',
                    width: 40,
                    height: 40,
                  }}
                >
                  {!entry.photoURL && entry.displayName?.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: entry.userId === user?.id ? 'bold' : 'normal' }}>
                      {entry.rank}. {entry.displayName}
                    </Typography>
                    <Typography 
                      variant="subtitle1" 
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    >
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