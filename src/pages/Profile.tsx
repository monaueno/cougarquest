import { useState, useEffect } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newSonName, setNewSonName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [teamName, setTeamName] = useState(user?.teamName || '');
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);
  const [grandpa, setGrandpa] = useState(user?.grandpa || '');
  const [editingGrandpa, setEditingGrandpa] = useState(false);
  const [savingGrandpa, setSavingGrandpa] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingSonIndex, setEditingSonIndex] = useState<number | null>(null);
  const [editingSonName, setEditingSonName] = useState('');
  const [savingSon, setSavingSon] = useState(false);

  useEffect(() => {
    setTeamName(user?.teamName || '');
    setGrandpa(user?.grandpa || '');
  }, [user?.teamName, user?.grandpa]);

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

  const handleSaveTeamName = async () => {
    if (!user) return;
    setSavingTeamName(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        teamName: teamName.trim() || null,
      });
    } catch (error) {
      console.error('Error saving team name:', error);
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleSaveGrandpa = async () => {
    if (!user) return;
    setSavingGrandpa(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        grandpa: grandpa.trim() || null,
      });
    } catch (error) {
      console.error('Error saving grandpa:', error);
    } finally {
      setSavingGrandpa(false);
      setEditingGrandpa(false);
    }
  };

  const handleRemoveGrandpa = async () => {
    if (!user) return;
    setSavingGrandpa(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        grandpa: null,
      });
      setGrandpa('');
    } catch (error) {
      console.error('Error removing grandpa:', error);
    } finally {
      setSavingGrandpa(false);
      setEditingGrandpa(false);
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;
    setUploadingPhoto(true);
    try {
      const file = e.target.files[0];
      const fileRef = storageRef(storage, `profilePictures/${user.id}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'users', user.id), {
        photoURL: url,
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditSon = (index: number, currentName: string) => {
    setEditingSonIndex(index);
    setEditingSonName(currentName);
  };

  const handleSaveSon = async (oldName: string) => {
    if (!user) return;
    setSavingSon(true);
    try {
      // Remove old name, add new name
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayRemove(oldName),
      });
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayUnion(editingSonName.trim()),
      });
      setEditingSonIndex(null);
      setEditingSonName('');
    } catch (error) {
      console.error('Error editing son:', error);
    } finally {
      setSavingSon(false);
    }
  };

  const handleCancelEditSon = () => {
    setEditingSonIndex(null);
    setEditingSonName('');
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
        <Button
          variant="outlined"
          component="label"
          size="small"
          sx={{ mb: 2 }}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? 'Uploading...' : 'Change Profile Picture'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleProfilePicChange}
          />
        </Button>
        <Typography variant="h5" gutterBottom>
          {user.displayName}
        </Typography>
        <Typography variant="subtitle1" color="primary" gutterBottom>
          {user.points} Points
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Team Name
        </Typography>
        {editingTeamName ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Team Name"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              fullWidth
              size="small"
              placeholder="Enter your team name"
            />
            <Button
              variant="contained"
              onClick={async () => {
                await handleSaveTeamName();
                setEditingTeamName(false);
              }}
              disabled={savingTeamName || teamName.trim() === (user.teamName || '')}
            >
              Save
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body1" sx={{ flex: 1 }}>
              {user.teamName ? user.teamName : <span style={{ color: '#888' }}>No team name set</span>}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setEditingTeamName(true)}
            >
              Edit Team Name
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Grandpa
        </Typography>
        {editingGrandpa ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Grandpa's Name"
              value={grandpa}
              onChange={e => setGrandpa(e.target.value)}
              fullWidth
              size="small"
              placeholder="Enter grandpa's name"
            />
            <Button
              variant="contained"
              onClick={handleSaveGrandpa}
              disabled={savingGrandpa}
            >
              Save
            </Button>
            <Button
              variant="text"
              onClick={() => { setEditingGrandpa(false); setGrandpa(user.grandpa || ''); }}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <List>
            <ListItem>
              <ListItemText
                primary={user.grandpa ? user.grandpa : <span style={{ color: '#888' }}>No grandpa set</span>}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => setEditingGrandpa(true)}
                >
                  <EditIcon />
                </IconButton>
                {user.grandpa && (
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={handleRemoveGrandpa}
                    disabled={savingGrandpa}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        )}
      </Box>

      <Typography variant="h6" gutterBottom>
        My Sons
      </Typography>
      <List>
        {user.sons.map((son, idx) => (
          <ListItem key={son}>
            {editingSonIndex === idx ? (
              <>
                <TextField
                  value={editingSonName}
                  onChange={e => setEditingSonName(e.target.value)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleSaveSon(son)}
                  disabled={savingSon || !editingSonName.trim() || editingSonName.trim() === son}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCancelEditSon}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <ListItemText primary={son} />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={() => handleEditSon(idx, son)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveSon(son)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </>
            )}
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