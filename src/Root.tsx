import { Composition } from "remotion";
import { FPS, SHORT_HEIGHT, SHORT_WIDTH, seconds } from "./config";
import { HelloShort } from "./shorts/HelloShort/HelloShort";

// Register every short here. Each <Composition> appears in the studio
// and can be rendered with `npm run render -- <id>`.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloShort"
        component={HelloShort}
        durationInFrames={seconds(8)}
        fps={FPS}
        width={SHORT_WIDTH}
        height={SHORT_HEIGHT}
        defaultProps={{ title: "3D SHORTS", subtitle: "made with code" }}
      />
    </>
  );
};
