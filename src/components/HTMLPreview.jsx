import { useEffect, useRef, useState } from 'react';
import { validateAndFixHTML } from '../utils/htmlUtils';
import './HTMLPreview.css';

function HTMLPreview({ htmlContent }) {
  const iframeRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      try {
        // Validate and fix HTML before rendering
        const fixedHTML = validateAndFixHTML(htmlContent);
        
        if (fixedHTML) {
          doc.open();
          doc.write(fixedHTML);
          doc.close();
        } else {
          console.warn('Invalid or incomplete HTML content');
        }
      } catch (error) {
        console.error('Error rendering HTML:', error);
      }
    }
  }, [htmlContent, refreshKey]);

  return (
    <div className="html-preview">
      <div className="preview-header">
        <h3>HTML Preview</h3>
        <div className="preview-header-actions">
          {htmlContent && (
            <button 
              className="refresh-button"
              onClick={handleRefresh}
              title="Refresh preview"
            >
              Refresh
            </button>
          )}
          {htmlContent && (
            <span className="preview-status">Live Preview</span>
          )}
        </div>
      </div>
      <div className="preview-content">
        {htmlContent ? (
          <iframe
            ref={iframeRef}
            title="HTML Preview"
            className="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="preview-empty">
            <p>No HTML content to preview</p>
            <p className="preview-hint">HTML blocks from the chat will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HTMLPreview;
