

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
  // FIX: Added `updateCustomScripts` wrapper to set the dirty flag on change.
  const updateCustomScripts = useCallback((updater: React.SetStateAction<Record<string, string>>) => {
      setCustomScripts(updater);
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

  // FIX: Moved project helper functions before handleCommand to fix "used before declaration" error.
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

  const handleSaveProject = useCallback(async () => {
    if (!currentProjectId) {
        logToIDE('No active project to save.', 'error');
        return;
    }
    setIsProcessing(true);
    try {
        const state = getProjectState();
        await backendService.saveProjectState(currentProjectId, state);
        setIsDirty(false);
        logToIDE(`Project ${currentProjectId} saved.`, 'success');
    } catch(e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Error saving project: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
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
  
  const handleProxyCallCommand = useCallback(async (fullCommand: string) => {
    // Expected format: proxy_call <url> '[json_payload]'
    const commandName = 'proxy_call ';
    const commandBody = fullCommand.substring(commandName.length);
    
    let targetUrl = '';
    let payloadStr = '';
    
    // Find the start of the JSON payload (if it exists)
    const firstQuoteIndex = commandBody.indexOf("'");
    if (firstQuoteIndex > -1) {
        targetUrl = commandBody.substring(0, firstQuoteIndex).trim();
        payloadStr = commandBody.substring(firstQuoteIndex);
    } else {
        targetUrl = commandBody.trim();
    }

    if (!targetUrl) {
        logToIDE("Usage: proxy_call <url> '[json_payload]'", 'error');
        return;
    }
    
    let payload: any = {};
    if (payloadStr) {
        try {
            // Trim the single quotes and parse
            payload = JSON.parse(payloadStr.slice(1, -1));
        } catch(e) {
            logToIDE(`Invalid JSON payload: ${e instanceof Error ? e.message : String(e)}`, 'error');
            return;
        }
    }
    
    logToIDE(`Proxying call to ${targetUrl}...`, 'system');

    try {
      await backendService.proxyCall(targetUrl, payload, (data) => {
        let type: ConsoleLog['type'] = 'out';
        if (data.type === 'error' || data.type === 'stderr') type = 'error';
        if (data.type === 'system' || data.type === 'exit') type = 'system';
        // The payload from the backend might be an object or a string. Ensure we log a string.
        const logPayload = typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload);
        logToIDE(logPayload, type);
      });
    } catch(e) {
      const message = e instanceof Error ? e.message : String(e);
      logToIDE(`Proxy call failed: ${message}`, 'error');
    }
  }, [logToIDE]);
  
  // --- CORE COMMAND HANDLER ---
  const handleCommand = useCallback(async (command: string) => {
    logToIDE(command, 'in');

    if (command.startsWith('bun ')) {
        handleBunCommand(command);
        return;
    }
    
    if (command.startsWith('proxy_call ')) {
        handleProxyCallCommand(command);
        return;
    }
    
    const [verb, ...args] = command.trim().split(/\s+/);
    if (!verb) return;

    if (selectedObjectKeys.length === 0 && !myos[verb]) {
      logToIDE('No object selected. Please select an object in the Hierarchy or 3D view.', 'error');
      return;
    }

    if (verb.toLowerCase() === 'oscillate' && selectedObjectKeys.length === 1) {
        handleOscillateCommand(args, selectedObjectKeys[0]);
        return;
    }
    if (verb.toLowerCase() === 'stop' && selectedObjectKeys.length === 1) {
        handleStopOscillationCommand(args, selectedObjectKeys[0]);
        return;
    }

    const commandFoundInMyos = Object.values(myos).some(concept => typeof concept[verb] === 'function');
    
    if(commandFoundInMyos) {
      if(selectedObjectKeys.length === 0) {
        logToIDE(`The command '${verb}' requires a selected object.`, 'error');
        return;
      }
      logToIDE(`Executing MyOS command: '${verb}' on ${selectedObjectKeys.length} objects...`, 'system');
      for (const key of selectedObjectKeys) {
        let executed = false;
        for (const conceptName in myos) {
          if (typeof myos[conceptName][verb] === 'function') {
            await myos[conceptName][verb](key);
            executed = true;
            break;
          }
        }
        if (!executed) {
           logToIDE(`Command '${verb}' not found for object ${key}.`, 'error');
        }
      }
    } else {
        // Fallback to Gemini AI for natural language queries
        logToIDE('No command found. Querying MyOS AI...', 'ai');
        analysisLogIdRef.current = Date.now();
        const initialLog: ConsoleLog = { id: analysisLogIdRef.current, text: '...', type: 'out' };
        setConsoleLogs(prev => [...prev, initialLog]);

        try {
            await backendService.aiQuery(command, (data) => {
                if (data.type === 'chunk') {
                    setConsoleLogs(prev => prev.map(log => 
                        log.id === analysisLogIdRef.current ? { ...log, text: (log.text === '...' ? '' : log.text) + data.payload } : log
                    ));
                } else if (data.type === 'source') {
                    const sourcesText = `Context sources: ${data.payload.map((s: any) => `${s.concept} (${s.similarity.toFixed(2)})`).join(', ')}`;
                    logToIDE(sourcesText, 'source');
                }
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setConsoleLogs(prev => prev.map(log => 
                log.id === analysisLogIdRef.current ? { ...log, text: `Error: ${message}`, type: 'error' } : log
            ));
        }
    }
  }, [selectedObjectKeys, myos, logToIDE, handleOscillateCommand, handleStopOscillationCommand, handleBunCommand, handleProxyCallCommand]);
  
  const handleAddPrimitive = useCallback((type: PrimitiveType) => {
    const id = `primitive-${type}-${Date.now()}`;
    const newPrimitive: PrimitiveObject = { id, type };

    let defaultParams: any = {};
    switch(type) {
        case 'box': defaultParams = { width: 10, height: 10, depth: 10 }; break;
        case 'sphere': defaultParams = { radius: 5, widthSegments: 32, heightSegments: 16 }; break;
        case 'cylinder': defaultParams = { radiusTop: 5, radiusBottom: 5, height: 10, radialSegments: 32 }; break;
        case 'cone': defaultParams = { radius: 5, height: 10, radialSegments: 32 }; break;
        case 'torus': defaultParams = { radius: 10, tube: 3, radialSegments: 16, tubularSegments: 100 }; break;
        case 'plane': defaultParams = { width: 10, height: 10 }; break;
        case 'dodecahedron': defaultParams = { radius: 10, detail: 0 }; break;
        case 'icosahedron': defaultParams = { radius: 10, detail: 0 }; break;
        case 'octahedron': defaultParams = { radius: 10, detail: 0 }; break;
        case 'tetrahedron': defaultParams = { radius: 10, detail: 0 }; break;
        case 'torusKnot': defaultParams = { radius: 10, tube: 3, tubularSegments: 100, radialSegments: 16, p: 2, q: 3 }; break;
        case 'point': defaultParams = {}; break; // Point has no geometry params
    }

    setPrimitiveObjects(prev => [...prev, newPrimitive]);
    updateObjectParameters(prev => ({...prev, [id]: defaultParams }));
    setIsCreateModalOpen(false);
    logToIDE(`Created new ${type}.`, 'success');
  }, [logToIDE, updateObjectParameters]);

  const handleCreateFromGlyph = useCallback(async (glyphChar: string) => {
    if (!glyphChar) return;
    setIsProcessing(true);
    setProcessingError(null);
    try {
      const glyphData = await generateSingleGlyph(glyphChar);
      const newObject: GlyphObject = {
        id: `glyph-${glyphChar}-${Date.now()}`,
        glyphData,
      };
      setGlyphObjects(prev => [...prev, newObject]);
      updateObjectSettings(prev => ({...prev, [newObject.id]: { extrude: DEFAULT_EXTRUDE_SETTINGS }}));
      logToIDE(`Created new glyph: '${glyphChar}'`, 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setProcessingError(message);
      logToIDE(`Error creating glyph: ${message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [generateSingleGlyph, logToIDE, updateObjectSettings]);
  
  const handleLoadFont = useCallback(async (fontFile: File) => {
      setIsProcessing(true);
      logToIDE(`Loading font: ${fontFile.name}...`, 'info');
      try {
          await loadFont(fontFile);
          logToIDE('Font loaded successfully.', 'success');
      } catch(e) {
           const message = e instanceof Error ? e.message : String(e);
           logToIDE(`Font loading failed: ${message}`, 'error');
      } finally {
          setIsProcessing(false);
      }
  }, [loadFont, logToIDE]);

  const handleImportModel = useCallback(async (modelFile: File) => {
    setIsProcessing(true);
    logToIDE(`Importing model: ${modelFile.name}...`, 'info');
    try {
      const buffer = await modelFile.arrayBuffer();
      const loader = new GLTFLoader();
      
      loader.parse(buffer.slice(0), '', (gltf) => {
        const id = `glb-model-${modelFile.name}-${Date.now()}`;
        
        // --- START Ontological Parameter Extraction ---
        const params: OntologicalParameter[] = [];
        gltf.scene.traverse((obj: THREE.Object3D) => {
            if (obj.userData) {
                for (const key in obj.userData) {
                    if (key.startsWith('myos_param_')) {
                        const parts = key.split('_');
                        if (parts.length >= 4) {
                            const [,, concept, ...displayNameParts] = parts;
                            const displayName = displayNameParts.join(' ');
                            const value = obj.userData[key];
                            
                            const param: OntologicalParameter = {
                                id: key,
                                objectUUID: obj.uuid,
                                modelId: id,
                                concept: concept.toUpperCase(),
                                displayName: displayName,
                                type: typeof value === 'boolean' ? 'boolean' : 'number',
                                value: value,
                                target: obj.userData[`myos_target_${concept}_${displayName.replace(/ /g, '_')}`],
                                min: obj.userData[`myos_min_${concept}_${displayName.replace(/ /g, '_')}`],
                                max: obj.userData[`myos_max_${concept}_${displayName.replace(/ /g, '_')}`],
                                step: obj.userData[`myos_step_${concept}_${displayName.replace(/ /g, '_')}`],
                            };
                            params.push(param);
                        }
                    }
                }
            }
        });
        // --- END Ontological Parameter Extraction ---
        
        const newModel: LoadedModel = {
          id: id,
          scene: gltf.scene,
          filename: modelFile.name,
          identity: 'TBD',
          gltfJson: gltf.parser.json,
          originalBuffer: buffer,
        };

        setLoadedModels(prev => [...prev, newModel]);
        if (params.length > 0) {
            updateOntologicalParameters(prev => ({...prev, [id]: params}));
            logToIDE(`Found ${params.length} ontological parameters in ${modelFile.name}`, 'info');
        }
        logToIDE(`Model '${modelFile.name}' imported successfully.`, 'success');
        setIsProcessing(false);

      }, (error) => {
        throw new Error(`GLTF Parse error: ${error.message}`);
      });
    } catch(e) {
      const message = e instanceof Error ? e.message : String(e);
      logToIDE(`Error importing model: ${message}`, 'error');
      setIsProcessing(false);
    }
  }, [logToIDE, updateOntologicalParameters]);

  const handleDeleteObject = useCallback((key: string) => {
    const displayName = getDisplayName(key, glyphObjects, loadedModels, primitiveObjects);
    if (key.startsWith('glyph-')) setGlyphObjects(prev => prev.filter(o => o.id !== key));
    if (key.startsWith('glb-model-')) setLoadedModels(prev => prev.filter(o => o.id !== key));
    if (key.startsWith('primitive-')) setPrimitiveObjects(prev => prev.filter(o => o.id !== key));
    
    // Clean up associated state
    setObjectTransforms(prev => { const next = {...prev}; delete next[key]; return next; });
    setObjectModifiers(prev => { const next = {...prev}; delete next[key]; return next; });
    setObjectSettings(prev => { const next = {...prev}; delete next[key]; return next; });
    setObjectParameters(prev => { const next = {...prev}; delete next[key]; return next; });
    setOntologicalParameters(prev => { const next = {...prev}; delete next[key]; return next; });
    setObjectOscillators(prev => { const next = {...prev}; delete next[key]; return next; });
    setRelationships(prev => prev.filter(r => r.from !== key && r.to !== key));
    setSelectedObjectKeys(prev => prev.filter(k => k !== key));
    setIsDirty(true);
    logToIDE(`Deleted ${displayName}.`, 'info');
  }, [glyphObjects, loadedModels, primitiveObjects, logToIDE]);

  // --- PROJECT LIFECYCLE ---

  const loadProjectState = useCallback(async (state: ProjectState) => {
      // Clear existing scene
      setGlyphObjects([]);
      setLoadedModels([]);
      setPrimitiveObjects([]);
      setObjectTransforms({});
      setObjectModifiers({});
      setObjectSettings({});
      setObjectParameters({});
      setObjectOscillators({});
      setOntologicalParameters({});
      setRelationships([]);
      setSelectedObjectKeys([]);
      setCustomScripts({});
      
      // Load new state
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
      setIntegrations(state.integrations || INITIAL_INTEGRATIONS);

      // Rehydrate loaded models from base64
      if (state.loadedModels) {
          const rehydratedModels: LoadedModel[] = [];
          for (const sModel of state.loadedModels) {
              const buffer = base64ToArrayBuffer(sModel.originalBuffer);
              const loader = new GLTFLoader();
              try {
                  const gltf = await loader.parseAsync(buffer, '');
                   const rehydratedModel: LoadedModel = {
                      ...sModel,
                      scene: gltf.scene,
                      gltfJson: gltf.parser.json,
                      originalBuffer: buffer,
                  };
                  rehydratedModels.push(rehydratedModel);
              } catch(e) {
                  logToIDE(`Failed to rehydrate model ${sModel.filename}`, 'error');
              }
          }
          setLoadedModels(rehydratedModels);
      }
      setIsDirty(false); // Project is clean after loading
  }, [logToIDE]);

  const handleNewProject = useCallback(() => {
    const create = async () => {
        setIsProcessing(true);
        try {
            const { projectId } = await backendService.createNewWorkspace();
            setCurrentProjectId(projectId);
            await loadProjectState({} as ProjectState); // Load empty state
            logToIDE(`New project workspace created: ${projectId}`, 'success');
        } catch(e) {
            const message = e instanceof Error ? e.message : String(e);
            logToIDE(`Failed to create new project: ${message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    if (isDirty) {
        if (window.confirm("You have unsaved changes. Are you sure you want to create a new project?")) {
            create();
        }
    } else {
        create();
    }
  }, [isDirty, logToIDE, loadProjectState]);

  const handleImportProject = useCallback(() => {
    const doImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setIsProcessing(true);
                try {
                    logToIDE(`Importing project ${file.name}...`, 'info');
                    const { projectId } = await backendService.uploadProject(file);
                    const state = await backendService.loadProjectState(projectId);
                    await loadProjectState(state);
                    setCurrentProjectId(projectId);
                    logToIDE(`Project ${projectId} imported successfully.`, 'success');
                } catch (err) {
                     const message = err instanceof Error ? err.message : String(err);
                     logToIDE(`Failed to import project: ${message}`, 'error');
                } finally {
                    setIsProcessing(false);
                }
            }
        };
        input.click();
    };

    if (isDirty) {
        if (confirm('You have unsaved changes that will be lost. Continue with import?')) {
            doImport();
        }
    } else {
        doImport();
    }
  }, [isDirty, logToIDE, loadProjectState]);

  useEffect(() => {
    // --- Initial Project Creation ---
    const initializeProject = async () => {
      setIsProcessing(true);
      logToIDE('Initializing backend workspace...', 'system');
      try {
        const { projectId } = await backendService.createNewWorkspace();
        setCurrentProjectId(projectId);
        logToIDE(`New session started. Workspace ID: ${projectId}`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logToIDE(`Failed to create initial workspace: ${message}`, 'error');
        logToIDE('Save/load functionality will be unavailable.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    initializeProject();
  }, [logToIDE]);


  const handleOpenFunctionEditor = useCallback((relation: EditingRelation) => {
    setEditingRelation(relation);
    setIsFunctionEditorOpen(true);
  }, []);

  // FIX: Created an adapter function to match the prop type of OntologyMatrixPanel.
  const handleEditRelationshipAdapter = useCallback((relation: { source: string; target: string; verb: string; }) => {
    handleOpenFunctionEditor({ row: relation.source, col: relation.target, name: relation.verb });
  }, [handleOpenFunctionEditor]);

  const handleSaveCustomScript = useCallback((code: string) => {
    if (!editingRelation) return;
    const { row, col, name } = editingRelation;
    const sanitize = (s: string) => s.replace(/\//g, 'Or');
    const key = `${sanitize(row)}_${sanitize(name)}_${sanitize(col)}`;
    
    // FIX: Changed to `updateCustomScripts` to fix "Cannot find name" error.
    updateCustomScripts(prev => ({ ...prev, [key]: code }));
    setIsFunctionEditorOpen(false);
    setEditingRelation(null);
    logToIDE(`Saved custom script for ${row} -> ${name}`, 'success');
  }, [editingRelation, logToIDE, updateCustomScripts]);
  
  const handleAnalyzeCode = useCallback(async (code: string) => {
    logToIDE('Analyzing custom script with MyOS AI...', 'ai');
    analysisLogIdRef.current = Date.now();
    const initialLog: ConsoleLog = { id: analysisLogIdRef.current, text: '...', type: 'out' };
    setConsoleLogs(prev => [...prev, initialLog]);

    try {
        // We're just re-using the AI query service for this as the streaming logic is identical.
        // On the backend, we could route this to a different prompt/model if needed.
        await backendService.aiQuery(`Analyze this MyOS script:\n\n${code}`, (data) => {
            if (data.type === 'chunk') {
                setConsoleLogs(prev => prev.map(log => 
                    log.id === analysisLogIdRef.current ? { ...log, text: (log.text === '...' ? '' : log.text) + data.payload } : log
                ));
            }
        });
    } catch(e) {
        const message = e instanceof Error ? e.message : String(e);
        setConsoleLogs(prev => prev.map(log => 
            log.id === analysisLogIdRef.current ? { ...log, text: `Error: ${message}`, type: 'error' } : log
        ));
    }
  }, [logToIDE]);
  
  const handleAddIntegration = useCallback((integration: Integration) => {
      updateIntegrations(prev => {
          // Avoid duplicates
          if(prev.some(i => i.url === integration.url)) {
              logToIDE(`Integration for ${integration.url} already exists.`, 'info');
              return prev;
          }
          logToIDE(`Added integration: ${integration.title}`, 'success');
          return [...prev, integration]
      });
      setActiveIntegrationUrl(integration.url);
  }, [logToIDE, updateIntegrations]);

  const handleImportOntology = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb';
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            logToIDE(`Importing ontology from ${file.name}...`, 'info');
            try {
                const buffer = await file.arrayBuffer();
                const schema = await readGlb(buffer);
                setOntologicalMatrix(schema.relationshipMatrix);
                updateCustomScripts(schema.customScripts || {});
                logToIDE('Ontology imported successfully.', 'success');
            } catch(err) {
                const message = err instanceof Error ? err.message : String(err);
                logToIDE(`Failed to import ontology: ${message}`, 'error');
            }
        }
    };
    input.click();
  }, [logToIDE, updateCustomScripts]);

  const handleExportOntology = useCallback(() => {
      try {
        logToIDE('Exporting ontology...', 'info');
        const schema: OntologicalSchema = {
            relationshipMatrix: ontologicalMatrix,
            customScripts: customScripts
        };
        const buffer = writeGlb(schema);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myos-ontology-${Date.now()}.glb`;
        a.click();
        URL.revokeObjectURL(url);
        logToIDE('Ontology exported successfully.', 'success');
      } catch(e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Failed to export ontology: ${message}`, 'error');
      }
  }, [ontologicalMatrix, customScripts, logToIDE]);


  return (
    <div className="w-screen h-screen bg-bg-light text-base-100 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-2 border-b border-gray-700/50 flex-shrink-0">
            <h1 className="text-xl font-bold text-brand-secondary">MyOS 3D IDE</h1>
            <Toolbar
                isFontLoaded={fontLoaded}
                onCreateFromGlyph={() => setIsGlyphSelectorOpen(true)}
                onImportModel={handleImportModel}
                onLoadFont={handleLoadFont}
                onSaveScene={() => viewerRef.current?.saveScene()}
                onNewProject={handleNewProject}
                onSaveProject={handleSaveProject}
                onImportProject={handleImportProject}
                onExportProject={handleExportProject}
                onImportOntology={handleImportOntology}
                onExportOntology={handleExportOntology}
                onCreatePrimitive={() => setIsCreateModalOpen(true)}
                onIntegrateWebsite={() => setIsIntegrateModalOpen(true)}
                isProcessing={isProcessing}
            />
        </header>

      <PanelGroup direction="horizontal" className="flex-grow">
        <Panel defaultSize={20} minSize={15}>
            <PanelGroup direction="vertical">
                 <Panel defaultSize={50} minSize={25}>
                    <HierarchyPanel
                        glyphObjects={glyphObjects}
                        loadedModels={loadedModels}
                        primitiveObjects={primitiveObjects}
                        selectedObjectKeys={selectedObjectKeys}
                        setSelectedObjectKeys={setSelectedObjectKeys}
                        onDeleteObject={handleDeleteObject}
                        onUpdateObjectData={() => {}}
                        objectTransforms={objectTransforms}
                        objectModifiers={objectModifiers}
                        objectSettings={objectSettings}
                        objectParameters={objectParameters}
                    />
                 </Panel>
                 <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                 <Panel defaultSize={50} minSize={25}>
                    <OntologyMatrixPanel
                        relationshipMatrix={ontologicalMatrix}
                        onExecuteRelationship={() => {}}
                        onEditRelationship={handleEditRelationshipAdapter}
                        customScripts={customScripts}
                        focusedConcept={focusedConcept}
                        setFocusedConcept={setFocusedConcept}
                    />
                 </Panel>
            </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
        <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">
                <Panel defaultSize={70} minSize={30}>
                   <UnityHubPanel
                      integrations={integrations}
                      activeUrl={activeIntegrationUrl}
                      setActiveUrl={setActiveIntegrationUrl}
                   />
                </Panel>
                <PanelResizeHandle className="h-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
                <Panel defaultSize={30} minSize={15}>
                  <OntologicalConsolePanel logs={consoleLogs} onCommand={handleCommand} />
                </Panel>
            </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-1 bg-bg-dark hover:bg-brand-primary transition-colors" />
        <Panel defaultSize={25} minSize={15}>
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
            isLoading={isFontProcessing || isProcessing}
          />
        </Panel>
      </PanelGroup>

        {/* MODALS */}
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
            onSave={handleSaveCustomScript}
            onAnalyzeCode={handleAnalyzeCode}
            relation={editingRelation}
            existingScript={editingRelation ? customScripts[`${editingRelation.row.replace(/\//g,'Or')}_${editingRelation.name.replace(/\//g,'Or')}_${editingRelation.col.replace(/\//g,'Or')}`] : ''}
        />
        <IntegrateWebsiteModal
            isOpen={isIntegrateModalOpen}
            onClose={() => setIsIntegrateModalOpen(false)}
            onAdd={handleAddIntegration}
        />

    </div>
  );
};