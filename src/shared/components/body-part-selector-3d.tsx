"use client";

import { useCallback, useState, Suspense, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, RotateCcw, Loader2 } from "lucide-react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import { cn } from "@/shared/lib/utils";

const BODY_PARTS = [
  "neck",
  "shoulders",
  "chest",
  "arms",
  "back",
  "waist",
  "glutes",
  "legs",
] as const;

export type BodyPartKey = (typeof BODY_PARTS)[number];

// Body part regions mapped to Y-axis ranges on the model
const BODY_PART_REGIONS: Record<BodyPartKey, { minY: number; maxY: number }> = {
  neck: { minY: 1.15, maxY: 2.0 },
  shoulders: { minY: 0.95, maxY: 1.15 },
  chest: { minY: 0.7, maxY: 0.95 },
  arms: { minY: 0.3, maxY: 1.1 },
  back: { minY: 0.6, maxY: 1.1 },
  waist: { minY: 0.4, maxY: 0.7 },
  glutes: { minY: 0.15, maxY: 0.45 },
  legs: { minY: -0.5, maxY: 0.2 },
};

interface HumanBodyProps {
  selectedParts: string[];
  onPartClick: (part: BodyPartKey) => void;
  rotation: number; // 0 for front, Math.PI for back
}

function HumanBody({ selectedParts, onPartClick, rotation }: HumanBodyProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load OBJ model
  const obj = useLoader(OBJLoader, "/model/Male.OBJ");

  useEffect(() => {
    if (obj && groupRef.current) {
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Center the model at origin, but adjust Y so waist is at center
      obj.position.x = 0;
      obj.position.y = 1; // Move up by 20% of height so waist is centered
      obj.position.z = 0;

      // Scale to fit (make it smaller to see full body)
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.8 / maxDim; // Reduced from 2 to 1.8 to see more
      obj.scale.setScalar(scale);

      // Set rotation
      obj.rotation.y = rotation;

      // Apply materials and assign body part names to meshes
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Get mesh position to determine body part
          const meshBox = new THREE.Box3().setFromObject(child);
          const meshCenter = meshBox.getCenter(new THREE.Vector3());

          // Assign body part based on mesh position
          let bodyPart: BodyPartKey | null = null;
          for (const [part, region] of Object.entries(BODY_PART_REGIONS)) {
            if (meshCenter.y >= region.minY && meshCenter.y <= region.maxY) {
              bodyPart = part as BodyPartKey;
              break;
            }
          }

          // Store body part in mesh userData
          child.userData.bodyPart = bodyPart;
          child.userData.originalColor = 0xcc6666;

          // Create custom material with muscle color
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xcc6666), // Muscle red color
            roughness: 0.7,
            metalness: 0.1,
            transparent: true,
            opacity: 0.8,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      console.log("Model loaded. Bounding box:", {
        min: {
          x: box.min.x.toFixed(2),
          y: box.min.y.toFixed(2),
          z: box.min.z.toFixed(2),
        },
        max: {
          x: box.max.x.toFixed(2),
          y: box.max.y.toFixed(2),
          z: box.max.z.toFixed(2),
        },
        center: {
          x: center.x.toFixed(2),
          y: center.y.toFixed(2),
          z: center.z.toFixed(2),
        },
        size: {
          x: size.x.toFixed(2),
          y: size.y.toFixed(2),
          z: size.z.toFixed(2),
        },
      });
    }
  }, [obj, rotation]);

  // Handle click on model
  const handleClick = useCallback(
    (event: any) => {
      event.stopPropagation();
      const intersect = event.intersections[0];
      if (intersect && intersect.object) {
        const mesh = intersect.object as THREE.Mesh;
        const bodyPart = mesh.userData.bodyPart as BodyPartKey | null;

        console.log("Clicked mesh:", {
          bodyPart,
          position: {
            x: intersect.point.x.toFixed(2),
            y: intersect.point.y.toFixed(2),
            z: intersect.point.z.toFixed(2),
          },
        });

        if (bodyPart) {
          console.log("Selected body part:", bodyPart);
          onPartClick(bodyPart);
        } else {
          console.log("Clicked mesh has no body part assigned");
        }
      }
    },
    [onPartClick],
  );

  // Highlight selected parts
  useEffect(() => {
    if (obj) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const bodyPart = child.userData.bodyPart as BodyPartKey | null;
          const isSelected = bodyPart && selectedParts.includes(bodyPart);

          // Update material
          if (child.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              child.material.color.setHex(0xff3333); // Bright red for selected
              child.material.emissive.setHex(0xff0000);
              child.material.emissiveIntensity = 0.5;
              child.material.opacity = 1.0;
            } else {
              child.material.color.setHex(0xcc6666); // Default muscle color
              child.material.emissive.setHex(0x000000);
              child.material.emissiveIntensity = 0;
              child.material.opacity = 0.8;
            }
            child.material.needsUpdate = true;
          }
        }
      });
    }
  }, [obj, selectedParts]);

  return (
    <group ref={groupRef}>
      <primitive
        object={obj}
        onClick={handleClick}
      />
    </group>
  );
}

