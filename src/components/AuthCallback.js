/**
 * AuthCallback.js - OAuth callback handler component
 * Create this file at: src/components/AuthCallback.js
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Colors, CommonStyles } from '../styles';

const AuthCallback = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('processing');
        
        // Get the current URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          onError(errorDescription || error);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          setStatus('error');
          onError('No authorization code received from Microsoft');
          return;
        }

        console.log('Authorization code received:', code);
        
        // Exchange the code for tokens and get user info
        const result = await exchangeCodeForUserInfo(code);
        
        if (result.success) {
          setStatus('success');
          onSuccess(result.user, result.accessToken, result.userGroups);
        } else {
          setStatus('error');
          onError(result.error);
        }

      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('error');
        onError('Failed to process authentication callback');
      }
    };

    // Only run if we're on the callback page
    if (window.location.pathname === '/auth/callback' || window.location.search.includes('code=')) {
      handleCallback();
    }
  }, [onSuccess, onError]);

  if (status === 'processing') {
    return (
      <View style={CommonStyles.loadingContainer}>
        <View style={CommonStyles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={CommonStyles.loadingText}>Completing Authentication</Text>
          <Text style={CommonStyles.loadingSubtext}>Processing Microsoft login...</Text>
        </View>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={CommonStyles.loadingContainer}>
        <View style={CommonStyles.loadingCard}>
          <Text style={[CommonStyles.loadingText, { color: Colors.success }]}>
            Authentication Successful
          </Text>
          <Text style={CommonStyles.loadingSubtext}>Redirecting to application...</Text>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={CommonStyles.loadingContainer}>
        <View style={CommonStyles.loadingCard}>
          <Text style={[CommonStyles.loadingText, { color: Colors.accent }]}>
            Authentication Failed
          </Text>
          <Text style={CommonStyles.loadingSubtext}>Please try again...</Text>
        </View>
      </View>
    );
  }

  return null;
};

/**
 * Exchange authorization code for tokens and get user information
 */
async function exchangeCodeForUserInfo(code) {
  try {
    // Your Azure AD configuration
    const tenantId = 'cc099856-d092-4bf8-bf4b-10b37b156601';
    const clientId = '003bb526-011c-4e8e-9e1f-693a54540f0f';
    const redirectUri = window.location.origin + '/auth/callback';

    console.log('Exchanging code for tokens...');

    // Step 1: Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      scope: 'openid profile email User.Read GroupMember.Read.All'
    });

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');

    // Step 2: Get user profile
    console.log('Fetching user profile...');
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const user = await userResponse.json();
    console.log('User profile received:', user.displayName);

    // Step 3: Get user groups
    console.log('Fetching user groups...');
    const groupsResponse = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
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

    // Step 4: Check if user is in required group
    const requiredGroup = 'medrec';
    const userGroupNames = userGroups.map(group => group.displayName);
    const isAuthorized = userGroupNames.includes(requiredGroup);

    console.log('User groups:', userGroupNames);
    console.log('Is authorized:', isAuthorized);

    if (!isAuthorized) {
      return {
        success: false,
        error: `Access denied. You must be a member of the '${requiredGroup}' group to access this application.`,
        user: user
      };
    }

    // Success!
    return {
      success: true,
      user: user,
      accessToken: tokens.access_token,
      userGroups: userGroups
    };

  } catch (error) {
    console.error('Exchange code error:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete authentication'
    };
  }
}

export default AuthCallback;