
import * as THREE from 'three';
import { PrimitiveObject, TransformState } from '../types';

// This interface defines the tools the system functions have to modify the scene
export interface SceneAPI {
    getObject: (key: string) => any; // A function to get the full object data
    updatePrimitiveParameters: (key: string, updater: (params: any) => any) => void;
    updateTransform: (key: string, updater: (transform: TransformState) => TransformState) => void;
    log: (message: string) => void;
}

// 1. The generic class for all concepts
export class Concept {
    name: string;
    [key: string]: any; // Allows dynamic addition of methods

    constructor(name: string) {
        this.name = name;
    }
}

// Built-in function implementations based on the provided ontological mapping.
// Each function performs a unique action corresponding to its verb and target concept.
export const functionMap: Record<string, (targetKey: string, sceneApi: SceneAPI) => void> = {
    // --- Verbs from SELF ---
    identity: (key, api) => api.log(`[MyOS.Self.Identity] Object's unique identity is ${key}.`),
    subjectof: (key, api) => api.log(`[MyOS.Self.SubjectOf] Self is the subject of Thought. Its purpose is defined by its parameters and relationships.`),
    applies: (key, api) => {
        api.log(`[MyOS.Self.Applies] Self applies Logic to itself, causing a slight reorientation.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 0).normalize(), Math.PI / 16));
            return { ...t, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    seeks: (key, api) => {
        api.log(`[MyOS.Self.Seeks] Self seeks Unity, moving towards the scene's center.`);
        api.updateTransform(key, t => {
            const currentPos = new THREE.Vector3().fromArray(t.position);
            currentPos.lerp(new THREE.Vector3(0, t.position[1], 0), 0.2);
            return { ...t, position: currentPos.toArray() as [number, number, number]};
        });
    },
    affirms: (key, api) => {
        api.log(`[MyOS.Self.Affirms] Affirming existence, increasing presence.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.1, t.scale[1] * 1.1, t.scale[2] * 1.1] }));
    },
    undergoes: (key, api) => {
        api.log(`[MyOS.Self.Undergoes] Undergoing improvement. Applying a subtle deformation.`);
        const obj = api.getObject(key);
        if (obj?.type === 'primitive' && obj.parameters?.radius) {
            api.updatePrimitiveParameters(key, p => ({ ...p, radius: p.radius * 1.05 }));
        } else {
             api.updateTransform(key, t => ({ ...t, scale: [t.scale[0], t.scale[1] * 1.1, t.scale[2]] }));
        }
    },
    pursues: (key, api) => {
        api.log(`[MyOS.Self.Pursues] Pursuing Mastery. Aligning and moving forward.`);
        api.updateTransform(key, t => {
            const newPos: [number, number, number] = [t.position[0], t.position[1], t.position[2] - 15];
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.slerp(new THREE.Quaternion(), 0.1);
            return { ...t, position: newPos, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    experiences: (key, api) => api.log(`[MyOS.Self.Experiences] Resonance is experienced. If the object has ontological parameters, they would now be active.`),
    aspiresto: (key, api) => {
        api.log(`[MyOS.Self.AspiresTo] Aspiring to Transcendence. The object elevates, signifying its potential for externalization.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1] + 25, t.position[2]] }));
    },
    isrealizedby: (key, api) => api.log(`[MyOS.Self.IsRealizedBy] The Self is a realization of the Whole. No action taken.`),

    // --- Verbs from THOUGHT ---
    informs: (key, api) => api.log(`[MyOS.Thought.Informs] Thought informs the Self. Its identity (${key}) is now contextualized.`),
    recursion: (key, api) => {
        api.log(`[MyOS.Thought.Recursion] Thought reflects upon itself, a recursive loop.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8));
            return { ...t, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    utilizes: (key, api) => {
        api.log(`[MyOS.Thought.Utilizes] Thought utilizes Logic, applying a minor structural alignment.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.slerp(new THREE.Quaternion(), 0.1);
            return { ...t, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    synthesizes: (key, api) => {
        api.log(`[MyOS.Thought.Synthesizes] Thought synthesizes toward Unity. Moving towards the origin.`);
        api.updateTransform(key, t => ({...t, position: [t.position[0] * 0.8, t.position[1], t.position[2] * 0.8]}));
    },
    represents: (key, api) => {
        api.log(`[MyOS.Thought.Represents] Thought represents Existence. Emphasizing its form.`);
        const originalScale = api.getObject(key)?.transform?.scale || [1,1,1];
        api.updateTransform(key, t => ({ ...t, scale: [originalScale[0] * 1.2, originalScale[1] * 1.2, originalScale[2] * 1.2] }));
        setTimeout(() => api.updateTransform(key, t => ({ ...t, scale: originalScale })), 300);
    },
    drives: (key, api) => {
        api.log(`[MyOS.Thought.Drives] Thought drives Improvement. Refining parameters.`);
        const obj = api.getObject(key);
        if (obj?.type === 'primitive' && obj.parameters?.detail !== undefined) {
             api.updatePrimitiveParameters(key, p => ({ ...p, detail: Math.min(p.detail + 1, 5) }));
        } else {
             api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.05, t.scale[1] * 1.05, t.scale[2] * 1.05] }));
        }
    },
    develops: (key, api) => {
        api.log(`[MyOS.Thought.Develops] Thought develops Mastery. Increasing presence and stability.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.slerp(new THREE.Quaternion(), 0.2);
            return { ...t, scale: [t.scale[0] * 1.2, t.scale[1] * 1.2, t.scale[2] * 1.2], rotation: q.toArray() as [number, number, number, number] };
        });
    },
    articulates: (key, api) => api.log(`[MyOS.Thought.Articulates] Thought articulates Resonance. Conceptual link established.`),
    enables: (key, api) => {
         api.log(`[MyOS.Thought.Enables] Thought enables Transcendence. The object shifts to a new plane of possibility.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1], t.position[2] - 30] }));
    },
    transcends: (key, api) => {
        api.log(`[MyOS.Thought.Transcends] Thought transcends the universe. A conceptual leap out of bounds.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1] + 100, t.position[2]] }));
    },

    // --- Verbs from LOGIC ---
    structures: (key, api) => {
        api.log(`[MyOS.Logic.Structures] Logic structures the Self, applying a rotational matrix.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.2, 0.3)));
            return { ...t, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    governs: (key, api) => {
        api.log(`[MyOS.Logic.Governs] Logic governs Thought. Aligning object to a rational grid.`);
        api.updateTransform(key, t => ({
            ...t,
            position: [Math.round(t.position[0] / 10) * 10, Math.round(t.position[1] / 10) * 10, Math.round(t.position[2] / 10) * 10]
        }));
    },
    foundation: (key, api) => api.log(`[MyOS.Logic.Foundation] Logic is its own Foundation. State is affirmed.`),
    ensures: (key, api) => api.log(`[MyOS.Logic.Ensures] Logic ensures Unity. This is a conceptual axiom.`),
    describes: (key, api) => api.log(`[MyOS.Logic.Describes] Logic describes Existence through its state variables. See the Inspector.`),
    validates: (key, api) => {
        api.log(`[MyOS.Logic.Validates] Logic validates Improvement. Parameters are rationalized.`);
        const obj = api.getObject(key);
        if (obj?.type === 'primitive' && obj.parameters?.radius) {
            api.updatePrimitiveParameters(key, p => ({ ...p, radius: Math.round(p.radius) }));
        } else {
             api.log(`No parameters to validate on ${key}.`);
        }
    },
    underpins: (key, api) => api.log(`[MyOS.Logic.Underpins] Logic underpins Mastery. The object's state is a testament to this.`),
    contradicts: (key, api) => {
        api.log(`[MyOS.Logic.Contradicts] Logic contradicts Resonance, creating a dissonant state.`);
        api.updateTransform(key, t => ({...t, scale: [t.scale[0], t.scale[1] * -1, t.scale[2]] }));
    },
    grounds: (key, api) => {
        api.log(`[MyOS.Logic.Grounds] Logic grounds Transcendence. Moving object to the base plane.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], 0, t.position[2]] }));
    },
    isthefoundationof: (key, api) => api.log(`[MyOS.Logic.IsTheFoundationOf] Logic is the foundation of the universe.`),

    // --- Verbs from UNITY ---
    integrates: (key, api) => {
        api.log(`[MyOS.Unity.Integrates] Unity integrates Self. Centering at the world origin.`);
        api.updateTransform(key, t => ({ ...t, position: [0, 0, 0] }));
    },
    harmonizes: (key, api) => {
        api.log(`[MyOS.Unity.Harmonizes] Unity harmonizes Thought. Resetting rotation to a stable state.`);
        api.updateTransform(key, t => ({ ...t, rotation: [0, 0, 0, 1] }));
    },
    requires: (key, api) => api.log(`[MyOS.Unity.Requires] Unity requires Logic. Conceptual link.`),
    essence: (key, api) => api.log(`[MyOS.Unity.Essence] Unity is its own Essence. No action needed.`),
    binds: (key, api) => api.log(`[MyOS.Unity.Binds] Unity binds Existence.`),
    fosters: (key, api) => {
        api.log(`[MyOS.Unity.Fosters] Unity fosters Improvement. A minor, uniform growth is applied.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.05, t.scale[1] * 1.05, t.scale[2] * 1.05] }));
    },
    culminatesin: (key, api) => {
        api.log(`[MyOS.Unity.CulminatesIn] Unity culminates in Mastery. A significant growth in presence.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 2, t.scale[1] * 2, t.scale[2] * 2] }));
    },
    amplifies: (key, api) => {
        api.log(`[MyOS.Unity.Amplifies] Unity amplifies Resonance. Scaling up non-uniformly to represent this amplification.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.1, t.scale[1] * 1.5, t.scale[2] * 1.1] }));
    },
    achieves: (key, api) => api.log(`[MyOS.Unity.Achieves] Unity achieves Transcendence. This is the goal state.`),
    istheultimateexpressionof: (key, api) => api.log(`[MyOS.Unity.IsTheUltimateExpressionOf] Unity is the ultimate expression of the universe.`),

    // --- Verbs from EXISTENCE ---
    manifestsin: (key, api) => {
        api.log(`[MyOS.Existence.ManifestsIn] Existence manifests in Self. Resetting transform to its default state.`);
        api.updateTransform(key, t => ({ position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }));
    },
    isponderedby: (key, api) => api.log(`[MyOS.Existence.IsPonderedBy] Existence is pondered by Thought. No physical change.`),
    obeys: (key, api) => api.log(`[MyOS.Existence.Obeys] Existence obeys Logic.`),
    comprises: (key, api) => api.log(`[MyOS.Existence.Comprises] Existence comprises Unity.`),
    is: (key, api) => api.log(`[MyOS.Existence.Is] Existence simply is. The object exists.`),
    evolvesthrough: (key, api) => {
        api.log(`[MyOS.Existence.EvolvesThrough] Existence evolves through Improvement. Applying random growth.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * (1 + Math.random() * 0.2), t.scale[1] * (1 + Math.random() * 0.2), t.scale[2] * (1 + Math.random() * 0.2)] }));
    },
    isdomainof: (key, api) => api.log(`[MyOS.Existence.IsDomainOf] Existence is the domain of Mastery.`),
    vibratesin: (key, api) => {
        api.log(`[MyOS.Existence.VibratesIn] Existence vibrates in Resonance. Applying a visual pulse.`);
        const originalScale = api.getObject(key)?.transform?.scale || [1,1,1];
        api.updateTransform(key, t => ({ ...t, scale: [originalScale[0] * 1.5, originalScale[1] * 1.5, originalScale[2] * 1.5] }));
        setTimeout(() => api.updateTransform(key, t => ({ ...t, scale: originalScale })), 300);
    },
    issurpassedby: (key, api) => api.log(`[MyOS.Existence.IsSurpassedBy] Existence is surpassed by Transcendence.`),
    givesriseto: (key, api) => api.log(`[MyOS.Existence.GivesRiseTo] Existence gives rise to the universe.`),

    // --- Verbs from IMPROVEMENT ---
    refines: (key, api) => {
        api.log(`[MyOS.Improvement.Refines] Improvement refines Self. Increasing scale by 10%.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.1, t.scale[1] * 1.1, t.scale[2] * 1.1] }));
    },
    optimizes: (key, api) => api.log(`[MyOS.Improvement.Optimizes] Improvement optimizes Thought.`),
    systematizes: (key, api) => {
        api.log(`[MyOS.Improvement.Systematizes] Improvement systematizes Logic. Applying orderly rotation.`);
        api.updateTransform(key, t => {
            const q = new THREE.Quaternion().fromArray(t.rotation);
            q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 8));
            return { ...t, rotation: q.toArray() as [number, number, number, number] };
        });
    },
    strengthens: (key, api) => {
        api.log(`[MyOS.Improvement.Strengthens] Improvement strengthens Unity. Increasing scale uniformly.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.2, t.scale[1] * 1.2, t.scale[2] * 1.2] }));
    },
    enhances: (key, api) => {
        api.log(`[MyOS.Improvement.Enhances] Improvement enhances Existence. Increasing scale by 25%.`);
        api.updateTransform(key, t => ({ ...t, scale: [t.scale[0] * 1.25, t.scale[1] * 1.25, t.scale[2] * 1.25] }));
    },
    process: (key, api) => api.log(`[MyOS.Improvement.Process] Improvement is its own Process.`),
    leadsto: (key, api) => {
        api.log(`[MyOS.Improvement.LeadsTo] Improvement leads to Mastery. Moving forward significantly.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1], t.position[2] - 20] }));
    },
    finetunes: (key, api) => api.log(`[MyOS.Improvement.FineTunes] Improvement fine-tunes Resonance.`),
    ispathto: (key, api) => api.log(`[MyOS.Improvement.IsPathTo] Improvement is the path to Transcendence.`),
    isthecycleof: (key, api) => api.log(`[MyOS.Improvement.IsTheCycleOf] Improvement is the cycle of the universe.`),

    // --- Verbs from MASTERY ---
    actualizes: (key, api) => {
        api.log(`[MyOS.Mastery.Actualizes] Mastery actualizes Self. Setting scale to a perfected state.`);
        api.updateTransform(key, t => ({ ...t, scale: [3, 3, 3] }));
    },
    requiresdeep: (key, api) => api.log(`[MyOS.Mastery.RequiresDeep] Mastery requires deep Thought.`),
    appliesperfected: (key, api) => {
        api.log(`[MyOS.Mastery.AppliesPerfected] Mastery applies perfected Logic. Snapping to a perfect rotation.`);
        api.updateTransform(key, t => ({...t, rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)).toArray() as [number,number,number,number]}));
    },
    embodies: (key, api) => api.log(`[MyOS.Mastery.Embodies] Mastery embodies Unity.`),
    commands: (key, api) => {
        api.log(`[MyOS.Mastery.Commands] Mastery commands Existence. The object is centered and enlarged.`);
        api.updateTransform(key, t => ({...t, position: [0, 5, 0], scale: [2,2,2]}));
    },
    isgoalof: (key, api) => api.log(`[MyOS.Mastery.IsGoalOf] Mastery is the goal of Improvement.`),
    pinnacle: (key, api) => api.log(`[MyOS.Mastery.Pinnacle] Mastery is its own Pinnacle.`),
    generates: (key, api) => api.log(`[MyOS.Mastery.Generates] Mastery generates Resonance.`),
    approaches: (key, api) => api.log(`[MyOS.Mastery.Approaches] Mastery approaches Transcendence.`),
    isthetotalityof: (key, api) => api.log(`[MyOS.Mastery.IsTheTotalityOf] Mastery is the totality of the universe.`),

    // --- Verbs from RESONANCE ---
    isfeltby: (key, api) => api.log(`[MyOS.Resonance.IsFeltBy] Resonance is felt by Self.`),
    isevokedby: (key, api) => api.log(`[MyOS.Resonance.IsEvokedBy] Resonance is evoked by Thought.`),
    eludes: (key, api) => {
        api.log(`[MyOS.Resonance.Eludes] Resonance eludes pure Logic. Shifting unpredictably.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0] + (Math.random()-0.5)*15, t.position[1] + (Math.random()-0.5)*15, t.position[2] + (Math.random()-0.5)*15] }));
    },
    creates: (key, api) => api.log(`[MyOS.Resonance.Creates] Resonance creates Unity.`),
    echoesthrough: (key, api) => {
        api.log(`[MyOS.Resonance.EchoesThrough] Resonance echoes through Existence. Applying a conceptual pulse.`);
        const originalScale = api.getObject(key)?.transform?.scale || [1,1,1];
        api.updateTransform(key, t => ({ ...t, scale: [originalScale[0] * 1.8, originalScale[1] * 0.5, originalScale[2] * 1.8] }));
        setTimeout(() => api.updateTransform(key, t => ({ ...t, scale: originalScale })), 400);
    },
    alignswith: (key, api) => {
        api.log(`[MyOS.Resonance.AlignsWith] Resonance aligns with Improvement. Resetting rotation.`);
        api.updateTransform(key, t => ({ ...t, rotation: [0, 0, 0, 1] }));
    },
    radiatesfrom: (key, api) => api.log(`[MyOS.Resonance.RadiatesFrom] Mastery radiates from Mastery.`),
    sympathy: (key, api) => api.log(`[MyOS.Resonance.Sympathy] Resonance is its own Sympathy.`),
    facilitates: (key, api) => api.log(`[MyOS.Resonance.Facilitates] Resonance facilitates Transcendence.`),
    isthegroundof: (key, api) => api.log(`[MyOS.Resonance.IsTheGroundOf] Resonance is the ground of the universe.`),

    // --- Verbs from TRANSCENDENCE ---
    elevates: (key, api) => {
        api.log(`[MyOS.Transcendence.Elevates] Transcendence elevates Self.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1] + 20, t.position[2]] }));
    },
    goesbeyond: (key, api) => {
        api.log(`[MyOS.Transcendence.GoesBeyond] Transcendence goes beyond Thought.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1], t.position[2] - 50] }));
    },
    isnotboundby: (key, api) => api.log(`[MyOS.Transcendence.IsNotBoundBy] Transcendence is not bound by Logic.`),
    isastateof: (key, api) => api.log(`[MyOS.Transcendence.IsAStateOf] Transcendence is a state of Unity.`),
    risesabove: (key, api) => {
        api.log(`[MyOS.Transcendence.RisesAbove] Transcendence rises above Existence.`);
        api.updateTransform(key, t => ({ ...t, position: [t.position[0], t.position[1] + 50, t.position[2]] }));
    },
    isaimof: (key, api) => api.log(`[MyOS.Transcendence.IsAimOf] Transcendence is the aim of Improvement.`),
    ispinnacleof: (key, api) => api.log(`[MyOS.Transcendence.IsPinnacleOf] Transcendence is the pinnacle of Mastery.`),
    induces: (key, api) => api.log(`[MyOS.Transcendence.Induces] Transcendence induces Resonance.`),
    action: (key, api) => api.log(`[MyOS.Transcendence.Action] Transcendence is its own Action.`),
    isthenatureof: (key, api) => api.log(`[MyOS.Transcendence.IsTheNatureOf] Transcendence is the nature of the universe.`),

    // --- Verbs from NOTHING/EVERYTHING ---
    mergeswith: (key, api) => {
        api.log(`[MyOS.Nothing/Everything.MergesWith] Self merges with the Whole. Returning to origin state.`);
        api.updateTransform(key, t => ({ position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }));
    },
    contemplates: (key, api) => api.log(`[MyOS.Nothing/Everything.Contemplates] The universe contemplates Thought.`),
    isasubsetof: (key, api) => api.log(`[MyOS.Nothing/Everything.IsASubsetOf] Logic is a subset of the universe.`),
    isanaspectof: (key, api) => api.log(`[MyOS.Nothing/Everything.IsAnAspectOf] Unity is an aspect of the universe.`),
    emergesfrom: (key, api) => api.log(`[MyOS.Nothing/Everything.EmergesFrom] Existence emerges from the universe.`),
    occurswithin: (key, api) => api.log(`[MyOS.Nothing/Everything.OccursWithin] Improvement occurs within the universe.`),
    seekstounderstand: (key, api) => api.log(`[MyOS.Nothing/Everything.SeeksToUnderstand] Mastery seeks to understand the universe.`),
    harmonizeswith: (key, api) => api.log(`[MyOS.Nothing/Everything.HarmonizesWith] Resonance harmonizes with the universe.`),
};


// The factory function that builds the MyOS system
export const createSystem = (
    matrix: Record<string, Record<string, string>>,
    sceneApi: SceneAPI,
    customScripts: Record<string, string>
): Record<string, Concept> => {
    const system: Record<string, Concept> = {};

    // First pass: create all concepts
    for (const conceptName in matrix) {
        system[conceptName] = new Concept(conceptName);
    }

    // Second pass: create all functions/relationships
    for (const rowConceptName in matrix) {
        for (const colConceptName in matrix[rowConceptName]) {
            const relationshipName = matrix[rowConceptName][colConceptName];
            const functionName = relationshipName; // In this system, the relationship name is the function name

            // The function that will be attached to the concept
            const conceptFunction = async (targetKey: string) => {
                const sanitize = (s: string) => s.replace(/\//g, 'Or');
                const customScriptKey = `${sanitize(rowConceptName)}_${sanitize(relationshipName)}_${sanitize(colConceptName)}`;
                const customScript = customScripts[customScriptKey];

                if (customScript) {
                    sceneApi.log(`Executing custom script for: ${rowConceptName} -> ${relationshipName} -> ${colConceptName}`);
                    try {
                        const target = sceneApi.getObject(targetKey);
                        if (!target) {
                            sceneApi.log(`Error: Could not find target object with key: ${targetKey}`);
                            return;
                        }
                        // Using new Function for safer execution than eval
                        const scriptFunc = new Function('target', 'sceneApi', customScript);
                        await scriptFunc(target, sceneApi);
                    } catch (e) {
                        const message = e instanceof Error ? e.message : String(e);
                        sceneApi.log(`Custom script error: ${message}`);
                    }
                } else {
                     const normalizedFunctionName = functionName.toLowerCase().replace(/\s/g, '');
                     const builtinFunction = functionMap[normalizedFunctionName];
                     if (builtinFunction) {
                         builtinFunction(targetKey, sceneApi);
                     } else {
                        sceneApi.log(`[Default Action] ${rowConceptName} -> ${relationshipName} -> ${colConceptName} on ${targetKey}`);
                     }
                }
            };

            if (system[rowConceptName]) {
                system[rowConceptName][functionName] = conceptFunction;
            }
        }
    }
    return system;
};
