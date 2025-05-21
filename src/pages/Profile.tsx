import { useState, useEffect, useRef } from 'react';
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
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import ReactCrop, { type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newSonName, setNewSonName] = useState('');
  const [teamName, setTeamName] = useState(user?.teamName || '');
  const [savingTeamName, setSavingTeamName] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [grandpa, setGrandpa] = useState(user?.grandpa || '');
  const [editingGrandpa, setEditingGrandpa] = useState(false);
  const [savingGrandpa, setSavingGrandpa] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingSonIndex, setEditingSonIndex] = useState<number | null>(null);
  const [editingSonName, setEditingSonName] = useState('');
  const [savingSon, setSavingSon] = useState(false);
  const [localSons, setLocalSons] = useState<string[]>(user?.sons || []);
  const [localGrandpa, setLocalGrandpa] = useState<string>(user?.grandpa || '');
  const [localTeamName, setLocalTeamName] = useState<string>(user?.teamName || '');
  const [crop, setCrop] = useState<CropType>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [completedCrop, setCompletedCrop] = useState<CropType | null>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(user?.photoURL || null);

  useEffect(() => {
    setTeamName(user?.teamName || '');
    setLocalTeamName(user?.teamName || '');
    setGrandpa(user?.grandpa || '');
    setLocalGrandpa(user?.grandpa || '');
    setLocalSons(user?.sons || []);
    setLocalPhotoURL(user?.photoURL || null);
  }, [user?.teamName, user?.grandpa, user?.sons, user?.photoURL]);

  useEffect(() => {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) {
      setCroppedImage(null);
      return;
    }
    getCroppedImg(imgRef.current, completedCrop).then(setCroppedImage);
  }, [completedCrop, imageUrl]);

  useEffect(() => {
    if (!user?.id) return;
    const userRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLocalTeamName(data.teamName || '');
        setTeamName(data.teamName || '');
        setLocalGrandpa(data.grandpa || '');
        setGrandpa(data.grandpa || '');
        setLocalSons(Array.isArray(data.sons) ? data.sons : []);
        setLocalPhotoURL(data.photoURL || null);
        // Optionally update points in the user object if you want to show real-time points
        user.points = data.points || 0;
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  const handleAddSon = async () => {
    if (!user || !newSonName.trim()) return;
    try {
      // Check if son already exists
      if (localSons.includes(newSonName.trim())) {
        alert('This son is already in your list');
        return;
      }
      
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayUnion(newSonName.trim()),
      });
      setNewSonName('');
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
      setLocalSons(prev => prev.filter(s => s !== sonName));
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
      setLocalTeamName(teamName.trim());
    } catch (error) {
      console.error('Error saving team name:', error);
    } finally {
      setSavingTeamName(false);
      setEditingTeamName(false);
    }
  };

  const handleSaveGrandpa = async () => {
    if (!user) return;
    setSavingGrandpa(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        grandpa: grandpa.trim() || null,
      });
      setLocalGrandpa(grandpa.trim());
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
      setLocalGrandpa('');
    } catch (error) {
      console.error('Error removing grandpa:', error);
    } finally {
      setSavingGrandpa(false);
      setEditingGrandpa(false);
    }
  };

  const onSelectProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setImageUrl(URL.createObjectURL(file));
    setShowCropDialog(true);
  };

  const onImageLoaded = (img: HTMLImageElement) => {
    imgRef.current = img;
    // Set default crop and completedCrop if not already set
    if (img.width && img.height && (!crop.width || !crop.height)) {
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      const defaultCrop = {
        unit: 'px' as const,
        width: size,
        height: size,
        x,
        y,
      };
      setCrop(defaultCrop);
      setCompletedCrop(defaultCrop);
      // Immediately generate cropped image for preview
      getCroppedImg(img, defaultCrop).then(setCroppedImage);
    }
  };

  async function getCroppedImg(image: HTMLImageElement, crop: CropType): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width as number;
    canvas.height = crop.height as number;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(
      image,
      (crop.x as number) * scaleX,
      (crop.y as number) * scaleY,
      (crop.width as number) * scaleX,
      (crop.height as number) * scaleY,
      0,
      0,
      crop.width as number,
      crop.height as number
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      }, 'image/jpeg');
    });
  }

  const handleUploadCroppedPhoto = async () => {
    if (!user || !croppedImage) return;
    setUploadingPhoto(true);
    const prevPhotoURL = localPhotoURL;
    // Optimistically update local photo
    const previewUrl = URL.createObjectURL(croppedImage);
    setLocalPhotoURL(previewUrl);
    try {
      const fileRef = storageRef(storage, `profilePictures/${user.id}`);
      await uploadBytes(fileRef, croppedImage);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, 'users', user.id), {
        photoURL: url,
      });
      setShowCropDialog(false);
      setImageUrl(null);
      setCroppedImage(null);
    } catch (error) {
      // Revert to previous photo on error
      setLocalPhotoURL(prevPhotoURL);
      console.error('Error uploading cropped profile picture:', error);
      alert('Failed to update profile picture. Please try again.');
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
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayRemove(oldName),
      });
      await updateDoc(doc(db, 'users', user.id), {
        sons: arrayUnion(editingSonName.trim()),
      });
      setLocalSons(prev => prev.map((s, i) => (i === editingSonIndex ? editingSonName.trim() : s)));
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
          src={localPhotoURL || undefined}
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
            onChange={onSelectProfilePic}
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
              disabled={savingTeamName || teamName.trim() === localTeamName}
            >
              Save
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body1" sx={{ flex: 1 }}>
              {localTeamName ? localTeamName : <span style={{ color: '#888' }}>No team name set</span>}
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
              onClick={() => { setEditingGrandpa(false); setGrandpa(localGrandpa || ''); }}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <List>
            <ListItem>
              <ListItemText
                primary={localGrandpa ? localGrandpa : <span style={{ color: '#888' }}>No grandpa set</span>}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => setEditingGrandpa(true)}
                >
                  <EditIcon />
                </IconButton>
                {localGrandpa && (
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

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          My Sons
        </Typography>
        <List>
          {localSons.map((son, idx) => (
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
        
        {editingSonIndex === null && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
            <TextField
              label="Son's Name"
              value={newSonName}
              onChange={(e) => setNewSonName(e.target.value)}
              fullWidth
              size="small"
              placeholder="Enter son's name"
            />
            <Button
              variant="contained"
              onClick={handleAddSon}
              disabled={!newSonName.trim()}
            >
              Add
            </Button>
          </Box>
        )}
      </Box>

      <Button
        variant="outlined"
        color="error"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSignOut}
      >
        Sign Out
      </Button>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onClose={() => setShowCropDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Crop Profile Picture</DialogTitle>
        <DialogContent>
          {imageUrl && (
            <>
              <div style={{ position: 'relative', width: '100%', maxWidth: 350, aspectRatio: '1 / 1', margin: '0 auto' }}>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  onComplete={c => setCompletedCrop(c)}
                  aspect={1}
                >
                  <img src={imageUrl} ref={imgRef} onLoad={e => onImageLoaded(e.currentTarget)} style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '1 / 1' }} />
                </ReactCrop>
              </div>
              {/* Circular cropped preview */}
              {croppedImage && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <img
                    src={URL.createObjectURL(croppedImage)}
                    alt="Cropped Preview"
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #1976d2',
                    }}
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCropDialog(false)}>Cancel</Button>
          <Button onClick={handleUploadCroppedPhoto} variant="contained" disabled={!croppedImage || uploadingPhoto}>
            {uploadingPhoto ? 'Uploading...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile; 