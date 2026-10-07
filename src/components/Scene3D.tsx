import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";

// Full-frame 3D canvas sized to the composition, with a default light rig.
export const Scene3D: React.FC<{
  children: React.ReactNode;
  cameraZ?: number;
  background?: string;
}> = ({ children, cameraZ = 8, background = "#0b0b14" }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ backgroundColor: background }}
      camera={{ fov: 50, position: [0, 0, cameraZ] }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={30} color="#7c5cff" />
      {children}
    </ThreeCanvas>
  );
};
