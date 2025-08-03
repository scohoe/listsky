const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  try {
    const { category, location, minPrice, maxPrice, tags, limit = 20, offset = 0 } = event.queryStringParameters || {};
    
    const store = getStore('marketplace-listings');
    
    // Get all listing keys
    const { blobs } = await store.list();
    
    let listings = [];
    
    // Fetch all listings
    for (const blob of blobs) {
      if (blob.key.startsWith('listing:')) {
        const listingData = await store.get(blob.key, { type: 'json' });
        if (listingData) {
          listings.push(listingData);
        }
      }
    }
    
    // Apply filters
    if (category) {
      listings = listings.filter(listing => listing.category === category);
    }
    
    if (location) {
      listings = listings.filter(listing => 
        listing.location && listing.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    
    if (minPrice) {
      listings = listings.filter(listing => listing.price >= parseFloat(minPrice));
    }
    
    if (maxPrice) {
      listings = listings.filter(listing => listing.price <= parseFloat(maxPrice));
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      listings = listings.filter(listing => 
        listing.tags && listing.tags.some(tag => 
          tagArray.includes(tag.toLowerCase())
        )
      );
    }
    
    // Sort by creation date (newest first)
    listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedListings = listings.slice(startIndex, endIndex);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        listings: paginatedListings,
        total: listings.length,
        hasMore: endIndex < listings.length
      })
    };
    
  } catch (error) {
    console.error('Error fetching listings:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch listings' })
    };
  }
};