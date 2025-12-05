/**
 * Preview Component
 * 
 * Location: Right pane of the application (when toggled on).
 * Purpose: Renders the AsciiDoc content visually. It updates in real-time 
 *          as the user types in the Editor and supports scroll synchronization.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Maximize2, Minimize2, Edit3 } from 'lucide-react';
import { convertToHtml } from '../services/asciidocService';

interface PreviewProps {
  content: string;
  isFocused: boolean;
  onToggleFocus: () => void;
  onVisualEdit?: (val: string) => void;
  customCss?: string;
  cursorLine?: number; // Changed from cursorOffset
  isActive?: boolean;
  onActivate?: () => void;
  focusTrigger?: number;
  isEditing?: boolean;
  onToggleEditing?: () => void;
}

const Preview: React.FC<PreviewProps> = ({
  content, isFocused, onToggleFocus, onVisualEdit, customCss,
  cursorLine, isActive, onActivate, focusTrigger,
  isEditing = false, onToggleEditing
}) => {
  const [html, setHtml] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // 1. Static HTML Template (Memoized to prevent re-renders)
  const srcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style id="base-style">
          /* Base Reset */
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          body { 
            padding: 2rem; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.5;
            box-sizing: border-box;
            overflow-y: auto;
          }
          
          /* Basic Typography Defaults */
          h1, h2, h3, h4, h5, h6 { color: #111827; font-weight: 600; margin-top: 2em; margin-bottom: 1em; }
          h1 { font-size: 2.25em; margin-top: 0; }
          h2 { font-size: 1.5em; }
          p { margin-top: 1.25em; margin-bottom: 1.25em; }
          code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-size: 0.875em; }
          pre { background: #1f2937; color: #f9fafb; padding: 1em; border-radius: 0.5em; overflow-x: auto; }
          pre code { background: transparent; padding: 0; color: inherit; }
          blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; font-style: italic; color: #4b5563; }
          img { max-width: 100%; height: auto; }
          
          /* Highlight target for debugging/visual feedback */
          .highlight-target {
            background-color: rgba(255, 255, 0, 0.2);
            transition: background-color 0.5s;
          }
        </style>
        <style id="custom-style"></style>
      </head>
      <body class="asciidoc-preview">
        <div id="content"></div>
        <script>
          const contentDiv = document.getElementById('content');
          const customStyle = document.getElementById('custom-style');

          // --- Helper Functions ---
          function notifyFocus() { window.parent.postMessage({ type: 'preview-focus' }, '*'); }
          function notifyBlur() { window.parent.postMessage({ type: 'preview-blur' }, '*'); }
          
          function scrollToLine(line) {
            if (!line) return;
            
            // Find exact match
            let target = document.querySelector('.data-line-' + line);
            
            // If not found, find nearest preceding line
            if (!target) {
              // This is a naive search, could be optimized
              // We iterate down from the requested line
              for (let i = line; i > 0; i--) {
                target = document.querySelector('.data-line-' + i);
                if (target) break;
              }
            }
            
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              // Optional: Highlight
              // document.querySelectorAll('.highlight-target').forEach(el => el.classList.remove('highlight-target'));
              // target.classList.add('highlight-target');
            }
          }

          // --- Event Listeners ---
          window.addEventListener('focus', notifyFocus);
          window.addEventListener('blur', notifyBlur);
          document.body.addEventListener('focus', notifyFocus);
          document.body.addEventListener('blur', notifyBlur);
          document.body.addEventListener('click', (e) => {
             const target = e.target.closest('a');
             if (target) {
                 const href = target.getAttribute('href');

                 // Handle External Links
                 if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:'))) {
                     e.preventDefault();
                     window.parent.postMessage({ type: 'open-browser', url: href }, '*');
                     return;
                 }

                 // Handle Internal Anchors (Prevent Hall of Mirrors)
                 if (target.hash) {
                    e.preventDefault();
                    const id = target.hash.substring(1);
                    const el = document.getElementById(id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                    return;
                 }
             }

             document.body.focus();
             notifyFocus();
          });

          // --- Keydown Handling (Tab Trap & Function Keys) ---
          window.addEventListener('keydown', (e) => {
            // Forward Function Keys and Escape to Parent
            if (['F9', 'F10', 'F11', 'Escape'].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'preview-keydown', key: e.key }, '*');
              return;
            }
          });

          // --- Message Handling ---
          window.addEventListener('message', (event) => {
            const data = event.data;
            switch (data.type) {
              case 'update-content':
                // Always update if content is different
                if (contentDiv.innerHTML !== data.html) {
                   contentDiv.innerHTML = data.html;
                }
                break;
              case 'update-css':
                customStyle.textContent = data.css;
                break;
              case 'scroll-to-line':
                scrollToLine(data.line);
                break;
            }
          });

          // Notify parent that we are ready
          window.parent.postMessage({ type: 'preview-ready' }, '*');
        </script>
      </body>
    </html>
  `, []);

  // 2. Message Listener (Incoming from Iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'preview-focus') {
        onActivate?.();
      } else if (event.data.type === 'preview-ready') {
        setIframeLoaded(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onActivate]);

  // 3. Post Messages (Outgoing to Iframe)

  // Update Content
  useEffect(() => {
    if (iframeLoaded && iframeRef.current) {
      const html = convertToHtml(content);
      iframeRef.current.contentWindow?.postMessage({ type: 'update-content', html }, '*');
    }
  }, [content, iframeLoaded]);

  // Update CSS
  useEffect(() => {
    if (iframeLoaded && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'update-css', css: customCss || '' }, '*');
    }
  }, [customCss, iframeLoaded]);

  // Sync Scroll (Code -> Preview)
  useEffect(() => {
    if (iframeLoaded && iframeRef.current && cursorLine !== undefined) {
      iframeRef.current.contentWindow?.postMessage({ type: 'scroll-to-line', line: cursorLine }, '*');
    }
  }, [cursorLine, iframeLoaded]);

  return (
    <div id="ndx-preview-container" className={`relative h-full w-full bg-white transition-all duration-300 flex flex-col border ${isActive && isEditing ? 'border-amber-500' : 'border-transparent'} ${isFocused ? 'fixed inset-0 z-50' : ''}`}>

      <div className="absolute top-2 right-4 z-10 flex gap-2">
        <button
          id="ndx-preview-focus-toggle"
          onClick={onToggleFocus}
          className="bg-gray-100 text-gray-500 hover:text-gray-900 p-1.5 rounded transition-colors"
          title={isFocused ? "Exit Focus Mode" : "Focus Preview"}
        >
          {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          id="ndx-preview-iframe"
          ref={iframeRef}
          title="Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => {
            setIframeLoaded(true);
          }}
        />
      </div>
    </div>
  );
};

export default Preview;
