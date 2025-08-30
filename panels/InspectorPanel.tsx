

import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

import { Button } from '../components/Button';
import { Slider } from '../components/Slider';
import { LinkIcon, ModifiersIcon, SlidersIcon, TransformIcon } from '../components/icons';
import { TransformState, ModifiersState, Relationship, ObjectGeometrySettings, ExtrudeSettings, PrimitiveObject, Oscillator } from '../types';
import { OscillatorsPanel } from './OscillatorsPanel';

interface InspectorPanelProps {
    objectTransforms: Record<string, TransformState>;
    setObjectTransforms: (transforms: React.SetStateAction<Record<string, TransformState>>) => void;
    objectModifiers: Record<string, ModifiersState>;
    setObjectModifiers: (modifiers: React.SetStateAction<Record<string, ModifiersState>>) => void;
    objectSettings: Record<string, ObjectGeometrySettings>;
    setObjectSettings: (settings: React.SetStateAction<Record<string, ObjectGeometrySettings>>) => void;
    objectParameters: Record<string, any>;
    setObjectParameters: (parameters: React.SetStateAction<Record<string, any>>) => void;
    objectOscillators: Record<string, Oscillator[]>;
    setObjectOscillators: (oscillators: React.SetStateAction<Record<string, Oscillator[]>>) => void;
    selectedObjectKeys: string[];
    primitiveObjects: PrimitiveObject[];
    relationships: Relationship[];
    setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>;
    isLoading: boolean;
}


// --- MAIN INSPECTOR PANEL ---

