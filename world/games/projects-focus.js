(function () {
  window.addEventListener(
    "keydown",
    function (event) {
      if (event.key !== "Escape") {
        return;
      }

      const shell = document.getElementById("projects-shell");
      if (shell && shell.classList.contains("is-detail")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof window.__closeProjectDetail === "function") {
          window.__closeProjectDetail();
        }
        return;
      }

      if (window.parent && window.parent !== window) {
        event.preventDefault();
        window.parent.postMessage({ type: "games-desktop-escape" }, "*");
      }
    },
    true
  );
})();
