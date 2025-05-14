import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Define the worker source for web
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/legacy/build/pdf.worker.min.js';
}

/**
 * Enhanced PDF Viewer Component
 * Uses canvas to display PDFs and supports taking screenshots for OCR
 */
const PDFViewer = ({
  source,
  style,
  onLoadComplete,
  onPageChanged,
  onError,
  onScreenshot
}) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    // Only run this code in web environment
    if (typeof window !== 'undefined' && window.document) {
      const loadPDF = async () => {
        try {
          setLoading(true);
          
          // Load the PDF document directly using PDF.js (already imported)
          const loadingTask = pdfjs.getDocument(source.uri);
          const pdf = await loadingTask.promise;
          
          // Get the number of pages
          const pageCount = pdf.numPages;
          setNumPages(pageCount);
          
          if (onLoadComplete) {
            onLoadComplete(pageCount);
          }
          
          // Get the first page
          const page = await pdf.getPage(1);
          
          // Render the page to a canvas
          const viewport = page.getViewport({ scale: 1.0 });
          
          // If we have a container reference, create a canvas
          if (containerRef.current) {
            try {
              // Get the DOM node
              const domNode = containerRef.current;
              
              // Clear any existing content
              while (domNode.firstChild) {
                domNode.removeChild(domNode.firstChild);
              }
              
              // Create a canvas element
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              
              // Set dimensions to match viewport
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.border = 'none';
              
              // Add the canvas to the container
              domNode.appendChild(canvas);
              
              // Render the PDF page to the canvas
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;
              
              console.log('PDF page rendered to canvas');
              
              // Set current page
              setCurrentPage(1);
              if (onPageChanged) {
                onPageChanged(1);
              }
              
              // If we need a screenshot capability for OCR
              if (onScreenshot) {
                // Take a screenshot of the canvas
                const imageDataUrl = canvas.toDataURL('image/png');
                console.log('Captured PDF screenshot for OCR');
                onScreenshot(imageDataUrl);
              }
              
              setLoading(false);
              
              // Add page navigation controls if more than one page
              if (pageCount > 1) {
                // Create navigation buttons
                const navContainer = document.createElement('div');
                navContainer.style.position = 'absolute';
                navContainer.style.bottom = '10px';
                navContainer.style.left = '0';
                navContainer.style.right = '0';
                navContainer.style.display = 'flex';
                navContainer.style.justifyContent = 'center';
                navContainer.style.gap = '10px';
                navContainer.style.padding = '5px';
                
                // Previous button
                const prevButton = document.createElement('button');
                prevButton.textContent = 'Prev';
                prevButton.style.padding = '5px 10px';
                prevButton.style.backgroundColor = '#3498db';
                prevButton.style.color = 'white';
                prevButton.style.border = 'none';
                prevButton.style.borderRadius = '4px';
                prevButton.style.cursor = 'pointer';
                prevButton.disabled = true; // Disabled on first page
                
                // Next button
                const nextButton = document.createElement('button');
                nextButton.textContent = 'Next';
                nextButton.style.padding = '5px 10px';
                nextButton.style.backgroundColor = '#3498db';
                nextButton.style.color = 'white';
                nextButton.style.border = 'none';
                nextButton.style.borderRadius = '4px';
                nextButton.style.cursor = 'pointer';
                
                // Page indicator
                const pageIndicator = document.createElement('div');
                pageIndicator.textContent = `Page 1 of ${pageCount}`;
                pageIndicator.style.display = 'flex';
                pageIndicator.style.alignItems = 'center';
                pageIndicator.style.color = '#333';
                
                // Function to change page
                const changePage = async (pageNum) => {
                  try {
                    // Update current page
                    setCurrentPage(pageNum);
                    if (onPageChanged) {
                      onPageChanged(pageNum);
                    }
                    
                    // Update button states
                    prevButton.disabled = pageNum === 1;
                    nextButton.disabled = pageNum === pageCount;
                    
                    // Update page indicator
                    pageIndicator.textContent = `Page ${pageNum} of ${pageCount}`;
                    
                    // Get the page
                    const page = await pdf.getPage(pageNum);
                    
                    // Render the page to canvas
                    const viewport = page.getViewport({ scale: 1.0 });
                    
                    // Update canvas dimensions if needed
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    // Clear canvas
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Render to canvas
                    await page.render({
                      canvasContext: context,
                      viewport: viewport
                    }).promise;
                    
                    // If we need a screenshot for OCR
                    if (onScreenshot) {
                      const imageDataUrl = canvas.toDataURL('image/png');
                      onScreenshot(imageDataUrl, pageNum);
                    }
                  } catch (error) {
                    console.error('Error changing page:', error);
                  }
                };
                
                // Add click handlers
                prevButton.onclick = async () => {
                  if (currentPage > 1) {
                    const newPage = currentPage - 1;
                    await changePage(newPage);
                  }
                };
                
                nextButton.onclick = async () => {
                  if (currentPage < pageCount) {
                    const newPage = currentPage + 1;
                    await changePage(newPage);
                  }
                };
                
                // Add buttons to container
                navContainer.appendChild(prevButton);
                navContainer.appendChild(pageIndicator);
                navContainer.appendChild(nextButton);
                
                // Add container to DOM
                domNode.appendChild(navContainer);
              }
            } catch (error) {
              console.error('Error setting up PDF canvas:', error);
              setLoading(false);
              if (onError) {
                onError(error);
              }
            }
          }
        } catch (error) {
          console.error('Error loading PDF:', error);
          setLoading(false);
          if (onError) {
            onError(error);
          }
        }
      };
      
      loadPDF();
    }
    
    // Return cleanup function
    return () => {
      if (containerRef.current) {
        try {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [source.uri, onLoadComplete, onPageChanged, onError, onScreenshot]);
  
  return (
    <View ref={containerRef} style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    backgroundColor: '#f5f5f7',
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  }
});

export default PDFViewer;
