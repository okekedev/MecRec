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
    if (isWeb) {
      // Use a function to isolate DOM operations
      const setupIframe = () => {
        // Safely access document through the window global
        if (typeof window !== 'undefined' && window.document) {
          // Create an iframe to embed the PDF
          const iframe = window.document.createElement('iframe');
          iframe.src = source.uri;
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          
          // Simulate page count (real implementation would extract from the PDF)
          if (onLoadComplete) {
            // Simulating 5 pages
            setTimeout(() => onLoadComplete(5), 1000);
          }
          
          // Add load event listener
          iframe.onload = () => {
            if (onLoadComplete) {
              // Simulating 5 pages
              onLoadComplete(5);
            }
          };
          
          // Add error event listener
          iframe.onerror = () => {
            if (onError) {
              onError(new Error('Failed to load PDF'));
            }
          };
          
          // Append the iframe to the container
          if (containerRef.current) {
            // Use a safer approach to get the DOM node
            const domNode = containerRef.current;
            
            // Create a div container for the PDF
            const container = window.document.createElement('div');
            container.id = 'pdf-container';
            container.style.width = '100%';
            container.style.height = '100%';
            container.appendChild(iframe);
            
            // React Native Web will render View as a div
            // Find a way to attach our content to it
            if (domNode._reactInternals && domNode.appendChild) {
              domNode.appendChild(container);
              iframeRef.current = iframe;
            } else {
              // Alternative approach if the above doesn't work
              const div = window.document.getElementById('pdf-container');
              if (div) {
                div.appendChild(iframe);
                iframeRef.current = iframe;
              } else {
                console.warn('Could not find container for PDF viewer');
              }
            }
          }
          
          // Return cleanup function
          return () => {
            if (iframeRef.current) {
              const container = window.document.getElementById('pdf-container');
              if (container && container.contains(iframeRef.current)) {
                container.removeChild(iframeRef.current);
              }
            }
          };
        }
      };
      
      return setupIframe();
    }
    
    // Return empty cleanup function for non-web platforms
    return () => {};
  }, [source.uri, onLoadComplete, onError]);

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