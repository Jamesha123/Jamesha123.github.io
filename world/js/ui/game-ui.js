import { GamesDesktop } from "./games-desktop.js";
import { isMobileDevice } from "../utils/device.js?v=44";

export class GameUI {
  constructor() {
    this.hintEl = document.getElementById("interaction-hint");
    this.mobileInteractBtn = document.getElementById("mobile-interact-btn");
    this.bottomHud = document.getElementById("bottom-hud");
    this.isMobile = isMobileDevice();
    this.modalOverlay = document.getElementById("modal-overlay");
    this.mapFadeEl = document.getElementById("map-fade");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBody = document.getElementById("modal-body");
    this.modalLinks = document.getElementById("modal-links");
    this.modalStandard = document.getElementById("modal-standard");
    this.modalGamesDesktop = document.getElementById("modal-games-desktop");
    this.modalAppView = document.getElementById("modal-app-view");
    this.modalEl = this.modalOverlay ? this.modalOverlay.querySelector(".modal") : null;
    this.modalOpen = false;
    this.mapFading = false;
    this.activeHotspot = null;
    this.gamesDesktop = null;
    this.appFrame = null;
    this.scene = null;

    this.handleModalMessage = this.handleModalMessage.bind(this);
    window.addEventListener("message", this.handleModalMessage);

    if (!this.modalOverlay || !this.modalCloseButton()) {
      throw new Error("Game UI markup is missing. Hard refresh the page.");
    }

    if (!this.hintEl) {
      throw new Error('Missing "#interaction-hint". Hard refresh the page.');
    }

    this.modalCloseButton().addEventListener("click", () => this.closeModal());
    this.modalOverlay.addEventListener("click", (event) => {
      if (event.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.addEventListener("click", () => {
        if (this.onInteract) {
          this.onInteract();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.modalOpen) {
        if (this.gamesDesktop && this.gamesDesktop.hasOpenApp()) {
          this.gamesDesktop.closeApp();
          event.preventDefault();
          return;
        }

        this.closeModal();
        return;
      }

      if (this.modalOpen || this.mapFading) {
        return;
      }

      if (event.key !== "e" && event.key !== "E") {
        return;
      }

      if (event.target.closest("input, textarea, select")) {
        return;
      }

      event.preventDefault();
      if (this.onInteract) {
        this.onInteract();
      }
    });
  }

  getDefaultHintText() {
    return "WASD or click to move";
  }

  setDefaultHint() {
    this.hideInteractPrompt();

    if (this.isMobile) {
      this.setHint("", false);
      return;
    }

    this.setHint(this.getDefaultHintText(), true);
  }

  setInteractPrompt(actionText) {
    if (this.isMobile) {
      this.setHint("", false);
      if (this.mobileInteractBtn) {
        this.mobileInteractBtn.hidden = false;
        this.mobileInteractBtn.textContent = "Interact";
      }
      if (this.bottomHud) {
        this.bottomHud.classList.add("has-interact");
      }
      return;
    }

    this.hideInteractPrompt();
    const action = actionText || "interact";
    this.setHint("Press E to " + action, true);
  }

  hideInteractPrompt() {
    if (this.mobileInteractBtn) {
      this.mobileInteractBtn.hidden = true;
    }

    if (this.bottomHud) {
      this.bottomHud.classList.remove("has-interact");
    }
  }

  bindScene(scene) {
    this.scene = scene;
  }

  handleModalMessage(event) {
    if (!event.data) {
      return;
    }

    if (event.data.type === "games-desktop-escape" && this.gamesDesktop && this.gamesDesktop.hasOpenApp()) {
      this.gamesDesktop.closeApp();
      return;
    }

    if (event.data.type === "world-modal-close" && this.modalOpen) {
      this.closeModal();
    }
  }

  modalCloseButton() {
    return document.getElementById("modal-close");
  }

  setHint(text, visible) {
    if (!this.hintEl) {
      return;
    }

    this.hintEl.textContent = text;
    this.hintEl.classList.toggle("visible", visible);
  }

  openModal(hotspot) {
    this.modalOpen = true;
    this.activeHotspot = hotspot;
    this.setHint("", false);
    this.hideInteractPrompt();

    if (hotspot.view === "desktop") {
      this.openGamesDesktop(hotspot);
      this.modalOverlay.classList.add("open", "games-mode");
      return;
    }

    if (hotspot.view === "app") {
      this.openAppView(hotspot);
      this.modalOverlay.classList.add("open", "app-mode");
      return;
    }

    this.closeGamesDesktop();
    this.closeAppView();
    this.modalStandard.hidden = false;
    this.modalTitle.textContent = hotspot.title;
    this.modalBody.textContent = hotspot.body;
    this.modalLinks.innerHTML = "";

    (hotspot.links || []).forEach((link, index) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = link.url.startsWith("http") ? "_blank" : "_self";
      anchor.rel = "noopener noreferrer";
      if (index > 0) {
        anchor.classList.add("secondary");
      }
      this.modalLinks.appendChild(anchor);
    });

    this.modalOverlay.classList.add("open");
    this.modalOverlay.classList.remove("games-mode");
  }

  openGamesDesktop(hotspot) {
    this.modalStandard.hidden = true;
    this.closeAppView();
    if (this.gamesDesktop) {
      this.gamesDesktop.destroy();
    }
    this.gamesDesktop = new GamesDesktop(this.modalGamesDesktop, hotspot);
  }

  openAppView(hotspot) {
    this.closeGamesDesktop();
    this.closeAppView();
    this.modalStandard.hidden = true;

    if (!this.modalAppView || !hotspot.page) {
      return;
    }

    this.modalAppView.hidden = false;

    const frame = document.createElement("iframe");
    frame.className = "modal-app-frame";
    frame.src = hotspot.page;
    frame.title = hotspot.title || hotspot.label || "App";
    frame.tabIndex = 0;
    frame.addEventListener("load", function () {
      frame.focus();
    });

    this.modalAppView.appendChild(frame);
    this.appFrame = frame;
  }

  closeAppView() {
    if (this.appFrame) {
      this.appFrame.remove();
      this.appFrame = null;
    }

    if (this.modalAppView) {
      this.modalAppView.hidden = true;
      this.modalAppView.innerHTML = "";
    }
  }

  closeGamesDesktop() {
    if (this.gamesDesktop) {
      this.gamesDesktop.destroy();
      this.gamesDesktop = null;
    }
    if (this.modalGamesDesktop) {
      this.modalGamesDesktop.hidden = true;
    }
    if (this.modalStandard) {
      this.modalStandard.hidden = false;
    }
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove("games-mode", "app-mode");
    }
  }

  closeModal() {
    this.modalOpen = false;
    this.activeHotspot = null;
    this.closeGamesDesktop();
    this.closeAppView();
    this.modalOverlay.classList.remove("open", "games-mode", "app-mode");

    const canvas = this.scene && this.scene.game ? this.scene.game.canvas : null;
    if (canvas && typeof canvas.focus === "function") {
      canvas.focus();
    }
  }

  isModalOpen() {
    return this.modalOpen;
  }

  isMapFading() {
    return this.mapFading;
  }

  resetMapFade() {
    this.mapFading = false;
    if (this.mapFadeEl) {
      this.mapFadeEl.classList.remove("active");
      this.mapFadeEl.style.transition = "";
    }
  }

  fadeOutForMapTransition() {
    if (!this.mapFadeEl) {
      return Promise.resolve();
    }

    this.mapFading = true;
    this.setHint("", false);
    this.hideInteractPrompt();

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.mapFadeEl.removeEventListener("transitionend", onTransitionEnd);
        resolve();
      };

      const onTransitionEnd = (event) => {
        if (event.target === this.mapFadeEl && event.propertyName === "opacity") {
          finish();
        }
      };

      this.mapFadeEl.addEventListener("transitionend", onTransitionEnd);
      this.mapFadeEl.classList.add("active");
      window.setTimeout(finish, GameUI.MAP_FADE_MS + 50);
    });
  }

  fadeInFromMapTransition() {
    if (!this.mapFadeEl) {
      this.mapFading = false;
      return Promise.resolve();
    }

    this.mapFading = true;

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.mapFadeEl.removeEventListener("transitionend", onTransitionEnd);
        this.mapFading = false;
        const canvas = this.scene && this.scene.game ? this.scene.game.canvas : null;
        if (canvas && typeof canvas.focus === "function") {
          canvas.focus();
        }
        resolve();
      };

      const onTransitionEnd = (event) => {
        if (event.target === this.mapFadeEl && event.propertyName === "opacity") {
          finish();
        }
      };

      this.mapFadeEl.style.transition = "none";
      this.mapFadeEl.classList.add("active");
      void this.mapFadeEl.offsetWidth;
      this.mapFadeEl.style.transition = "";
      this.mapFadeEl.addEventListener("transitionend", onTransitionEnd);
      this.mapFadeEl.classList.remove("active");
      window.setTimeout(finish, GameUI.MAP_FADE_MS + 50);
    });
  }
}

GameUI.MAP_FADE_MS = 350;
