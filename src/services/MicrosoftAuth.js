/**
 * MicrosoftAuth.js - Simplified: Just check if user is in 'medrec' group
 * Replace your existing src/services/MicrosoftAuth.js with this
 */
import { Platform } from 'react-native';

class MicrosoftAuth {
  static instance;
  
  constructor() {
    // Azure AD Configuration
    this.config = {
      // YOUR REAL AZURE CREDENTIALS
      tenantId: 'cc099856-d092-4bf8-bf4b-10b37b156601',
      clientId: '003bb526-011c-4e8e-9e1f-693a54540f0f',
      
      // SIMPLE: Just one group to check
      requiredGroup: 'medrec',
      
      // Microsoft Graph scopes
      scopes: [
        'openid',
        'profile',
        'email',
        'User.Read',
        'GroupMember.Read.All'
      ]
    };
    
    // Development mode flag - REMOVED MOCK AUTH
    this.isDevelopment = false; // Always use real Microsoft authentication
    
    // State
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.listeners = [];
    
    // Initialize - check for existing session immediately
    setTimeout(() => this.checkStoredSession(), 100); // Small delay to prevent blocking
  }
  
  static getInstance() {
    if (!MicrosoftAuth.instance) {
      MicrosoftAuth.instance = new MicrosoftAuth();
    }
    return MicrosoftAuth.instance;
  }
  
  /**
   * Check for existing authentication session
   */
  async checkStoredSession() {
    try {
      let storedSession;
      
      if (Platform.OS === 'web') {
        storedSession = localStorage.getItem('medrec_microsoft_session');
      } else {
        storedSession = null; // Implement mobile storage as needed
      }
      
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const isExpired = Date.now() - session.timestamp > 24 * 60 * 60 * 1000; // 24 hours
        
        if (!isExpired && session.user && session.accessToken) {
          this.isAuthenticated = true;
          this.currentUser = session.user;
          this.userGroups = session.userGroups || [];
          this.accessToken = session.accessToken;
          
          console.log('Found valid stored session for:', session.user.displayName);
          this.notifyListeners('authenticated');
          return true;
        } else {
          console.log('Stored session expired or invalid, clearing...');
          await this.clearStoredSession();
        }
      } else {
        console.log('No stored session found');
      }
      
      // No valid session found
      this.notifyListeners('unauthenticated');
      return false;
    } catch (error) {
      console.error('Session check error:', error);
      this.notifyListeners('unauthenticated');
      return false;
    }
  }
  
  /**
   * Main authentication method - Real Microsoft auth only
   */
  async authenticate() {
    try {
      this.notifyListeners('authenticating');
      return await this.realMicrosoftAuth();
    } catch (error) {
      console.error('Authentication error:', error);
      this.notifyListeners('error');
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Real Microsoft authentication using popup
   */
  async realMicrosoftAuth() {
    if (Platform.OS !== 'web') {
      throw new Error('Real Microsoft auth currently only supported on web');
    }
    
    return new Promise((resolve, reject) => {
      // Construct Microsoft OAuth2 URL
      const authParams = new URLSearchParams({
        client_id: this.config.clientId,
        response_type: 'code',
        redirect_uri: window.location.origin + '/auth/callback',
        scope: this.config.scopes.join(' '),
        response_mode: 'query',
        prompt: 'select_account'
      });
      
      const authUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${authParams}`;
      
      console.log('Opening Microsoft auth popup...');
      console.log('Auth URL:', authUrl);
      
      // Open popup window
      const popup = window.open(
        authUrl,
        'microsoftAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }
      
      // Listen for popup completion
      const checkClosed = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(checkClosed);
            
            // For now, we need to implement proper OAuth callback handling
            // This is a placeholder that will need to be completed with:
            // 1. A proper callback handler at /auth/callback
            // 2. Code to exchange authorization code for tokens
            // 3. API calls to get user profile and groups
            
            console.log('Popup closed - need to implement callback handling');
            
            // Temporary error for now
            reject(new Error('OAuth callback handling not yet implemented. Please implement the /auth/callback endpoint.'));
          }
        } catch (error) {
          clearInterval(checkClosed);
          reject(error);
        }
      }, 1000);
      
      // 5 minute timeout
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
        }
        clearInterval(checkClosed);
        reject(new Error('Authentication timeout or cancelled'));
      }, 300000);
    });
  }
  
  /**
   * Simple group check - is user in the required group?
   */
  isUserInRequiredGroup(userGroups) {
    return userGroups.some(group => 
      group.displayName === this.config.requiredGroup
    );
  }
  
  /**
   * Store authentication session
   */
  async storeSession() {
    try {
      const sessionData = {
        user: this.currentUser,
        userGroups: this.userGroups,
        accessToken: this.accessToken,
        timestamp: Date.now()
      };
      
      if (Platform.OS === 'web') {
        localStorage.setItem('medrec_microsoft_session', JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('Session storage error:', error);
    }
  }
  
  /**
   * Clear stored session
   */
  async clearStoredSession() {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('medrec_microsoft_session');
      }
    } catch (error) {
      console.error('Session clear error:', error);
    }
  }
  
  /**
   * Logout
   */
  async logout() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    
    await this.clearStoredSession();
    this.notifyListeners('unauthenticated');
  }
  
  /**
   * Utility methods
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  getIsAuthenticated() {
    return this.isAuthenticated;
  }
  
  getUserGroups() {
    return this.userGroups;
  }
  
  getAccessToken() {
    return this.accessToken;
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status, this.currentUser);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

export default MicrosoftAuth;