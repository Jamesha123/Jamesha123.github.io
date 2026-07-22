import { isMobileDevice } from "../utils/device.js?v=146";
import { isFullscreenActive } from "../utils/fullscreen.js?v=146";

/** Tile size of house-interior.json — used to match outside-map zoom on mobile. */
export const MOBILE_ZOOM_REFERENCE = {
  mapWidth: 32,
  mapHeight: 15,
};

export function getCameraSettings(mapConfig) {
  const camera = (mapConfig && mapConfig.camera) || {};
  const fillViewport = !!(mapConfig && (camera.mode === "fill" || mapConfig.fillViewport));

  return {
    fillViewport: fillViewport,
    fillFit: camera.fit === "contain" ? "contain" : "cover",
    fullscreenFit: camera.fullscreenFit === "cover" ? "cover" : "contain",
    letterboxColor: camera.letterboxColor || null,
    visibleTilesY: camera.visibleTilesY != null ? camera.visibleTilesY : 15,
    maxZoom: camera.maxZoom != null ? camera.maxZoom : 4,
  };
}

export function shouldFollowPlayerCamera(mapConfig) {
  const settings = getCameraSettings(mapConfig);

  if (!settings.fillViewport) {
    return true;
  }

  return isMobileDevice() || isFullscreenActive();
}

export function resolveFillFit(cameraSettings) {
  if (isMobileDevice()) {
    return "cover";
  }

  if (isFullscreenActive()) {
    return cameraSettings.fullscreenFit;
  }

  return cameraSettings.fillFit;
}

export function computeCoverZoom(viewportWidth, viewportHeight, mapPixelWidth, mapPixelHeight) {
  const zoomW = viewportWidth / mapPixelWidth;
  const zoomH = viewportHeight / mapPixelHeight;
  return Math.max(zoomW, zoomH);
}

export function computeMobileMatchedZoom(viewportWidth, viewportHeight, tileSize, maxZoom) {
  const mapPixelWidth = MOBILE_ZOOM_REFERENCE.mapWidth * tileSize;
  const mapPixelHeight = MOBILE_ZOOM_REFERENCE.mapHeight * tileSize;
  const zoom = computeCoverZoom(viewportWidth, viewportHeight, mapPixelWidth, mapPixelHeight);
  return Phaser.Math.Clamp(zoom, 1, maxZoom);
}

function applyFillCameraBackground(camera, cameraSettings) {
  if (cameraSettings.letterboxColor) {
    camera.setBackgroundColor(
      Phaser.Display.Color.HexStringToColor(cameraSettings.letterboxColor).color
    );
    return;
  }

  camera.setBackgroundColor(0x1a1a2e);
}

function applyFillCameraFollow(scene, camera, mapW, mapH, mapConfig) {
  if (shouldFollowPlayerCamera(mapConfig)) {
    enableCameraFollow(scene, camera);
    return;
  }

  if (camera.followTarget) {
    camera.stopFollow();
  }

  camera.centerOn(mapW * 0.5, mapH * 0.5);
}

export function snapCameraToPixels(camera) {
  if (!camera) {
    return;
  }

  const zoom = camera.zoom;
  camera.scrollX = Math.round(camera.scrollX * zoom) / zoom;
  camera.scrollY = Math.round(camera.scrollY * zoom) / zoom;
}

export function enableCameraFollow(scene, camera) {
  const playerSprite = scene._cameraFollowTarget;

  if (!camera || !playerSprite) {
    return false;
  }

  if (camera.followTarget !== playerSprite) {
    camera.stopFollow();
    camera.startFollow(playerSprite, true, 1, 1);
  }

  return true;
}

export function syncCameraToPlayer(scene, options) {
  const recenter = !options || options.recenter !== false;
  const camera = scene.cameras.main;
  const playerSprite = scene._cameraFollowTarget;
  const mapConfig = scene.world && scene.world.mapConfig;

  if (!camera || !playerSprite || !shouldFollowPlayerCamera(mapConfig)) {
    return;
  }

  const startedFollow = enableCameraFollow(scene, camera);

  if (recenter || startedFollow) {
    camera.centerOn(playerSprite.x, playerSprite.y);
    snapCameraToPixels(camera);
  }
}

