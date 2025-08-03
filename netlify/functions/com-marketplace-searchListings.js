const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  try {
    const { q, category, location, minPrice, maxPrice, tags, limit = 20, offset = 0 } = event.queryStringParameters || {};
    
    if (!q || q.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }
    
    const store = getStore('marketplace-listings');
    const searchTerm = q.toLowerCase().trim();
    
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
    
    // Apply text search
    listings = listings.filter(listing => {
      const titleMatch = listing.title && listing.title.toLowerCase().includes(searchTerm);
      const descriptionMatch = listing.description && listing.description.toLowerCase().includes(searchTerm);
      const tagsMatch = listing.tags && listing.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      const categoryMatch = listing.category && listing.category.toLowerCase().includes(searchTerm);
      
      return titleMatch || descriptionMatch || tagsMatch || categoryMatch;
    });
    
    // Apply additional filters
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
    
    // Sort by relevance (exact title matches first, then by creation date)
    listings.sort((a, b) => {
      const aExactTitle = a.title && a.title.toLowerCase() === searchTerm;
      const bExactTitle = b.title && b.title.toLowerCase() === searchTerm;
      
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      // If both or neither have exact title matches, sort by creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
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
        hasMore: endIndex < listings.length,
        query: q
      })
    };
    
  } catch (error) {
    console.error('Error searching listings:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to search listings' })
    };
  }
};