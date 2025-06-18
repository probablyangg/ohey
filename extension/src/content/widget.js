/**
 * OHey Widget - UI Components and Logic
 * Handles the chat widget interface and user interactions
 */

class ChatWidget {
  constructor() {
    this.isVisible = false;
    this.isPanelOpen = false;
    this.messages = [];
    this.userCount = 0;
    this.username = '';
    this.websocket = null;
    this.roomId = '';
    this.sessionStartTime = Date.now();
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // DOM elements (will be set after render)
    this.widget = null;
    this.indicator = null;
    this.panel = null;
    this.messagesContainer = null;
    this.input = null;
    this.sendButton = null;
    this.waveButton = null;
    this.countElement = null;
    this.titleElement = null;
    this.shareButton = null;
    
    // Bind methods to preserve 'this' context
    this.handleIndicatorClick = this.handleIndicatorClick.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleInputKeypress = this.handleInputKeypress.bind(this);
    this.handleWaveClick = this.handleWaveClick.bind(this);
    this.handleShareClick = this.handleShareClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      // Get username for this session
      this.username = window.ChatBrowseUsernames.getSessionUsername();
      
      // Generate room ID based on current URL
      this.roomId = this.generateRoomId(window.location.href);
      
      // Render the widget
      this.render();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Connect to WebSocket server
      this.connectWebSocket();
      
      console.log('OHey widget initialized', {
        username: this.username,
        roomId: this.roomId
      });
    } catch (error) {
      console.error('Error initializing OHey widget:', error);
    }
  }
  
  /**
   * Generate room ID based on URL
   */
  generateRoomId(url) {
    try {
      const urlObj = new URL(url);
      // Use hostname + pathname (normalized) as room identifier
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
  
  /**
   * Create and inject widget HTML into page
   */
  render() {
    try {
      // Remove existing widget if present
      const existing = document.getElementById('ohey-widget');
      if (existing) {
        existing.remove();
      }
      
      // Create widget container
      this.widget = document.createElement('div');
      this.widget.id = 'ohey-widget';
      
      // Create widget HTML structure
      this.widget.innerHTML = `
        <div class="cb-indicator">
          <div class="cb-dot"></div>
          <span class="cb-count">0 others here</span>
        </div>
        <div class="cb-panel">
          <div class="cb-status"></div>
          <div class="cb-header">
            <span class="cb-title">Chat • ${this.getDomainName()}</span>
            <button class="cb-share" title="Share this chat">📤</button>
          </div>
          <div class="cb-messages">
            <div class="cb-empty-state">
              <div class="cb-empty-state-icon">💬</div>
              <div class="cb-empty-state-text">No messages yet.<br>Say hello to get the conversation started!</div>
            </div>
          </div>
          <div class="cb-input">
            <button class="cb-wave" title="Send wave">👋</button>
            <input type="text" placeholder="Type a message..." maxlength="500">
            <button class="cb-send">Send</button>
          </div>
        </div>
      `;
      
      // Inject into page
      document.body.appendChild(this.widget);
      
      // Store references to key elements
      this.indicator = this.widget.querySelector('.cb-indicator');
      this.panel = this.widget.querySelector('.cb-panel');
      this.messagesContainer = this.widget.querySelector('.cb-messages');
      this.input = this.widget.querySelector('.cb-input input');
      this.sendButton = this.widget.querySelector('.cb-send');
      this.waveButton = this.widget.querySelector('.cb-wave');
      this.countElement = this.widget.querySelector('.cb-count');
      this.titleElement = this.widget.querySelector('.cb-title');
      this.shareButton = this.widget.querySelector('.cb-share');
      
      this.isVisible = true;
      
      console.log('OHey widget rendered successfully');
    } catch (error) {
      console.error('Error rendering OHey widget:', error);
    }
  }
  
  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    try {
      // Indicator click to toggle panel
      if (this.indicator) {
        this.indicator.addEventListener('click', this.handleIndicatorClick);
      }
      
      // Send button click
      if (this.sendButton) {
        this.sendButton.addEventListener('click', this.handleSendMessage);
      }
      
      // Input keypress (Enter to send)
      if (this.input) {
        this.input.addEventListener('keypress', this.handleInputKeypress);
        this.input.addEventListener('input', this.handleInputChange.bind(this));
      }
      
      // Wave button click
      if (this.waveButton) {
        this.waveButton.addEventListener('click', this.handleWaveClick);
      }
      
      // Share button click
      if (this.shareButton) {
        this.shareButton.addEventListener('click', this.handleShareClick);
      }
      
      // Click outside to close panel
      document.addEventListener('click', this.handleOutsideClick);
      
      // Handle page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      
      console.log('Event listeners set up');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }
  
  /**
   * Handle indicator click (toggle panel)
   */
  handleIndicatorClick(event) {
    event.stopPropagation();
    this.togglePanel();
  }
  
  /**
   * Handle send message
   */
  handleSendMessage() {
    const message = this.input.value.trim();
    if (message && message.length > 0) {
      this.sendMessage(message);
      this.input.value = '';
      this.updateSendButton();
    }
  }
  
  /**
   * Handle input keypress
   */
  handleInputKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSendMessage();
    }
  }
  
  /**
   * Handle input change to update send button state
   */
  handleInputChange() {
    this.updateSendButton();
  }
  
  /**
   * Handle wave button click
   */
  handleWaveClick() {
    this.sendWave();
  }
  
  /**
   * Handle share button click
   */
  handleShareClick() {
    this.shareChat();
  }
  
  /**
   * Handle click outside widget to close panel
   */
  handleOutsideClick(event) {
    if (this.isPanelOpen && this.widget && !this.widget.contains(event.target)) {
      this.closePanel();
    }
  }
  
  /**
   * Handle page visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden - could disconnect WebSocket to save resources
      console.log('Page hidden');
    } else {
      // Page is visible again - could reconnect WebSocket
      console.log('Page visible');
    }
  }
  
  /**
   * Toggle chat panel open/closed
   */
  togglePanel() {
    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }
  
  /**
   * Open chat panel
   */
  openPanel() {
    try {
      if (this.panel) {
        this.panel.classList.remove('cb-hide');
        this.panel.classList.add('cb-show');
        this.isPanelOpen = true;
        
        // Focus input field
        if (this.input) {
          setTimeout(() => this.input.focus(), 100);
        }
        
        // Scroll to bottom of messages
        this.scrollToBottom();
        
        // Increment site count if this is first time opening on this site
        if (this.messages.length === 0) {
          window.ChatBrowseStorage.incrementSiteCount();
        }
        
        console.log('Chat panel opened');
      }
    } catch (error) {
      console.error('Error opening panel:', error);
    }
  }
  
  /**
   * Close chat panel
   */
  closePanel() {
    try {
      if (this.panel) {
        this.panel.classList.add('cb-hide');
        this.isPanelOpen = false;
        
        // Remove show class after animation
        setTimeout(() => {
          if (this.panel) {
            this.panel.classList.remove('cb-show', 'cb-hide');
          }
        }, 200);
        
        console.log('Chat panel closed');
      }
    } catch (error) {
      console.error('Error closing panel:', error);
    }
  }
  
  /**
   * Send a chat message
   */
  sendMessage(text) {
    try {
      if (!this.isConnected) {
        this.addSystemMessage('Not connected to server. Trying to reconnect...');
        this.connectWebSocket();
        return;
      }
      
      // Send via WebSocket
      this.websocket.emit('send-message', {
        text: text,
        roomId: this.roomId
      });
      
      // Increment message count
      window.ChatBrowseStorage.incrementMessageCount();
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.addSystemMessage('Failed to send message. Please try again.');
    }
  }
  
  /**
   * Send a wave
   */
  sendWave() {
    try {
      if (!this.isConnected) {
        this.addSystemMessage('Not connected to server. Trying to reconnect...');
        this.connectWebSocket();
        return;
      }
      
      // Send via WebSocket
      this.websocket.emit('send-wave', {
        roomId: this.roomId
      });
      
      // Show feedback to sender
      this.addSystemMessage('You waved 👋');
      
      // Visual feedback
      if (this.waveButton) {
        this.waveButton.style.transform = 'scale(1.2)';
        setTimeout(() => {
          if (this.waveButton) {
            this.waveButton.style.transform = '';
          }
        }, 200);
      }
      
    } catch (error) {
      console.error('Error sending wave:', error);
      this.addSystemMessage('Failed to send wave. Please try again.');
    }
  }
  
  /**
   * Add a message to the UI
   */
  addMessage(username, text, isOwn = false) {
    try {
      const messageElement = document.createElement('div');
      messageElement.className = `cb-message ${isOwn ? 'cb-own' : ''}`;
      
      const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      messageElement.innerHTML = `
        <div class="cb-username">${this.escapeHtml(username)}</div>
        <div class="cb-message-content">${this.escapeHtml(text)}</div>
        <div class="cb-timestamp">${timestamp}</div>
      `;
      
      // Remove empty state if present
      this.removeEmptyState();
      
      // Add message to container
      if (this.messagesContainer) {
        this.messagesContainer.appendChild(messageElement);
      }
      
      // Store message
      this.messages.push({
        username,
        text,
        isOwn,
        timestamp: Date.now()
      });
      
      // Scroll to bottom
      this.scrollToBottom();
      
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }
  
  /**
   * Add a system message
   */
  addSystemMessage(text) {
    try {
      const messageElement = document.createElement('div');
      messageElement.className = 'cb-message cb-system';
      
      messageElement.innerHTML = `
        <div class="cb-message-content">${this.escapeHtml(text)}</div>
      `;
      
      // Remove empty state if present
      this.removeEmptyState();
      
      // Add message to container
      if (this.messagesContainer) {
        this.messagesContainer.appendChild(messageElement);
      }
      
      // Scroll to bottom
      this.scrollToBottom();
      
    } catch (error) {
      console.error('Error adding system message:', error);
    }
  }
  
  /**
   * Update user count display
   */
  updateUserCount(count) {
    try {
      this.userCount = count;
      
      if (this.countElement) {
        // Subtract 1 to show "others" (excluding current user)
        const othersCount = Math.max(0, count - 1);
        
        if (othersCount === 0) {
          this.countElement.textContent = '0 others here';
        } else if (othersCount === 1) {
          this.countElement.textContent = '1 other here';
        } else {
          this.countElement.textContent = `${othersCount} others here`;
        }
      }
      
      console.log('User count updated:', count, '(showing others:', Math.max(0, count - 1), ')');
    } catch (error) {
      console.error('Error updating user count:', error);
    }
  }
  
  /**
   * Share chat functionality
   */
  shareChat() {
    try {
      const url = window.location.href;
      const text = `Join the conversation on ${this.getDomainName()}! Install ChatBrowse to chat with others viewing the same page.`;
      
      // Try to use Web Share API if available
      if (navigator.share) {
        navigator.share({
          title: 'Join the ChatBrowse conversation',
          text: text,
          url: url
        }).catch(err => {
          console.log('Error sharing:', err);
          this.fallbackShare(text, url);
        });
      } else {
        this.fallbackShare(text, url);
      }
      
    } catch (error) {
      console.error('Error sharing chat:', error);
      this.fallbackShare('Check out ChatBrowse!', window.location.href);
    }
  }
  
  /**
   * Fallback share method (copy to clipboard)
   */
  fallbackShare(text, url) {
    try {
      const shareText = `${text}\n\n${url}`;
      
      // Try to copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          this.showToast('Link copied to clipboard!');
        }).catch(() => {
          this.showShareDialog(shareText);
        });
      } else {
        this.showShareDialog(shareText);
      }
      
    } catch (error) {
      console.error('Error in fallback share:', error);
    }
  }
  
  /**
   * Show share dialog
   */
  showShareDialog(text) {
    // Simple alert for now - could be improved with a custom modal
    alert(`Share this:\n\n${text}`);
  }
  
  /**
   * Show toast notification
   */
  showToast(message) {
    // Simple implementation - could be improved with custom toast component
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      z-index: 2147483647;
      animation: cb-slide-up 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  /**
   * Utility methods
   */
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  getDomainName() {
    try {
      return new URL(window.location.href).hostname;
    } catch {
      return 'this page';
    }
  }
  
  removeEmptyState() {
    if (this.messagesContainer) {
      const emptyState = this.messagesContainer.querySelector('.cb-empty-state');
      if (emptyState) {
        emptyState.remove();
      }
    }
  }
  
  scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 50);
    }
  }
  
  updateSendButton() {
    if (this.sendButton && this.input) {
      const hasText = this.input.value.trim().length > 0;
      this.sendButton.disabled = !hasText;
    }
  }
  
  /**
   * Connect to WebSocket server
   */
  connectWebSocket() {
    try {
      if (this.isConnecting || this.isConnected) {
        return;
      }
      
      this.isConnecting = true;
      this.updateConnectionStatus('connecting');
      
      // Use localhost for development, can be configured for production
      const serverUrl = 'http://localhost:3001';
      
      // Socket.IO is now bundled with the extension
      if (typeof io === 'undefined') {
        console.error('Socket.IO client not loaded');
        this.addSystemMessage('Socket.IO client not available');
        this.handleConnectionError();
        return;
      }
      
      this.establishConnection(serverUrl);
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.handleConnectionError();
    }
  }
  
  /**
   * Load Socket.IO client library dynamically
   */
  loadSocketIOClient() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.io) {
        console.log('Socket.IO already loaded');
        resolve();
        return;
      }
      
      console.log('Loading Socket.IO client...');
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('Socket.IO client loaded successfully');
        // Give it a moment to initialize
        setTimeout(() => {
          if (window.io) {
            resolve();
          } else {
            reject(new Error('Socket.IO loaded but not available'));
          }
        }, 100);
      };
      script.onerror = (error) => {
        console.error('Failed to load Socket.IO script:', error);
        reject(new Error('Failed to load Socket.IO client'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Establish WebSocket connection
   */
  establishConnection(serverUrl) {
    try {
      console.log('Attempting to connect to:', serverUrl);
      
      if (!window.io) {
        throw new Error('Socket.IO client not available');
      }
      
      this.websocket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first
        timeout: 10000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false
      });
      
      console.log('Socket.IO instance created, setting up handlers...');
      this.setupWebSocketEventHandlers();
      
    } catch (error) {
      console.error('Error establishing connection:', error);
      this.addSystemMessage(`Connection error: ${error.message}`);
      this.handleConnectionError();
    }
  }
  
  /**
   * Set up WebSocket event handlers
   */
  setupWebSocketEventHandlers() {
    if (!this.websocket) return;
    
    // Connection established
    this.websocket.on('connect', () => {
      console.log('Connected to OHey server');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      
      // Join room
      this.joinRoom();
    });
    
    // Connection error
    this.websocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      this.addSystemMessage(`Connection failed: ${error.message || 'Unknown error'}`);
      this.handleConnectionError();
    });
    
    // Disconnection
    this.websocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
      this.isConnecting = false;
      this.updateConnectionStatus('disconnected');
      
      // Attempt to reconnect
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });
    
    // Room joined successfully
    this.websocket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      this.username = data.username; // Server may have modified username
      this.updateUserCount(data.userCount);
      this.addSystemMessage(`Connected as ${data.username}`);
    });
    
    // Receive message
    this.websocket.on('message', (data) => {
      this.addMessage(data.username, data.text, data.username === this.username);
    });
    
    // Receive wave
    this.websocket.on('wave', (data) => {
      if (data.username !== this.username) {
        this.addSystemMessage(`${data.username} waved 👋`);
      }
    });
    
    // User joined room
    this.websocket.on('user-joined', (data) => {
      this.updateUserCount(data.userCount);
      this.addSystemMessage(`${data.username} joined the chat`);
    });
    
    // User left room
    this.websocket.on('user-left', (data) => {
      this.updateUserCount(data.userCount);
      this.addSystemMessage(`${data.username} left the chat`);
    });
    
    // User count update
    this.websocket.on('user-count', (data) => {
      this.updateUserCount(data.count);
    });
    
    // Server error
    this.websocket.on('error', (data) => {
      console.error('Server error:', data);
      this.addSystemMessage(`Error: ${data.message}`);
    });
    
    // Pong response
    this.websocket.on('pong', (data) => {
      console.log('Pong received:', data);
    });
  }
  
  /**
   * Join room on server
   */
  joinRoom() {
    if (!this.websocket || !this.isConnected) {
      return;
    }
    
    this.websocket.emit('join-room', {
      roomId: this.roomId,
      url: window.location.href,
      username: this.username
    });
  }
  
  /**
   * Handle connection errors
   */
  handleConnectionError() {
    this.isConnected = false;
    this.isConnecting = false;
    this.updateConnectionStatus('disconnected');
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.addSystemMessage('Failed to connect to server. Please refresh the page.');
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.addSystemMessage(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connectWebSocket();
      }
    }, delay);
  }
  
  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status) {
    try {
      const statusElement = this.widget?.querySelector('.cb-status');
      if (!statusElement) return;
      
      statusElement.className = `cb-status cb-${status}`;
      
      // Update tooltip or title
      const titles = {
        connecting: 'Connecting to server...',
        connected: 'Connected to server',
        disconnected: 'Disconnected from server'
      };
      
      statusElement.title = titles[status] || 'Unknown status';
      
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }
  
  /**
   * Send ping to server
   */
  ping() {
    if (this.websocket && this.isConnected) {
      this.websocket.emit('ping', { timestamp: Date.now() });
    }
  }
  
  /**
   * Show the widget
   */
  show() {
    if (this.widget) {
      this.widget.style.display = 'block';
      this.isVisible = true;
    }
  }
  
  /**
   * Hide the widget
   */
  hide() {
    if (this.widget) {
      this.widget.style.display = 'none';
      this.isVisible = false;
    }
  }
  
  /**
   * Destroy the widget and clean up
   */
  destroy() {
    try {
      // Calculate session time
      const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      if (sessionTime > 0) {
        window.ChatBrowseStorage.addSessionTime(sessionTime);
      }
      
      // Remove event listeners
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Remove widget from DOM
      if (this.widget && this.widget.parentNode) {
        this.widget.parentNode.removeChild(this.widget);
      }
      
      // Close WebSocket connection if exists
      if (this.websocket) {
        this.websocket.disconnect();
        this.websocket = null;
      }
      
      this.isConnected = false;
      this.isConnecting = false;
      
      console.log('OHey widget destroyed');
    } catch (error) {
      console.error('Error destroying widget:', error);
    }
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.ChatWidget = ChatWidget;
}