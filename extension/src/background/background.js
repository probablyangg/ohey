/**
 * OHey Background Script (Service Worker)
 * Handles extension lifecycle, badge updates, and message passing
 */

// Extension state
let isEnabled = true;
let tabUserCounts = new Map(); // tabId -> userCount

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    console.log('OHey extension installed/updated:', details.reason);

    if (details.reason === 'install') {
      // First time installation - set default settings
      await initializeDefaultSettings();

      // Open welcome page
      chrome.tabs.create({
        url: 'https://github.com/probablyangg/ohey'
      });

    } else if (details.reason === 'update') {
      // Extension was updated
      console.log('Extension updated from version:', details.previousVersion);

      // Could handle migration logic here if needed
      await migrateSettings(details.previousVersion);
    }

  } catch (error) {
    console.error('Error in onInstalled handler:', error);
  }
});

/**
 * Initialize default settings for new installations
 */
async function initializeDefaultSettings() {
  try {
    const defaultSettings = {
      ohey_enabled: true,
      ohey_blocked_patterns: [],
      ohey_stats: {
        sitesVisited: 0,
        messagesExchanged: 0,
        totalSessionTime: 0,
        lastUsed: null
      }
    };

    // Only set defaults if keys don't already exist
    const existingSettings = await chrome.storage.sync.get(Object.keys(defaultSettings));

    const settingsToSet = {};
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (existingSettings[key] === undefined) {
        settingsToSet[key] = value;
      }
    }

    if (Object.keys(settingsToSet).length > 0) {
      await chrome.storage.sync.set(settingsToSet);
      console.log('Default settings initialized:', settingsToSet);
    }

  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
}

/**
 * Handle settings migration for updates
 */
async function migrateSettings(previousVersion) {
  try {
    console.log('Migrating settings from version:', previousVersion);

    // Add any migration logic here as the extension evolves
    // For now, just ensure all required keys exist
    await initializeDefaultSettings();

  } catch (error) {
    console.error('Error migrating settings:', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('Background received message:', request, 'from:', sender);

    switch (request.action) {
      case 'updateBadge':
        handleUpdateBadge(request, sender);
        sendResponse({ status: 'ok' });
        break;

      case 'getStatus':
        handleGetStatus(request, sender, sendResponse);
        return true; // Async response

      case 'logEvent':
        handleLogEvent(request, sender);
        sendResponse({ status: 'logged' });
        break;

      case 'ping':
        sendResponse({ status: 'pong', timestamp: Date.now() });
        break;

      default:
        console.log('Unknown message action:', request.action);
        sendResponse({ status: 'unknown_action' });
    }

  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ status: 'error', error: error.message });
  }
});

/**
 * Handle badge update requests
 */
