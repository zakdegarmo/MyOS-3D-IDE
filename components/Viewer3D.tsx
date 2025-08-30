/// <reference types="@react-three/fiber" />
{/* FIX: Removed redundant `import '@react-three/fiber';`. The triple-slash directive is sufficient for type augmentation. */}
import React, { Suspense, useMemo, useEffect, useRef, useState, useCallback, useLayoutEffect, useImperativeHandle } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { TrackballControls, Center, Environment, PointerLockControls, Line, useHelper, Edges } from '@react-three/drei';
import type { TrackballControls as TrackballControlsImpl, PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';
import { CrosshairIcon, OrbitIcon, ResetCameraIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { ExtrusionAnimator } from './ExtrusionAnimator';
import type { TransformState, ModifiersState, Relationship, LoadedModel, GlyphObject, ObjectGeometrySettings, GlyphData, PrimitiveObject, OntologicalParameter, ConsoleLog, Oscillator } from '../types';
import { ColorPalette } from './ColorPalette';
import { applyBend, applyTaper, applyTwist } from './geometryModifiers';
import { getDisplayName } from '../utils/getDisplayName';
import { setNestedProperty } from '../utils/propertyUtils';

export type CameraMode = 'orbit' | 'fly';


// --- Export Utilities ---
const exportGLB = (input: THREE.Object3D | THREE.Object3D[]): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      input,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // Should not happen with binary: true, but for completeness
          const textEncoder = new TextEncoder();
          resolve(textEncoder.encode(JSON.stringify(result)).buffer);
        }
      },
      (error) => {
        console.error("GLTFExporter error:", error);
        reject(error);
      },
      { binary: true, animations: [] } // Assuming no animations for now
    );
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};


// --- Free Roam Controls Implementation ---

const useKeyboardControls = () => {
  const keys = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = isDown;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = isDown;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = isDown;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = isDown;
          break;
        case 'KeyR':
          keys.current.up = isDown;
          break;
        case 'KeyF':
          keys.current.down = isDown;
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
    
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  
  return keys.current;
}


const FirstPersonControls: React.FC<{
  movementSpeed: number;
  onLock: () => void;
  onUnlock: () => void;
}> = ({ movementSpeed, onLock, onUnlock }) => {
  const { camera } = useThree();
  const controls = useRef<PointerLockControlsImpl>(null!);
  const pressed = useKeyboardControls();

  useFrame((_, delta) => {
    if (!controls.current?.isLocked) return;

    const speed = movementSpeed * delta;
    if (pressed.forward) controls.current.moveForward(speed);
    if (pressed.backward) controls.current.moveForward(-speed);
    if (pressed.right) controls.current.moveRight(speed);
    if (pressed.left) controls.current.moveRight(-speed);
    if (pressed.up) camera.position.y += speed;
    if (pressed.down) camera.position.y -= speed;
  });

  return <PointerLockControls ref={controls} onLock={onLock} onUnlock={onUnlock} />;
};


interface SolidAndWireframeMeshProps {
  geometry: THREE.BufferGeometry;
  modifiers?: ModifiersState;
  color?: string;
  isExtrusion?: boolean;
}

const findInstanceKey = (object: THREE.Object3D): string | null => {
    let current: THREE.Object3D | null = object;
    while (current) {
        if (current.userData.instanceKey) {
            return current.userData.instanceKey;
        }
        current = current.parent;
    }
    return null;
};

const SolidAndWireframeMesh: React.FC<SolidAndWireframeMeshProps> = ({ geometry, modifiers, color = '#ffffff', isExtrusion = false }) => {
    const modifiedGeometry = useMemo(() => {
        const clonedGeom = geometry.clone();
        if (modifiers?.twist?.enabled) {
            applyTwist(clonedGeom, modifiers.twist.axis, modifiers.twist.angle);
        }
        if (modifiers?.bend?.enabled) {
            applyBend(clonedGeom, modifiers.bend.axis, modifiers.bend.angle);
        }
        if (modifiers?.taper?.enabled) {
            applyTaper(clonedGeom, modifiers.taper.axis, modifiers.taper.factor);
        }
        clonedGeom.computeVertexNormals();
        return clonedGeom;
    }, [geometry, modifiers]);

    const edges = useMemo(() => new THREE.EdgesGeometry(modifiedGeometry, 1), [modifiedGeometry]);

    const [isAnimating, setIsAnimating] = useState(isExtrusion);
    const wireframeMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#A0E9FF', transparent: true, opacity: 0.5 }), []);
    
    useEffect(() => {
        setIsAnimating(isExtrusion);
    }, [isExtrusion]);

    return (
        <group>
            <mesh geometry={modifiedGeometry}>
                <meshStandardMaterial color={color} side={THREE.DoubleSide} metalness={0.2} roughness={0.6} />
            </mesh>
            {isExtrusion && (
                <ExtrusionAnimator 
                    geometry={edges} 
                    duration={1.5} 
                    isAnimating={isAnimating}
                    onAnimationComplete={() => setIsAnimating(false)}
                    material={wireframeMaterial}
                />
            )}
            {!isExtrusion && (
                <lineSegments geometry={edges} material={wireframeMaterial} />
            )}
        </group>
    );
};

