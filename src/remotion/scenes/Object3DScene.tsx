import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { useRise } from "../anim";
import { DISPLAY_FONT } from "../fonts";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

// Real-time 3D hero objects (Three.js via @remotion/three). Every motion is a pure
// function of the frame, so renders are deterministic.

type ModelProps = { frame: number; theme: Theme };

const Metal: React.FC<{ color: string; emissive?: number }> = ({ color, emissive = 0.15 }) => (
  <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} emissive={color} emissiveIntensity={emissive} />
);

const Atom: React.FC<ModelProps> = ({ frame, theme }) => {
  const orbits = [0, Math.PI / 3, -Math.PI / 3];
  return (
    <group rotation={[0.3, frame * 0.01, 0]}>
      {[[0, 0, 0], [0.35, 0.2, 0], [-0.3, 0.25, 0.1], [0.1, -0.35, 0.2], [-0.2, -0.2, -0.3], [0.2, 0.1, 0.35]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.32, 32, 32]} />
          <Metal color={i % 2 ? theme.accent : theme.accent2} />
        </mesh>
      ))}
      {orbits.map((tilt, i) => {
        const a = frame * 0.06 * (i % 2 ? -1 : 1) + i * 2;
        return (
          <group key={i} rotation={[Math.PI / 2, tilt, 0]}>
            <mesh>
              <torusGeometry args={[2.2, 0.015, 8, 128]} />
              <meshBasicMaterial color={theme.text} transparent opacity={0.5} />
            </mesh>
            <mesh position={[Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0]}>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshBasicMaterial color={theme.accent} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Planet: React.FC<ModelProps> = ({ frame, theme }) => {
  const a = frame * 0.02;
  return (
    <group rotation={[0.35, 0, 0.25]}>
      <mesh rotation={[0, frame * 0.008, 0]}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial color={theme.accent} roughness={0.7} metalness={0.1} emissive={theme.bg2} emissiveIntensity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.0, 2.9, 128]} />
        <meshBasicMaterial color={theme.accent2} side={THREE.DoubleSide} transparent opacity={0.55} />
      </mesh>
      <mesh position={[Math.cos(a) * 3.6, Math.sin(a) * 0.6, Math.sin(a) * 3.6]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={theme.text} roughness={0.9} />
      </mesh>
    </group>
  );
};

const Dna: React.FC<ModelProps> = ({ frame, theme }) => {
  const pairs = 22;
  return (
    <group rotation={[0, frame * 0.025, 0.35]}>
      {Array.from({ length: pairs }, (_, i) => {
        const y = (i - pairs / 2) * 0.24;
        const a = i * 0.5;
        const p1: [number, number, number] = [Math.cos(a) * 1.1, y, Math.sin(a) * 1.1];
        const p2: [number, number, number] = [-p1[0], y, -p1[2]];
        return (
          <group key={i}>
            <mesh position={p1}><sphereGeometry args={[0.13, 16, 16]} /><Metal color={theme.accent} /></mesh>
            <mesh position={p2}><sphereGeometry args={[0.13, 16, 16]} /><Metal color={theme.accent2} /></mesh>
            <mesh position={[0, y, 0]} rotation={[0, -a, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 2.2, 8]} />
              <meshStandardMaterial color={theme.text} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Crystal: React.FC<ModelProps> = ({ frame, theme }) => (
  <group rotation={[frame * 0.008, frame * 0.015, 0]} position={[0, Math.sin(frame / 25) * 0.15, 0]}>
    <mesh>
      <icosahedronGeometry args={[1.6, 0]} />
      <meshStandardMaterial color={theme.accent} flatShading metalness={0.3} roughness={0.15} transparent opacity={0.85} />
    </mesh>
    <mesh scale={1.25}>
      <icosahedronGeometry args={[1.6, 1]} />
      <meshBasicMaterial color={theme.accent2} wireframe transparent opacity={0.35} />
    </mesh>
  </group>
);

const Network: React.FC<ModelProps> = ({ frame, theme }) => {
  const { nodes, lines } = useMemo(() => {
    const n = 28;
    const nodes = Array.from({ length: n }, (_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963; // golden angle
      return new THREE.Vector3(Math.cos(th) * r * 2.2, y * 2.2, Math.sin(th) * r * 2.2);
    });
    const pts: number[] = [];
    nodes.forEach((a, i) => nodes.forEach((b, j) => {
      if (j > i && a.distanceTo(b) < 1.5) pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }));
    const lines = new THREE.BufferGeometry();
    lines.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return { nodes, lines };
  }, []);
  return (
    <group rotation={[0.2, frame * 0.012, 0]}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={theme.accent} transparent opacity={0.55} />
      </lineSegments>
      {nodes.map((p, i) => {
        const pulse = 1 + 0.4 * Math.max(0, Math.sin(frame / 8 - i));
        return (
          <mesh key={i} position={p} scale={pulse}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color={i % 4 ? theme.text : theme.accent2} />
          </mesh>
        );
      })}
    </group>
  );
};

const Cube: React.FC<ModelProps> = ({ frame, theme }) => {
  const { fps } = useVideoConfig();
  return (
    <group rotation={[0.5 + frame * 0.004, frame * 0.012, 0]}>
      {[-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => {
        const i = (x + 1) * 9 + (y + 1) * 3 + (z + 1);
        const s = spring({ frame: frame - 6 - i * 1.2, fps, config: { damping: 14 } });
        const spread = 1 + (1 - s) * 3;
        return (
          <mesh key={i} position={[x * 0.85 * spread, y * 0.85 * spread, z * 0.85 * spread]} scale={0.78 * s}>
            <boxGeometry args={[1, 1, 1]} />
            <Metal color={(x + y + z) % 2 ? theme.accent : theme.accent2} emissive={0.1} />
          </mesh>
        );
      })))}
    </group>
  );
};

const MODELS = { atom: Atom, planet: Planet, dna: Dna, crystal: Crystal, network: Network, cube: Cube };

const Label: React.FC<{ text: string; at: number; side: "left" | "right"; row: number; theme: Theme }> = ({ text, at, side, row, theme }) => {
  const rise = useRise(at, 0);
  const frame = useCurrentFrame();
  const line = interpolate(frame - at, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute", top: 330 + row * 190, [side]: 120, display: "flex", alignItems: "center",
        flexDirection: side === "left" ? "row" : "row-reverse", gap: 18, opacity: rise.opacity,
      }}
    >
      <div style={{ padding: "16px 26px", borderRadius: 16, background: "rgba(0,0,0,0.55)", border: `2px solid ${theme.accent}`, fontSize: 38, fontWeight: 700, color: theme.text }}>
        {text}
      </div>
      <div style={{ width: 160 * line, height: 3, background: theme.accent }} />
      <div style={{ width: 14, height: 14, borderRadius: 7, background: theme.accent, opacity: line }} />
    </div>
  );
};

export const Object3DScene: React.FC<SceneProps<"object3d">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const Model = MODELS[visual.model] ?? Crystal;
  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const camZ = interpolate(frame, [0, 300], [9, 7.6], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width, height }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, camZ], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 5]} intensity={1.6} />
        <pointLight position={[-4, -2, 3]} intensity={30} color={theme.accent2} />
        <pointLight position={[4, 2, -3]} intensity={25} color={theme.accent} />
        <group scale={intro} rotation={[0, (1 - intro) * -2, 0]}>
          <Model frame={frame} theme={theme} />
        </group>
      </ThreeCanvas>
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 900, color: theme.text, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        {visual.heading}
      </div>
      {visual.labels.slice(0, 4).map((l, i) => (
        <Label key={i} text={l.text} at={reveals[i] ?? 0} side={i % 2 ? "right" : "left"} row={Math.floor(i / 2)} theme={theme} />
      ))}
    </div>
  );
};
