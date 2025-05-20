import { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newSonName, setNewSonName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  const handleAddSon = async () => {
    if (!user || !newSonName.trim()) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayUnion(newSonName.trim()),
      });
      setNewSonName('');
      setOpenDialog(false);
    } catch (error) {
      console.error('Error adding son:', error);
    }
  };

  const handleRemoveSon = async (sonName: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayRemove(sonName),
      });
    } catch (error) {
      console.error('Error removing son:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Avatar
          src={user.photoURL || undefined}
          sx={{ width: 100, height: 100, mb: 2 }}
        >
          {user.displayName?.charAt(0)}
        </Avatar>
        <Typography variant="h5" gutterBottom>
          {user.displayName}
        </Typography>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          {user.points} Points
        </Typography>
      </Box>

      <Typography variant="h6" gutterBottom>
        My Sons
      </Typography>
      <List>
        {user.sons.map((son) => (
          <ListItem key={son}>
            <ListItemText primary={son} />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleRemoveSon(son)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2 }}
        onClick={() => setOpenDialog(true)}
      >
        Add Son
      </Button>

      <Button
        variant="outlined"
        color="error"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSignOut}
      >
        Sign Out
      </Button>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add Son</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Son's Name"
            fullWidth
            value={newSonName}
            onChange={(e) => setNewSonName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddSon} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile; 