// FIX: Removed the triple-slash directive and comment that were causing type resolution issues.
// The standard import of `useFrame` from '@react-three/fiber' is sufficient to augment JSX types.
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface ExtrusionAnimatorProps {
  geometry: THREE.BufferGeometry;
  duration: number; // in seconds
  isAnimating: boolean;
  onAnimationComplete: () => void;
  material: THREE.Material;
}

export const ExtrusionAnimator: React.FC<ExtrusionAnimatorProps> = ({ 
  geometry, 
  duration, 
  isAnimating, 
  onAnimationComplete, 
  material 
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const startTimeRef = useRef<number | null>(null);

  // Reset animation when `isAnimating` becomes true or geometry changes
  useEffect(() => {
    if (meshRef.current) {
      const currentGeometry = meshRef.current.geometry;
      
      if (isAnimating) {
        startTimeRef.current = null; // Will be set on the first frame of the new animation
        currentGeometry.setDrawRange(0, 0);
      } else {
        // When not animating, show the full model
        currentGeometry.setDrawRange(0, Infinity); // Infinity is the default for showing all
      }
    }
  }, [isAnimating, geometry]);

  useFrame(({ clock }) => {
    if (!isAnimating || !meshRef.current || duration <= 0) return;

    // Initialize start time on the first frame
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.getElapsedTime();
    }

    const elapsedTime = clock.getElapsedTime() - startTimeRef.current;
    const progress = Math.min(elapsedTime / duration, 1);
    
    const currentGeometry = meshRef.current.geometry;
    
    // The number of vertices to draw. `drawRange` works on indices.
    // For non-indexed geometry, this is position.count. For indexed, we use index.count.
    const totalCount = currentGeometry.index ? currentGeometry.index.count : (currentGeometry.attributes.position ? currentGeometry.attributes.position.count : 0);
    const count = Math.floor(totalCount * progress);

    currentGeometry.setDrawRange(0, count);

    // When animation completes
    if (progress >= 1) {
      onAnimationComplete();
    }
  });
  
  // We apply a slight scale to prevent z-fighting with the solid mesh
  return <mesh ref={meshRef} geometry={geometry} material={material} scale={1.001} />;
};