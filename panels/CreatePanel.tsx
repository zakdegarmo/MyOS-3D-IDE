

import React from 'react';
import { PrimitiveType } from '../types';

interface CreatePanelProps {
    onAddPrimitive: (type: PrimitiveType) => void;
}

const primitives: { type: PrimitiveType, name: string }[] = [
    { type: 'box', name: 'Box' },
    { type: 'sphere', name: 'Sphere' },
    { type: 'cylinder', name: 'Cylinder' },
    { type: 'cone', name: 'Cone' },
    { type: 'torus', name: 'Torus' },
    { type: 'plane', name: 'Plane' },
    { type: 'dodecahedron', name: 'Dodecahedron' },
    { type: 'icosahedron', name: 'Icosahedron' },
    { type: 'octahedron', name: 'Octahedron' },
    { type: 'tetrahedron', name: 'Tetrahedron' },
    { type: 'torusKnot', name: 'Torus Knot' },
    { type: 'point', name: 'Point' },
];

export const CreatePanel: React.FC<CreatePanelProps> = ({ onAddPrimitive }) => {
    return (
        <aside className="w-full p-6 flex flex-col overflow-y-auto">
            <header className="mb-6">
                <h2 className="text-lg font-semibold text-brand-secondary">Create</h2>
                <p className="text-xs text-base-300">Add new objects to the scene</p>
            </header>

            <div className="flex-grow space-y-6">
                 <div className="bg-bg-dark p-4 rounded-lg border border-gray-700/50 space-y-4">
                     <h3 className="font-semibold text-lg text-brand-secondary">Primitives</h3>
                     <p className="text-sm text-gray-400">Add basic shapes to the scene.</p>
                     <div className="grid grid-cols-3 gap-3">
                        {primitives.map(({ type, name }) => (
                            <button
                                key={type}
                                onClick={() => onAddPrimitive(type)}
                                className="flex flex-col items-center justify-center p-3 bg-bg-light rounded-lg border border-gray-700 hover:border-brand-primary hover:bg-brand-primary/10 hover:text-brand-secondary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary aspect-square"
                                title={`Create a ${name}`}
                            >
                                <span className="text-sm font-semibold capitalize text-center">{name}</span>
                            </button>
                        ))}
                     </div>
                </div>
            </div>
        </aside>
    );
};