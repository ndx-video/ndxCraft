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
import { conf, languageDef, languageID } from '../monaco/asciidoc';

export interface EditorHandle {
  focus: () => void;
  setCursor: (line: number, col: number) => void;
  insertText: (text: string) => void;
  setValue: (text: string) => void;
  getValue: () => string;
  getSelection: () => string;
  undo: () => void;
  redo: () => void;
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
    },
    undo: () => {
      editorRef.current?.trigger('api', 'undo', null);
    },
    redo: () => {
      editorRef.current?.trigger('api', 'redo', null);
    }
  }));

  const handleEditorDidMount: OnMount = React.useCallback((editor, monaco) => {
    editorRef.current = editor;
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register AsciiDoc language
    monaco.languages.register({ id: languageID });
    monaco.languages.setMonarchTokensProvider(languageID, languageDef);
    monaco.languages.setLanguageConfiguration(languageID, conf);

    // Define and apply Technical Writer theme
    monaco.editor.defineTheme('technical-writer', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        // 1. Catch-all: Soft blue-gray text (#a6accd), no bold.
        // This overrides all default vs-dark colors.
        { token: '', foreground: 'a6accd', fontStyle: '' },

        // 2. Comments: Darker gray/blue (#555b6b), subtle italic
        { token: 'comment', foreground: '555b6b', fontStyle: 'italic' },

        // 3. Headers: Soft Blue (#7aa2f7), Bold
        { token: 'keyword.header', foreground: '7aa2f7', fontStyle: 'bold' },

        // 4. Delimiters/Symbols: Deep gray (#414863) (fade into background)
        { token: 'delimiter', foreground: '414863' },

        // 5. Formatting:
        // Bold: Whiter/Brighter (#e0e6f0)
        { token: 'strong', foreground: 'e0e6f0', fontStyle: 'bold' },
        // Emphasis: Whiter/Brighter (#e0e6f0)
        { token: 'emphasis', foreground: 'e0e6f0', fontStyle: 'italic' },
        // Code: Soft peach/orange (#cfc9c2) (subtle)
        { token: 'string', foreground: 'cfc9c2' },

        // 6. Attributes: Same as base text
        { token: 'variable.attribute', foreground: 'a6accd' },
      ],
      colors: {
        'editor.background': '#13151a', // Deep dark blue/black (reduced fatigue)
        'editor.foreground': '#a6accd', // Soft blue-gray
        'editor.selectionBackground': '#2f3b5440',
        'editor.lineHighlightBackground': '#1b1e2e',
        'editorCursor.foreground': '#7aa2f7',
        'editorWhitespace.foreground': '#3b4048',
        'editorIndentGuide.background': '#2c313a',
        'editorIndentGuide.activeBackground': '#454c59',
      }
    });
    monaco.editor.setTheme('technical-writer');


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
    <div id="ndx-editor-container" className={`relative h-full w-full bg-[#141d2b] transition-all duration-300 border border-transparent focus-within:border-indigo-500 ${isFocused ? 'fixed inset-0 z-50' : ''}`}>
      {/* Focus Toggle */}
      <button
        id="ndx-editor-focus-toggle"
        onClick={onToggleFocus}
        className="absolute top-2 right-18 z-10 text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-700 p-1.5 rounded transition-colors"
        title={isFocused ? "Exit Focus Mode" : "Focus Source"}
      >
        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>


      <MonacoEditor
        height="100%"
        language={languageID}
        theme="technical-writer"
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
