// API URL configuration based on environment
const isDevelopment = import.meta.env.MODE === 'development';

// The backend URL that will be used in production (Render)
const PRODUCTION_API_URL = 'https://expert-succotash-l3sv.onrender.com';

// The backend URL used during local development
const DEVELOPMENT_API_URL = 'http://localhost:5000';

// Export the appropriate API URL based on environment
export const API_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

// Log the active API URL (helpful for debugging)
console.log(`Using API URL: ${API_URL} in ${isDevelopment ? 'development' : 'production'} mode`);
