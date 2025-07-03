// Test script to check Marketaux API
const API_KEY = 'I7imJBIBrHAKSrYg3NE8LliXjrR4vwftXrZiLnMf';
const MARKETAUX_BASE_URL = 'https://api.marketaux.com/v1/news';

async function testMarketauxAPI() {
  try {
    console.log('🧪 Testing Marketaux API...');

    const params = new URLSearchParams({
      api_token: API_KEY,
      countries: 'in',
      filter_entities: 'true',
      limit: '5',
      published_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      sort: 'published_desc',
      language: 'en'
    });

    const url = `${MARKETAUX_BASE_URL}?${params}`;
    console.log('📡 Request URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

    const response = await fetch(url);

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('❌ Error Details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Success!');
    console.log('📰 Articles found:', data.meta.found);
    console.log('📰 Articles returned:', data.meta.returned);
    console.log('📰 Sample article:', data.data[0] ? {
      title: data.data[0].title,
      source: data.data[0].source,
      published_at: data.data[0].published_at
    } : 'No articles');

  } catch (error) {
    console.error('💥 Network Error:', error.message);
  }
}

testMarketauxAPI();
