import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { inkColorsData } from '../utils/inkColors';
import InkSvg from './InkSvg';

interface Game {
  result: string;
  onThePlay: boolean;
}

interface Round {
  id: string;
  opponentInkColors: string[];
  games: Game[];
  createdAt: Date;
  outcome?: 'win' | 'loss' | 'draw';
  roundWins?: number;
  roundLosses?: number;
  roundDraws?: number;
  onPlayWins?: number;
  onPlayLosses?: number;
  onPlayDraws?: number;
  onDrawWins?: number;
  onDrawLosses?: number;
  onDrawDraws?: number;
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
  gamesWon?: number;
  gamesLost?: number;
  gamesDrawn?: number;
  matchesWon?: number;
  matchesLost?: number;
  matchesDrawn?: number;
}

const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getInkImage = (inkName: string) => {
    const ink = inkColorsData.find(i => i.name === inkName);
    return ink ? ink.image : '';
  };

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!auth.currentUser || !eventId) {
        setError('No user logged in or event ID provided.');
        setLoading(false);
        return;
      }

      const userUid = auth.currentUser.uid;

      try {
        // Fetch event details
        const eventDocRef = doc(db, `users/${userUid}/events`, eventId);
        const eventDocSnap = await getDoc(eventDocRef);

        if (!eventDocSnap.exists()) {
          setError('Event not found.');
          setLoading(false);
          return;
        }

        const eventData = eventDocSnap.data() as Event;
        const fetchedEvent: Event = {
          id: eventDocSnap.id,
          name: eventData.name,
          type: eventData.type,
          userDeckId: eventData.userDeckId,
          startDate: eventData.startDate.toDate(),
          format: eventData.format,
          wins: eventData.wins,
          losses: eventData.losses,
          draws: eventData.draws,
          createdAt: eventData.createdAt.toDate(),
        };

        // Fetch deck details for display
        if (fetchedEvent.userDeckId) {
          try {
            const deckDocRef = doc(db, `users/${userUid}/decks/${fetchedEvent.userDeckId}`);
            const deckDocSnap = await getDoc(deckDocRef);
            if (deckDocSnap.exists()) {
              const deckData = deckDocSnap.data();
              fetchedEvent.userDeckName = deckData.name;
              fetchedEvent.userDeckInkColors = deckData.inkColors || [];
            } else {
              fetchedEvent.userDeckName = 'Unknown Deck';
              fetchedEvent.userDeckInkColors = [];
            }
          } catch (deckError: unknown) {
            console.error("Error fetching deck details for event:", fetchedEvent.id, deckError);
            fetchedEvent.userDeckName = 'Error fetching deck';
            fetchedEvent.userDeckInkColors = [];
            if (deckError instanceof Error) {
              setError(deckError.message);
            } else {
              setError('An unknown error occurred while fetching deck details.');
            }
          }
        } else {
          fetchedEvent.userDeckName = eventData.userDeck || 'No Deck Selected';
          fetchedEvent.userDeckInkColors = [];
        }

        // Fetch rounds for this event
        const roundsCollectionRef = collection(db, `users/${userUid}/events/${eventId}/rounds`);
        const roundsQuery = query(roundsCollectionRef, orderBy('createdAt', 'asc'));
        const roundsSnapshot = await getDocs(roundsQuery);
        fetchedEvent.rounds = roundsSnapshot.docs.map(roundDoc => {
          const roundGames: Game[] = roundDoc.data().games || [];
          let playerWins = 0;
          let playerLosses = 0;
          let playerDraws = 0;

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
            onPlayWins: onPlayWins,
            onPlayLosses: onPlayLosses,
            onPlayDraws: onPlayDraws,
            onDrawWins: onDrawWins,
            onDrawLosses: onDrawLosses,
            onDrawDraws: onDrawDraws,
          };
        });

        // Calculate win rates for the event (similar to EventList)
        let totalMatches = 0;
        let matchesWon = 0;
        let matchesLost = 0;
        let matchesDrawn = 0;

        let totalGames = 0;
        let gamesWon = 0;
        let gamesLost = 0;
        let gamesDrawn = 0;
        let gamesPlayedOnPlay = 0;
        let gamesWonOnPlay = 0;
        let gamesPlayedOnDraw = 0;
        let gamesWonOnDraw = 0;

        fetchedEvent.rounds?.forEach(round => {
          totalMatches++;
          let playerWins = 0;
          let playerLosses = 0;

          round.games.forEach(game => {
            totalGames++;
            if (game.result === 'win') {
              gamesWon++;
              playerWins++;
            } else if (game.result === 'loss') {
              gamesLost++;
              playerLosses++;
            } else if (game.result === 'draw') {
              gamesDrawn++;
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

        fetchedEvent.matchWinRate = parseFloat(matchWinRate.toFixed(2));
        fetchedEvent.gameWinRate = parseFloat(gameWinRate.toFixed(2));
        fetchedEvent.onPlayGameWinRate = parseFloat(onPlayGameWinRate.toFixed(2));
        fetchedEvent.onDrawGameWinRate = parseFloat(onDrawGameWinRate.toFixed(2));
        fetchedEvent.gamesWon = gamesWon;
        fetchedEvent.gamesLost = gamesLost;
        fetchedEvent.gamesDrawn = gamesDrawn;
        fetchedEvent.matchesWon = matchesWon;
        fetchedEvent.matchesLost = matchesLost;
        fetchedEvent.matchesDrawn = matchesDrawn;

        setEvent(fetchedEvent);
      } catch (err: unknown) {
        console.error("Error fetching event details:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while fetching event details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  if (loading) {
    return <div className="text-white p-4">Loading event details...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!event) {
    return <div className="text-white p-4">No event found.</div>;
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">Event Details: {event.name} ({event.type})</h2>
      <p>Deck: {event.userDeckName} {event.userDeckInkColors && event.userDeckInkColors.map(ink => (
        <InkSvg key={ink} svgString={getInkImage(ink)} alt={ink} className="w-6 h-6 inline-block ml-1" />
      ))}</p>
      <p>Date: {event.startDate.toLocaleDateString()}</p>
      <p>Format: {event.format}</p>
      <p>Record: {event.matchesWon} - {event.matchesLost} - {event.matchesDrawn} ({event.gamesWon} - {event.gamesLost} - {event.gamesDrawn})</p>

      <div className="flex space-x-4 flex-wrap mt-4">
        {event.matchWinRate !== undefined && (
          <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center mb-2">
            <p className="text-lg font-semibold text-white text-center">Match Win %</p>
            <p className="text-base text-gray-200">{event.matchWinRate}%</p>
          </div>
        )}
        {event.gameWinRate !== undefined && (
          <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center mb-2">
            <p className="text-lg font-semibold text-white text-center">Game Win %</p>
            <p className="text-base text-gray-200">{event.gameWinRate}%</p>
          </div>
        )}
        {event.onPlayGameWinRate !== undefined && (
          <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center mb-2">
            <p className="text-lg font-semibold text-white text-center">On Play Win %</p>
            <p className="text-base text-gray-200">{event.onPlayGameWinRate}%</p>
          </div>
        )}
        {event.onDrawGameWinRate !== undefined && (
          <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center mb-2">
            <p className="text-lg font-semibold text-white text-center">On Draw Win %</p>
            <p className="text-base text-gray-200">{event.onDrawGameWinRate}%</p>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4">Rounds:</h3>
      {event.rounds && event.rounds.length > 0 ? (
        <div className="space-y-4">
          {event.rounds.map(round => (
            <div key={round.id} className={`p-4 rounded-lg shadow-md ${round.outcome === 'win' ? 'bg-green-700' : round.outcome === 'loss' ? 'bg-red-700' : 'bg-blue-700'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <p className="text-lg font-semibold">Round vs</p>
                  <div className="flex space-x-2 ml-2">
                    {round.opponentInkColors.map(ink => (
                      <InkSvg key={ink} svgString={getInkImage(ink)} alt={ink} className="w-8 h-8" />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{round.outcome?.charAt(0).toUpperCase() + round.outcome?.slice(1)}</p>
                  <p>{round.roundWins} - {round.roundLosses} - {round.roundDraws}</p>
                </div>
              </div>
              {event.type === 'Playtest' && (
                <div className="mt-2 text-sm">
                  <p>On Play: {round.onPlayWins} - {round.onPlayLosses} - {round.onPlayDraws}</p>
                  <p>On Draw: {round.onDrawWins} - {round.onDrawLosses} - {round.onDrawDraws}</p>
                </div>
              )}
              <h4 className="text-md font-semibold mt-4 mb-2">Games:</h4>
              <div className="space-y-2">
                {round.games.map((game, index) => (
                  <div key={index} className="bg-gray-600 p-3 rounded-lg flex justify-between items-center">
                    <span>Game {index + 1}: {game.result.charAt(0).toUpperCase() + game.result.slice(1)} ({game.onThePlay ? 'On Play' : 'On Draw'})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No rounds recorded for this event.</p>
      )}
    </div>
  );
};

export default EventDetail;
