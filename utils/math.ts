
import * as THREE from 'three';
import { TemplateType } from '../types';

export const generatePositions = (type: TemplateType, count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    const t = (i / count) * Math.PI * 2;
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;

    switch (type) {
      case 'HEART': {
        const angle = Math.random() * Math.PI * 2;
        // Parametric heart: 16sin^3, 13cos - 5cos(2) - 2cos(3) - cos(4)
        const scale = 0.5;
        x = 16 * Math.pow(Math.sin(angle), 3);
        y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
        z = (Math.random() - 0.5) * 5;
        x *= scale; y *= scale;
        break;
      }
      case 'FLOWER': {
        // Phyllotaxis flower
        const radius = 15 * Math.sqrt(i / count);
        const angle = i * 137.5 * (Math.PI / 180);
        x = radius * Math.cos(angle);
        y = radius * Math.sin(angle);
        z = Math.sin(radius * 0.5) * 2;
        break;
      }
      case 'SATURN': {
        if (i < count * 0.6) {
          // Sphere
          const r = 10;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        } else {
          // Ring
          const inner = 14;
          const outer = 22;
          const r = inner + (outer - inner) * Math.random();
          const angle = Math.random() * Math.PI * 2;
          x = r * Math.cos(angle);
          y = (Math.random() - 0.5) * 0.5;
          z = r * Math.sin(angle);
        }
        break;
      }
      case 'BUDDHA': {
        // Simplified humanoid silhouette (Zen posture)
        const segment = i / count;
        if (segment < 0.3) { // Head & Torso
            x = (Math.random() - 0.5) * 6;
            y = segment * 20 - 5;
            z = (Math.random() - 0.5) * 4;
        } else if (segment < 0.7) { // Crossed legs
            const legT = (segment - 0.3) * 10;
            x = Math.sin(legT) * 12;
            y = -10 + Math.random() * 2;
            z = Math.cos(legT) * 8;
        } else { // Aura
            const r = 15 + Math.random() * 5;
            const a = Math.random() * Math.PI;
            x = r * Math.cos(a);
            y = r * Math.sin(a) - 5;
            z = -5;
        }
        break;
      }
      case 'FIREWORKS': {
        const r = Math.pow(Math.random(), 0.5) * 20;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};
