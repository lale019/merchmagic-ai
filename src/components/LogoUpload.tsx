import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface LogoUploadProps {
  onUpload: (base64: string) => void;
  onClear: () => void;
  currentLogo: string | null;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ onUpload, onClear, currentLogo }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-full">
      {currentLogo ? (
        <div className="relative group aspect-square max-w-[240px] mx-auto rounded-[40px] overflow-hidden border border-m3-outline/10 bg-m3-surface-variant/30 shadow-xl">
          <img src={currentLogo} alt="Logo Preview" className="w-full h-full object-contain p-8" />
          <button
            onClick={onClear}
            className="absolute top-4 right-4 p-2 bg-red-600 text-white rounded-full shadow-lg active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          className={`
            relative border-2 border-dashed rounded-[32px] p-8 transition-all duration-500
            ${isDragging ? 'border-m3-primary bg-m3-primary/5' : 'border-m3-outline/20 bg-m3-surface-variant/30 hover:border-m3-primary/50'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-m3-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-m3-primary" size={24} />
            </div>
            <h3 className="text-base font-bold text-m3-on-surface tracking-tight">Upload Logo</h3>
            <p className="text-[10px] text-m3-on-surface-variant mt-1 font-medium">Tap to browse or drag & drop</p>
          </div>
        </div>
      )}
    </div>
  );
};
