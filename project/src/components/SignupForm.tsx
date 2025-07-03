import React, { useState } from 'react';

interface SignupFormProps {
  onSignup?: (name: string, email: string, password: string) => void;
  loading?: boolean;
  error?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignup, loading, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password length
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setLocalError('');
    if (onSignup) {
      onSignup(name, email, password);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
        <input
          type="text"
          name="name"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
        <input
          type="email"
          name="email"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
        <input
          type="password"
          name="password"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setLocalError(''); // Clear error when user starts typing
          }}
          placeholder="••••••••"
          minLength={8}
          required
        />
        <p className="text-xs text-slate-400 mt-1">Password must be at least 8 characters long</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={confirmPassword}
          onChange={e => {
            setConfirmPassword(e.target.value);
            setLocalError(''); // Clear error when user starts typing
          }}
          placeholder="••••••••"
          required
        />
      </div>
      {(localError || error) && <p className="text-red-400 text-sm">{localError || error}</p>}
      <button
        type="submit"
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        disabled={loading}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </div>
  );
};

export default SignupForm;
