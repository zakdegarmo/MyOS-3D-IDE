
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, CodeIcon } from '../components/icons';
import { functionMap } from '../system/systemFactory';

interface OntologyMatrixPanelProps {
  relationshipMatrix: Record<string, Record<string, string>>;
  onExecuteRelationship: (relation: { source: string; target: string; verb: string }) => void;
  onEditRelationship: (relation: { source: string; target: string; verb: string }) => void;
  customScripts: Record<string, string>;
  focusedConcept: string | null;
  setFocusedConcept: (concept: string | null) => void;
}

export const OntologyMatrixPanel: React.FC<OntologyMatrixPanelProps> = (props) => {
    const {
        relationshipMatrix,
        onExecuteRelationship,
        onEditRelationship,
        customScripts,
        focusedConcept,
        setFocusedConcept
    } = props;

    const [expandedConcept, setExpandedConcept] = useState<string | null>(focusedConcept);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, row: string, col: string, name: string } | null>(null);

    // When focusedConcept changes from outside (e.g., from graph click), expand the corresponding section
    useEffect(() => {
        if (focusedConcept && focusedConcept !== expandedConcept) {
            setExpandedConcept(focusedConcept);
        }
    }, [focusedConcept, expandedConcept]);

    // Handle toggling sections in the list
    const handleToggle = (concept: string) => {
        const newConcept = expandedConcept === concept ? null : concept;
        setExpandedConcept(newConcept);
        setFocusedConcept(newConcept); // Also set as focused
    };

    // --- Context Menu Logic ---
    const handleOpenContextMenu = (event: React.MouseEvent, row: string, col: string, name: string) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY, row, col, name });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleExecuteFromMenu = () => {
        if (!contextMenu) return;
        onExecuteRelationship({ source: contextMenu.row, target: contextMenu.col, verb: contextMenu.name });
        handleCloseContextMenu();
    };

    const handleEditFromMenu = () => {
        if (!contextMenu) return;
        onEditRelationship({ source: contextMenu.row, target: contextMenu.col, verb: contextMenu.name });
        handleCloseContextMenu();
    };

    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => {
            window.removeEventListener('click', close);
        };
    }, [contextMenu]);

    // Logic to get function source info
    const getFunctionSourceInfo = (row: string, col: string, name: string) => {
        const sanitize = (s: string) => s.replace(/\//g, 'Or');
      
        const customKey = `${sanitize(row)}_${sanitize(name)}_${sanitize(col)}`;
        if (customScripts[customKey]) {
            return {
                text: '(Custom)',
                icon: <CodeIcon className="h-4 w-4 text-brand-primary" title="Custom Kernel function" />,
            };
        }

        const normalizedFunctionName = name.toLowerCase().replace(/ /g, '').replace(/deep|perfected/g, '');
        if (functionMap[normalizedFunctionName]) {
             return { text: '', icon: null };
        }
      
        return { text: '(Default)', icon: null };
    };

    return (
        <aside className="w-full h-full p-4 flex flex-col overflow-y-auto">
            <header className="mb-4">
                <h2 className="text-lg font-semibold text-brand-secondary">Ontological Matrix</h2>
                <p className="text-xs text-base-300">Core Concept Relationships</p>
            </header>
            <div className="flex-grow space-y-1 pr-2">
                {Object.keys(relationshipMatrix).map(concept => {
                    const isFocused = focusedConcept === concept;
                    return (
                        <div key={concept} className={`rounded-md overflow-hidden bg-bg-dark/50 transition-all duration-200 ${isFocused ? 'ring-2 ring-brand-primary' : ''}`}>
                            <button
                                onClick={() => handleToggle(concept)}
                                className={`w-full flex items-center justify-between p-2 text-left text-base-200 hover:bg-gray-700/50 transition-colors focus:outline-none ${isFocused ? 'bg-brand-primary/20' : ''}`}
                                aria-expanded={expandedConcept === concept}
                            >
                                <span className="font-semibold">{concept}</span>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expandedConcept === concept ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedConcept === concept && (
                                <div className="p-3 bg-bg-dark border-t border-gray-700/50 text-xs space-y-2 animate-fade-in">
                                    {Object.entries(relationshipMatrix[concept]).map(([relatedConcept, relationship]) => {
                                        const sourceInfo = getFunctionSourceInfo(concept, relatedConcept, relationship);
                                        return (
                                            <div key={relatedConcept} className="flex justify-between items-center">
                                                <span className="text-base-300">{relatedConcept}:</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 font-mono" title={sourceInfo.text}>{sourceInfo.text}</span>
                                                    {sourceInfo.icon}
                                                    <button
                                                        onClick={(e) => handleOpenContextMenu(e, concept, relatedConcept, relationship)}
                                                        onContextMenu={(e) => handleOpenContextMenu(e, concept, relatedConcept, relationship)}
                                                        className="text-brand-secondary font-mono bg-bg-light px-2 py-0.5 rounded-md hover:bg-brand-dark hover:text-white transition-colors"
                                                    >
                                                        {relationship}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="absolute z-50 bg-bg-dark border border-gray-600 rounded-md shadow-lg p-1 animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={handleExecuteFromMenu} className="w-full text-left px-3 py-1 text-sm text-base-200 hover:bg-brand-primary hover:text-bg-dark rounded-sm transition-colors">
                        Execute Function
                    </button>
                    <button onClick={handleEditFromMenu} className="w-full text-left px-3 py-1 text-sm text-base-200 hover:bg-brand-primary hover:text-bg-dark rounded-sm transition-colors">
                        Edit Function
                    </button>
                </div>
            )}
        </aside>
    );
};
