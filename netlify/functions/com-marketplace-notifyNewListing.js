const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
    
    const body = JSON.parse(event.body);
    const { uri, listing, author } = body;
    
    if (!uri || !listing || !author) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required fields: uri, listing, author' })
      };
    }
    
    const store = getStore('marketplace-listings');
    
    // Create the listing record for storage
    const listingRecord = {
      uri,
      ...listing,
      author: {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar
      },
      indexedAt: new Date().toISOString()
    };
    
    // Store the listing with URI as key
    const listingKey = `listing:${uri}`;
    await store.set(listingKey, JSON.stringify(listingRecord));
    
    // Create category index
    if (listing.category) {
      const categoryKey = `category:${listing.category}`;
      let categoryListings = [];
      
      try {
        const existingCategory = await store.get(categoryKey, { type: 'json' });
        if (existingCategory && Array.isArray(existingCategory)) {
          categoryListings = existingCategory;
        }
      } catch (error) {
        // Category index doesn't exist yet, start with empty array
      }
      
      categoryListings.push(uri);
      await store.set(categoryKey, JSON.stringify(categoryListings));
    }
    
    // Create location index
    if (listing.location) {
      const locationKey = `location:${listing.location.toLowerCase()}`;
      let locationListings = [];
      
      try {
        const existingLocation = await store.get(locationKey, { type: 'json' });
        if (existingLocation && Array.isArray(existingLocation)) {
          locationListings = existingLocation;
        }
      } catch (error) {
        // Location index doesn't exist yet, start with empty array
      }
      
      locationListings.push(uri);
      await store.set(locationKey, JSON.stringify(locationListings));
    }
    
    // Create user listings index
    const userKey = `user:${author.did}:listings`;
    let userListings = [];
    
    try {
      const existingUserListings = await store.get(userKey, { type: 'json' });
      if (existingUserListings && Array.isArray(existingUserListings)) {
        userListings = existingUserListings;
      }
    } catch (error) {
      // User listings index doesn't exist yet, start with empty array
    }
    
    userListings.push(uri);
    await store.set(userKey, JSON.stringify(userListings));
    
    // Create tag indexes
    if (listing.tags && Array.isArray(listing.tags)) {
      for (const tag of listing.tags) {
        const tagKey = `tag:${tag.toLowerCase()}`;
        let tagListings = [];
        
        try {
          const existingTag = await store.get(tagKey, { type: 'json' });
          if (existingTag && Array.isArray(existingTag)) {
            tagListings = existingTag;
          }
        } catch (error) {
          // Tag index doesn't exist yet, start with empty array
        }
        
        tagListings.push(uri);
        await store.set(tagKey, JSON.stringify(tagListings));
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Listing indexed successfully',
        uri 
      })
    };
    
  } catch (error) {
    console.error('Error indexing listing:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to index listing' })
    };
  }
};
