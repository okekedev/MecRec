import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { isWeb } from '../utils/platform';

const WebPDFViewer = ({
  source,
  style,
  onLoadComplete,
  onPageChanged,
  onError,
}) => {
  const containerRef = useRef(null);
  // Use any type to avoid DOM-specific types
  const iframeRef = useRef(null);

  useEffect(() => {
    // Only run this code in web environment
    if (isWeb && typeof window !== 'undefined' && window.document) {
      // Simplified approach for web PDF viewing
      
      // Simulate loading
      setTimeout(() => {
        if (onLoadComplete) {
          onLoadComplete(5); // Simulate 5 pages
        }
        
        if (onPageChanged) {
          onPageChanged(1);
        }
      }, 1000);
      
      // If we have a container reference, try to attach an iframe
      if (containerRef.current) {
        try {
          // Get the DOM node
          const domNode = containerRef.current;
          
          // Create an iframe
          const iframe = document.createElement('iframe');
          iframe.src = source.uri;
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          
          // Clear any existing content
          while (domNode.firstChild) {
            domNode.removeChild(domNode.firstChild);
          }
          
          // Add the iframe directly to the container
          domNode.appendChild(iframe);
          iframeRef.current = iframe;
          
          // Success message
          console.log('PDF iframe added to container');
        } catch (error) {
          console.error('Error setting up PDF iframe:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    }
    
    // Return cleanup function
    return () => {
      if (containerRef.current && iframeRef.current) {
        try {
          containerRef.current.removeChild(iframeRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [source.uri, onLoadComplete, onPageChanged, onError]);

  return (
    <View ref={containerRef} style={[styles.container, style]} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default WebPDFViewer;