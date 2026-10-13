import { geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useMemo } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { DISPLAY_FONT } from "../fonts";
import type { Theme } from "../theme";
import type { SceneProps } from "./types";

// Offline world map (Natural Earth 1:110m via world-atlas), drawn with d3-geo.
const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const COUNTRIES = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;

const ALIASES: Record<string, string> = {
  usa: "united states of america", us: "united states of america", "united states": "united states of america",
  america: "united states of america", uk: "united kingdom", britain: "united kingdom", "great britain": "united kingdom",
  england: "united kingdom", russia: "russia", "south korea": "south korea", korea: "south korea",
  "north korea": "north korea", drc: "dem. rep. congo", "democratic republic of the congo": "dem. rep. congo",
  "czech republic": "czechia", uae: "united arab emirates", "ivory coast": "côte d'ivoire",
};
const norm = (s: string) => s.trim().toLowerCase();
const canonical = (s: string) => ALIASES[norm(s)] ?? norm(s);

const W = 1920;
const H = 1080;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Pt = { label: string; lat: number; lon: number };

type View = { projection: GeoProjection; toScreen: (xy: [number, number]) => [number, number]; transform: string; k: number };

function useView(style: "globe" | "flat", points: Pt[], frame: number, duration: number): View {
  const t = interpolate(frame, [0, Math.min(duration * 0.45, 90)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lon = points.length ? points.reduce((s, p) => s + p.lon, 0) / points.length : 0;
  const lat = points.length ? points.reduce((s, p) => s + p.lat, 0) / points.length : 20;
  if (style === "globe") {
    // Spin in from 100 degrees away, then keep a slow drift.
    const rotLon = -(lon + 100 * (1 - t)) - frame * 0.04;
    const rotLat = -(lat * t + 10 * (1 - t));
    const projection = geoOrthographic().scale(350 + 30 * t).translate([W / 2, H / 2 + 70]).rotate([rotLon, rotLat]).clipAngle(90);
    return { projection, toScreen: (xy) => xy, transform: "", k: 1 };
  }
  // Flat: draw the whole world once, then move a virtual camera (zoom + pan) onto the points.
  const projection = geoNaturalEarth1().fitExtent([[60, 120], [W - 60, H - 60]], { type: "Sphere" });
  const xy = points.map((p) => projection([p.lon, p.lat]) ?? [W / 2, H / 2]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const fx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : W / 2;
  const fy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : H / 2;
  const bw = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  const bh = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  const kTarget = bw + bh < 1 ? 3.2 : Math.max(1, Math.min((W - 720) / Math.max(bw, 1), (H - 480) / Math.max(bh, 1), 6));
  const k = 1 + (kTarget - 1) * t;
  const cx = W / 2 + (fx - W / 2) * t;
  const cy = H / 2 + (fy - H / 2) * t;
  return {
    projection,
    k,
    toScreen: ([x, y]) => [(x - cx) * k + W / 2, (y - cy) * k + H / 2],
    transform: `translate(${W / 2} ${H / 2}) scale(${k}) translate(${-cx} ${-cy})`,
  };
}

const Pin: React.FC<{ x: number; y: number; label: string; at: number; theme: Theme; hidden: boolean }> = ({ x, y, label, at, theme, hidden }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 160 } });
  const ring = interpolate(frame - at, [0, 30], [0, 1], clamp);
  if (frame < at || hidden) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={10 + ring * 60} fill="none" stroke={theme.accent} strokeWidth={3} opacity={(1 - ring) * 0.9} />
      <circle r={12 * p} fill={theme.accent2} stroke="#fff" strokeWidth={3} />
      <g transform={`translate(0,${-28 - 20 * p})`} opacity={p}>
        <rect x={-(label.length * 13 + 30) / 2} y={-34} width={label.length * 13 + 30} height={46} rx={12} fill="rgba(0,0,0,0.65)" />
        <text textAnchor="middle" y={-3} fontSize={26} fontWeight={700} fill={theme.text} fontFamily={DISPLAY_FONT}>{label}</text>
      </g>
    </g>
  );
};

export const MapScene: React.FC<SceneProps<"map">> = ({ visual, reveals, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const points = visual.points.slice(0, 6);
  const { projection, toScreen, transform } = useView(visual.style, points, frame, durationInFrames);
  const path = geoPath(projection);
  const highlighted = useMemo(() => new Set(visual.highlight.map(canonical)), [visual.highlight]);
  const center = projection.invert?.([W / 2, H / 2 + 70]) ?? [0, 0];
  const isGlobe = visual.style === "globe";
  const byLabel = new Map(points.map((p, i) => [norm(p.label), { ...p, at: reveals[i] ?? 0 }]));
  const fill = interpolate(frame, [10, 40], [0, 1], clamp);

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="ocean" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor={theme.bg2} />
            <stop offset="100%" stopColor={theme.bg1} />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="18" /></filter>
        </defs>
        {isGlobe ? (
          <>
            <path d={path({ type: "Sphere" }) ?? ""} fill={theme.accent} opacity={0.35} filter="url(#glow)" />
            <path d={path({ type: "Sphere" }) ?? ""} fill="url(#ocean)" stroke={theme.accent} strokeWidth={2} />
          </>
        ) : null}
        <g transform={transform}>
        <path d={path(geoGraticule10()) ?? ""} fill="none" stroke={theme.text} strokeOpacity={0.08} vectorEffect="non-scaling-stroke" />
        {COUNTRIES.features.map((f: Feature<Geometry, { name: string }>, i) => {
          const on = highlighted.has(norm(f.properties.name));
          return (
            <path
              key={i}
              d={path(f) ?? ""}
              fill={on ? theme.accent2 : theme.text}
              fillOpacity={on ? 0.35 + 0.55 * fill : 0.1}
              stroke={on ? theme.accent2 : theme.text}
              strokeOpacity={on ? 0.9 : 0.25}
              strokeWidth={on ? 2 : 0.7}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {visual.routes.map((r, i) => {
          const a = byLabel.get(norm(r.from));
          const b = byLabel.get(norm(r.to));
          if (!a || !b) return null;
          const start = Math.max(a.at, b.at);
          const p = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
          if (p <= 0) return null;
          const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
          const coords = Array.from({ length: 41 }, (_, k) => interp((k / 40) * p));
          return (
            <path key={i} d={path({ type: "LineString", coordinates: coords }) ?? ""} fill="none" stroke={theme.accent} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 12" vectorEffect="non-scaling-stroke" />
          );
        })}
        </g>
        {visual.routes.map((r, i) => {
          const a = byLabel.get(norm(r.from));
          const b = byLabel.get(norm(r.to));
          if (!a || !b) return null;
          const start = Math.max(a.at, b.at);
          const p = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
          if (p <= 0 || p >= 1) return null;
          const head = projection(geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(p));
          if (!head) return null;
          const [hx, hy] = toScreen(head as [number, number]);
          return <circle key={i} cx={hx} cy={hy} r={10} fill="#fff" stroke={theme.accent} strokeWidth={4} />;
        })}
        {points.map((p, i) => {
          const proj = projection([p.lon, p.lat]);
          if (!proj) return null;
          const xy = toScreen(proj as [number, number]);
          const hidden = isGlobe && geoDistance([p.lon, p.lat], center as [number, number]) > Math.PI / 2;
          return <Pin key={i} x={xy[0]} y={xy[1]} label={p.label} at={reveals[i] ?? 0} theme={theme} hidden={hidden} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY_FONT, fontSize: 64, fontWeight: 900, color: theme.text, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        {visual.heading}
      </div>
    </div>
  );
};
