/**
 * Anonymous Username Generation Utility Functions
 * Generates whimsical usernames for OHey extension
 */

// List of 70+ whimsical and delightfully silly names
const WHIMSICAL_NAMES = [
  'moonbounce', 'stardancer', 'cloudhopper', 'rainbowsneeze', 'jellybouncer', 'sparkleninja',
  'bubblewizard', 'gigglemonster', 'tickledragon', 'snuggleunicorn', 'wigglebeast', 'bouncyslime',
  'fluffernutter', 'snickerdoodle', 'gigglesnort', 'wibblewobble', 'boinkysproing', 'zibberzap',
  'squishmallow', 'bouncehouse', 'jigglybean', 'wigglyspoon', 'bounceberry', 'gigglejuice',
  'sneezysloth', 'dizzydragon', 'sleepysaurus', 'grumpygoose', 'happyhobbit', 'jollyjellyfish',
  'wibblywobbly', 'boopsnoot', 'tootyfruity', 'snazzberries', 'whoopiecushion', 'giggletastic',
  'shimmerglimmer', 'twirlywhirly', 'bouncetrounce', 'wigglesnuggle', 'ticklishpickle', 'gigglefit',
  'boopboop', 'snootboop', 'wigglebutt', 'jellyroll', 'bouncepad', 'springaling',
  'chucklehead', 'gigglebox', 'wiggletoes', 'bouncycastle', 'snugglebug', 'ticklemonster'
];

// Storage key for session username
const USERNAME_STORAGE_KEY = 'ohey_session_username';

/**
 * Generate a random username with animal + number format
 * @returns {string} Generated username (e.g., "Eagle23")
 */
function generateUsername() {
  try {
    // Get random whimsical name
    const randomName = WHIMSICAL_NAMES[Math.floor(Math.random() * WHIMSICAL_NAMES.length)];
    
    // Generate random 2-digit number (10-99)
    const randomNumber = Math.floor(Math.random() * 90) + 10;
    
    return `${randomName}${randomNumber}`;
  } catch (error) {
    console.error('Error generating username:', error);
    // Fallback username
    return `User${Math.floor(Math.random() * 90) + 10}`;
  }
}

/**
 * Get stored username for current session (from sessionStorage)
 * @returns {string|null} Stored username or null if not found
 */
function getStoredUsername() {
  try {
    // Use sessionStorage so username persists only for browser session
    return sessionStorage.getItem(USERNAME_STORAGE_KEY);
  } catch (error) {
    console.error('Error getting stored username:', error);
    return null;
  }
}

/**
 * Store username for current session
 * @param {string} username - Username to store
 * @returns {boolean} Success status
 */
function storeUsername(username) {
  try {
    if (!username || typeof username !== 'string') {
      return false;
    }
    
    sessionStorage.setItem(USERNAME_STORAGE_KEY, username);
    return true;
  } catch (error) {
    console.error('Error storing username:', error);
    return false;
  }
}

/**
 * Get username for current session (generate if needed)
 * @returns {string} Username for current session
 */
function getSessionUsername() {
  try {
    // Check if we already have a username for this session
    let username = getStoredUsername();
    
    if (!username) {
      // Generate new username and store it
      username = generateUsername();
      storeUsername(username);
    }
    
    return username;
  } catch (error) {
    console.error('Error getting session username:', error);
    // Return fallback username
    return generateUsername();
  }
}

/**
 * Clear stored username (for new session)
 * @returns {boolean} Success status
 */
function clearStoredUsername() {
  try {
    sessionStorage.removeItem(USERNAME_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing stored username:', error);
    return false;
  }
}

/**
 * Generate a new username and store it (force refresh)
 * @returns {string} New generated username
 */
function refreshUsername() {
  try {
    clearStoredUsername();
    return getSessionUsername(); // This will generate and store a new one
  } catch (error) {
    console.error('Error refreshing username:', error);
    return generateUsername();
  }
}

/**
 * Validate if a username follows the expected format
 * @param {string} username - Username to validate
 * @returns {boolean} True if username is valid format
 */
function validateUsername(username) {
  try {
    if (!username || typeof username !== 'string') {
      return false;
    }
    
    // Check if username matches animal + 2-digit number pattern
    const pattern = /^[A-Za-z]+\d{2}$/;
    if (!pattern.test(username)) {
      return false;
    }
    
    // Extract name part and check if it's in our list
    const namePart = username.replace(/\d+$/, '');
    const isValidName = WHIMSICAL_NAMES.some(name => 
      name.toLowerCase() === namePart.toLowerCase()
    );
    
    // Extract number part and validate range
    const numberPart = parseInt(username.replace(/^[A-Za-z]+/, ''));
    const isValidNumber = numberPart >= 10 && numberPart <= 99;
    
    return isValidName && isValidNumber;
  } catch (error) {
    console.error('Error validating username:', error);
    return false;
  }
}

/**
 * Get statistics about username generation
 * @returns {Object} Statistics object
 */
function getUsernameStats() {
  return {
    totalNames: WHIMSICAL_NAMES.length,
    totalCombinations: WHIMSICAL_NAMES.length * 90, // 90 possible numbers (10-99)
    currentSession: getStoredUsername(),
    nameList: [...WHIMSICAL_NAMES] // Return copy to prevent modification
  };
}

/**
 * Get random whimsical name (for testing or other uses)
 * @returns {string} Random whimsical name
 */
function getRandomName() {
  try {
    return WHIMSICAL_NAMES[Math.floor(Math.random() * WHIMSICAL_NAMES.length)];
  } catch (error) {
    console.error('Error getting random name:', error);
    return 'Unknown';
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    generateUsername,
    getStoredUsername,
    storeUsername,
    getSessionUsername,
    clearStoredUsername,
    refreshUsername,
    validateUsername,
    getUsernameStats,
    getRandomName,
    WHIMSICAL_NAMES
  };
} else {
  // Browser environment - make functions globally available
  window.ChatBrowseUsernames = {
    generateUsername,
    getStoredUsername,
    storeUsername,
    getSessionUsername,
    clearStoredUsername,
    refreshUsername,
    validateUsername,
    getUsernameStats,
    getRandomName,
    WHIMSICAL_NAMES
  };
}