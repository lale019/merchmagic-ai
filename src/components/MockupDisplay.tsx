import React, { useState } from 'react';
import { Download, Sparkles, RefreshCw, Wand2, Share2 } from 'lucide-react';
import { GeneratedMockup } from '../types';

interface MockupDisplayProps {
  mockup: GeneratedMockup | null;
  isGenerating: boolean;
  onEdit: (instruction: string) => void;
  isEditing: boolean;
}

export const MockupDisplay: React.FC<MockupDisplayProps> = ({ 
  mockup, 
  isGenerating, 
  onEdit,
  isEditing
}) => {
  const [editPrompt, setEditPrompt] = useState('');

  const handleDownload = () => {
    if (!mockup) return;
    const link = document.createElement('a');
    link.href = mockup.imageUrl;
    link.download = `mockup-${mockup.productType}-${Date.now()}.png`;
    link.click();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPrompt.trim()) {
      onEdit(editPrompt);
      setEditPrompt('');
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative aspect-square w-full rounded-[32px] overflow-hidden bg-m3-surface-variant/30 border border-m3-outline/10 shadow-xl group">
        {isGenerating || isEditing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-m3-surface/80 backdrop-blur-md z-10">
            <div className="relative">
              <RefreshCw className="w-12 h-12 text-m3-primary animate-spin" strokeWidth={1.5} />
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-m3-secondary animate-pulse" />
            </div>
            <p className="mt-4 text-[10px] font-bold text-m3-on-surface-variant tracking-[0.2em] uppercase">
              {isEditing ? 'REFINING...' : 'CRAFTING...'}
            </p>
          </div>
        ) : mockup ? (
          <img
            src={mockup.imageUrl}
            alt="Generated Mockup"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-m3-on-surface-variant/20">
            <Wand2 size={64} strokeWidth={1} />
            <p className="mt-2 text-xs font-bold tracking-tight">Your creation will appear here</p>
          </div>
        )}

        {mockup && !isGenerating && !isEditing && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm text-m3-primary rounded-xl shadow-lg active:scale-90 transition-transform"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'My Merch Mockup',
                    text: 'Check out this mockup I created with MerchMagic AI!',
                    url: window.location.href,
                  });
                }
              }}
              className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm text-m3-primary rounded-xl shadow-lg active:scale-90 transition-transform"
            >
              <Share2 size={18} />
            </button>
          </div>
        )}
      </div>

      {mockup && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[9px] font-bold text-m3-primary uppercase tracking-[0.2em] px-1">
            <Sparkles size={12} />
            <span>AI Magic Edit</span>
          </div>
          <form onSubmit={handleEditSubmit} className="relative group">
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., 'Change to black'"
              className="w-full h-12 px-5 pr-14 bg-m3-surface-variant/30 border border-m3-outline/10 rounded-[24px] focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none transition-all text-sm shadow-sm placeholder:text-m3-on-surface-variant/40"
              disabled={isEditing}
            />
            <button
              type="submit"
              disabled={!editPrompt.trim() || isEditing}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-m3-primary hover:bg-m3-primary hover:text-white rounded-xl disabled:opacity-50 transition-all duration-300"
            >
              <Wand2 size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
