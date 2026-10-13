import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { useRise } from "../anim";
import { useWebGL } from "../components/webgl";
import { DISPLAY_FONT } from "../fonts";
import { emboss, type Theme } from "../theme";
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


const Glass: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 0.35 }) => (
  <meshPhysicalMaterial color={color} transparent opacity={opacity} roughness={0.05} metalness={0} clearcoat={1} />
);

/** Lightbulb: glass bulb, screw base and a glowing filament that flickers on. */
const Lightbulb: React.FC<ModelProps> = ({ frame, theme }) => {
  const on = interpolate(frame, [10, 14, 16, 19, 24], [0, 1, 0.3, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <group rotation={[0.1, Math.sin(frame / 60) * 0.5, 0.15]} position={[0, 0.3, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[1.25, 64, 64]} />
        <Glass color="#ffffff" opacity={0.18 + 0.12 * on} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.55 + 0.25 * on, 32, 32]} />
        <meshBasicMaterial color={theme.accent} transparent opacity={0.25 * on} />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusKnotGeometry args={[0.22, 0.03, 96, 8, 2, 7]} />
        <meshBasicMaterial color={on > 0.5 ? "#fff3c4" : "#555"} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, -0.75 - i * 0.16, 0]}>
          <torusGeometry args={[0.5 - i * 0.02, 0.06, 12, 48]} />
          <Metal color="#b9b9b9" emissive={0.02} />
        </mesh>
      ))}
      <mesh position={[0, -1.65, 0]}>
        <coneGeometry args={[0.32, 0.3, 32]} />
        <Metal color="#333" emissive={0} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} intensity={40 * on} color="#ffd88a" distance={8} />
    </group>
  );
};

const Gear: React.FC<{ teeth: number; r: number; color: string }> = ({ teeth, r, color }) => (
  <group>
    <mesh>
      <cylinderGeometry args={[r, r, 0.35, 48]} />
      <Metal color={color} emissive={0.05} />
    </mesh>
    <mesh>
      <cylinderGeometry args={[r * 0.35, r * 0.35, 0.4, 32]} />
      <meshStandardMaterial color="#111" metalness={0.9} roughness={0.3} />
    </mesh>
    {Array.from({ length: teeth }, (_, i) => {
      const a = (i / teeth) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(a) * (r + 0.12), 0, Math.sin(a) * (r + 0.12)]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.26, 0.35, 0.2]} />
          <Metal color={color} emissive={0.05} />
        </mesh>
      );
    })}
  </group>
);

/** Three meshing gears turning against each other. */
const Gears: React.FC<ModelProps> = ({ frame, theme }) => {
  const a = frame * 0.03;
  return (
    <group rotation={[Math.PI / 2 - 0.5, 0.2, 0]}>
      <group position={[-0.9, 0, 0]} rotation={[0, a, 0]}><Gear teeth={14} r={1.2} color={theme.accent} /></group>
      <group position={[1.05, 0, 0.55]} rotation={[0, -a * 1.75 + 0.1, 0]}><Gear teeth={8} r={0.68} color={theme.accent2} /></group>
      <group position={[0.55, 0, -1.4]} rotation={[0, -a * 1.4, 0]}><Gear teeth={10} r={0.85} color="#c9c9c9" /></group>
    </group>
  );
};

/** Rocket lifting off with a flickering exhaust plume. */
const Rocket: React.FC<ModelProps> = ({ frame, theme }) => {
  const lift = Math.sin(frame / 20) * 0.12;
  return (
    <group rotation={[0, frame * 0.02, -0.35]} position={[0, lift, 0]}>
      <mesh><cylinderGeometry args={[0.45, 0.5, 2.2, 48]} /><Metal color="#e8e8e8" emissive={0.02} /></mesh>
      <mesh position={[0, 1.45, 0]}><coneGeometry args={[0.45, 0.8, 48]} /><Metal color={theme.accent} /></mesh>
      <mesh position={[0, 0.5, 0.42]}><sphereGeometry args={[0.16, 24, 24]} /><Glass color={theme.accent2} opacity={0.8} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, -0.85, Math.sin(a) * 0.5]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.5, 0.7, 0.06]} />
            <Metal color={theme.accent2} />
          </mesh>
        );
      })}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -1.4 - i * 0.35, 0]} rotation={[Math.PI, 0, 0]} scale={1 + 0.15 * Math.sin(frame * 1.7 + i)}>
          <coneGeometry args={[0.35 - i * 0.06, 0.7 + i * 0.2, 24]} />
          <meshBasicMaterial color={i === 0 ? "#fff6cf" : i === 1 ? "#ffb347" : theme.accent2} transparent opacity={0.85 - i * 0.25} />
        </mesh>
      ))}
    </group>
  );
};

