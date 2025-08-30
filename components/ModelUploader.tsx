
import React, { useCallback, useState } from 'react';
import { ModelIcon, LoadingIcon } from './icons';

interface ModelUploaderProps {
  onModelFileChange: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export const ModelUploader: React.FC<ModelUploaderProps> = ({ onModelFileChange, isLoading, error }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      onModelFileChange(files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [onModelFileChange]);


  return (
    <div className="space-y-2">
       <label className="block text-sm font-medium text-base-200">
        Step 2: Add 3D Models to Scene
      </label>
      <label
        htmlFor="model-input"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-32 px-4 text-center bg-bg-dark border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-700 hover:border-gray-500'}`}
      >
        {isLoading ? <LoadingIcon /> : <ModelIcon />}
        <p className="mt-2 text-sm text-gray-400">
          <span className="font-semibold text-brand-secondary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">.GLB models</p>
        <input
          id="model-input"
          type="file"
          accept=".glb"
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
          disabled={isLoading}
        />
      </label>
      {error && <p className="text-red-400 text-xs text-center mt-1">{error}</p>}
    </div>
  );
};