// Type for the object refs map
type ObjectRefs = { [key: string]: React.RefObject<THREE.Group> };

// Reusable wrapper for applying transformations
const ObjectWrapper = React.forwardRef<THREE.Group, {
    instanceKey: string;
    transform: TransformState | undefined;
    children: React.ReactNode;
}>(({ instanceKey, transform, children }, ref) => {
    const { position = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1] } = transform || {};
    return (
        <group
            ref={ref}
            userData={{ instanceKey }}
            position={position}
            quaternion={new THREE.Quaternion().fromArray(rotation)}
            scale={scale}
        >
            {children}
        </group>
    );
});


const GlyphInstance: React.FC<{
    glyphObject: GlyphObject;
    settings: ObjectGeometrySettings | undefined;
    modifiers: ModifiersState | undefined;
}> = ({ glyphObject, settings, modifiers }) => {
    const geometry = useMemo(() => {
        const extrudeSettings = settings?.extrude || { depth: 8, bevelThickness: 1, bevelSize: 0.5 };
        return new THREE.ExtrudeGeometry(glyphObject.glyphData.shapes, {
            ...extrudeSettings,
            bevelEnabled: true,
            bevelSegments: 2,
        });
    }, [glyphObject.glyphData.shapes, settings]);

    return <SolidAndWireframeMesh geometry={geometry} modifiers={modifiers} isExtrusion />;
};

const PrimitiveInstance: React.FC<{
    primitive: PrimitiveObject;
    parameters: any;
    modifiers: ModifiersState | undefined;
}> = ({ primitive, parameters, modifiers }) => {
    const geometry = useMemo(() => {
        switch(primitive.type) {
            case 'box': return new THREE.BoxGeometry(parameters.width, parameters.height, parameters.depth);
            case 'sphere': return new THREE.SphereGeometry(parameters.radius, parameters.widthSegments, parameters.heightSegments);
            case 'cylinder': return new THREE.CylinderGeometry(parameters.radiusTop, parameters.radiusBottom, parameters.height, parameters.radialSegments);
            case 'cone': return new THREE.ConeGeometry(parameters.radius, parameters.height, parameters.radialSegments);
            case 'torus': return new THREE.TorusGeometry(parameters.radius, parameters.tube, parameters.radialSegments, parameters.tubularSegments);
            case 'plane': return new THREE.PlaneGeometry(parameters.width, parameters.height);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(parameters.radius, parameters.detail);
            case 'icosahedron': return new THREE.IcosahedronGeometry(parameters.radius, parameters.detail);
            case 'octahedron': return new THREE.OctahedronGeometry(parameters.radius, parameters.detail);
            case 'tetrahedron': return new THREE.TetrahedronGeometry(parameters.radius, parameters.detail);
            case 'torusKnot': return new THREE.TorusKnotGeometry(parameters.radius, parameters.tube, parameters.tubularSegments, parameters.radialSegments, parameters.p, parameters.q);
            case 'point': return new THREE.BufferGeometry(); // Point needs a Points material, handle separately if needed
            default: return new THREE.BoxGeometry();
        }
    }, [primitive.type, parameters]);

    if (primitive.type === 'point') {
        return <points><pointsMaterial color="white" size={0.5} /></points>;
    }

    return <SolidAndWireframeMesh geometry={geometry} modifiers={modifiers} />;
};


