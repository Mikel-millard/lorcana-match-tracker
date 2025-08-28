import React, { useState, useEffect } from 'react';
import { db, auth, updateEvent } from '../firebase';
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';

interface Event {
  id: string;
  name: string;
  type: string;
  userDeckId: string;
  userDeckName?: string;
  startDate: Date;
  format: string;
}

interface EventFormProps {
  onEventCreated: () => void;
  onEventUpdated: () => void;
  eventToEdit?: Event | null;
  onCancel: () => void;
}

interface Deck {
  id: string;
  name: string;
  inkColors: string[];
  archetypes: string[];
  format: string;
}

const EventForm: React.FC<EventFormProps> = ({ onEventCreated, onEventUpdated, eventToEdit, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Tournament');
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [selectedDeckName, setSelectedDeckName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [format, setFormat] = useState('Infinity');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [decksError, setDecksError] = useState<string | null>(null);

  // Effect to populate form when editing
  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name);
      setType(eventToEdit.type);
      setSelectedDeckId(eventToEdit.userDeckId);
      // Find and set the deck name for display
      const deck = decks.find(d => d.id === eventToEdit.userDeckId);
      if (deck) {
        setSelectedDeckName(deck.name);
      }
      // Format date for input field
      const date = eventToEdit.startDate.toDate ? eventToEdit.startDate.toDate() : new Date(eventToEdit.startDate);
      setStartDate(date.toISOString().split('T')[0]);
      setFormat(eventToEdit.format);
    } else {
      // Reset form when not editing
      setName('');
      setType('Tournament');
      setStartDate('');
      setFormat('Infinity');
      if (decks.length > 0) {
        setSelectedDeckId(decks[0].id);
        setSelectedDeckName(decks[0].name);
      } else {
        setSelectedDeckId('');
        setSelectedDeckName('');
      }
    }
  }, [eventToEdit, decks]);

  useEffect(() => {
    const fetchDecks = async () => {
      if (!auth.currentUser) {
        setDecksError('No user logged in to fetch decks.');
        setLoadingDecks(false);
        return;
      }
      try {
        const userUid = auth.currentUser.uid;
        const decksCollectionRef = collection(db, `users/${userUid}/decks`);
        const q = query(decksCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedDecks: Deck[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          inkColors: doc.data().inkColors || [],
          archetypes: doc.data().archetypes || [],
          format: doc.data().format,
        }));
        setDecks(fetchedDecks);
        if (fetchedDecks.length > 0) {
          setSelectedDeckId(fetchedDecks[0].id);
          setSelectedDeckName(fetchedDecks[0].name);
        }
      } catch (err: unknown) {
          if (err instanceof Error) {
              setError(err.message);
          } else {
              setError('An unknown error occurred while fetching decks.');
          }
        console.error("Error fetching decks:", err);
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchDecks();
  }, []); // Removed auth.currentUser from dependency array

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth.currentUser) {
      setError('No user logged in.');
      setLoading(false);
      return;
    }

    if (name.trim() === '') {
      setError('Event name cannot be empty.');
      setLoading(false);
      return;
    }

    if (!selectedDeckId) {
      setError('Please select a deck.');
      setLoading(false);
      return;
    }

    try {
      const userUid = auth.currentUser.uid;
      const eventData = {
        name,
        type,
        userDeckId: selectedDeckId,
        userDeckName: selectedDeckName,
        startDate: Timestamp.fromDate(new Date(startDate)),
        format,
      };

      if (eventToEdit) {
        // Update existing event
        await updateEvent(eventToEdit.id, eventData);
        alert('Event updated successfully!');
        onEventUpdated();
      } else {
        // Create new event
        const newEventData = {
            ...eventData,
            wins: 0,
            losses: 0,
            draws: 0,
            createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, `users/${userUid}/events`), newEventData);
        alert('Event created successfully!');
        onEventCreated();
      }

      // Reset form state
      setName('');
      setSelectedDeckId(decks.length > 0 ? decks[0].id : '');
      setSelectedDeckName(decks.length > 0 ? decks[0].name : '');
      setStartDate('');
      setType('Tournament');
      setFormat('Infinity');

    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while processing event.');
        }
      console.error('Error processing event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-xl font-bold text-white mb-4">Create New Event/Session</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-white text-sm font-bold mb-2">Event Name:</label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-white text-sm font-bold mb-2">Type:</label>
          <select
            id="type"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Tournament">Tournament</option>
            <option value="Playtest">Playtest</option>
          </select>
        </div>

        <div>
          <label htmlFor="selectedDeck" className="block text-white text-sm font-bold mb-2">Your Deck:</label>
          {loadingDecks ? (
            <p className="text-gray-300">Loading decks...</p>
          ) : decksError ? (
            <p className="text-red-500">Error loading decks: {decksError}</p>
          ) : decks.length === 0 ? (
            <p className="text-gray-300">No decks found. Please create a deck first.</p>
          ) : (
            <select
              id="selectedDeck"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
              value={selectedDeckId}
              onChange={(e) => {
                setSelectedDeckId(e.target.value);
                const deck = decks.find(d => d.id === e.target.value);
                if (deck) setSelectedDeckName(deck.name);
              }}
              required
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>{deck.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="startDate" className="block text-white text-sm font-bold mb-2">Start Date:</label>
          <input
            type="date"
            id="startDate"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="format" className="block text-white text-sm font-bold mb-2">Format:</label>
          <select
            id="format"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="Infinity">Infinity</option>
            <option value="Core">Core</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          disabled={loading || loadingDecks || decks.length === 0}
        >
          {loading ? (eventToEdit ? 'Updating...' : 'Creating...') : (eventToEdit ? 'Update Event' : 'Create Event')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mt-2"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

export default EventForm;