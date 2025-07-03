import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { Boxes } from './ui/background-boxes';
import { API_URL } from '../config';

const LandingPage: React.FC = () => {
  const [modal, setModal] = useState<'signin' | 'signup' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle sign up
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Log request payload for debugging
    console.log('Signup request payload:', { name, email, password: password ? '********' : null });

    try {
      const res = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      // Log response status for debugging
      console.log('Signup response status:', res.status);

      const data = await res.json();
      console.log('Signup response data:', data);

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      // Auto-login after signup
      const loginRes = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Login failed after signup');
      }

      // Store auth token and user info
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));

      // Trigger custom event to notify App component of auth change
      window.dispatchEvent(new CustomEvent('authChange'));

      console.log('Signup and auto-login successful, stored token and user data');
      setModal(null);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('Login attempt for email:', email);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', res.status);
      const data = await res.json();
      console.log('Login response data:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Trigger custom event to notify App component of auth change
      window.dispatchEvent(new CustomEvent('authChange'));

      console.log('Login successful, stored token and user data');
      setModal(null);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
      {/* Background boxes */}
      <div className="absolute inset-0">
        <Boxes className="opacity-20" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 px-4 md:px-6 py-12 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Stock Sense
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-8">
          Your intelligent companion for data-driven investment decisions
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={() => setModal('signup')}
            className="px-8 py-3 text-lg font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => setModal('signin')}
            className="px-8 py-3 text-lg font-medium rounded-lg bg-transparent border border-white hover:bg-white/10 text-white transition-colors"
          >
            Sign In
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-3">Real-time Data</h3>
            <p className="text-slate-300">Access live market data and stay updated on the latest trends</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-3">AI Insights</h3>
            <p className="text-slate-300">Get intelligent recommendations powered by advanced algorithms</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-3">Portfolio Management</h3>
            <p className="text-slate-300">Track and optimize your investments with powerful tools</p>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => {
            setModal(null);
            setError('');
          }}
          onSignup={handleSignup}
          onSignin={handleSignin}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
};

export default LandingPage;
