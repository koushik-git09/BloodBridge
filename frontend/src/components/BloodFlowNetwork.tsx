interface Props {
  variant?: 'hero' | 'compact';
  requestStatus?: string;
}

export default function BloodFlowNetwork({ variant = 'hero', requestStatus }: Props) {
  const isHero = variant === 'hero';
  const w = isHero ? 700 : 420;
  const h = isHero ? 480 : 300;

  const cx = w / 2;
  const cy = h / 2;

  const hospitalNode = { x: cx, y: isHero ? 60 : 40 };
  const requestNode = { x: cx, y: isHero ? 180 : 115 };
  const bb1 = { x: cx - (isHero ? 180 : 110), y: isHero ? 300 : 185 };
  const bb2 = { x: cx - (isHero ? 80 : 48), y: isHero ? 340 : 215 };
  const bb3 = { x: cx + (isHero ? 80 : 48), y: isHero ? 340 : 215 };
  const d1 = { x: cx + (isHero ? 180 : 110), y: isHero ? 280 : 175 };
  const d2 = { x: cx + (isHero ? 220 : 135), y: isHero ? 350 : 218 };
  const fulfillNode = { x: cx, y: isHero ? 430 : 268 };

  const r = isHero ? 28 : 18;
  const rSmall = isHero ? 18 : 12;

  const pathStyle = {
    strokeDasharray: '8 5',
    strokeDashoffset: 0,
    animation: 'flow-dash 2.5s linear infinite',
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-label="BloodBridge network visualization"
      className={isHero ? 'w-full max-w-2xl' : 'w-full'}
    >
      <defs>
        <radialGradient id="hGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c01832" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c01832" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00bfb3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00bfb3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </radialGradient>
        <filter id="glow-blue">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-teal">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Connection lines — hospital to request */}
      <line
        x1={hospitalNode.x} y1={hospitalNode.y + r}
        x2={requestNode.x} y2={requestNode.y - r}
        stroke="#3b82f6" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.5}
        {...pathStyle}
      />

      {/* Request to blood banks */}
      <line x1={requestNode.x} y1={requestNode.y + r} x2={bb1.x} y2={bb1.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.4} {...pathStyle} style={{ ...pathStyle, animationDelay: '0.6s' }} />
      <line x1={requestNode.x} y1={requestNode.y + r} x2={bb2.x} y2={bb2.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.4} {...pathStyle} style={{ ...pathStyle, animationDelay: '0.3s' }} />
      <line x1={requestNode.x} y1={requestNode.y + r} x2={bb3.x} y2={bb3.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.4} {...pathStyle} style={{ ...pathStyle, animationDelay: '0.9s' }} />

      {/* Request to donors */}
      <line x1={requestNode.x} y1={requestNode.y + r} x2={d1.x} y2={d1.y - rSmall} stroke="#818cf8" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.4} {...pathStyle} style={{ ...pathStyle, animationDelay: '1.2s' }} />
      <line x1={requestNode.x} y1={requestNode.y + r} x2={d2.x} y2={d2.y - rSmall} stroke="#818cf8" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.4} {...pathStyle} style={{ ...pathStyle, animationDelay: '1.5s' }} />

      {/* Blood banks to fulfillment */}
      <line x1={bb1.x} y1={bb1.y + rSmall} x2={fulfillNode.x} y2={fulfillNode.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.35} {...pathStyle} style={{ ...pathStyle, animationDelay: '2s' }} />
      <line x1={bb2.x} y1={bb2.y + rSmall} x2={fulfillNode.x} y2={fulfillNode.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.35} {...pathStyle} style={{ ...pathStyle, animationDelay: '1.8s' }} />
      <line x1={bb3.x} y1={bb3.y + rSmall} x2={fulfillNode.x} y2={fulfillNode.y - rSmall} stroke="#00bfb3" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.35} {...pathStyle} style={{ ...pathStyle, animationDelay: '2.2s' }} />

      {/* Donors to fulfillment */}
      <line x1={d1.x} y1={d1.y + rSmall} x2={fulfillNode.x} y2={fulfillNode.y - rSmall} stroke="#818cf8" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.35} {...pathStyle} style={{ ...pathStyle, animationDelay: '2.4s' }} />
      <line x1={d2.x} y1={d2.y + rSmall} x2={fulfillNode.x} y2={fulfillNode.y - rSmall} stroke="#818cf8" strokeWidth={isHero ? 1.5 : 1} strokeOpacity={0.35} {...pathStyle} style={{ ...pathStyle, animationDelay: '2.6s' }} />

      {/* Glow halos */}
      <circle cx={hospitalNode.x} cy={hospitalNode.y} r={r * 2} fill="url(#hGrad)" />
      <circle cx={requestNode.x} cy={requestNode.y} r={r * 2.5} fill="url(#rGrad)" />
      <circle cx={fulfillNode.x} cy={fulfillNode.y} r={r * 2} fill="url(#bGrad)" />

      {/* Hospital node */}
      <circle cx={hospitalNode.x} cy={hospitalNode.y} r={r} fill="#ffffff" stroke="#3b82f6" strokeWidth={2} filter="url(#glow-blue)" style={{ animation: 'node-breathe 3s ease-in-out infinite' }} />
      <text x={hospitalNode.x} y={hospitalNode.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 14 : 9} fill="#38bdf8">🏥</text>

      {/* Blood request node (central) */}
      <circle cx={requestNode.x} cy={requestNode.y} r={r + 4} fill="#ffffff" stroke="#c01832" strokeWidth={2.5} filter="url(#glow-red)" style={{ animation: 'node-breathe 2s ease-in-out infinite' }} />
      <text x={requestNode.x} y={requestNode.y - 6} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 9 : 6} fill="#e53e5a" fontFamily="Space Mono, monospace" fontWeight="bold">O+</text>
      <text x={requestNode.x} y={requestNode.y + 6} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 8 : 5} fill="#94a3b8" fontFamily="Space Mono, monospace">5 units</text>

      {/* Blood bank nodes */}
      {[bb1, bb2, bb3].map((pos, i) => (
        <g key={i} style={{ animation: `node-breathe ${3 + i * 0.5}s ease-in-out infinite` }}>
          <circle cx={pos.x} cy={pos.y} r={rSmall} fill="#ffffff" stroke="#00bfb3" strokeWidth={1.5} filter="url(#glow-teal)" />
          <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 10 : 7} fill="#2dd4bf">🏦</text>
        </g>
      ))}

      {/* Donor nodes */}
      {[d1, d2].map((pos, i) => (
        <g key={i} style={{ animation: `node-breathe ${3.5 + i * 0.4}s ease-in-out infinite` }}>
          <circle cx={pos.x} cy={pos.y} r={rSmall} fill="#ffffff" stroke="#818cf8" strokeWidth={1.5} />
          <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 10 : 7} fill="#818cf8">🩸</text>
        </g>
      ))}

      {/* Fulfillment node */}
      <circle cx={fulfillNode.x} cy={fulfillNode.y} r={rSmall + 2} fill="#ffffff" stroke="#10b981" strokeWidth={2} filter="url(#glow-teal)" style={{ animation: 'node-breathe 2.5s ease-in-out infinite' }} />
      <text x={fulfillNode.x} y={fulfillNode.y} textAnchor="middle" dominantBaseline="middle" fontSize={isHero ? 10 : 7} fill="#10b981">✓</text>

      {/* Labels (hero only) */}
      {isHero && (
        <>
          <text x={hospitalNode.x} y={hospitalNode.y - r - 10} textAnchor="middle" fontSize={10} fill="#5a7499" fontFamily="Space Mono, monospace" fontWeight="bold" letterSpacing="2">HOSPITAL</text>
          <text x={requestNode.x + r + 16} y={requestNode.y} textAnchor="start" fontSize={10} fill="#5a7499" fontFamily="Space Mono, monospace" fontWeight="bold" letterSpacing="2">REQUEST</text>
          <text x={bb1.x} y={bb1.y + rSmall + 16} textAnchor="middle" fontSize={9} fill="#5a7499" fontFamily="Space Mono, monospace" letterSpacing="1">BLOOD BANKS</text>
          <text x={d2.x + 10} y={d2.y} textAnchor="start" fontSize={9} fill="#5a7499" fontFamily="Space Mono, monospace" letterSpacing="1">DONORS</text>
          <text x={fulfillNode.x} y={fulfillNode.y + rSmall + 18} textAnchor="middle" fontSize={10} fill="#5a7499" fontFamily="Space Mono, monospace" fontWeight="bold" letterSpacing="2">FULFILLMENT</text>
        </>
      )}
    </svg>
  );
}
