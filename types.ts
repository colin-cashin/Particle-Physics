
export type TemplateType = 'HEART' | 'FLOWER' | 'SATURN' | 'BUDDHA' | 'FIREWORKS';

export interface GestureState {
  expansion: number; // 0 to 1
  rotation: number;  // -1 to 1 speed
  isDetected: boolean;
}

export interface ParticleConfig {
  template: TemplateType;
  color: string;
  count: number;
}