function handleUpdateBadge(request, sender) {
  try {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    const userCount = parseInt(request.userCount) || 0;

    // Store count for this tab
    tabUserCounts.set(tabId, userCount);

    // Update badge
    updateBadge(tabId, userCount);

    console.log(`Badge updated for tab ${tabId}: ${userCount} users`);

  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Handle status requests
 */
async function handleGetStatus(request, sender, sendResponse) {
  try {
    const isEnabled = await getExtensionStatus();
    const tabId = sender.tab?.id;
    const userCount = tabId ? (tabUserCounts.get(tabId) || 0) : 0;

    sendResponse({
      status: 'ok',
      enabled: isEnabled,
      userCount: userCount,
      version: chrome.runtime.getManifest().version
    });

  } catch (error) {
    console.error('Error getting status:', error);
    sendResponse({ status: 'error', error: error.message });
  }
}

/**
 * Handle event logging
 */
function handleLogEvent(request, sender) {
  try {
    const event = request.event;
    const data = request.data || {};

    console.log('Event logged:', event, data);

    // Could send to analytics service here
    // For now, just log to console

  } catch (error) {
    console.error('Error logging event:', error);
  }
}

/**
 * Update extension badge
 */
async function updateBadge(tabId, count) {
  try {
    if (!chrome.action) return;

    if (count > 0) {
      // Show user count
      await chrome.action.setBadgeText({
        text: count.toString(),
        tabId: tabId
      });

      await chrome.action.setBadgeBackgroundColor({
        color: '#10b981', // Green
        tabId: tabId
      });

      await chrome.action.setBadgeTextColor({
        color: '#ffffff',
        tabId: tabId
      });

    } else {
      // Clear badge
      await chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }

  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

/**
 * Handle tab updates to clear badge when navigating
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      // Clear badge when navigating to a new page
      tabUserCounts.delete(tabId);
      updateBadge(tabId, 0);
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
});

/**
 * Handle tab removal to clean up stored data
 */
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  try {
    tabUserCounts.delete(tabId);
    console.log('Cleaned up data for closed tab:', tabId);
  } catch (error) {
    console.error('Error handling tab removal:', error);
  }
});

/**
 * Handle storage changes to update extension state
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  try {
    if (areaName !== 'sync') return;

    if (changes.ohey_enabled) {
      const newValue = changes.ohey_enabled.newValue;
      isEnabled = newValue !== false;

      console.log('Extension enabled state changed:', isEnabled);

      // Update all tab badges
      updateAllBadges();
    }

  } catch (error) {
    console.error('Error handling storage change:', error);
  }
});

/**
 * Update badges for all tabs
 */
async function updateAllBadges() {
  try {
    if (!isEnabled) {
      // Clear all badges if extension is disabled
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        updateBadge(tab.id, 0);
      }
    } else {
      // Restore badges for active tabs
      for (const [tabId, userCount] of tabUserCounts.entries()) {
        updateBadge(tabId, userCount);
      }
    }
  } catch (error) {
    console.error('Error updating all badges:', error);
  }
}

/**
 * Get extension enabled status
 */
async function getExtensionStatus() {
  try {
    const result = await chrome.storage.sync.get('ohey_enabled');
    return result.ohey_enabled !== false; // Default to true
  } catch (error) {
    console.error('Error getting extension status:', error);
    return true;
  }
}

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  try {
    console.log('OHey extension started');

    // Initialize state
    tabUserCounts.clear();

    // Load current settings
    loadExtensionState();

  } catch (error) {
    console.error('Error in onStartup handler:', error);
  }
});

/**
 * Load extension state on startup
 */
async function loadExtensionState() {
  try {
    isEnabled = await getExtensionStatus();
    console.log('Extension state loaded:', { isEnabled });
  } catch (error) {
    console.error('Error loading extension state:', error);
  }
}

/**
 * Handle context menu (if we want to add one later)
 */
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.contextMenus.create({
//     id: 'ohey-toggle',
//     title: 'Toggle OHey',
//     contexts: ['page']
//   });
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === 'ohey-toggle') {
//     // Toggle extension for current site
//   }
// });

/**
 * Handle extension suspend (when service worker goes inactive)
 */
chrome.runtime.onSuspend.addListener(() => {
  try {
    console.log('OHey service worker suspending');

    // Clean up any resources if needed
    // Service worker will be reactivated when needed

  } catch (error) {
    console.error('Error in onSuspend handler:', error);
  }
});

/**
 * Periodic cleanup (optional - runs when service worker is active)
 */
function performCleanup() {
  try {
    // Clean up old tab data
    const currentTime = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Could add cleanup logic here if we store timestamped data

    console.log('Background cleanup performed');
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

// Run cleanup occasionally (when service worker is active)
// Note: Service workers have limited execution time
setInterval(performCleanup, 60 * 60 * 1000); // Every hour

/**
 * Initialize background script
 */
async function initializeBackground() {
  try {
    console.log('OHey background script initializing...');

    await loadExtensionState();

    console.log('OHey background script initialized successfully');
  } catch (error) {
    console.error('Error initializing background script:', error);
  }
}

// Initialize when script loads
initializeBackground();