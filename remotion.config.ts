import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
// WebGL in headless Chromium needs the ANGLE backend.
Config.setChromiumOpenGlRenderer("angle");
