// components/CamaleonicSpecimenViewer.tsx
'use client';

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Visor 3D camaleónico y AGNÓSTICO: el color de acento llega por props desde la
// paleta taxonómica resuelta en servidor (lib/theme/taxon.ts). Sin temas ni
// datos hardcodeados; la URL del modelo también es dinámica (Cloudinary).
interface ViewerProps {
  modelUrl: string;
  accent: string;       // hex dinámico (material iridiscente + glow)
  surface?: string;     // color base del lienzo
  autoRotate?: boolean;
  statusLabel?: string; // etiqueta i18n opcional (sin texto fijo en el código)
}

function CamaleonicModel({ url, accent }: { url: string; accent: string }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  // useGLTF cachea la escena globalmente → clonamos por instancia para no mutar
  // materiales compartidos entre montajes/ especímenes.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Mutación del acento como EFECTO (no en el render) y clonando cada material.
  useEffect(() => {
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        const material = mesh.material.clone();
        material.color.set(accent);
        material.roughness = 0.2;
        material.metalness = 0.8; // exoesqueleto iridiscente
        mesh.material = material;
      }
    });
  }, [cloned, accent]);

  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group ref={modelRef}>
      <Center>
        <primitive object={cloned} scale={1.6} />
      </Center>
    </group>
  );
}

export default function CamaleonicSpecimenViewer({
  modelUrl,
  accent,
  surface = '#04140d',
  autoRotate = false,
  statusLabel,
}: ViewerProps) {
  const glow = useMemo(() => hexToGlow(accent, 0.15), [accent]);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-transparent transition-all duration-700"
      style={{ background: `linear-gradient(to bottom, ${surface}, #000)` }}
    >
      {/* Fondo adaptativo derivado del acento */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 70%)` }}
      />

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <Suspense fallback={null}>
          <CamaleonicModel url={modelUrl} accent={accent} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enableZoom autoRotate={autoRotate} />
      </Canvas>

      {statusLabel && (
        <div className="absolute bottom-4 right-4 rounded border border-white/10 bg-black/60 px-3 py-1 font-mono text-[10px] text-gray-400 backdrop-blur">
          {statusLabel}
        </div>
      )}
    </div>
  );
}

// Convierte un hex (#rgb o #rrggbb) a rgba con alfa para el glow. Degrada a un
// gris translúcido ante entradas inválidas.
function hexToGlow(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex?.trim() ?? '');
  if (!m) return `rgba(148, 163, 184, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
