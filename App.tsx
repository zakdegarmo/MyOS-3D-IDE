import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GLTFLoader } from 'three-stdlib';

import { useGlyphGenerator } from './hooks/useGlyphGenerator';
import { Viewer3D, CameraMode, Viewer3DHandle } from './components/Viewer3D';
import { InspectorPanel } from './panels/InspectorPanel';
import { CreatePanel } from './panels/CreatePanel';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { UnityHubPanel } from './panels/UnityHubPanel';
import { OntologicalConsolePanel } from './panels/OntologicalConsolePanel';
import { OntologyMatrixPanel } from './panels/OntologyMatrixPanel';
import { LoadingIcon } from './components/icons';
import { GlyphSelectorModal } from './components/GlyphSelectorModal';
import { FunctionEditorModal } from './components/FunctionEditorModal';
import { IntegrateWebsiteModal } from './components/IntegrateWebsiteModal';
import { TransformState, ModifiersState, Relationship, LoadedModel, GlyphObject, ObjectGeometrySettings, ExtrudeSettings, PrimitiveObject, PrimitiveType, OntologicalParameter, ConsoleLog, EditingRelation, ProjectState, SerializableLoadedModel, Oscillator, OntologicalSchema, Integration } from './types';
import { Toolbar } from './components/Toolbar';
import { createSystem, Concept } from './system/systemFactory';
import { backendService } from './services/backendService';
import { arrayBufferToBase64, base64ToArrayBuffer } from './utils/bufferUtils';
import { getDisplayName } from './utils/getDisplayName';
import { getNestedProperty } from './utils/propertyUtils';
import { readGlb, writeGlb } from './utils/glbSchemaParser';


const DEFAULT_EXTRUDE_SETTINGS: ExtrudeSettings = { depth: 8, bevelThickness: 1, bevelSize: 0.5 };

const INITIAL_RELATIONSHIP_MATRIX: Record<string, Record<string, string>> = {
  'Self': {
    'Self': 'Identity', 'Thought': 'Subject Of', 'Logic': 'Applies', 'Unity': 'Seeks',
    'Existence': 'Affirms', 'Improvement': 'Undergoes', 'Mastery': 'Pursues',
    'Resonance': 'Experiences', 'Transcendence': 'Aspires To', 'Nothing/Everything': 'Is Realized by'
  },
  'Thought': {
    'Self': 'Informs', 'Thought': 'Recursion', 'Logic': 'Utilizes', 'Unity': 'Synthesizes',
    'Existence': 'Represents', 'Improvement': 'Drives', 'Mastery': 'Develops',
    'Resonance': 'Articulates', 'Transcendence': 'Enables', 'Nothing/Everything':'Transcends'
  },
  'Logic': {
    'Self': 'Structures', 'Thought': 'Governs', 'Logic': 'Foundation', 'Unity': 'Ensures',
    'Existence': 'Describes', 'Improvement': 'Validates', 'Mastery': 'Underpins',
    'Resonance': 'Contradicts', 'Transcendence': 'Grounds', 'Nothing/Everything':'Is the Foundation Of'
  },
  'Unity': {
    'Self': 'Integrates', 'Thought': 'Harmonizes', 'Logic': 'Requires', 'Unity': 'Essence',
    'Existence': 'Binds', 'Improvement': 'Fosters', 'Mastery': 'Culminates In',
    'Resonance': 'Amplifies', 'Transcendence': 'Achieves', 'Nothing/Everything':'Is the Ultimate Expression Of'
  },
  'Existence': {
    'Self': 'Manifests In', 'Thought': 'Is Pondered By', 'Logic': 'Obeys', 'Unity': 'Comprises',
    'Existence': 'Is', 'Improvement': 'Evolves Through', 'Mastery': 'Is Domain Of',
    'Resonance': 'Vibrates In', 'Transcendence': 'Is Surpassed By', 'Nothing/Everything':'Gives Rise To'
  },
  'Improvement': {
    'Self': 'Refines', 'Thought': 'Optimizes', 'Logic': 'Systematizes', 'Unity': 'Strengthens',
    'Existence': 'Enhances', 'Improvement': 'Process', 'Mastery': 'Leads To',
    'Resonance': 'Fine-tunes', 'Transcendence': 'Is Path To', 'Nothing/Everything':'Is the Cycle Of'
  },
  'Mastery': {
    'Self': 'Actualizes', 'Thought': 'Requires Deep', 'Logic': 'Applies Perfected', 'Unity': 'Embodies',
    'Existence': 'Commands', 'Improvement': 'Is Goal Of', 'Mastery': 'Pinnacle',
    'Resonance': 'Generates', 'Transcendence': 'Approaches', 'Nothing/Everything':'Is the Totality Of'
  },
  'Resonance': {
    'Self': 'Is Felt By', 'Thought': 'Is Evoked By', 'Logic': 'Eludes', 'Unity': 'Creates',
    'Existence': 'Echoes Through', 'Improvement': 'Aligns With', 'Mastery': 'Radiates From',
    'Resonance': 'Sympathy', 'Transcendence': 'Facilitates', 'Nothing/Everything':'Is the Ground Of'
  },
  'Transcendence': {
    'Self': 'Elevates', 'Thought': 'Goes Beyond', 'Logic': 'Is Not Bound By', 'Unity': 'Is A State Of',
    'Existence': 'Rises Above', 'Improvement': 'Is Aim Of', 'Mastery': 'Is Pinnacle Of',
    'Resonance': 'Induces', 'Transcendence': 'Action', 'Nothing/Everything':'Is the Nature Of'
  },
  'Nothing/Everything': {
    'Self': 'Merges With', 'Thought': 'Contemplates', 'Logic':'Is a Subset Of', 'Unity': 'Is an Aspect Of',
    'Existence': 'Emerges From', 'Improvement': 'Occurs Within', 'Mastery':'Seeks to Understand',
    'Resonance':'Harmonizes With', 'Transcendence': 'Aspires To', 'Nothing/Everything':'is'
  }
};
const INITIAL_INTEGRATIONS: Integration[] = [
    { title: "MyOS 3D 0=1 Nexus", url: "https://0-nexus.vercel.app/" },
    { title: "MyOS 3D Font Explorer", url: "https://3d-ttf.vercel.app/" },
    { title: "MyOS 3D Data Visualizer", url: "https://data-vis-eosin.vercel.app/" },
    { title: "MyOS 3D File Explorer", url: "https://3-d-file-explorer.vercel.app/" },
    { title: "MyOS 3D Hyperlink Browser", url: "https://hyper-aether-pilgrim.vercel.app/" },
    { title: "MyOS 3D Atom-Visualizer", url: "https://atom-vis.vercel.app/" },
    { title: "MyOS 3D Nexus Page Editor", url: "https://nexus-page-editor.vercel.app/" },
    { title: "MyOS 3D IDE", url: "https://my-os-3-d-ide.vercel.app/" },
    { title: "Zak's Notepad", url: "https://zakdegarmo.github.io/ZaksNotepad/index.html" },
    { title: "MyOntology Docs", url: "https://zakdegarmo.github.io/MyOntology/" }
];

