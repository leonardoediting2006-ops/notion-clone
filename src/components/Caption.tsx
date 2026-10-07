import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Bold, centered Shorts-style caption that pops in at `from` (frames).
export const Caption: React.FC<{ text: string; from?: number; top?: number; size?: number }> = ({
  text,
  from = 0,
  top = 1350,
  size = 110,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - from, fps, config: { damping: 12 } });
  const opacity = interpolate(frame - from, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top,
          padding: "0 60px",
          textAlign: "center",
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.05,
          color: "white",
          textShadow: "0 8px 30px rgba(0,0,0,0.6)",
          WebkitTextStroke: "4px black",
          paintOrder: "stroke fill",
          opacity,
          transform: `scale(${0.6 + 0.4 * pop})`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
