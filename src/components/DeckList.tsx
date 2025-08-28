import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, QueryDocumentSnapshot, getDocs } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { inkColorsData } from '../utils/inkColors';
import InkSvg from './InkSvg';


interface Deck {
  id: string;
  name: string;
  inkColors: string[];
  archetypes: string[];
  format: string;
  createdAt: Date;
  // New stats fields
  matchWinRate?: number;
  gameWinRate?: number;
  onPlayGameWinRate?: number;
  onDrawGameWinRate?: number;
  matchesLost?: number; // Added
  matchesDrawn?: number; // Added
}

interface Game {
  result: string;
  onThePlay: boolean;
}

const DeckList: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [decksError, setDecksError] = useState<string | null>(null);

  const getInkImage = (inkName: string) => {
    const ink = inkColorsData.find(i => i.name === inkName);
    return ink ? ink.image : '';
  };

  const getFullFormatName = (format: string) => {
    if (format === 'Infinity') return 'Infinity Constructed';
    if (format === 'Core') return 'Core Constructed';
    return format; // Fallback
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setDecksError('No user logged in to fetch decks.');
      setLoadingDecks(false);
      return;
    }

    const userUid = auth.currentUser.uid;
    const decksCollectionRef = collection(db, `users/${userUid}/decks`);
    const q = query(decksCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => { // Made callback async
      const fetchedDecks: Deck[] = [];
      const deckPromises = snapshot.docs.map(async (deckDoc: QueryDocumentSnapshot<DocumentData>) => {
        const deckData = deckDoc.data();
        const deckId = deckDoc.id;

        let totalMatches = 0;
        let matchesWon = 0;
        let matchesLost = 0;
        let matchesDrawn = 0;

        let totalGames = 0;
        let gamesWon = 0;
        let gamesPlayedOnPlay = 0;
        let gamesWonOnPlay = 0;
        let gamesPlayedOnDraw = 0;
        let gamesWonOnDraw = 0;

        // Fetch events for this deck
        const eventsQuery = query(
          collection(db, `users/${userUid}/events`),
          // For now, let's just fetch all events and filter by deck name
          // This is a temporary solution until EventForm is updated to save deck ID
          // and we can query by deck ID.
          orderBy('createdAt', 'desc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const relevantEvents = eventsSnapshot.docs.filter(eventDoc => eventDoc.data().userDeckId === deckId);


        for (const eventDoc of relevantEvents) {
          // Fetch rounds for this event
          const roundsQuery = collection(db, `users/${userUid}/events/${eventDoc.id}/rounds`);
          const roundsSnapshot = await getDocs(roundsQuery);

          for (const roundDoc of roundsSnapshot.docs) {
            totalMatches++; // Each round is a match
            const roundGames: Game[] = roundDoc.data().games || [];
            let playerWins = 0;
            let playerLosses = 0;

            roundGames.forEach(game => {
              if (game.result === 'win') playerWins++;
              else if (game.result === 'loss') playerLosses++;
            });

            if (playerWins > playerLosses) {
              matchesWon++;
            } else if (playerLosses > playerWins) {
              matchesLost++;
            } else {
              matchesDrawn++;
            }

            for (const game of roundGames) {
              totalGames++;
              if (game.result === 'win') {
                gamesWon++;
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
            }
          }
        }

        const matchWinRate = totalMatches > 0 ? (matchesWon / totalMatches) * 100 : 0;
        const gameWinRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
        const onPlayGameWinRate = gamesPlayedOnPlay > 0 ? (gamesWonOnPlay / gamesPlayedOnPlay) * 100 : 0;
        const onDrawGameWinRate = gamesPlayedOnDraw > 0 ? (gamesWonOnDraw / gamesPlayedOnDraw) * 100 : 0;

        fetchedDecks.push({
          id: deckId,
          name: deckData.name,
          inkColors: deckData.inkColors || [],
          archetypes: deckData.archetypes || [],
          format: deckData.format,
          createdAt: deckData.createdAt.toDate(),
          matchWinRate: parseFloat(matchWinRate.toFixed(2)),
          gameWinRate: parseFloat(gameWinRate.toFixed(2)),
          onPlayGameWinRate: parseFloat(onPlayGameWinRate.toFixed(2)),
          onDrawGameWinRate: parseFloat(onDrawGameWinRate.toFixed(2)),
          matchesLost: matchesLost, // Added
          matchesDrawn: matchesDrawn, // Added
        });
      });

      await Promise.all(deckPromises); // Wait for all deck stats to be calculated
      setDecks(fetchedDecks);
      setLoadingDecks(false);
    }, (error) => {
      console.error("Error fetching decks:", error);
      setDecksError(error.message);
      setLoadingDecks(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-4">Your Decks</h3>
      {loadingDecks && <p className="text-white">Loading decks...</p>}
      {decksError && <p className="text-red-500">Error: {decksError}</p>}
      {!loadingDecks && decks.length === 0 && !decksError && (
        <p className="text-white">No decks found. Create your first deck!</p>
      )}
      <div className="grid grid-cols-1 gap-4">
        {decks.map((deck) => (
          <div key={deck.id} className="bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 flex items-center space-x-4  transition-shadow duration-200"> {/* Main flex container */}
            <div className="flex flex-col items-center space-y-1"> {/* Container for ink images */}
              {deck.inkColors.map((ink) => (
                <InkSvg key={ink} svgString={getInkImage(ink)} alt={ink} className="w-8 h-8" />
              ))}
            </div>
            <div className="flex-1 flex items-center justify-between space-x-4"> {/* Container for details and stats */}
              <div> {/* Left side: name, format, archetypes */}
                <h4 className="text-lg font-semibold text-white mb-0">
                  {deck.name}
                </h4>
                <p className="text-sm text-gray-400 mt-0">
                  {getFullFormatName(deck.format)}
                </p>
                {deck.archetypes.length > 0 && (
                  <p className="text-gray-300 mt-2">Archetypes: {deck.archetypes.join(', ')}</p>
                )}
              </div>
              <div className="flex space-x-4 flex-shrink-0"> {/* Container for stats mini-cards, removed min-w */}
                {deck.matchWinRate !== undefined && (
                  <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                    <p className="text-lg font-semibold text-white text-center">Match Win %</p>
                    <p className="text-base text-gray-200">{deck.matchWinRate}%</p>
                  </div>
                )}
                {deck.gameWinRate !== undefined && (
                  <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                    <p className="text-lg font-semibold text-white text-center">Game Win %</p>
                    <p className="text-base text-gray-200">{deck.gameWinRate}%</p>
                  </div>
                )}
                {deck.onPlayGameWinRate !== undefined && (
                  <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                    <p className="text-lg font-semibold text-white text-center">On Play Win %</p>
                    <p className="text-base text-gray-200">{deck.onPlayGameWinRate}%</p>
                  </div>
                )}
                {deck.onDrawGameWinRate !== undefined && (
                  <div className="bg-gray-700 py-3 px-4 rounded-lg shadow-md flex flex-col items-center justify-center  transition-shadow duration-200">
                    <p className="text-lg font-semibold text-white text-center">On Draw Win %</p>
                    <p className="text-base text-gray-200">{deck.onDrawGameWinRate}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeckList;