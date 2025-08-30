import * as THREE from 'three';

/**
 * Applies a taper effect to a geometry along a specified axis.
 * @param geometry The THREE.BufferGeometry to modify.
 * @param axis The axis ('x', 'y', or 'z') to taper along.
 * @param factor The taper factor. 1 is no taper, <1 tapers in, >1 tapers out.
 */
export const applyTaper = (geometry: THREE.BufferGeometry, axis: 'x' | 'y' | 'z', factor: number) => {
    if (factor === 1) return;

    const positions = geometry.attributes.position.array;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox as THREE.Box3;
    const min = bbox.min[axis];
    const max = bbox.max[axis];
    const range = max - min;
    if (range === 0) return;

    const otherAxes = (['x', 'y', 'z'] as const).filter(a => a !== axis);
    const tempVertex = new THREE.Vector3();

    for (let i = 0; i < positions.length; i += 3) {
        tempVertex.fromArray(positions, i);
        const progress = (tempVertex[axis] - min) / range; // 0 to 1
        const scale = 1 + (factor - 1) * progress;
        
        tempVertex[otherAxes[0]] *= scale;
        tempVertex[otherAxes[1]] *= scale;
        
        tempVertex.toArray(positions, i);
    }
    geometry.attributes.position.needsUpdate = true;
};

/**
 * Applies a twist effect to a geometry around a specified axis.
 * @param geometry The THREE.BufferGeometry to modify.
 * @param axis The axis ('x', 'y', or 'z') to twist around.
 * @param angle The total twist angle in radians.
 */
export const applyTwist = (geometry: THREE.BufferGeometry, axis: 'x' | 'y' | 'z', angle: number) => {
    if (angle === 0) return;

    const positions = geometry.attributes.position.array;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox as THREE.Box3;
    const center = bbox.getCenter(new THREE.Vector3());
    const min = bbox.min[axis];
    const max = bbox.max[axis];
    const range = max - min;
    if (range === 0) return;

    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3();
    if (axis === 'x') up.set(1, 0, 0);
    if (axis === 'y') up.set(0, 1, 0);
    if (axis === 'z') up.set(0, 0, 1);
    
    const tempVertex = new THREE.Vector3();

    for (let i = 0; i < positions.length; i += 3) {
        tempVertex.fromArray(positions, i);

        // Center the vertex on the non-twist axes for rotation
        if (axis === 'x') { tempVertex.y -= center.y; tempVertex.z -= center.z; }
        if (axis === 'y') { tempVertex.x -= center.x; tempVertex.z -= center.z; }
        if (axis === 'z') { tempVertex.x -= center.x; tempVertex.y -= center.y; }

        const progress = (positions[i + (axis === 'x' ? 0 : axis === 'y' ? 1 : 2)] - min) / range;
        const twistAngle = angle * progress;

        quat.setFromAxisAngle(up, twistAngle);
        tempVertex.applyQuaternion(quat);
        
        // Un-center the vertex
        if (axis === 'x') { tempVertex.y += center.y; tempVertex.z += center.z; }
        if (axis === 'y') { tempVertex.x += center.x; tempVertex.z += center.z; }
        if (axis === 'z') { tempVertex.x += center.x; tempVertex.y += center.y; }

        tempVertex.toArray(positions, i);
    }
    geometry.attributes.position.needsUpdate = true;
};

/**
 * Applies a bend effect to a geometry along a specified axis.
 * @param geometry The THREE.BufferGeometry to modify.
 * @param axis The axis ('x', 'y', or 'z') to bend along.
 * @param angle The total bend angle in radians.
 */
export const applyBend = (geometry: THREE.BufferGeometry, axis: 'x' | 'y' | 'z', angle: number) => {
    if (angle === 0) return;
    
    const positions = geometry.attributes.position.array;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox as THREE.Box3;

    const bendAxis = axis;
    const dirAxis = axis === 'y' ? 'x' : 'y'; // Bend direction

    const min = bbox.min[bendAxis];
    const max = bbox.max[bendAxis];
    const range = max - min;
    if (range === 0) return;

    const radius = range / angle;

    const tempVertex = new THREE.Vector3();

    for (let i = 0; i < positions.length; i += 3) {
        tempVertex.fromArray(positions, i);
        
        const y = tempVertex[bendAxis] - min;
        const x = tempVertex[dirAxis];

        const theta = y / radius;

        tempVertex[dirAxis] = Math.sin(theta) * (radius - x);
        tempVertex[bendAxis] = (1 - Math.cos(theta)) * (radius - x) + min;

        tempVertex.toArray(positions, i);
    }
    geometry.attributes.position.needsUpdate = true;
};
