import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Paper,
  Divider,
} from '@mui/material';
import { signInWithPopup, signInWithPhoneNumber, signInWithCredential } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { PhoneAuthProvider } from 'firebase/auth';

const Login = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create or update user document
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: user.displayName || user.phoneNumber || 'Anonymous User',
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        points: 0,
        sons: [],
        completedQuests: [],
      }, { merge: true });

      navigate('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handlePhoneSignIn = async () => {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
      setVerificationId(confirmationResult.verificationId);
      setShowVerificationInput(true);
    } catch (error) {
      console.error('Error sending verification code:', error);
    }
  };

  const handleVerificationCode = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Create or update user document
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: user.phoneNumber || 'Anonymous User',
        displayName: user.phoneNumber,
        email: null,
        photoURL: null,
        points: 0,
        sons: [],
        completedQuests: [],
      }, { merge: true });

      navigate('/');
    } catch (error) {
      console.error('Error verifying code:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Welcome to CougarQuest
          </Typography>

          <Button
            variant="contained"
            fullWidth
            onClick={handleGoogleSignIn}
            sx={{ mb: 2 }}
          >
            Sign in with Google
          </Button>

          <Divider>or</Divider>

          {!showVerificationInput ? (
            <>
              <TextField
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                fullWidth
                placeholder="+1234567890"
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={handlePhoneSignIn}
              >
                Send Verification Code
              </Button>
            </>
          ) : (
            <>
              <TextField
                label="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                fullWidth
              />
              <Button
                variant="outlined"
                fullWidth
                onClick={handleVerificationCode}
              >
                Verify Code
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 