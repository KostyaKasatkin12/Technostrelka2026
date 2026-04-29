import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, Sparkles, Edges } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";
import { isWebGLSupported } from "@/lib/webgl-support";
import { motion } from "framer-motion";

/** Build a stylized capital letter "M" as a 2D shape for extrusion. */
function buildMShape(): THREE.Shape {
  const s = new THREE.Shape();
  // Outer outline of the letter M (clockwise)
  s.moveTo(-1.55, -2.0);
  s.lineTo(-1.55, 2.0);
  s.lineTo(-0.85, 2.0);
  s.lineTo(0, 0.05);
  s.lineTo(0.85, 2.0);
  s.lineTo(1.55, 2.0);
  s.lineTo(1.55, -2.0);
  s.lineTo(0.95, -2.0);
  s.lineTo(0.95, 0.95);
  s.lineTo(0.18, -0.55);
  s.lineTo(-0.18, -0.55);
  s.lineTo(-0.95, 0.95);
  s.lineTo(-0.95, -2.0);
  s.lineTo(-1.55, -2.0);
  return s;
}

function CosmicLetterM() {
  const group = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Mesh>(null!);

  const geometry = useMemo(() => {
    const shape = buildMShape();
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.08,
      curveSegments: 24,
    });
    geom.center();
    return geom;
  }, []);

  // Subtle floating spin, rocked by mouse position.
  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const targetY = state.pointer.x * 0.5 + Math.sin(t * 0.4) * 0.3;
    const targetX = -state.pointer.y * 0.25 + Math.sin(t * 0.6) * 0.05;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    group.current.position.y = Math.sin(t * 0.7) * 0.08;
    if (inner.current) {
      const mat = inner.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 0.45 + (Math.sin(t * 1.2) + 1) * 0.25;
    }
  });

  return (
    <group ref={group}>
      {/* Main glossy body with neon glow */}
      <mesh ref={inner} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#0d0520"
          emissive="#6d28d9"
          emissiveIntensity={0.55}
          metalness={0.92}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={1}
        />
        <Edges threshold={20} color="#a78bfa" />
      </mesh>

      {/* Soft halo behind the letter */}
      <mesh position={[0, 0, -0.6]}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial
          color="#3b1d7a"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Floating sparkles around the letter */}
      <Sparkles
        count={70}
        scale={[6, 5, 3]}
        size={2.5}
        speed={0.4}
        opacity={0.9}
        color="#a78bfa"
      />
      <Sparkles
        count={40}
        scale={[5, 4, 2]}
        size={1.6}
        speed={0.6}
        opacity={0.7}
        color="#22d3ee"
      />
    </group>
  );
}

function CosmicScene() {
  return (
    <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.4}>
      <CosmicLetterM />
    </Float>
  );
}

/** Pure-CSS animated fallback when WebGL isn't available. */
function CssHeroFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Cosmic gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.35) 0%, rgba(34,211,238,0.18) 35%, transparent 60%)",
          filter: "blur(40px)",
        }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Stars */}
      {Array.from({ length: 60 }).map((_, i) => {
        const left = (i * 137.5) % 100;
        const top = (i * 53) % 100;
        const size = 1 + (i % 3);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              opacity: 0.5,
            }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{
              duration: 2 + (i % 5),
              delay: (i % 7) * 0.3,
              repeat: Infinity,
            }}
          />
        );
      })}

      {/* Neon M */}
      <div className="absolute right-[4%] md:right-[10%] top-1/2 -translate-y-1/2 hidden sm:block">
        <motion.div
          className="text-[240px] md:text-[380px] leading-none font-black tracking-tighter select-none"
          style={{
            color: "transparent",
            textShadow:
              "0 0 8px #7c3aed, 0 0 20px #7c3aed, 0 0 40px #22d3ee, 0 0 70px #c5ff2e, 0 0 120px #a78bfa",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            WebkitTextStroke: "3px rgba(167,139,250,0.9)",
            filter: "drop-shadow(0 0 40px rgba(124,58,237,0.6))",
          }}
          animate={{
            textShadow: [
              "0 0 8px #7c3aed, 0 0 20px #7c3aed, 0 0 40px #22d3ee, 0 0 70px #c5ff2e, 0 0 120px #a78bfa",
              "0 0 12px #c5ff2e, 0 0 28px #22d3ee, 0 0 50px #7c3aed, 0 0 90px #ff2bd6, 0 0 140px #c5ff2e",
              "0 0 8px #ff2bd6, 0 0 20px #a78bfa, 0 0 40px #22d3ee, 0 0 70px #7c3aed, 0 0 120px #ff2bd6",
              "0 0 8px #7c3aed, 0 0 20px #7c3aed, 0 0 40px #22d3ee, 0 0 70px #c5ff2e, 0 0 120px #a78bfa",
            ],
            rotateZ: [0, 1, -1, 0.5, 0],
            scale: [1, 1.02, 0.98, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          M
        </motion.div>
      </div>
    </div>
  );
}

export function Hero3D() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(isWebGLSupported());
  }, []);

  if (!enabled) {
    return (
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <CssHeroFallback />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-0 pointer-events-none">
      <ThreeErrorBoundary fallback={<CssHeroFallback />}>
        <Canvas
          camera={{ position: [0, 0, 6.5], fov: 42 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={["#040611"]} />
          <fog attach="fog" args={["#040611", 8, 20]} />

          {/* Key rim lights — neon palette */}
          <ambientLight intensity={0.25} />
          <pointLight position={[-4, 1.5, 2]} color="#22d3ee" intensity={10} distance={16} />
          <pointLight position={[4, -1.5, 2]} color="#c5ff2e" intensity={9} distance={16} />
          <pointLight position={[0, 3, -2]} color="#a78bfa" intensity={9} distance={14} />
          <pointLight position={[0, -3, 3]} color="#ff2bd6" intensity={6} distance={14} />
          <pointLight position={[2, 0, 4]} color="#ffffff" intensity={4} distance={10} />
          <directionalLight position={[2, 4, 3]} intensity={0.6} color="#a78bfa" />

          <Suspense fallback={null}>
            <Stars
              radius={50}
              depth={60}
              count={1200}
              factor={3}
              saturation={0.4}
              fade
              speed={0.4}
            />
            <CosmicScene />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
