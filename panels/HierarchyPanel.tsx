
import React, { useMemo, useState, useCallback } from 'react';
import { ChevronDownIcon, SceneIcon, TrashIcon } from '../components/icons';
import { getDisplayName } from '../utils/getDisplayName';
import type { GlyphObject, LoadedModel, PrimitiveObject, TransformState, ModifiersState, ObjectGeometrySettings } from '../types';

// --- EDITABLE JSON VIEWER COMPONENT ---
const EditableJsonNode: React.FC<{
    path: string;
    nodeKey: string;
    nodeValue: any;
    level?: number;
    isRoot?: boolean;
    onUpdate: (path: string, value: any) => void;
}> = ({ path, nodeKey, nodeValue, level = 0, isRoot = false, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(isRoot || level < 1);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const isObject = typeof nodeValue === 'object' && nodeValue !== null;
    const isArray = Array.isArray(nodeValue);
    const isExpandable = isObject && Object.keys(nodeValue).length > 0;
    const isEditable = !isObject && nodeValue !== null && typeof nodeValue !== 'undefined';

    const handleEditStart = (e: React.MouseEvent) => {
        if (!isEditable) return;
        e.stopPropagation();
        setEditValue(String(nodeValue));
        setIsEditing(true);
    };

    const handleEditCommit = () => {
        const originalType = typeof nodeValue;
        let newValue: any = editValue;
        if (originalType === 'number') newValue = parseFloat(editValue);
        if (originalType === 'boolean') newValue = editValue.toLowerCase() === 'true';
        if (String(nodeValue) !== String(newValue)) {
            onUpdate(path, newValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleEditCommit();
        if (e.key === 'Escape') setIsEditing(false);
    };

    const renderValue = () => {
        if (isEditing) {
            return (
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditCommit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-bg-dark text-white p-0 m-0 border border-brand-primary rounded-sm outline-none"
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }
        if (nodeValue === null) return <span className="text-purple-400" onClick={handleEditStart}>null</span>;
        if (typeof nodeValue === 'string') return <span className="text-green-400" onClick={handleEditStart}>"{nodeValue}"</span>;
        if (typeof nodeValue === 'number') return <span className="text-blue-400" onClick={handleEditStart}>{nodeValue}</span>;
        if (typeof nodeValue === 'boolean') return <span className="text-purple-400" onClick={handleEditStart}>{String(nodeValue)}</span>;
        if (isArray) return <span className="text-gray-500">Array({nodeValue.length})</span>;
        if (isObject) return <span className="text-gray-500">Object</span>;
        return String(nodeValue);
    };

    return (
        <div style={{ paddingLeft: level > 0 ? '1rem' : '0' }} className="font-mono text-xs">
            <div
                className={`flex items-center cursor-pointer ${isExpandable ? '' : 'cursor-default'}`}
                onClick={(e) => { e.stopPropagation(); if (isExpandable) setIsExpanded(!isExpanded); }}
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
                        <EditableJsonNode
                            key={key}
                            path={`${path}.${key}`}
                            nodeKey={key}
                            nodeValue={value}
                            level={level + 1}
                            onUpdate={onUpdate}
                        />
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
    onUpdateObjectProperty: (key: string, path: string, value: any) => void;
    objectTransforms: Record<string, TransformState>;
    objectModifiers: Record<string, ModifiersState>;
    objectSettings: Record<string, ObjectGeometrySettings>;
    objectParameters: Record<string, any>;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = (props) => {
    const { 
        glyphObjects, loadedModels, primitiveObjects, selectedObjectKeys, setSelectedObjectKeys,
        onDeleteObject, onUpdateObjectProperty, objectTransforms, objectModifiers, objectSettings, objectParameters
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
    
    const getObjectData = useCallback((key: string) => {
        const data: Record<string, any> = {};
        data.transform = objectTransforms[key];
        data.modifiers = objectModifiers[key];

        if (key.startsWith('primitive-')) {
            data.parameters = objectParameters[key];
        } else if (key.startsWith('glyph-')) {
            data.settings = objectSettings[key];
        } else if (key.startsWith('glb-model-')) {
            const model = loadedModels.find(m => m.id === key);
            data.info = { filename: model?.filename, identity: model?.identity };
        }
        
        Object.keys(data).forEach(k => {
            if (data[k] === undefined || data[k] === null) delete data[k];
        });

        return data;
    }, [loadedModels, objectParameters, objectSettings, objectTransforms, objectModifiers]);
    
    return (
        <div className="w-full h-full p-4 flex flex-col overflow-hidden">
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
                                             {Object.entries(objectData).map(([dataKey, dataValue]) => (
                                                <EditableJsonNode
                                                    key={dataKey}
                                                    path={dataKey}
                                                    nodeKey={dataKey}
                                                    nodeValue={dataValue}
                                                    isRoot
                                                    onUpdate={(path, value) => onUpdateObjectProperty(key, path, value)}
                                                />
                                            ))}
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