export function applyCameraZoom(scene, world) {
  const camera = scene.cameras.main;

  if (!camera || !world.tileSize) {
    return;
  }

  const viewportWidth = scene.scale.gameSize.width;
  const viewportHeight = scene.scale.gameSize.height;
  const cameraSettings = getCameraSettings(world.mapConfig);
  const isMobile = isMobileDevice();

  if (cameraSettings.fillViewport) {
    const mapW = world.mapWidth * world.tileSize;
    const mapH = world.mapHeight * world.tileSize;
    const zoomW = viewportWidth / mapW;
    const zoomH = viewportHeight / mapH;
    const fillFit = resolveFillFit(cameraSettings);
    const zoom = fillFit === "contain" ? Math.min(zoomW, zoomH) : Math.max(zoomW, zoomH);

    applyFillCameraBackground(camera, cameraSettings);
    camera.setZoom(zoom);
    applyFillCameraFollow(scene, camera, mapW, mapH, world.mapConfig);
    return;
  }

  if (isMobile) {
    camera.setZoom(
      computeMobileMatchedZoom(viewportWidth, viewportHeight, world.tileSize, cameraSettings.maxZoom)
    );
    return;
  }

  const visibleTilesX = cameraSettings.visibleTilesY * (viewportWidth / viewportHeight);
  const zoom = Math.min(
    viewportWidth / (visibleTilesX * world.tileSize),
    viewportHeight / (cameraSettings.visibleTilesY * world.tileSize)
  );

  camera.setZoom(Phaser.Math.Clamp(zoom, 1, cameraSettings.maxZoom));
}

export function refreshCamera(scene, world, options) {
  if (!scene || !world) {
    return;
  }

  applyCameraZoom(scene, world);

  if (shouldFollowPlayerCamera(world.mapConfig)) {
    syncCameraToPlayer(scene, options);
    return;
  }

  const camera = scene.cameras.main;
  if (camera && camera.followTarget) {
    camera.stopFollow();
  }
}

export function setupPixelPerfectFollow(scene, camera) {
  if (scene._pixelFollowBound) {
    return;
  }

  scene._pixelFollowBound = true;

  let lastScrollX = null;
  let lastScrollY = null;

  camera.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, function () {
    if (lastScrollX === camera.scrollX && lastScrollY === camera.scrollY) {
      return;
    }

    snapCameraToPixels(camera);
    lastScrollX = camera.scrollX;
    lastScrollY = camera.scrollY;
  });
}

export function setupCamera(scene, world, playerSprite) {
  const camera = scene.cameras.main;

  scene.physics.world.setBounds(
    0,
    0,
    world.mapWidth * world.tileSize,
    world.mapHeight * world.tileSize
  );

  camera.setRoundPixels(true);

  const mapPixelW = world.mapWidth * world.tileSize;
  const mapPixelH = world.mapHeight * world.tileSize;

  camera.setBounds(0, 0, mapPixelW, mapPixelH);
  scene._cameraFollowTarget = playerSprite;

  if (shouldFollowPlayerCamera(world.mapConfig)) {
    enableCameraFollow(scene, camera);
  } else if (camera.followTarget) {
    camera.stopFollow();
  }

  refreshCamera(scene, world, { recenter: true });

  if (!scene._cameraResizeBound) {
    scene._cameraResizeBound = true;

    scene.scale.on("resize", function () {
      refreshCamera(scene, scene.world, { recenter: true });
    });

    window.addEventListener("orientationchange", function () {
      window.setTimeout(function () {
        refreshCamera(scene, scene.world, { recenter: true });
      }, 250);
    });

    window.addEventListener("world-viewport-change", function () {
      refreshCamera(scene, scene.world, { recenter: true });
    });
  }

  setupPixelPerfectFollow(scene, camera);
}
