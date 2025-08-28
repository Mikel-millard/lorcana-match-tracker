import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { inkColorsData } from '../utils/inkColors';
import InkSvg from './InkSvg';

interface Round { // Define Round interface here for use in props
  id: string;
  opponentInkColors: string[];
  games: GameResult[];
  createdAt: Date;
}

interface RoundFormProps {
  eventId: string;
  eventType: string; // New: eventType prop
  onRoundAdded: () => void; // This will now be called on submit (add or edit)
  roundId?: string; // Optional: ID of the round being edited
  roundData?: Round; // Optional: Data of the round being edited
}

interface GameResult {
  result: 'win' | 'loss' | 'draw';
  onThePlay: boolean;
}

const RoundForm: React.FC<RoundFormProps> = ({ eventId, eventType, onRoundAdded, roundId, roundData }) => { // Added eventType, roundId, roundData
  const [opponentInkColors, setOpponentInkColors] = useState<string[]>([]);
  const [games, setGames] = useState<GameResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('RoundForm useEffect - roundData:', roundData); // ADD THIS
    if (roundData) {
      setOpponentInkColors(roundData.opponentInkColors || []);
      setGames(roundData.games || []);
    } else {
      // Reset form for new round if roundData is not provided
      setOpponentInkColors([]);
      setGames([]);
    }
  }, [roundData]);

  const handleAddGame = () => {
    const maxGames = eventType === 'Tournament' ? 3 : Infinity; // New: Max games based on type
    if (games.length < maxGames) {
      setGames([...games, { result: 'win', onThePlay: true }]);
      setError(null);
    } else {
      setError(`Maximum of ${maxGames} games per round for ${eventType} events.`);
    }
  };

  const handleGameChange = (index: number, field: keyof GameResult, value: string | boolean) => {
    const newGames = [...games];
    newGames[index] = { ...newGames[index], [field]: value };
    setGames(newGames);
  };

  const handleRemoveGame = (index: number) => {
    setGames(games.filter((_, i) => i !== index));
    setError(null);
  };

  const handleInkColorToggle = (inkName: string) => {
    setError(null); // Clear previous errors
    setOpponentInkColors(prevColors => {
      if (prevColors.includes(inkName)) {
        // Deselect if already selected
        return prevColors.filter(color => color !== inkName).sort();
      } else {
        // Select if not selected and limit not reached
        if (prevColors.length < 2) {
          return [...prevColors, inkName].sort();
        } else {
          setError('You can select a maximum of two ink colors.');
          return prevColors; // Do not update if limit reached
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth.currentUser) {
      setError('No user logged in.');
      setLoading(false);
      return;
    }

    if (opponentInkColors.length === 0) {
      setError('Please select at least one opponent ink color.');
      setLoading(false);
      return;
    }

    if (games.length === 0) {
      setError('Please add at least one game result.');
      setLoading(false);
      return;
    }

    try {
      const userUid = auth.currentUser.uid;
      const eventRef = doc(db, `users/${userUid}/events/${eventId}`);

      // Calculate current round's game results
      let currentRoundWins = 0;
      let currentRoundLosses = 0;
      let currentRoundDraws = 0;
      games.forEach(game => {
        if (game.result === 'win') currentRoundWins++;
        else if (game.result === 'loss') currentRoundLosses++;
        else if (game.result === 'draw') currentRoundDraws++;
      });

      if (roundId) {
        // Editing existing round
        const roundDocRef = doc(db, `users/${userUid}/events/${eventId}/rounds`, roundId);

        // Calculate previous round's game results to subtract them
        let previousRoundWins = 0;
        let previousRoundLosses = 0;
        let previousRoundDraws = 0;
        if (roundData && roundData.games) {
          roundData.games.forEach(game => {
            if (game.result === 'win') previousRoundWins++;
            else if (game.result === 'loss') previousRoundLosses++;
            else if (game.result === 'draw') previousRoundDraws++;
          });
        }

        // Update the round document
        await updateDoc(roundDocRef, {
          opponentInkColors: opponentInkColors,
          games,
        });

        // Adjust event's wins/losses/draws by subtracting old and adding new
        await updateDoc(eventRef, {
          wins: increment(currentRoundWins - previousRoundWins),
          losses: increment(currentRoundLosses - previousRoundLosses),
          draws: increment(currentRoundDraws - previousRoundDraws),
        });

        alert('Round updated successfully!');
      } else {
        // Adding new round
        const roundData = {
          opponentInkColors: opponentInkColors,
          games,
          createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, `users/${userUid}/events/${eventId}/rounds`), roundData);

        // Update event's wins/losses/draws
        await updateDoc(eventRef, {
          wins: increment(currentRoundWins),
          losses: increment(currentRoundLosses),
          draws: increment(currentRoundDraws),
        });

        alert('Round added successfully!');
      }

      setOpponentInkColors([]);
      setGames([]);
      onRoundAdded();
    } catch (err: Error) {
      setError(err.message);
      console.error('Error submitting round:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-xl font-bold text-white mb-4">Add New Round</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2">
              Opponent Ink Colors:
            </label>
            <div className="flex flex-wrap gap-2">
              {inkColorsData.map((ink) => (
                <button
                  key={ink.name}
                  type="button"
                  className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                    opponentInkColors.includes(ink.name)
                      ? 'border-blue-500 bg-blue-900'
                      : 'border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-blue-800'
                  }`}
                  onClick={() => handleInkColorToggle(ink.name)}
                >
                  <InkSvg svgString={ink.image} alt={ink.name} className="w-8 h-8" />
                </button>
              ))}
            </div>
          </div>

        <div className="space-y-2">
          <label className="block text-white text-sm font-bold mb-2">Game Results:</label>
          {games.map((game, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-700 p-3 rounded-lg">
              <select
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-600 text-white flex-1"
                value={game.result}
                onChange={(e) => handleGameChange(index, 'result', e.target.value)}
              >
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="draw">Draw</option>
              </select>
              <select
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-600 text-white flex-1"
                value={game.onThePlay.toString()}
                onChange={(e) => handleGameChange(index, 'onThePlay', e.target.value === 'true')}
              >
                <option value="true">On Play</option>
                <option value="false">On Draw</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemoveGame(index)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded focus:outline-none focus:shadow-outline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddGame}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={eventType === 'Tournament' && games.length >= 3} // New: Disable button based on eventType
          >
            Add Game
          </button>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          disabled={loading}
        >
          {loading ? (roundId ? 'Updating...' : 'Adding...') : (roundId ? 'Update Round' : 'Add Round')}
        </button>
      </form>
    </div>
  );
};

export default RoundForm;