export const InspectorPanel: React.FC<InspectorPanelProps> = (props) => {
    const {
        objectTransforms, setObjectTransforms, objectModifiers, setObjectModifiers, 
        objectSettings, setObjectSettings, objectParameters, setObjectParameters, 
        objectOscillators, setObjectOscillators,
        selectedObjectKeys, primitiveObjects,
        relationships, setRelationships, isLoading
    } = props;
    
    const selectionInfo = useMemo(() => {
        if (selectedObjectKeys.length === 0) {
            return { type: 'none' as const };
        }

        const getKeyType = (key: string) => {
            if (key.startsWith('glb-model-')) return 'model';
            if (key.startsWith('primitive-')) return 'primitive';
            if (key.startsWith('glyph-')) return 'glyph';
            return 'unknown';
        };

        const firstType = getKeyType(selectedObjectKeys[0]);
        const isMixed = selectedObjectKeys.some(key => getKeyType(key) !== firstType);

        if (isMixed) return { type: 'mixed' as const };
        
        return { type: firstType };
    }, [selectedObjectKeys]);

    const singleSelectedPrimitive = useMemo(() => {
        if (selectionInfo.type === 'primitive' && selectedObjectKeys.length === 1) {
            return primitiveObjects.find(p => p.id === selectedObjectKeys[0]);
        }
        return null;
    }, [selectionInfo, selectedObjectKeys, primitiveObjects]);
    

    return (
        <aside className="w-full h-full p-6 flex flex-col overflow-y-auto">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1D232A; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #718096; }
            `}</style>
            <header className="mb-6">
                <h2 className="text-lg font-semibold text-brand-secondary">Inspector</h2>
                <p className="text-xs text-base-300">Modify properties of selected objects</p>
            </header>

            <div className="flex-grow space-y-6">
                 {selectedObjectKeys.length === 0 && (
                    <div className="bg-bg-dark p-4 rounded-lg border-2 border-dashed border-brand-primary/20 text-center animate-fade-in">
                        <p className="text-sm text-base-200 leading-relaxed">
                            <strong className="font-semibold text-brand-secondary">Select an object</strong> in the 3D view to inspect its properties.
                            <br />
                             <span className="text-xs text-base-300">Use 'Create' or the 'Object' menu to add new objects.</span>
                        </p>
                    </div>
                )}

                {selectedObjectKeys.length > 0 && (
                    <>
                        <TransformPanel
                            selectedKeys={selectedObjectKeys}
                            transforms={objectTransforms}
                            setTransforms={setObjectTransforms}
                        />
                        <ModifiersPanel
                            selectedKeys={selectedObjectKeys}
                            modifiers={objectModifiers}
                            setModifiers={setObjectModifiers}
                        />
                        <OscillatorsPanel
                            selectedKeys={selectedObjectKeys}
                            oscillators={objectOscillators}
                            setOscillators={setObjectOscillators}
                        />
                    </>
                )}
                
                {selectedObjectKeys.length > 1 && (
                    <MultiSelectActionsPanel
                        selectedKeys={selectedObjectKeys}
                        relationships={relationships}
                        setRelationships={setRelationships}
                        isLoading={isLoading}
                    />
                )}
                
                {selectionInfo.type === 'glyph' && (
                    <GlyphSettingsPanel
                        objectSettings={objectSettings}
                        setObjectSettings={setObjectSettings}
                        selectedObjectKeys={selectedObjectKeys}
                        isLoading={isLoading}
                    />
                )}

                {singleSelectedPrimitive && (
                    <PrimitiveSettingsPanel 
                        primitive={singleSelectedPrimitive}
                        parameters={objectParameters[singleSelectedPrimitive.id]}
                        setParameters={setObjectParameters}
                    />
                )}

            </div>

            <footer className="text-center text-xs text-gray-500 mt-6 pt-6 border-t border-gray-700/50">
                <p>Modify selected objects here.</p>
            </footer>
        </aside>
    );
};


// Sub-components for the Inspector Panel

const defaultTransform: TransformState = {
    position: [0, 0, 0],
    rotation: [0, 0, 0, 1], // Quaternion for no rotation [x, y, z, w]
    scale: [1, 1, 1],
};

const MultiSelectActionsPanel: React.FC<{
    selectedKeys: string[];
    relationships: Relationship[];
    setRelationships: React.Dispatch<React.SetStateAction<Relationship[]>>;
    isLoading: boolean;
}> = ({ selectedKeys, relationships, setRelationships, isLoading }) => {
    
    const handleCreateConnectionChain = () => {
        if (selectedKeys.length < 2) return;
        const newConnections: Relationship[] = [];
        for (let i = 0; i < selectedKeys.length - 1; i++) {
            const from = selectedKeys[i];
            const to = selectedKeys[i+1];
            const newConnection: Relationship = { from, to, type: 'connects' };

            const isDuplicate = relationships.some(r => 
                (r.from === from && r.to === to) || (r.from === to && r.to === from)
            );

            if (!isDuplicate) {
                newConnections.push(newConnection);
            }
        }
        if (newConnections.length > 0) {
            setRelationships(prev => [...prev, ...newConnections]);
        }
    };
    
    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-3 animate-fade-in">
             <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-5M3 4h5V9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4h-4m-1-5a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-1M8 4H4v4m1-5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V4z" />
                </svg>
                <h3 className="font-semibold text-lg text-brand-secondary">Actions</h3>
            </div>
            <p className="text-sm text-base-200">{selectedKeys.length} objects selected</p>
            <Button onClick={handleCreateConnectionChain} className="w-full" variant="secondary" disabled={isLoading}>
                <LinkIcon />
                Connect in Sequence
            </Button>
        </div>
    );
};


const TransformInput: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: number }> = ({ label, value, onChange, step = 0.1 }) => {
    const displayValue = isNaN(value) ? '' : value.toFixed(2);
    const placeholder = isNaN(value) ? '—' : undefined;

    return (
        <div className="flex flex-col">
            <label className="text-xs text-base-300 text-center">{label}</label>
            <input
                type="number"
                value={displayValue}
                placeholder={placeholder}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                step={step}
                className="w-full bg-bg-dark border border-gray-700 rounded-md text-white text-sm text-center font-mono p-1 focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
            />
        </div>
    );
};


const TransformPanel: React.FC<{
    selectedKeys: string[];
    transforms: Record<string, TransformState>;
    setTransforms: React.Dispatch<React.SetStateAction<Record<string, TransformState>>>;
}> = ({ selectedKeys, transforms, setTransforms }) => {
    
    const displayedTransform = useMemo(() => {
        if (selectedKeys.length === 0) {
            const euler = new THREE.Euler(); // Default is 0,0,0
            return {
                position: defaultTransform.position,
                rotation: [euler.x, euler.y, euler.z] as [number, number, number], // Euler in radians
                scale: defaultTransform.scale,
            };
        }

        const firstT = transforms[selectedKeys[0]] ?? defaultTransform;

        const checkConsistency = (prop: 'position' | 'scale', index: number): number => {
            const firstVal = firstT[prop][index];
            for (let i = 1; i < selectedKeys.length; i++) {
                const currentVal = (transforms[selectedKeys[i]] ?? defaultTransform)[prop][index];
                if (Math.abs(currentVal - firstVal) > 1e-6) return NaN;
            }
            return firstVal;
        };

        // Check rotation consistency
        let isRotationConsistent = true;
        const firstQuat = firstT.rotation;
        for (let i = 1; i < selectedKeys.length; i++) {
            const currentQuat = (transforms[selectedKeys[i]] ?? defaultTransform).rotation;
            if (
                Math.abs(currentQuat[0] - firstQuat[0]) > 1e-6 ||
                Math.abs(currentQuat[1] - firstQuat[1]) > 1e-6 ||
                Math.abs(currentQuat[2] - firstQuat[2]) > 1e-6 ||
                Math.abs(currentQuat[3] - firstQuat[3]) > 1e-6
            ) {
                isRotationConsistent = false;
                break;
            }
        }
        
        let displayRotation: [number, number, number] = [NaN, NaN, NaN];
        if (isRotationConsistent) {
            const q = new THREE.Quaternion().fromArray(firstQuat);
            const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
            displayRotation = [e.x, e.y, e.z];
        }

        return {
            position: [checkConsistency('position', 0), checkConsistency('position', 1), checkConsistency('position', 2)] as [number, number, number],
            rotation: displayRotation,
            scale: [checkConsistency('scale', 0), checkConsistency('scale', 1), checkConsistency('scale', 2)] as [number, number, number],
        };
    }, [selectedKeys, transforms]);


    const handleTransformChange = (type: keyof TransformState, axisIndex: 0 | 1 | 2, value: number) => {
        if (isNaN(value)) return;
        setTransforms(prev => {
            const next = { ...prev };
            selectedKeys.forEach(key => {
                const current = next[key] ?? JSON.parse(JSON.stringify(defaultTransform));
                
                if (type === 'rotation') {
                    // value is in degrees from the input
                    const radValue = THREE.MathUtils.degToRad(value);
                    
                    // Get the other two angles from the currently displayed state (which are in radians)
                    const currentEulerRad = displayedTransform.rotation;

                    // If a value is inconsistent ('NaN'), default it to 0 before creating the new Euler.
                    // This handles the multi-select case where values are mixed.
                    const xRad = isNaN(currentEulerRad[0]) ? 0 : currentEulerRad[0];
                    const yRad = isNaN(currentEulerRad[1]) ? 0 : currentEulerRad[1];
                    const zRad = isNaN(currentEulerRad[2]) ? 0 : currentEulerRad[2];

                    // Create a new Euler angle with the updated value.
                    const newEuler = new THREE.Euler(
                        axisIndex === 0 ? radValue : xRad,
                        axisIndex === 1 ? radValue : yRad,
                        axisIndex === 2 ? radValue : zRad,
                        'XYZ' // Use a consistent rotation order
                    );

                    // Convert the complete new Euler angle to a quaternion. This avoids gimbal lock.
                    const newQuaternion = new THREE.Quaternion().setFromEuler(newEuler);
                    
                    next[key] = {
                        ...current,
                        rotation: newQuaternion.toArray() as [number, number, number, number]
                    };

                } else {
                    const newTransform = { ...current };
                    newTransform[type] = [...newTransform[type]] as [number, number, number];
                    newTransform[type][axisIndex] = value;
                    next[key] = newTransform;
                }
            });
            return next;
        });
    };
    
    const handleReset = () => {
        setTransforms(prev => {
            const next = { ...prev };
            selectedKeys.forEach(key => {
                delete next[key];
            });
            return next;
        });
    };

    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <TransformIcon />
                    <h3 className="font-semibold text-lg text-brand-secondary">Transform</h3>
                </div>
                <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white hover:underline transition-colors">Reset</button>
            </div>

            <div>
                <h4 className="text-sm font-medium text-base-200 mb-1.5">Position</h4>
                <div className="grid grid-cols-3 gap-2">
                    <TransformInput label="X" value={displayedTransform.position[0]} onChange={(v) => handleTransformChange('position', 0, v)} />
                    <TransformInput label="Y" value={displayedTransform.position[1]} onChange={(v) => handleTransformChange('position', 1, v)} />
                    <TransformInput label="Z" value={displayedTransform.position[2]} onChange={(v) => handleTransformChange('position', 2, v)} />
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium text-base-200 mb-1.5">Rotation (°)</h4>
                <div className="grid grid-cols-3 gap-2">
                    <TransformInput label="X" value={THREE.MathUtils.radToDeg(displayedTransform.rotation[0])} onChange={(v) => handleTransformChange('rotation', 0, v)} step={1} />
                    <TransformInput label="Y" value={THREE.MathUtils.radToDeg(displayedTransform.rotation[1])} onChange={(v) => handleTransformChange('rotation', 1, v)} step={1} />
                    <TransformInput label="Z" value={THREE.MathUtils.radToDeg(displayedTransform.rotation[2])} onChange={(v) => handleTransformChange('rotation', 2, v)} step={1} />
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium text-base-200 mb-1.5">Scale</h4>
                <div className="grid grid-cols-3 gap-2">
                    <TransformInput label="X" value={displayedTransform.scale[0]} onChange={(v) => handleTransformChange('scale', 0, v)} />
                    <TransformInput label="Y" value={displayedTransform.scale[1]} onChange={(v) => handleTransformChange('scale', 1, v)} />
                    <TransformInput label="Z" value={displayedTransform.scale[2]} onChange={(v) => handleTransformChange('scale', 2, v)} />
                </div>
            </div>
        </div>
    );
};

type MixedState<T> = T | 'mixed';

const AxisSelector: React.FC<{ axis: MixedState<'x' | 'y' | 'z'>, setAxis: (a: 'x' | 'y' | 'z') => void }> = ({ axis, setAxis }) => (
    <div className="flex items-center space-x-1">
        {(['x', 'y', 'z'] as const).map(a => (
            <button
                key={a}
                onClick={() => setAxis(a)}
                className={`w-6 h-6 rounded text-xs font-bold transition-colors ${axis === a ? 'bg-brand-primary text-bg-dark' : 'bg-gray-700 text-base-200 hover:bg-gray-600'}`}
            >
                {a.toUpperCase()}
            </button>
        ))}
    </div>
);

const IndeterminateCheckbox: React.FC<{ checked: MixedState<boolean>, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ checked, onChange }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = checked === 'mixed';
        }
    }, [checked]);

    return <input type="checkbox" ref={ref} checked={checked === true} onChange={onChange} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-brand-primary focus:ring-brand-primary" onClick={e => e.stopPropagation()} />;
};


const ModifiersPanel: React.FC<{
    selectedKeys: string[];
    modifiers: Record<string, ModifiersState>;
    setModifiers: React.Dispatch<React.SetStateAction<Record<string, ModifiersState>>>;
}> = ({ selectedKeys, modifiers, setModifiers }) => {

    const displayedModifiers = useMemo(() => {
        if (selectedKeys.length === 0) return {
            twist: { enabled: false, axis: 'y' as const, angle: 0 },
            bend: { enabled: false, axis: 'y' as const, angle: 0 },
            taper: { enabled: false, axis: 'y' as const, factor: 1 },
        };
        
        const checkConsistency = <T, K extends keyof T>(items: T[], prop: K): MixedState<T[K]> => {
            if (items.length === 0) return undefined as any; // Should not happen with selectedKeys check
            const first = items[0]?.[prop];
            for (let i = 1; i < items.length; i++) {
                if (items[i]?.[prop] !== first) return 'mixed';
            }
            return first as MixedState<T[K]>;
        };

        const getModifierValues = (type: keyof ModifiersState) => {
            const allMods = selectedKeys.map(k => modifiers[k]?.[type]);
            
            const defaults = {
                twist: { enabled: false, axis: 'y' as const, angle: 0 },
                bend: { enabled: false, axis: 'y' as const, angle: 0 },
                taper: { enabled: false, axis: 'y' as const, factor: 1 },
            };
            
            const defaultMod = defaults[type];

            const fullMods = allMods.map(m => m || defaultMod);

            const enabled = checkConsistency(fullMods, 'enabled');
            const axis = checkConsistency(fullMods, 'axis');
            
            if (type === 'taper') {
                const taperMods = fullMods as NonNullable<ModifiersState['taper']>[];
                const factor = checkConsistency(taperMods, 'factor');
                return { enabled, axis, factor };
            } else { // type is 'twist' or 'bend'
                const angleMods = fullMods as NonNullable<ModifiersState['twist' | 'bend']>[];
                const angle = checkConsistency(angleMods, 'angle');
                return { enabled, axis, angle };
            }
        };
        
        return {
            twist: getModifierValues('twist'),
            bend: getModifierValues('bend'),
            taper: getModifierValues('taper'),
        };
    }, [selectedKeys, modifiers]);


    const handleModifierChange = (type: keyof ModifiersState, property: string, value: any) => {
        setModifiers(prev => {
            const next = { ...prev };
            selectedKeys.forEach(key => {
                const currentObjectModifiers = next[key] ?? {};
                
                const defaults = {
                    twist: { enabled: false, axis: 'y' as const, angle: 0 },
                    bend: { enabled: false, axis: 'y' as const, angle: 0 },
                    taper: { enabled: false, axis: 'y' as const, factor: 1 },
                };
                
                const currentSpecificModifier = {
                    ...defaults[type],
                    ...(currentObjectModifiers[type] || {})
                };
                
                const newModifier = {
                    ...currentSpecificModifier,
                    [property]: value
                };

                next[key] = {
                    ...currentObjectModifiers,
                    [type]: newModifier,
                };
            });
            return next;
        });
    };
    
    const handleReset = () => {
        setModifiers(prev => {
            const newModifiers = { ...prev };
            selectedKeys.forEach(key => {
                delete newModifiers[key];
            });
            return newModifiers;
        });
    };

    const { twist, bend, taper } = displayedModifiers;

    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                    <ModifiersIcon />
                    <h3 className="font-semibold text-lg text-brand-secondary">Modifiers</h3>
                </div>
                <button onClick={handleReset} className="text-xs text-gray-400 hover:text-white hover:underline transition-colors">Reset</button>
            </div>
            
            <details className="space-y-2" open={twist?.enabled === true}>
                <summary className="cursor-pointer flex items-center space-x-2 text-base-200">
                    <IndeterminateCheckbox checked={twist?.enabled ?? false} onChange={e => handleModifierChange('twist', 'enabled', e.target.checked)} />
                    <span className="font-medium">Twist</span>
                </summary>
                <div className="pt-2 pl-6 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-base-200">Axis</label>
                        <AxisSelector axis={twist?.axis ?? 'y'} setAxis={(a) => handleModifierChange('twist', 'axis', a)} />
                    </div>
                    <Slider id="twist-angle" label="Angle" min={-360} max={360} step={1} value={twist.angle === 'mixed' ? NaN : THREE.MathUtils.radToDeg(typeof twist.angle === 'number' ? twist.angle : 0)} onChange={(e) => handleModifierChange('twist', 'angle', THREE.MathUtils.degToRad(parseFloat(e.target.value)))} />
                </div>
            </details>

            <details className="space-y-2" open={bend?.enabled === true}>
                <summary className="cursor-pointer flex items-center space-x-2 text-base-200">
                    <IndeterminateCheckbox checked={bend?.enabled ?? false} onChange={e => handleModifierChange('bend', 'enabled', e.target.checked)} />
                    <span className="font-medium">Bend</span>
                </summary>
                <div className="pt-2 pl-6 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-base-200">Axis</label>
                        <AxisSelector axis={bend?.axis ?? 'y'} setAxis={(a) => handleModifierChange('bend', 'axis', a)} />
                    </div>
                    <Slider id="bend-angle" label="Angle" min={-180} max={180} step={1} value={bend.angle === 'mixed' ? NaN : THREE.MathUtils.radToDeg(typeof bend.angle === 'number' ? bend.angle : 0)} onChange={(e) => handleModifierChange('bend', 'angle', THREE.MathUtils.degToRad(parseFloat(e.target.value)))} />
                </div>
            </details>

            <details className="space-y-2" open={taper?.enabled === true}>
                <summary className="cursor-pointer flex items-center space-x-2 text-base-200">
                    <IndeterminateCheckbox checked={taper?.enabled ?? false} onChange={e => handleModifierChange('taper', 'enabled', e.target.checked)} />
                    <span className="font-medium">Taper</span>
                </summary>
                <div className="pt-2 pl-6 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-base-200">Axis</label>
                        <AxisSelector axis={taper?.axis ?? 'y'} setAxis={(a) => handleModifierChange('taper', 'axis', a)} />
                    </div>
                    <Slider id="taper-factor" label="Factor" min={0} max={3} step={0.05} value={taper.factor === 'mixed' ? NaN : (typeof taper.factor === 'number' ? taper.factor : 1)} onChange={(e) => handleModifierChange('taper', 'factor', parseFloat(e.target.value))} />
                </div>
            </details>
        </div>
    );
};

const GlyphSettingsPanel: React.FC<{ 
    objectSettings: Record<string, ObjectGeometrySettings>,
    setObjectSettings: (settings: React.SetStateAction<Record<string, ObjectGeometrySettings>>) => void,
    selectedObjectKeys: string[],
    isLoading: boolean 
}> = ({ objectSettings, setObjectSettings, selectedObjectKeys, isLoading }) => {
        
    const handleExtrudeChange = (setting: keyof ExtrudeSettings, value: number) => {
        setObjectSettings(prev => {
            const next = {...prev};
            selectedObjectKeys.forEach(key => {
                const existingSettings = next[key]?.extrude || { depth: 8, bevelThickness: 1, bevelSize: 0.5 };
                next[key] = { ...next[key], extrude: { ...existingSettings, [setting]: value } };
            });
            return next;
        });
    };
    
    const displayedExtrudeSettings = useMemo(() => {
        if (selectedObjectKeys.length === 0) return { depth: 8, bevelThickness: 1, bevelSize: 0.5 };

        const firstSettings = objectSettings[selectedObjectKeys[0]]?.extrude || { depth: 8, bevelThickness: 1, bevelSize: 0.5 };
        if (selectedObjectKeys.length === 1) return firstSettings;
        
        const checkConsistency = (prop: keyof ExtrudeSettings) => {
            const firstVal = (objectSettings[selectedObjectKeys[0]]?.extrude || { depth: 8, bevelThickness: 1, bevelSize: 0.5 })[prop];
            for (let i = 1; i < selectedObjectKeys.length; i++) {
                if ((objectSettings[selectedObjectKeys[i]]?.extrude || { depth: 8, bevelThickness: 1, bevelSize: 0.5 })[prop] !== firstVal) return NaN;
            }
            return firstVal;
        };
        return {
            depth: checkConsistency('depth'),
            bevelThickness: checkConsistency('bevelThickness'),
            bevelSize: checkConsistency('bevelSize'),
        };
    }, [selectedObjectKeys, objectSettings]);

    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-4">
            <div className="flex items-center space-x-3">
                <SlidersIcon />
                <h3 className="font-semibold text-lg text-brand-secondary">Glyph Geometry</h3>
            </div>
             <p className="text-xs text-base-300">Modifying settings for {selectedObjectKeys.length} selected glyph(s).</p>
            
            <Slider id="depth" label="Depth" min={1} max={50} step={1} value={displayedExtrudeSettings.depth} onChange={(e) => handleExtrudeChange('depth', parseFloat(e.target.value))} disabled={isLoading} />
            <Slider id="bevelThickness" label="Bevel Thickness" min={0} max={5} step={0.1} value={displayedExtrudeSettings.bevelThickness} onChange={(e) => handleExtrudeChange('bevelThickness', parseFloat(e.target.value))} disabled={isLoading} />
            <Slider id="bevelSize" label="Bevel Size" min={0} max={5} step={0.1} value={displayedExtrudeSettings.bevelSize} onChange={(e) => handleExtrudeChange('bevelSize', parseFloat(e.target.value))} disabled={isLoading} />
        </div>
    );
};

const PrimitiveSettingsPanel: React.FC<{
    primitive: PrimitiveObject;
    parameters: Record<string, any>;
    setParameters: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}> = ({ primitive, parameters, setParameters }) => {

    const handleChange = (param: string, value: number) => {
        setParameters(prev => ({
            ...prev,
            [primitive.id]: {
                ...prev[primitive.id],
                [param]: value,
            }
        }));
    };
    
    const renderControls = () => {
        if (!parameters) return null;
        switch (primitive.type) {
            case 'box': return <>
                <Slider id="width" label="Width" min={1} max={50} step={0.5} value={parameters.width} onChange={e => handleChange('width', parseFloat(e.target.value))} />
                <Slider id="height" label="Height" min={1} max={50} step={0.5} value={parameters.height} onChange={e => handleChange('height', parseFloat(e.target.value))} />
                <Slider id="depth" label="Depth" min={1} max={50} step={0.5} value={parameters.depth} onChange={e => handleChange('depth', parseFloat(e.target.value))} />
            </>;
            case 'sphere': return <>
                <Slider id="radius" label="Radius" min={1} max={25} step={0.5} value={parameters.radius} onChange={e => handleChange('radius', parseFloat(e.target.value))} />
                <Slider id="widthSegments" label="Width Segments" min={3} max={64} step={1} value={parameters.widthSegments} onChange={e => handleChange('widthSegments', parseInt(e.target.value))} />
                <Slider id="heightSegments" label="Height Segments" min={2} max={32} step={1} value={parameters.heightSegments} onChange={e => handleChange('heightSegments', parseInt(e.target.value))} />
            </>;
            case 'cylinder': return <>
                <Slider id="radiusTop" label="Radius Top" min={0} max={25} step={0.5} value={parameters.radiusTop} onChange={e => handleChange('radiusTop', parseFloat(e.target.value))} />
                <Slider id="radiusBottom" label="Radius Bottom" min={0} max={25} step={0.5} value={parameters.radiusBottom} onChange={e => handleChange('radiusBottom', parseFloat(e.target.value))} />
                <Slider id="height" label="Height" min={1} max={50} step={0.5} value={parameters.height} onChange={e => handleChange('height', parseFloat(e.target.value))} />
                <Slider id="radialSegments" label="Radial Segments" min={3} max={64} step={1} value={parameters.radialSegments} onChange={e => handleChange('radialSegments', parseInt(e.target.value))} />
            </>;
             case 'cone': return <>
                <Slider id="radius" label="Radius" min={0.1} max={25} step={0.1} value={parameters.radius} onChange={e => handleChange('radius', parseFloat(e.target.value))} />
                <Slider id="height" label="Height" min={1} max={50} step={0.5} value={parameters.height} onChange={e => handleChange('height', parseFloat(e.target.value))} />
                <Slider id="radialSegments" label="Radial Segments" min={3} max={64} step={1} value={parameters.radialSegments} onChange={e => handleChange('radialSegments', parseInt(e.target.value))} />
            </>;
            case 'torus': return <>
                <Slider id="radius" label="Radius" min={1} max={25} step={0.5} value={parameters.radius} onChange={e => handleChange('radius', parseFloat(e.target.value))} />
                <Slider id="tube" label="Tube Radius" min={0.1} max={10} step={0.1} value={parameters.tube} onChange={e => handleChange('tube', parseFloat(e.target.value))} />
                <Slider id="radialSegments" label="Radial Segments" min={3} max={64} step={1} value={parameters.radialSegments} onChange={e => handleChange('radialSegments', parseInt(e.target.value))} />
                <Slider id="tubularSegments" label="Tubular Segments" min={3} max={200} step={1} value={parameters.tubularSegments} onChange={e => handleChange('tubularSegments', parseInt(e.target.value))} />
            </>;
             case 'plane': return <>
                <Slider id="width" label="Width" min={1} max={100} step={1} value={parameters.width} onChange={e => handleChange('width', parseFloat(e.target.value))} />
                <Slider id="height" label="Height" min={1} max={100} step={1} value={parameters.height} onChange={e => handleChange('height', parseFloat(e.target.value))} />
            </>;
            case 'dodecahedron':
            case 'icosahedron':
            case 'octahedron':
            case 'tetrahedron': return <>
                <Slider id="radius" label="Radius" min={1} max={25} step={0.5} value={parameters.radius} onChange={e => handleChange('radius', parseFloat(e.target.value))} />
                <Slider id="detail" label="Detail" min={0} max={5} step={1} value={parameters.detail} onChange={e => handleChange('detail', parseInt(e.target.value))} />
            </>;
            case 'torusKnot': return <>
                <Slider id="radius" label="Radius" min={1} max={25} step={0.5} value={parameters.radius} onChange={e => handleChange('radius', parseFloat(e.target.value))} />
                <Slider id="tube" label="Tube Radius" min={0.1} max={10} step={0.1} value={parameters.tube} onChange={e => handleChange('tube', parseFloat(e.target.value))} />
                <Slider id="tubularSegments" label="Tubular Segments" min={3} max={256} step={1} value={parameters.tubularSegments} onChange={e => handleChange('tubularSegments', parseInt(e.target.value))} />
                <Slider id="radialSegments" label="Radial Segments" min={3} max={64} step={1} value={parameters.radialSegments} onChange={e => handleChange('radialSegments', parseInt(e.target.value))} />
                <Slider id="p" label="P (Windings)" min={1} max={20} step={1} value={parameters.p} onChange={e => handleChange('p', parseInt(e.target.value))} />
                <Slider id="q" label="Q (Windings)" min={1} max={20} step={1} value={parameters.q} onChange={e => handleChange('q', parseInt(e.target.value))} />
            </>;
            default: return <p className="text-sm text-gray-500 text-center">No configurable parameters for this object.</p>;
        }
    };

    return (
        <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-4">
            <div className="flex items-center space-x-3">
                <SlidersIcon />
                <h3 className="font-semibold text-lg text-brand-secondary capitalize">{primitive.type} Geometry</h3>
            </div>
            {renderControls()}
        </div>
    );
};