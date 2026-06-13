interface GhostIconProps {
  className?: string;
  size?: number;
  color?: string; // explicit fill color override
}

export function GhostIcon({ className = '', size = 24, color }: GhostIconProps) {
  // If no explicit color, uses currentColor (set via text-* class)
  const fill = color || 'currentColor';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all`}
    >
      {/* Ghost Outline / Silhouette */}
      <path
        d="M20 50 
           C20 20, 80 20, 80 50 
           V78 
           C80 84, 73 84, 69 79
           C65 74, 57 74, 53 79
           C49 84, 41 84, 37 79
           C33 74, 25 74, 21 79
           C17 84, 20 78, 20 78
           Z"
        fill={fill}
        stroke={fill}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sunglasses */}
      <g>
        {/* Left Lens */}
        <polygon
          points="28,40 48,40 46,52 30,50"
          fill="black"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Right Lens */}
        <polygon
          points="52,40 72,40 70,50 54,52"
          fill="black"
          stroke={fill}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Bridge */}
        <rect x="47" y="42" width="6" height="3" fill="black" />
        {/* Side arms */}
        <path d="M22 42 L28 42" stroke={fill} strokeWidth="2" />
        <path d="M72 42 L78 42" stroke={fill} strokeWidth="2" />
      </g>
      {/* Smirk */}
      <path
        d="M 45 62 Q 50 64, 55 62"
        stroke="black"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
