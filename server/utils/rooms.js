/**
 * Room Management Utility for ChatBrowse Server
 * Handles room creation, user management, and cleanup
 */

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room object
    this.userRooms = new Map(); // socketId -> roomId
    this.cleanupInterval = null;
    
    // Start cleanup process
    this.startCleanup();
  }
  
  /**
   * Create a new room or get existing one
   */
  createRoom(roomId) {
    try {
      if (!this.rooms.has(roomId)) {
        const room = {
          id: roomId,
          users: new Map(), // socketId -> user object
          createdAt: Date.now(),
          lastActivity: Date.now(),
          messageCount: 0
        };
        
        this.rooms.set(roomId, room);
        console.log(`Room created: ${roomId}`);
      }
      
      return this.rooms.get(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      return null;
    }
  }
  
  /**
   * Add user to a room
   */
  joinRoom(roomId, socketId, username) {
    try {
      // Remove user from any previous room first
      this.leaveCurrentRoom(socketId);
      
      // Create room if it doesn't exist
      const room = this.createRoom(roomId);
      if (!room) {
        throw new Error('Failed to create room');
      }
      
      // Add user to room
      const user = {
        socketId,
        username,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      };
      
      room.users.set(socketId, user);
      this.userRooms.set(socketId, roomId);
      room.lastActivity = Date.now();
      
      console.log(`User ${username} (${socketId}) joined room ${roomId}`);
      
      return {
        success: true,
        room,
        userCount: room.users.size,
        users: Array.from(room.users.values())
      };
      
    } catch (error) {
      console.error('Error joining room:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Remove user from their current room
   */
  leaveCurrentRoom(socketId) {
    try {
      const currentRoomId = this.userRooms.get(socketId);
      if (!currentRoomId) {
        return null;
      }
      
      return this.leaveRoom(currentRoomId, socketId);
    } catch (error) {
      console.error('Error leaving current room:', error);
      return null;
    }
  }
  
  /**
   * Remove user from a specific room
   */
  leaveRoom(roomId, socketId) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      const user = room.users.get(socketId);
      if (!user) {
        return null;
      }
      
      // Remove user from room
      room.users.delete(socketId);
      this.userRooms.delete(socketId);
      room.lastActivity = Date.now();
      
      console.log(`User ${user.username} (${socketId}) left room ${roomId}`);
      
      const result = {
        success: true,
        room,
        user,
        userCount: room.users.size,
        users: Array.from(room.users.values())
      };
      
      // Clean up empty room
      if (room.users.size === 0) {
        this.scheduleRoomCleanup(roomId);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error leaving room:', error);
      return null;
    }
  }
  
  /**
   * Get all users in a room
   */
  getRoomUsers(roomId) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return [];
      }
      
      return Array.from(room.users.values());
    } catch (error) {
      console.error('Error getting room users:', error);
      return [];
    }
  }
  
  /**
   * Get user count for a room
   */
  getRoomCount(roomId) {
    try {
      const room = this.rooms.get(roomId);
      return room ? room.users.size : 0;
    } catch (error) {
      console.error('Error getting room count:', error);
      return 0;
    }
  }
  
  /**
   * Get room information
   */
  getRoomInfo(roomId) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        return null;
      }
      
      return {
        id: room.id,
        userCount: room.users.size,
        users: Array.from(room.users.values()),
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        messageCount: room.messageCount
      };
    } catch (error) {
      console.error('Error getting room info:', error);
      return null;
    }
  }
  
  /**
   * Get user's current room
   */
  getUserRoom(socketId) {
    try {
      const roomId = this.userRooms.get(socketId);
      if (!roomId) {
        return null;
      }
      
      return this.getRoomInfo(roomId);
    } catch (error) {
      console.error('Error getting user room:', error);
      return null;
    }
  }
  
  /**
   * Update user's last seen timestamp
   */
  updateUserActivity(socketId) {
    try {
      const roomId = this.userRooms.get(socketId);
      if (!roomId) {
        return false;
      }
      
      const room = this.rooms.get(roomId);
      if (!room) {
        return false;
      }
      
      const user = room.users.get(socketId);
      if (!user) {
        return false;
      }
      
      user.lastSeen = Date.now();
      room.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      console.error('Error updating user activity:', error);
      return false;
    }
  }
  
  /**
   * Increment message count for a room
   */
  incrementMessageCount(roomId) {
    try {
      const room = this.rooms.get(roomId);
      if (room) {
        room.messageCount += 1;
        room.lastActivity = Date.now();
        return room.messageCount;
      }
      return 0;
    } catch (error) {
      console.error('Error incrementing message count:', error);
      return 0;
    }
  }
  
  /**
   * Schedule room cleanup after delay
   */
  scheduleRoomCleanup(roomId, delay = 30000) { // 30 seconds default
    try {
      setTimeout(() => {
        const room = this.rooms.get(roomId);
        if (room && room.users.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} cleaned up (was empty for ${delay}ms)`);
        }
      }, delay);
    } catch (error) {
      console.error('Error scheduling room cleanup:', error);
    }
  }
  
  /**
   * Clean up inactive rooms and users
   */
  cleanupInactiveRooms() {
    try {
      const now = Date.now();
      const inactivityTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const emptyRoomTimeout = 30 * 1000; // 30 seconds for empty rooms
      
      let roomsRemoved = 0;
      let usersRemoved = 0;
      
      for (const [roomId, room] of this.rooms.entries()) {
        const roomAge = now - room.lastActivity;
        
        // Remove empty rooms that have been empty for a while
        if (room.users.size === 0 && roomAge > emptyRoomTimeout) {
          this.rooms.delete(roomId);
          roomsRemoved++;
          continue;
        }
        
        // Remove very old inactive rooms
        if (roomAge > inactivityTimeout) {
          // Clean up user mappings
          for (const socketId of room.users.keys()) {
            this.userRooms.delete(socketId);
            usersRemoved++;
          }
          
          this.rooms.delete(roomId);
          roomsRemoved++;
          continue;
        }
        
        // Remove inactive users from active rooms
        const userInactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours
        for (const [socketId, user] of room.users.entries()) {
          const userAge = now - user.lastSeen;
          if (userAge > userInactivityTimeout) {
            room.users.delete(socketId);
            this.userRooms.delete(socketId);
            usersRemoved++;
          }
        }
      }
      
      if (roomsRemoved > 0 || usersRemoved > 0) {
        console.log(`Cleanup completed: ${roomsRemoved} rooms, ${usersRemoved} users removed`);
      }
      
      return { roomsRemoved, usersRemoved };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { roomsRemoved: 0, usersRemoved: 0 };
    }
  }
  
  /**
   * Start periodic cleanup
   */
  startCleanup(intervalMs = 5 * 60 * 1000) { // 5 minutes
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      this.cleanupInterval = setInterval(() => {
        this.cleanupInactiveRooms();
      }, intervalMs);
      
      console.log(`Room cleanup started with ${intervalMs}ms interval`);
    } catch (error) {
      console.error('Error starting cleanup:', error);
    }
  }
  
  /**
   * Stop cleanup process
   */
  stopCleanup() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
        console.log('Room cleanup stopped');
      }
    } catch (error) {
      console.error('Error stopping cleanup:', error);
    }
  }
  
  /**
   * Get server statistics
   */
  getStats() {
    try {
      let totalUsers = 0;
      let totalMessages = 0;
      const roomStats = [];
      
      for (const [roomId, room] of this.rooms.entries()) {
        totalUsers += room.users.size;
        totalMessages += room.messageCount;
        
        roomStats.push({
          id: roomId,
          userCount: room.users.size,
          messageCount: room.messageCount,
          age: Date.now() - room.createdAt,
          lastActivity: Date.now() - room.lastActivity
        });
      }
      
      return {
        totalRooms: this.rooms.size,
        totalUsers,
        totalMessages,
        rooms: roomStats
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalRooms: 0,
        totalUsers: 0,
        totalMessages: 0,
        rooms: []
      };
    }
  }
  
  /**
   * Validate room ID format
   */
  static validateRoomId(roomId) {
    if (!roomId || typeof roomId !== 'string') {
      return false;
    }
    
    // Room ID should be alphanumeric with underscores/hyphens
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(roomId) && roomId.length <= 100;
  }
  
  /**
   * Generate room ID from URL
   */
  static generateRoomId(url) {
    try {
      const urlObj = new URL(url);
      const baseUrl = urlObj.hostname + urlObj.pathname.replace(/\/$/, '');
      
      // Create a simple hash of the URL
      let hash = 0;
      for (let i = 0; i < baseUrl.length; i++) {
        const char = baseUrl.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return `room_${Math.abs(hash)}`;
    } catch (error) {
      console.error('Error generating room ID:', error);
      return 'room_default';
    }
  }
}

module.exports = RoomManager;