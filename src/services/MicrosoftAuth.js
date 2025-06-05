/**
 * MicrosoftAuth.js - Updated to use implicit flow (no callback needed)
 * Replace your existing realMicrosoftAuth method with this
 */
import { Platform } from 'react-native';

class MicrosoftAuth {
  static instance;
  
  constructor() {
    // Azure AD Configuration
    this.config = {
      tenantId: 'cc099856-d092-4bf8-bf4b-10b37b156601',
      clientId: '003bb526-011c-4e8e-9e1f-693a54540f0f',
      requiredGroup: 'MedRec',
      scopes: [
        'openid',
        'profile',
        'email',
        'User.Read',
        'GroupMember.Read.All'
      ]
    };
    
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.listeners = [];
    
    // Initialize - check for existing session
    setTimeout(() => this.checkStoredSession(), 100);
  }
  
  static getInstance() {
    if (!MicrosoftAuth.instance) {
      MicrosoftAuth.instance = new MicrosoftAuth();
    }
    return MicrosoftAuth.instance;
  }

  /**
   * Real Microsoft authentication using implicit flow (no callback needed)
   */
  async realMicrosoftAuth() {
    if (Platform.OS !== 'web') {
      throw new Error('Real Microsoft auth currently only supported on web');
    }
    
    return new Promise((resolve, reject) => {
      // Use implicit flow - tokens returned directly in URL fragment
      const authParams = new URLSearchParams({
        client_id: this.config.clientId,
        response_type: 'id_token token', // Implicit flow
        redirect_uri: window.location.origin, // Redirect back to main app
        scope: this.config.scopes.join(' '),
        response_mode: 'fragment', // Tokens in URL fragment
        prompt: 'select_account',
        nonce: Date.now().toString() // Security nonce
      });
      
      const authUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${authParams}`;
      
      console.log('Opening Microsoft auth popup with implicit flow...');
      
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
      
      // Listen for popup to navigate back to our domain
      const checkPopup = setInterval(async () => {
        try {
          // Check if popup has navigated back to our domain
          if (popup.location && popup.location.origin === window.location.origin) {
            clearInterval(checkPopup);
            
            // Extract tokens from URL fragment
            const urlFragment = popup.location.hash.substring(1); // Remove #
            const params = new URLSearchParams(urlFragment);
            
            const accessToken = params.get('access_token');
            const idToken = params.get('id_token');
            const error = params.get('error');
            const errorDescription = params.get('error_description');
            
            popup.close();
            
            if (error) {
              console.error('OAuth error:', error, errorDescription);
              reject(new Error(errorDescription || error));
              return;
            }
            
            if (!accessToken || !idToken) {
              reject(new Error('No tokens received from Microsoft'));
              return;
            }
            
            console.log('Tokens received successfully');
            
            // Process the authentication
            await this.processTokens(accessToken, idToken, resolve, reject);
          }
        } catch (error) {
          // Cross-origin error is expected while popup is on Microsoft domain
          // We'll keep checking until it returns to our domain
        }
      }, 1000);
      
      // 5 minute timeout
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
        }
        clearInterval(checkPopup);
        reject(new Error('Authentication timeout or cancelled'));
      }, 300000);
    });
  }
  
  /**
   * Process received tokens and get user info
   */
  async processTokens(accessToken, idToken, resolve, reject) {
    try {
      console.log('Processing tokens and fetching user info...');
      
      // Get user profile
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const user = await userResponse.json();
      console.log('User profile received:', user.displayName);
      
      // Get user groups
      console.log('Fetching user groups...');
      const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      let userGroups = [];
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        userGroups = groupsData.value || [];
        console.log('User groups received:', userGroups.length);
      } else {
        console.warn('Failed to fetch user groups, continuing without group info');
      }
      
      // Check if user is in required group
      const userGroupNames = userGroups.map(group => group.displayName);
      const isAuthorized = this.isUserInRequiredGroup(userGroups);
      
      console.log('User groups:', userGroupNames);
      console.log('Is authorized:', isAuthorized);
      
      if (!isAuthorized) {
        resolve({
          success: false,
          error: `Access denied. You must be a member of the '${this.config.requiredGroup}' group to access this application.`,
          user: user
        });
        return;
      }
      
      // Success! Store the session
      this.isAuthenticated = true;
      this.currentUser = user;
      this.userGroups = userGroups;
      this.accessToken = accessToken;
      
      await this.storeSession();
      this.notifyListeners('authenticated');
      
      resolve({
        success: true,
        user: user,
        accessToken: accessToken,
        userGroups: userGroups
      });
      
    } catch (error) {
      console.error('Token processing error:', error);
      reject(new Error(`Failed to process authentication: ${error.message}`));
    }
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
        storedSession = null;
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
      
      this.notifyListeners('unauthenticated');
      return false;
    } catch (error) {
      console.error('Session check error:', error);
      this.notifyListeners('unauthenticated');
      return false;
    }
  }
  
  /**
   * Main authentication method
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