
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { GestureState } from '../types';

const CONTROL_GESTURE_FUNC: FunctionDeclaration = {
  name: 'updateGesture',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the 3D particle system state based on hand tracking.',
    properties: {
      expansion: {
        type: Type.NUMBER,
        description: 'Tension/Expansion value from 0 (hands closed/together) to 1 (hands wide open/apart).',
      },
      rotation: {
        type: Type.NUMBER,
        description: 'Rotation speed factor from -1 (spinning left) to 1 (spinning right).',
      },
      isDetected: {
        type: Type.BOOLEAN,
        description: 'Whether hands are currently visible in the frame.',
      }
    },
    required: ['expansion', 'rotation', 'isDetected'],
  },
};

export class GeminiGestureService {
  private sessionPromise: Promise<any> | null = null;
  private onGestureUpdate: (state: GestureState) => void;
  private nextStartTime = 0;
  private outputAudioContext: AudioContext;
  private outputNode: GainNode;
  private sources = new Set<AudioBufferSourceNode>();
  private streamInterval: number | null = null;

  constructor(onGestureUpdate: (state: GestureState) => void) {
    this.onGestureUpdate = onGestureUpdate;
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async connect(video: HTMLVideoElement) {
    // Resume AudioContext as it might be suspended by the browser
    if (this.outputAudioContext.state === 'suspended') {
      await this.outputAudioContext.resume();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        tools: [{ functionDeclarations: [CONTROL_GESTURE_FUNC] }],
        systemInstruction: `You are a real-time vision controller for a 3D particle system. 
        Monitor the user's hands through the video stream. 
        1. Calculate "expansion": 0 if hands are closed/clenched or touching; 1 if hands are wide apart and palms open.
        2. Calculate "rotation": 0 if hands are stable; negative if hands are moving left; positive if right.
        3. Call "updateGesture" frequently whenever you notice a change in hand posture.
        Provide smooth, low-latency updates. Do not speak unless spoken to.`,
      },
      callbacks: {
        onopen: () => {
          console.log('Gemini Session Opened');
          this.startStreaming(video);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'updateGesture') {
                this.onGestureUpdate(fc.args as unknown as GestureState);
                this.sessionPromise?.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: 'ok' },
                    }
                  });
                });
              }
            }
          }

          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            const audioBuffer = await this.decodeAudioData(
              this.decode(base64EncodedAudioString),
              this.outputAudioContext,
              24000,
              1,
            );
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.addEventListener('ended', () => {
              this.sources.delete(source);
            });

            source.start(this.nextStartTime);
            this.nextStartTime = this.nextStartTime + audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            for (const source of this.sources.values()) {
              source.stop();
              this.sources.delete(source);
            }
            this.nextStartTime = 0;
          }
        },
        onerror: (e: any) => console.error('Gemini Error:', e),
        onclose: () => {
          console.log('Gemini Session Closed');
          if (this.streamInterval) clearInterval(this.streamInterval);
        },
      }
    });

    return this.sessionPromise;
  }

  private startStreaming(video: HTMLVideoElement) {
    if (this.streamInterval) clearInterval(this.streamInterval);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    this.streamInterval = window.setInterval(async () => {
      if (!ctx || !video.videoWidth) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            this.sessionPromise?.then(session => {
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'image/jpeg' }
              });
            }).catch(err => {
              console.warn("Failed to send realtime input:", err);
            });
          };
        }
      }, 'image/jpeg', 0.5);
    }, 400);
  }

  disconnect() {
    if (this.streamInterval) clearInterval(this.streamInterval);
    this.sessionPromise?.then(session => session.close());
  }
}
