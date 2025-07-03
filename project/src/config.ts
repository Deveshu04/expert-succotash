// API URL configuration based on environment
// Use explicit environment variable or fallback to production URL
const PRODUCTION_API_URL = 'https://expert-succotash-l3sv.onrender.com';
const DEVELOPMENT_API_URL = 'http://localhost:5000';

// More reliable environment detection for Vercel deployment
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Override with environment variable if provided
const envApiUrl = import.meta.env.VITE_API_URL;

// Export the appropriate API URL based on environment
export const API_URL = envApiUrl || (isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);

// Log the active API URL (helpful for debugging)
console.log(`Environment - MODE: ${import.meta.env.MODE}, DEV: ${import.meta.env.DEV}, PROD: ${import.meta.env.PROD}`);
console.log(`VITE_API_URL env var: ${envApiUrl || 'not set'}`);
console.log(`Using API URL: ${API_URL}`);
