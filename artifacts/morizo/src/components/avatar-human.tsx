import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";

export type EquippedItems = {
  hat?: string;
  shirt?: string;
  pants?: string;
  glasses?: string;
  jacket?: string;
};

export type ShopItem = {
  id: string;
  slot: "hat" | "shirt" | "pants" | "glasses" | "jacket";
  name: string;
  price: number;
  color?: string;
  description: string;
};

const SKIN_COLOR = "#f4c3a0";
const DEFAULT_SHIRT = "#a3e635";
const DEFAULT_PANTS = "#3b82f6";

function colorOf(items: ShopItem[], id: string | undefined, fallback: string) {
  if (!id) return fallback;
  const item = items.find((i) => i.id === id);
  return item?.color ?? fallback;
}

function Body({
  equipped,
  items,
  bobbing = true,
}: {
  equipped: EquippedItems;
  items: ShopItem[];
  bobbing?: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  useFrame((state, dt) => {
    if (!group.current) return;
    if (bobbing) {
      group.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.6) * 0.03;
    }
    group.current.rotation.y += dt * 0.25;
  });

  const shirtColor = colorOf(items, equipped.shirt, DEFAULT_SHIRT);
  const pantsColor = colorOf(items, equipped.pants, DEFAULT_PANTS);
  const jacketColor = colorOf(items, equipped.jacket, "#000000");
  const hatColor = colorOf(items, equipped.hat, "#000000");
  const glassesColor = colorOf(items, equipped.glasses, "#000000");

  const hatType = equipped.hat ?? "";
  const glassesType = equipped.glasses ?? "";
  const jacketEquipped = !!equipped.jacket;

  return (
    <group ref={group} position={[0, -0.88, 0]}>
      {/* Neck */}
      <mesh position={[0, 1.27, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.2, 16]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={SKIN_COLOR} roughness={0.6} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.12, 1.6, 0.27]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0.12, 1.6, 0.27]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, 1.45, 0.28]}>
        <torusGeometry args={[0.06, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>

      {/* Glasses */}
      {glassesType.includes("round") || glassesType.includes("sun") ? (
        <group position={[0, 1.6, 0.3]}>
          <mesh position={[-0.12, 0, 0]}>
            <torusGeometry args={[0.07, 0.015, 8, 24]} />
            <meshStandardMaterial color={glassesColor} metalness={0.7} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <torusGeometry args={[0.07, 0.015, 8, 24]} />
            <meshStandardMaterial color={glassesColor} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
            <meshStandardMaterial color={glassesColor} />
          </mesh>
        </group>
      ) : null}
      {glassesType.includes("vr") ? (
        <mesh position={[0, 1.6, 0.31]}>
          <boxGeometry args={[0.42, 0.16, 0.06]} />
          <meshStandardMaterial
            color={glassesColor}
            metalness={0.85}
            roughness={0.1}
            emissive={glassesColor}
            emissiveIntensity={0.6}
          />
        </mesh>
      ) : null}

      {/* Hat */}
      {hatType.includes("cap") ? (
        <group position={[0, 1.85, 0]}>
          <mesh castShadow>
            <sphereGeometry
              args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color={hatColor} />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.04, 32, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={hatColor} />
          </mesh>
        </group>
      ) : null}
      {hatType.includes("beanie") ? (
        <mesh position={[0, 1.78, 0]} castShadow>
          <sphereGeometry args={[0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
          <meshStandardMaterial color={hatColor} roughness={0.9} />
        </mesh>
      ) : null}
      {hatType.includes("helmet") ? (
        <mesh position={[0, 1.82, 0]} castShadow>
          <sphereGeometry
            args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.8]}
          />
          <meshStandardMaterial color={hatColor} metalness={0.4} roughness={0.5} />
        </mesh>
      ) : null}
      {hatType.includes("crown") ? (
        <group position={[0, 1.92, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.18, 5]} />
            <meshStandardMaterial
              color={hatColor}
              metalness={0.95}
              roughness={0.15}
              emissive={hatColor}
              emissiveIntensity={0.25}
            />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * 0.34,
                  0.13,
                  Math.sin(angle) * 0.34,
                ]}
              >
                <coneGeometry args={[0.06, 0.18, 4]} />
                <meshStandardMaterial
                  color={hatColor}
                  metalness={0.95}
                  emissive={hatColor}
                  emissiveIntensity={0.4}
                />
              </mesh>
            );
          })}
        </group>
      ) : null}

      {/* Torso (shirt) */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.7, 24]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>

      {/* Jacket overlay */}
      {jacketEquipped ? (
        <mesh position={[0, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.4, 0.74, 24, 1, true]} />
          <meshStandardMaterial
            color={jacketColor}
            roughness={0.8}
            side={THREE.DoubleSide}
            emissive={jacketColor}
            emissiveIntensity={equipped.jacket?.includes("neon") ? 0.4 : 0}
          />
        </mesh>
      ) : null}

      {/* Arms */}
      <mesh position={[-0.45, 1.05, 0]} rotation={[0, 0, 0.18]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <meshStandardMaterial color={jacketEquipped ? jacketColor : shirtColor} />
      </mesh>
      <mesh position={[0.45, 1.05, 0]} rotation={[0, 0, -0.18]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <meshStandardMaterial color={jacketEquipped ? jacketColor : shirtColor} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.55, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={SKIN_COLOR} />
      </mesh>
      <mesh position={[0.55, 0.7, 0]} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={SKIN_COLOR} />
      </mesh>

      {/* Pants / legs */}
      <mesh position={[-0.16, 0.32, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.55, 8, 16]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.16, 0.32, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.55, 8, 16]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.16, -0.05, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.08, 0.28]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0.16, -0.05, 0.06]} castShadow>
        <boxGeometry args={[0.18, 0.08, 0.28]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}

export function AvatarHuman({
  equipped,
  items,
  size = 240,
  bobbing = true,
}: {
  equipped: EquippedItems;
  items: ShopItem[];
  size?: number;
  bobbing?: boolean;
}) {
  const cfg = useMemo(() => ({ ...equipped }), [equipped]);
  return (
    <div
      style={{ width: size, height: size }}
      className="relative"
      role="img"
      aria-label="3D человечек"
    >
      <ThreeErrorBoundary
        fallback={
          <div className="w-full h-full bg-card border-2 border-border flex items-center justify-center text-xs font-mono text-muted-foreground">
            3D недоступно
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0.05, 2.9], fov: 42 }}
          dpr={[1, 1.6]}
          gl={{ alpha: true }}
          shadows
        >
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-3, 2, -2]} color="#a3e635" intensity={0.5} />
          <pointLight position={[2, -1, 2]} color="#7c3aed" intensity={0.3} />
          <Suspense fallback={null}>
            <Environment preset="city" />
            <Body equipped={cfg} items={items} bobbing={bobbing} />
            <ContactShadows
              position={[0, -0.96, 0]}
              opacity={0.55}
              scale={4}
              blur={2}
              far={3}
            />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 3.5}
            maxPolarAngle={Math.PI / 1.7}
          />
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
