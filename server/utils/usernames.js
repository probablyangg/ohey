/**
 * Server-side Username Generation Utility
 * Handles username generation and uniqueness validation for ChatBrowse server
 */

// Same whimsical names list as client-side for consistency
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

class UsernameManager {
  constructor() {
    this.usedUsernames = new Map(); // roomId -> Set of usernames
    this.userMappings = new Map(); // socketId -> username
  }
  
  /**
   * Generate a random username with animal + number format
   */
  generateUsername() {
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
   * Generate a unique username for a room
   */
  generateUniqueUsername(roomId, preferredUsername = null, maxAttempts = 50) {
    try {
      let username = preferredUsername;
      let attempts = 0;
      
      // If no preferred username, generate one
      if (!username) {
        username = this.generateUsername();
      }
      
      // Ensure uniqueness in the room
      while (this.isUsernameUsed(roomId, username) && attempts < maxAttempts) {
        username = this.generateUsername();
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        // Fallback with timestamp to ensure uniqueness
        const timestamp = Date.now().toString().slice(-4);
        username = `User${timestamp}`;
      }
      
      return username;
    } catch (error) {
      console.error('Error generating unique username:', error);
      return `User${Math.floor(Math.random() * 9999)}`;
    }
  }
  
  /**
   * Check if username is already used in a room
   */
  isUsernameUsed(roomId, username) {
    try {
      const roomUsernames = this.usedUsernames.get(roomId);
      return roomUsernames ? roomUsernames.has(username) : false;
    } catch (error) {
      console.error('Error checking username usage:', error);
      return false;
    }
  }
  
  /**
   * Reserve a username for a user in a room
   */
  reserveUsername(roomId, socketId, username) {
    try {
      // Remove any existing mapping for this socket
      this.releaseUsername(socketId);
      
      // Get or create room username set
      if (!this.usedUsernames.has(roomId)) {
        this.usedUsernames.set(roomId, new Set());
      }
      
      const roomUsernames = this.usedUsernames.get(roomId);
      
      // Check if username is already taken
      if (roomUsernames.has(username)) {
        return {
          success: false,
          error: 'Username already taken',
          suggestedUsername: this.generateUniqueUsername(roomId)
        };
      }
      
      // Reserve the username
      roomUsernames.add(username);
      this.userMappings.set(socketId, { roomId, username });
      
      console.log(`Username ${username} reserved for ${socketId} in room ${roomId}`);
      
      return {
        success: true,
        username,
        roomId
      };
      
    } catch (error) {
      console.error('Error reserving username:', error);
      return {
        success: false,
        error: 'Failed to reserve username'
      };
    }
  }
  
  /**
   * Release a username when user disconnects
   */
  releaseUsername(socketId) {
    try {
      const mapping = this.userMappings.get(socketId);
      if (!mapping) {
        return false;
      }
      
      const { roomId, username } = mapping;
      
      // Remove from room username set
      const roomUsernames = this.usedUsernames.get(roomId);
      if (roomUsernames) {
        roomUsernames.delete(username);
        
        // Clean up empty room sets
        if (roomUsernames.size === 0) {
          this.usedUsernames.delete(roomId);
        }
      }
      
      // Remove user mapping
      this.userMappings.delete(socketId);
      
      console.log(`Username ${username} released for ${socketId} from room ${roomId}`);
      
      return true;
    } catch (error) {
      console.error('Error releasing username:', error);
      return false;
    }
  }
  
  /**
   * Get username for a socket
   */
  getUsername(socketId) {
    try {
      const mapping = this.userMappings.get(socketId);
      return mapping ? mapping.username : null;
    } catch (error) {
      console.error('Error getting username:', error);
      return null;
    }
  }
  
  /**
   * Get all usernames in a room
   */
  getRoomUsernames(roomId) {
    try {
      const roomUsernames = this.usedUsernames.get(roomId);
      return roomUsernames ? Array.from(roomUsernames) : [];
    } catch (error) {
      console.error('Error getting room usernames:', error);
      return [];
    }
  }
  
  /**
   * Move user to a different room (updates username reservations)
   */
  moveUserToRoom(socketId, newRoomId) {
    try {
      const mapping = this.userMappings.get(socketId);
      if (!mapping) {
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      const { username, roomId: oldRoomId } = mapping;
      
      // Release from old room
      const oldRoomUsernames = this.usedUsernames.get(oldRoomId);
      if (oldRoomUsernames) {
        oldRoomUsernames.delete(username);
        if (oldRoomUsernames.size === 0) {
          this.usedUsernames.delete(oldRoomId);
        }
      }
      
      // Check if username is available in new room
      if (this.isUsernameUsed(newRoomId, username)) {
        // Generate new unique username for new room
        const newUsername = this.generateUniqueUsername(newRoomId);
        return this.reserveUsername(newRoomId, socketId, newUsername);
      } else {
        // Username is available in new room
        return this.reserveUsername(newRoomId, socketId, username);
      }
      
    } catch (error) {
      console.error('Error moving user to room:', error);
      return {
        success: false,
        error: 'Failed to move user'
      };
    }
  }
  
  /**
   * Validate username format (same as client-side)
   */
  validateUsernameFormat(username) {
    try {
      if (!username || typeof username !== 'string') {
        return false;
      }
      
      // Check if username matches name + 2-digit number pattern
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
      console.error('Error validating username format:', error);
      return false;
    }
  }
  
  /**
   * Clean up usernames for inactive rooms
   */
  cleanupInactiveRooms(activeRoomIds) {
    try {
      let cleanedRooms = 0;
      let cleanedUsernames = 0;
      
      // Remove username reservations for rooms that no longer exist
      for (const roomId of this.usedUsernames.keys()) {
        if (!activeRoomIds.includes(roomId)) {
          const roomUsernames = this.usedUsernames.get(roomId);
          cleanedUsernames += roomUsernames ? roomUsernames.size : 0;
          this.usedUsernames.delete(roomId);
          cleanedRooms++;
        }
      }
      
      // Remove user mappings for users no longer in active rooms
      for (const [socketId, mapping] of this.userMappings.entries()) {
        if (!activeRoomIds.includes(mapping.roomId)) {
          this.userMappings.delete(socketId);
        }
      }
      
      if (cleanedRooms > 0) {
        console.log(`Username cleanup: ${cleanedRooms} rooms, ${cleanedUsernames} usernames removed`);
      }
      
      return { cleanedRooms, cleanedUsernames };
    } catch (error) {
      console.error('Error cleaning up usernames:', error);
      return { cleanedRooms: 0, cleanedUsernames: 0 };
    }
  }
  
  /**
   * Get username statistics
   */
  getStats() {
    try {
      let totalReservedUsernames = 0;
      const roomStats = [];
      
      for (const [roomId, usernames] of this.usedUsernames.entries()) {
        totalReservedUsernames += usernames.size;
        roomStats.push({
          roomId,
          usernameCount: usernames.size,
          usernames: Array.from(usernames)
        });
      }
      
      return {
        totalRooms: this.usedUsernames.size,
        totalReservedUsernames,
        totalActiveMappings: this.userMappings.size,
        availableNames: WHIMSICAL_NAMES.length,
        possibleCombinations: WHIMSICAL_NAMES.length * 90, // 90 possible numbers (10-99)
        rooms: roomStats
      };
    } catch (error) {
      console.error('Error getting username stats:', error);
      return {
        totalRooms: 0,
        totalReservedUsernames: 0,
        totalActiveMappings: 0,
        availableNames: 0,
        possibleCombinations: 0,
        rooms: []
      };
    }
  }
  
  /**
   * Handle user disconnection (cleanup)
   */
  handleDisconnect(socketId) {
    try {
      const released = this.releaseUsername(socketId);
      
      if (released) {
        console.log(`Cleaned up username for disconnected user: ${socketId}`);
      }
      
      return released;
    } catch (error) {
      console.error('Error handling disconnect:', error);
      return false;
    }
  }
}

module.exports = UsernameManager;