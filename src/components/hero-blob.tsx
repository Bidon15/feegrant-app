"use client";

import { useMemo, useEffect, useState } from 'react';

const HeroBlob = () => {
  const [bodyScale, setBodyScale] = useState<number[]>([1, 1, 1, 1, 1, 1, 1]);

  // Generate organic branching vein paths flowing TOWARD bodies
  const veins = useMemo(() => {
    const generateBranch = (
      startX: number,
      startY: number,
      angle: number,
      length: number,
      depth: number
    ): string[] => {
      if (depth > 5 || length < 2) return [];

      const paths: string[] = [];
      const curve = (Math.random() - 0.5) * 0.4;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      const ctrlX = startX + Math.cos(angle + curve) * length * 0.6;
      const ctrlY = startY + Math.sin(angle + curve) * length * 0.6;

      // Path goes FROM outer point TO body (reversed for flow direction)
      paths.push(`M ${endX} ${endY} Q ${ctrlX} ${ctrlY} ${startX} ${startY}`);

      if (depth < 5) {
        const branchCount = depth < 2 ? 3 : depth < 4 ? 2 : 1;
        for (let i = 0; i < branchCount; i++) {
          const spread = depth < 2 ? 0.8 : 0.6;
          const branchAngle = angle + (Math.random() - 0.5) * spread;
          const branchLength = length * (0.55 + Math.random() * 0.25);
          paths.push(...generateBranch(endX, endY, branchAngle, branchLength, depth + 1));
        }
      }

      return paths;
    };

    const allVeins: { path: string; width: number; opacity: number; length: number }[] = [];

    const trunks = [
      { x: 72, y: 45, angles: [Math.PI * 0.85, Math.PI, Math.PI * 1.15], baseLength: 28 },
      { x: 75, y: 55, angles: [Math.PI * 0.9, Math.PI * 1.1], baseLength: 25 },
      { x: 78, y: 35, angles: [Math.PI * 0.7, Math.PI * 0.5], baseLength: 20 },
      { x: 70, y: 65, angles: [Math.PI * 1.2, Math.PI * 1.4], baseLength: 18 },
      { x: 65, y: 40, angles: [Math.PI * 0.8, Math.PI * 0.95, Math.PI * 1.1], baseLength: 22 },
      { x: 68, y: 58, angles: [Math.PI * 1.0, Math.PI * 1.15], baseLength: 20 },
      { x: 85, y: 30, angles: [-Math.PI * 0.3, -Math.PI * 0.1, 0.2], baseLength: 15 },
      { x: 82, y: 70, angles: [Math.PI * 0.4, Math.PI * 0.55], baseLength: 14 },
    ];

    trunks.forEach(trunk => {
      trunk.angles.forEach(angle => {
        const branches = generateBranch(trunk.x, trunk.y, angle, trunk.baseLength, 0);
        branches.forEach((path, i) => {
          allVeins.push({
            path,
            width: Math.max(0.15, 1.8 - i * 0.08),
            opacity: Math.max(0.15, 0.75 - i * 0.03),
            length: 50 + Math.random() * 30,
          });
        });
      });
    });

    return allVeins;
  }, []);

  // Animate body pulsation
  useEffect(() => {
    const interval = setInterval(() => {
      setBodyScale(prev => prev.map((_, i) => {
        const time = Date.now() / 1000;
        const phase = i * 0.8;
        return 0.95 + Math.sin(time * 0.8 + phase) * 0.08;
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Generate wavy organic edge for body
  const generateOrganicBody = (cx: number, cy: number, baseSize: number, wobble = 3) => {
    const points: [number, number][] = [];
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const angle = (Math.PI * 2 * i) / segments;
      const noise = Math.sin(i * 1.5) * wobble + Math.cos(i * 2.3) * (wobble * 0.5);
      const radius = baseSize + noise;
      points.push([
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      ]);
    }

    let path = `M ${points[0]![0]} ${points[0]![1]}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;
      const cpX = (prev[0] + curr[0]) / 2;
      const cpY = (prev[1] + curr[1]) / 2;
      path += ` Q ${prev[0]} ${prev[1]} ${cpX} ${cpY}`;
    }
    path += ' Z';

    return path;
  };

  const bodies = useMemo(() => [
    { cx: 75, cy: 48, size: 12, wobble: 2.5 },
    { cx: 82, cy: 42, size: 9, wobble: 2 },
    { cx: 80, cy: 56, size: 8, wobble: 1.8 },
    { cx: 70, cy: 40, size: 7, wobble: 1.5 },
    { cx: 72, cy: 58, size: 6, wobble: 1.5 },
    { cx: 88, cy: 50, size: 5, wobble: 1.2 },
    { cx: 85, cy: 35, size: 5, wobble: 1.2 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute right-0 top-1/4 w-2/3 h-2/3 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent blur-3xl" />

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="bodyGradient" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(48 85% 70%)" stopOpacity="0.95" />
            <stop offset="50%" stopColor="hsl(45 80% 55%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(40 70% 45%)" stopOpacity="0.7" />
          </radialGradient>

          <linearGradient id="streamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(45 85% 60%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(48 90% 65%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(50 95% 70%)" stopOpacity="1" />
          </linearGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="streamGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softEdge">
            <feGaussianBlur stdDeviation="0.3" />
          </filter>
        </defs>

        <style>{`
          @keyframes flowToBody {
            0% {
              stroke-dashoffset: 60;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
          .flowing-stream {
            animation: flowToBody var(--duration) linear infinite;
          }
        `}</style>

        {/* Background static vein network */}
        <g opacity="0.15">
          {veins.slice(0, 50).map((vein, i) => (
            <path
              key={`bg-${i}`}
              d={vein.path}
              stroke="hsl(45 70% 55%)"
              strokeWidth={vein.width * 0.3}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Main vein structure (static base) */}
        <g opacity="0.4">
          {veins.map((vein, i) => (
            <path
              key={`base-${i}`}
              d={vein.path}
              stroke="hsl(42 60% 45%)"
              strokeWidth={vein.width * 0.6}
              fill="none"
              strokeLinecap="round"
              opacity={vein.opacity * 0.5}
            />
          ))}
        </g>

        {/* Animated flowing streams toward bodies */}
        <g filter="url(#streamGlow)">
          {veins.map((vein, i) => (
            <path
              key={`stream-${i}`}
              d={vein.path}
              stroke="hsl(48 90% 65%)"
              strokeWidth={vein.width * 0.8}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="8 20"
              opacity={vein.opacity}
              className="flowing-stream"
              style={{
                ['--duration' as string]: `${1.5 + (i % 5) * 0.3}s`,
                animationDelay: `${(i * 0.05) % 1.5}s`,
              }}
            />
          ))}
        </g>

        {/* Brighter stream highlights */}
        <g filter="url(#streamGlow)">
          {veins.slice(0, 80).map((vein, i) => (
            <path
              key={`highlight-${i}`}
              d={vein.path}
              stroke="hsl(50 95% 75%)"
              strokeWidth={vein.width * 0.4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="3 35"
              opacity={vein.opacity * 0.8}
              className="flowing-stream"
              style={{
                ['--duration' as string]: `${1.2 + (i % 4) * 0.25}s`,
                animationDelay: `${(i * 0.08) % 1.2}s`,
              }}
            />
          ))}
        </g>

        {/* Connecting tissue */}
        <g opacity="0.5" filter="url(#softEdge)">
          <ellipse cx="77" cy="48" rx="14" ry="10" fill="url(#bodyGradient)" opacity="0.4" />
          <ellipse cx="76" cy="52" rx="12" ry="8" fill="url(#bodyGradient)" opacity="0.3" />
        </g>

        {/* Pulsating organic bodies */}
        {bodies.map((body, i) => {
          const scale = bodyScale[i] ?? 1;
          return (
            <g key={i} style={{ transformOrigin: `${body.cx}px ${body.cy}px`, transform: `scale(${scale})` }}>
              <path
                d={generateOrganicBody(body.cx, body.cy, body.size, body.wobble)}
                fill="url(#bodyGradient)"
                filter="url(#glow)"
              />
              <path
                d={generateOrganicBody(body.cx - body.size * 0.15, body.cy - body.size * 0.15, body.size * 0.5, body.wobble * 0.4)}
                fill="hsl(50 90% 80%)"
                opacity="0.3"
              />
            </g>
          );
        })}

        {/* Scattered spore particles */}
        {[
          { x: 12, y: 25 }, { x: 22, y: 55 }, { x: 8, y: 72 },
          { x: 35, y: 18 }, { x: 42, y: 78 }, { x: 55, y: 28 },
          { x: 48, y: 68 }, { x: 30, y: 42 }, { x: 18, y: 85 },
        ].map((pos, i) => (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={0.4 + Math.random() * 0.4}
            fill="hsl(45 80% 60%)"
            opacity={0.15 + Math.random() * 0.15}
          />
        ))}
      </svg>
    </div>
  );
};

export default HeroBlob;
