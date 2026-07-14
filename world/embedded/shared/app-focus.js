(function () {
  function focusApp() {
    if (!document.body) {
      return;
    }

    if (!document.body.hasAttribute("tabindex")) {
      document.body.tabIndex = -1;
    }

    document.body.focus({ preventScroll: true });
  }

  window.addEventListener("load", focusApp);
  window.addEventListener("pageshow", focusApp);

  window.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || window.parent === window) {
      return;
    }

    event.preventDefault();
    window.parent.postMessage({ type: "world-modal-close" }, "*");
  });
})();
