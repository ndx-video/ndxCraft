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
import { Settings, Monitor, Keyboard, Type, Palette } from 'lucide-react';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-950 border-gray-800 text-gray-100 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Preferences
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Customize your writing experience.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 p-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Monitor className="w-4 h-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="editor" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Type className="w-4 h-4 mr-2" /> Editor
            </TabsTrigger>
            <TabsTrigger value="theme" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Palette className="w-4 h-4 mr-2" /> Theme
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="data-[state=active]:bg-gray-800 data-[state=active]:text-indigo-400">
              <Keyboard className="w-4 h-4 mr-2" /> Shortcuts
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6 min-h-[300px]">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Auto-Save</Label>
                    <p className="text-sm text-gray-500">Automatically save your work every few minutes.</p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-indigo-600" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-indigo-500/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium text-gray-200">Spell Check</Label>
                    <p className="text-sm text-gray-500">Highlight spelling errors as you type.</p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-indigo-600" />
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
                  <Input id="font-family" defaultValue="Inter, sans-serif" className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="font-size" className="text-right text-gray-400">
                    Font Size
                  </Label>
                  <Input id="font-size" type="number" defaultValue="16" className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="line-height" className="text-right text-gray-400">
                    Line Height
                  </Label>
                  <Input id="line-height" type="number" step="0.1" defaultValue="1.6" className="col-span-3 bg-gray-900 border-gray-700 focus:border-indigo-500 text-gray-200" />
                </div>
              </div>
            </TabsContent>

            {/* Theme Tab */}
            <TabsContent value="theme" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-4">
                {['Midnight', 'Nebula', 'Sunset'].map((theme) => (
                  <div key={theme} className="cursor-pointer group relative overflow-hidden rounded-xl border border-gray-800 hover:border-indigo-500 transition-all">
                    <div className={`h-24 bg-gradient-to-br ${theme === 'Midnight' ? 'from-gray-900 to-black' :
                        theme === 'Nebula' ? 'from-indigo-900 to-purple-900' :
                          'from-orange-900 to-red-900'
                      }`} />
                    <div className="p-3 bg-gray-900">
                      <p className="font-medium text-gray-200 group-hover:text-indigo-400 transition-colors">{theme}</p>
                    </div>
                    {theme === 'Midnight' && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    )}
                  </div>
                ))}
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
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
            Cancel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreferencesModal;
