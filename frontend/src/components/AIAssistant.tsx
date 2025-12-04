import React, { useState } from 'react';
import { X, Send, Sparkles, Loader2, Check } from 'lucide-react';
import { GenerateContent, FixGrammar } from '../../wailsjs/go/main/App';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onApply: (text: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, currentContent, onApply }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // If closed, return nothing (or we could render hidden for animations, but null is simpler for now)
  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const generated = await GenerateContent(prompt, currentContent.slice(0, 1000));
      setResult(generated);
    } catch (e) {
      console.error(e);
      setResult("Error generating content. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixGrammar = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const textToFix = prompt || currentContent;
      if (!textToFix) return;

      const fixed = await FixGrammar(textToFix);
      setResult(fixed);
    } catch (e) {
      console.error(e);
      setResult("Error fixing grammar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 h-full">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <Sparkles className="text-indigo-400" size={16} />
          ndxCraft AI
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Instructions</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to write..."
            className="w-full h-32 bg-gray-950 border border-gray-800 rounded p-3 text-sm text-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder-gray-700"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            Generate
          </button>
          <button
            onClick={handleFixGrammar}
            disabled={isLoading}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-2 rounded text-xs font-bold uppercase tracking-wide"
          >
            Fix Grammar
          </button>
        </div>

        {result && (
          <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 border-t border-gray-800 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Suggestion</label>
              <button
                onClick={() => onApply(result)}
                className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900 hover:bg-green-900/50 flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> Insert
              </button>
            </div>
            <div className="bg-black p-3 rounded border border-gray-800 text-xs font-mono text-gray-400 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}
      </div>

      <div className="p-2 text-[10px] text-gray-600 text-center border-t border-gray-800">
        Gemini 2.5 Flash
      </div>
    </div>
  );
};

export default AIAssistant;