const CreateModal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-bg-dark/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-bg-light w-full max-w-lg rounded-lg shadow-2xl border border-gray-700/50 flex flex-col" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};


export const App: React.FC = () => {
  // Scene Object State
  const [glyphObjects, setGlyphObjects] = useState<GlyphObject[]>([]);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);
  const [primitiveObjects, setPrimitiveObjects] = useState<PrimitiveObject[]>([]);
  
  // Per-object state
  const [objectTransforms, setObjectTransforms] = useState<Record<string, TransformState>>({});
  const [objectModifiers, setObjectModifiers] = useState<Record<string, ModifiersState>>({});
  const [objectSettings, setObjectSettings] = useState<Record<string, ObjectGeometrySettings>>({});
  const [objectParameters, setObjectParameters] = useState<Record<string, any>>({});
  const [ontologicalParameters, setOntologicalParameters] = useState<Record<string, OntologicalParameter[]>>({});
  const [objectOscillators, setObjectOscillators] = useState<Record<string, Oscillator[]>>({});
  
  // Scene-wide state
  const [selectedObjectKeys, setSelectedObjectKeys] = useState<string[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isGlyphSelectorOpen, setIsGlyphSelectorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIntegrateModalOpen, setIsIntegrateModalOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [activeIntegrationUrl, setActiveIntegrationUrl] = useState<string>(INITIAL_INTEGRATIONS[0]?.url || '');

  // Ontological System State
  const [myos, setMyos] = useState<Record<string, Concept>>({});
  const [ontologicalMatrix, setOntologicalMatrix] = useState(INITIAL_RELATIONSHIP_MATRIX);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [customScripts, setCustomScripts] = useState<Record<string, string>>({});
  const [focusedConcept, setFocusedConcept] = useState<string | null>(null);


  // Function Editor Modal State
  const [isFunctionEditorOpen, setIsFunctionEditorOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<EditingRelation | null>(null);

  // Project Lifecycle State
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const importProjectInputRef = useRef<HTMLInputElement>(null);
  const importOntologyInputRef = useRef<HTMLInputElement>(null);
  const analysisLogIdRef = useRef<number | null>(null);

  const { generateSingleGlyph, isLoading: isFontProcessing, fontLoaded, isFontLoading, loadFont, availableGlyphs } = useGlyphGenerator();
  
  const viewerRef = useRef<Viewer3DHandle>(null);

  // --- Wrapped State Setters for Dirty Tracking ---
  const updateObjectTransforms = useCallback((updater: React.SetStateAction<Record<string, TransformState>>) => {
      setObjectTransforms(updater);
      setIsDirty(true);
  }, []);
  const updateObjectModifiers = useCallback((updater: React.SetStateAction<Record<string, ModifiersState>>) => {
      setObjectModifiers(updater);
      setIsDirty(true);
  }, []);
  const updateObjectSettings = useCallback((updater: React.SetStateAction<Record<string, ObjectGeometrySettings>>) => {
      setObjectSettings(updater);
      setIsDirty(true);
  }, []);
  const updateObjectParameters = useCallback((updater: React.SetStateAction<Record<string, any>>) => {
      setObjectParameters(updater);
      setIsDirty(true);
  }, []);
  const updateRelationships = useCallback((updater: React.SetStateAction<Relationship[]>) => {
      setRelationships(updater);
      setIsDirty(true);
  }, []);
  const updateOntologicalParameters = useCallback((updater: React.SetStateAction<Record<string, OntologicalParameter[]>>) => {
      setOntologicalParameters(updater);
      setIsDirty(true);
  }, []);
  const updateObjectOscillators = useCallback((updater: React.SetStateAction<Record<string, Oscillator[]>>) => {
      setObjectOscillators(updater);
      setIsDirty(true);
  }, []);
  const updateIntegrations = useCallback((updater: React.SetStateAction<Integration[]>) => {
      setIntegrations(updater);
      setIsDirty(true);
  }, []);

  const logToIDE = useCallback((text: string, type: ConsoleLog['type']) => {
    // Echo to browser console
    switch (type) {
        case 'error':
            console.error(text);
            break;
        case 'success':
            console.info(`✓ ${text}`);
            break;
        case 'info':
            console.info(`ℹ️ ${text}`);
            break;
        case 'ai':
        case 'source':
             // Don't log AI responses to browser console to avoid clutter
            break;
        default:
            console.log(text);
    }
    // Update UI console state
    setConsoleLogs(prev => [...prev, { id: Date.now() + Math.random(), text, type }]);
  }, []);

    useEffect(() => {
        if (selectedObjectKeys.length === 1) {
            const key = selectedObjectKeys[0];
        } else {
            //
        }
    }, [selectedObjectKeys, loadedModels, objectParameters, objectSettings]);

  useEffect(() => {
    // --- MyOS System Initialization ---
    // This effect creates the core ontological system (MyOS) whenever its dependencies change.
    // It builds a 'sceneApi' object that provides safe, controlled access for system functions
    // to interact with the React state (e.g., update transforms, log to console).
    const sceneApi = {
        getObject: (key: string) => {
            if (key.startsWith('glb-model-')) return loadedModels.find(m => m.id === key);
            if (key.startsWith('primitive-')) return {
                ...primitiveObjects.find(p => p.id === key),
                parameters: objectParameters[key],
                transform: objectTransforms[key],
                modifiers: objectModifiers[key],
            };
            if (key.startsWith('glyph-')) return {
                 ...glyphObjects.find(g => g.id === key),
                 settings: objectSettings[key],
                 transform: objectTransforms[key],
                 modifiers: objectModifiers[key],
            };
            return null;
        },
        updatePrimitiveParameters: (key: string, updater: (params: any) => any) => {
            updateObjectParameters(prev => ({
                ...prev,
                [key]: updater(prev[key] || {})
            }));
        },
        updateTransform: (key: string, updater: (transform: TransformState) => TransformState) => {
            updateObjectTransforms(prev => ({
                ...prev,
                [key]: updater(prev[key] || { position: [0,0,0], rotation: [0,0,0,1], scale: [1,1,1] })
            }));
        },
        log: (message: string) => {
            logToIDE(message, 'out');
        }
    };
    setMyos(createSystem(ontologicalMatrix, sceneApi, customScripts));
  }, [
    loadedModels, primitiveObjects, glyphObjects, 
    objectParameters, objectTransforms, objectModifiers, objectSettings,
    updateObjectParameters, updateObjectTransforms, logToIDE, customScripts, ontologicalMatrix
  ]);

  const handleOscillateCommand = useCallback((args: string[], targetKey: string) => {
    if (args.length < 3) {
      logToIDE("Usage: oscillate <property> <frequency> <amplitude> [offset]", 'error');
      return;
    }
    const [propPath, freqStr, ampStr, offsetStr] = args;
    const frequency = parseFloat(freqStr);
    const amplitude = parseFloat(ampStr);
    const offset = offsetStr ? parseFloat(offsetStr) : 0;

    if (isNaN(frequency) || isNaN(amplitude) || isNaN(offset)) {
      logToIDE("Invalid parameters. Frequency, amplitude, and offset must be numbers.", 'error');
      return;
    }

    // Determine which state object to read from
    let sourceState: any = null;
    if (propPath.startsWith('modifiers')) sourceState = objectModifiers[targetKey];
    else if (propPath.startsWith('transform')) sourceState = objectTransforms[targetKey];
    else if (propPath.startsWith('parameters')) sourceState = objectParameters[targetKey];
    else if (propPath.startsWith('settings')) sourceState = objectSettings[targetKey];

    if (!sourceState) {
        logToIDE(`Cannot oscillate property '${propPath}'. Not a valid animatable root property.`, 'error');
        return;
    }

    const baseValue = getNestedProperty(sourceState, propPath.split('.').slice(1).join('.'));
    
    if (typeof baseValue !== 'number') {
      logToIDE(`Property '${propPath}' not found or not a number on the selected object.`, 'error');
      return;
    }

    const newOscillator: Oscillator = {
      id: `${propPath}-${Date.now()}`,
      enabled: true,
      property: propPath,
      frequency,
      amplitude,
      offset,
      baseValue,
    };
    
    updateObjectOscillators(prev => {
        const existing = prev[targetKey] || [];
        // Remove existing oscillator for the same property
        const filtered = existing.filter(o => o.property !== propPath);
        return { ...prev, [targetKey]: [...filtered, newOscillator] };
    });

    logToIDE(`Started oscillating '${propPath}' on ${getDisplayName(targetKey, glyphObjects, loadedModels, primitiveObjects)}`, 'success');
  }, [logToIDE, objectModifiers, objectTransforms, objectParameters, objectSettings, updateObjectOscillators, glyphObjects, loadedModels, primitiveObjects]);
  
  const handleStopOscillationCommand = useCallback((args: string[], targetKey: string) => {
      const propToStop = args[0];
      if (!propToStop) {
          logToIDE("Usage: stop <property|all>", 'error');
          return;
      }

      updateObjectOscillators(prev => {
          const keyOscillators = prev[targetKey];
          if (!keyOscillators) return prev;

          const next = { ...prev };
          if (propToStop === 'all') {
              delete next[targetKey];
              logToIDE(`Stopped all oscillations on ${getDisplayName(targetKey, glyphObjects, loadedModels, primitiveObjects)}`, 'success');
          } else {
              const updatedOscillators = keyOscillators.filter(o => o.property !== propToStop);
              if(updatedOscillators.length < keyOscillators.length) {
                  logToIDE(`Stopped oscillating '${propToStop}' on ${getDisplayName(targetKey, glyphObjects, loadedModels, primitiveObjects)}`, 'success');
              } else {
                  logToIDE(`No active oscillation found for property '${propToStop}'`, 'info');
              }
              next[targetKey] = updatedOscillators;
          }
          return next;
      });
  }, [logToIDE, updateObjectOscillators, glyphObjects, loadedModels, primitiveObjects]);

  const handleBunCommand = useCallback((command: string) => {
    if (!currentProjectId) {
        logToIDE('No active project. Cannot execute bun command.', 'error');
        return;
    }
    logToIDE(`Executing in [${currentProjectId}]: ${command}`, 'system');
    backendService.executeBunCommand(command, currentProjectId, (data) => {
        let type: ConsoleLog['type'] = 'out';
        if (data.type === 'stderr') type = 'error';
        if (data.type === 'exit') type = 'system';
        logToIDE(data.payload, type);
    }).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`Bun Command Error: ${message}`, 'error');
    });
  }, [logToIDE, currentProjectId]);
  
  const handleProxyCallCommand = useCallback(async (command: string) => {
    const parts = command.split(/\s+/);
    // proxy_call <METHOD> <URL> [JSON_PAYLOAD]
    if (parts.length < 3) {
      logToIDE("Usage: proxy_call <METHOD> <URL> [JSON_PAYLOAD]", 'error');
      return;
    }
    const method = parts[1].toUpperCase();
    const url = parts[2];
    let payload = null;

    if (parts.length > 3) {
        const jsonString = parts.slice(3).join(' ');
        try {
            payload = JSON.parse(jsonString);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logToIDE(`Invalid JSON payload: ${message}`, 'error');
            return;
        }
    }

    logToIDE(`Proxying ${method} to ${url}...`, 'system');
    try {
        const result = await backendService.proxyCall(url, method, payload);
        const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        logToIDE(`Proxy Response:\n${resultString}`, 'out');
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Proxy Error: ${message}`, 'error');
    }
  }, [logToIDE]);
  
  const handleCommand = useCallback((command: string) => {
    logToIDE(command, 'in');
    const [cmd, ...args] = command.toLowerCase().split(/\s+/);

    // --- Bun package manager commands ---
    if (cmd === 'bun') {
        return handleBunCommand(command);
    }
    
    // --- Project management commands ---
    if (cmd === 'download' && args[0] === 'project') {
        handleExportProject();
        return;
    }
    
    // --- Proxy command for backend-to-backend communication ---
    if (cmd === 'proxy_call') {
        handleProxyCallCommand(command);
        return;
    }

    // --- Client-side commands ---
    if (cmd === 'oscillate' || cmd === 'stop') {
        if (selectedObjectKeys.length !== 1) {
            logToIDE("Error: This command requires a single object to be selected.", 'error');
            return;
        }
        const targetKey = selectedObjectKeys[0];
        if (cmd === 'oscillate') handleOscillateCommand(command.split(/\s+/).slice(1), targetKey);
        if (cmd === 'stop') handleStopOscillationCommand(command.split(/\s+/).slice(1), targetKey);
        return;
    }
    
    // --- MyOS system commands ---
    let executed = false;
    for (const conceptName in myos) {
        const concept = myos[conceptName];
        for (const functionName in concept) {
            if (functionName.toLowerCase() === cmd) {
                if (typeof concept[functionName] === 'function') {
                    if (selectedObjectKeys.length !== 1) {
                        logToIDE("Error: This MyOS command requires a single object to be selected.", 'error');
                        return;
                    }
                    logToIDE(`Executing: ${conceptName}.${functionName} on ${getDisplayName(selectedObjectKeys[0], glyphObjects, loadedModels, primitiveObjects)}`, 'system');
                    concept[functionName](selectedObjectKeys[0]);
                    executed = true;
                    break;
                }
            }
        }
        if (executed) break;
    }
    if (executed) return;
    
    // --- AI Query Fallback ---
    logToIDE(`Thinking...`, 'system');
    analysisLogIdRef.current = null;
    let accumulatedText = '';

    backendService.aiQuery(command, (data) => {
        if (data.type === 'source') {
            const sourcesText = (data.payload as any[]).map(s => `[${s.concept}: ${(s.similarity * 100).toFixed(1)}%]`).join(' ');
            logToIDE(`Context: ${sourcesText}`, 'source');
        } else if (data.type === 'chunk') {
            accumulatedText += data.payload;
            setConsoleLogs(prev => {
                if (analysisLogIdRef.current === null) {
                    const newLogId = Date.now() + Math.random();
                    analysisLogIdRef.current = newLogId;
                    return [...prev, { id: newLogId, text: data.payload, type: 'ai' }];
                }
                return prev.map(log => log.id === analysisLogIdRef.current ? { ...log, text: accumulatedText } : log);
            });
        }
    }).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`AI Query Error: ${message}`, 'error');
    });
  }, [logToIDE, selectedObjectKeys, myos, glyphObjects, loadedModels, primitiveObjects, handleOscillateCommand, handleStopOscillationCommand, handleBunCommand, handleProxyCallCommand]);


  const handleDeleteObject = useCallback((keyToDelete: string) => {
    setGlyphObjects(prev => prev.filter(o => o.id !== keyToDelete));
    setLoadedModels(prev => prev.filter(o => o.id !== keyToDelete));
    setPrimitiveObjects(prev => prev.filter(o => o.id !== keyToDelete));

    const updater = (prev: Record<string, any>) => {
        const next = {...prev};
        delete next[keyToDelete];
        return next;
    };
    updateObjectTransforms(updater);
    updateObjectModifiers(updater);
    updateObjectSettings(updater);
    updateObjectParameters(updater);
    updateObjectOscillators(updater);
    
    updateRelationships(prev => prev.filter(r => r.from !== keyToDelete && r.to !== keyToDelete));
    setSelectedObjectKeys(prev => prev.filter(k => k !== keyToDelete));
    setIsDirty(true);
  }, [updateObjectTransforms, updateObjectModifiers, updateObjectSettings, updateObjectParameters, updateRelationships, updateObjectOscillators]);


  const handleAddPrimitive = useCallback((type: PrimitiveType) => {
    const newId = `primitive-${type}-${Date.now()}`;
    const newPrimitive: PrimitiveObject = { id: newId, type };
    setPrimitiveObjects(prev => [...prev, newPrimitive]);

    // Set default parameters
    let params: any = {};
    switch(type) {
        case 'box': params = { width: 10, height: 10, depth: 10 }; break;
        case 'sphere': params = { radius: 5, widthSegments: 32, heightSegments: 16 }; break;
        case 'cylinder': params = { radiusTop: 5, radiusBottom: 5, height: 10, radialSegments: 32 }; break;
        case 'cone': params = { radius: 5, height: 10, radialSegments: 32 }; break;
        case 'torus': params = { radius: 10, tube: 3, radialSegments: 16, tubularSegments: 100 }; break;
        case 'plane': params = { width: 10, height: 10 }; break;
        case 'dodecahedron': case 'icosahedron': case 'octahedron': case 'tetrahedron': params = { radius: 10, detail: 0 }; break;
        case 'torusKnot': params = { radius: 10, tube: 3, tubularSegments: 64, radialSegments: 8, p: 2, q: 3 }; break;
        case 'point': params = {}; break; // Point has no geometry parameters
    }
    updateObjectParameters(prev => ({...prev, [newId]: params}));
    
    setSelectedObjectKeys([newId]);
    setIsCreateModalOpen(false);
    setIsDirty(true);
  }, [updateObjectParameters]);

  const handleCreateFromGlyph = useCallback(async (char: string) => {
    setIsProcessing(true);
    setProcessingError(null);
    try {
        const glyphData = await generateSingleGlyph(char);
        const newId = `glyph-${char}-${Date.now()}`;
        setGlyphObjects(prev => [...prev, { id: newId, glyphData }]);
        updateObjectSettings(prev => ({...prev, [newId]: { extrude: DEFAULT_EXTRUDE_SETTINGS }}));
        setSelectedObjectKeys([newId]);
        setIsDirty(true);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setProcessingError(message);
        logToIDE(`Glyph creation failed: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [generateSingleGlyph, updateObjectSettings, logToIDE]);


  const handleImportModel = useCallback((file: File) => {
    setIsProcessing(true);
    setProcessingError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) throw new Error("File could not be read.");
            
            const loader = new GLTFLoader();
            loader.parse(
                buffer.slice(0), // Create a copy for parsing
                '',
                (gltf) => {
                    const newId = `glb-model-${file.name.split('.')[0]}-${Date.now()}`;
                    const model: LoadedModel = {
                        id: newId,
                        scene: gltf.scene,
                        filename: file.name,
                        identity: `Model from ${file.name}`,
                        gltfJson: gltf.parser.json,
                        originalBuffer: buffer
                    };
                    setLoadedModels(prev => [...prev, model]);
                    setSelectedObjectKeys([newId]);
                    setIsDirty(true);
                    logToIDE(`Successfully loaded ${file.name}`, 'success');
                    setIsProcessing(false);
                },
                (error) => {
                    throw new Error(`GLTF parsing failed: ${error.message}`);
                }
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setProcessingError(message);
            logToIDE(message, 'error');
            setIsProcessing(false);
        }
    };
    reader.onerror = () => {
         const message = "Failed to read file.";
         setProcessingError(message);
         logToIDE(message, 'error');
         setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, [logToIDE]);
  
  const handleExecuteRelationship = useCallback(({ source, target, verb }: { source: string, target: string, verb: string }) => {
    if (selectedObjectKeys.length !== 1) {
        logToIDE("An object must be selected to execute a relationship.", 'info');
        return;
    }
    const sourceConcept = myos[source];
    if (sourceConcept && typeof sourceConcept[verb] === 'function') {
        sourceConcept[verb](selectedObjectKeys[0]);
    } else {
        logToIDE(`Function '${verb}' not found on concept '${source}'.`, 'error');
    }
  }, [selectedObjectKeys, myos, logToIDE]);
  
  const handleEditRelationship = useCallback(({ source, target, verb }: { source: string, target: string, verb: string }) => {
    setEditingRelation({ row: source, col: target, name: verb });
    setIsFunctionEditorOpen(true);
  }, []);
  
  const handleSaveScript = useCallback((code: string) => {
    if (editingRelation) {
        const sanitize = (s: string) => s.replace(/\//g, 'Or');
        const key = `${sanitize(editingRelation.row)}_${sanitize(editingRelation.name)}_${sanitize(editingRelation.col)}`;
        setCustomScripts(prev => ({...prev, [key]: code}));
        setIsDirty(true);
        setIsFunctionEditorOpen(false);
        setEditingRelation(null);
        logToIDE(`Custom script for '${key}' saved.`, 'success');
    }
  }, [editingRelation, logToIDE]);

  const handleUpdateObjectData = useCallback((key: string, newData: any) => {
    if (key.startsWith('primitive-')) {
        logToIDE(`Updating parameters for ${key}`, 'system');
        updateObjectParameters(prev => ({...prev, [key]: newData}));
    } else if (key.startsWith('glyph-')) {
        logToIDE(`Updating settings for ${key}`, 'system');
        updateObjectSettings(prev => ({...prev, [key]: { ...prev[key], extrude: newData }}));
    } else if (key.startsWith('glb-model-')) {
        logToIDE("Directly editing GLTF model data is not yet supported.", 'info');
    }
  }, [updateObjectParameters, updateObjectSettings, logToIDE]);

  const handleAnalyzeCode = useCallback((code: string) => {
    logToIDE(`Analyzing code snippet...`, 'system');
    const analysisLog = analysisLogIdRef;
    analysisLog.current = null;
    let accumulatedText = '';

    backendService.analyzeCode(code, (data) => {
        if (data.type === 'chunk') {
            accumulatedText += data.payload;
            setConsoleLogs(prev => {
                if (analysisLog.current === null) {
                    const newLogId = Date.now() + Math.random();
                    analysisLog.current = newLogId;
                    return [...prev, { id: newLogId, text: data.payload, type: 'ai' }];
                }
                return prev.map(log => log.id === analysisLog.current ? { ...log, text: accumulatedText } : log);
            });
        }
    }).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`Code Analysis Error: ${message}`, 'error');
    });
  }, [logToIDE]);

  const handleAddIntegration = useCallback(({ title, url }: Integration) => {
    const newIntegration = { title, url };
    updateIntegrations(prev => {
        if (prev.some(i => i.url === url)) {
            logToIDE(`Integration with URL ${url} already exists.`, 'info');
            return prev;
        }
        return [...prev, newIntegration];
    });
    setActiveIntegrationUrl(url);
    setIsIntegrateModalOpen(false);
    logToIDE(`Added new integration: ${title}`, 'success');
  }, [updateIntegrations, logToIDE]);

  // --- PROJECT LIFECYCLE ---
  const getProjectState = useCallback((): ProjectState => {
    const serializableModels: SerializableLoadedModel[] = loadedModels.map(model => ({
      id: model.id,
      filename: model.filename,
      identity: model.identity,
      originalBuffer: model.originalBuffer ? arrayBufferToBase64(model.originalBuffer) : '',
    }));
    
    return {
      glyphObjects, loadedModels: serializableModels, primitiveObjects,
      objectTransforms, objectModifiers, objectSettings, objectParameters,
      objectOscillators, ontologicalParameters, relationships, customScripts,
      ontologicalMatrix, integrations,
    };
  }, [
      glyphObjects, loadedModels, primitiveObjects, objectTransforms, objectModifiers,
      objectSettings, objectParameters, objectOscillators, ontologicalParameters,
      relationships, customScripts, ontologicalMatrix, integrations
  ]);
  
  const loadProjectState = useCallback((state: ProjectState) => {
    setIsProcessing(true);
    logToIDE('Loading project state...', 'info');
    return new Promise<void>((resolve, reject) => {
        try {
            setGlyphObjects(state.glyphObjects || []);
            setPrimitiveObjects(state.primitiveObjects || []);
            setObjectTransforms(state.objectTransforms || {});
            setObjectModifiers(state.objectModifiers || {});
            setObjectSettings(state.objectSettings || {});
            setObjectParameters(state.objectParameters || {});
            setObjectOscillators(state.objectOscillators || {});
            setOntologicalParameters(state.ontologicalParameters || {});
            setRelationships(state.relationships || []);
            setCustomScripts(state.customScripts || {});
            setOntologicalMatrix(state.ontologicalMatrix || INITIAL_RELATIONSHIP_MATRIX);
            const loadedIntegrations = state.integrations && state.integrations.length > 0 ? state.integrations : INITIAL_INTEGRATIONS;
            setIntegrations(loadedIntegrations);
            setActiveIntegrationUrl(loadedIntegrations[0]?.url || '');
            setSelectedObjectKeys([]);

            const rehydratedModels: LoadedModel[] = [];
            const loader = new GLTFLoader();
            const promises = (state.loadedModels || []).map(serialModel => {
                return new Promise<void>((resolveModel, rejectModel) => {
                    const buffer = base64ToArrayBuffer(serialModel.originalBuffer);
                    loader.parse(
                        buffer.slice(0), '',
                        (gltf) => {
                            rehydratedModels.push({
                                id: serialModel.id, filename: serialModel.filename, identity: serialModel.identity,
                                scene: gltf.scene, gltfJson: gltf.parser.json, originalBuffer: buffer,
                            });
                            resolveModel();
                        },
                        (error) => {
                            logToIDE(`Failed to parse model ${serialModel.filename}: ${error.message}`, 'error');
                            rejectModel(error);
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                setLoadedModels(rehydratedModels);
                logToIDE('Project state loaded successfully.', 'success');
                setIsDirty(false);
                setIsProcessing(false);
                resolve();
            }).catch(err => {
                logToIDE(`Error rehydrating models: ${err.message}`, 'error');
                setIsProcessing(false);
                reject(err);
            });

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logToIDE(`Failed to load project state: ${message}`, 'error');
            setIsProcessing(false);
            reject(e);
        }
    });
  }, [logToIDE]);

  const handleNewProject = useCallback(async () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to start a new project?")) {
        return;
    }
    try {
        setIsProcessing(true);
        const { projectId } = await backendService.createNewWorkspace();
        setCurrentProjectId(projectId);

        setGlyphObjects([]); setLoadedModels([]); setPrimitiveObjects([]);
        setObjectTransforms({}); setObjectModifiers({}); setObjectSettings({});
        setObjectParameters({}); setObjectOscillators({}); setOntologicalParameters({});
        setRelationships([]); setCustomScripts({}); setOntologicalMatrix(INITIAL_RELATIONSHIP_MATRIX);
        setIntegrations(INITIAL_INTEGRATIONS); setActiveIntegrationUrl(INITIAL_INTEGRATIONS[0]?.url || '');
        setSelectedObjectKeys([]); setConsoleLogs([]);
        
        setIsDirty(false);
        logToIDE(`New project started with ID: ${projectId}`, 'system');
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Error creating new project: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [isDirty, logToIDE]);
  
  // Create an initial project when the app loads
  useEffect(() => {
    handleNewProject();
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!currentProjectId) {
        logToIDE('No active project to save.', 'error');
        return;
    }
    try {
        const state = getProjectState();
        await backendService.saveProjectState(currentProjectId, state);
        setIsDirty(false);
        logToIDE(`Project ${currentProjectId} saved.`, 'success');
    } catch(e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Error saving project: ${message}`, 'error');
    }
  }, [currentProjectId, getProjectState, logToIDE]);

  const handleExportProject = useCallback(async () => {
    if (!currentProjectId) {
        logToIDE('No active project to download.', 'error');
        return;
    }
    try {
        logToIDE(`Preparing project ${currentProjectId} for download...`, 'info');
        // First, save the current state to ensure the archive is up-to-date
        await handleSaveProject();

        const blob = await backendService.downloadProject(currentProjectId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProjectId}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        logToIDE('Project downloaded successfully.', 'success');
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Failed to download project: ${message}`, 'error');
    }
  }, [currentProjectId, handleSaveProject, logToIDE]);

  const handleImportProject = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes that will be lost. Continue?")) {
        return;
    }
    importProjectInputRef.current?.click();
  }, [isDirty]);

  const handleImportProjectFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        setIsProcessing(true);
        logToIDE(`Uploading project ${file.name}...`, 'info');
        const { projectId: newProjectId } = await backendService.uploadProject(file);
        logToIDE(`Project uploaded. New ID: ${newProjectId}. Loading state...`, 'info');
        
        const state = await backendService.loadProjectState(newProjectId);
        await loadProjectState(state);
        setCurrentProjectId(newProjectId);
        
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`Failed to import project: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
        if(event.target) event.target.value = ''; // Reset input
    }
  }, [loadProjectState, logToIDE]);

  const handleExportOntology = useCallback(() => {
    try {
      const schema: OntologicalSchema = { relationshipMatrix: ontologicalMatrix, customScripts };
      const buffer = writeGlb(schema);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myos-ontology-${Date.now()}.glb`;
      a.click();
      URL.revokeObjectURL(url);
      logToIDE('Ontology exported to GLB file.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logToIDE(`Failed to export ontology: ${message}`, 'error');
    }
  }, [ontologicalMatrix, customScripts, logToIDE]);

  const handleImportOntology = useCallback(() => {
    if (isDirty && !window.confirm("This will overwrite your current ontology rules and custom functions. Continue?")) {
        return;
    }
    importOntologyInputRef.current?.click();
  }, [isDirty]);
  
  const handleImportOntologyFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) throw new Error("Could not read file buffer.");
        
        const schema = await readGlb(buffer);
        setOntologicalMatrix(schema.relationshipMatrix);
        setCustomScripts(schema.customScripts || {});
        setIsDirty(true);
        logToIDE(`Successfully imported ontology from ${file.name}`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`Failed to import ontology file: ${message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if (event.target) event.target.value = ''; // Reset input
  }, [logToIDE]);


  return (
    <div className="h-screen w-screen bg-bg-light text-base-100 flex flex-col font-sans">
      <header className="flex-shrink-0 bg-bg-dark h-12 flex items-center justify-between px-4 border-b border-gray-700/50 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-lg text-brand-secondary">MyOS IDE</div>
          <Toolbar
            onImportModel={handleImportModel}
            onLoadFont={loadFont}
            onCreateFromGlyph={() => setIsGlyphSelectorOpen(true)}
            isFontLoaded={fontLoaded}
            onSaveScene={() => viewerRef.current?.saveScene()}
            onNewProject={handleNewProject}
            onSaveProject={handleSaveProject}
            onImportProject={handleImportProject}
            onExportProject={handleExportProject}
            onImportOntology={handleImportOntology}
            onExportOntology={handleExportOntology}
            onCreatePrimitive={() => setIsCreateModalOpen(true)}
            onIntegrateWebsite={() => setIsIntegrateModalOpen(true)}
          />
        </div>
        <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2 py-1 rounded ${isDirty ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                {isDirty ? 'Unsaved' : 'Saved'}
            </span>
            {currentProjectId && <span className="text-gray-500 font-mono" title={`Current Project ID: ${currentProjectId}`}>{currentProjectId}</span>}
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
                <PanelGroup direction="horizontal">
                    <Panel defaultSize={18} minSize={15} className="bg-bg-light flex flex-col">
                        <PanelGroup direction="vertical">
                            <Panel defaultSize={50} minSize={25}>
                                <HierarchyPanel
                                    glyphObjects={glyphObjects}
                                    loadedModels={loadedModels}
                                    primitiveObjects={primitiveObjects}
                                    selectedObjectKeys={selectedObjectKeys}
                                    setSelectedObjectKeys={setSelectedObjectKeys}
                                    onDeleteObject={handleDeleteObject}
                                    onUpdateObjectData={handleUpdateObjectData}
                                    objectParameters={objectParameters}
                                    objectSettings={objectSettings}
                                    objectModifiers={objectModifiers}
                                    objectTransforms={objectTransforms}
                                />
                            </Panel>
                            <PanelResizeHandle className="h-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                            <Panel defaultSize={50} minSize={25}>
                                <OntologyMatrixPanel
                                    relationshipMatrix={ontologicalMatrix}
                                    onExecuteRelationship={handleExecuteRelationship}
                                    onEditRelationship={handleEditRelationship}
                                    customScripts={customScripts}
                                    focusedConcept={focusedConcept}
                                    setFocusedConcept={setFocusedConcept}
                                />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                    <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                    <Panel defaultSize={52} minSize={30}>
                        <Viewer3D
                          ref={viewerRef}
                          glyphObjects={glyphObjects}
                          loadedModels={loadedModels}
                          primitiveObjects={primitiveObjects}
                          objectParameters={objectParameters}
                          ontologicalParameters={ontologicalParameters}
                          cameraMode={cameraMode}
                          setCameraMode={setCameraMode}
                          objectTransforms={objectTransforms}
                          setObjectTransforms={updateObjectTransforms}
                          objectModifiers={objectModifiers}
                          setObjectModifiers={updateObjectModifiers}
                          objectOscillators={objectOscillators}
                          objectSettings={objectSettings}
                          selectedObjectKeys={selectedObjectKeys}
                          setSelectedObjectKeys={setSelectedObjectKeys}
                          relationships={relationships}
                          onDeleteObject={handleDeleteObject}
                          logToIDE={logToIDE}
                        />
                    </Panel>
                    <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                    <Panel defaultSize={30} minSize={20}>
                         <InspectorPanel
                            objectTransforms={objectTransforms}
                            setObjectTransforms={updateObjectTransforms}
                            objectModifiers={objectModifiers}
                            setObjectModifiers={updateObjectModifiers}
                            objectSettings={objectSettings}
                            setObjectSettings={updateObjectSettings}
                            objectParameters={objectParameters}
                            setObjectParameters={updateObjectParameters}
                            objectOscillators={objectOscillators}
                            setObjectOscillators={updateObjectOscillators}
                            selectedObjectKeys={selectedObjectKeys}
                            primitiveObjects={primitiveObjects}
                            relationships={relationships}
                            setRelationships={updateRelationships}
                            isLoading={isProcessing || isFontProcessing}
                        />
                    </Panel>
                </PanelGroup>
            </Panel>
            <PanelResizeHandle className="h-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
            <Panel defaultSize={30} minSize={15}>
                <PanelGroup direction="horizontal">
                    <Panel defaultSize={50} minSize={25}>
                        <OntologicalConsolePanel logs={consoleLogs} onCommand={handleCommand} />
                    </Panel>
                    <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                    <Panel defaultSize={50} minSize={25}>
                         <UnityHubPanel
                            integrations={integrations}
                            activeUrl={activeIntegrationUrl}
                            setActiveUrl={setActiveIntegrationUrl}
                         />
                    </Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
      </main>
      
      {/* Modals */}
      <GlyphSelectorModal
        isOpen={isGlyphSelectorOpen}
        onClose={() => setIsGlyphSelectorOpen(false)}
        glyphs={availableGlyphs}
        onGlyphSelect={handleCreateFromGlyph}
      />
      <CreateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <CreatePanel onAddPrimitive={handleAddPrimitive} />
      </CreateModal>
       <FunctionEditorModal
          isOpen={isFunctionEditorOpen}
          onClose={() => setIsFunctionEditorOpen(false)}
          onSave={handleSaveScript}
          onAnalyzeCode={handleAnalyzeCode}
          relation={editingRelation}
          existingScript={editingRelation ? customScripts[`${editingRelation.row.replace(/\//g, 'Or')}_${editingRelation.name.replace(/\//g, 'Or')}_${editingRelation.col.replace(/\//g, 'Or')}`] : undefined}
      />
      <IntegrateWebsiteModal
        isOpen={isIntegrateModalOpen}
        onClose={() => setIsIntegrateModalOpen(false)}
        onAdd={handleAddIntegration}
      />
      <input
        type="file"
        ref={importProjectInputRef}
        onChange={handleImportProjectFile}
        accept=".zip"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
       <input
        type="file"
        ref={importOntologyInputRef}
        onChange={handleImportOntologyFile}
        accept=".glb"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

    </div>
  );
};