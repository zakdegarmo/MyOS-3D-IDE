
import React, { useMemo, useState, useCallback } from 'react';
import { ChevronDownIcon, SceneIcon, TrashIcon } from '../components/icons';
import { getDisplayName } from '../utils/getDisplayName';
import type { GlyphObject, LoadedModel, PrimitiveObject, TransformState, ModifiersState, ObjectGeometrySettings } from '../types';

// --- JSON VIEWER COMPONENT ---
const JsonNode: React.FC<{ nodeKey: string; nodeValue: any; isRoot?: boolean; level?: number }> = ({ nodeKey, nodeValue, isRoot = false, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(isRoot);
    const isObject = typeof nodeValue === 'object' && nodeValue !== null;
    const isArray = Array.isArray(nodeValue);
    const isExpandable = isObject && Object.keys(nodeValue).length > 0;

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpandable) {
            setIsExpanded(!isExpanded);
        }
    };

    const renderValue = () => {
        if (nodeValue === null) return <span className="text-purple-400">null</span>;
        if (typeof nodeValue === 'string') return <span className="text-green-400">"{nodeValue}"</span>;
        if (typeof nodeValue === 'number') return <span className="text-blue-400">{nodeValue}</span>;
        if (typeof nodeValue === 'boolean') return <span className="text-purple-400">{String(nodeValue)}</span>;
        if (isArray) return <span className="text-gray-500">Array({nodeValue.length})</span>;
        if (isObject) return <span className="text-gray-500">Object</span>;
        return String(nodeValue);
    };

    return (
        <div style={{ paddingLeft: level > 0 ? '1rem' : '0' }} className="font-mono text-xs">
            <div
                className={`flex items-center cursor-pointer ${isExpandable ? '' : 'cursor-default'}`}
                onClick={toggleExpand}
            >
                {isExpandable && (
                    <ChevronDownIcon className={`w-3 h-3 mr-1 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                )}
                <span className="text-brand-secondary mr-1">{nodeKey}:</span>
                {!isExpanded && renderValue()}
            </div>
            {isExpanded && isObject && (
                <div className="border-l border-gray-700 ml-1.5 pl-2">
                    {Object.entries(nodeValue).map(([key, value]) => (
                        <JsonNode key={key} nodeKey={key} nodeValue={value} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};


interface HierarchyPanelProps {
    glyphObjects: GlyphObject[];
    loadedModels: LoadedModel[];
    primitiveObjects: PrimitiveObject[];
    selectedObjectKeys: string[];
    setSelectedObjectKeys: (updater: React.SetStateAction<string[]>) => void;
    onDeleteObject: (key: string) => void;
    onUpdateObjectData: (key: string, newData: any) => void;
    // Data props for the viewer
    objectTransforms: Record<string, TransformState>;
    objectModifiers: Record<string, ModifiersState>;
    objectSettings: Record<string, ObjectGeometrySettings>;
    objectParameters: Record<string, any>;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = (props) => {
    const { 
        glyphObjects, loadedModels, primitiveObjects, selectedObjectKeys, setSelectedObjectKeys,
        onDeleteObject, objectTransforms, objectModifiers, objectSettings, objectParameters
    } = props;

    const [dataViewKey, setDataViewKey] = useState<string | null>(null);

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

    // FIX: Imported `useCallback` from React to resolve the "Cannot find name" error.
    const getObjectData = useCallback((key: string) => {
        const data: Record<string, any> = {};
        if (key.startsWith('primitive-')) {
            data.parameters = objectParameters[key];
        } else if (key.startsWith('glyph-')) {
            data.settings = objectSettings[key];
        } else if (key.startsWith('glb-model-')) {
            const model = loadedModels.find(m => m.id === key);
            data.info = { filename: model?.filename, identity: model?.identity };
        }
        data.transform = objectTransforms[key];
        data.modifiers = objectModifiers[key];
        
        // Clean up undefined/null properties for a cleaner view
        Object.keys(data).forEach(k => {
            if (data[k] === undefined || data[k] === null) {
                delete data[k];
            }
        });

        return data;
    }, [loadedModels, objectParameters, objectSettings, objectModifiers, objectTransforms]);
    
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
                            const isDataViewOpen = dataViewKey === key;
                            const objectData = isDataViewOpen ? getObjectData(key) : null;

                            return (
                                <li 
                                    key={key}
                                    className={`transition-colors ${isSelected ? 'bg-brand-primary/20' : ''}`}
                                >
                                    <div
                                        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${isSelected ? 'text-brand-secondary' : 'text-base-200 hover:bg-gray-800/50'}`}
                                        onClick={(e) => handleSelect(key, e)}
                                    >
                                        <div className="flex items-center space-x-2 truncate">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDataViewKey(isDataViewOpen ? null : key);
                                                }}
                                                className="p-0.5 rounded-sm hover:bg-gray-700"
                                                title={isDataViewOpen ? "Hide Data" : "Show Data"}
                                            >
                                                 <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDataViewOpen ? 'rotate-0' : '-rotate-90'}`} />
                                            </button>
                                            <span className="truncate font-mono">
                                                {getDisplayName(key, glyphObjects, loadedModels, primitiveObjects)}
                                            </span>
                                        </div>
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
                                    </div>
                                    {isDataViewOpen && objectData && (
                                        <div className="p-3 bg-bg-light border-t border-gray-700/50 animate-fade-in">
                                            <JsonNode nodeKey="data" nodeValue={objectData} isRoot />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};