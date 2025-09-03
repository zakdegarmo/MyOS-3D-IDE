

import React, { useRef } from 'react';
// FIX: Added import for THREE to resolve namespace error.
import * as THREE from 'three';
import { TextureIcon, TrashIcon, UploadIcon } from '../components/icons';
import { Button } from '../components/Button';

interface AssetsPanelProps {
  textures: Record<string, { name: string; texture: THREE.Texture; dataUrl: string }>;
  onImportTexture: (file: File) => void;
  onDeleteTexture: (textureId: string) => void;
  onImportModel: (file: File) => void;
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ textures, onImportTexture, onDeleteTexture, onImportModel }) => {
  const textureInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, callback: (file: File) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      callback(file);
    }
    event.target.value = ''; // Reset input
  };

  return (
    <div className="w-full h-full p-4 flex flex-col overflow-y-auto">
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #1D232A; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #718096; }
      `}</style>
      <header className="mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-brand-secondary">Assets Manager</h2>
          <p className="text-xs text-base-300">Import and manage models and textures.</p>
      </header>
      
      <div className="flex-grow space-y-4 custom-scrollbar pr-2">
        <div className="bg-bg-dark p-3 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-brand-secondary mb-2">Models</h3>
            <Button variant="secondary" className="w-full !py-2" onClick={() => modelInputRef.current?.click()}>
                <UploadIcon />
                Import Model (.glb)
            </Button>
        </div>
        
        <div className="bg-bg-dark p-3 rounded-lg border border-gray-700/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-brand-secondary flex items-center space-x-2">
                <TextureIcon className="!text-brand-secondary h-5 w-5" />
                <span>Textures</span>
            </h3>
            <Button variant="secondary" className="!px-3 !py-1.5" onClick={() => textureInputRef.current?.click()}>
              Import
            </Button>
          </div>
          
          <div className="mt-2 space-y-2">
            {Object.keys(textures).length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-4">No textures imported.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(textures).map(([id, { name, dataUrl }]) => (
                  <div key={id} className="group relative aspect-square bg-bg-light rounded-md border border-gray-600 overflow-hidden">
                    <img src={dataUrl} alt={name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                       <p className="text-xs text-white break-all leading-tight">{name}</p>
                       <button 
                         onClick={() => onDeleteTexture(id)} 
                         className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white hover:bg-red-500"
                         title="Delete Texture"
                        >
                         <TrashIcon className="h-3 w-3" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <input
        type="file"
        ref={textureInputRef}
        onChange={(e) => handleFileChange(e, onImportTexture)}
        accept="image/png, image/jpeg"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
       <input
        type="file"
        ref={modelInputRef}
        onChange={(e) => handleFileChange(e, onImportModel)}
        accept=".glb"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
};