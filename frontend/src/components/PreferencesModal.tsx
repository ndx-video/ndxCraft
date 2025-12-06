/**
 * PreferencesModal Component
 * 
 * Location: Modal dialog (overlay).
 * Purpose: Allows users to configure application settings such as 
 *          Project Root, Theme, and other global preferences.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Monitor, Keyboard, Type, Palette, FolderOpen, GitBranch, Plus, Trash2 } from 'lucide-react';
import { SelectDirectory, GetAllPreferences, SavePreference, SelectFile, GetGitIcons, SelectExecutable, SelectSvgFile, ReadFile, AddGitIcon, DeleteGitIcon } from '../../wailsjs/go/main/App';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectRoot: string;
  onProjectRootChange: (path: string) => void;
  onPreferencesChanged?: () => void;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, projectRoot, onProjectRootChange, onPreferencesChanged }) => {
  const [autoSave, setAutoSave] = React.useState(true);
  const [spellCheck, setSpellCheck] = React.useState(true);
  const [showHiddenFiles, setShowHiddenFiles] = React.useState(false);

  const [fontFamily, setFontFamily] = React.useState("Inter, sans-serif");
  const [fontSize, setFontSize] = React.useState(16);
  const [lineHeight, setLineHeight] = React.useState(1.6);
  const [theme, setTheme] = React.useState("Midnight");

  // Git Settings
  const [gitClientPath, setGitClientPath] = React.useState("");
  const [gitClientArgs, setGitClientArgs] = React.useState("%project_path%");
  const [gitClientIconId, setGitClientIconId] = React.useState("default");

  const [availableIcons, setAvailableIcons] = React.useState<Record<string, string>>({});

  const argsInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadPreferences();
      loadIcons();
    }
  }, [isOpen]);

  const loadIcons = async () => {
    try {
      const icons = await GetGitIcons();
      setAvailableIcons(icons || {});
    } catch (err) {
      console.error("Failed to load git icons", err);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await GetAllPreferences();
      if (prefs) {
        if (prefs.autoSave !== undefined) setAutoSave(prefs.autoSave as boolean);
        if (prefs.spellCheck !== undefined) setSpellCheck(prefs.spellCheck as boolean);
        if (prefs.showHiddenFiles !== undefined) setShowHiddenFiles(prefs.showHiddenFiles as boolean);

        if (prefs.fontFamily) setFontFamily(prefs.fontFamily as string);
        if (prefs.fontSize) setFontSize(Number(prefs.fontSize));
        if (prefs.lineHeight) setLineHeight(Number(prefs.lineHeight));
        if (prefs.theme) setTheme(prefs.theme as string);

        if (prefs.git_client_path) setGitClientPath(prefs.git_client_path as string);
        if (prefs.git_client_args) setGitClientArgs(prefs.git_client_args as string);
        if (prefs.git_client_icon_id) setGitClientIconId(prefs.git_client_icon_id as string);
      }
    } catch (err) {
      console.error("Failed to load preferences", err);
    }
  };

  const handleSave = async () => {
    try {
      await SavePreference("autoSave", autoSave);
      await SavePreference("spellCheck", spellCheck);
      await SavePreference("showHiddenFiles", showHiddenFiles);

      await SavePreference("fontFamily", fontFamily);
      await SavePreference("fontSize", fontSize);
      await SavePreference("lineHeight", lineHeight);
      await SavePreference("theme", theme);

      await SavePreference("git_client_path", gitClientPath);
      await SavePreference("git_client_args", gitClientArgs);
      await SavePreference("git_client_icon_id", gitClientIconId);

      // projectRoot is saved via App when it changes, or we can save it here if we want to be sure
      await SavePreference("projectRoot", projectRoot);

      if (onPreferencesChanged) onPreferencesChanged();
      onClose();
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  };

  const handleBrowseRoot = async () => {
    try {
      const path = await SelectDirectory();
      if (path) {
        onProjectRootChange(path);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBrowseGitClient = async () => {
    try {
      const path = await SelectExecutable();
      if (path) {
        setGitClientPath(path);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVariableClick = (variable: string) => {
    if (argsInputRef.current) {
      const input = argsInputRef.current;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      let newText = gitClientArgs;
      if (start !== null && end !== null) {
        newText = gitClientArgs.substring(0, start) + variable + gitClientArgs.substring(end);
        setGitClientArgs(newText);

        // Restore focus and cursor
        setTimeout(() => {
          input.focus();
          const newCursorPos = start + variable.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      } else {
        setGitClientArgs(prev => prev + variable);
        input.focus();
      }
    } else {
      setGitClientArgs(prev => prev + variable);
    }
  };

  const handleAddIcon = async () => {
    try {
      const path = await SelectSvgFile();
      if (!path) return;

      const content = await ReadFile(path);
      if (!content.trim().startsWith("<svg") && !content.includes("http://www.w3.org/2000/svg")) {
        alert("Selected file does not appear to be a valid SVG");
        return;
      }

      await AddGitIcon(content);
      loadIcons();
    } catch (err: any) {
      console.error("Failed to add icon", err);
      alert(err.message || "Failed to add icon");
    }
  };

  const handleDeleteIcon = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      if (['default', 'tower', 'gitlab'].includes(id)) {
        alert("Cannot delete default icons");
        return;
      }
      if (id === gitClientIconId) {
        setGitClientIconId("default");
      }
      await DeleteGitIcon(id);
      loadIcons();
    } catch (err) {
      console.error("Failed to delete icon", err);
      alert("Failed to delete icon");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-950 border-gray-800 text-gray-100 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
        <DialogHeader id="ndx-prefs-header">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Preferences
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Customize your writing experience.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-4">
          <TabsList id="ndx-prefs-tabs-list" className="grid w-full grid-cols-5 bg-gray-900/50 p-1">
            <TabsTrigger id="ndx-prefs-tab-general" value="general" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Monitor className="w-4 h-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger id="ndx-prefs-tab-editor" value="editor" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Type className="w-4 h-4 mr-2" /> Editor
            </TabsTrigger>
            <TabsTrigger id="ndx-prefs-tab-theme" value="theme" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Palette className="w-4 h-4 mr-2" /> Theme
            </TabsTrigger>
            <TabsTrigger id="ndx-prefs-tab-git" value="git" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <GitBranch className="w-4 h-4 mr-2" /> Git
            </TabsTrigger>
            <TabsTrigger id="ndx-prefs-tab-shortcuts" value="shortcuts" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Keyboard className="w-4 h-4 mr-2" /> Shortcuts
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6 min-h-[300px]">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors space-y-3">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Project Root</Label>
                    <p className="text-sm text-gray-500">The root directory for your project files and git repository.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="ndx-prefs-project-root"
                      value={projectRoot || "Default (./content)"}
                      readOnly
                      className="bg-gray-900 border-gray-700 text-gray-400 font-mono text-sm"
                    />
                    <Button onClick={handleBrowseRoot} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                      <FolderOpen className="w-4 h-4 mr-2" /> Browse
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Auto-Save</Label>
                    <p className="text-sm text-gray-500">Automatically save your work every few minutes.</p>
                  </div>
                  <Switch id="ndx-prefs-autosave" checked={autoSave} onCheckedChange={setAutoSave} className="data-[state=checked]:bg-indigo-600" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Spell Check</Label>
                    <p className="text-sm text-gray-500">Highlight spelling errors as you type.</p>
                  </div>
                  <Switch id="ndx-prefs-spellcheck" checked={spellCheck} onCheckedChange={setSpellCheck} className="data-[state=checked]:bg-indigo-600" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Show Hidden Files</Label>
                    <p className="text-sm text-gray-500">Show dotfiles in the file explorer.</p>
                  </div>
                  <Switch id="ndx-prefs-hidden-files" checked={showHiddenFiles} onCheckedChange={setShowHiddenFiles} className="data-[state=checked]:bg-indigo-600" />
                </div>
              </div>
            </TabsContent>

            {/* Editor Tab */}
            <TabsContent value="editor" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-family" className="text-right text-gray-400">
                    Font Family
                  </Label>
                  <Input
                    id="font-family"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-size" className="text-right text-gray-400">
                    Font Size
                  </Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="line-height" className="text-right text-gray-400">
                    Line Height
                  </Label>
                  <Input
                    id="line-height"
                    type="number"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                    className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Theme Tab */}
            <TabsContent value="theme" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-4">
                {['Midnight', 'Nebula', 'Sunset'].map((t) => (
                  <div
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`cursor-pointer group relative overflow-hidden rounded-xl border transition-all ${theme === t ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-800 hover:border-indigo-500'}`}
                  >
                    <div className={`h-24 bg-gradient-to-br ${t === 'Midnight' ? 'from-gray-900 to-black' :
                      t === 'Nebula' ? 'from-indigo-900 to-purple-900' :
                        'from-orange-900 to-red-900'
                      }`} />
                    <div className="p-3 bg-gray-900">
                      <p className={`font-medium transition-colors ${theme === t ? 'text-indigo-400' : 'text-gray-200 group-hover:text-indigo-400'}`}>{t}</p>
                    </div>
                    {t === 'Midnight' && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Git Tab */}
            <TabsContent value="git" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div id="git-client-area" className="space-y-4">
                <div id="git-client-path-area" className="p-0">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Git Client Path</Label>
                    <p className="text-sm text-gray-500">Path to your preferred Git executable (e.g., Git Tower, SourceTree). Leave empty for default.</p>
                  </div>
                  <div id="git-client-path" className="flex gap-2">
                    <Input
                      value={gitClientPath}
                      onChange={(e) => setGitClientPath(e.target.value)}
                      placeholder="e.g., C:\Program Files\Git Tower\Git Tower.exe"
                      className="bg-gray-900 border-gray-700 text-gray-200 font-mono text-sm"
                    />
                    <Button onClick={handleBrowseGitClient} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                      <FolderOpen className="w-4 h-4 mr-2" /> Browse
                    </Button>
                  </div>
                </div>

                <div id="git-client-args" className="p-0">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">launch Arguments</Label>
                    <p className="text-sm text-gray-500">Arguments to pass to the client.</p>
                  </div>
                  <Input
                    ref={argsInputRef}
                    value={gitClientArgs}
                    onChange={(e) => setGitClientArgs(e.target.value)}
                    placeholder="%project_path%"
                    className="bg-gray-900 border-gray-700 text-gray-200 font-mono text-sm"
                  />
                  <div className="text-xs text-gray-500">
                    Available variables:
                    <span
                      className="text-indigo-400 cursor-pointer hover:underline ml-1"
                      onClick={() => handleVariableClick("%project_path%")}
                      title="Click to insert"
                    >
                      %project_path%
                    </span>
                  </div>
                </div>

                <div id="toolbar-icon-area" className="p-0 rounded-lg">
                  <div id="toolbar-icon-header" className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Toolbar Icon</Label>
                    <p className="text-sm text-gray-500">Select the icon to display in the toolbar or add your own SVG.</p>
                  </div>

                  <div id="toolbar-icon-grid" className="grid grid-cols-6 gap-2 h-200 overflow-y-auto p-0 rounded-lg border-gray-800">
                    {Object.entries(availableIcons).map(([id, svg]) => (
                      <div
                        key={id}
                        onClick={() => setGitClientIconId(id)}
                        className={`
                          flex items-center justify-center p-0 rounded-lg cursor-pointer transition-all aspect-square
                          ${gitClientIconId === id
                            ? 'bg-indigo-900/40 border-indigo-500 ring-1'
                            : 'hover:bg-gray-800 hover:border-gray-700'}
                        `}
                      >
                        <div
                          className="w-6 h-6 text-gray-100 [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: svg }}
                        />

                        {!['default', 'tower', 'gitlab'].includes(id) && (
                          <button
                            onClick={(e) => handleDeleteIcon(e, id)}
                            className="absolute -top-1 -right-1 p-1 bg-red-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            title="Delete Icon"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div
                      onClick={handleAddIcon}
                      className="flex flex-col items-center justify-center p-0 rounded-lg border border-dashed border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 cursor-pointer transition-all aspect-square text-gray-500 hover:text-indigo-400 gap-1"
                      title="Add Custom Icon (SVG)"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-medium">Add</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Shortcuts Tab */}
            <TabsContent value="shortcuts" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                {[
                  { label: 'Save File', keys: ['Ctrl', 'S'] },
                  { label: 'Open File', keys: ['Ctrl', 'O'] },
                  { label: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
                  { label: 'AI Assistant', keys: ['Ctrl', 'I'] },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded bg-gray-900/30 border border-gray-800">
                    <span className="text-gray-300">{shortcut.label}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map(k => (
                        <kbd key={k} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 border border-gray-700 font-mono">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button id="ndx-prefs-cancel-btn" variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
            Cancel
          </Button>
          <Button id="ndx-prefs-save-btn" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesModal;
