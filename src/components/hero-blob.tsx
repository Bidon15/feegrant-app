"use client";

import { useMemo, useEffect, useState } from 'react';

interface Spore {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  segments: SporeSegment[];
}

interface SporeSegment {
  path: string;
  opacity: number;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
}

const HeroBlob = () => {
  const [time, setTime] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Animate
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now() / 1000);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Generate a single fan/spore segment path
  const generateFanSegment = (
    cx: number,
    cy: number,
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number,
    waviness: number = 0
  ): string => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Inner arc points
    const innerStart = {
      x: cx + Math.cos(startRad) * innerRadius,
      y: cy + Math.sin(startRad) * innerRadius,
    };
    const innerEnd = {
      x: cx + Math.cos(endRad) * innerRadius,
      y: cy + Math.sin(endRad) * innerRadius,
    };

    // Outer arc with organic waviness
    const outerPoints: { x: number; y: number }[] = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startRad + (endRad - startRad) * t;
      const wave = Math.sin(t * Math.PI * 3 + waviness) * 2;
      const r = outerRadius + wave;
      outerPoints.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    // Build path
    let path = `M ${innerStart.x} ${innerStart.y}`;

    // Line to first outer point
    path += ` L ${outerPoints[0]!.x} ${outerPoints[0]!.y}`;

    // Curved outer edge
    for (let i = 1; i < outerPoints.length; i++) {
      const prev = outerPoints[i - 1]!;
      const curr = outerPoints[i]!;
      const cpX = (prev.x + curr.x) / 2;
      const cpY = (prev.y + curr.y) / 2 - 1;
      path += ` Q ${cpX} ${cpY} ${curr.x} ${curr.y}`;
    }

    // Line to inner end
    path += ` L ${innerEnd.x} ${innerEnd.y}`;

    // Arc back along inner radius (simplified as line for small inner radius)
    path += ` L ${innerStart.x} ${innerStart.y}`;
    path += ' Z';

    return path;
  };

  // Generate multiple spores/mushrooms
  const spores = useMemo<Spore[]>(() => {
    const sporeConfigs = [
      // Main large spore - right side
      { x: 72, y: 45, size: 1.0, baseAngle: 180, fanCount: 7, spread: 140 },
      // Medium spore - upper right
      { x: 82, y: 25, size: 0.6, baseAngle: 200, fanCount: 5, spread: 100 },
      // Medium spore - lower right
      { x: 78, y: 72, size: 0.55, baseAngle: 160, fanCount: 5, spread: 100 },
      // Small spore - far right
      { x: 92, y: 50, size: 0.4, baseAngle: 180, fanCount: 4, spread: 80 },
      // Small accent spores
      { x: 60, y: 30, size: 0.35, baseAngle: 220, fanCount: 4, spread: 70 },
      { x: 55, y: 65, size: 0.3, baseAngle: 140, fanCount: 3, spread: 60 },
    ];

    return sporeConfigs.map((config, idx) => {
      const segments: SporeSegment[] = [];
      const fanAngle = config.spread / config.fanCount;
      const startAngle = config.baseAngle - config.spread / 2;

      for (let i = 0; i < config.fanCount; i++) {
        const segStart = startAngle + i * fanAngle;
        const segEnd = segStart + fanAngle - 2; // Small gap between segments
        const innerR = 3 * config.size;
        const outerR = (18 + Math.random() * 8) * config.size;

        segments.push({
          path: generateFanSegment(
            config.x,
            config.y,
            segStart,
            segEnd,
            innerR,
            outerR,
            i * 0.5
          ),
          opacity: 0.4 + Math.random() * 0.3,
          delay: i * 0.15,
        });
      }

      return {
        id: idx,
        x: config.x,
        y: config.y,
        size: config.size,
        angle: config.baseAngle,
        segments,
      };
    });
  }, []);

  // Generate vein/tendril paths connecting spores
  const tendrils = useMemo(() => {
    const paths: { path: string; width: number; delay: number }[] = [];

    // Main tendrils from large spore
    const mainSpore = spores[0]!;

    // Connect to other spores
    spores.slice(1).forEach((spore, i) => {
      const dx = spore.x - mainSpore.x;
      const dy = spore.y - mainSpore.y;
      const midX = mainSpore.x + dx * 0.5 + (Math.random() - 0.5) * 10;
      const midY = mainSpore.y + dy * 0.5 + (Math.random() - 0.5) * 10;

      paths.push({
        path: `M ${mainSpore.x} ${mainSpore.y} Q ${midX} ${midY} ${spore.x} ${spore.y}`,
        width: 0.8 - i * 0.1,
        delay: i * 0.2,
      });
    });

    // Extra organic tendrils spreading outward
    for (let i = 0; i < 8; i++) {
      const angle = ((160 + i * 20) * Math.PI) / 180;
      const length = 25 + Math.random() * 20;
      const startX = mainSpore.x;
      const startY = mainSpore.y;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;
      const midX = startX + Math.cos(angle) * length * 0.6 + (Math.random() - 0.5) * 8;
      const midY = startY + Math.sin(angle) * length * 0.6 + (Math.random() - 0.5) * 8;

      paths.push({
        path: `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`,
        width: 0.4 + Math.random() * 0.3,
        delay: i * 0.1,
      });
    }

    return paths;
  }, [spores]);

  // Initialize floating particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: i,
        x: 50 + Math.random() * 45,
        y: 10 + Math.random() * 80,
        size: 0.3 + Math.random() * 0.5,
        opacity: 0.2 + Math.random() * 0.4,
        speed: 0.02 + Math.random() * 0.03,
        angle: Math.random() * Math.PI * 2,
      });
    }
    setParticles(newParticles);
  }, []);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let newX = p.x + Math.cos(p.angle) * p.speed;
        let newY = p.y + Math.sin(p.angle) * p.speed;

        // Wrap around
        if (newX < 45) newX = 95;
        if (newX > 95) newX = 45;
        if (newY < 5) newY = 95;
        if (newY > 95) newY = 5;

        return { ...p, x: newX, y: newY };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 w-3/4 h-full bg-gradient-to-l from-[hsl(150_85%_50%/0.12)] via-[hsl(150_85%_50%/0.05)] to-transparent" />
        <div className="absolute right-1/4 top-1/4 w-1/2 h-1/2 bg-gradient-radial from-[hsl(150_90%_55%/0.15)] to-transparent blur-3xl" />
        <div className="absolute right-1/3 bottom-1/4 w-1/3 h-1/3 bg-gradient-radial from-[hsl(15_85%_55%/0.1)] to-transparent blur-2xl" />
      </div>

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Spore segment gradient */}
          <radialGradient id="sporeGradient" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="hsl(150 95% 65%)" stopOpacity="0.9" />
            <stop offset="40%" stopColor="hsl(150 85% 50%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(150 70% 35%)" stopOpacity="0.3" />
          </radialGradient>

          {/* Core glow gradient */}
          <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(150 95% 75%)" stopOpacity="1" />
            <stop offset="60%" stopColor="hsl(150 85% 55%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(150 70% 40%)" stopOpacity="0.4" />
          </radialGradient>

          {/* Tendril gradient */}
          <linearGradient id="tendrilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(150 85% 50%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(150 70% 40%)" stopOpacity="0.2" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="sporeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          <filter id="tendrilGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          @keyframes sporePulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(1.02); }
          }
          @keyframes flowPulse {
            0% { stroke-dashoffset: 30; }
            100% { stroke-dashoffset: 0; }
          }
          .spore-segment {
            animation: sporePulse 3s ease-in-out infinite;
          }
          .tendril-flow {
            animation: flowPulse 2s linear infinite;
          }
        `}</style>

        {/* Floating particles */}
        <g opacity="0.6">
          {particles.map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={`hsl(${145 + Math.random() * 20} 80% 60%)`}
              opacity={p.opacity * (0.8 + Math.sin(time * 2 + p.id) * 0.2)}
            />
          ))}
        </g>

        {/* Tendrils/connections */}
        <g filter="url(#tendrilGlow)">
          {tendrils.map((tendril, i) => (
            <g key={`tendril-${i}`}>
              {/* Background tendril */}
              <path
                d={tendril.path}
                stroke="hsl(150 60% 30%)"
                strokeWidth={tendril.width * 2}
                fill="none"
                strokeLinecap="round"
                opacity="0.3"
              />
              {/* Animated flow */}
              <path
                d={tendril.path}
                stroke="hsl(150 85% 50%)"
                strokeWidth={tendril.width}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="4 8"
                className="tendril-flow"
                style={{
                  animationDelay: `${tendril.delay}s`,
                  animationDuration: `${1.5 + tendril.delay}s`,
                }}
                opacity="0.7"
              />
            </g>
          ))}
        </g>

        {/* Spore clusters */}
        {spores.map((spore) => (
          <g key={`spore-${spore.id}`} filter="url(#sporeGlow)">
            {/* Outer glow */}
            <circle
              cx={spore.x}
              cy={spore.y}
              r={25 * spore.size}
              fill="hsl(150 85% 50%)"
              opacity={0.1 + Math.sin(time * 1.5 + spore.id) * 0.05}
              filter="url(#softGlow)"
            />

            {/* Fan segments */}
            {spore.segments.map((segment, i) => (
              <path
                key={`segment-${spore.id}-${i}`}
                d={segment.path}
                fill="url(#sporeGradient)"
                className="spore-segment"
                style={{
                  animationDelay: `${segment.delay + spore.id * 0.3}s`,
                  opacity: segment.opacity * (0.8 + Math.sin(time * 2 + i + spore.id) * 0.2),
                }}
              />
            ))}

            {/* Segment outlines for definition */}
            {spore.segments.map((segment, i) => (
              <path
                key={`outline-${spore.id}-${i}`}
                d={segment.path}
                fill="none"
                stroke="hsl(150 90% 70%)"
                strokeWidth={0.3 * spore.size}
                opacity={0.4 + Math.sin(time * 2 + i) * 0.2}
              />
            ))}

            {/* Core center */}
            <circle
              cx={spore.x}
              cy={spore.y}
              r={4 * spore.size}
              fill="url(#coreGradient)"
            />

            {/* Core highlight */}
            <circle
              cx={spore.x - 1 * spore.size}
              cy={spore.y - 1 * spore.size}
              r={1.5 * spore.size}
              fill="hsl(150 95% 85%)"
              opacity={0.7}
            />
          </g>
        ))}

        {/* Coral/orange accent highlights on main spore */}
        <g opacity="0.5">
          {spores[0]?.segments.slice(0, 3).map((segment, i) => (
            <path
              key={`accent-${i}`}
              d={segment.path}
              fill="none"
              stroke="hsl(15 85% 55%)"
              strokeWidth="0.5"
              strokeDasharray="2 6"
              className="tendril-flow"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(150 85% 50%) 1px, transparent 1px),
            linear-gradient(90deg, hsl(150 85% 50%) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

export default HeroBlob;
