import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, PhoneAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB05BESHEsgffXXfSPDjt8wvPWxTXG9da0",
  authDomain: "cougarquest-62ba2.firebaseapp.com",
  projectId: "cougarquest-62ba2",
  storageBucket: "cougarquest-62ba2.appspot.com",
  messagingSenderId: "930268237097",
  appId: "1:930268237097:web:84d51fdd01c5880e84bb38",
  measurementId: "G-8YYWWS8HPT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Configure Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const phoneProvider = new PhoneAuthProvider(auth);

export default app; 