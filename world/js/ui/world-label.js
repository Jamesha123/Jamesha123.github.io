import { resolveWorldAsset } from "../utils/helpers.js";

export const WORLD_LABEL_FONT_KEY = "world-label-font";
const FONT_NATIVE_SIZE = 16;
const DEFAULT_DISPLAY_SIZE_PX = 3;
const MIN_DISPLAY_SIZE_PX = 3;
const PAD_REFERENCE_PX = 8;

export function resolveDisplayFontSizePx(size) {
  if (size == null || size === "") {
    return DEFAULT_DISPLAY_SIZE_PX;
  }

  if (typeof size === "number") {
    return Math.max(MIN_DISPLAY_SIZE_PX, Math.round(size));
  }

  const value = String(size).trim();
  if (value.endsWith("rem")) {
    const rem = parseFloat(value);
    if (!Number.isNaN(rem)) {
      return Math.max(MIN_DISPLAY_SIZE_PX, Math.round(rem * 16));
    }
  }

  const px = parseInt(value, 10);
  if (!Number.isNaN(px)) {
    return Math.max(MIN_DISPLAY_SIZE_PX, px);
  }

  return DEFAULT_DISPLAY_SIZE_PX;
}

export function preloadWorldLabelFont(load, version) {
  const bust = version ? "?v=" + version : "";

  load.bitmapFont(
    WORLD_LABEL_FONT_KEY,
    resolveWorldAsset("assets/fonts/world-label.png") + bust,
    resolveWorldAsset("assets/fonts/world-label.xml") + bust
  );
}

export function createWorldLabel(scene, x, y, text, options) {
  options = options || {};

  if (!text) {
    return null;
  }

  if (!scene.cache.bitmapFont.exists(WORLD_LABEL_FONT_KEY)) {
    return null;
  }

  const displayPx = resolveDisplayFontSizePx(options.fontSize);
  const scale = displayPx / FONT_NATIVE_SIZE;
  const sizeRatio = displayPx / PAD_REFERENCE_PX;
  const padX = Math.max(1, Math.round(4 * sizeRatio));
  const padY = Math.max(1, Math.round(2 * sizeRatio));

  const container = scene.add.container(Math.round(x), Math.round(y));
  container.setDepth(10);

  const labelText = scene.add.bitmapText(0, 0, WORLD_LABEL_FONT_KEY, text, FONT_NATIVE_SIZE);
  labelText.setOrigin(0.5, 1);
  labelText.setTint(0xffffff);

  const textWidth = labelText.width;
  const textHeight = labelText.height;
  const bgLeft = -textWidth / 2 - padX;
  const bgTop = -textHeight - padY;
  const bgWidth = textWidth + padX * 2;
  const bgHeight = textHeight + padY * 2;

  const background = scene.add.graphics();
  background.fillStyle(0x000000, 0.85);
  background.fillRect(bgLeft, bgTop, bgWidth, bgHeight);
  background.lineStyle(1, 0xffffff, 0.6);
  background.strokeRect(bgLeft + 0.5, bgTop + 0.5, bgWidth - 1, bgHeight - 1);

  container.add([background, labelText]);
  container.setScale(scale);

  return container;
}
