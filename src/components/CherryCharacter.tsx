import { cn } from "@/lib/utils";

interface CherryCharacterProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "thinking" | "excited";
  animate?: boolean;
  className?: string;
}

const CherryCharacter = ({ 
  size = "md", 
  mood = "happy", 
  animate = true,
  className 
}: CherryCharacterProps) => {
  const sizeClasses = {
    sm: "w-12 h-14",
    md: "w-20 h-24",
    lg: "w-32 h-36",
    xl: "w-48 h-56",
  };

  const cherrySize = {
    sm: { cherry: 16, stem: 2, gap: 4 },
    md: { cherry: 28, stem: 3, gap: 6 },
    lg: { cherry: 44, stem: 4, gap: 10 },
    xl: { cherry: 64, stem: 5, gap: 14 },
  };

  const s = cherrySize[size];

  const getFace = () => {
    switch (mood) {
      case "thinking":
        return { left: "🤔", right: "💭" };
      case "excited":
        return { left: "✨", right: "🎉" };
      default:
        return { left: "😊", right: "😊" };
    }
  };

  const face = getFace();

  return (
    <div className={cn(
      "relative flex flex-col items-center",
      animate && "animate-cherry-bounce",
      className
    )}>
      {/* Stem */}
      <svg 
        className="text-cherry-stem"
        width={s.cherry * 1.5} 
        height={s.cherry * 0.8}
        viewBox="0 0 60 30"
      >
        <path
          d="M30 28 C30 15, 15 5, 10 2"
          fill="none"
          stroke="currentColor"
          strokeWidth={s.stem}
          strokeLinecap="round"
        />
        <path
          d="M30 28 C30 15, 45 5, 50 2"
          fill="none"
          stroke="currentColor"
          strokeWidth={s.stem}
          strokeLinecap="round"
        />
        {/* Leaf */}
        <ellipse
          cx="30"
          cy="8"
          rx="8"
          ry="5"
          fill="hsl(var(--cherry-green))"
          transform="rotate(-20 30 8)"
        />
      </svg>

      {/* Cherries */}
      <div className={cn("flex items-center", animate && "animate-cherry-wiggle")} style={{ gap: s.gap }}>
        {/* Left Cherry */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-cherry-red via-cherry-red to-red-800 shadow-cherry flex items-center justify-center"
          style={{ 
            width: s.cherry, 
            height: s.cherry,
          }}
        >
          {/* Shine */}
          <div 
            className="absolute bg-white/40 rounded-full"
            style={{
              width: s.cherry * 0.25,
              height: s.cherry * 0.25,
              top: s.cherry * 0.15,
              left: s.cherry * 0.2,
            }}
          />
          <span style={{ fontSize: s.cherry * 0.35 }}>{face.left}</span>
        </div>

        {/* Right Cherry */}
        <div 
          className="relative rounded-full bg-gradient-to-br from-cherry-red via-cherry-red to-red-800 shadow-cherry flex items-center justify-center"
          style={{ 
            width: s.cherry, 
            height: s.cherry,
          }}
        >
          {/* Shine */}
          <div 
            className="absolute bg-white/40 rounded-full"
            style={{
              width: s.cherry * 0.25,
              height: s.cherry * 0.25,
              top: s.cherry * 0.15,
              left: s.cherry * 0.2,
            }}
          />
          <span style={{ fontSize: s.cherry * 0.35 }}>{face.right}</span>
        </div>
      </div>
    </div>
  );
};

export default CherryCharacter;
