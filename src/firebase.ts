import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

export const getUserProfile = async (uid: string) => {
  try {
    const userDocRef = doc(db, `users`, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Example of a function to add a deck (can be expanded)
interface DeckData {
  name: string;
  inkColors: string[];
  archetypes: string[];
  format: string;
  ownerId: string;
  createdAt: Timestamp;
}

interface EventData {
  name: string;
  type: string;
  userDeckId: string;
  userDeckName?: string;
  startDate: Timestamp;
  format: string;
}

export const addDeck = async (deckData: DeckData) => {
  if (!auth.currentUser) {
    throw new Error("No user logged in.");
  }
  try {
    const userUid = auth.currentUser.uid;
    const docRef = await addDoc(collection(db, `users/${userUid}/decks`), {
      ...deckData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (e: Error) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const updateEvent = async (eventId: string, eventData: EventData) => {
  if (!auth.currentUser) {
    throw new Error("No user logged in.");
  }
  try {
    const userUid = auth.currentUser.uid;
    const eventRef = doc(db, `users/${userUid}/events`, eventId);
    await updateDoc(eventRef, eventData);
  } catch (e: unknown) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

export const deleteEvent = async (eventId: string) => {
  if (!auth.currentUser) {
    throw new Error('No user logged in.');
  }
  try {
    const userUid = auth.currentUser.uid;
    const eventRef = doc(db, `users/${userUid}/events`, eventId);

    // Delete all rounds in the event's subcollection
    const roundsRef = collection(db, `users/${userUid}/events/${eventId}/rounds`);
    const roundsSnapshot = await getDocs(roundsRef);
    const batch = writeBatch(db);
    roundsSnapshot.docs.forEach((roundDoc) => {
      batch.delete(roundDoc.ref);
    });
    await batch.commit();

    // Delete the event itself
    await deleteDoc(eventRef);
  } catch (err: unknown) {
    console.error('Error deleting event:', err);
    throw err;
  }
};