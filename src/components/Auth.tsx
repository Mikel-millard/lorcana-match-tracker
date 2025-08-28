import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import doc and setDoc
import { auth, db } from '../firebase'; // Import db
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: userCredential.user.displayName || userCredential.user.email,
        }, { merge: true });
        navigate('/dashboard'); // Redirect to dashboard on successful registration
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: userCredential.user.displayName || userCredential.user.email,
        }, { merge: true });
        navigate('/dashboard'); // Redirect to dashboard on successful login
      }
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while fetching dashboard.');
        }
      console.error(err);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'users', result.user.uid), {
        username: result.user.displayName || result.user.email,
      }, { merge: true });
      navigate('/dashboard'); // Redirect to dashboard on successful Google Sign-In
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while performing Google login.');
        }
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4 mb-4">
          <div>
            <label htmlFor="email" className="block text-white text-sm font-bold mb-2">
              Email:
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-white text-sm font-bold mb-2">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full border border-gray-500 shadow-sm transition duration-150 ease-in-out"
          >
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="flex items-center justify-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full mb-4 border border-gray-600 shadow-sm hover:bg-gray-600 transition duration-150 ease-in-out space-x-2"
        >
          {/* Google SVG icon */}
          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
            <path fillRule="evenodd" clipRule="evenodd" d="M16.18 8.1818C16.18 7.61453 16.1291 7.06908 16.0345 6.54544H8.5V9.63999H12.8055C12.62 10.64 12.0564 11.4873 11.2091 12.0545V14.0618H13.7945C15.3073 12.6691 16.18 10.6182 16.18 8.1818Z" fill="#4285F4"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M8.49992 16C10.6599 16 12.4708 15.2836 13.7945 14.0618L11.209 12.0545C10.4926 12.5345 9.57629 12.8182 8.49992 12.8182C6.41629 12.8182 4.65265 11.4109 4.02356 9.51999H1.35083V11.5927C2.66719 14.2073 5.37265 16 8.49992 16Z" fill="#34A853"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M4.02364 9.52001C3.86364 9.04001 3.77273 8.52729 3.77273 8.00001C3.77273 7.47274 3.86364 6.96001 4.02364 6.48001V4.40729H1.35091C0.809091 5.48729 0.5 6.70911 0.5 8.00001C0.5 9.29092 0.809091 10.5127 1.35091 11.5927L4.02364 9.52001Z" fill="#FBBC05"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M8.49992 3.18182C9.67447 3.18182 10.729 3.58545 11.5581 4.37818L13.8526 2.08364C12.4672 0.792727 10.6563 0 8.49992 0C5.37265 0 2.66719 1.79273 1.35083 4.40727L4.02356 6.48C4.65265 4.58909 6.41629 3.18182 8.49992 3.18182Z" fill="#EA4335"/>
          </svg>
          <span className="ml-3">Continue with Google</span>
        </button>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="mt-4 text-blue-400 hover:text-blue-300 text-sm w-full text-center"
        >
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
};

export default Auth;