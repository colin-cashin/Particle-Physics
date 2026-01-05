
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, ThreeElements } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Heart, Flower2, CircleDot, User, Flame, Camera, Settings2, Sparkles } from 'lucide-react';
import ParticleSystem from './components/ParticleSystem';
import { GeminiGestureService } from './services/geminiService';
import { TemplateType, GestureState } from './types';

// Fix JSX intrinsic element types for React + R3F by augmenting the global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

const TEMPLATES: { type: TemplateType; icon: any; label: string }[] = [
  { type: 'HEART', icon: Heart, label: 'Heart' },
  { type: 'FLOWER', icon: Flower2, label: 'Lotus' },
  { type: 'SATURN', icon: CircleDot, label: 'Saturn' },
  { type: 'BUDDHA', icon: User, label: 'Zen' },
  { type: 'FIREWORKS', icon: Flame, label: 'Spark' },
];

const App: React.FC = () => {
  const [template, setTemplate] = useState<TemplateType>('BUDDHA');
  const [color, setColor] = useState('#6366f1'); // Indigo-500
  const [gesture, setGesture] = useState<GestureState>({ expansion: 0, rotation: 0, isDetected: false });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const geminiRef = useRef<GeminiGestureService | null>(null);

  useEffect(() => {
    // Cleanup Gemini session on component unmount
    return () => {
      if (geminiRef.current) {
        geminiRef.current.disconnect();
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        
        // Initialize Gemini service with vision-based gesture tracking
        geminiRef.current = new GeminiGestureService((state) => {
          setGesture(state);
        });
        await geminiRef.current.connect(videoRef.current);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please enable camera access for gesture control.");
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: true }} dpr={[1, 2]}>
          <color attach="background" args={['#020617']} />
          <PerspectiveCamera makeDefault position={[0, 0, 50]} fov={50} />
          <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.5} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <ParticleSystem template={template} color={color} gesture={gesture} />
        </Canvas>
      </div>

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
        <header className="flex justify-between items-start">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 pointer-events-auto">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="text-indigo-400" /> ZenParticles
            </h1>
            <p className="text-xs text-slate-400 mt-1">AI-Powered Hand Gesture Control</p>
          </div>

          <div className="flex gap-3 pointer-events-auto">
             {!isCameraActive ? (
                <button 
                  onClick={startCamera}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-full transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Camera size={18} /> Enable Gesture
                </button>
             ) : (
                <div className="bg-green-500/10 border border-green-500/20 backdrop-blur-md text-green-400 px-4 py-2 rounded-full text-sm flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Gemini Vision Active
                </div>
             )}
          </div>
        </header>

        <div className={`transition-all duration-500 fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto ${showControls ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-3xl flex flex-col gap-2 shadow-2xl">
            {TEMPLATES.map((t) => (
              <button
                key={t.type}
                onClick={() => setTemplate(t.type)}
                title={t.label}
                className={`p-4 rounded-2xl transition-all ${template === t.type ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                <t.icon size={22} />
              </button>
            ))}
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none overflow-hidden"
              title="Change Color"
            />
            <button 
              onClick={() => setShowControls(false)}
              className="text-slate-500 hover:text-white"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        <footer className="flex justify-between items-end">
          <div className="pointer-events-auto">
            {isCameraActive && (
              <div className="relative group overflow-hidden rounded-2xl border-2 border-white/10 bg-black/40 shadow-2xl">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-48 h-36 object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-3/4 h-1 bg-white/20 rounded-full overflow-hidden transition-opacity ${gesture.isDetected ? 'opacity-100' : 'opacity-0'}`}>
                     <div 
                       className="h-full bg-indigo-400 transition-all duration-300"
                       style={{ width: `${gesture.expansion * 100}%` }}
                     />
                  </div>
                </div>
              </div>
            )}
          </div>

          {!showControls && (
            <button 
              onClick={() => setShowControls(true)}
              className="pointer-events-auto bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-full text-slate-400 hover:text-white transition-all shadow-xl"
            >
              <Settings2 size={24} />
            </button>
          )}

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl max-w-xs pointer-events-auto">
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-indigo-400 font-bold">Zen Guide:</span> Move your hands apart to expand the energy, or bring them together to condense it. Gemini is watching your flow.
            </p>
          </div>
        </footer>
      </div>

      <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/30 transition-all duration-300 z-50 pointer-events-none" 
           style={{ width: `${gesture.expansion * 100}%` }} />
    </div>
  );
};

export default App;
