// API URL configuration based on environment
const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// The backend URL that will be used in production (Render)
const PRODUCTION_API_URL = import.meta.env.VITE_API_URL || 'https://expert-succotash-l3sv.onrender.com';

// The backend URL used during local development
const DEVELOPMENT_API_URL = 'http://localhost:5000';

// More robust environment detection
// If we're on a deployed domain (not localhost), use production API
const isDeployedEnvironment = typeof window !== 'undefined' &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1');

// Export the appropriate API URL based on environment
export const API_URL = (isDevelopment && !isDeployedEnvironment) ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

// Log the active API URL (helpful for debugging)
console.log(`Environment - MODE: ${import.meta.env.MODE}, DEV: ${import.meta.env.DEV}, PROD: ${import.meta.env.PROD}`);
console.log(`Hostname: ${typeof window !== 'undefined' ? window.location.hostname : 'server'}`);
console.log(`Using API URL: ${API_URL} (${(isDevelopment && !isDeployedEnvironment) ? 'development' : 'production'} mode)`);
