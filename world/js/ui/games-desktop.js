import { isMobileDevice } from "../utils/device.js?v=137";

function isProjectsPage(page) {
  if (!page) {
    return false;
  }

  return page.replace(/\?.*$/, "").endsWith("embedded/games/projects/index.html");
}

export class GamesDesktop {
  constructor(rootEl, hotspot) {
    this.rootEl = rootEl;
    this.hotspot = hotspot;
    this.openWindow = null;
    this.activeApp = null;
    this.activeFrame = null;
    this.taskbarButton = null;
    this.handleGameMessage = this.handleGameMessage.bind(this);
    window.addEventListener("message", this.handleGameMessage);
    this.render();
  }

  handleGameMessage(event) {
    if (!this.openWindow || !this.activeFrame) {
      return;
    }

    if (event.source !== this.activeFrame.contentWindow) {
      return;
    }

    if (event.data && event.data.type === "games-desktop-escape") {
      this.closeApp();
    }
  }

  hasOpenApp() {
    return !!this.openWindow;
  }

  render() {
    this.rootEl.innerHTML = "";
    this.rootEl.hidden = false;

    const monitor = document.createElement("div");
    monitor.className = "games-monitor";
    monitor.innerHTML =
      '<div class="games-monitor-bezel">' +
      '  <div class="games-workspace">' +
      '    <div class="games-desktop-screen">' +
      '      <div class="games-desktop-icons"></div>' +
      '      <div class="games-window-layer"></div>' +
      "    </div>" +
      '    <div class="games-taskbar">' +
      '      <button type="button" class="games-start" aria-label="Start">' +
      '        <span class="games-start-icon" aria-hidden="true"></span>' +
      "      </button>" +
      '      <div class="games-taskbar-apps"></div>' +
      '      <div class="games-taskbar-tray">' +
      '        <button type="button" class="games-taskbar-github" aria-label="Open GitHub profile">' +
      '          <img src="../images/james.jpeg" alt="" loading="lazy">' +
      '          <span>GitHub</span>' +
      '        </button>' +
      '        <span class="games-taskbar-label">James PC</span>' +
      '      </div>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    const iconsEl = monitor.querySelector(".games-desktop-icons");
    (this.hotspot.apps || []).forEach(
      function (app) {
        const icon = document.createElement("button");
        icon.type = "button";
        icon.className = "games-desktop-icon";
        icon.innerHTML =
          '<img src="' +
          escapeHtml(app.icon) +
          '" alt="" loading="lazy">' +
          "<span>" +
          escapeHtml(app.label) +
          "</span>";
        icon.addEventListener("click", () => this.launchApp(app));
        iconsEl.appendChild(icon);
      }.bind(this)
    );

    this.rootEl.appendChild(monitor);
    this.windowLayer = monitor.querySelector(".games-window-layer");
    this.taskbarApps = monitor.querySelector(".games-taskbar-apps");

    const githubBtn = monitor.querySelector(".games-taskbar-github");
    if (githubBtn) {
      githubBtn.addEventListener("click", () => {
        window.open("https://github.com/Jamesha123", "_blank", "noopener,noreferrer");
      });
    }
  }

  launchApp(app) {
    if (app.url) {
      window.open(app.url, "_blank", "noopener,noreferrer");
      return;
    }

    this.openApp(app);
  }

  openApp(app) {
    this.closeApp();
    this.activeApp = app;

    const worldCanvas = document.querySelector("#game-container canvas");
    if (worldCanvas) {
      worldCanvas.blur();
    }

    const win = document.createElement("div");
    win.className = "games-app-window";

    const titlebar = document.createElement("div");
    titlebar.className = "games-app-titlebar";

    const title = document.createElement("span");
    title.className = "games-app-title";
    title.textContent = app.label;

    const buttons = document.createElement("div");
    buttons.className = "games-app-buttons";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "win-btn win-btn-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "X";

    buttons.appendChild(closeBtn);
    titlebar.appendChild(title);
    titlebar.appendChild(buttons);

    const frame = document.createElement("iframe");
    frame.className = "games-app-frame";
    frame.src = buildGameFrameSrc(app.page);
    frame.title = app.label;
    frame.scrolling = isProjectsPage(app.page) ? "auto" : "no";
    if (!isProjectsPage(app.page)) {
      frame.tabIndex = 0;
    }

    win.appendChild(titlebar);
    win.appendChild(frame);

    closeBtn.addEventListener("click", () => this.closeApp());
    if (!isProjectsPage(app.page)) {
      titlebar.addEventListener("mousedown", () => this.focusGameFrame(frame));
      frame.addEventListener("load", () => this.focusGameFrame(frame));
    }

    this.windowLayer.appendChild(win);
    this.openWindow = win;
    this.activeFrame = frame;

    const taskBtn = document.createElement("button");
    taskBtn.type = "button";
    taskBtn.className = "games-taskbar-app active";
    taskBtn.textContent = app.label;
    taskBtn.addEventListener("click", () => this.closeApp());
    this.taskbarApps.appendChild(taskBtn);
    this.taskbarButton = taskBtn;

    if (!isProjectsPage(app.page)) {
      window.requestAnimationFrame(() => this.focusGameFrame(frame));
    }
  }

  focusGameFrame(frame) {
    if (!frame) {
      return;
    }

    try {
      if (frame.contentWindow) {
        frame.contentWindow.focus();
      }
    } catch (error) {
      // Ignore cross-origin focus errors.
    }
  }

  closeApp() {
    if (this.taskbarButton) {
      this.taskbarButton.remove();
      this.taskbarButton = null;
    }
    if (this.openWindow) {
      this.openWindow.remove();
      this.openWindow = null;
    }
    this.activeFrame = null;
    this.activeApp = null;
  }

  destroy() {
    window.removeEventListener("message", this.handleGameMessage);
    this.closeApp();
    this.rootEl.innerHTML = "";
    this.rootEl.hidden = true;
  }
}

function buildGameFrameSrc(page) {
  if (!page || !isMobileDevice()) {
    return page;
  }

  return page + (page.includes("?") ? "&" : "?") + "mobile=1";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
