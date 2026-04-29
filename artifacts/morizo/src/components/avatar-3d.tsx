import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Palette, RotateCcw, Save, Box } from "lucide-react";
import { ThreeErrorBoundary } from "@/components/three-error-boundary";
import { isWebGLSupported } from "@/lib/webgl-support";

function FlatAvatarFallback({
  config,
  size,
  label,
}: {
  config: Avatar3DConfig;
  size: number;
  label?: string;
}) {
  const shape: Record<Avatar3DConfig["shape"], string> = {
    cube: "0",
    sphere: "50%",
    octa: "0",
    cone: "0",
  };
  return (
    <div
      style={{ width: size, height: size }}
      className="relative bg-gradient-to-br from-card to-background flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${config.bodyColor}, transparent 60%), radial-gradient(circle at 70% 70%, ${config.accentColor}, transparent 60%)`,
        }}
      />
      <div
        className="relative animate-spin-slow"
        style={{
          width: size * 0.45 * config.scale,
          height: size * 0.45 * config.scale,
          background: config.bodyColor,
          borderRadius: shape[config.shape],
          transform:
            config.shape === "octa" ? "rotate(45deg)" : config.shape === "cone" ? "rotate(0deg)" : undefined,
          clipPath:
            config.shape === "cone"
              ? "polygon(50% 0%, 0% 100%, 100% 100%)"
              : undefined,
          boxShadow: `0 0 30px ${config.accentColor}, inset 0 0 20px rgba(255,255,255,0.2)`,
        }}
      />
      {label && (
        <div className="absolute bottom-1 left-1 text-[10px] font-mono uppercase text-muted-foreground bg-background/70 px-1.5 py-0.5">
          {label}
        </div>
      )}
    </div>
  );
}

export type Avatar3DConfig = {
  bodyColor: string;
  accentColor: string;
  shape: "cube" | "sphere" | "octa" | "cone";
  scale: number;
  spin: number;
};

export const DEFAULT_AVATAR3D: Avatar3DConfig = {
  bodyColor: "#c5ff2e",
  accentColor: "#ff2bd6",
  shape: "octa",
  scale: 1,
  spin: 0.6,
};

const SHAPE_OPTIONS: Array<{ id: Avatar3DConfig["shape"]; label: string }> = [
  { id: "cube", label: "Куб" },
  { id: "sphere", label: "Сфера" },
  { id: "octa", label: "Окта" },
  { id: "cone", label: "Конус" },
];

const COLOR_PALETTE = [
  "#c5ff2e",
  "#ff2bd6",
  "#7c3aed",
  "#06b6d4",
  "#f97316",
  "#22c55e",
  "#facc15",
  "#ef4444",
  "#ffffff",
  "#0a0a0a",
];

function Geometry({ shape }: { shape: Avatar3DConfig["shape"] }) {
  switch (shape) {
    case "cube":
      return <boxGeometry args={[1.4, 1.4, 1.4]} />;
    case "sphere":
      return <sphereGeometry args={[1, 48, 48]} />;
    case "cone":
      return <coneGeometry args={[1, 1.8, 32]} />;
    case "octa":
    default:
      return <octahedronGeometry args={[1.2, 0]} />;
  }
}

