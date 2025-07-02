/**
 * MicrosoftAuth.js - Authorization Code Flow with PKCE (Microsoft Recommended)
 */
import { Platform } from 'react-native';

class MicrosoftAuth {
  static instance;
  
  constructor() {
    // Azure AD Configuration - Using EXPO_PUBLIC_ variables
    this.config = {
      tenantId: process.env.EXPO_PUBLIC_AZURE_TENANT_ID,
      clientId: process.env.EXPO_PUBLIC_AZURE_CLIENT_ID,
      requiredGroup: process.env.EXPO_PUBLIC_AZURE_REQUIRED_GROUP,
      scopes: [
        'openid',
        'profile',
        'email',
        'User.Read',
        'GroupMember.Read.All'
      ]
    };

    // Validate configuration and provide helpful error messages
    this.validateConfig();
    
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.listeners = [];
    
    // Auto-logout configuration
    this.sessionTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
    this.warningTimeout = 13 * 60 * 1000; // 13 minutes - show warning 2 minutes before logout
    this.sessionTimer = null;
    this.warningTimer = null;
    this.lastActivityTime = Date.now();
    
    // Initialize - check for existing session
    setTimeout(() => this.checkStoredSession(), 100);
    
    // Set up activity tracking for auto-logout
    this.setupActivityTracking();
  }

  /**
   * Validate configuration and provide helpful error messages
   */
  validateConfig() {
    const requiredVars = [
      { name: 'EXPO_PUBLIC_AZURE_TENANT_ID', value: this.config.tenantId },
      { name: 'EXPO_PUBLIC_AZURE_CLIENT_ID', value: this.config.clientId },
      { name: 'EXPO_PUBLIC_AZURE_REQUIRED_GROUP', value: this.config.requiredGroup }
    ];

    const missing = requiredVars.filter(v => !v.value);
    
    if (missing.length > 0) {
      console.error('❌ MicrosoftAuth Configuration Error:');
      console.error('Missing required Azure AD environment variables:');
      missing.forEach(v => console.error(`  - ${v.name}`));
      console.error('');
      console.error('Setup Instructions:');
      console.error('  1. Create a .env file in your project root');
      console.error('  2. Add the following variables:');
      console.error('     EXPO_PUBLIC_AZURE_TENANT_ID=your-tenant-id');
      console.error('     EXPO_PUBLIC_AZURE_CLIENT_ID=your-client-id');
      console.error('     EXPO_PUBLIC_AZURE_REQUIRED_GROUP=your-group-name');
      console.error('  3. Restart your development server');
      console.error('');
      console.error('For production deployment, set these as environment variables.');
      throw new Error('Missing required Azure AD configuration. Please check environment variables.');
    } else {
      console.log('✅ MicrosoftAuth Configuration:');
      console.log(`📱 Tenant ID: ${this.config.tenantId.substring(0, 8)}...`);
      console.log(`🔑 Client ID: ${this.config.clientId.substring(0, 8)}...`);
      console.log(`👥 Required Group: ${this.config.requiredGroup}`);
    }
  }
  
  static getInstance() {
    if (!MicrosoftAuth.instance) {
      MicrosoftAuth.instance = new MicrosoftAuth();
    }
    return MicrosoftAuth.instance;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  async generatePKCE() {
    // Generate code verifier (43-128 characters)
    const codeVerifier = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));
    
