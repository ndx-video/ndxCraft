import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Folder, Plus, X } from 'lucide-react';
import { GetProjects, AddProject, RemoveProject, SelectDirectory } from '../../wailsjs/go/main/App';

interface Project {
  path: string;
  name: string;
  lastOpened: string;
}

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (path: string) => void;
}

const ProjectListModal: React.FC<ProjectListModalProps> = ({ isOpen, onClose, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      // @ts-ignore
      const list = await GetProjects();
      setProjects(list || []);
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  };

  const handleAddProject = async () => {
    try {
      // @ts-ignore
      const path = await SelectDirectory();
      if (path) {
        // @ts-ignore
        await AddProject(path);
        await loadProjects();
      }
    } catch (e) {
      console.error("Failed to add project:", e);
    }
  };

  const handleRemoveProject = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      // @ts-ignore
      await RemoveProject(path);
      await loadProjects();
    } catch (e) {
      console.error("Failed to remove project:", e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle>Select Project</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {projects.map((p) => (
            <div
              key={p.path}
              onClick={() => onSelectProject(p.path)}
              className="group relative flex flex-col items-center justify-center p-4 rounded-lg border border-gray-800 bg-gray-800/50 hover:bg-gray-800 hover:border-indigo-500/50 cursor-pointer transition-all aspect-square"
              title={p.path}
            >
              <button
                onClick={(e) => handleRemoveProject(e, p.path)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from list"
              >
                <X size={14} />
              </button>
              <Folder size={40} className="text-indigo-400 mb-3" />
              <div className="text-sm font-medium text-center break-all line-clamp-2 w-full">{p.name}</div>
              <div className="text-[10px] text-gray-500 mt-1 truncate max-w-full px-2 opacity-50">{p.path}</div>
            </div>
          ))}

          <button
            onClick={handleAddProject}
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800/30 transition-all aspect-square text-gray-500 hover:text-gray-300"
          >
            <Plus size={32} className="mb-2" />
            <span className="text-xs font-medium">Add Project</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectListModal;
