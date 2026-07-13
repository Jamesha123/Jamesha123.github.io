export function getTopBarInset() {
  if (typeof document === "undefined") {
    return 0;
  }

  const topBar = document.querySelector(".top-bar");
  if (!topBar) {
    return 0;
  }

  return Math.ceil(topBar.getBoundingClientRect().height);
}

export function getWindowViewportSize() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  if (window.visualViewport) {
    return {
      width: Math.round(window.visualViewport.width),
      height: Math.round(window.visualViewport.height),
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function refreshPhaserScale(game) {
  if (!game || !game.scale) {
    return;
  }

  const size = getWindowViewportSize();
  game.scale.resize(size.width, size.height);
  game.scale.refresh();
}
