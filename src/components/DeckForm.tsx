import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Select, {type ControlProps, type OptionProps } from 'react-select'; // Import react-select
import { inkColorsData } from '../utils/inkColors';
import InkSvg from './InkSvg';

interface DeckFormProps {
  onDeckCreated: () => void;
}

interface SelectOption {
  value: string;
  label: string;
}

const archetypeOptions: SelectOption[] = [
  { value: 'Control', label: 'Control' },
  { value: 'Combo', label: 'Combo' },
  { value: 'Midrange', label: 'Midrange' },
  { value: 'Aggro', label: 'Aggro' },
];
const formatOptions = ['Infinity', 'Core']; // New: Format options

const DeckForm: React.FC<DeckFormProps> = ({ onDeckCreated }) => {
  const [name, setName] = useState('');
  const [selectedInkColors, setSelectedInkColors] = useState<string[]>([]);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [format, setFormat] = useState('Core'); // New: State for format
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInkColorToggle = (inkName: string) => {
    setError(null); // Clear previous errors
    setSelectedInkColors(prevColors => {
      if (prevColors.includes(inkName)) {
        // Deselect if already selected
        return prevColors.filter(color => color !== inkName).sort();
      } else {
        // Select if not selected and limit not reached
        if (prevColors.length < 2) {
          setError('You can select a maximum of two ink colors.');
          return prevColors; // Do not update if limit reached
        } else {
          return [...prevColors, inkName].sort();
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

    if (name.trim() === '') {
      setError('Deck name cannot be empty.');
      setLoading(false);
      return;
    }

    if (selectedInkColors.length === 0) {
      setError('Please select at least one ink color.');
      setLoading(false);
      return;
    }

    try {
      const userUid = auth.currentUser.uid;
      const deckData = {
        name,
        inkColors: selectedInkColors,
        archetypes,
        format, // New: Include format in deckData
        ownerId: userUid,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, `users/${userUid}/decks`), deckData);
      alert('Deck created successfully!');
      setName('');
      setSelectedInkColors([]);
      setArchetypes([]);
      setFormat('Core'); // New: Clear format on submit
      onDeckCreated();
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while creating deck.');
        }
      console.error('Error creating deck:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchetypeChange = (selectedOptions: readonly SelectOption[] | null) => {
    setArchetypes(selectedOptions ? selectedOptions.map((option) => option.value) : []);
  };

  // Custom styles for react-select to match dark theme
  const customStyles = {
    control: (provided: React.CSSProperties, state: ControlProps<SelectOption, boolean>) => ({
      ...provided,
      backgroundColor: '#4B5563', // bg-gray-700
      borderColor: '#4B5563', // bg-gray-700
      color: 'white',
      boxShadow: state.isFocused ? '0 0 0 1px #60A5FA' : 'none', // focus ring
      '&:hover': {
        borderColor: '#4B5563',
      },
      minHeight: '32px', // Reduced overall height
      // Removed padding: '0 4px', to let react-select manage it
    }),
    menu: (provided: React.CSSProperties) => ({
      ...provided,
      backgroundColor: '#4B5563', // bg-gray-700
    }),
    option: (provided: React.CSSProperties, state: OptionProps<SelectOption, boolean>) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3B82F6' : (state.isFocused ? '#1E40AF' : '#4B5563'), // bg-blue-500, bg-blue-800 (focused), bg-gray-700
      color: 'white',
      '&:active': {
        backgroundColor: '#3B82F6',
      },
    }),
    multiValue: (provided: React.CSSProperties) => ({
      ...provided,
      backgroundColor: '#1D4ED8', // bg-blue-700 for selected tags
      borderRadius: '9999px', // full rounded
      color: 'white',
      margin: '1px', // Reduced margin to reduce spacing between tags
      padding: '1px 4px', // Reduced internal padding further
    }),
    multiValueLabel: (provided: React.CSSProperties) => ({
      ...provided,
      color: 'white',
      fontSize: '0.875rem', // text-sm
    }),
    multiValueRemove: (provided: React.CSSProperties) => ({
      ...provided,
      color: 'white',
      borderRadius: '9999px', // full rounded
      // Removed lineHeight and fontSize, as they were causing issues
      '&:hover': {
        backgroundColor: '#EF4444', // bg-red-500
        color: 'white',
      },
    }),
    input: (provided: React.CSSProperties) => ({
      ...provided,
      color: 'white',
    }),
    placeholder: (provided: React.CSSProperties) => ({
      ...provided,
      color: '#D1D5DB', // text-gray-300
    }),
    singleValue: (provided: React.CSSProperties) => ({
      ...provided,
      color: 'white',
    }),
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h3 className="text-xl font-bold text-white mb-4">Create New Deck</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="deckName" className="block text-white text-sm font-bold mb-2">Deck Name:</label>
          <input
            type="text"
            id="deckName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-white text-sm font-bold mb-2">
            Ink Colors:
          </label>
          <div className="flex flex-wrap gap-2">
            {inkColorsData.map((ink) => (
              <button
                key={ink.name}
                type="button"
                className={`p-2 rounded-lg border-2 transition-all duration-200 ${
                  selectedInkColors.includes(ink.name)
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

        <div>
          <label htmlFor="format" className="block text-white text-sm font-bold mb-2">Format:</label>
          <select
            id="format"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            {formatOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="archetypes" className="block text-white text-sm font-bold mb-2">Archetypes:</label>
          <Select
            id="archetypes"
            isMulti // Enable multi-select
            options={archetypeOptions}
            className="basic-multi-select"
            classNamePrefix="select"
            onChange={handleArchetypeChange}
            value={archetypeOptions.filter(option => archetypes.includes(option.value))} // Set selected values
            styles={customStyles} // Apply custom styles
          />
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Deck'}
        </button>
      </form>
    </div>
  );
};

export default DeckForm;