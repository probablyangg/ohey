/**
 * Wildcard Pattern Matching Utility Functions
 * Handles URL pattern matching for blocked sites in ChatBrowse extension
 */

/**
 * Convert wildcard pattern to regular expression
 * @param {string} pattern - Wildcard pattern with * as wildcards
 * @returns {RegExp} Regular expression for matching
 */
function patternToRegex(pattern) {
  // Escape special regex characters except *
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*/g, '.*');                   // Convert * to .*
  
  return new RegExp(`^${escaped}$`, 'i'); // Case insensitive matching
}

/**
 * Check if URL matches a wildcard pattern
 * @param {string} url - URL to check
 * @param {string} pattern - Wildcard pattern
 * @returns {boolean} True if URL matches pattern
 */
function matchesPattern(url, pattern) {
  try {
    if (!url || !pattern) {
      return false;
    }
    
    // Normalize URLs by removing protocol and trailing slashes
    const normalizedUrl = url
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/\/$/, '');          // Remove trailing slash
    
    const normalizedPattern = pattern
      .replace(/^https?:\/\//, '')  // Remove protocol from pattern
      .replace(/\/$/, '');          // Remove trailing slash
    
    const regex = patternToRegex(normalizedPattern);
    return regex.test(normalizedUrl);
  } catch (error) {
    console.error('Error matching pattern:', error);
    return false;
  }
}

/**
 * Check if URL is blocked by any of the provided patterns
 * @param {string} url - URL to check
 * @param {string[]} patterns - Array of wildcard patterns
 * @returns {boolean} True if URL matches any blocked pattern
 */
function isBlocked(url, patterns) {
  try {
    if (!url || !Array.isArray(patterns) || patterns.length === 0) {
      return false;
    }
    
    return patterns.some(pattern => matchesPattern(url, pattern));
  } catch (error) {
    console.error('Error checking if URL is blocked:', error);
    return false;
  }
}

/**
 * Validate if a wildcard pattern is syntactically correct
 * @param {string} pattern - Pattern to validate
 * @returns {boolean} True if pattern is valid
 */
function validatePattern(pattern) {
  try {
    if (!pattern || typeof pattern !== 'string') {
      return false;
    }
    
    // Check for empty pattern
    if (pattern.trim().length === 0) {
      return false;
    }
    
    // Check for consecutive asterisks (simplified - could be more strict)
    if (pattern.includes('**')) {
      return false;
    }
    
    // Check for invalid characters that might break regex
    const invalidChars = /[<>"|\\]/;
    if (invalidChars.test(pattern)) {
      return false;
    }
    
    // Test if pattern can be converted to regex without errors
    try {
      patternToRegex(pattern);
      return true;
    } catch (regexError) {
      return false;
    }
  } catch (error) {
    console.error('Error validating pattern:', error);
    return false;
  }
}

/**
 * Suggest a wildcard pattern for blocking similar URLs
 * @param {string} url - URL to base pattern suggestion on
 * @returns {string} Suggested wildcard pattern
 */
function suggestPattern(url) {
  try {
    if (!url) {
      return '';
    }
    
    // Parse URL to extract components
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      // If URL parsing fails, treat as hostname
      return `*${url}*`;
    }
    
    const hostname = parsedUrl.hostname;
    const pathname = parsedUrl.pathname;
    
    // Different suggestion strategies based on URL structure
    
    // For subdomains, suggest blocking all subdomains
    if (hostname.includes('.')) {
      const domainParts = hostname.split('.');
      if (domainParts.length > 2) {
        // Has subdomain, suggest wildcard for all subdomains
        const mainDomain = domainParts.slice(-2).join('.');
        return `*.${mainDomain}`;
      }
    }
    
    // For paths with multiple segments, suggest blocking the directory
    if (pathname && pathname !== '/' && pathname.split('/').length > 2) {
      const pathParts = pathname.split('/');
      const basePath = pathParts.slice(0, 2).join('/');
      return `${hostname}${basePath}/*`;
    }
    
    // Default: block entire domain
    return `${hostname}*`;
  } catch (error) {
    console.error('Error suggesting pattern:', error);
    return '';
  }
}

/**
 * Get pattern matching examples for UI display
 * @returns {Object[]} Array of example patterns with descriptions
 */
function getPatternExamples() {
  return [
    {
      pattern: '*.reddit.com',
      description: 'Block all Reddit subdomains',
      examples: ['www.reddit.com', 'old.reddit.com', 'np.reddit.com']
    },
    {
      pattern: '*banking*',
      description: 'Block any URL containing "banking"',
      examples: ['mybank.com/banking', 'secure-banking.net', 'banking.example.com']
    },
    {
      pattern: 'company.com/internal/*',
      description: 'Block specific path patterns',
      examples: ['company.com/internal/docs', 'company.com/internal/admin']
    },
    {
      pattern: 'localhost:*',
      description: 'Block localhost with any port',
      examples: ['localhost:3000', 'localhost:8080', 'localhost:9000']
    },
    {
      pattern: '*.social*',
      description: 'Block social media sites',
      examples: ['facebook.com', 'twitter.com', 'instagram.com']
    }
  ];
}

/**
 * Test multiple URLs against a pattern (for debugging/testing)
 * @param {string} pattern - Pattern to test
 * @param {string[]} urls - URLs to test against
 * @returns {Object} Results object with matches and non-matches
 */
function testPattern(pattern, urls) {
  const results = {
    pattern,
    matches: [],
    nonMatches: [],
    isValid: validatePattern(pattern)
  };
  
  if (!results.isValid) {
    return results;
  }
  
  urls.forEach(url => {
    if (matchesPattern(url, pattern)) {
      results.matches.push(url);
    } else {
      results.nonMatches.push(url);
    }
  });
  
  return results;
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    matchesPattern,
    isBlocked,
    validatePattern,
    suggestPattern,
    getPatternExamples,
    testPattern
  };
} else {
  // Browser environment - make functions globally available
  window.ChatBrowsePatterns = {
    matchesPattern,
    isBlocked,
    validatePattern,
    suggestPattern,
    getPatternExamples,
    testPattern
  };
}