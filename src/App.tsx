import {useState, useEffect, useRef, type JSX} from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, getUserProfile } from './firebase'; // Import getUserProfile
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Modal from './components/Modal'; // Import Modal component
import UserProfileForm from './components/UserProfileForm'; // Import UserProfileForm
import LandingPage from './components/LandingPage'; // Import LandingPage
import EventDetail from './components/EventDetail'; // Import EventDetail
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import * as firebase from 'firebase/app'; // Import firebase for firebase.User type

function App() {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Guest'); // New state for username
  const [activeTab, setActiveTab] = useState<'decks' | 'events'>('decks'); // New state for active tab
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false); // New state for profile dropdown
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false); // New state for edit profile modal

  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.displayName) {
          setUsername(currentUser.displayName);
        }
        else {
          const profile = await getUserProfile(currentUser.uid);
          if (profile && profile.username) {
            setUsername(profile.username);
          } else {
            setUsername(currentUser.email || 'Guest');
          }
        }
      } else {
        setUsername('Guest');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully!');
    } catch (error: unknown) {
      console.error('Error while logging out.');
      alert('Error while logging out.');
    }
  };

  const handleProfileUpdated = (newUsername: string) => {
    setUsername(newUsername);
    setIsEditProfileModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-2xl">
        Loading...
      </div>
    );
  }

  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-2xl">
          Loading...
        </div>
      );
    }
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <header className="bg-gray-800 text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/dashboard">
              <h1 className="text-2xl font-bold">Lorcana Match Tracker</h1>
            </Link>
            {user ? (
              <>
                <nav className="flex space-x-4">
                  <Link to="/dashboard" onClick={() => setActiveTab('decks')}>
                    <button
                      className={`py-2 px-3 rounded-lg font-bold ${activeTab === 'decks' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                      Decks
                    </button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setActiveTab('events')}>
                    <button
                      className={`py-2 px-3 rounded-lg font-bold ${activeTab === 'events' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                      Events
                    </button>
                  </Link>
                </nav>
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
                  >
                    <span>{username}</span>
                    <svg
                      className={`w-4 h-4 transform ${isProfileDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-20">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setIsEditProfileModalOpen(true);
                        }}
                        className="block px-4 py-2 text-sm text-white hover:bg-gray-600 w-full text-left"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="block px-4 py-2 text-sm text-white hover:bg-gray-600 w-full text-left"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <a href="/auth" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Login / Sign Up</a>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <main className="flex-grow container mx-auto p-4">
                  <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
                </main>
              </ProtectedRoute>
            }
          />
          <Route path="/events/:eventId" element={<ProtectedRoute><main className="flex-grow container mx-auto p-4"><EventDetail /></main></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="bg-gray-800 text-white p-4 text-center shadow-inner mt-auto">
          <div className="container mx-auto">
            <p>&copy; {new Date().getFullYear()} Lorcana Match Tracker. All rights reserved.</p>
          </div>
        </footer>

        {user && (
          <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile">
            <UserProfileForm
              onProfileUpdated={handleProfileUpdated}
              onCancel={() => setIsEditProfileModalOpen(false)}
            />
          </Modal>
        )}
      </div>
    </Router>
  );
}

export default App;