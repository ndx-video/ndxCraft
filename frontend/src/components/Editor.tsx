/**
 * Editor Component
 * 
 * Location: Central area of the application (left pane when Preview is open).
 * Purpose: The main text editing interface. It wraps the Monaco Editor and handles 
 *          text input, scrolling, and synchronization with the Preview.
 */
import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';

export interface EditorHandle {
  focus: () => void;
  setCursor: (line: number, col: number) => void;
  insertText: (text: string) => void;
  setValue: (text: string) => void;
  getValue: () => string;
  getSelection: () => string;
}

interface EditorProps {
  defaultValue: string; // Initial value only
  onChange: (val: string) => void;
  isFocused: boolean;
  onToggleFocus: () => void;
  onCursorChange?: (line: number) => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ defaultValue, onChange, isFocused, onToggleFocus, onCursorChange }, ref) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Stable options
  const options = React.useMemo(() => ({
    minimap: { enabled: true },
    wordWrap: 'on' as const,
    lineNumbers: 'off' as const,
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    automaticLayout: true,
    padding: { top: 20, bottom: 20 },
  }), []);

  // Keep latest callbacks in refs to avoid re-creating handlers
  const onCursorChangeRef = useRef(onCursorChange);
  const onChangeRef = useRef(onChange);

  // Update refs on render
  useEffect(() => {
    onCursorChangeRef.current = onCursorChange;
    onChangeRef.current = onChange;
  });

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    setCursor: (line: number, col: number) => {
      editorRef.current?.setPosition({ lineNumber: line, column: col });
      editorRef.current?.revealPosition({ lineNumber: line, column: col });
    },
    insertText: (text: string) => {
      const editor = editorRef.current;
      if (editor) {
        const selection = editor.getSelection();
        const op = { range: selection, text: text, forceMoveMarkers: true };
        editor.executeEdits("my-source", [op]);
      }
    },
    setValue: (text: string) => {
      if (editorRef.current) {
        editorRef.current.setValue(text);
      }
    },
    getValue: () => {
      return editorRef.current ? editorRef.current.getValue() : "";
    },
    getSelection: () => {
      const editor = editorRef.current;
      if (editor) {
        const selection = editor.getSelection();
        return editor.getModel().getValueInRange(selection);
      }
      return "";
    }
  }));

  const handleEditorDidMount: OnMount = React.useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChangeRef.current) {
        onCursorChangeRef.current(e.position.lineNumber);
      }
    });
  }, []);

  const handleEditorChange = React.useCallback((val: string | undefined) => {
    if (onChangeRef.current) {
      onChangeRef.current(val || '');
    }
  }, []);

  return (
    <div id="ndx-editor-container" className={`relative h-full w-full bg-[#1e1e1e] transition-all duration-300 border border-transparent focus-within:border-indigo-500 ${isFocused ? 'fixed inset-0 z-50' : ''}`}>
      {/* Focus Toggle */}
      <button
        id="ndx-editor-focus-toggle"
        onClick={onToggleFocus}
        className="absolute top-2 right-4 z-10 text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-700 p-1.5 rounded transition-colors"
        title={isFocused ? "Exit Focus Mode" : "Focus Source"}
      >
        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <MonacoEditor
        height="100%"
        language="markdown"
        theme="vs-dark"
        defaultValue={defaultValue}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={options}
      />
    </div>
  );
});

Editor.displayName = 'Editor';
export default Editor;
