



import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { SceneIcon, TrashIcon } from '../components/icons';
import { getDisplayName } from '../utils/getDisplayName';
import type { GlyphObject, LoadedModel, PrimitiveObject } from '../types';

interface HierarchyPanelProps {
    glyphObjects: GlyphObject[];
    loadedModels: LoadedModel[];
    primitiveObjects: PrimitiveObject[];
    selectedObjectKeys: string[];
    setSelectedObjectKeys: (updater: React.SetStateAction<string[]>) => void;
    onDeleteObject: (key: string) => void;
    onUpdateObjectData: (key: string, newData: any) => void;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = (props) => {
    const { 
        glyphObjects, loadedModels, primitiveObjects, selectedObjectKeys, setSelectedObjectKeys,
        onDeleteObject, onUpdateObjectData
    } = props;

    const sceneObjects = useMemo(() => {
        const glyphs = glyphObjects.map(glyph => ({ key: glyph.id, type: 'glyph' }));
        const models = loadedModels.map(model => ({ key: model.id, type: 'model' }));
        const primitives = primitiveObjects.map(prim => ({ key: prim.id, type: 'primitive' }));
        
        return [...models, ...primitives, ...glyphs];
    }, [glyphObjects, loadedModels, primitiveObjects]);

    const handleSelect = (key: string, event: React.MouseEvent) => {
        setSelectedObjectKeys(keys => {
            if (event.shiftKey) {
                return keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key];
            } else {
                return keys.length === 1 && keys[0] === key ? [] : [key];
            }
        });
    };
    
    return (
        <div className="w-full h-full p-6 flex flex-col overflow-hidden">
             <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1D232A; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #718096; }
            `}</style>
            <header className="mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-brand-secondary flex items-center space-x-3">
                    <SceneIcon />
                    <span>Scene Hierarchy</span>
                </h2>
                <p className="text-xs text-base-300">Manage all objects in the scene</p>
            </header>
            
            <div className="flex-grow bg-bg-dark rounded-lg border border-gray-700/50 overflow-y-auto custom-scrollbar">
                {sceneObjects.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-4">
                        <p className="text-sm text-gray-500">
                            The scene is empty.
                            <br />
                            Use the 'Object' menu to add items.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-700/50">
                        {sceneObjects.map(({ key }) => {
                            const isSelected = selectedObjectKeys.includes(key);

                            return (
                                <li 
                                    key={key}
                                    className={`transition-colors flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${isSelected ? 'bg-brand-primary/20 text-brand-secondary' : 'text-base-200 hover:bg-gray-800/50'}`}
                                    onClick={(e) => handleSelect(key, e)}
                                >
                                    <span className="truncate font-mono">
                                        {getDisplayName(key, glyphObjects, loadedModels, primitiveObjects)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteObject(key);
                                        }}
                                        className="ml-2 p-1 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 flex-shrink-0"
                                        title={`Delete ${getDisplayName(key, glyphObjects, loadedModels, primitiveObjects)}`}
                                    >
                                        <TrashIcon />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};