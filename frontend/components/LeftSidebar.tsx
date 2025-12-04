import React from 'react';
import { Folder, ListTree, File, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LeftTab } from '../types';
import { parseBlocks, moveBlock, SectionBlock } from '../services/structureService';

interface LeftSidebarProps {
  isOpen: boolean;
  activeTab: LeftTab;
  onTabChange: (tab: LeftTab) => void;
  content: string;
  onContentChange: (newContent: string) => void;
  files?: string[]; // Mock files
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  isOpen, activeTab, onTabChange, content, onContentChange 
}) => {
  if (!isOpen) return null;

  const blocks = parseBlocks(content);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newContent = moveBlock(content, index, direction);
    onContentChange(newContent);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 transition-all duration-300">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => onTabChange(LeftTab.FILES)}
          className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 ${
            activeTab === LeftTab.FILES ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Folder size={14} /> Files
        </button>
        <button
          onClick={() => onTabChange(LeftTab.OUTLINE)}
          className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 ${
            activeTab === LeftTab.OUTLINE ? 'bg-gray-800 text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <ListTree size={14} /> Structure
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === LeftTab.FILES && (
          <div className="flex flex-col gap-1 text-sm text-gray-400">
            <div className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer text-gray-200">
               <ChevronDown size={14} /> 
               <Folder size={14} className="text-indigo-400" />
               <span>Project Root</span>
            </div>
            <div className="pl-6 flex flex-col gap-1">
              <div className="flex items-center gap-2 p-1 bg-gray-800 rounded cursor-pointer text-white">
                <File size={14} /> <span>readme.adoc</span>
              </div>
              <div className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer">
                <File size={14} /> <span>documentation.adoc</span>
              </div>
              <div className="flex items-center gap-2 p-1 hover:bg-gray-800 rounded cursor-pointer">
                <File size={14} /> <span>styles.css</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === LeftTab.OUTLINE && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-gray-500 uppercase font-bold px-2 py-1">Drag & Reorder</p>
            {blocks.map((block, idx) => (
              <div key={idx} className="group flex items-center gap-2 p-2 rounded bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all">
                 <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMove(idx, 'up')} className="text-gray-500 hover:text-white p-0.5"><ArrowUp size={10} /></button>
                    <button onClick={() => handleMove(idx, 'down')} className="text-gray-500 hover:text-white p-0.5"><ArrowDown size={10} /></button>
                 </div>
                 <div 
                   className="flex-1 text-sm text-gray-300 truncate cursor-pointer select-none"
                   style={{ paddingLeft: `${Math.max(0, (block.level - 1) * 12)}px` }}
                 >
                    {block.level === 0 ? <span className="text-gray-500 italic">Preamble</span> : block.title}
                 </div>
                 <div className="text-[10px] text-gray-600 font-mono">{block.level > 0 ? `H${block.level}` : 'PRE'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
