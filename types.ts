

import type * as THREE from 'three';

export type GenerationTechnique = 'Lathe' | 'Extrude';
export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'dodecahedron' | 'icosahedron' | 'octahedron' | 'tetrahedron' | 'torusKnot' | 'point';

export interface ExtrudeSettings {
  depth: number;
  bevelThickness: number;
  bevelSize: number;
}

export interface LatheSettings {
  segments: number;
  phiLength: number;
}

export interface ObjectGeometrySettings {
  extrude?: ExtrudeSettings;
}

export interface GlyphData {
  char: string;
  shapes: THREE.Shape[];
  advanceWidth: number;
}

export interface GlyphObject {
  id: string;
  glyphData: GlyphData;
}


export interface TransformState {
  position: [number, number, number];
  rotation: [number, number, number, number]; // Quaternion [x, y, z, w]
  scale: [number, number, number];
}

export interface ModifiersState {
  twist?: { enabled: boolean; axis: 'x' | 'y' | 'z'; angle: number };
  bend?: { enabled: boolean; axis: 'x' | 'y' | 'z'; angle: number };
  taper?: { enabled: boolean; axis: 'x' | 'y' | 'z'; factor: number };
}

export interface Oscillator {
  id: string;
  enabled: boolean;
  property: string; // e.g., 'modifiers.bend.angle'
  frequency: number;
  amplitude: number;
  offset: number; // phase shift
  baseValue: number;
}

export interface Relationship {
  from: string;
  to: string;
  type: string;
}

export interface LoadedModel {
  id:string;
  scene: THREE.Group;
  filename: string;
  identity: string;
  gltfJson?: any; // The parsed GLTF JSON from the loader
  originalBuffer?: ArrayBuffer; // The raw GLB file buffer
}

export interface PrimitiveObject {
  id: string;
  type: PrimitiveType;
}

export interface OntologicalParameter {
  id: string; // The original key from userData, e.g., 'myos_param_RESONANCE_Glow_Intensity'
  objectUUID: string; // The UUID of the THREE.Object3D that has this parameter
  modelId: string; // The ID of the loaded GLB model this belongs to
  concept: string; // e.g., 'RESONANCE'
  displayName: string; // e.g., 'Glow Intensity'
  type: 'number' | 'boolean';
  value: number | boolean;
  target?: string; // Optional target property path, e.g., 'material.emissiveIntensity'
  min?: number;
  max?: number;
  step?: number;
}

export interface ConsoleLog {
  id: number;
  text: string;
  type: 'in' | 'out' | 'error' | 'info' | 'success' | 'system' | 'ai' | 'source';
  status?: 'thinking';
}

export type EditingRelation = {
    row: string;
    col: string;
    name: string;
};

// --- Web Integrations ---
export interface Integration {
  title: string;
  url: string;
}

// --- Textures & Painting ---
export interface TextureInfo {
    id: string;
    name: string;
    dataUrl: string; // base64 data URL
}

export interface PaintToolState {
    enabled: boolean;
    color: string;
    size: number;
    opacity: number;
}


// --- Project Save/Load Types ---

// A version of LoadedModel that is safe to serialize to JSON.
// The ArrayBuffer is converted to a base64 string.
export interface SerializableLoadedModel {
  id: string;
  filename: string;
  identity: string;
  originalBuffer: string; // base64 encoded
}

// Defines the entire state of a saved project.
export interface ProjectState {
    glyphObjects: GlyphObject[];
    loadedModels: SerializableLoadedModel[];
    primitiveObjects: PrimitiveObject[];
    objectTransforms: Record<string, TransformState>;
    objectModifiers: Record<string, ModifiersState>;
    objectSettings: Record<string, ObjectGeometrySettings>;
    objectParameters: Record<string, any>;
    objectOscillators: Record<string, Oscillator[]>;
    ontologicalParameters: Record<string, OntologicalParameter[]>;
    relationships: Relationship[];
    customScripts: Record<string, string>;
    ontologicalMatrix: Record<string, Record<string, string>>;
    integrations: Integration[];
    textures: TextureInfo[];
    objectTextureAssignments: Record<string, string>; // objectId -> textureId
    objectPaintedTextures: Record<string, string>; // objectId -> base64 dataUrl of painted texture
}

// --- Ontology Schema for GLB serialization ---
export interface OntologicalSchema {
  mooseVersion?: '1.0';
  relationshipMatrix: Record<string, Record<string, string>>;
  customScripts: Record<string, string>;
}
