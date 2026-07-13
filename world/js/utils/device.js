export function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }

  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
}

export function isLandscapeViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth > window.innerHeight;
}

export function isMobileLandscape() {
  return isMobileDevice() && isLandscapeViewport();
}

export function isMobilePortrait() {
  return isMobileDevice() && !isLandscapeViewport();
}
