
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
import { AuthEndpointModal } from './components/AuthEndpointModal';
import { TransformState, ModifiersState, Relationship, LoadedModel, GlyphObject, ObjectGeometrySettings, ExtrudeSettings, PrimitiveObject, PrimitiveType, OntologicalParameter, ConsoleLog, EditingRelation, ProjectState, SerializableLoadedModel, Oscillator, OntologicalSchema, Integration, TextureInfo, PaintToolState } from './types';
import { Toolbar } from './components/Toolbar';
import { createSystem, Concept } from './system/systemFactory';
import { backendService } from './services/backendService';
import { arrayBufferToBase64, base64ToArrayBuffer } from './utils/bufferUtils';
import { getDisplayName } from './utils/getDisplayName';
import { getNestedProperty, setNestedProperty } from './utils/propertyUtils';
import { readGlb, writeGlb } from './utils/glbSchemaParser';
import { TabbedPanel } from './components/TabbedPanel';
import { AssetsPanel } from './panels/AssetsPanel';


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
  const [objectTextureAssignments, setObjectTextureAssignments] = useState<Record<string, string>>({});
  const [objectPaintedTextures, setObjectPaintedTextures] = useState<Record<string, string>>({}); // objId -> dataUrl
  
  // Asset Management State
  const [textures, setTextures] = useState<Record<string, { name: string; texture: THREE.Texture; dataUrl: string }>>({});
  const [paintedTextures, setPaintedTextures] = useState<Record<string, THREE.CanvasTexture>>({}); // objId -> texture
  
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [activeIntegrationUrl, setActiveIntegrationUrl] = useState<string>(INITIAL_INTEGRATIONS[0]?.url || '');
  const [paintToolState, setPaintToolState] = useState<PaintToolState>({ enabled: false, color: '#ff0000', size: 10, opacity: 1 });

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

  const { generateSingleGlyph, isLoading: isFontProcessing, fontLoaded, isFontLoading, loadFont, availableGlyphs, error: fontError } = useGlyphGenerator();
  
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
  const updateTextures = useCallback((updater: React.SetStateAction<Record<string, { name: string; texture: THREE.Texture; dataUrl: string }>>) => {
      setTextures(updater);
      setIsDirty(true);
  }, []);
  const updateObjectTextureAssignments = useCallback((updater: React.SetStateAction<Record<string, string>>) => {
      setObjectTextureAssignments(updater);
      setIsDirty(true);
  }, []);
    const updateObjectPaintedTextures = useCallback((updater: React.SetStateAction<Record<string, string>>) => {
      setObjectPaintedTextures(updater);
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
  
  // Effect to report font loading errors to the user via the IDE console
  useEffect(() => {
    if (fontError) {
        logToIDE(`Font loading error: ${fontError}`, 'error');
    }
  }, [fontError, logToIDE]);


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

  // --- PROJECT LIFECYCLE ---
  const getProjectState = useCallback((): ProjectState => {
    const serializableModels: SerializableLoadedModel[] = loadedModels.map(model => ({
      id: model.id,
      filename: model.filename,
      identity: model.identity,
      originalBuffer: model.originalBuffer ? arrayBufferToBase64(model.originalBuffer) : '',
    }));
    
    const serializableTextures: TextureInfo[] = Object.entries(textures).map(([id, textureData]) => ({
      id,
      name: textureData.name,
      dataUrl: textureData.dataUrl,
    }));
    
    return {
      glyphObjects, loadedModels: serializableModels, primitiveObjects,
      objectTransforms, objectModifiers, objectSettings, objectParameters,
      objectOscillators, ontologicalParameters, relationships, customScripts,
      ontologicalMatrix, integrations,
      textures: serializableTextures, objectTextureAssignments, objectPaintedTextures,
    };
  }, [
      glyphObjects, loadedModels, primitiveObjects, objectTransforms, objectModifiers,
      objectSettings, objectParameters, objectOscillators, ontologicalParameters,
      relationships, customScripts, ontologicalMatrix, integrations, textures,
      objectTextureAssignments, objectPaintedTextures
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
            setObjectTextureAssignments(state.objectTextureAssignments || {});
            setObjectPaintedTextures(state.objectPaintedTextures || {});

            const loadedIntegrations = state.integrations && state.integrations.length > 0 ? state.integrations : INITIAL_INTEGRATIONS;
            setIntegrations(loadedIntegrations);
            setActiveIntegrationUrl(loadedIntegrations.find(i => i.url === './data_crucible.html')?.url || loadedIntegrations[0]?.url || '');
            setSelectedObjectKeys([]);

            const modelPromises = (state.loadedModels || []).map(serialModel => {
                return new Promise<LoadedModel>((resolveModel, rejectModel) => {
                    const buffer = base64ToArrayBuffer(serialModel.originalBuffer);
                    new GLTFLoader().parse(
                        buffer.slice(0), '',
                        (gltf) => resolveModel({
                            id: serialModel.id, filename: serialModel.filename, identity: serialModel.identity,
                            scene: gltf.scene, gltfJson: gltf.parser.json, originalBuffer: buffer,
                        }),
                        (error) => {
                            logToIDE(`Failed to parse model ${serialModel.filename}: ${error.message}`, 'error');
                            rejectModel(error);
                        }
                    );
                });
            });

            const texturePromises = (state.textures || []).map(texInfo => {
                return new Promise<{ id: string; name: string; texture: THREE.Texture; dataUrl: string }>((resolveTex, rejectTex) => {
                    new THREE.TextureLoader().load(
                        texInfo.dataUrl,
                        (texture) => resolveTex({ ...texInfo, texture }),
                        undefined,
                        (err) => {
                             logToIDE(`Failed to load texture ${texInfo.name}: ${err}`, 'error');
                             rejectTex(err);
                        }
                    );
                });
            });

            const paintedTexturePromises = Object.entries(state.objectPaintedTextures || {}).map(([objId, dataUrl]) => {
                return new Promise<{ objId: string; texture: THREE.CanvasTexture }>((resolvePaint, rejectPaint) => {
                    const image = new Image();
                    image.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = image.width;
                        canvas.height = image.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(image, 0, 0);
                        resolvePaint({ objId, texture: new THREE.CanvasTexture(canvas) });
                    };
                    image.onerror = rejectPaint;
                    image.src = dataUrl;
                });
            });

            Promise.all([Promise.all(modelPromises), Promise.all(texturePromises), Promise.all(paintedTexturePromises)])
            .then(([rehydratedModels, rehydratedTextures, rehydratedPainted]) => {
                setLoadedModels(rehydratedModels);
                setTextures(rehydratedTextures.reduce((acc, tex) => {
                    acc[tex.id] = tex;
                    return acc;
                }, {} as Record<string, { name: string; texture: THREE.Texture; dataUrl: string }>));
                setPaintedTextures(rehydratedPainted.reduce((acc, painted) => {
                    acc[painted.objId] = painted.texture;
                    return acc;
                }, {} as Record<string, THREE.CanvasTexture>));
                logToIDE('Project state loaded successfully.', 'success');
                setIsDirty(false);
                resolve();
            }).catch(err => {
                logToIDE(`Error rehydrating assets: ${err.message || err}`, 'error');
                reject(err);
            }).finally(() => setIsProcessing(false));

        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logToIDE(`Failed to load project state: ${message}`, 'error');
            setIsProcessing(false);
            reject(e);
        }
    });
  }, [logToIDE]);

  const handleExportProject = useCallback(() => {
    try {
        logToIDE(`Preparing project for local download...`, 'info');
        const state = getProjectState();
        const stateString = JSON.stringify(state, null, 2);
        const blob = new Blob([stateString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const projectId = currentProjectId || 'myos-project';
        a.download = `${projectId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logToIDE('Project downloaded successfully as JSON.', 'success');
        setIsDirty(false);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logToIDE(`Failed to download project: ${message}`, 'error');
    }
  }, [getProjectState, logToIDE, currentProjectId]);
  
  const handleSaveProject = useCallback(() => {
    logToIDE('Saving project by exporting to a local JSON file...', 'info');
    handleExportProject();
  }, [handleExportProject]);

  const handleImportProject = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes that will be lost. Continue?")) {
        return;
    }
    importProjectInputRef.current?.click();
  }, [isDirty]);

  const handleImportProjectFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
        logToIDE('ZIP project import requires a backend. Please import the project state .json file directly.', 'error');
        if(event.target) event.target.value = '';
        return;
    }

    try {
        setIsProcessing(true);
        logToIDE(`Importing project from ${file.name}...`, 'info');
        
        const fileContent = await file.text();
        const state = JSON.parse(fileContent) as ProjectState;
        
        await loadProjectState(state);
        
        const newProjectId = `local-${file.name.split('.')[0]}-${Date.now()}`;
        setCurrentProjectId(newProjectId);
        logToIDE(`Project loaded. New local session ID: ${newProjectId}.`, 'info');
        
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logToIDE(`Failed to import project file: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
        if(event.target) event.target.value = ''; // Reset input
    }
  }, [loadProjectState, logToIDE]);

  const handleNewProject = useCallback(() => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to start a new project?")) {
        return;
    }
    
    setIsProcessing(true);
    
    // Generate a client-side project ID
    const projectId = `local-proj-${Date.now()}`; 
    setCurrentProjectId(projectId);

    // Reset all state
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
    setCustomScripts({}); 
    setOntologicalMatrix(INITIAL_RELATIONSHIP_MATRIX);
    setIntegrations(INITIAL_INTEGRATIONS); 
    setActiveIntegrationUrl(INITIAL_INTEGRATIONS[0]?.url || '');
    setSelectedObjectKeys([]); 
    setConsoleLogs([]);
    setTextures({});
    setObjectTextureAssignments({});
    setPaintedTextures({});
    setObjectPaintedTextures({});
    
    setIsDirty(false);
    logToIDE(`New local project started. ID: ${projectId}`, 'system');
    
    setIsProcessing(false);
  }, [isDirty, logToIDE]);
  
  // Create an initial project when the app loads
  useEffect(() => {
    handleNewProject();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportOntology = useCallback(() => {
    try {
      const schema: Omit<OntologicalSchema, 'mooseVersion'> = { relationshipMatrix: ontologicalMatrix, customScripts };
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
    if (currentProjectId.startsWith('local-')) {
        logToIDE('Bun commands require a server-based project workspace. This is a local session.', 'error');
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
    const newLogId = Date.now() + Math.random();
    setConsoleLogs(prev => [...prev, { id: newLogId, text: '', type: 'ai', status: 'thinking' }]);

    let accumulatedText = '';
    let isFirstChunk = true;

    backendService.aiQuery(command, (data) => {
        if (data.type === 'source') {
            const sourcesText = (data.payload as any[]).map(s => `[${s.concept}: ${(s.similarity * 100).toFixed(1)}%]`).join(' ');
            logToIDE(`Context: ${sourcesText}`, 'source');
        } else if (data.type === 'chunk') {
            accumulatedText += data.payload;
            setConsoleLogs(prev => {
                return prev.map(log => {
                    if (log.id === newLogId) {
                        const updatedLog: ConsoleLog = { ...log, text: accumulatedText };
                        if (isFirstChunk) {
                            delete updatedLog.status;
                            isFirstChunk = false;
                        }
                        return updatedLog;
                    }
                    return log;
                });
            });
        }
    }).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        setConsoleLogs(prev => prev.map(log => {
            if (log.id === newLogId) {
                return { id: log.id, text: `AI Query Error: ${message}`, type: 'error' };
            }
            return log;
        }));
    });
  }, [logToIDE, selectedObjectKeys, myos, glyphObjects, loadedModels, primitiveObjects, handleOscillateCommand, handleStopOscillationCommand, handleBunCommand, handleExportProject]);


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
    updateObjectTextureAssignments(updater);
    updateObjectPaintedTextures(updater);

    setPaintedTextures(prev => {
        const next = {...prev};
        delete next[keyToDelete];
        return next;
    });
    
    updateRelationships(prev => prev.filter(r => r.from !== keyToDelete && r.to !== keyToDelete));
    setSelectedObjectKeys(prev => prev.filter(k => k !== keyToDelete));
    setIsDirty(true);
  }, [updateObjectModifiers, updateObjectOscillators, updateObjectParameters, updateObjectSettings, updateObjectTransforms, updateRelationships, updateObjectTextureAssignments, updateObjectPaintedTextures]);


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

  const handleCreateGlyphLibrary = useCallback(async () => {
    if (!fontLoaded) {
        logToIDE("No font loaded. Please load a font file first from the 'File' menu.", 'error');
        return;
    }
    
    setIsProcessing(true);
    setProcessingError(null);
    logToIDE(`Generating glyph library for ${availableGlyphs.length} characters... This may take a moment.`, 'info');
    
    try {
        const newGlyphObjectsBatch: GlyphObject[] = [];
        const newObjectSettingsBatch: Record<string, ObjectGeometrySettings> = {};
        const newObjectTransformsBatch: Record<string, TransformState> = {};
        
        const gridCols = 10;
        const spacing = 25;
        let currentRow = 0;
        let currentCol = 0;

        for (const char of availableGlyphs) {
            try {
                const glyphData = await generateSingleGlyph(char);
                const newId = `glyph-${char}-${Date.now()}`;
                
                newGlyphObjectsBatch.push({ id: newId, glyphData });
                newObjectSettingsBatch[newId] = { extrude: DEFAULT_EXTRUDE_SETTINGS };

                const x = (currentCol - (gridCols - 1) / 2) * spacing;
                const y = 0;
                const z = -currentRow * spacing;
                newObjectTransformsBatch[newId] = { position: [x, y, z], rotation: [0, 0, 0, 1], scale: [1, 1, 1] };
                
                currentCol++;
                if (currentCol >= gridCols) {
                    currentCol = 0;
                    currentRow++;
                }
            } catch (glyphError) {
                logToIDE(`Could not generate glyph for '${char}'. Skipping.`, 'error');
            }
        }
        
        // Batch update state
        setGlyphObjects(prev => [...prev, ...newGlyphObjectsBatch]);
        updateObjectSettings(prev => ({ ...prev, ...newObjectSettingsBatch }));
        updateObjectTransforms(prev => ({ ...prev, ...newObjectTransformsBatch }));
        
        logToIDE(`Successfully created a library with ${newGlyphObjectsBatch.length} glyph objects.`, 'success');
        setIsDirty(true);
        
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setProcessingError(message);
        logToIDE(`Glyph library creation failed: ${message}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [fontLoaded, availableGlyphs, generateSingleGlyph, updateObjectSettings, updateObjectTransforms, logToIDE]);


  const handleImportGlb = useCallback((file: File) => {
    if (isDirty) {
        if (!window.confirm("Importing a GLB file may overwrite parts of your project if it's a MOOSE ontology file. Unsaved changes may be lost. Continue?")) {
            return;
        }
    }

    setIsProcessing(true);
    setProcessingError(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) throw new Error("File could not be read.");

            // Attempt to read as MOOSE ontology first
            try {
                const schema = await readGlb(buffer.slice(0)); // Use slice to get a fresh buffer
                setOntologicalMatrix(schema.relationshipMatrix);
                setCustomScripts(schema.customScripts || {});
                setIsDirty(true);
                logToIDE(`Successfully imported MOOSE ontology from ${file.name}`, 'success');
            } catch (ontologyError) {
                if (ontologyError instanceof Error && ontologyError.message.startsWith('Not a MOOSE')) {
                    // This is expected for standard models, not a true error.
                    logToIDE(`'${file.name}' is not a MOOSE ontology file. Loading as a 3D model.`, 'info');
                    const loader = new GLTFLoader();
                    loader.parse(
                        buffer.slice(0),
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
                            logToIDE(`Successfully loaded model ${file.name}`, 'success');
                        },
                        (gltfError) => {
                            throw new Error(`GLTF parsing failed: ${gltfError.message}`);
                        }
                    );
                } else {
                    // It's a real error from readGlb (e.g., corrupted file)
                    throw ontologyError;
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setProcessingError(message);
            logToIDE(`Failed to import GLB file '${file.name}': ${message}`, 'error');
        } finally {
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
  }, [logToIDE, isDirty]);

  const handleImportTexture = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
            logToIDE(`Could not read texture file ${file.name}`, 'error');
            return;
        }
        new THREE.TextureLoader().load(dataUrl, (texture) => {
            const id = `texture-${Date.now()}`;
            texture.needsUpdate = true;
            updateTextures(prev => ({
                ...prev,
                [id]: { name: file.name, texture, dataUrl }
            }));
            logToIDE(`Texture '${file.name}' imported successfully.`, 'success');
        });
    };
    reader.readAsDataURL(file);
}, [logToIDE, updateTextures]);

  const handleDeleteTexture = useCallback((textureId: string) => {
    // Unassign from all objects first
    updateObjectTextureAssignments(prev => {
        const next = {...prev};
        Object.entries(next).forEach(([objKey, texKey]) => {
            if (texKey === textureId) {
                delete next[objKey];
            }
        });
        return next;
    });
    // Then delete the texture itself
    updateTextures(prev => {
        const next = {...prev};
        delete next[textureId];
        return next;
    });
  }, [updateObjectTextureAssignments, updateTextures]);

  const handleAssignTexture = useCallback((objectKeys: string[], textureId: string | null) => {
    updateObjectTextureAssignments(prev => {
        const next = {...prev};
        objectKeys.forEach(key => {
            if (textureId === null) {
                delete next[key];
            } else {
                next[key] = textureId;
            }
        });
        return next;
    });
  }, [updateObjectTextureAssignments]);
  
  const handlePaintedTextureCreate = useCallback((objectKey: string, texture: THREE.CanvasTexture) => {
    setPaintedTextures(prev => ({ ...prev, [objectKey]: texture }));
    updateObjectPaintedTextures(prev => ({ ...prev, [objectKey]: texture.image.toDataURL() }));
    setIsDirty(true);
  }, [updateObjectPaintedTextures]);

  const handlePaintedTextureUpdate = useCallback((objectKey: string, texture: THREE.CanvasTexture) => {
    // Only update the dataURL for serialization, the texture object itself is managed in the viewer
    updateObjectPaintedTextures(prev => ({ ...prev, [objectKey]: texture.image.toDataURL() }));
    setIsDirty(true);
  }, [updateObjectPaintedTextures]);
  
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

  const handleUpdateObjectProperty = useCallback((key: string, path: string, value: any) => {
      const rootProperty = path.split('.')[0];
      const pathWithoutRoot = path.substring(path.indexOf('.') + 1);

      switch (rootProperty) {
          case 'transform':
              updateObjectTransforms(prev => {
                  const current = prev[key] || {};
                  return { ...prev, [key]: setNestedProperty(current, pathWithoutRoot, value) };
              });
              break;
          case 'modifiers':
              updateObjectModifiers(prev => {
                  const current = prev[key] || {};
                  return { ...prev, [key]: setNestedProperty(current, pathWithoutRoot, value) };
              });
              break;
          case 'parameters':
              if (key.startsWith('primitive-')) {
                  updateObjectParameters(prev => {
                      const current = prev[key] || {};
                      return { ...prev, [key]: setNestedProperty(current, pathWithoutRoot, value) };
                  });
              }
              break;
          case 'settings':
              if (key.startsWith('glyph-')) {
                  updateObjectSettings(prev => {
                      const current = prev[key] || {};
                      return { ...prev, [key]: setNestedProperty(current, pathWithoutRoot, value) };
                  });
              }
              break;
      }
  }, [updateObjectTransforms, updateObjectModifiers, updateObjectParameters, updateObjectSettings]);

  const handleAnalyzeCode = useCallback((code: string) => {
    const newLogId = Date.now() + Math.random();
    setConsoleLogs(prev => [...prev, { id: newLogId, text: '', type: 'ai', status: 'thinking' }]);

    let accumulatedText = '';
    let isFirstChunk = true;

    backendService.analyzeCode(code, (data) => {
        if (data.type === 'chunk') {
            accumulatedText += data.payload;
            setConsoleLogs(prev => {
                return prev.map(log => {
                    if (log.id === newLogId) {
                        const updatedLog: ConsoleLog = { ...log, text: accumulatedText };
                        if (isFirstChunk) {
                            delete updatedLog.status;
                            isFirstChunk = false;
                        }
                        return updatedLog;
                    }
                    return log;
                });
            });
        }
    }).catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        setConsoleLogs(prev => prev.map(log => {
            if (log.id === newLogId) {
                return { id: log.id, text: `Code Analysis Error: ${message}`, type: 'error' };
            }
            return log;
        }));
    });
  }, []);

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

  return (
    <div className="h-screen w-screen bg-bg-light text-base-100 flex flex-col font-sans">
      <header className="flex-shrink-0 bg-bg-dark h-12 flex items-center justify-between px-4 border-b border-gray-700/50 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-lg text-brand-secondary">MyOS IDE</div>
          <Toolbar
            onLoadFont={loadFont}
            onCreateFromGlyph={() => setIsGlyphSelectorOpen(true)}
            isFontLoaded={fontLoaded}
            onSaveScene={() => viewerRef.current?.saveScene()}
            onNewProject={handleNewProject}
            onSaveProject={handleSaveProject}
            onImportProject={handleImportProject}
            onExportProject={handleExportProject}
            onExportOntology={handleExportOntology}
            onCreatePrimitive={() => setIsCreateModalOpen(true)}
            onIntegrateWebsite={() => setIsIntegrateModalOpen(true)}
            onCreateGlyphLibrary={handleCreateGlyphLibrary}
            onConfigureAuth={() => setIsAuthModalOpen(true)}
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
                        <TabbedPanel tabs={[
                            { title: 'Hierarchy', content: (
                                <HierarchyPanel
                                    glyphObjects={glyphObjects}
                                    loadedModels={loadedModels}
                                    primitiveObjects={primitiveObjects}
                                    selectedObjectKeys={selectedObjectKeys}
                                    setSelectedObjectKeys={setSelectedObjectKeys}
                                    onDeleteObject={handleDeleteObject}
                                    onUpdateObjectProperty={handleUpdateObjectProperty}
                                    objectParameters={objectParameters}
                                    objectSettings={objectSettings}
                                    objectModifiers={objectModifiers}
                                    objectTransforms={objectTransforms}
                                />
                            )},
                            { title: 'Assets', content: (
                                <AssetsPanel 
                                    textures={textures}
                                    onImportTexture={handleImportTexture}
                                    onDeleteTexture={handleDeleteTexture}
                                    onImportModel={handleImportGlb}
                                />
                            )},
                            { title: 'Ontology', content: (
                                <OntologyMatrixPanel
                                    relationshipMatrix={ontologicalMatrix}
                                    onExecuteRelationship={handleExecuteRelationship}
                                    onEditRelationship={handleEditRelationship}
                                    customScripts={customScripts}
                                    focusedConcept={focusedConcept}
                                    setFocusedConcept={setFocusedConcept}
                                />
                            )},
                        ]}/>
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
                          paintToolState={paintToolState}
                          setPaintToolState={setPaintToolState}
                          textures={textures}
                          objectTextureAssignments={objectTextureAssignments}
                          paintedTextures={paintedTextures}
                          onPaintedTextureCreate={handlePaintedTextureCreate}
                          onPaintedTextureUpdate={handlePaintedTextureUpdate}
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
                            textures={textures}
                            objectTextureAssignments={objectTextureAssignments}
                            onAssignTexture={handleAssignTexture}
                            paintToolState={paintToolState}
                            setPaintToolState={setPaintToolState}
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
      <AuthEndpointModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        logToIDE={logToIDE}
      />
      <input
        type="file"
        ref={importProjectInputRef}
        onChange={handleImportProjectFile}
        accept=".json"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
};
