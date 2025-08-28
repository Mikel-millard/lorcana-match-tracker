import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

interface UserProfileFormProps {
  onProfileUpdated: (newUsername: string) => void;
  onCancel: () => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({ onProfileUpdated, onCancel }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!auth.currentUser) {
        setError('No user logged in.');
        setLoading(false);
        return;
      }
      try {
        const userUid = auth.currentUser.uid;
        const userDocRef = doc(db, `users`, userUid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUsername(userData.username || auth.currentUser.displayName || '');
        } else {
          setUsername(auth.currentUser.displayName || '');
        }
      } catch (err: Error) {
        setError(err.message);
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsername();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!auth.currentUser) {
      setError('No user logged in.');
      setLoading(false);
      return;
    }

    if (username.trim() === '') {
      setError('Username cannot be empty.');
      setLoading(false);
      return;
    }

    try {
      const userUid = auth.currentUser.uid;
      const userDocRef = doc(db, `users`, userUid);
      await setDoc(userDocRef, {
        username: username,
      }, { merge: true });

      // Update Firebase Auth profile display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: username,
        });
      }

      setSuccess('Profile updated successfully!');
      onProfileUpdated(username);
    } catch (err: Error) {
      setError(err.message);
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-white mb-4">Edit Profile</h3>
      {loading && <p className="text-white">Loading profile...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      {!loading && !error && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-white text-sm font-bold mb-2">Username:</label>
            <input
              type="text"
              id="username"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserProfileForm;