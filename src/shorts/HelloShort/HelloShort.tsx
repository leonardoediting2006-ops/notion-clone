import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption } from "../../components/Caption";
import { Scene3D } from "../../components/Scene3D";

export type HelloShortProps = { title: string; subtitle: string };

// Example short: a spinning torus knot with orbiting cubes.
// Animation is driven by the frame number (never by clock time) so renders are deterministic.
const Knot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 10, mass: 0.8 } });
  const t = frame / fps;

  return (
    <group position={[0, 0.6, 0]} scale={enter}>
      <mesh rotation={[t * 0.6, t * 0.9, 0]}>
        <torusKnotGeometry args={[1, 0.32, 200, 32]} />
        <meshStandardMaterial color="#ff3d7f" metalness={0.6} roughness={0.2} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = t * 1.5 + (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.2, Math.sin(a * 2) * 0.4, Math.sin(a) * 2.2]} rotation={[a, a, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#38e1ff" metalness={0.3} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

export const HelloShort: React.FC<HelloShortProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <Scene3D>
        <Knot />
      </Scene3D>
      <Caption text={title} from={20} top={1300} />
      <Caption text={subtitle} from={45} top={1450} size={64} />
    </AbsoluteFill>
  );
};
