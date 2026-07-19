"use client";

import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Mesh, MeshStandardMaterial, type Material, type Object3D } from "three";

import type { Muscle } from "@/lib/recomp-domain";

type MuscleScores = Partial<Record<Muscle, number>>;

const MODEL_PATH = "/models/muscular.glb";

const COLORS = {
  idle: "#727a75",
  low: "#9fcab1",
  medium: "#32bb72",
  high: "#ff6548",
  body: "#424844",
};

const MUSCLE_PATTERNS: Record<Muscle, string[]> = {
  shoulders: ["delt_"],
  chest: ["pec_"],
  biceps: ["bicep_", "brachialis", "brachioradialis", "forearm_flexors"],
  triceps: ["tricep_", "forearm_extensors"],
  core: ["rectus_", "obliques", "transverse"],
  back: ["rhomboids", "lats", "trap_", "erectors", "teres_", "infraspinatus"],
  glutes: ["glute_"],
  quads: ["rectus_femoris", "vastus_", "adductors", "hip_flexors"],
  hamstrings: ["biceps_femoris_", "semimembranosus", "semitendinosus"],
  calves: ["gastroc_", "soleus", "tibialis_anterior"],
};

function muscleColor(score = 0, periodDays = 7) {
  const periodWeeks = Math.max(1, periodDays / 7);
  if (score >= 6 * periodWeeks) return COLORS.high;
  if (score >= 3 * periodWeeks) return COLORS.medium;
  if (score > 0) return COLORS.low;
  return COLORS.idle;
}

function muscleForObject(object: Object3D): Muscle | null {
  const name = object.name.toLowerCase();
  return (
    (Object.entries(MUSCLE_PATTERNS) as [Muscle, string[]][]).find(([, patterns]) =>
      patterns.some((pattern) => name.includes(pattern)),
    )?.[0] ?? null
  );
}

function paintMaterial(material: Material, color: string, active: boolean) {
  if (!(material instanceof MeshStandardMaterial)) return;
  material.color.set(color);
  material.roughness = active ? 0.42 : 0.58;
  material.metalness = 0.02;
  material.emissive.set(color);
  material.emissiveIntensity = active ? 0.1 : 0;
}

function AnatomicalModel({
  periodDays,
  scores,
  onHover,
}: {
  periodDays: number;
  scores: MuscleScores;
  onHover: (muscle: Muscle | null) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone();
      object.userData.recompMuscle = muscleForObject(object);
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const muscle = object.userData.recompMuscle as Muscle | null;
      const score = muscle ? scores[muscle] ?? 0 : 0;
      const color = muscle ? muscleColor(score, periodDays) : COLORS.body;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => paintMaterial(material, color, score > 0));
    });
  }, [model, periodDays, scores]);

  function enter(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const muscle = event.object.userData.recompMuscle as Muscle | null;
    onHover(muscle);
    document.body.style.cursor = muscle ? "pointer" : "grab";
  }

  function leave() {
    onHover(null);
    document.body.style.cursor = "";
  }

  return (
    <group>
      <primitive
        object={model}
        onPointerOut={leave}
        onPointerOver={enter}
        position={[0, -3.18, 0]}
        scale={4.05}
      />
      <mesh castShadow position={[0, 3.03, -0.01]} receiveShadow scale={[0.42, 0.54, 0.4]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={COLORS.body} metalness={0.02} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 2.67, 0]} receiveShadow scale={[0.33, 0.32, 0.34]}>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial color={COLORS.body} metalness={0.02} roughness={0.6} />
      </mesh>
    </group>
  );
}

function LoadingBody() {
  return (
    <mesh>
      <capsuleGeometry args={[0.5, 4.4, 8, 16]} />
      <meshStandardMaterial color={COLORS.body} wireframe />
    </mesh>
  );
}

export function BodyHeatmap({
  scores,
  compact = false,
  periodDays = 7,
}: {
  scores: MuscleScores;
  compact?: boolean;
  periodDays?: number;
}) {
  const [hoveredMuscle, setHoveredMuscle] = useState<Muscle | null>(null);

  return (
    <div className={compact ? "heatmap heatmap-compact" : "heatmap"}>
      <div className="heatmap-canvas">
        <Canvas
          aria-label="Interactive 3D anatomical muscle load model"
          camera={{ fov: compact ? 30 : 29, position: [0, 0.05, compact ? 15.4 : 15] }}
          dpr={[1, 1.75]}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          role="img"
          shadows
        >
          <ambientLight intensity={1.35} />
          <hemisphereLight color="#fff8ed" groundColor="#26302a" intensity={1.25} />
          <directionalLight
            castShadow
            intensity={2.3}
            position={[4, 7, 6]}
            shadow-mapSize-height={1024}
            shadow-mapSize-width={1024}
          />
          <directionalLight color="#88a7ff" intensity={0.85} position={[-4, 2, -5]} />
          <Suspense fallback={<LoadingBody />}>
            <AnatomicalModel onHover={setHoveredMuscle} periodDays={periodDays} scores={scores} />
          </Suspense>
          <ContactShadows blur={2.5} far={6} opacity={0.38} position={[0, -3.22, 0]} resolution={512} scale={6} />
          <OrbitControls
            autoRotate={!compact}
            autoRotateSpeed={0.45}
            enableDamping
            enablePan={false}
            maxDistance={18}
            maxPolarAngle={Math.PI / 1.7}
            minDistance={10}
            minPolarAngle={Math.PI / 2.4}
          />
        </Canvas>
        <div className={`heatmap-readout ${hoveredMuscle ? "active" : ""}`}>
          <strong>{hoveredMuscle ?? "Muscle load"}</strong>
          <span>{hoveredMuscle ? `${formatScore(scores[hoveredMuscle] ?? 0)} working sets` : "Drag to inspect the anatomy"}</span>
        </div>
      </div>
      <div className="heatmap-legend" aria-label="Muscle load legend">
        <span><i style={{ background: COLORS.idle }} />Rested</span>
        <span><i style={{ background: COLORS.low }} />Light</span>
        <span><i style={{ background: COLORS.medium }} />Worked</span>
        <span><i style={{ background: COLORS.high }} />High</span>
      </div>
      <a className="model-attribution" href="https://www.adamasdesigns.com/licenses" rel="noreferrer" target="_blank">
        Open anatomy model attribution
      </a>
    </div>
  );
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

useGLTF.preload(MODEL_PATH);
