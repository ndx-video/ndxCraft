/**
 * Toolbar Component
 * 
 * Location: Top of the application window.
 * Purpose: Contains primary actions like File operations (New, Open, Save), 
 *          view toggles (Preview, Sidebar), and access to Preferences.
 */
import React from 'react';
import {
  Bold, Italic, Heading, List, ListOrdered, Link, Image,
  Code, Table, Wand2, Eraser, Download, Upload, Settings, Github, Folder
} from 'lucide-react';

interface ToolbarProps {
  onInsert: (template: string, cursorOffset?: number) => void;
  onAIRequest: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSettings: () => void;
  onGitHub: () => void;
  onViewSource: () => void;
  onProjectList: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onInsert, onAIRequest, onOpen, onSave, onSettings, onGitHub, onViewSource, onProjectList }) => {

  const Btn = ({ icon: Icon, label, onClick, id }: { icon: any, label: string, onClick: () => void, id?: string }) => (
    <button
      id={id}
      onClick={onClick}
      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2 group relative"
      title={label}
      tabIndex={-1}
    >
      <Icon size={18} />
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
        {label}
      </span>
    </button>
  );

  return (
    <div id="ndx-toolbar" className="h-8 border-b border-gray-700 bg-gray-800 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-1">
        <Btn id="ndx-toolbar-projects" icon={Folder} label="Projects" onClick={onProjectList} />
        <Btn id="ndx-toolbar-open" icon={Upload} label="Open File" onClick={onOpen} />
        <Btn id="ndx-toolbar-save" icon={Download} label="Save File" onClick={onSave} />
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Btn id="ndx-toolbar-heading" icon={Heading} label="Heading" onClick={() => onInsert('\n== Heading\n', 12)} />
        <Btn id="ndx-toolbar-bold" icon={Bold} label="Bold" onClick={() => onInsert('*bold text*', 1)} />
        <Btn id="ndx-toolbar-italic" icon={Italic} label="Italic" onClick={() => onInsert('_italic text_', 1)} />
        <Btn id="ndx-toolbar-code" icon={Code} label="Code Block" onClick={() => onInsert('\n[source,typescript]\n----\nconsole.log("Hello");\n----\n', 22)} />
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <Btn id="ndx-toolbar-list-bullet" icon={List} label="Bulleted List" onClick={() => onInsert('\n* Item 1\n* Item 2\n', 0)} />
        <Btn id="ndx-toolbar-list-ordered" icon={ListOrdered} label="Numbered List" onClick={() => onInsert('\n. Step 1\n. Step 2\n', 0)} />
        <Btn id="ndx-toolbar-link" icon={Link} label="Link" onClick={() => onInsert('https://example.com[Link Text]', 0)} />
        <Btn id="ndx-toolbar-image" icon={Image} label="Image" onClick={() => onInsert('image::https://picsum.photos/800/400[Alt Text]', 0)} />
        <Btn id="ndx-toolbar-table" icon={Table} label="Table" onClick={() => onInsert('\n|===\n|Header 1 |Header 2\n\n|Cell 1\n|Cell 2\n|===\n', 0)} />
      </div>

      <div className="flex items-center gap-2">
        <button
          id="ndx-toolbar-view-source"
          onClick={onViewSource}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="View HTML Source"
          tabIndex={-1}
        >
          <Code size={20} />
        </button>
        <button
          id="ndx-toolbar-github"
          onClick={onGitHub}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Open in GitHub Desktop"
          tabIndex={-1}
        >
          <Github size={20} />
        </button>
        <button
          id="ndx-toolbar-settings"
          onClick={onSettings}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Settings"
          tabIndex={-1}
        >
          <Settings size={20} />
        </button>
        {/* <button
          id="ndx-toolbar-ai-assistant"
          onClick={onAIRequest}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          tabIndex={-1}
        >
          <Wand2 size={16} />
          <span>AI Assistant</span>
        </button> */}
      </div>
    </div>
  );
};

export default Toolbar;
