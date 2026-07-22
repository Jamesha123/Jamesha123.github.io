import { isMobileDevice, isMobileLandscape } from "../utils/device.js?v=146";
import { refreshPhaserScale } from "../utils/viewport.js?v=146";
import { VirtualJoystick } from "./virtual-joystick.js?v=146";

let joystick = null;

function refreshViewport() {
  refreshPhaserScale(window.__phaserGame);
  window.dispatchEvent(new Event("world-viewport-change"));
}

function updateRotateOverlay() {
  const overlay = document.getElementById("mobile-rotate-overlay");
  if (!overlay) {
    return;
  }

  const show = isMobileLandscape();
  overlay.hidden = !show;
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
}

export function bindMobileControls() {
  if (!isMobileDevice()) {
    return null;
  }

  document.documentElement.classList.add("mobile-user");

  const joystickRoot = document.getElementById("virtual-joystick");
  if (joystickRoot) {
    joystick = new VirtualJoystick(joystickRoot);
    window.__WORLD_JOYSTICK__ = joystick;
  }

  updateRotateOverlay();

  window.addEventListener("resize", function () {
    updateRotateOverlay();
    refreshViewport();
  });

  window.addEventListener("orientationchange", function () {
    window.setTimeout(function () {
      updateRotateOverlay();
      refreshViewport();
    }, 250);
  });

  return joystick;
}

export function getMobileJoystick() {
  return joystick || window.__WORLD_JOYSTICK__ || null;
}

export function hideMobileJoystickForOverlay() {
  const joy = getMobileJoystick();
  if (joy) {
    joy.hide();
  }
}

export function showMobileJoystickAfterOverlay() {
  const joy = getMobileJoystick();
  if (joy) {
    joy.show();
  }
}
