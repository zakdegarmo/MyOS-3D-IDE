import React, { useState, useEffect, useRef } from 'react';
import { EditingRelation } from '../types';

interface FunctionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: string) => void;
  onAnalyzeCode: (code: string) => void;
  relation: EditingRelation | null;
  existingScript?: string;
}

const BOILERPLATE = `// This script runs in a secure environment.
// You have access to a 'sceneApi' to interact with the main application.

// 'target' is the full object data for the currently selected object.
// 'sceneApi.log(message)' sends a message to the Ontological Console.
// 'sceneApi.updateTransform(target.id, updates)' modifies an object's position, rotation, or scale.
// 'sceneApi.updatePrimitiveParameters(target.id, updates)' modifies a primitive's geometry.

async function execute(target, sceneApi) {
  sceneApi.log(\`Running custom script for target: \${target.id}\`);

  // Example: Double the scale of the target object
  sceneApi.updateTransform(target.id, (currentTransform) => ({
    ...currentTransform,
    scale: [
      (currentTransform.scale?.[0] ?? 1) * 2,
      (currentTransform.scale?.[1] ?? 1) * 2,
      (currentTransform.scale?.[2] ?? 1) * 2,
    ]
  }));

  sceneApi.log('Example action: Doubled scale.');

  // Add your custom logic below.
}

// The execute function is called by the system.
execute(target, sceneApi);
`;

const conceptMapping: Record<string, { description: string; dataAccess: string }> = {
    'Self': { description: "The object's core identity, its unique key and type.", dataAccess: "The 'target' object itself, e.g., `target.id`." },
    'Thought': { description: "Represents user-defined data or metadata attached to the object.", dataAccess: "`target.gltfJson.userData` (for models)." },
    'Logic': { description: "The object's physical state: transforms and primitive geometry parameters.", dataAccess: "Use `sceneApi.updateTransform` and `sceneApi.updatePrimitiveParameters`." },
    'Unity': { description: "The object's connections and relationships to other objects in the scene.", dataAccess: "Read relationships from main panel. API for updates coming soon." },
    'Existence': { description: "The object's manifest presence and its raw geometry data.", dataAccess: "`target.glyphData`, `target.gltfJson`, `target.parameters`, etc." },
    'Improvement': { description: "The object's modifiers, such as Twist, Bend, and Taper.", dataAccess: "`target.modifiers` (read-only). API for updates coming soon." },
    'Mastery': { description: "Represents achieving a perfected state, often through complex or chained operations.", dataAccess: "Achieved via combinations of other API calls." },
    'Resonance': { description: "The object's specific ontological parameters, often linked to materials or special properties.", dataAccess: "Read from `target.ontologicalParameters`. API for updates coming soon." },
    'Transcendence': { description: "Actions that go beyond simple modifications, potentially changing the object's fundamental nature.", dataAccess: "Achieved via advanced script logic, e.g., deleting and creating new objects." },
    'Nothing/Everything': { description: "The total context of the scene or reality.", dataAccess: "Not directly accessible as an object." }
};


export const FunctionEditorModal: React.FC<FunctionEditorModalProps> = ({ isOpen, onClose, onSave, onAnalyzeCode, relation, existingScript }) => {
  const [code, setCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (relation) {
      setCode(existingScript || BOILERPLATE);
    }
  }, [relation, existingScript]);

  if (!isOpen || !relation) return null;
  
  const handleSave = () => {
    onSave(code);
  };
  
  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCode(text);
      };
      reader.readAsText(file);
    }
     if (event.target) {
        event.target.value = '';
    }
  };
  
  const sourceInfo = conceptMapping[relation.row.replace(/\//g, 'Or')];
  const targetInfo = conceptMapping[relation.col.replace(/\//g, 'Or')];

  return (
    <div
      className="fixed inset-0 bg-bg-dark/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="function-editor-title"
    >
        <input type="file" ref={fileInputRef} onChange={handleFileLoad} accept=".js" style={{ display: 'none' }} />
      <div
        className="bg-bg-light w-full max-w-5xl h-full max-h-[90vh] rounded-lg shadow-2xl border border-gray-700/50 flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between mb-4 flex-shrink-0">
            <div>
                 <h2 id="function-editor-title" className="text-xl font-bold text-brand-secondary">Function Editor</h2>
                 <p className="text-sm text-base-300 font-mono mt-1">
                    Editing: <span className="text-brand-primary">{relation.row}</span> &rarr; {relation.name} &rarr; <span className="text-brand-primary">{relation.col}</span>
                 </p>
            </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-grow flex space-x-4 overflow-hidden">
            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-2/3 flex-grow bg-bg-dark border-2 border-gray-700 rounded-lg text-white font-mono text-sm p-4 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200 resize-none"
                placeholder="Write your JavaScript function here..."
                spellCheck="false"
                aria-label="Function code editor"
            />
             <div className="w-1/3 flex-shrink-0 bg-bg-dark p-3 rounded-md border border-gray-700/50 overflow-y-auto">
                <h3 className="text-lg font-semibold text-brand-secondary mb-2">Context</h3>
                {sourceInfo && (
                    <div className="mb-3 p-2 bg-bg-light rounded">
                        <h4 className="font-bold text-base-200">Source: {relation.row}</h4>
                        <p className="text-xs text-base-300">{sourceInfo.description}</p>
                        <p className="text-xs text-brand-secondary font-mono mt-1 bg-bg-dark p-1 rounded">{sourceInfo.dataAccess}</p>
                    </div>
                )}
                {targetInfo && (
                     <div className="mb-3 p-2 bg-bg-light rounded">
                        <h4 className="font-bold text-base-200">Target: {relation.col}</h4>
                        <p className="text-xs text-base-300">{targetInfo.description}</p>
                        <p className="text-xs text-brand-secondary font-mono mt-1 bg-bg-dark p-1 rounded">{targetInfo.dataAccess}</p>
                    </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-600">
                    <h4 className="font-bold text-base-200">Available in Script</h4>
                    <p className="text-xs text-base-300">The full target object is passed as the first argument, named <span className="font-mono text-brand-secondary">'target'</span>. You can inspect its properties.</p>
                </div>
            </div>
        </div>


        <footer className="mt-4 flex-shrink-0 flex items-center justify-between">
            <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-md font-semibold text-sm bg-gray-700 text-base-100 hover:bg-gray-600 transition-colors"
            >
                Load Script from File...
            </button>
            <div className="flex items-center space-x-2">
                 <button
                    onClick={() => onAnalyzeCode(code)}
                    className="px-4 py-2 rounded-md font-semibold text-sm bg-gray-700 text-base-100 hover:bg-gray-600 transition-colors"
                >
                    Analyze Code
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded-md font-semibold text-sm bg-brand-primary text-bg-dark hover:bg-brand-dark transition-colors"
                >
                    Save Script to Project
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};
