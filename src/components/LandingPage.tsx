import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import * as firebase from 'firebase/app';

const LandingPage: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-2xl">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="flex-grow container mx-auto p-4 text-white">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Welcome to Lorcana Match Tracker</h2>
        <p className="text-lg mb-8">Track your matches, analyze your performance, and climb the ranks!</p>
        <Link to="/auth">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xl">
            Get Started
          </button>
        </Link>
      </div>
    </main>
  );
};

export default LandingPage;