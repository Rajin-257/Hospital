/**
 * Automatic Token Refresh System
 * Handles client-side token refresh before expiry
 */

class TokenRefreshManager {
  constructor() {
    this.refreshInterval = null;
    this.refreshThreshold = 10 * 60 * 1000; // 10 minutes before expiry
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.isRefreshing = false;
    this.failedRefreshAttempts = 0;
    this.maxFailedAttempts = 3;
    
    this.init();
  }

  init() {
    // Start the periodic token check
    this.startTokenCheck();
    
    // Listen for visibility change to refresh when tab becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkTokenExpiry();
      }
    });

    // Listen for focus events to refresh when window gets focus
    window.addEventListener('focus', () => {
      this.checkTokenExpiry();
    });

    console.log('Token refresh manager initialized');
  }

  startTokenCheck() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Start checking token expiry periodically
    this.refreshInterval = setInterval(() => {
      this.checkTokenExpiry();
    }, this.checkInterval);
  }

  async checkTokenExpiry() {
    if (this.isRefreshing) {
      return; // Already refreshing
    }

    try {
      // Get token expiry from server
      const response = await fetch('/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshToken();
      } else if (response.ok) {
        // Reset failed attempts on successful request
        this.failedRefreshAttempts = 0;
        
        // Check if we need to refresh soon
        // Note: Since tokens are httpOnly cookies, we can't directly check expiry
        // We rely on the server-side middleware to handle automatic refresh
        console.log('Token is valid');
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
    }
  }

  async refreshToken() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      const response = await fetch('/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Token refreshed successfully:', data.message);
        this.failedRefreshAttempts = 0;
        
        // Show success notification (optional)
        this.showNotification('Session refreshed automatically', 'success');
      } else {
        throw new Error(`Refresh failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.failedRefreshAttempts++;
      
      if (this.failedRefreshAttempts >= this.maxFailedAttempts) {
        console.error('Max refresh attempts reached, redirecting to login');
        this.redirectToLogin();
      } else {
        // Show warning notification
        this.showNotification(`Session refresh failed (${this.failedRefreshAttempts}/${this.maxFailedAttempts})`, 'warning');
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  redirectToLogin() {
    // Stop checking tokens
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Show logout notification
    this.showNotification('Session expired, redirecting to login...', 'error');
    
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = '/login?timeout=true';
    }, 2000);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `session-notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${this.getIconForType(type)} me-2"></i>
      ${message}
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Auto hide after 3 seconds (except for errors)
    const hideDelay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, hideDelay);
    
    // Also log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  getIconForType(type) {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  }

  // Public method to manually trigger refresh
  async manualRefresh() {
    this.showNotification('Refreshing session...', 'info');
    await this.refreshToken();
  }

  // Public method to stop the refresh manager
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    console.log('Token refresh manager stopped');
  }

  // Public method to get status
  getStatus() {
    return {
      isRefreshing: this.isRefreshing,
      failedAttempts: this.failedRefreshAttempts,
      maxAttempts: this.maxFailedAttempts,
      intervalRunning: !!this.refreshInterval
    };
  }
}

// Global toast function for other scripts to use
window.showToast = function(message, type = 'info') {
  if (window.tokenRefreshManager) {
    window.tokenRefreshManager.showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};

// Initialize token refresh manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on pages that require authentication
  // Skip login page and other public pages
  if (!window.location.pathname.includes('/login')) {
    window.tokenRefreshManager = new TokenRefreshManager();
    
    // Add manual refresh button to navbar if admin
    if (window.location.pathname.includes('/settings') || 
        window.location.pathname.includes('/dashboard')) {
      setTimeout(() => {
        addManualRefreshButton();
      }, 1000);
    }
  }
});

// Add manual refresh button for admin users
function addManualRefreshButton() {
  const navbar = document.querySelector('.navbar-nav');
  if (navbar && !document.getElementById('manual-refresh-btn')) {
    const refreshItem = document.createElement('li');
    refreshItem.className = 'nav-item';
    refreshItem.innerHTML = `
      <button id="manual-refresh-btn" class="btn btn-outline-light btn-sm me-2" 
              onclick="window.tokenRefreshManager.manualRefresh()" 
              title="Refresh Session">
        <i class="fas fa-sync-alt"></i>
      </button>
    `;
    navbar.insertBefore(refreshItem, navbar.firstChild);
  }
}

// Make it available globally for manual control
window.TokenRefreshManager = TokenRefreshManager; 