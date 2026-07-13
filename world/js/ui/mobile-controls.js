import { isMobileDevice, isMobileLandscape } from "../utils/device.js?v=41";
import { VirtualJoystick } from "./virtual-joystick.js?v=41";

let joystick = null;

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
    joystick.show();
  }

  updateRotateOverlay();
  window.addEventListener("resize", function () {
    updateRotateOverlay();
    window.dispatchEvent(new Event("world-viewport-change"));
  });
  window.addEventListener("orientationchange", function () {
    window.setTimeout(function () {
      updateRotateOverlay();
      window.dispatchEvent(new Event("world-viewport-change"));
    }, 150);
  });

  return joystick;
}

export function getMobileJoystick() {
  return joystick;
}