function AvatarMesh({ config }: { config: Avatar3DConfig }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * config.spin;
    ref.current.rotation.x += dt * config.spin * 0.4;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={ref} scale={config.scale} castShadow>
        <Geometry shape={config.shape} />
        <meshStandardMaterial
          color={config.bodyColor}
          metalness={0.4}
          roughness={0.25}
          emissive={config.bodyColor}
          emissiveIntensity={0.12}
        />
      </mesh>
      {/* Accent halo ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={config.scale}>
        <torusGeometry args={[1.7, 0.045, 12, 64]} />
        <meshStandardMaterial
          color={config.accentColor}
          emissive={config.accentColor}
          emissiveIntensity={1.3}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

function Scene({ config }: { config: Avatar3DConfig }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />
      <pointLight position={[-3, 2, -4]} color={config.accentColor} intensity={1.4} />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <AvatarMesh config={config} />
        <ContactShadows
          position={[0, -1.7, 0]}
          opacity={0.4}
          scale={6}
          blur={2.4}
          far={3}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.6}
      />
    </>
  );
}

/**
 * Read-only viewer (used in profile header / cards).
 */
export function Avatar3DView({
  config,
  size = 220,
  className,
}: {
  config: Avatar3DConfig;
  size?: number;
  className?: string;
}) {
  const cfg = useMemo(() => ({ ...DEFAULT_AVATAR3D, ...config }), [config]);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(isWebGLSupported()), []);

  if (!enabled) {
    return (
      <div className={className} role="img" aria-label="3D аватар">
        <FlatAvatarFallback config={cfg} size={size} />
      </div>
    );
  }
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label="3D аватар"
    >
      <ThreeErrorBoundary
        fallback={<FlatAvatarFallback config={cfg} size={size} />}
      >
        <Canvas camera={{ position: [0, 0.4, 4.2], fov: 38 }} dpr={[1, 1.6]} gl={{ alpha: true }}>
          <Scene config={cfg} />
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}

/**
 * Full editor — preview + form + Save.
 */
export function Avatar3DEditor({
  initial,
  onSave,
  saving = false,
}: {
  initial?: Partial<Avatar3DConfig>;
  onSave: (config: Avatar3DConfig) => void;
  saving?: boolean;
}) {
  const [config, setConfig] = useState<Avatar3DConfig>({
    ...DEFAULT_AVATAR3D,
    ...initial,
  });

  const set = <K extends keyof Avatar3DConfig>(k: K, v: Avatar3DConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const [webgl, setWebgl] = useState(false);
  useEffect(() => setWebgl(isWebGLSupported()), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="border-2 border-border bg-gradient-to-br from-card to-background h-[320px] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {webgl ? (
            <ThreeErrorBoundary
              fallback={<FlatAvatarFallback config={config} size={300} />}
            >
              <Canvas camera={{ position: [0, 0.4, 4.2], fov: 38 }} dpr={[1, 1.6]} gl={{ alpha: true }}>
                <Scene config={config} />
              </Canvas>
            </ThreeErrorBoundary>
          ) : (
            <FlatAvatarFallback config={config} size={300} label="2D fallback" />
          )}
        </div>
        <div className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground bg-background/70 backdrop-blur px-2 py-1 flex items-center gap-1">
          <Box className="h-3 w-3" />
          {webgl ? "live preview" : "preview без WebGL"}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs uppercase font-bold font-mono mb-2 block">
            Форма
          </Label>
          <div className="grid grid-cols-4 gap-1.5">
            {SHAPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set("shape", s.id)}
                className={`h-10 border-2 text-xs font-bold uppercase font-mono transition-colors ${
                  config.shape === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-foreground/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase font-bold font-mono mb-2 block">
            Основной цвет
          </Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={`b-${c}`}
                type="button"
                onClick={() => set("bodyColor", c)}
                style={{ background: c }}
                className={`h-7 w-7 border-2 ${
                  config.bodyColor === c ? "border-primary scale-110" : "border-border"
                } transition-transform`}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase font-bold font-mono mb-2 block">
            Акцент (свечение)
          </Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={`a-${c}`}
                type="button"
                onClick={() => set("accentColor", c)}
                style={{ background: c }}
                className={`h-7 w-7 border-2 ${
                  config.accentColor === c
                    ? "border-secondary scale-110"
                    : "border-border"
                } transition-transform`}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase font-bold font-mono mb-2 block">
              Размер
            </Label>
            <Slider
              min={0.6}
              max={1.4}
              step={0.05}
              value={[config.scale]}
              onValueChange={(v) => set("scale", v[0])}
            />
          </div>
          <div>
            <Label className="text-xs uppercase font-bold font-mono mb-2 block">
              Скорость
            </Label>
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={[config.spin]}
              onValueChange={(v) => set("spin", v[0])}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 font-bold uppercase"
            onClick={() => setConfig(DEFAULT_AVATAR3D)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Сброс
          </Button>
          <Button
            type="button"
            disabled={saving}
            className="flex-1 rounded-none font-black uppercase"
            onClick={() => onSave(config)}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Сохраняю…" : "Сохранить"}
          </Button>
        </div>

        <p className="text-[11px] font-mono text-muted-foreground flex items-start gap-1.5">
          <Palette className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          Аватар сохраняется в профиле и виден другим игрокам.
        </p>
      </div>
    </div>
  );
}
