import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, uploadBytes } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import type { Quest } from '../types';
import { useAuth } from '../context/AuthContext';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Card, 
  Button, 
  CircularProgress,
  Modal,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  CardMedia,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { Directions, Close, Edit, Delete, Add, Image, CheckCircle, ContentCopy } from '@mui/icons-material';
import { getAddressFromCoords } from '../utils/geocode';
import { parseCoordsFromGoogleMapsLink } from '../utils/parseCoords';

function normalizeQuestLocation(quest: Quest): Quest {
  const coordsFromLink = parseCoordsFromGoogleMapsLink(quest.googleMapsLink ?? '');
  return {
    ...quest,
    location: {
      ...(quest.location || {}),
      address: quest.location?.address ?? '',
      coordinates: {
        ...(quest.location?.coordinates || {}),
        latitude: quest.location?.coordinates?.latitude ?? coordsFromLink?.latitude ?? 0,
        longitude: quest.location?.coordinates?.longitude ?? coordsFromLink?.longitude ?? 0,
      }
    }
  };
}

const Quests = () => {
  const [tabValue, setTabValue] = useState(0);
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [isCreatingQuest, setIsCreatingQuest] = useState(false);
  const [isEditingQuest, setIsEditingQuest] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [newQuest, setNewQuest] = useState({
    title: '',
    description: '',
    location: {
      coordinates: {
        latitude: 40.2518,
        longitude: -111.6493
      },
      address: ''
    },
    points: 100,
    photoURL: '',
    googleMapsLink: ''
  });
  const { user } = useAuth();
  const [isSelectingImage, setIsSelectingImage] = useState(false);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [submittedPhotoUrl, setSubmittedPhotoUrl] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [showCopySnackbar, setShowCopySnackbar] = useState(false);
  const [showQuestPreview, setShowQuestPreview] = useState(false);
  const [showCheckmarkSnackbar, setShowCheckmarkSnackbar] = useState(false);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>(user?.completedQuests || []);
  const [allQuests, setAllQuests] = useState<Quest[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchQuests = async () => {
      try {
        // First, get the user's completed quests
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        const userCompletedQuests = userData?.completedQuests || [];
        
        console.log('Fetched user data:', {
          userId: user.id,
          completedQuests: userCompletedQuests,
          userData
        });
        
        // Set the completed quest IDs from the database
        setCompletedQuestIds(userCompletedQuests);

        // Then fetch all quests
        const questsRef = collection(db, 'quests');
        const q = query(questsRef);
        const querySnapshot = await getDocs(q);
        
        const quests = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data
          } as Quest;
        });

        console.log('Fetched all quests:', {
          totalQuests: quests.length,
          completedQuests: userCompletedQuests.length
        });

        setAllQuests(quests);
        
        // Filter quests based on user's completed quests
        const available = quests.filter(quest => !userCompletedQuests.includes(quest.id));
        const completed = quests.filter(quest => userCompletedQuests.includes(quest.id));
        
        console.log('Filtered quests:', {
          available: available.length,
          completed: completed.length
        });
        
        setAvailableQuests(available);
        setCompletedQuests(completed);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching quests:', error);
        setLoading(false);
      }
    };

    fetchQuests();
  }, [user]);

  // Autofill address for new quest when coordinates change
  useEffect(() => {
    const coords = newQuest.location.coordinates;
    if (coords.latitude && coords.longitude) {
      getAddressFromCoords(coords.latitude, coords.longitude).then(address => {
        if (address && !newQuest.location.address) {
          setNewQuest(prev => ({
            ...prev,
            location: { ...prev.location, address }
          }));
        }
      });
    }
    // eslint-disable-next-line
  }, [newQuest.location.coordinates.latitude, newQuest.location.coordinates.longitude]);

  // Autofill address for editing quest when coordinates change
  useEffect(() => {
    if (!editingQuest?.location?.coordinates) return;
    const coords = editingQuest.location.coordinates;
    if (coords.latitude && coords.longitude) {
      getAddressFromCoords(coords.latitude, coords.longitude).then(address => {
        if (address && !editingQuest.location?.address) {
          setEditingQuest(prev => prev ? {
            ...prev,
            location: { ...prev.location, address }
          } : null);
        }
      });
    }
    // eslint-disable-next-line
  }, [editingQuest?.location?.coordinates?.latitude, editingQuest?.location?.coordinates?.longitude]);

  // Fetch submitted photo for completed quest
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!user || !selectedQuest) {
        setSubmittedPhotoUrl(null);
        setSubmittedAt(null);
        return;
      }

      try {
        const submissionDocId = `${user.id}_${selectedQuest.id}`;
        const submissionDoc = await getDoc(doc(db, 'questSubmissions', submissionDocId));
        
        if (submissionDoc.exists()) {
          const data = submissionDoc.data();
          setSubmittedPhotoUrl(data.photoURL);
          setSubmittedAt(data.submittedAt || null);
        } else {
          setSubmittedPhotoUrl(null);
          setSubmittedAt(null);
        }
      } catch (error) {
        console.error('Error fetching submission:', error);
        setSubmittedPhotoUrl(null);
        setSubmittedAt(null);
      }
    };

    fetchSubmission();
  }, [selectedQuest, user]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGetDirections = (mapsLink: string) => {
    console.log('Google Maps Link:', mapsLink);
    // Open the Google Maps link in a new tab
    window.open(mapsLink, '_blank', 'noopener,noreferrer');
  };

  const handleCompleteQuest = async (questId: string) => {
    console.log('Resubmit/Complete Quest clicked for questId:', questId);
    setCompletingQuestId(questId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (!file) return;

    // Ensure the file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create a copy of the file to prevent cancellation issues
    const fileCopy = new File([file], file.name, { type: file.type });
    setSelectedFile(fileCopy);
    setPreviewUrl(URL.createObjectURL(fileCopy));
    setShowPreviewDialog(true);
  };

  const handleSubmitPhoto = async () => {
    if (!selectedFile || !completingQuestId || !user) {
      console.error('Missing required data:', { selectedFile, completingQuestId, user });
      return;
    }
    const quest = allQuests.find(q => q.id === completingQuestId);
    if (!quest) {
      console.error('Quest not found:', completingQuestId);
      return;
    }

    console.log('Starting quest completion process:', {
      completingQuestId,
      currentCompletedQuests: completedQuestIds,
      user: user.id
    });

    // First, update the completedQuestIds
    const updatedCompletedQuestIds = [...completedQuestIds, completingQuestId];
    setCompletedQuestIds(updatedCompletedQuestIds);

    // Then immediately update both quest lists
    const updatedAvailableQuests = allQuests.filter(q => !updatedCompletedQuestIds.includes(q.id));
    const updatedCompletedQuests = allQuests.filter(q => updatedCompletedQuestIds.includes(q.id));

    // Force immediate state updates
    setAvailableQuests(updatedAvailableQuests);
    setCompletedQuests(updatedCompletedQuests);

    // Update other UI states
    setSelectedQuest(prev => prev && prev.id === completingQuestId ? quest : prev);
    setSubmittedPhotoUrl(previewUrl);
    setSubmittedAt(new Date().toISOString());
    setShowCheckmarkSnackbar(true);
    setShowPreviewDialog(false);
    setTabValue(1);

    // Start the upload process
    setIsUploading(true);

    try {
      // Create a unique filename with timestamp to prevent conflicts
      const timestamp = new Date().getTime();
      const storagePath = `${user.id}/${completingQuestId}_${timestamp}.jpg`;
      const storageRef = ref(storage, storagePath);
      
      // Convert the file to a blob if it isn't already
      const blob = selectedFile instanceof Blob ? selectedFile : new Blob([selectedFile], { type: 'image/jpeg' });
      
      // Upload with metadata
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          submittedAt: new Date().toISOString(),
          questId: completingQuestId,
          userId: user.id
        }
      };

      console.log('Starting file upload...');
      const uploadResult = await uploadBytes(storageRef, blob, metadata);
      console.log('Upload completed:', uploadResult);

      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('Got download URL:', downloadURL);

      // Calculate points based on completion time
      const questCreationTime = new Date(quest.createdAt);
      const completionTime = new Date();
      const hoursSinceCreation = (completionTime.getTime() - questCreationTime.getTime()) / (1000 * 60 * 60);
      const points = hoursSinceCreation <= 12 ? 10 : 5;

      console.log('Updating user document with:', {
        points,
        completedQuests: updatedCompletedQuestIds
      });

      // Update user's completedQuests and points in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        points: (user.points || 0) + points,
        completedQuests: updatedCompletedQuestIds
      });

      console.log('User document updated successfully');

      // Update local state with real photo URL and timestamp
      setSubmittedPhotoUrl(downloadURL);
      setSubmittedAt(completionTime.toISOString());
      setCompletingQuestId(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error in quest completion:', error);
      // Revert all state changes on error
      setCompletedQuestIds(completedQuestIds.filter(id => id !== completingQuestId));
      setAvailableQuests(allQuests.filter(q => !completedQuestIds.includes(q.id)));
      setCompletedQuests(allQuests.filter(q => completedQuestIds.includes(q.id)));
      setSelectedQuest(prev => prev && prev.id === completingQuestId ? quest : prev);
      setSubmittedPhotoUrl(null);
      setSubmittedAt(null);
      alert('Failed to complete quest. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreviewDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleQuestClick = (quest: Quest) => {
    console.log('Clicked quest data:', quest);
    setSelectedQuest(quest);
  };

  const handleCloseModal = () => {
    setSelectedQuest(null);
  };

  const handleUpdateLocation = async (questId: string, newLocation: string) => {
    try {
      const questRef = doc(db, 'quests', questId);
      await updateDoc(questRef, {
        'location.address': newLocation
      });
      
      // Update the local state
      setAvailableQuests(prev => 
        prev.map(quest => 
          quest.id === questId 
            ? { ...quest, location: { ...quest.location, address: newLocation } }
            : quest
        )
      );
      
      setIsEditingLocation(false);
      setNewLocation('');
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    try {
      const questRef = doc(db, 'quests', questId);
      await deleteDoc(questRef);
      
      // Update local state
      setAvailableQuests(prev => prev.filter(quest => quest.id !== questId));
      setCompletedQuests(prev => prev.filter(quest => quest.id !== questId));
      setSelectedQuest(null);
    } catch (error) {
      console.error('Error deleting quest:', error);
    }
  };

  const handleUpdateQuest = async (questId: string, updatedQuest: Partial<Quest>) => {
    try {
      const questRef = doc(db, 'quests', questId);
      await updateDoc(questRef, updatedQuest);
      
      // Update the local state
      setAvailableQuests(prev => 
        prev.map(quest => 
          quest.id === questId 
            ? { ...quest, ...updatedQuest }
            : quest
        )
      );
      
      setCompletedQuests(prev => 
        prev.map(quest => 
          quest.id === questId 
            ? { ...quest, ...updatedQuest }
            : quest
        )
      );
      
      setIsEditingQuest(false);
      setEditingQuest(null);
    } catch (error) {
      console.error('Error updating quest:', error);
    }
  };

  const handleCreateQuest = async () => {
    try {
      const questRef = collection(db, 'quests');
      const docRef = await addDoc(questRef, {
        ...newQuest,
        createdAt: new Date().toISOString()
      });
      
      // Update local state
      const createdQuest = {
        id: docRef.id,
        ...newQuest,
        createdAt: new Date().toISOString()
      } as Quest;
      
      setAvailableQuests(prev => [...prev, createdQuest]);
      setIsCreatingQuest(false);
      setNewQuest({
        title: '',
        description: '',
        location: {
          coordinates: {
            latitude: 40.2518,
            longitude: -111.6493
          },
          address: ''
        },
        points: 100,
        photoURL: '',
        googleMapsLink: ''
      });
    } catch (error) {
      console.error('Error creating quest:', error);
    }
  };

  const loadStorageImages = async () => {
    try {
      setIsLoadingImages(true);
      const imagesRef = ref(storage, 'questPhotos');
      const result = await listAll(imagesRef);
      
      const urls = await Promise.all(
        result.items.map(async (itemRef) => {
          return await getDownloadURL(itemRef);
        })
      );
      
      setAvailableImages(urls);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    if (isEditingQuest && editingQuest) {
      setEditingQuest({ ...editingQuest, photoURL: imageUrl });
    } else {
      setNewQuest(prev => ({ ...prev, photoURL: imageUrl }));
    }
    setIsSelectingImage(false);
  };

  const handleCopyLink = (questId: string) => {
    const url = `${window.location.origin}/quest/${questId}`;
    navigator.clipboard.writeText(url);
    setShowCopySnackbar(true);
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Please log in to view quests</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ backgroundColor: 'white' }}>
      <Typography variant="h4" gutterBottom>
        Quests
      </Typography>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Available Quests" />
        <Tab label="Completed Quests" />
      </Tabs>
      <Box mt={2}>
        <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3} maxWidth="800px" margin="0 auto">
          {(tabValue === 0 ? availableQuests : completedQuests).map((quest) => {
            console.log('Rendering quest:', quest);
            return (
              <Box key={quest.id}>
                <Card 
                  onClick={() => handleQuestClick(quest)}
                  sx={{ 
                    height: '300px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      '& .quest-actions': {
                        opacity: 1,
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      backgroundImage: `url(${quest.photoURL})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'flex-end'
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        padding: 2
                      }}
                    >
                      <Typography variant="h6" color="white" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        {quest.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Box 
                    className="quest-actions"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 1,
                      opacity: 0,
                      transition: 'opacity 0.3s ease-in-out',
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderRadius: 1,
                      p: 0.5
                    }}
                  >
                    <Tooltip title="Copy Address">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(quest.id);
                        }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>

      {user?.isAdmin && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setIsCreatingQuest(true)}
        >
          <Add />
        </Fab>
      )}

      <Modal
        open={!!selectedQuest}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'auto'
          }}
        >
          {selectedQuest && (
            <>
              <IconButton
                onClick={handleCloseModal}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': {
                    bgcolor: 'white'
                  },
                  zIndex: 1
                }}
              >
                <Close />
              </IconButton>
              <Box
                sx={{
                  height: '300px',
                  backgroundImage: `url(${selectedQuest.photoURL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <Box p={3} sx={{ bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h4" gutterBottom>
                    {selectedQuest.title}
                  </Typography>
                  {user?.isAdmin && (
                    <Box>
                      <IconButton 
                        color="primary"
                        onClick={() => {
                          setEditingQuest(normalizeQuestLocation(selectedQuest));
                          setIsEditingQuest(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this quest?')) {
                            handleDeleteQuest(selectedQuest.id);
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Typography color="textSecondary" paragraph>
                  {selectedQuest.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    {selectedQuest.location?.address ?? 'No address available'}
                  </Typography>
                  {user?.isAdmin && (
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setNewLocation(selectedQuest.location?.address ?? '');
                        setIsEditingLocation(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                  )}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Directions />}
                    onClick={() => handleGetDirections(selectedQuest.googleMapsLink)}
                    fullWidth
                  >
                    Get Directions
                  </Button>
                  {submittedPhotoUrl ? (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        fullWidth
                        disabled
                      >
                        Completed
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleCompleteQuest(selectedQuest.id)}
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        Resubmit Photo
                      </Button>
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                        Warning: If you resubmit a photo, your new submission time will be used to determine points awarded for this quest.
                      </Typography>
                      <Box sx={{ width: '100%', mt: 2, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <img src={submittedPhotoUrl} alt="Submitted" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          Submitted on {submittedAt ? new Date(submittedAt).toLocaleString() : ''}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleCompleteQuest(selectedQuest.id)}
                      fullWidth
                    >
                      Complete Quest
                    </Button>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      <Dialog open={isEditingLocation} onClose={() => setIsEditingLocation(false)}>
        <DialogTitle>Update Location</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Location"
            type="text"
            fullWidth
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditingLocation(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedQuest && handleUpdateLocation(selectedQuest.id, newLocation)}
            variant="contained"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={isSelectingImage} 
        onClose={() => setIsSelectingImage(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Quest Image</DialogTitle>
        <DialogContent>
          {isLoadingImages ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, mt: 1 }}>
              {availableImages.map((url, index) => (
                <Card 
                  key={index}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      transition: 'transform 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleImageSelect(url)}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image={url}
                    alt={`Quest image ${index + 1}`}
                  />
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSelectingImage(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={isEditingQuest} 
        onClose={() => {
          setIsEditingQuest(false);
          setEditingQuest(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Quest</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Title"
              value={editingQuest?.title ?? ''}
              onChange={(e) => setEditingQuest(prev => prev ? { ...prev, title: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingQuest?.description ?? ''}
              onChange={(e) => setEditingQuest(prev => prev ? { ...prev, description: e.target.value } : null)}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Address"
              value={editingQuest?.location?.address ?? ''}
              onChange={(e) => setEditingQuest(prev => prev ? { 
                ...prev, 
                location: {
                  ...(prev.location || {}),
                  address: e.target.value,
                  coordinates: {
                    ...(prev.location?.coordinates || {})
                  }
                }
              } : null)}
              fullWidth
            />
            <TextField
              label="Latitude"
              value={editingQuest?.location?.coordinates?.latitude ?? parseCoordsFromGoogleMapsLink(editingQuest?.googleMapsLink ?? '')?.latitude ?? ''}
              onChange={(e) => setEditingQuest(prev => prev ? {
                ...prev,
                location: {
                  ...(prev.location || {}),
                  address: prev.location?.address ?? '',
                  coordinates: {
                    ...(prev.location?.coordinates || {}),
                    latitude: parseFloat(e.target.value) || 0
                  }
                }
              } : null)}
              fullWidth
            />
            <TextField
              label="Longitude"
              value={editingQuest?.location?.coordinates?.longitude ?? parseCoordsFromGoogleMapsLink(editingQuest?.googleMapsLink ?? '')?.longitude ?? ''}
              onChange={(e) => setEditingQuest(prev => prev ? {
                ...prev,
                location: {
                  ...(prev.location || {}),
                  address: prev.location?.address ?? '',
                  coordinates: {
                    ...(prev.location?.coordinates || {}),
                    longitude: parseFloat(e.target.value) || 0
                  }
                }
              } : null)}
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Photo URL"
                value={editingQuest?.photoURL ?? ''}
                onChange={(e) => setEditingQuest(prev => prev ? { ...prev, photoURL: e.target.value } : null)}
                fullWidth
              />
              <IconButton 
                onClick={() => {
                  loadStorageImages();
                  setIsSelectingImage(true);
                }}
                color="primary"
              >
                <Image />
              </IconButton>
            </Box>
            {editingQuest?.photoURL && (
              <Box sx={{ width: '100%', height: 200, position: 'relative' }}>
                <img 
                  src={editingQuest.photoURL} 
                  alt="Quest preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: 8
                  }} 
                />
              </Box>
            )}
            <TextField
              label="Google Maps Link"
              value={editingQuest?.googleMapsLink ?? ''}
              onChange={(e) => {
                const link = e.target.value;
                const coords = parseCoordsFromGoogleMapsLink(link);
                setEditingQuest(prev => prev ? {
                  ...prev,
                  googleMapsLink: link,
                  location: {
                    ...(prev.location || {}),
                    address: prev.location?.address ?? '',
                    coordinates: {
                      ...(prev.location?.coordinates || {}),
                      latitude: coords?.latitude ?? prev.location?.coordinates?.latitude ?? 0,
                      longitude: coords?.longitude ?? prev.location?.coordinates?.longitude ?? 0,
                    }
                  }
                } : null);
              }}
              fullWidth
            />
            <TextField
              label="Points"
              type="number"
              value={editingQuest?.points ?? 0}
              onChange={(e) => setEditingQuest(prev => prev ? { ...prev, points: parseInt(e.target.value) || 0 } : null)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsEditingQuest(false);
            setEditingQuest(null);
          }}>Cancel</Button>
          <Button 
            onClick={() => editingQuest && handleUpdateQuest(editingQuest.id, editingQuest)}
            variant="contained"
            disabled={!editingQuest?.title || !editingQuest?.description || !editingQuest?.photoURL}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={isCreatingQuest} 
        onClose={() => setIsCreatingQuest(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Quest</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Title"
              value={newQuest.title}
              onChange={(e) => setNewQuest(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={newQuest.description}
              onChange={(e) => setNewQuest(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Address"
              value={newQuest.location.address}
              onChange={(e) => setNewQuest(prev => ({ 
                ...prev, 
                location: { ...prev.location, address: e.target.value }
              }))}
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Photo URL"
                value={newQuest.photoURL}
                onChange={(e) => setNewQuest(prev => ({ ...prev, photoURL: e.target.value }))}
                fullWidth
              />
              <IconButton 
                onClick={() => {
                  loadStorageImages();
                  setIsSelectingImage(true);
                }}
                color="primary"
              >
                <Image />
              </IconButton>
            </Box>
            {newQuest.photoURL && (
              <Box sx={{ width: '100%', height: 200, position: 'relative' }}>
                <img 
                  src={newQuest.photoURL} 
                  alt="Quest preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: 8
                  }} 
                />
              </Box>
            )}
            <TextField
              label="Google Maps Link"
              value={newQuest.googleMapsLink}
              onChange={(e) => setNewQuest(prev => ({ ...prev, googleMapsLink: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Points"
              type="number"
              value={newQuest.points}
              onChange={(e) => setNewQuest(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreatingQuest(false)}>Cancel</Button>
          <Button 
            onClick={() => setShowQuestPreview(true)}
            variant="outlined"
            disabled={!newQuest.title || !newQuest.description || !newQuest.photoURL}
          >
            Preview
          </Button>
          <Button 
            onClick={handleCreateQuest}
            variant="contained"
            disabled={!newQuest.title || !newQuest.description || !newQuest.photoURL}
          >
            Create Quest
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showQuestPreview} onClose={() => setShowQuestPreview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Quest Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            {newQuest.photoURL && (
              <Box sx={{ width: '100%', height: 200, position: 'relative', mb: 2 }}>
                <img 
                  src={newQuest.photoURL} 
                  alt="Quest preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: 8
                  }} 
                />
              </Box>
            )}
            <Typography variant="h5" gutterBottom>{newQuest.title}</Typography>
            <Typography color="textSecondary" paragraph>{newQuest.description}</Typography>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              {newQuest.location.address || 'No address available'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Points: {newQuest.points}
            </Typography>
            {newQuest.googleMapsLink && (
              <Button
                variant="outlined"
                href={newQuest.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 2 }}
              >
                View on Google Maps
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQuestPreview(false)} variant="contained">Close Preview</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showPreviewDialog} onClose={handleCancelPreview} maxWidth="sm" fullWidth>
        <DialogTitle>Preview Photo</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box display="flex" justifyContent="center" alignItems="center" p={2}>
              <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPreview}>Cancel</Button>
          <Button 
            onClick={() => {
              console.log('Submit button clicked');
              handleSubmitPhoto();
            }} 
            variant="contained" 
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handlePhotoSelected}
      />

      {isUploading && (
        <Modal open={true}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="rgba(255,255,255,0.8)">
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Uploading photo...</Typography>
          </Box>
        </Modal>
      )}

      <Snackbar 
        open={showCopySnackbar} 
        autoHideDuration={3000} 
        onClose={() => setShowCopySnackbar(false)}
      >
        <Alert severity="success" onClose={() => setShowCopySnackbar(false)}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>

      <Snackbar 
        open={showCheckmarkSnackbar} 
        autoHideDuration={2000} 
        onClose={() => setShowCheckmarkSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ fontSize: 18 }}>
          Quest completed!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Quests; 