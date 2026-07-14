(function () {
  function focusGame() {
    if (!document.body) {
      return;
    }

    if (!document.body.hasAttribute("tabindex")) {
      document.body.tabIndex = -1;
    }

    document.body.focus({ preventScroll: true });

    if (document.activeElement !== document.body) {
      window.focus();
    }
  }

  function requestDesktop() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "games-desktop-escape" }, "*");
    }
  }

  window.addEventListener("load", focusGame);
  window.addEventListener("pageshow", focusGame);

  window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    requestDesktop();
  });
})();