/** A stack of spinning gold coins. */
const Coin: React.FC<ModelProps> = ({ frame }) => (
  <group rotation={[0.25, 0, 0]}>
    <group rotation={[Math.PI / 2, 0, frame * 0.05]} position={[0, 0.6, 0]}>
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.18, 64]} />
        <meshStandardMaterial color="#ffc63d" metalness={1} roughness={0.22} emissive="#5a3a00" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.05, 0.05, 12, 64]} />
        <meshStandardMaterial color="#ffe08a" metalness={1} roughness={0.15} />
      </mesh>
    </group>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[1.9, -1.3 + i * 0.2, 0.4]} rotation={[0, i * 0.4, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.18, 48]} />
        <meshStandardMaterial color="#e3a92a" metalness={1} roughness={0.3} />
      </mesh>
    ))}
  </group>
);

/** Tesla coil: a torus on a coiled column throwing random lightning arcs. */
const Lightning: React.FC<ModelProps> = ({ frame, theme }) => {
  const step = Math.floor(frame / 3); // new bolts every 3 frames
  const bolts = useMemo(() => {
    const out: THREE.Line[] = [];
    for (let b = 0; b < 5; b++) {
      const a = THREE.MathUtils.seededRandom(step * 13 + b) * Math.PI * 2;
      const len = 1.6 + THREE.MathUtils.seededRandom(step * 7 + b) * 1.6;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const j = (THREE.MathUtils.seededRandom(step * 31 + b * 11 + k) - 0.5) * 0.45 * Math.sin(t * Math.PI);
        pts.push(new THREE.Vector3(Math.cos(a) * (0.9 + t * len) + j, 1.5 + (THREE.MathUtils.seededRandom(b + step) - 0.5) * t * 2 + j, Math.sin(a) * (0.9 + t * len) + j));
      }
      const mat = new THREE.LineBasicMaterial({ color: b % 2 ? "#ffffff" : theme.accent2 });
      out.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    return out;
  }, [step, theme.accent2]);
  return (
    <group rotation={[0.25, frame * 0.01, 0]} position={[0, -0.4, 0]}>
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.3, 24, 64]} />
        <Metal color="#d0d0d0" emissive={0.05} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 2.6, 32]} />
        <Metal color="#b06a2c" emissive={0.08} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <mesh key={i} position={[0, -1.1 + i * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.36, 0.018, 6, 32]} />
          <meshStandardMaterial color="#e08a3c" metalness={1} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, -1.45, 0]}>
        <cylinderGeometry args={[0.9, 1.05, 0.3, 48]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>
      {bolts.map((l, i) => <primitive key={`${step}-${i}`} object={l} />)}
      <pointLight position={[0, 1.6, 0]} intensity={20 + 30 * THREE.MathUtils.seededRandom(step)} color={theme.accent2} distance={8} />
    </group>
  );
};

/** Microchip with glowing traces. */
const Chip: React.FC<ModelProps> = ({ frame, theme }) => (
  <group rotation={[0.9, frame * 0.012, 0]}>
    <mesh><boxGeometry args={[2.2, 0.25, 2.2]} /><meshStandardMaterial color="#111" metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, 0.14, 0]}><boxGeometry args={[1.2, 0.05, 1.2]} /><Metal color={theme.accent} emissive={0.3 + 0.3 * Math.sin(frame / 10)} /></mesh>
    {Array.from({ length: 32 }, (_, i) => {
      const side = Math.floor(i / 8);
      const k = (i % 8) / 7 - 0.5;
      const pos: [number, number, number] =
        side === 0 ? [k * 1.8, 0, 1.25] : side === 1 ? [k * 1.8, 0, -1.25] : side === 2 ? [1.25, 0, k * 1.8] : [-1.25, 0, k * 1.8];
      return (
        <mesh key={i} position={pos} rotation={[0, side >= 2 ? Math.PI / 2 : 0, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.4]} />
          <meshStandardMaterial color="#d8d8d8" metalness={1} roughness={0.2} />
        </mesh>
      );
    })}
    {Array.from({ length: 6 }, (_, i) => {
      const lit = (Math.floor(frame / 6) + i) % 6 === 0;
      return (
        <mesh key={i} position={[-0.5 + i * 0.2, 0.135, 0.85]}>
          <boxGeometry args={[0.04, 0.01, 0.4]} />
          <meshBasicMaterial color={lit ? "#ffffff" : theme.accent2} />
        </mesh>
      );
    })}
  </group>
);

/** Wireframe earth with latitude/longitude lines and orbiting satellites. */
const Globe: React.FC<ModelProps> = ({ frame, theme }) => (
  <group rotation={[0.4, frame * 0.01, 0.1]}>
    <mesh><sphereGeometry args={[1.6, 64, 64]} /><meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.6} /></mesh>
    <mesh><sphereGeometry args={[1.62, 24, 16]} /><meshBasicMaterial color={theme.accent} wireframe transparent opacity={0.45} /></mesh>
    <mesh scale={1.15}><sphereGeometry args={[1.6, 32, 32]} /><meshBasicMaterial color={theme.accent} transparent opacity={0.06} side={THREE.BackSide} /></mesh>
    {[0, 1, 2].map((i) => {
      const a = frame * (0.03 + i * 0.012) + i * 2;
      return (
        <group key={i} rotation={[i * 0.9, 0, i * 0.5]}>
          <mesh position={[Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3]}>
            <boxGeometry args={[0.16, 0.08, 0.08]} />
            <meshBasicMaterial color={theme.accent2} />
          </mesh>
        </group>
      );
    })}
  </group>
);

