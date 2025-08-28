import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, QueryDocumentSnapshot, getDoc, doc, getDocs, deleteDoc, updateDoc, increment, where } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { inkColorsData } from '../utils/inkColors';
import InkSvg from './InkSvg';
import Modal from './Modal';
import { deleteEvent } from '../firebase';
import EventForm from './EventForm';
import { Link } from 'react-router-dom';

interface Game {
  result: string;
  onThePlay: boolean;
}

interface Round {
  id: string;
  opponentInkColors: string[];
  games: Game[];
  createdAt: Date | Timestamp; // Allow Timestamp from Firestore
  outcome?: 'win' | 'loss' | 'draw'; // ADDED
  roundWins?: number; // ADDED
  roundLosses?: number; // ADDED
  roundDraws?: number; // ADDED
  onPlayWins?: number; // ADDED
  onPlayLosses?: number; // ADDED
  onPlayDraws?: number; // ADDED
  onDrawWins?: number; // ADDED
  onDrawLosses?: number; // ADDED
  onDrawDraws?: number; // ADDED
}

interface Event {
  id: string;
  name: string;
  type: string;
  userDeckId: string;
  userDeckName?: string;
  userDeckInkColors?: string[];
  startDate: Date;
  format: string;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  rounds?: Round[];
  matchWinRate?: number;
  gameWinRate?: number;
  onPlayGameWinRate?: number;
  onDrawGameWinRate?: number;
  gamesLost?: number; // ADDED
  gamesDrawn?: number; // ADDED
  matchesWon?: number; // ADDED
  matchesLost?: number; // ADDED
  matchesDrawn?: number; // ADDED
}

