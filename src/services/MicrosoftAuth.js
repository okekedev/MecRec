/**
 * Enhanced MicrosoftAuth.js - Proper admin consent handling
 */
import { Platform } from 'react-native';

class MicrosoftAuth {
  static instance;
  
  constructor() {
    // Azure AD Configuration
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

    this.validateConfig();
    
    this.isAuthenticated = false;
    this.currentUser = null;
    this.userGroups = [];
    this.accessToken = null;
    this.listeners = [];
    
    // Auto-logout configuration
    this.sessionTimeout = 15 * 60 * 1000;
    this.warningTimeout = 13 * 60 * 1000;
    this.sessionTimer = null;
    this.warningTimer = null;
    this.lastActivityTime = Date.now();
    
    setTimeout(() => this.checkStoredSession(), 100);
    this.setupActivityTracking();
  }

  /**
   * Enhanced authentication with proper admin consent handling
   */
  async authenticate() {
    try {
      this.notifyListeners('authenticating');
      
      // First, try normal user authentication
      const result = await this.attemptUserAuthentication();
      
      // If user auth fails due to consent issues, try admin consent
      if (!result.success && this.isConsentError(result.error)) {
        console.log('🔐 User authentication failed - attempting admin consent flow');
        return await this.attemptAdminConsent();
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.notifyListeners('error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Attempt normal user authentication first
   */
  async attemptUserAuthentication() {
    try {
      console.log('👤 Attempting user authentication...');
      return await this.performAuthentication('select_account');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Attempt admin consent flow
   */
  async attemptAdminConsent() {
    try {
      console.log('🔐 Attempting admin consent flow...');
      
      // Show user-friendly message about admin consent
      const shouldProceed = await this.showAdminConsentDialog();
      if (!shouldProceed) {
        return { success: false, error: 'Admin consent declined by user' };
      }
      
      return await this.performAdminConsent();
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Show user-friendly dialog explaining admin consent
   */
  async showAdminConsentDialog() {
    return new Promise((resolve) => {
      // Create a modal-like dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      dialog.innerHTML = `
        <div style="
          background: white;
          padding: 32px;
          border-radius: 12px;
          max-width: 480px;
          margin: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              width: 64px;
              height: 64px;
              background: #0078d4;
              border-radius: 32px;
              margin: 0 auto 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
            ">🔐</div>
            <h2 style="margin: 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">
              Administrator Permission Required
            </h2>
          </div>
          
          <p style="color: #666; line-height: 1.5; margin-bottom: 20px;">
            This application requires administrator approval to access your organization's 
            directory information. This is a one-time setup that allows the app to verify 
            group memberships for security purposes.
          </p>
          
          <div style="
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          ">
            <strong style="color: #495057;">What this grants:</strong>
            <ul style="margin: 8px 0 0 20px; color: #666;">
              <li>Read your basic profile information</li>
              <li>Verify your group membership</li>
              <li>Allow sign-in to this application</li>
            </ul>
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelConsent" style="
              background: #f8f9fa;
              border: 1px solid #d0d7de;
              color: #656d76;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Cancel</button>
            <button id="proceedConsent" style="
              background: #0078d4;
              border: 1px solid #0078d4;
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Continue to Admin Consent</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      dialog.querySelector('#cancelConsent').onclick = () => {
        document.body.removeChild(dialog);
        resolve(false);
      };
      
      dialog.querySelector('#proceedConsent').onclick = () => {
        document.body.removeChild(dialog);
        resolve(true);
      };
      
      // Close on outside click
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
          resolve(false);
        }
      };
    });
  }

  /**
   * Perform admin consent flow
   */
  async performAdminConsent() {
    return new Promise(async (resolve, reject) => {
      try {
        const state = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
        sessionStorage.setItem('admin_consent_state', state);
        
        // Build admin consent URL
        const consentParams = new URLSearchParams({
          client_id: this.config.clientId,
          redirect_uri: window.location.origin,
          state: state,
        });
        
        const consentUrl = `https://login.microsoftonline.com/${this.config.tenantId}/adminconsent?${consentParams}`;
        
        console.log('🔐 Opening admin consent popup...');
        
        const popup = window.open(
          consentUrl,
          'adminConsent',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          reject(new Error('Popup blocked. Please allow popups for this site.'));
          return;
        }
        
        // Monitor the popup
        const checkPopup = setInterval(async () => {
          try {
            if (popup.location && popup.location.origin === window.location.origin) {
              clearInterval(checkPopup);
              
              const urlParams = new URLSearchParams(popup.location.search);
              const returnedState = urlParams.get('state');
              const error = urlParams.get('error');
              const adminConsent = urlParams.get('admin_consent');
              
              popup.close();
              
              // Verify state
              const storedState = sessionStorage.getItem('admin_consent_state');
              sessionStorage.removeItem('admin_consent_state');
              
              if (returnedState !== storedState) {
                reject(new Error('Invalid state parameter'));
                return;
              }
              
              if (error) {
                reject(new Error(`Admin consent error: ${error}`));
                return;
              }
              
              if (adminConsent === 'True') {
                console.log('✅ Admin consent granted! Attempting user authentication...');
                
                // Wait a moment for Azure to propagate the consent
                setTimeout(async () => {
                  try {
                    const authResult = await this.performAuthentication('select_account');
                    resolve(authResult);
                  } catch (authError) {
                    reject(new Error(`Authentication after admin consent failed: ${authError.message}`));
                  }
                }, 2000);
              } else {
                reject(new Error('Admin consent was not granted'));
              }
            }
          } catch (error) {
            // Cross-origin error expected while on Microsoft domain
            if (popup.closed) {
              clearInterval(checkPopup);
              reject(new Error('Admin consent cancelled by user'));
            }
          }
        }, 1000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
          }
          clearInterval(checkPopup);
          reject(new Error('Admin consent timeout'));
        }, 300000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Perform the actual authentication (user or admin)
   */
  async performAuthentication(promptType = 'select_account') {
    return new Promise(async (resolve, reject) => {
      try {
        // Generate PKCE parameters
        const { codeVerifier, codeChallenge } = await this.generatePKCE();
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);
        
        // Generate state
        const state = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
        sessionStorage.setItem('auth_state', state);
        
        // Build auth URL
        const authParams = new URLSearchParams({
          client_id: this.config.clientId,
          response_type: 'code',
          redirect_uri: window.location.origin,
          scope: this.config.scopes.join(' '),
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          prompt: promptType
        });
        
        const authUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${authParams}`;
        
        console.log('🔗 Opening authentication popup...');
        
        const popup = window.open(
          authUrl,
          'microsoftAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          reject(new Error('Popup blocked. Please allow popups for this site.'));
          return;
        }
        
        // Monitor popup for redirect
        const checkPopup = setInterval(async () => {
          try {
            if (popup.location && popup.location.origin === window.location.origin) {
              clearInterval(checkPopup);
              
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
              
              // Verify state
              const storedState = sessionStorage.getItem('auth_state');
              if (returnedState !== storedState) {
                reject(new Error('Invalid state parameter'));
                return;
              }
              
              if (!code) {
                reject(new Error('No authorization code received'));
                return;
              }
              
              // Exchange code for tokens
              await this.exchangeCodeForTokens(code, codeVerifier, resolve, reject);
            }
          } catch (error) {
            // Expected while on Microsoft domain
            if (popup.closed) {
              clearInterval(checkPopup);
              reject(new Error('Authentication cancelled by user'));
            }
          }
        }, 1000);
        
        // Timeout
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
          }
          clearInterval(checkPopup);
          reject(new Error('Authentication timeout'));
        }, 300000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if error is related to consent
   */
  isConsentError(errorMessage) {
    const consentErrors = [
      'AADSTS90036',
      'AADSTS65001',
      'AADSTS90094',
      'admin_consent',
      'consent',
      'permission'
    ];
    
    return consentErrors.some(pattern => 
      errorMessage && errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // ... rest of your existing methods (generatePKCE, exchangeCodeForTokens, etc.) stay the same
  
  async generatePKCE() {
    const codeVerifier = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = this.base64URLEncode(new Uint8Array(hash));
    return { codeVerifier, codeChallenge };
  }

  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Include all your other existing methods here...
  // (validateConfig, exchangeCodeForTokens, processTokens, etc.)
}

export default MicrosoftAuth;