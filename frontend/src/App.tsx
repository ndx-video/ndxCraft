import React, { useState, useRef } from 'react';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Preview from './components/Preview';
import AIAssistant from './components/AIAssistant';
import LeftSidebar from './components/LeftSidebar';
import { EditorMode, LeftTab } from './types';
import { Sidebar, PanelRight } from 'lucide-react';
import { ReadFile, SaveFile, SelectFile, SelectSaveFile } from '../wailsjs/go/main/App';

const INITIAL_CONTENT = `= Welcome to ndxCraft
Author Name <author@example.com>
v1.0, 2024-05-20

:toc:
:icons: font

== Introduction

ndxCraft is a modern AsciiDoc editor built with **React, Wails, and Vite**.

It features:
* Real-time preview
* Document Outline Navigation
* AI-powered writing assistance
* Focus modes for distraction-free writing

== Editing Structure

Go to the **Structure** tab on the left to drag and drop sections.
This allows you to reorganize large documents easily.

== Code Example

[source,typescript]
----
const greeting = "Hello World";
console.log(greeting);
----

== Conclusion

Enjoy writing!
`;

const App: React.FC = () => {
  const [content, setContent] = useState<string>(INITIAL_CONTENT);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>(LeftTab.FILES);
  const [fileName, setFileName] = useState<string>('untitled.adoc');

  // Focus Modes
  const [focusedPane, setFocusedPane] = useState<'none' | 'editor' | 'preview'>('none');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (template: string, cursorOffset: number = 0) => {
    if (template === '') {
      if (window.confirm("Clear all content?")) setContent('');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    let newText = text.substring(0, start) + template + text.substring(end, text.length);
    let newCursorPos = start + template.length;

    if (start !== end && template.length > 2 && template[0] === template[template.length - 1]) {
      const selection = text.substring(start, end);
      const wrapper = template[0];
      newText = text.substring(0, start) + wrapper + selection + wrapper + text.substring(end);
      newCursorPos = end + 2;
    } else if (cursorOffset > 0) {
      newCursorPos = start + cursorOffset;
    }

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleAIApply = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + '\n' + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);
    setContent(newVal);
  };

  // Mock File Ops
  // File Ops
  const handleOpen = async () => {
    try {
      const filePath = await SelectFile();
      if (filePath) {
        const text = await ReadFile(filePath);
        setContent(text);
        setFileName(filePath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      let filePath = fileName;
      if (filePath === 'untitled.adoc') {
        filePath = await SelectSaveFile();
      }

      if (filePath && filePath !== 'untitled.adoc') {
        await SaveFile(filePath, content);
        setFileName(filePath);
        alert('Saved!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="h-10 bg-black flex items-center px-4 justify-between border-b border-gray-800 select-none z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className={`text-gray-400 hover:text-white transition-colors ${leftPanelOpen ? 'text-indigo-400' : ''}`}>
            <Sidebar size={18} />
          </button>
          <span className="font-bold text-gray-200 tracking-tight">ndxCraft</span>
          <span className="bg-gray-900 px-2 py-0.5 rounded text-xs text-gray-500 border border-gray-800">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-colors ${rightPanelOpen ? 'bg-indigo-900/50 text-indigo-300' : 'text-gray-400 hover:bg-gray-900'}`}
          >
            <PanelRight size={16} />
            AI Assistant
          </button>
        </div>
      </div>

      <Toolbar
        onInsert={handleInsert}
        onAIRequest={() => setRightPanelOpen(true)}
        onOpen={handleOpen}
        onSave={handleSave}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        <LeftSidebar
          isOpen={leftPanelOpen}
          activeTab={activeLeftTab}
          onTabChange={setActiveLeftTab}
          content={content}
          onContentChange={setContent}
        />

        {/* Center Canvas */}
        <div className="flex-1 flex min-w-0 bg-gray-900 relative">

          {/* Editor Pane */}
          <div className={`flex-1 flex flex-col min-w-0 border-r border-gray-800 transition-all duration-300 
            ${focusedPane === 'preview' ? 'hidden' : ''} 
            ${focusedPane === 'editor' ? 'flex-none w-full' : ''}`}
          >
            <Editor
              ref={textareaRef}
              value={content}
              onChange={setContent}
              isFocused={focusedPane === 'editor'}
              onToggleFocus={() => setFocusedPane(focusedPane === 'editor' ? 'none' : 'editor')}
            />
          </div>

          {/* Preview Pane */}
          <div className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 
            ${focusedPane === 'editor' ? 'hidden' : ''}
            ${focusedPane === 'preview' ? 'flex-none w-full' : ''}`}
          >
            <Preview
              content={content}
              isFocused={focusedPane === 'preview'}
              onToggleFocus={() => setFocusedPane(focusedPane === 'preview' ? 'none' : 'preview')}
            />
          </div>

        </div>

        {/* Right Panel (Slide Out) */}
        {rightPanelOpen && (
          <AIAssistant
            isOpen={rightPanelOpen}
            onClose={() => setRightPanelOpen(false)}
            currentContent={content}
            onApply={handleAIApply}
          />
        )}
      </div>

      {/* Footer */}
      <div className="h-6 bg-black border-t border-gray-800 flex items-center px-4 text-[10px] text-gray-600 justify-between z-20">
        <div className="flex gap-4">
          <span>{content.length} chars</span>
          <span>{content.split('\n').length} lines</span>
        </div>
        <div className="flex gap-2">
          <span>Structure: {activeLeftTab === LeftTab.OUTLINE ? 'Active' : 'Hidden'}</span>
          <span className={process.env.API_KEY ? 'text-green-900' : 'text-red-900'}>
            API: {process.env.API_KEY ? 'CONNECTED' : 'MISSING'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
