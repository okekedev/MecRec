import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface WebPDFViewerProps {
  source: { uri: string };
  style?: any;
  onLoadComplete?: (numberOfPages: number) => void;
  onPageChanged?: (page: number) => void;
  onError?: (error: Error) => void;
}

const WebPDFViewer: React.FC<WebPDFViewerProps> = ({
  source,
  style,
  onLoadComplete,
  onPageChanged,
  onError,
}) => {
  const containerRef = useRef<View>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Create an iframe to embed the PDF
      const iframe = document.createElement('iframe');
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
      iframe.onerror = (e) => {
        if (onError) {
          onError(new Error('Failed to load PDF'));
        }
      };
      
      // Append the iframe to the container
      if (containerRef.current) {
        const nativeElement = containerRef.current as any;
        if (nativeElement._reactInternalInstance) {
          const domNode = nativeElement._reactInternalInstance.stateNode;
          if (domNode) {
            domNode.appendChild(iframe);
            iframeRef.current = iframe;
          }
        }
      }
      
      // Clean up
      return () => {
        if (iframeRef.current && iframeRef.current.parentNode) {
          iframeRef.current.parentNode.removeChild(iframeRef.current);
        }
      };
    }
  }, [source.uri]);

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