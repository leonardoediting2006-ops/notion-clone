// YouTube Shorts format: vertical 9:16, max 60s.
export const SHORT_WIDTH = 1080;
export const SHORT_HEIGHT = 1920;
export const FPS = 30;
export const seconds = (s: number) => Math.round(s * FPS);