const EventList: React.FC = () => {
  const [selectedEventIdForRound, setSelectedEventIdForRound] = useState<string | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editingRoundData, setEditingRoundData] = useState<Round | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'Playtest' | 'Tournament'>('all'); // New state for filtering

  const getInkImage = (inkName: string) => {
    const ink = inkColorsData.find(i => i.name === inkName);
    return ink ? ink.image : '';
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setEventsError('No user logged in to fetch events.');
      setLoadingEvents(false);
      return;
    }

    const userUid = auth.currentUser.uid;
    const eventsCollectionRef = collection(db, `users/${userUid}/events`);
    let q = query(eventsCollectionRef, orderBy('startDate', 'desc'));

    if (eventTypeFilter !== 'all') {
      q = query(eventsCollectionRef, where('type', '==', eventTypeFilter), orderBy('startDate', 'desc'));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedEvents: Event[] = [];
      const eventPromises = snapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnapshot.data();
        const event: Event = {
          id: docSnapshot.id,
          name: data.name,
          type: data.type,
          userDeckId: data.userDeckId,
          startDate: data.startDate.toDate(),
          format: data.format,
          wins: data.wins,
          losses: data.losses,
          draws: data.draws,
          createdAt: data.createdAt.toDate(),
        };

        // Fetch deck details for display
        if (event.userDeckId) {
          try {
            const deckDocRef = doc(db, `users/${userUid}/decks/${event.userDeckId}`);
            const deckDocSnap = await getDoc(deckDocRef);
            if (deckDocSnap.exists()) {
              const deckData = deckDocSnap.data();
              event.userDeckName = deckData.name;
              event.userDeckInkColors = deckData.inkColors || [];
            } else {
              event.userDeckName = 'Unknown Deck';
              event.userDeckInkColors = [];
            }
          } catch (deckError: Error) {
            console.error("Error fetching deck details for event:", event.id, deckError);
            event.userDeckName = 'Error fetching deck';
            event.userDeckInkColors = [];
          }
        } else {
          // Handle old events that might not have userDeckId
          event.userDeckName = data.userDeck || 'No Deck Selected';
          event.userDeckInkColors = [];
        }

        // Fetch rounds for this event (for display later)
        const roundsCollectionRef = collection(db, `users/${userUid}/events/${event.id}/rounds`);
        const roundsQuery = query(roundsCollectionRef, orderBy('createdAt', 'asc'));
        const roundsSnapshot = await getDocs(roundsQuery); // Use getDocs for one-time fetch
        event.rounds = roundsSnapshot.docs.map(roundDoc => {
          const roundGames: Game[] = roundDoc.data().games || [];
          let playerWins = 0;
          let playerLosses = 0;
          let playerDraws = 0; // ADDED

          let onPlayWins = 0;
          let onPlayLosses = 0;
          let onPlayDraws = 0;
          let onDrawWins = 0;
          let onDrawLosses = 0;
          let onDrawDraws = 0;

          roundGames.forEach(game => {
            if (game.onThePlay) {
              if (game.result === 'win') onPlayWins++;
              else if (game.result === 'loss') onPlayLosses++;
              else if (game.result === 'draw') onPlayDraws++;
            } else {
              if (game.result === 'win') onDrawWins++;
              else if (game.result === 'loss') onDrawLosses++;
              else if (game.result === 'draw') onDrawDraws++;
            }
            // Overall round wins/losses/draws
            if (game.result === 'win') playerWins++;
            else if (game.result === 'loss') playerLosses++;
            else if (game.result === 'draw') playerDraws++;
          });

          let outcome: 'win' | 'loss' | 'draw';
          if (playerWins > playerLosses) {
            outcome = 'win';
          } else if (playerLosses > playerWins) {
            outcome = 'loss';
          } else {
            outcome = 'draw';
          }

          return {
            id: roundDoc.id,
            opponentInkColors: roundDoc.data().opponentInkColors || [],
            games: roundGames,
            createdAt: roundDoc.data().createdAt.toDate(),
            outcome: outcome,
            roundWins: playerWins,
            roundLosses: playerLosses,
            roundDraws: playerDraws,
            onPlayWins: onPlayWins, // ADDED
            onPlayLosses: onPlayLosses, // ADDED
            onPlayDraws: onPlayDraws, // ADDED
            onDrawWins: onDrawWins, // ADDED
            onDrawLosses: onDrawLosses, // ADDED
            onDrawDraws: onDrawDraws, // ADDED
          };
        });

        // Calculate win rates for the event
        let totalMatches = 0;
        let matchesWon = 0;
        let matchesLost = 0;
        let matchesDrawn = 0;

        let totalGames = 0;
        let gamesWon = 0;
        let gamesLost = 0; // ADDED
        let gamesDrawn = 0; // ADDED
        let gamesPlayedOnPlay = 0;
        let gamesWonOnPlay = 0;
        let gamesPlayedOnDraw = 0;
        let gamesWonOnDraw = 0;

        event.rounds?.forEach(round => {
          totalMatches++; // Each round is a match
          let playerWins = 0;
          let playerLosses = 0;

          round.games.forEach(game => {
            totalGames++;
            if (game.result === 'win') {
              gamesWon++;
              playerWins++;
            } else if (game.result === 'loss') {
              gamesLost++; // ADDED
              playerLosses++;
            } else if (game.result === 'draw') { // ADDED
              gamesDrawn++; // ADDED
            }

            if (game.onThePlay) {
              gamesPlayedOnPlay++;
              if (game.result === 'win') {
                gamesWonOnPlay++;
              }
            } else {
              gamesPlayedOnDraw++;
              if (game.result === 'win') {
                gamesWonOnDraw++;
              }
            }
          });

          if (playerWins > playerLosses) {
            matchesWon++;
          } else if (playerLosses > playerWins) {
            matchesLost++;
          } else {
            matchesDrawn++;
          }
        });

        const matchWinRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
        const gameWinRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
        const onPlayGameWinRate = gamesPlayedOnPlay > 0 ? (gamesWonOnPlay / gamesPlayedOnPlay) * 100 : 0;
        const onDrawGameWinRate = gamesPlayedOnDraw > 0 ? (gamesWonOnDraw / gamesPlayedOnDraw) * 100 : 0;

        fetchedEvents.push({
          ...event,
          matchWinRate: parseFloat(matchWinRate.toFixed(2)),
          gameWinRate: parseFloat(gameWinRate.toFixed(2)),
          onPlayGameWinRate: parseFloat(onPlayGameWinRate.toFixed(2)),
          onDrawGameWinRate: parseFloat(onDrawGameWinRate.toFixed(2)),
          gamesLost: gamesLost,
          gamesDrawn: gamesDrawn,
          matchesWon: matchesWon, // ADDED
          matchesLost: matchesLost, // ADDED
          matchesDrawn: matchesDrawn, // ADDED
        });
      });

      await Promise.all(eventPromises);
      setEvents(fetchedEvents);
      setLoadingEvents(false);
    }, (error: Error) => {
      console.error("Error fetching events:", error);
      setEventsError(error.message);
      setLoadingEvents(false);
    });

    return () => unsubscribe();
  }, [eventTypeFilter]); // Added eventTypeFilter to dependency array

  const handleRoundAdded = () => {
    setSelectedEventIdForRound(null);
    setEditingRoundId(null); // Clear editing state
    setEditingRoundData(null); // Clear editing state
  };

  const handleEditRound = (eventId: string, round: Round) => {
    console.log('handleEditRound called with:', { eventId, round }); // ADD THIS
    setSelectedEventIdForRound(eventId);
    setEditingRoundId(round.id);
    setEditingRoundData(round);
  };

  const handleDeleteRound = async (eventId: string, roundId: string, games: Game[]) => {
    if (!auth.currentUser) {
      alert('No user logged in.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this round? This action cannot be undone.')) {
      return;
    }

    try {
      const userUid = auth.currentUser.uid;
      // Delete the round document
      await deleteDoc(doc(db, `users/${userUid}/events/${eventId}/rounds`, roundId));

      // Update event's wins/losses/draws
      const eventRef = doc(db, `users/${userUid}/events/${eventId}`);
      let eventWins = 0;
      let eventLosses = 0;
      let eventDraws = 0;

      games.forEach(game => {
        if (game.result === 'win') eventWins++;
        else if (game.result === 'loss') eventLosses++;
        else if (game.result === 'draw') eventDraws++;
      });

      await updateDoc(eventRef, {
        wins: increment(-eventWins),
        losses: increment(-eventLosses),
        draws: increment(-eventDraws),
      });

      alert('Round deleted successfully!');
    } catch (err: Error) {
      console.error('Error deleting round:', err);
      alert(`Error deleting round: ${err.message}`);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete.id);
      alert('Event deleted successfully!');
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (err: Error) {
      console.error('Error deleting event:', err);
      alert(`Error deleting event: ${err.message}`);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center space-x-4 mb-4">
        <h3 className="text-xl font-bold text-white">Your Events</h3>
        <div className="flex space-x-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="eventTypeFilter"
              value="all"
              checked={eventTypeFilter === 'all'}
              onChange={() => setEventTypeFilter('all')}
            />
            <span className="ml-2 text-white">All</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="eventTypeFilter"
              value="Playtest"
              checked={eventTypeFilter === 'Playtest'}
              onChange={() => setEventTypeFilter('Playtest')}
            />
            <span className="ml-2 text-white">Playtest</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="eventTypeFilter"
              value="Tournament"
              checked={eventTypeFilter === 'Tournament'}
              onChange={() => setEventTypeFilter('Tournament')}
            />
            <span className="ml-2 text-white">Tournament</span>
          </label>
        </div>
      </div>
      {loadingEvents && <p className="text-white">Loading events...</p>}
      {eventsError && <p className="text-red-500">Error: {eventsError}</p>}
      {!loadingEvents && events.length === 0 && !eventsError && (
        <p className="text-white">No events found. Create your first event!</p>
      )}
      <div className="grid grid-cols-1 gap-4">
        {events.map((event) => (
          <Link to={`/events/${event.id}`} key={event.id} className="block bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 hover:bg-gray-700 transition-shadow duration-200">
            <h4 className="text-lg font-semibold text-white">{event.name} ({event.type})</h4>
            <p className="text-gray-300 text-sm">
              {event.matchesWon !== undefined ? `${event.matchesWon} - ${event.matchesLost} - ${event.matchesDrawn}` : 'N/A'}
              {event.gamesWon !== undefined && event.gamesLost !== undefined && event.gamesDrawn !== undefined && (
                ` (${event.gamesWon} - ${event.gamesLost} - ${event.gamesDrawn})`
              )}
            </p>
            <p className="text-gray-300">Deck: {event.userDeckName}</p>
            <p className="text-gray-300">Date: {event.startDate.toLocaleDateString()}</p>
            <p className="text-gray-300">Format: {event.format}</p>
            <div className="flex space-x-4 flex-shrink-0 mt-2"> {/* Container for stats mini-cards, removed min-w */}
              {event.matchWinRate !== undefined && (
                <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                  <p className="text-lg font-semibold text-white text-center">Match Win %</p>
                  <p className="text-base text-gray-200">{event.matchWinRate}%</p>
                </div>
              )}
              {event.gameWinRate !== undefined && (
                <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                  <p className="text-lg font-semibold text-white text-center">Game Win %</p>
                  <p className="text-base text-gray-200">{event.gameWinRate}%</p>
                </div>
              )}
              {event.onPlayGameWinRate !== undefined && (
                <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                  <p className="text-lg font-semibold text-white text-center">On Play Win %</p>
                  <p className="text-base text-gray-200">{event.onPlayGameWinRate}%</p>
                </div>
              )}
              {event.onDrawGameWinRate !== undefined && (
                <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                  <p className="text-lg font-semibold text-white text-center">On Draw Win %</p>
                  <p className="text-base text-gray-200">{event.onDrawGameWinRate}%</p>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSelectedEventIdForRound(event.id); }}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-sm"
            >
              Add Round
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation(); e.preventDefault();
                console.log('Event to edit:', event);
                setEventToEdit(event);
                setIsEditModalOpen(true);
              }}
              className="mt-4 ml-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-lg text-sm"
            >
              Edit Event
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEventToDelete(event); setIsDeleteModalOpen(true); }}
              className="mt-4 ml-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-sm"
            >
              Delete Event
            </button>

            
          </Link>
        ))}
      </div>

      <Modal isOpen={!!selectedEventIdForRound} onClose={() => { setSelectedEventIdForRound(null); setEditingRoundId(null); setEditingRoundData(null); }} title={editingRoundId ? "Edit Round" : "Add New Round"}>
        {selectedEventIdForRound && (
          <RoundForm
            eventId={selectedEventIdForRound}
            eventType={events.find(e => e.id === selectedEventIdForRound)?.type || 'Tournament'}
            onRoundAdded={handleRoundAdded}
            roundId={editingRoundId}
            roundData={editingRoundData}
          />
        )}
      </Modal>

      {/* Edit Event Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => {
        setIsEditModalOpen(false);
        setEventToEdit(null);
      }} title="Edit Event">
        {eventToEdit && (
          <EventForm
            key={eventToEdit.id} // Add key prop to force re-mount
            eventToEdit={eventToEdit}
            onEventUpdated={() => {
              setIsEditModalOpen(false);
              setEventToEdit(null);
            }}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEventToEdit(null);
            }}
            onEventCreated={() => { // This is not used in edit mode, but the component expects it
            }}
          />
        )}
      </Modal>

      {/* Delete Event Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {eventToDelete && (
          <div>
            <p className="text-white">Are you sure you want to delete the event "{eventToDelete.name}"?</p>
            <p className="text-red-500">This will also delete all associated rounds and cannot be undone.</p>
            <div className="mt-4 flex justify-end space-x-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EventList;


interface Timestamp {
  toDate(): Date;
}