    // Generate code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    const hash = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = this.base64URLEncode(new Uint8Array(hash));
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Base64 URL encode
   */
  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Set up activity tracking for auto-logout
   */
  setupActivityTracking() {
    if (Platform.OS !== 'web') return;
    
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetActivityTimer = () => {
      this.lastActivityTime = Date.now();
      this.resetSessionTimers();
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivityTimer, true);
    });
  }

  /**
   * Reset session timers when user is active
   */
  resetSessionTimers() {
    if (!this.isAuthenticated) return;
    
    // Clear existing timers
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    // Set warning timer (13 minutes)
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, this.warningTimeout);
    
    // Set auto-logout timer (15 minutes)
    this.sessionTimer = setTimeout(() => {
      this.autoLogout();
    }, this.sessionTimeout);
  }

  /**
   * Show session expiry warning
   */
  showSessionWarning() {
    console.log('⚠️ Session expiring in 2 minutes...');
    this.notifyListeners('session_warning', {
      message: 'Your session will expire in 2 minutes due to inactivity.',
      timeRemaining: 2 * 60 * 1000 // 2 minutes in ms
    });
  }

  /**
   * Auto-logout due to inactivity
   */
  async autoLogout() {
    console.log('🔒 Auto-logout triggered due to inactivity');
    this.notifyListeners('session_expired', {
      message: 'You have been logged out due to 15 minutes of inactivity.',
      reason: 'inactivity'
    });
    
    await this.logout();
  }

  /**
   * Manual logout (from logout button)
   */
  async manualLogout() {
    console.log('🔒 Manual logout triggered');
    
    // Clear timers first
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    // Clear auth state
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.lastActivityTime = 0;
    
    // Clear stored session
    await this.clearStoredSession();
    
    // Notify listeners
    this.notifyListeners('manual_logout', {
      message: 'You have been logged out.',
      reason: 'manual'
    });
    
    console.log('✅ Manual logout completed');
  }

  /**
   * Microsoft authentication using Authorization Code Flow with PKCE
   */
  async realMicrosoftAuth() {
    if (Platform.OS !== 'web') {
      throw new Error('Microsoft auth currently only supported on web');
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🚀 Starting Microsoft authentication with PKCE...');
        
        // Generate PKCE parameters
        const { codeVerifier, codeChallenge } = await this.generatePKCE();
        
        // Store code verifier for later use
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);
        
        // Generate state for security
        const state = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
        sessionStorage.setItem('auth_state', state);
        
        // Use Authorization Code flow with PKCE
        const authParams = new URLSearchParams({
          client_id: this.config.clientId,
          response_type: 'code',
          redirect_uri: window.location.origin,
          scope: this.config.scopes.join(' '),
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          prompt: 'select_account'
        });
        
        const authUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${authParams}`;
        
        console.log('🔗 Opening Microsoft auth popup with Authorization Code flow + PKCE...');
        
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
              
              // Extract authorization code from URL
              const urlParams = new URLSearchParams(popup.location.search);
              const code = urlParams.get('code');
              const returnedState = urlParams.get('state');
              const error = urlParams.get('error');
              const errorDescription = urlParams.get('error_description');
              
              popup.close();
              
              if (error) {
                console.error('❌ OAuth error:', error, errorDescription);
                reject(new Error(errorDescription || error));
                return;
              }
              
              // Verify state parameter
              const storedState = sessionStorage.getItem('auth_state');
              if (returnedState !== storedState) {
                reject(new Error('Invalid state parameter - possible CSRF attack'));
                return;
              }
              
              if (!code) {
                reject(new Error('No authorization code received from Microsoft'));
                return;
              }
              
              console.log('✅ Authorization code received successfully');
              
              // Exchange code for tokens
              await this.exchangeCodeForTokens(code, codeVerifier, resolve, reject);
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
          reject(new Error('Authentication timeout'));
        }, 300000);
        
      } catch (error) {
        console.error('❌ Authentication error:', error);
        reject(new Error(`Authentication failed: ${error.message}`));
      }
    });
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code, codeVerifier, resolve, reject) {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');
      
      const tokenParams = new URLSearchParams({
        client_id: this.config.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: window.location.origin,
        code_verifier: codeVerifier
      });
      
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: tokenParams
        }
      );
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('❌ Token exchange failed:', errorData);
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }
      
      const tokens = await tokenResponse.json();
      console.log('✅ Tokens received successfully');
      
      // Clean up session storage
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('auth_state');
      
      // Process the tokens
      await this.processTokens(tokens.access_token, tokens.id_token, resolve, reject);
      
    } catch (error) {
      console.error('❌ Token exchange error:', error);
      reject(new Error(`Failed to exchange code for tokens: ${error.message}`));
    }
  }
  
  /**
   * Process received tokens and get user info
   */
  async processTokens(accessToken, idToken, resolve, reject) {
    try {
      console.log('👤 Processing tokens and fetching user info...');
      
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
      console.log('✅ User profile received:', user.displayName);
      
      // Get user groups
      console.log('👥 Fetching user groups...');
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
        console.log('✅ User groups received:', userGroups.length);
      } else {
        console.warn('⚠️ Failed to fetch user groups, continuing without group info');
      }
      
      // Check if user is in required group
      const userGroupNames = userGroups.map(group => group.displayName);
      const isAuthorized = this.isUserInRequiredGroup(userGroups);
      
      console.log('📋 User groups:', userGroupNames);
      console.log('🔐 Is authorized:', isAuthorized);
      
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
      this.lastActivityTime = Date.now();
      
      await this.storeSession();
      
      // Start session timers
      this.resetSessionTimers();
      
      this.notifyListeners('authenticated');
      
      resolve({
        success: true,
        user: user,
        accessToken: accessToken,
        userGroups: userGroups
      });
      
    } catch (error) {
      console.error('❌ Token processing error:', error);
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
          this.lastActivityTime = Date.now();
          
          console.log('✅ Found valid stored session for:', session.user.displayName);
          
          // Start session timers for existing session
          this.resetSessionTimers();
          
          this.notifyListeners('authenticated');
          return true;
        } else {
          console.log('⚠️ Stored session expired or invalid, clearing...');
          await this.clearStoredSession();
        }
      } else {
        console.log('ℹ️ No stored session found');
      }
      
      this.notifyListeners('unauthenticated');
      return false;
    } catch (error) {
      console.error('❌ Session check error:', error);
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
      console.error('❌ Authentication error:', error);
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
      console.error('❌ Session storage error:', error);
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
      console.error('❌ Session clear error:', error);
    }
  }
  
  /**
   * Logout (handles both auto and manual logout)
   */
  async logout() {
    // Clear timers
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.lastActivityTime = 0;
    
    await this.clearStoredSession();
    this.notifyListeners('unauthenticated');
  }
  
  /**
   * Get session time remaining
   */
  getSessionTimeRemaining() {
    if (!this.isAuthenticated) return 0;
    
    const elapsed = Date.now() - this.lastActivityTime;
    const remaining = Math.max(0, this.sessionTimeout - elapsed);
    return remaining;
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
  
  notifyListeners(status, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(status, data || this.currentUser);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }
}

export default MicrosoftAuth;