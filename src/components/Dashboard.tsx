import React, { useState } from 'react';
import EventForm from './EventForm';
import DeckForm from './DeckForm';
import Modal from './Modal';
import DeckList from './DeckList';
import EventList from './EventList';


const Dashboard: React.FC<{ activeTab: 'decks' | 'events' }> = ({ activeTab }) => {
const [showEventForm, setShowEventForm] = useState(false);
  const [showDeckForm, setShowDeckForm] = useState(false);

  const handleEventCreated = () => {
    setShowEventForm(false);
    // The onSnapshot listener will automatically refresh the list
  };

  const handleDeckCreated = () => {
    setShowDeckForm(false);
    // The onSnapshot listener will automatically refresh the list
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-white mb-4">Your Match Tracking Dashboard</h2>
      <p className="text-white mb-6">This is where you will manage your events and view your statistics.</p>

      <div className="flex space-x-4 mb-6">
        {activeTab === 'events' && (
          <button
            onClick={() => setShowEventForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
          >
            Create New Event
          </button>
        )}
        {activeTab === 'decks' && (
          <button
            onClick={() => setShowDeckForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
          >
            Create New Deck
          </button>
        )}
      </div>

      <Modal isOpen={showEventForm} onClose={() => setShowEventForm(false)} title="Create New Event">
        <EventForm onEventCreated={handleEventCreated} onEventUpdated={function (): void {
            throw new Error("Function not implemented.");
        }} onCancel={function (): void {
            throw new Error("Function not implemented.");
        }} />
      </Modal>

      <Modal isOpen={showDeckForm} onClose={() => setShowDeckForm(false)} title="Create New Deck">
        <DeckForm onDeckCreated={handleDeckCreated} />
      </Modal>

      {activeTab === 'decks' ? <DeckList /> : <EventList />}
    </div>
  );
}

export default Dashboard;