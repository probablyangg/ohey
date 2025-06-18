/**
 * OHey Content Script - Main Entry Point
 * Handles initialization and manages the chat widget lifecycle
 */

(function() {
  'use strict';
  
  // Global variables
  let chatWidget = null;
  let isInitialized = false;
  let currentUrl = window.location.href;
  
  /**
   * Initialize the ChatBrowse extension
   */
  async function initializeChatBrowse() {
    try {
      console.log('Initializing OHey...');
      
      // Check if extension is globally enabled
      const isEnabled = await window.ChatBrowseStorage.isExtensionEnabled();
      if (!isEnabled) {
        console.log('OHey is disabled globally');
        return;
      }
      
      // Get blocked patterns
      const blockedPatterns = await window.ChatBrowseStorage.getBlockedPatterns();
      
      // Check if current URL is blocked
      if (window.ChatBrowsePatterns.isBlocked(currentUrl, blockedPatterns)) {
        console.log('OHey is blocked on this site:', currentUrl);
        return;
      }
      
      // Check if we're on a suitable page
      if (!isSuitablePage()) {
        console.log('OHey not suitable for this page type');
        return;
      }
      
      // Create and initialize the chat widget
      chatWidget = new window.ChatWidget();
      isInitialized = true;
      
      console.log('OHey initialized successfully');
      
    } catch (error) {
      console.error('Error initializing OHey:', error);
    }
  }
  
  /**
   * Check if the current page is suitable for OHey
   */
  function isSuitablePage() {
    try {
      // Skip on certain page types
      const unsuitablePages = [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'about:',
        'file://',
        'data:',
        'blob:'
      ];
      
      const currentUrl = window.location.href.toLowerCase();
      
      // Check for unsuitable protocols
      for (const protocol of unsuitablePages) {
        if (currentUrl.startsWith(protocol)) {
          return false;
        }
      }
      
      // Skip on login/auth pages (basic heuristics)
      const authKeywords = ['login', 'signin', 'signup', 'register', 'auth', 'password'];
      const urlLower = currentUrl.toLowerCase();
      const titleLower = document.title.toLowerCase();
      
      for (const keyword of authKeywords) {
        if (urlLower.includes(keyword) || titleLower.includes(keyword)) {
          console.log('Skipping auth-related page');
          return false;
        }
      }
      
      // Skip on pages with sensitive content indicators
      const sensitiveKeywords = ['banking', 'payment', 'checkout', 'admin', 'secure'];
      for (const keyword of sensitiveKeywords) {
        if (urlLower.includes(keyword)) {
          console.log('Skipping sensitive page');
          return false;
        }
      }
      
      // Must have a proper domain
      try {
        const url = new URL(window.location.href);
        if (!url.hostname) {
          return false;
        }
        // Allow localhost and all other domains for testing
      } catch {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error checking page suitability:', error);
      return false;
    }
  }
  
  /**
   * Handle URL changes (for SPAs)
   */
  function handleUrlChange() {
    try {
      const newUrl = window.location.href;
      
      if (newUrl !== currentUrl) {
        console.log('URL changed:', currentUrl, '->', newUrl);
        currentUrl = newUrl;
        
        // Destroy existing widget
        if (chatWidget) {
          chatWidget.destroy();
          chatWidget = null;
          isInitialized = false;
        }
        
        // Reinitialize with small delay to allow page to settle
        setTimeout(() => {
          initializeChatBrowse();
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling URL change:', error);
    }
  }
  
  /**
   * Set up URL change detection for SPAs
   */
  function setupUrlChangeDetection() {
    try {
      // Listen for popstate events (back/forward navigation)
      window.addEventListener('popstate', handleUrlChange);
      
      // Override pushState and replaceState to detect programmatic navigation
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(handleUrlChange, 100);
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(handleUrlChange, 100);
      };
      
      // Also listen for hashchange
      window.addEventListener('hashchange', () => {
        setTimeout(handleUrlChange, 100);
      });
      
      console.log('URL change detection set up');
      
    } catch (error) {
      console.error('Error setting up URL change detection:', error);
    }
  }
  
  /**
   * Handle storage changes (settings updates)
   */
  function handleStorageChange(changes, areaName) {
    try {
      if (areaName !== 'sync') return;
      
      // Check if extension was enabled/disabled
      if (changes.ohey_enabled) {
        const newValue = changes.chatbrowse_enabled.newValue;
        console.log('Extension enabled state changed:', newValue);
        
        if (newValue === false && chatWidget) {
          // Extension was disabled - hide widget
          chatWidget.destroy();
          chatWidget = null;
          isInitialized = false;
        } else if (newValue === true && !isInitialized) {
          // Extension was enabled - initialize widget
          setTimeout(initializeChatBrowse, 500);
        }
      }
      
      // Check if blocked patterns changed
      if (changes.ohey_blocked_patterns) {
        console.log('Blocked patterns changed');
        
        // Re-check if current URL is now blocked
        setTimeout(async () => {
          try {
            const blockedPatterns = await window.ChatBrowseStorage.getBlockedPatterns();
            const isBlocked = window.ChatBrowsePatterns.isBlocked(currentUrl, blockedPatterns);
            
            if (isBlocked && chatWidget) {
              // URL is now blocked - destroy widget
              chatWidget.destroy();
              chatWidget = null;
              isInitialized = false;
            } else if (!isBlocked && !isInitialized) {
              // URL is no longer blocked - initialize widget
              initializeChatBrowse();
            }
          } catch (error) {
            console.error('Error handling blocked patterns change:', error);
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Error handling storage change:', error);
    }
  }
  
  /**
   * Handle page visibility changes
   */
  function handleVisibilityChange() {
    try {
      if (document.hidden) {
        console.log('Page became hidden');
        // Could pause some functionality here
      } else {
        console.log('Page became visible');
        // Could resume functionality here
      }
    } catch (error) {
      console.error('Error handling visibility change:', error);
    }
  }
  
  /**
   * Clean up when page is unloaded
   */
  function handleBeforeUnload() {
    try {
      if (chatWidget) {
        chatWidget.destroy();
      }
    } catch (error) {
      console.error('Error in beforeunload handler:', error);
    }
  }
  
  /**
   * Handle messages from background script or popup
   */
  function handleMessage(request, sender, sendResponse) {
    try {
      console.log('Content script received message:', request);
      
      switch (request.action) {
        case 'ping':
          sendResponse({ status: 'ok', initialized: isInitialized });
          break;
          
        case 'toggle':
          if (chatWidget) {
            chatWidget.togglePanel();
            sendResponse({ status: 'toggled' });
          } else {
            sendResponse({ status: 'not_initialized' });
          }
          break;
          
        case 'status':
          sendResponse({
            initialized: isInitialized,
            url: currentUrl,
            userCount: chatWidget ? chatWidget.userCount : 0,
            username: chatWidget ? chatWidget.username : null
          });
          break;
          
        case 'refresh':
          // Force refresh the widget
          if (chatWidget) {
            chatWidget.destroy();
            chatWidget = null;
            isInitialized = false;
          }
          setTimeout(initializeChatBrowse, 500);
          sendResponse({ status: 'refreshing' });
          break;
          
        default:
          console.log('Unknown message action:', request.action);
          sendResponse({ status: 'unknown_action' });
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ status: 'error', error: error.message });
    }
  }
  
  /**
   * Wait for required dependencies to load
   */
  function waitForDependencies() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkDependencies = () => {
        attempts++;
        
        if (window.ChatBrowseStorage && 
            window.ChatBrowsePatterns && 
            window.ChatBrowseUsernames && 
            window.ChatWidget) {
          console.log('All dependencies loaded');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Dependencies failed to load within timeout'));
        } else {
          setTimeout(checkDependencies, 100);
        }
      };
      
      checkDependencies();
    });
  }
  
  /**
   * Main initialization function
   */
  async function main() {
    try {
      console.log('OHey content script starting...');
      
      // Wait for dependencies to load
      await waitForDependencies();
      
      // Set up event listeners
      setupUrlChangeDetection();
      
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(handleStorageChange);
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(handleMessage);
      }
      
      // Initialize the widget
      await initializeChatBrowse();
      
      console.log('OHey content script initialized');
      
    } catch (error) {
      console.error('Error in main initialization:', error);
    }
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    // DOM is already ready
    main();
  }
  
})();