const ModelInstance: React.FC<{ model: LoadedModel, modifiers?: ModifiersState }> = ({ model, modifiers }) => {
    const scene = useMemo(() => model.scene.clone(), [model.scene]);
    // Note: Applying modifiers to a loaded model is complex. 
    // This is a simplified approach that won't work correctly without traversing and cloning geometries.
    // For now, we'll just render the scene.
    return <primitive object={scene} />;
};

const AnimationController: React.FC<{
    objectOscillators: Record<string, Oscillator[]>;
    objectModifiers: Record<string, ModifiersState>;
    setObjectModifiers: (updater: React.SetStateAction<Record<string, ModifiersState>>) => void;
}> = ({ objectOscillators, objectModifiers, setObjectModifiers }) => {
    const { clock } = useThree();

    useFrame(() => {
        const activeOscillators = Object.entries(objectOscillators).filter(([, oscs]) => oscs?.some(o => o.enabled));
        if (activeOscillators.length === 0) return;
        
        const updates: Record<string, ModifiersState> = {};
        const elapsedTime = clock.getElapsedTime();

        for (const [key, oscillators] of activeOscillators) {
            let needsUpdate = false;
            // Start with a clone of the current modifiers for this object
            const newModifiers = JSON.parse(JSON.stringify(objectModifiers[key] || {}));

            for (const osc of oscillators) {
                if (osc.enabled) {
                    const value = osc.baseValue + Math.sin(elapsedTime * osc.frequency + osc.offset) * osc.amplitude;
                    // setNestedProperty immutably sets the value and returns the new top-level object
                    const updatedModifiers = setNestedProperty(newModifiers, osc.property, value);
                    Object.assign(newModifiers, updatedModifiers);
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                updates[key] = newModifiers;
            }
        }
        
        if (Object.keys(updates).length > 0) {
            setObjectModifiers(prev => ({...prev, ...updates}));
        }
    });

    return null; // This component doesn't render anything
};


const SceneContent: React.FC<Viewer3DProps & { objectRefs: ObjectRefs, sceneRef: React.RefObject<THREE.Group> }> = (props) => {
    const {
        glyphObjects, loadedModels, primitiveObjects, objectParameters, objectTransforms, objectModifiers, setObjectModifiers,
        objectSettings, selectedObjectKeys, setSelectedObjectKeys, relationships, objectRefs, sceneRef, objectOscillators,
    } = props;

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const key = findInstanceKey(e.object);
        if (key) {
             setSelectedObjectKeys(keys => {
                if (e.shiftKey) {
                    return keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key];
                } else {
                    return keys.length === 1 && keys[0] === key ? [] : [key];
                }
            });
        }
    };
    
    // Create refs for all objects
    useMemo(() => {
        const allKeys = [
            ...glyphObjects.map(o => o.id),
            ...loadedModels.map(o => o.id),
            ...primitiveObjects.map(o => o.id)
        ];
        allKeys.forEach(key => {
            if (!objectRefs[key]) {
                objectRefs[key] = React.createRef<THREE.Group>();
            }
        });
        // Cleanup old refs
        Object.keys(objectRefs).forEach(key => {
            if (!allKeys.includes(key)) {
                delete objectRefs[key];
            }
        });
    }, [glyphObjects, loadedModels, primitiveObjects, objectRefs]);

    return (
        <Suspense fallback={null}>
             <AnimationController 
                objectOscillators={objectOscillators}
                objectModifiers={objectModifiers}
                setObjectModifiers={setObjectModifiers}
            />
            <group ref={sceneRef} onPointerDown={handlePointerDown}>
                {glyphObjects.map(obj => (
                    <ObjectWrapper key={obj.id} instanceKey={obj.id} ref={objectRefs[obj.id]} transform={objectTransforms[obj.id]}>
                        <GlyphInstance glyphObject={obj} settings={objectSettings[obj.id]} modifiers={objectModifiers[obj.id]} />
                    </ObjectWrapper>
                ))}
                {primitiveObjects.map(obj => (
                    <ObjectWrapper key={obj.id} instanceKey={obj.id} ref={objectRefs[obj.id]} transform={objectTransforms[obj.id]}>
                        <PrimitiveInstance primitive={obj} parameters={objectParameters[obj.id]} modifiers={objectModifiers[obj.id]} />
                    </ObjectWrapper>
                ))}
                {loadedModels.map(obj => (
                     <ObjectWrapper key={obj.id} instanceKey={obj.id} ref={objectRefs[obj.id]} transform={objectTransforms[obj.id]}>
                        <ModelInstance model={obj} modifiers={objectModifiers[obj.id]}/>
                    </ObjectWrapper>
                ))}
                
                {/* Render Relationships */}
                {relationships.map((rel, i) => {
                    const fromRef = objectRefs[rel.from];
                    const toRef = objectRefs[rel.to];
                    if (fromRef?.current && toRef?.current) {
                        return <Line key={i} points={[fromRef.current.position, toRef.current.position]} color="#FFC107" lineWidth={1} dashed dashSize={1} gapSize={0.5} />;
                    }
                    return null;
                })}
            </group>
            
             {/* Selection Outlines */}
            {selectedObjectKeys.map(key => {
                const ref = objectRefs[key];
                if (ref?.current) {
                    return (
                        <group key={`sel-${key}`} position={ref.current.position} quaternion={ref.current.quaternion} scale={ref.current.scale}>
                            {ref.current.children.map((child, i) => (
                                child instanceof THREE.Group && child.children.map((mesh, j) => (
                                    mesh instanceof THREE.Mesh && <Edges key={`${i}-${j}`} geometry={mesh.geometry} scale={1.01}><lineBasicMaterial color="#00A9FF" toneMapped={false} /></Edges>
                                ))
                            ))}
                        </group>
                    )
                }
                return null;
            })}

            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Environment preset="city" />
        </Suspense>
    );
};