const MODELS = {
  atom: Atom, planet: Planet, dna: Dna, crystal: Crystal, network: Network, cube: Cube,
  lightbulb: Lightbulb, gears: Gears, rocket: Rocket, coin: Coin, lightning: Lightning, chip: Chip, globe: Globe,
};

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

/** CSS-3D stand-in used when WebGL is unavailable: glowing core with tilted orbit rings. */
const OrbitalFallback: React.FC<{ frame: number; theme: Theme; scale: number }> = ({ frame, theme, scale }) => (
  <div style={{ position: "absolute", left: "50%", top: "52%", width: 0, height: 0, perspective: 1400, scale: String(scale) }}>
    <div
      style={{
        position: "absolute", width: 220, height: 220, left: -110, top: -110, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #fff, ${theme.accent} 35%, ${theme.bg2} 80%)`,
        boxShadow: `0 0 120px ${theme.accent}`,
      }}
    />
    {[0, 60, 120].map((tilt, i) => (
      <div
        key={i}
        style={{
          position: "absolute", width: 640, height: 640, left: -320, top: -320, borderRadius: "50%",
          border: `3px solid ${i === 1 ? theme.accent2 : theme.accent}`, opacity: 0.7, transformStyle: "preserve-3d",
          transform: `rotateZ(${tilt}deg) rotateX(72deg) rotateZ(${frame * (i % 2 ? -1.6 : 1.6)}deg)`,
        }}
      >
        <div style={{ position: "absolute", left: 300, top: -14, width: 28, height: 28, borderRadius: 14, background: "#fff", boxShadow: `0 0 30px ${theme.accent}` }} />
      </div>
    ))}
  </div>
);

/** Camera on a slow orbit + dolly, re-aimed at the object every frame (deterministic). */
const OrbitCamera: React.FC<{ frame: number; z: number }> = ({ frame, z }) => {
  const camera = useThree((st) => st.camera);
  const a = Math.sin(frame / 110) * 0.55 - 0.25;
  camera.position.set(Math.sin(a) * z, 0.9 + Math.sin(frame / 80) * 0.4, Math.cos(a) * z);
  camera.lookAt(0, 0, 0);
  return null;
};

/** Glossy black floor that catches the coloured light, plus floating dust in 3D. */
const Stage3D: React.FC<{ frame: number; theme: Theme }> = ({ frame, theme }) => {
  const dust = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 260; i++) {
      pts.push((THREE.MathUtils.seededRandom(i * 3 + 1) - 0.5) * 16, (THREE.MathUtils.seededRandom(i * 3 + 2) - 0.5) * 9, (THREE.MathUtils.seededRandom(i * 3 + 3) - 0.5) * 12);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <>
      <mesh position={[0, -2.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, -2.39, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 2.66, 96]} />
        <meshBasicMaterial color={theme.accent} transparent opacity={0.6} />
      </mesh>
      <points geometry={dust} rotation={[0, frame * 0.002, 0]}>
        <pointsMaterial color={theme.text} size={0.035} transparent opacity={0.55} />
      </points>
    </>
  );
};

export const Object3DScene: React.FC<SceneProps<"object3d">> = ({ visual, reveals, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const webgl = useWebGL();
  const Model = MODELS[visual.model] ?? Crystal;
  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  // Dolly in fast on the cut, then creep closer.
  const camZ = interpolate(frame, [0, 20, 300], [12, 9, 7.6], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <div style={{ position: "relative", width, height }}>
      {webgl ? (
        <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, camZ], fov: 45 }}>
          <OrbitCamera frame={frame} z={camZ} />
          <fog attach="fog" args={["#000000", 8, 22]} />
          <ambientLight intensity={0.35} />
          {/* key, two coloured rim lights and a top spot: product-shot lighting */}
          <directionalLight position={[5, 6, 5]} intensity={1.8} />
          <pointLight position={[-4, 1, -3]} intensity={60} color={theme.accent2} />
          <pointLight position={[4, 2, -4]} intensity={55} color={theme.accent} />
          <spotLight position={[0, 8, 2]} angle={0.5} penumbra={0.8} intensity={80} />
          <Stage3D frame={frame} theme={theme} />
          <group scale={intro} rotation={[0, (1 - intro) * -2, 0]}>
            <Model frame={frame} theme={theme} />
          </group>
        </ThreeCanvas>
      ) : (
        <OrbitalFallback frame={frame} theme={theme} scale={intro} />
      )}
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY_FONT, fontSize: 60, fontWeight: 900, color: theme.text, textShadow: emboss(theme) }}>
        {visual.heading}
      </div>
      {visual.labels.slice(0, 4).map((l, i) => (
        <Label key={i} text={l.text} at={reveals[i] ?? 0} side={i % 2 ? "right" : "left"} row={Math.floor(i / 2)} theme={theme} />
      ))}
    </div>
  );
};
