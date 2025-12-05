import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Maximize2, Minimize2, Edit3 } from 'lucide-react';
import { convertToHtml } from '../services/asciidocService';

interface PreviewProps {
  content: string;
  isFocused: boolean;
  onToggleFocus: () => void;
  onVisualEdit?: (val: string) => void;
  customCss?: string;
  cursorOffset?: number;
  isActive?: boolean;
  onActivate?: () => void;
  focusTrigger?: number;
  isEditing?: boolean;
  onToggleEditing?: () => void;
}

const Preview: React.FC<PreviewProps> = ({
  content, isFocused, onToggleFocus, onVisualEdit, customCss,
  cursorOffset, isActive, onActivate, focusTrigger,
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
          
          function setCaretPosition(offset) {
            const range = document.createRange();
            const sel = window.getSelection();
            let currentOffset = 0;
            let found = false;

            function traverse(node) {
              if (found) return;
              if (node.nodeType === 3) { // Text node
                const len = node.length;
                if (currentOffset + len >= offset) {
                  range.setStart(node, offset - currentOffset);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  found = true;
                } else {
                  currentOffset += len;
                }
              } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                  traverse(node.childNodes[i]);
                }
              }
            }
            traverse(document.body);
          }

          function getCaretCharacterOffsetWithin(element) {
            var caretOffset = 0;
            var doc = element.ownerDocument || element.document;
            var win = doc.defaultView || doc.parentWindow;
            var sel;
            if (typeof win.getSelection != "undefined") {
                sel = win.getSelection();
                if (sel.rangeCount > 0) {
                    var range = win.getSelection().getRangeAt(0);
                    var preCaretRange = range.cloneRange();
                    preCaretRange.selectNodeContents(element);
                    preCaretRange.setEnd(range.endContainer, range.endOffset);
                    caretOffset = preCaretRange.toString().length;
                }
            }
            return caretOffset;
          }

          // --- Event Listeners ---
          window.addEventListener('focus', notifyFocus);
          window.addEventListener('blur', notifyBlur);
          document.body.addEventListener('focus', notifyFocus);
          document.body.addEventListener('blur', notifyBlur);
          document.body.addEventListener('click', () => {
             document.body.focus();
             notifyFocus();
          });

          document.addEventListener('selectionchange', () => {
             const selection = document.getSelection();
             if (selection.rangeCount > 0) {
               const offset = getCaretCharacterOffsetWithin(document.body);
               window.parent.postMessage({ type: 'preview-cursor', offset: offset }, '*');
             }
          });

          document.body.addEventListener('input', function() {
            window.parent.postMessage({ type: 'preview-edit', content: document.body.innerText }, '*');
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
              case 'set-edit-mode':
                document.body.contentEditable = data.isEditing ? 'true' : 'false';
                if (data.isEditing) {
                  document.body.focus();
                }
                break;
              case 'set-cursor':
                setCaretPosition(data.offset);
                // Do not force focus here, as it steals focus from code editor during background sync
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
    if (iframeLoaded && iframeRef.current && (!isEditing || !isActive)) {
      // Update content if we are NOT editing OR if we are editing but not the active pane (background sync)
      const html = convertToHtml(content);
      iframeRef.current.contentWindow?.postMessage({ type: 'update-content', html }, '*');
    }
  }, [content, iframeLoaded, isEditing, isActive]);

  // Update CSS
  useEffect(() => {
    if (iframeLoaded && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'update-css', css: customCss || '' }, '*');
    }
  }, [customCss, iframeLoaded]);

  // Update Edit Mode
  useEffect(() => {
    if (iframeLoaded && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'set-edit-mode', isEditing }, '*');
    }
  }, [isEditing, iframeLoaded]);

  // Update Cursor (Sync from Code Editor)
  useEffect(() => {
    if (iframeLoaded && iframeRef.current && isEditing) {
      // Sync cursor whenever we are editing, even in background
      if (cursorOffset !== undefined) {
        iframeRef.current.contentWindow?.postMessage({ type: 'set-cursor', offset: cursorOffset }, '*');
      }
    }
  }, [cursorOffset, isEditing, iframeLoaded]);

  // Force Focus when Active
  useEffect(() => {
    if (isActive && isEditing && iframeRef.current) {
      iframeRef.current.contentWindow?.focus();
    }
  }, [isActive, isEditing]);

  // ... (rest of the component)

  return (
    <div className={`relative h-full w-full bg-white transition-all duration-300 flex flex-col border ${isActive && isEditing ? 'border-amber-500' : 'border-transparent'} ${isFocused ? 'fixed inset-0 z-50' : ''}`}>

      <div className="absolute top-2 right-4 z-10 flex gap-2">
        <div className="bg-gray-100/80 backdrop-blur px-2 py-1.5 rounded text-xs text-gray-500 font-medium flex items-center gap-2 border border-gray-200">
          {isEditing ? <span className="text-amber-600 animate-pulse">Visual Edit Active</span> : <span>Read Only Preview</span>}
        </div>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onToggleEditing?.();
            // If we are enabling editing, we should also activate this pane
            if (!isEditing) onActivate?.();
            e.currentTarget.blur();
          }}
          className={`p-1.5 rounded transition-colors ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
          title="Toggle Visual Editing (Experimental)"
        >
          <Edit3 size={16} />
        </button>
        <button
          onClick={onToggleFocus}
          className="bg-gray-100 text-gray-500 hover:text-gray-900 p-1.5 rounded transition-colors"
          title={isFocused ? "Exit Focus Mode" : "Focus Preview"}
        >
          {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        <iframe
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
