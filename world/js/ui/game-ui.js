import { GamesDesktop } from "./games-desktop.js";

export class GameUI {
  constructor() {
    this.hintEl = document.getElementById("interaction-hint");
    this.modalOverlay = document.getElementById("modal-overlay");
    this.mapFadeEl = document.getElementById("map-fade");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBody = document.getElementById("modal-body");
    this.modalLinks = document.getElementById("modal-links");
    this.modalStandard = document.getElementById("modal-standard");
    this.modalGamesDesktop = document.getElementById("modal-games-desktop");
    this.modalEl = this.modalOverlay ? this.modalOverlay.querySelector(".modal") : null;
    this.modalOpen = false;
    this.mapFading = false;
    this.activeHotspot = null;
    this.gamesDesktop = null;
    this.scene = null;

    if (!this.modalOverlay || !this.modalCloseButton()) {
      throw new Error("Game UI markup is missing. Hard refresh the page.");
    }

    this.modalCloseButton().addEventListener("click", () => this.closeModal());
    this.modalOverlay.addEventListener("click", (event) => {
      if (event.target === this.modalOverlay) {
        this.closeModal();
      }
    });
    document.getElementById("interact-btn").addEventListener("click", () => {
      if (this.onInteract) {
        this.onInteract();
      }
    });
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

      if (this.modalOpen) {
        return;
      }

      if (this.mapFading) {
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

  bindScene(scene) {
    this.scene = scene;
  }

  modalCloseButton() {
    return document.getElementById("modal-close");
  }

  setHint(text, visible) {
    this.hintEl.textContent = text;
    this.hintEl.classList.toggle("visible", visible);
  }

  openModal(hotspot) {
    this.modalOpen = true;
    this.activeHotspot = hotspot;
    this.setHint("", false);

    if (hotspot.view === "desktop") {
      this.openGamesDesktop(hotspot);
      this.modalOverlay.classList.add("open", "games-mode");
      return;
    }

    this.closeGamesDesktop();
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
    if (this.gamesDesktop) {
      this.gamesDesktop.destroy();
    }
    this.gamesDesktop = new GamesDesktop(this.modalGamesDesktop, hotspot);
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
      this.modalOverlay.classList.remove("games-mode");
    }
  }

  closeModal() {
    this.modalOpen = false;
    this.activeHotspot = null;
    this.closeGamesDesktop();
    this.modalOverlay.classList.remove("open", "games-mode");

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
