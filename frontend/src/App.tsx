import React, { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Toolbar from './components/Toolbar';
import Editor, { EditorHandle } from './components/Editor';
import Preview from './components/Preview';
import AIAssistant from './components/AIAssistant';
import LeftSidebar from './components/LeftSidebar';
import PreferencesModal from './components/PreferencesModal';
import { EditorMode, LeftTab, FileNode } from './types';
import { Sidebar, PanelRight, Circle } from 'lucide-react';
import ProjectListModal from './components/ProjectListModal';
import { ReadFile, SaveFile, SelectFile, SelectSaveFile, ListFiles, OpenGitClient, OpenBrowser, SaveShadowFile, GetShadowFile, SaveAppState, GetAppState, HasCorruption, RestoreBackup, GetFileTree, ClearShadowFile, UpdateProjectLastOpened, GetDefaultProjectRoot, GetPreference, AddProject, GetGitIcons } from '../wailsjs/go/main/App';
import { WindowFullscreen, WindowUnfullscreen, WindowIsFullscreen } from '../wailsjs/runtime/runtime';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INITIAL_CONTENT = `= Welcome to ndxCraft
Author Name <author@example.com>
v1.0, 2024-05-20

:toc:
:icons: font

== Introduction

ndxCraft is a modern AsciiDoc editor built with **React, Wails, and Vite**.

== Getting Started

Click the **Projects** button in the toolbar to open or create a project.

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
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [savedContent, setSavedContent] = useState<string>(INITIAL_CONTENT);

  const [projectRoot, setProjectRoot] = useState<string>('');
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [gitIconSvg, setGitIconSvg] = useState<string | undefined>(undefined);

  // Unsaved Changes Dialog State
  const [pendingFileToOpen, setPendingFileToOpen] = useState<string | null>(null);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);


  useEffect(() => {
    if (projectRoot) {
      loadFiles();
    }
  }, [projectRoot]);

  // Load App State
  useEffect(() => {
    const init = async () => {
      try {
        // Load Project Root
        let root = await GetPreference("projectRoot");
        if (!root || root === "") {
          // @ts-ignore
          root = await GetDefaultProjectRoot();
        }
        if (root) {
          setProjectRoot(root);
        }

        // Load Git Icon
        const iconIdRaw = await GetPreference("git_client_icon_id");
        if (iconIdRaw) {
          const iconId = iconIdRaw as string;
          try {
            const icons = await GetGitIcons();
            if (icons && icons[iconId]) {
              setGitIconSvg(icons[iconId]);
            }
          } catch (e) { console.error(e); }
        }

        const lastFile = await GetAppState("lastFile");
        if (lastFile && lastFile !== "") {
          console.log("Restoring last file:", lastFile);
          await performOpenFile(lastFile);

          // Restore cursor
          const savedPos = await GetAppState("cursorPos");
          if (savedPos) {
            setTimeout(() => {
              if (editorRef.current) {
                const pos = Number(savedPos);
                // Saved pos is now line number (or we treat it as such for new files)
                // If it's a large number (legacy offset), we might default to 1
                const line = pos > 100000 ? 1 : pos;
                editorRef.current.setCursor(line, 1);
                editorRef.current.focus();
              }
            }, 100);
          }
        }
      } catch (e) {
        console.error("Failed to restore state:", e);
      }
    };
    init();
  }, []);

  // Check Corruption
  useEffect(() => {
    const check = async () => {
      try {
        const has = await HasCorruption();
        if (has) {
          if (confirm("Database corruption detected. Do you want to restore preferences from backup?")) {
            await RestoreBackup();
            alert("Preferences restored. Please restart the application.");
            window.location.reload();
          }
        }
      } catch (e) { console.error(e); }
    };
    check();
  }, []);

  // Save App State & Shadow File
  useEffect(() => {
    if (fileName && fileName !== 'untitled.adoc') {
      SaveAppState("lastFile", fileName);
      SaveAppState("cursorPos", cursorPosRef.current.toString());

      // Debounce shadow save
      const timer = setTimeout(() => {
        SaveShadowFile(fileName, content, isDirty);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fileName, content, isDirty]);

  useEffect(() => {
    setIsDirty(content !== savedContent);
  }, [content, savedContent]);

  // Ref to access latest content in event listener without re-binding
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  // Handle messages from Preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'preview-cursor') {
        // Legacy support or if we re-enable reverse sync
        // For now, AST sync is one-way (Editor -> Preview)
        // So we ignore this or remove the handler
      } else if (event.data.type === 'preview-edit') {
        // Update content from preview edit
        // WARNING: This comes from innerText, so it strips AsciiDoc formatting!
        // This is a "destructive" sync but fulfills the request for state management.
        const newContent = event.data.content;
        setContent(newContent);
        editorRef.current?.setValue(newContent);
      } else if (event.data.type === 'preview-tab') {
        // Handle Tab from Preview: Switch to Code Editor
        setActiveEditor('code');
        setIsVisualEditEnabled(false);

        const sourcePos = event.data.sourcePos;
        let targetPos = -1;
        const currentContent = contentRef.current;

        if (sourcePos && sourcePos.line) {
          // Calculate absolute character index from Line Number + Offset
          const lines = currentContent.split('\n');
          const lineIndex = sourcePos.line - 1; // Asciidoctor is 1-indexed

          if (lineIndex >= 0 && lineIndex < lines.length) {
            let charCount = 0;
            for (let i = 0; i < lineIndex; i++) {
              charCount += lines[i].length + 1; // +1 for newline
            }

            // Add the relative offset from the start of the block
            // Note: We clamp it to the line length to be safe
            const lineLength = lines[lineIndex].length;
            const safeOffset = Math.min(sourcePos.offset, lineLength);

            targetPos = charCount + safeOffset;
          }
        }

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            if (sourcePos && sourcePos.line) {
              editorRef.current.setCursor(sourcePos.line, 1);
              cursorPosRef.current = sourcePos.line;
            }
          }
        }, 0);
      } else if (event.data.type === 'preview-keydown') {
        // Handle forwarded keydown from iframe
        const key = event.data.key;
        // Create a synthetic keyboard event and dispatch it to window
        // Or just call the handler directly if we extract it
        // Simpler: Just re-dispatch a new KeyboardEvent on window
        const newEvent = new KeyboardEvent('keydown', {
          key: key,
          bubbles: true,
          cancelable: true,
          view: window
        });
        window.dispatchEvent(newEvent);
      } else if (event.data.type === 'open-browser') {
        // Handle request to open external link
        const url = event.data.url;
        if (url) {
          // @ts-ignore
          OpenBrowser(url);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadFiles = async () => {
    try {
      // @ts-ignore
      const tree = await GetFileTree(projectRoot);
      setFileTree(tree || []);
    } catch (err) {
      console.error("Failed to list files", err);
    }
  };

  // Focus Modes
  const [focusedPane, setFocusedPane] = useState<'none' | 'editor' | 'preview'>('none');

  const editorRef = useRef<EditorHandle>(null);
  const cursorPosRef = useRef<number>(1); // Store line number
  const cursorSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeEditor, setActiveEditor] = useState<'code' | 'visual'>('code');
  const [cursorLine, setCursorLine] = useState(1);
  const [isVisualEditEnabled, setIsVisualEditEnabled] = useState(false);

  const [focusTrigger, setFocusTrigger] = useState(0);

  // App Layout Mode for True Fullscreen Editors
  const [appLayoutMode, setAppLayoutMode] = useState<'default' | 'fullscreen-code' | 'fullscreen-visual'>('default');

  // Refs for State Access in Event Listeners (Fixes Stale Closures & Dependency Issues)
  const appLayoutModeRef = useRef(appLayoutMode);
  const focusedPaneRef = useRef(focusedPane);
  const activeEditorRef = useRef(activeEditor);

  useEffect(() => { appLayoutModeRef.current = appLayoutMode; }, [appLayoutMode]);
  useEffect(() => { focusedPaneRef.current = focusedPane; }, [focusedPane]);
  useEffect(() => { activeEditorRef.current = activeEditor; }, [activeEditor]);

  // Force Focus on Mount to ensure shortcuts work immediately
  useEffect(() => {
    window.focus();
    // Also try to focus the container if possible
    const container = document.getElementById('ndx-app-container');
    if (container) container.focus();
  }, []);

  // Global Keydown Handler for "Type-Through" and Tab Toggle
  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Access latest state via refs
      const currentLayoutMode = appLayoutModeRef.current;
      const currentFocusedPane = focusedPaneRef.current;
      const currentActiveEditor = activeEditorRef.current;

      // F11: Toggle Application Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        const isFull = await WindowIsFullscreen();
        if (isFull) {
          WindowUnfullscreen();
        } else {
          WindowFullscreen();
        }
        return;
      }

      // F9: Code Editor Fullscreen (True Fullscreen)
      if (e.key === 'F9') {
        e.preventDefault();
        setAppLayoutMode('fullscreen-code');
        setFocusedPane('editor');
        setActiveEditor('code');
        setIsVisualEditEnabled(false);
        setActiveEditor('code');
        setIsVisualEditEnabled(false);
        setTimeout(() => editorRef.current?.focus(), 0);
        return;
      }

      // F10: Visual Editor Fullscreen (True Fullscreen)
      if (e.key === 'F10') {
        e.preventDefault();
        setAppLayoutMode('fullscreen-visual');
        setFocusedPane('preview');
        setActiveEditor('visual');
        setIsVisualEditEnabled(true);
        setFocusTrigger(prev => prev + 1);
        return;
      }

      // Handle Tab Key Toggle
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default tab behavior (indentation/focus change)
        e.stopPropagation(); // Prevent other handlers

        // If in Split View (Normal)
        if (currentFocusedPane === 'none') {
          if (currentActiveEditor === 'code') {
            // Switch to Visual Editor and Enable Edit Mode
            setActiveEditor('visual');
            setIsVisualEditEnabled(true);
            setFocusTrigger(prev => prev + 1);
          } else {
            // Switch to Code Editor and Disable Edit Mode (Read Only)
            setActiveEditor('code');
            setIsVisualEditEnabled(false);
            setTimeout(() => editorRef.current?.focus(), 0);
          }
        }
        // If in Fullscreen Mode (Swap Editors)
        else {
          if (currentLayoutMode === 'fullscreen-code') {
            setAppLayoutMode('fullscreen-visual');
            setFocusedPane('preview'); // Keep this for internal logic
            setActiveEditor('visual');
            setIsVisualEditEnabled(true);
            setFocusTrigger(prev => prev + 1);
          } else if (currentLayoutMode === 'fullscreen-visual') {
            setAppLayoutMode('fullscreen-code');
            setFocusedPane('editor'); // Keep this for internal logic
            setActiveEditor('code');
            setIsVisualEditEnabled(false);
            setActiveEditor('code');
            setIsVisualEditEnabled(false);
            setTimeout(() => editorRef.current?.focus(), 0);
          } else {
            // Fallback for old "focusedPane" logic if any
            if (currentFocusedPane === 'editor') {
              setFocusedPane('preview');
              setActiveEditor('visual');
              setIsVisualEditEnabled(true);
              setFocusTrigger(prev => prev + 1);
            } else {
              setFocusedPane('editor');
              setActiveEditor('code');
              setIsVisualEditEnabled(false);
              setActiveEditor('code');
              setIsVisualEditEnabled(false);
              setTimeout(() => editorRef.current?.focus(), 0);
            }
          }
        }
        return;
      }

      // Escape: Exit Fullscreen Mode
      if (e.key === 'Escape') {
        if (currentLayoutMode !== 'default') {
          e.preventDefault();
          setAppLayoutMode('default');
          setFocusedPane('none');
          // Return focus to active editor
          if (currentActiveEditor === 'code') {
            setTimeout(() => editorRef.current?.focus(), 0);
          } else {
            setFocusTrigger(prev => prev + 1);
          }
        }
        return;
      }

      // Ctrl+Z: Undo / Redo (Global)
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        // We only want to handle this if NOT in an input/iframe, OR if we want to override default behavior?
        // Usually, inputs handle their own Undo. We want to catch it when focus is "lost" or on body/buttons.
        const active = document.activeElement;
        const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.getAttribute('contenteditable') === 'true';
        const isIframe = active instanceof HTMLIFrameElement;

        if (!isInput && !isIframe) {
          e.preventDefault();
          if (e.shiftKey) {
            editorRef.current?.redo();
          } else {
            editorRef.current?.undo();
          }
          setTimeout(() => editorRef.current?.focus(), 0);
          return;
        }
      }

      // Ignore if modifier keys are pressed (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Ignore if focus is already in an input/textarea/contenteditable
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.getAttribute('contenteditable') === 'true';
      // Check if active element is an iframe (our preview)
      const isIframe = active instanceof HTMLIFrameElement;

      if (isInput || isIframe) return;

      // If we are typing a character (length 1)
      if (e.key.length === 1) {
        if (currentActiveEditor === 'code') {
          // Monaco handles focus internally usually, but we can force it
          editorRef.current?.focus();
        } else if (currentActiveEditor === 'visual') {
          // Force focus to visual editor
          setFocusTrigger(prev => prev + 1);
        }
      }
    };



    window.addEventListener('keydown', handleGlobalKeyDown, true); // Use capture to intercept before others
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []); // Empty dependency array: listener is attached ONCE and uses refs for state

  // Focus Trap Safety Net
  useEffect(() => {
    let lastKey = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      lastKey = e.key;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (lastKey === 'Tab') {
        const target = e.target as HTMLElement;
        const isEditor = target.closest('#ndx-editor-container') !== null;
        const isPreview = target.tagName === 'IFRAME' || target.closest('#ndx-preview-container');

        // If focus lands on something that is NOT the editor or preview (e.g. buttons), bounce it back
        if (!isEditor && !isPreview) {
          // console.log("Blocked tab focus to:", target);
          target.blur();

          // Bounce back to active pane
          if (activeEditor === 'code') {
            editorRef.current?.focus();
          } else {
            // Focus preview iframe
            const iframe = document.getElementById('ndx-preview-iframe');
            iframe?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [activeEditor]);

  const handleCursorMove = (line: number) => {
    setActiveEditor('code'); // Ensure code is active when moving cursor
    cursorPosRef.current = line;
    setCursorLine(line); // Keep state in sync for Preview

    if (cursorSaveTimeoutRef.current) clearTimeout(cursorSaveTimeoutRef.current);
    cursorSaveTimeoutRef.current = setTimeout(() => {
      SaveAppState("cursorPos", line.toString());
    }, 1000);
  };

  const handleInsert = (template: string, cursorOffset: number = 0) => {
    if (template === '') {
      if (window.confirm("Clear all content?")) {
        setContent('');
        editorRef.current?.setValue('');
      }
      return;
    }

    if (editorRef.current) {
      editorRef.current.insertText(template);
      editorRef.current.focus();
    }
  };

  const handleAIApply = (text: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(text);
    } else {
      const newContent = content + '\n' + text;
      setContent(newContent);
      editorRef.current?.setValue(newContent);
    }
  };

  // Mock File Ops
  // File Ops
  const handleOpen = async () => {
    try {
      const filePath = await SelectFile();
      if (filePath) {
        // Check if file is inside current project root
        const separator = filePath.includes('\\') ? '\\' : '/';
        const lastSepIndex = filePath.lastIndexOf(separator);
        const parentDir = filePath.substring(0, lastSepIndex);

        let isInsideProject = false;
        if (projectRoot && projectRoot !== "") {
          // Simple prefix check. 
          // Normalize slashes for comparison if needed, but usually Wails is consistent.
          isInsideProject = filePath.startsWith(projectRoot);
        }

        if (!isInsideProject) {
          const confirmChange = window.confirm(
            `The selected file is outside the current project structure.\n\n` +
            `Do you want to set the parent folder as the new Project Root?\n` +
            `New Root: ${parentDir}`
          );

          if (confirmChange) {
            setProjectRoot(parentDir);
            try {
              // @ts-ignore
              await AddProject(parentDir);
              // @ts-ignore
              await UpdateProjectLastOpened(parentDir);
            } catch (e) {
              console.error("Failed to update project list:", e);
            }
          }
        }

        const text = await ReadFile(filePath);
        setContent(text);
        editorRef.current?.setValue(text);
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
        await SaveShadowFile(filePath, content, false);
        setSavedContent(content); // This will set isDirty to false
        setFileName(filePath);
        alert('Saved!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFile = async (path: string) => {
    if (isDirty) {
      setPendingFileToOpen(path);
      setIsUnsavedDialogOpen(true);
      return;
    }
    performOpenFile(path);
  };

  const performOpenFile = async (path: string) => {
    try {
      // If path is just a filename, assume it's in content dir (for now)
      let fullPath = path;
      if (!path.includes('/') && !path.includes('\\')) {
        fullPath = "content/" + path;
      }

      // Read disk content first to establish baseline
      const diskContent = await ReadFile(fullPath);
      setSavedContent(diskContent);

      // Check shadow
      try {
        const shadow = await GetShadowFile(fullPath);
        // shadow is map[string]interface{}
        if (shadow && shadow.content !== undefined) {
          const shadowContent = shadow.content as string;
          const shadowDirty = shadow.isDirty as boolean;

          if (shadowDirty) {
            console.log("Loaded dirty shadow file");
            setContent(shadowContent);
            editorRef.current?.setValue(shadowContent);
            // isDirty will be true because content != savedContent (diskContent)
          } else {
            setContent(diskContent);
            editorRef.current?.setValue(diskContent);
          }
        } else {
          setContent(diskContent);
          editorRef.current?.setValue(diskContent);
        }
      } catch (e) {
        // Fallback to disk if shadow fails
        console.warn("Shadow check failed, using disk:", e);
        setContent(diskContent);
        editorRef.current?.setValue(diskContent);
      }

      setFileName(path); // Keep just the name for display if it was from the list
      setIsUnsavedDialogOpen(false);
      setPendingFileToOpen(null);
    } catch (err) {
      console.error("Failed to open file", err);
      alert("Failed to open file: " + err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // @ts-ignore - WebView2 specific
      const path = e.dataTransfer.files[0].path || e.dataTransfer.files[0].name;
      if (path.endsWith('.adoc')) {
        handleOpenFile(path);
      } else {
        alert("Only .adoc files are supported");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUnsavedDialogAction = async (action: 'save' | 'discard') => {
    if (action === 'save') {
      await handleSave();
      if (pendingFileToOpen) performOpenFile(pendingFileToOpen);
    } else {
      // Discard changes: Clear the shadow file so we don't reload dirty state
      if (fileName && fileName !== 'untitled.adoc') {
        try {
          await ClearShadowFile(fileName);
        } catch (e) {
          console.error("Failed to clear shadow file:", e);
        }
      }
      if (pendingFileToOpen) performOpenFile(pendingFileToOpen);
    }
  };

  const handleGitHub = async () => {
    try {
      // @ts-ignore
      const installed = await OpenGitClient(projectRoot);
      if (!installed) {
        if (confirm("Git Client not found or protocol not supported. Defaulting to GitHub Desktop check. Download GitHub Desktop?")) {
          // @ts-ignore
          await OpenBrowser("https://desktop.github.com/");
        }
      }
    } catch (err) {
      console.error("Failed to open Git Client", err);
      alert("Error: " + err);
    }
  };

  const handleNavigate = (line: number) => {
    if (editorRef.current) {
      editorRef.current.setCursor(line, 1);
      editorRef.current.focus();
    }
  };


  const handleDiscardChanges = async () => {
    if (!isDirty) return;

    if (window.confirm(`Discard all changes to "${fileName}"? This cannot be undone.`)) {
      try {
        if (fileName !== 'untitled.adoc') {
          await ClearShadowFile(fileName);
          await performOpenFile(fileName);
        } else {
          setContent(INITIAL_CONTENT);
          editorRef.current?.setValue(INITIAL_CONTENT);
          setSavedContent(INITIAL_CONTENT);
          setIsDirty(false);
        }
      } catch (e) {
        console.error("Failed to discard changes:", e);
        alert("Failed to discard changes");
      }
    }
  };

  const handleProjectList = () => {
    setIsProjectListOpen(true);
  };

  const handleSelectProject = async (path: string) => {
    setProjectRoot(path);
    setIsProjectListOpen(false);
    try {
      // @ts-ignore
      await UpdateProjectLastOpened(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.undo();
      editorRef.current.focus();
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.redo();
      editorRef.current.focus();
    }
  };

  return (
    <div
      id="ndx-app-container"
      className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Top Bar */}
      {appLayoutMode === 'default' && (
        <div id="ndx-top-bar" className="h-6 bg-black flex items-center px-4 justify-between border-b border-gray-800 select-none z-20 text-[10px] text-gray-600">
          <div className="flex items-center gap-3">
            <button
              id="ndx-toggle-sidebar-btn"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={`hover:text-gray-300 transition-colors ${leftPanelOpen ? 'text-indigo-400' : ''}`}
              title="Toggle Sidebar"
              tabIndex={-1}
            >
              <Sidebar size={12} />
            </button>

            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-400 tracking-tight">
                ndxCraft
              </span>
              <div className="h-3 w-px bg-gray-800" />
              <div
                id="ndx-current-file-name"
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-900 px-2 py-0.5 rounded transition-colors"
                title="Double-click to discard changes and revert to saved"
                onDoubleClick={handleDiscardChanges}
              >
                {isDirty && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)] animate-pulse" />
                )}
                <span id="ndx-current-file-name-text" className={`truncate max-w-[300px] ${isDirty ? 'text-amber-500' : 'text-gray-500'}`}>
                  {fileName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ndx-toggle-assistant-btn"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${rightPanelOpen ? 'text-indigo-400' : ''}`}
              title="Toggle Assistant"
              tabIndex={-1}
            >
              <PanelRight size={12} />
              <span className="hidden sm:inline">Assistant</span>
            </button>
          </div>
        </div>
      )}

      {appLayoutMode === 'default' && (
        <Toolbar
          onInsert={handleInsert}
          onAIRequest={() => setRightPanelOpen(true)}
          onOpen={handleOpen}
          onSave={handleSave}
          onSettings={() => setIsPreferencesOpen(true)}
          onGitHub={handleGitHub}
          onProjectList={handleProjectList}
          gitIcon={gitIconSvg}
        />
      )}

      {/* Main Workspace */}
      <div id="ndx-main-workspace" className="flex-1 flex overflow-hidden relative">
        <PanelGroup direction="horizontal" autoSaveId="ndx-main-layout">

          {/* Left Sidebar Panel */}
          {appLayoutMode === 'default' && leftPanelOpen && (
            <>
              <Panel defaultSize={20} minSize={10} maxSize={40} id="left-panel" order={1}>
                <LeftSidebar
                  isOpen={leftPanelOpen}
                  activeTab={activeLeftTab}
                  onTabChange={setActiveLeftTab}
                  content={content}
                  onContentChange={(newContent) => {
                    setContent(newContent);
                    editorRef.current?.setValue(newContent);
                  }}
                  fileTree={fileTree}
                  onFileClick={handleOpenFile}
                  onNavigate={handleNavigate}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-gray-800 hover:bg-indigo-500 transition-colors z-10" />
            </>
          )}

          {/* Center Canvas Panel */}
          <Panel order={2} id="center-panel" minSize={20}>
            <PanelGroup direction="horizontal" autoSaveId="ndx-center-layout">

              {/* Editor Panel */}
              {(!focusedPane || focusedPane === 'editor' || focusedPane === 'none') && appLayoutMode !== 'fullscreen-visual' && (
                <Panel order={1} id="editor-panel" minSize={10} defaultSize={50} className="flex flex-col">
                  <div id="ndx-editor-pane" className="flex-1 flex flex-col min-w-0 h-full">
                    <Editor
                      ref={editorRef}
                      defaultValue={INITIAL_CONTENT}
                      onChange={setContent}
                      isFocused={focusedPane === 'editor' || appLayoutMode === 'fullscreen-code'}
                      onToggleFocus={() => {
                        if (appLayoutMode === 'fullscreen-code') {
                          setAppLayoutMode('default');
                          setFocusedPane('none');
                        } else {
                          setFocusedPane(focusedPane === 'editor' ? 'none' : 'editor');
                        }
                      }}
                      onCursorChange={handleCursorMove}
                    />
                  </div>
                </Panel>
              )}

              {/* Resizer between Editor and Preview */}
              {/* Only show handle if BOTH are visible */}
              {((!focusedPane || focusedPane === 'editor' || focusedPane === 'none') && appLayoutMode !== 'fullscreen-visual') &&
                ((!focusedPane || focusedPane === 'preview' || focusedPane === 'none') && appLayoutMode !== 'fullscreen-code') && (
                  <PanelResizeHandle className="w-1 bg-gray-800 hover:bg-indigo-500 transition-colors z-10" />
                )}

              {/* Preview Pane */}
              {(!focusedPane || focusedPane === 'preview' || focusedPane === 'none') && appLayoutMode !== 'fullscreen-code' && (
                <Panel order={2} id="preview-panel" minSize={10} defaultSize={50} className="flex flex-col">
                  <div id="ndx-preview-pane" className="flex-1 flex flex-col min-w-0 h-full bg-white">
                    <Preview
                      content={content}
                      isFocused={focusedPane === 'preview' || appLayoutMode === 'fullscreen-visual'}
                      onToggleFocus={() => {
                        if (appLayoutMode === 'fullscreen-visual') {
                          setAppLayoutMode('default');
                          setFocusedPane('none');
                        } else {
                          setFocusedPane(focusedPane === 'preview' ? 'none' : 'preview');
                        }
                      }}
                      cursorLine={cursorLine}
                      isActive={activeEditor === 'visual'}
                      onActivate={() => setActiveEditor('visual')}
                      focusTrigger={focusTrigger}
                      isEditing={isVisualEditEnabled}
                      onToggleEditing={() => setIsVisualEditEnabled(!isVisualEditEnabled)}
                    />
                  </div>
                </Panel>
              )}

            </PanelGroup>
          </Panel>

          {/* Right Panel (AIAssistant) */}
          {rightPanelOpen && (
            <>
              <PanelResizeHandle className="w-1 bg-gray-800 hover:bg-indigo-500 transition-colors z-10" />
              <Panel defaultSize={20} minSize={10} maxSize={40} id="right-panel" order={3}>
                <div className="h-full w-full bg-gray-900">
                  <AIAssistant
                    isOpen={rightPanelOpen}
                    onClose={() => setRightPanelOpen(false)}
                    currentContent={content}
                    onApply={handleAIApply}
                  />
                </div>
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>

      {/* Footer */}
      <div id="ndx-footer" className="h-6 bg-black border-t border-gray-800 flex items-center px-4 text-[10px] text-gray-600 justify-between z-20">
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

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        projectRoot={projectRoot}
        onProjectRootChange={setProjectRoot}
        onPreferencesChanged={async () => {
          // Reload Git Icon
          const iconIdRaw = await GetPreference("git_client_icon_id");
          if (iconIdRaw) {
            const iconId = iconIdRaw as string;
            try {
              const icons = await GetGitIcons();
              if (icons && icons[iconId]) {
                setGitIconSvg(icons[iconId]);
              } else if (iconId === 'default') {
                setGitIconSvg(undefined);
              }
            } catch (e) { console.error(e); }
          }
        }}
      />

      <Dialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription className="text-gray-400">
              You have unsaved changes in <strong>{fileName}</strong>. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsUnsavedDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleUnsavedDialogAction('discard')}>Discard</Button>
            <Button onClick={() => handleUnsavedDialogAction('save')}>Save & Open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectListModal
        isOpen={isProjectListOpen}
        onClose={() => setIsProjectListOpen(false)}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
};

export default App;
