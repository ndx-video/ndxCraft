import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, Minimize2, Edit3 } from 'lucide-react';
import { convertToHtml } from '../services/asciidocService';

interface PreviewProps {
  content: string;
  isFocused: boolean;
  onToggleFocus: () => void;
  onVisualEdit?: (val: string) => void; // Optional hook for visual editing
}

const Preview: React.FC<PreviewProps> = ({ content, isFocused, onToggleFocus, onVisualEdit }) => {
  const [html, setHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only update HTML from source if we are NOT currently visual editing to avoid cursor jumps
    if (!isEditing) {
      const timer = setTimeout(() => {
        setHtml(convertToHtml(content));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content, isEditing]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    // In a real app, we'd use Turndown or similar to convert HTML back to AsciiDoc.
    // Here we just warn or log, or if onVisualEdit is provided, we try to pass raw text (mocking sync).
    // For this demo, let's allow typing but show a status.
  };

  return (
    <div className={`relative h-full w-full bg-white transition-all duration-300 flex flex-col ${isFocused ? 'fixed inset-0 z-50' : ''}`}>
      
      <div className="absolute top-2 right-4 z-10 flex gap-2">
        <div className="bg-gray-100/80 backdrop-blur px-2 py-1.5 rounded text-xs text-gray-500 font-medium flex items-center gap-2 border border-gray-200">
           {isEditing ? <span className="text-amber-600 animate-pulse">Visual Edit Active</span> : <span>Read Only Preview</span>}
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
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

      <div className="flex-1 overflow-y-auto bg-white">
        <div 
          ref={containerRef}
          className={`p-8 prose max-w-none text-gray-900 asciidoc-preview outline-none ${isEditing ? 'cursor-text ring-2 ring-inset ring-amber-100 min-h-full' : ''}`}
          dangerouslySetInnerHTML={{ __html: html }}
          contentEditable={isEditing}
          onInput={handleInput}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};

export default Preview;
