import React, { forwardRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  isFocused: boolean;
  onToggleFocus: () => void;
}

const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(({ value, onChange, isFocused, onToggleFocus }, ref) => {
  return (
    <div className={`relative h-full w-full bg-gray-900 transition-all duration-300 ${isFocused ? 'fixed inset-0 z-50' : ''}`}>
      {/* Focus Toggle */}
      <button 
        onClick={onToggleFocus}
        className="absolute top-2 right-4 z-10 text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-700 p-1.5 rounded transition-colors"
        title={isFocused ? "Exit Focus Mode" : "Focus Source"}
      >
        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full p-6 bg-gray-900 text-gray-200 font-mono text-sm resize-none outline-none border-none leading-relaxed custom-scrollbar"
        spellCheck={false}
        placeholder="Type your AsciiDoc here..."
      />
    </div>
  );
});

Editor.displayName = 'Editor';
export default Editor;