const CameraControlsWrapper: React.FC<{ cameraMode: CameraMode, isFlyModeLocked: boolean }> = ({ cameraMode, isFlyModeLocked }) => {
    const controls = useRef<TrackballControlsImpl>(null!);
    const { camera, gl } = useThree();

    useEffect(() => {
        if(controls.current) {
            const center = new THREE.Vector3(0,0,0);
            camera.lookAt(center);
            controls.current.target.copy(center);
            controls.current.update();
        }
    }, [camera]);
    
    return (
        <>
            {cameraMode === 'orbit' && <TrackballControls ref={controls} noZoom={false} noPan={false} rotateSpeed={3} />}
            {cameraMode === 'fly' && !isFlyModeLocked && <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-center p-4">Click to lock controls and fly</div>}
        </>
    );
}

// Interface for the controller that will live inside the Canvas
interface CameraUIControllerHandle {
  resetCamera: () => void;
  zoom: (factor: number) => void;
}

// This component lives inside the Canvas, so it can safely use R3F hooks.
// It doesn't render anything itself but exposes control functions via a ref.
const CameraUIController = React.forwardRef<CameraUIControllerHandle, {}>((_props, ref) => {
  const { camera, controls } = useThree();

  const resetCamera = useCallback(() => {
    if ((controls as any)?.reset) {
        (controls as any).reset();
    } else {
        camera.position.set(0, 10, 50);
        camera.lookAt(0, 0, 0);
    }
  }, [camera, controls]);
    
  const zoom = useCallback((factor: number) => {
   camera.zoom *= factor;
   camera.updateProjectionMatrix();
  }, [camera]);

  useImperativeHandle(ref, () => ({
    resetCamera,
    zoom,
  }));

  return null; // This component is for logic only, it does not render.
});

// This component is now "dumb" and renders the UI outside the Canvas.
// It receives control functions as props.
const ViewerUI: React.FC<{
    cameraMode: CameraMode;
    setCameraMode: (mode: CameraMode) => void;
    onResetCamera: () => void;
    onZoom: (factor: number) => void;
}> = ({ cameraMode, setCameraMode, onResetCamera, onZoom }) => {
    return (
        <div className="absolute top-2 left-2 flex flex-col space-y-1 z-10">
             <div className="bg-bg-light/80 backdrop-blur-sm rounded-md p-1 flex space-x-1 border border-gray-700/50">
                <button title="Orbit Controls" onClick={() => setCameraMode('orbit')} className={`p-2 rounded ${cameraMode === 'orbit' ? 'bg-brand-primary text-bg-dark' : 'text-base-200 hover:bg-gray-700'}`}><OrbitIcon /></button>
                <button title="Fly Controls" onClick={() => setCameraMode('fly')} className={`p-2 rounded ${cameraMode === 'fly' ? 'bg-brand-primary text-bg-dark' : 'text-base-200 hover:bg-gray-700'}`}><CrosshairIcon /></button>
            </div>
             <div className="bg-bg-light/80 backdrop-blur-sm rounded-md p-1 flex space-x-1 border border-gray-700/50">
                <button title="Zoom In" onClick={() => onZoom(1.2)} className="p-2 rounded text-base-200 hover:bg-gray-700"><ZoomInIcon /></button>
                <button title="Zoom Out" onClick={() => onZoom(1 / 1.2)} className="p-2 rounded text-base-200 hover:bg-gray-700"><ZoomOutIcon /></button>
                <button title="Reset Camera" onClick={onResetCamera} className="p-2 rounded text-base-200 hover:bg-gray-700"><ResetCameraIcon /></button>
            </div>
        </div>
    );
};


export interface Viewer3DHandle {
  saveScene: () => void;
  getObjectGeometry: (key: string) => Float32Array | undefined;
};


interface Viewer3DProps {
  glyphObjects: GlyphObject[];
  loadedModels: LoadedModel[];
  primitiveObjects: PrimitiveObject[];
  objectParameters: Record<string, any>;
  ontologicalParameters: Record<string, OntologicalParameter[]>;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  objectTransforms: Record<string, TransformState>;
  setObjectTransforms: (updater: React.SetStateAction<Record<string, TransformState>>) => void;
  objectModifiers: Record<string, ModifiersState>;
  setObjectModifiers: (updater: React.SetStateAction<Record<string, ModifiersState>>) => void;
  objectOscillators: Record<string, Oscillator[]>;
  objectSettings: Record<string, ObjectGeometrySettings>;
  selectedObjectKeys: string[];
  setSelectedObjectKeys: (keys: string[] | ((prev: string[]) => string[])) => void;
  relationships: Relationship[];
  onDeleteObject: (key: string) => void;
  logToIDE: (text: string, type: ConsoleLog['type']) => void;
}


export const Viewer3D = React.forwardRef<Viewer3DHandle, Viewer3DProps>(
  (props, ref) => {
    const sceneRef = useRef<THREE.Group>(null);
    const objectRefs = useRef<ObjectRefs>({}).current;
    
    const [isFlyModeLocked, setIsFlyModeLocked] = useState(false);
    const cameraControllerRef = useRef<CameraUIControllerHandle>(null);

    useImperativeHandle(ref, () => ({
      saveScene: async () => {
        if (!sceneRef.current) return;
        try {
            const result = await exportGLB(sceneRef.current);
            const blob = new Blob([result], { type: 'application/octet-stream' });
            downloadBlob(blob, `myos-scene-${Date.now()}.glb`);
            props.logToIDE('Scene exported successfully.', 'success');
        } catch(e) {
            const message = e instanceof Error ? e.message : String(e);
            props.logToIDE(`Scene export failed: ${message}`, 'error');
        }
      },
      getObjectGeometry: (key: string) => {
        const objRef = objectRefs[key];
        const obj = objRef?.current;
        if (!obj) return undefined;
        
        let geometry: THREE.BufferGeometry | undefined;
        obj.traverse(child => {
            if (child instanceof THREE.Mesh) {
                geometry = child.geometry;
            }
        });

        return geometry?.attributes.position?.array as Float32Array;
      }
    }), [props.logToIDE, objectRefs]);
    
    const handleResetCamera = useCallback(() => cameraControllerRef.current?.resetCamera(), []);
    const handleZoom = useCallback((factor: number) => cameraControllerRef.current?.zoom(factor), []);

    return (
      <div className="w-full h-full bg-bg-dark relative">
        <Canvas camera={{ position: [0, 10, 50], fov: 50 }}>
          <CameraUIController ref={cameraControllerRef} />
          <SceneContent {...props} objectRefs={objectRefs} sceneRef={sceneRef} />
          <CameraControlsWrapper cameraMode={props.cameraMode} isFlyModeLocked={isFlyModeLocked} />
           {props.cameraMode === 'fly' && <FirstPersonControls movementSpeed={20} onLock={() => setIsFlyModeLocked(true)} onUnlock={() => setIsFlyModeLocked(false)} />}
        </Canvas>
        <ViewerUI 
            cameraMode={props.cameraMode} 
            setCameraMode={props.setCameraMode}
            onResetCamera={handleResetCamera}
            onZoom={handleZoom}
        />
      </div>
    );
  }
);