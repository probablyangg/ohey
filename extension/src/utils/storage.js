/**
 * Chrome Extension Storage Utility Functions
 * Handles all Chrome storage operations for OHey extension
 */

const STORAGE_KEYS = {
  BLOCKED_PATTERNS: 'ohey_blocked_patterns',
  EXTENSION_ENABLED: 'ohey_enabled',
  USER_STATS: 'ohey_stats'
};

/**
 * Get list of blocked wildcard patterns
 * @returns {Promise<string[]>} Array of blocked patterns
 */
async function getBlockedPatterns() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.BLOCKED_PATTERNS);
    return result[STORAGE_KEYS.BLOCKED_PATTERNS] || [];
  } catch (error) {
    console.error('Error getting blocked patterns:', error);
    return [];
  }
}

/**
 * Add a new pattern to the blocked list
 * @param {string} pattern - Wildcard pattern to block
 * @returns {Promise<boolean>} Success status
 */
async function addBlockedPattern(pattern) {
  try {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Invalid pattern provided');
    }
    
    const patterns = await getBlockedPatterns();
    
    // Avoid duplicates
    if (patterns.includes(pattern)) {
      return false;
    }
    
    patterns.push(pattern);
    await chrome.storage.sync.set({
      [STORAGE_KEYS.BLOCKED_PATTERNS]: patterns
    });
    
    return true;
  } catch (error) {
    console.error('Error adding blocked pattern:', error);
    return false;
  }
}

/**
 * Remove a pattern from the blocked list
 * @param {string} pattern - Pattern to remove
 * @returns {Promise<boolean>} Success status
 */
async function removeBlockedPattern(pattern) {
  try {
    const patterns = await getBlockedPatterns();
    const filteredPatterns = patterns.filter(p => p !== pattern);
    
    if (filteredPatterns.length === patterns.length) {
      return false; // Pattern not found
    }
    
    await chrome.storage.sync.set({
      [STORAGE_KEYS.BLOCKED_PATTERNS]: filteredPatterns
    });
    
    return true;
  } catch (error) {
    console.error('Error removing blocked pattern:', error);
    return false;
  }
}

/**
 * Check if extension is globally enabled
 * @returns {Promise<boolean>} Extension enabled status
 */
async function isExtensionEnabled() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.EXTENSION_ENABLED);
    return result[STORAGE_KEYS.EXTENSION_ENABLED] !== false; // Default to true
  } catch (error) {
    console.error('Error checking extension status:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Set global extension enabled/disabled state
 * @param {boolean} enabled - New enabled state
 * @returns {Promise<boolean>} Success status
 */
async function setExtensionEnabled(enabled) {
  try {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.EXTENSION_ENABLED]: Boolean(enabled)
    });
    return true;
  } catch (error) {
    console.error('Error setting extension status:', error);
    return false;
  }
}

/**
 * Get user statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getUserStats() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_STATS);
    return result[STORAGE_KEYS.USER_STATS] || {
      sitesVisited: 0,
      messagesExchanged: 0,
      totalSessionTime: 0,
      lastUsed: null
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      sitesVisited: 0,
      messagesExchanged: 0,
      totalSessionTime: 0,
      lastUsed: null
    };
  }
}

/**
 * Increment the count of sites where user has chatted
 * @returns {Promise<boolean>} Success status
 */
async function incrementSiteCount() {
  try {
    const stats = await getUserStats();
    stats.sitesVisited += 1;
    stats.lastUsed = new Date().toISOString();
    
    await chrome.storage.sync.set({
      [STORAGE_KEYS.USER_STATS]: stats
    });
    
    return true;
  } catch (error) {
    console.error('Error incrementing site count:', error);
    return false;
  }
}

/**
 * Increment the count of messages exchanged
 * @returns {Promise<boolean>} Success status
 */
async function incrementMessageCount() {
  try {
    const stats = await getUserStats();
    stats.messagesExchanged += 1;
    stats.lastUsed = new Date().toISOString();
    
    await chrome.storage.sync.set({
      [STORAGE_KEYS.USER_STATS]: stats
    });
    
    return true;
  } catch (error) {
    console.error('Error incrementing message count:', error);
    return false;
  }
}

/**
 * Add session time to total
 * @param {number} seconds - Session duration in seconds
 * @returns {Promise<boolean>} Success status
 */
async function addSessionTime(seconds) {
  try {
    const stats = await getUserStats();
    stats.totalSessionTime += seconds;
    stats.lastUsed = new Date().toISOString();
    
    await chrome.storage.sync.set({
      [STORAGE_KEYS.USER_STATS]: stats
    });
    
    return true;
  } catch (error) {
    console.error('Error adding session time:', error);
    return false;
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    getBlockedPatterns,
    addBlockedPattern,
    removeBlockedPattern,
    isExtensionEnabled,
    setExtensionEnabled,
    getUserStats,
    incrementSiteCount,
    incrementMessageCount,
    addSessionTime
  };
} else {
  // Browser environment - make functions globally available
  window.ChatBrowseStorage = {
    getBlockedPatterns,
    addBlockedPattern,
    removeBlockedPattern,
    isExtensionEnabled,
    setExtensionEnabled,
    getUserStats,
    incrementSiteCount,
    incrementMessageCount,
    addSessionTime
  };
}