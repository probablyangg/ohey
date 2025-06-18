/**
 * ChatBrowse Popup Settings Interface
 * Handles all popup functionality and settings management
 */

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.isLoading = false;
    
    // DOM elements
    this.elements = {};
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      console.log('Initializing popup...');
      
      // Get DOM references
      this.getDOMReferences();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current settings and status
      await this.loadAll();
      
      console.log('Popup initialized successfully');
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.showToast('Error loading settings', 'error');
    }
  }
  
  /**
   * Get references to DOM elements
   */
  getDOMReferences() {
    const elements = [
      'status-dot', 'status-text', 'current-site', 'user-count',
      'extension-toggle', 'add-site-btn', 'add-site-form', 'site-input',
      'save-site-btn', 'cancel-site-btn', 'empty-blocked', 'blocked-items',
      'block-current-btn', 'refresh-widget-btn', 'sites-visited',
      'messages-sent', 'session-time', 'last-used', 'help-link',
      'feedback-link', 'privacy-link', 'toast-container'
    ];
    
    elements.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }
  
  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    try {
      // Extension toggle
      if (this.elements['extension-toggle']) {
        this.elements['extension-toggle'].addEventListener('change', 
          this.handleExtensionToggle.bind(this));
      }
      
      // Add site button
      if (this.elements['add-site-btn']) {
        this.elements['add-site-btn'].addEventListener('click', 
          this.showAddSiteForm.bind(this));
      }
      
      // Save site button
      if (this.elements['save-site-btn']) {
        this.elements['save-site-btn'].addEventListener('click', 
          this.handleSaveSite.bind(this));
      }
      
      // Cancel site button
      if (this.elements['cancel-site-btn']) {
        this.elements['cancel-site-btn'].addEventListener('click', 
          this.hideAddSiteForm.bind(this));
      }
      
      // Site input enter key
      if (this.elements['site-input']) {
        this.elements['site-input'].addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.handleSaveSite();
          }
        });
        
        this.elements['site-input'].addEventListener('input', 
          this.validateSiteInput.bind(this));
      }
      
      // Block current site button
      if (this.elements['block-current-btn']) {
        this.elements['block-current-btn'].addEventListener('click', 
          this.blockCurrentSite.bind(this));
      }
      
      // Refresh widget button
      if (this.elements['refresh-widget-btn']) {
        this.elements['refresh-widget-btn'].addEventListener('click', 
          this.refreshWidget.bind(this));
      }
      
      // Footer links
      if (this.elements['help-link']) {
        this.elements['help-link'].addEventListener('click', 
          this.openHelpPage.bind(this));
      }
      
      if (this.elements['feedback-link']) {
        this.elements['feedback-link'].addEventListener('click', 
          this.openFeedbackPage.bind(this));
      }
      
      if (this.elements['privacy-link']) {
        this.elements['privacy-link'].addEventListener('click', 
          this.openPrivacyPage.bind(this));
      }
      
      console.log('Event listeners set up');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }
  
  /**
   * Load all settings and status information
   */
  async loadAll() {
    try {
      await Promise.all([
        this.loadCurrentTab(),
        this.loadExtensionStatus(),
        this.loadBlockedSites(),
        this.loadStatistics(),
        this.loadWidgetStatus()
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  /**
   * Get current active tab
   */
  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (this.elements['current-site'] && tab) {
        const url = new URL(tab.url);
        this.elements['current-site'].textContent = url.hostname;
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
      if (this.elements['current-site']) {
        this.elements['current-site'].textContent = 'Unknown';
      }
    }
  }
  
  /**
   * Load extension enabled/disabled status
   */
  async loadExtensionStatus() {
    try {
      const isEnabled = await this.getStorageValue('chatbrowse_enabled', true);
      
      if (this.elements['extension-toggle']) {
        this.elements['extension-toggle'].checked = isEnabled;
      }
      
      this.updateStatusIndicator(isEnabled);
    } catch (error) {
      console.error('Error loading extension status:', error);
    }
  }
  
  /**
   * Load and display blocked sites
   */
  async loadBlockedSites() {
    try {
      const blockedPatterns = await this.getStorageValue('chatbrowse_blocked_patterns', []);
      this.renderBlockedSites(blockedPatterns);
    } catch (error) {
      console.error('Error loading blocked sites:', error);
    }
  }
  
  /**
   * Load and display usage statistics
   */
  async loadStatistics() {
    try {
      const stats = await this.getStorageValue('chatbrowse_stats', {
        sitesVisited: 0,
        messagesExchanged: 0,
        totalSessionTime: 0,
        lastUsed: null
      });
      
      if (this.elements['sites-visited']) {
        this.elements['sites-visited'].textContent = stats.sitesVisited;
      }
      
      if (this.elements['messages-sent']) {
        this.elements['messages-sent'].textContent = stats.messagesExchanged;
      }
      
      if (this.elements['session-time']) {
        const minutes = Math.floor(stats.totalSessionTime / 60);
        this.elements['session-time'].textContent = `${minutes}m`;
      }
      
      if (this.elements['last-used']) {
        if (stats.lastUsed) {
          const date = new Date(stats.lastUsed);
          this.elements['last-used'].textContent = date.toLocaleDateString();
        } else {
          this.elements['last-used'].textContent = 'Never';
        }
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }
  
  /**
   * Load widget status for current tab
   */
  async loadWidgetStatus() {
    try {
      if (!this.currentTab) return;
      
      // Send message to content script to get status
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'status'
      });
      
      if (response && response.userCount !== undefined) {
        if (this.elements['user-count']) {
          this.elements['user-count'].textContent = response.userCount;
        }
      }
    } catch (error) {
      console.log('Could not get widget status (widget may not be active)');
      if (this.elements['user-count']) {
        this.elements['user-count'].textContent = '0';
      }
    }
  }
  
  /**
   * Handle extension toggle
   */
  async handleExtensionToggle(event) {
    try {
      const isEnabled = event.target.checked;
      
      await chrome.storage.sync.set({
        chatbrowse_enabled: isEnabled
      });
      
      this.updateStatusIndicator(isEnabled);
      this.showToast(isEnabled ? 'Extension enabled' : 'Extension disabled');
      
      // Refresh widget status after a delay
      setTimeout(() => this.loadWidgetStatus(), 1000);
      
    } catch (error) {
      console.error('Error toggling extension:', error);
      this.showToast('Error updating settings', 'error');
    }
  }
  
  /**
   * Show add site form
   */
  showAddSiteForm() {
    if (this.elements['add-site-form']) {
      this.elements['add-site-form'].style.display = 'block';
      
      if (this.elements['site-input']) {
        this.elements['site-input'].focus();
        
        // Pre-fill with current site suggestion
        if (this.currentTab) {
          try {
            const url = new URL(this.currentTab.url);
            this.elements['site-input'].value = `${url.hostname}*`;
          } catch (error) {
            console.log('Could not pre-fill site input');
          }
        }
      }
    }
  }
  
  /**
   * Hide add site form
   */
  hideAddSiteForm() {
    if (this.elements['add-site-form']) {
      this.elements['add-site-form'].style.display = 'none';
      
      if (this.elements['site-input']) {
        this.elements['site-input'].value = '';
      }
    }
  }
  
  /**
   * Handle saving new blocked site
   */
  async handleSaveSite() {
    try {
      const pattern = this.elements['site-input']?.value?.trim();
      
      if (!pattern) {
        this.showToast('Please enter a pattern', 'error');
        return;
      }
      
      // Validate pattern
      if (!this.validatePattern(pattern)) {
        this.showToast('Invalid pattern format', 'error');
        return;
      }
      
      // Get current blocked patterns
      const blockedPatterns = await this.getStorageValue('chatbrowse_blocked_patterns', []);
      
      // Check for duplicates
      if (blockedPatterns.includes(pattern)) {
        this.showToast('Pattern already exists', 'error');
        return;
      }
      
      // Add new pattern
      blockedPatterns.push(pattern);
      
      await chrome.storage.sync.set({
        chatbrowse_blocked_patterns: blockedPatterns
      });
      
      // Update UI
      this.renderBlockedSites(blockedPatterns);
      this.hideAddSiteForm();
      this.showToast('Site blocked successfully');
      
    } catch (error) {
      console.error('Error saving blocked site:', error);
      this.showToast('Error saving pattern', 'error');
    }
  }
  
  /**
   * Remove blocked site
   */
  async removeBlockedSite(pattern) {
    try {
      const blockedPatterns = await this.getStorageValue('chatbrowse_blocked_patterns', []);
      const updatedPatterns = blockedPatterns.filter(p => p !== pattern);
      
      await chrome.storage.sync.set({
        chatbrowse_blocked_patterns: updatedPatterns
      });
      
      this.renderBlockedSites(updatedPatterns);
      this.showToast('Site unblocked');
      
    } catch (error) {
      console.error('Error removing blocked site:', error);
      this.showToast('Error removing pattern', 'error');
    }
  }
  
  /**
   * Block current site
   */
  async blockCurrentSite() {
    try {
      if (!this.currentTab) {
        this.showToast('No active tab found', 'error');
        return;
      }
      
      const url = new URL(this.currentTab.url);
      const pattern = `${url.hostname}*`;
      
      // Get current blocked patterns
      const blockedPatterns = await this.getStorageValue('chatbrowse_blocked_patterns', []);
      
      // Check if already blocked
      if (blockedPatterns.includes(pattern)) {
        this.showToast('Site is already blocked', 'error');
        return;
      }
      
      // Add pattern
      blockedPatterns.push(pattern);
      
      await chrome.storage.sync.set({
        chatbrowse_blocked_patterns: blockedPatterns
      });
      
      this.renderBlockedSites(blockedPatterns);
      this.showToast('Current site blocked');
      
    } catch (error) {
      console.error('Error blocking current site:', error);
      this.showToast('Error blocking site', 'error');
    }
  }
  
  /**
   * Refresh widget on current tab
   */
  async refreshWidget() {
    try {
      if (!this.currentTab) {
        this.showToast('No active tab found', 'error');
        return;
      }
      
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'refresh'
      });
      
      this.showToast('Widget refreshed');
      
      // Update status after delay
      setTimeout(() => this.loadWidgetStatus(), 1000);
      
    } catch (error) {
      console.log('Could not refresh widget (may not be active on this page)');
      this.showToast('Widget not active on this page', 'warning');
    }
  }
  
  /**
   * Render blocked sites list
   */
  renderBlockedSites(patterns) {
    try {
      const emptyState = this.elements['empty-blocked'];
      const itemsContainer = this.elements['blocked-items'];
      
      if (!itemsContainer) return;
      
      // Clear existing items
      itemsContainer.innerHTML = '';
      
      if (patterns.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      if (emptyState) emptyState.style.display = 'none';
      
      // Create items
      patterns.forEach(pattern => {
        const item = document.createElement('div');
        item.className = 'blocked-item';
        
        item.innerHTML = `
          <div class="blocked-pattern">
            <code>${this.escapeHtml(pattern)}</code>
          </div>
          <button class="remove-btn" data-pattern="${this.escapeHtml(pattern)}" title="Remove">
            <span class="remove-icon">×</span>
          </button>
        `;
        
        // Add remove handler
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            this.removeBlockedSite(pattern);
          });
        }
        
        itemsContainer.appendChild(item);
      });
      
    } catch (error) {
      console.error('Error rendering blocked sites:', error);
    }
  }
  
  /**
   * Update status indicator
   */
  updateStatusIndicator(isEnabled) {
    const dot = this.elements['status-dot'];
    const text = this.elements['status-text'];
    
    if (dot && text) {
      if (isEnabled) {
        dot.className = 'status-dot enabled';
        text.textContent = 'Enabled';
      } else {
        dot.className = 'status-dot disabled';
        text.textContent = 'Disabled';
      }
    }
  }
  
  /**
   * Validate site input in real-time
   */
  validateSiteInput() {
    const input = this.elements['site-input'];
    const saveBtn = this.elements['save-site-btn'];
    
    if (!input || !saveBtn) return;
    
    const pattern = input.value.trim();
    const isValid = pattern.length > 0 && this.validatePattern(pattern);
    
    saveBtn.disabled = !isValid;
    
    if (pattern.length > 0 && !isValid) {
      input.style.borderColor = '#ef4444';
    } else {
      input.style.borderColor = '';
    }
  }
  
  /**
   * Validate wildcard pattern
   */
  validatePattern(pattern) {
    try {
      if (!pattern || typeof pattern !== 'string') return false;
      if (pattern.trim().length === 0) return false;
      if (pattern.includes('**')) return false;
      
      // Test basic regex conversion
      const escaped = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      
      new RegExp(`^${escaped}$`, 'i');
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    try {
      const container = this.elements['toast-container'];
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      
      container.appendChild(toast);
      
      // Trigger animation
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Remove after delay
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error showing toast:', error);
    }
  }
  
  /**
   * Open help page
   */
  openHelpPage(event) {
    event.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-username/chatbrowse#help'
    });
  }
  
  /**
   * Open feedback page
   */
  openFeedbackPage(event) {
    event.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-username/chatbrowse/issues'
    });
  }
  
  /**
   * Open privacy page
   */
  openPrivacyPage(event) {
    event.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-username/chatbrowse/blob/main/PRIVACY.md'
    });
  }
  
  /**
   * Utility methods
   */
  
  async getStorageValue(key, defaultValue) {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Error getting storage value:', error);
      return defaultValue;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});