interface BodyPartSelector3DProps {
  selected: string[];
  onChange: (parts: string[]) => void;
  disabled?: boolean;
}

export function BodyPartSelector3D({
  selected,
  onChange,
  disabled,
}: BodyPartSelector3DProps) {
  const t = useTranslations("ai.video.generator.wizard.body_parts");
  const [isLoading, setIsLoading] = useState(true);

  const toggle = useCallback(
    (part: string) => {
      if (disabled) return;
      if (selected.includes(part)) {
        onChange(selected.filter((p) => p !== part));
      } else {
        onChange([...selected, part]);
      }
    },
    [disabled, selected, onChange],
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* 3D Canvas - Two models side by side */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-2 gap-4">
          {/* Front View */}
          <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Loading 3D model...
                  </p>
                </div>
              </div>
            )}

            <Canvas shadows onCreated={() => setIsLoading(false)}>
              <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />

                {/* Enhanced Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[5, 5, 5]}
                  intensity={1.5}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <directionalLight position={[-5, 5, -5]} intensity={0.8} />
                <pointLight position={[0, 2, 2]} intensity={1.2} color="#ff6b6b" />
                <pointLight
                  position={[0, 0.5, 2]}
                  intensity={0.6}
                  color="#ee5a6f"
                />

                {/* Rim lighting */}
                <pointLight
                  position={[-2, 1, -2]}
                  intensity={0.5}
                  color="#3b82f6"
                />
                <pointLight position={[2, 1, -2]} intensity={0.5} color="#3b82f6" />

                <HumanBody
                  selectedParts={selected}
                  onPartClick={toggle}
                  rotation={0}
                />
              </Suspense>
            </Canvas>

            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                {t("front_view")}
              </span>
            </div>
          </div>

          {/* Back View */}
          <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />

            <Canvas shadows>
              <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />

                {/* Enhanced Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[5, 5, 5]}
                  intensity={1.5}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <directionalLight position={[-5, 5, -5]} intensity={0.8} />
                <pointLight position={[0, 2, 2]} intensity={1.2} color="#ff6b6b" />
                <pointLight
                  position={[0, 0.5, 2]}
                  intensity={0.6}
                  color="#ee5a6f"
                />

                {/* Rim lighting */}
                <pointLight
                  position={[-2, 1, -2]}
                  intensity={0.5}
                  color="#3b82f6"
                />
                <pointLight position={[2, 1, -2]} intensity={0.5} color="#3b82f6" />

                <HumanBody
                  selectedParts={selected}
                  onPartClick={toggle}
                  rotation={Math.PI}
                />
              </Suspense>
            </Canvas>

            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                {t("back_view")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-muted-foreground">
        {t("description")}
      </p>

      {/* Selected count */}
      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("selected_count", { count: selected.length })}
        </p>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selected.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => toggle(part)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                "bg-primary/10 text-primary border border-primary/20",
                "hover:bg-primary/20 transition-colors",
              )}
            >
              {t(part as BodyPartKey)}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Reset button */}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Selection
        </button>
      )}
    </div>
  );
}
