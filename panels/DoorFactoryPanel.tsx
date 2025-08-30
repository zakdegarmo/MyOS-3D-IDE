
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/Button';
import { RefreshIcon, LoadingIcon } from '../components/icons';
import { LoadedModel, PrimitiveObject, GlyphObject, ObjectGeometrySettings } from '../types';

interface DoorFactoryPanelProps {
    selectedObjectKeys: string[];
    loadedModels: LoadedModel[];
    primitiveObjects: PrimitiveObject[];
    glyphObjects: GlyphObject[];
    objectParameters: Record<string, any>;
    objectSettings: Record<string, ObjectGeometrySettings>;
    onRebuildModel: (modelId: string, newJsonString: string) => void;
    onUpdatePrimitiveParameters: (primitiveId: string, newParamsString: string) => void;
    onUpdateGlyphSettings: (glyphId: string, newSettingsString: string) => void;
    isProcessing: boolean;
    error: string | null;
}

export const DoorFactoryPanel: React.FC<DoorFactoryPanelProps> = (props) => {
    const { 
        selectedObjectKeys, loadedModels, primitiveObjects, glyphObjects, objectParameters, objectSettings,
        onRebuildModel, onUpdatePrimitiveParameters, onUpdateGlyphSettings, isProcessing, error 
    } = props;

    const [editorContent, setEditorContent] = useState('');
    const [isJsonValid, setIsJsonValid] = useState(true);
    
    const selectedObject = useMemo(() => {
        if (selectedObjectKeys.length !== 1) return null;
        const key = selectedObjectKeys[0];

        if (key.startsWith('glb-model-')) {
            const model = loadedModels.find(m => m.id === key);
            return model ? { type: 'model' as const, data: model } : null;
        }
        if (key.startsWith('primitive-')) {
            const primitive = primitiveObjects.find(p => p.id === key);
            const parameters = objectParameters[key];
            return primitive && parameters 
                ? { type: 'primitive' as const, data: primitive, parameters } 
                : null;
        }
        if (key.startsWith('glyph-')) {
            const glyph = glyphObjects.find(g => g.id === key);
            const settings = objectSettings[key];
            return glyph && settings
                ? { type: 'glyph' as const, data: glyph, settings }
                : null;
        }
        return null;
    }, [selectedObjectKeys, loadedModels, primitiveObjects, objectParameters, glyphObjects, objectSettings]);

    useEffect(() => {
        if (selectedObject) {
             try {
                let jsonString = '';
                if (selectedObject.type === 'model' && selectedObject.data.gltfJson) {
                    jsonString = JSON.stringify(selectedObject.data.gltfJson, null, 2);
                } else if (selectedObject.type === 'primitive') {
                    jsonString = JSON.stringify(selectedObject.parameters, null, 2);
                } else if (selectedObject.type === 'glyph') {
                    jsonString = JSON.stringify(selectedObject.settings.extrude, null, 2);
                }
                setEditorContent(jsonString);
                setIsJsonValid(true);
            } catch (e) {
                setEditorContent("Error stringifying object data.");
                setIsJsonValid(false);
            }
        } else {
            setEditorContent('');
        }
    }, [selectedObject]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setEditorContent(newContent);
        try {
            JSON.parse(newContent);
            setIsJsonValid(true);
        } catch (err) {
            setIsJsonValid(false);
        }
    };

    const handleApply = () => {
        if (!isJsonValid || !selectedObject) return;

        if (selectedObject.type === 'model') {
            onRebuildModel(selectedObject.data.id, editorContent);
        } else if (selectedObject.type === 'primitive') {
            onUpdatePrimitiveParameters(selectedObject.data.id, editorContent);
        } else if (selectedObject.type === 'glyph') {
            onUpdateGlyphSettings(selectedObject.data.id, editorContent);
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-6 bg-bg-light space-y-4">
            <header className="mb-2">
                <h2 className="text-lg font-semibold text-brand-secondary">Data Editor</h2>
                <p className="text-xs text-base-300">Edit and manage Data for Objects in the Scene.</p>
            </header>

            {!selectedObject && (
                 <div className="flex-grow flex items-center justify-center bg-bg-dark p-4 rounded-lg border-2 border-dashed border-brand-primary/20 text-center animate-fade-in">
                    <p className="text-sm text-base-200 leading-relaxed">
                        <strong className="font-semibold text-brand-secondary">Select a single object</strong> in the Scene panel to edit its underlying data.
                    </p>
                </div>
            )}

            {selectedObject && (
                 <div className="w-full flex-grow flex flex-col space-y-4">
                     <header>
                        <p className="text-sm text-base-200">
                            Editing: <span className="font-mono text-brand-secondary bg-bg-dark px-2 py-1 rounded">
                                {selectedObject.type === 'model' ? selectedObject.data.filename : 
                                 selectedObject.type === 'glyph' ? `Glyph '${selectedObject.data.glyphData.char}' Settings` :
                                 `${selectedObject.data.type} primitive`}
                            </span>
                        </p>
                     </header>
                    <textarea
                        className={`w-full flex-grow bg-bg-dark border-2 rounded-lg text-white font-mono text-xs p-4 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all duration-200 resize-none ${isJsonValid ? 'border-gray-700' : 'border-red-500 focus:ring-red-500'}`}
                        placeholder="Select an object to see its DOOR data..."
                        aria-label="DOOR data editor"
                        value={editorContent}
                        onChange={handleContentChange}
                        disabled={isProcessing}
                    />

                    <div className="flex items-center space-x-4 flex-shrink-0">
                        <Button 
                            className="w-full" 
                            variant="primary" 
                            onClick={handleApply} 
                            disabled={!isJsonValid || isProcessing}
                        >
                            {isProcessing ? <LoadingIcon /> : <RefreshIcon />}
                            <span>{isProcessing ? 'Applying...' : 'Apply Changes'}</span>
                        </Button>
                    </div>
                     {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                </div>
            )}
        </div>
    );
};
