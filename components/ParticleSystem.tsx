
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { TemplateType, GestureState } from '../types';
import { generatePositions } from '../utils/math';

// Fix JSX intrinsic element types for React + R3F by augmenting the global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

interface ParticleSystemProps {
  template: TemplateType;
  color: string;
  gesture: GestureState;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ template, color, gesture }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 15000;

  // Initial and Target positions for morphing
  const currentPositions = useMemo(() => generatePositions(template, count), [template]);
  
  // Static initial buffer to prevent reset on re-renders
  const initialPositions = useMemo(() => new Float32Array(count * 3), [count]);

  // Buffer for lerping
  const targetPositions = useMemo(() => new Float32Array(count * 3), [count]);

  useEffect(() => {
    targetPositions.set(currentPositions);
  }, [currentPositions, targetPositions]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    // Morphing + Animation logic
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      // Lerp current to target
      positions[i3] += (tx - positions[i3]) * 0.1;
      positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.1;
      positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.1;

      // Small jitter/noise
      positions[i3] += Math.sin(time + i) * 0.02;
      positions[i3 + 1] += Math.cos(time + i) * 0.02;
    }

    // Inform R3F that the position attribute has been updated
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Apply expansion and rotation via object transform for better performance than manual coordinate modification
    pointsRef.current.scale.setScalar(1 + (gesture.expansion * 2.5));
    pointsRef.current.rotation.y += 0.002 + (gesture.rotation * 0.05);
    pointsRef.current.rotation.z += 0.001;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={initialPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default ParticleSystem;
