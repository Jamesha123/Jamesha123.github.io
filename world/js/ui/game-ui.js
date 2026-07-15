import { GamesDesktop } from "./games-desktop.js?v=1";
import { isMobileDevice } from "../utils/device.js?v=137";
import {
  hideMobileJoystickForOverlay,
  showMobileJoystickAfterOverlay,
} from "./mobile-controls.js?v=139";
import { isGameStarted } from "./title-screen.js?v=128";
import {
  applyHotspotTypography,
  clearHotspotTypography,
  isHotspotMobileView,
} from "./hotspot-typography.js?v=2";

export class GameUI {
  constructor() {
    this.hintEl = document.getElementById("interaction-hint");
    this.mobileInteractBtn = document.getElementById("mobile-interact-btn");
    this.bottomHud = document.getElementById("bottom-hud");
    this.isMobile = isMobileDevice();
    this.modalOverlay = document.getElementById("modal-overlay");
    this.mapFadeEl = document.getElementById("map-fade");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBodyScroll = document.getElementById("modal-body-scroll");
    this.modalHotspotFooter = document.getElementById("modal-hotspot-footer");
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

    if (
      !this.modalTitle ||
      !this.modalBodyScroll ||
      !this.modalLinks ||
      !this.modalStandard ||
      !this.modalHotspotFooter
    ) {
      throw new Error('Modal content markup is missing. Hard refresh the page.');
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

    this.handleHintActivate = this.handleHintActivate.bind(this);

    if (this.hintEl) {
      this.hintEl.addEventListener("click", this.handleHintActivate);
      this.hintEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        this.handleHintActivate();
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

  handleHintActivate() {
    if (
      this.isMobile ||
      this.modalOpen ||
      this.mapFading ||
      !this.hintEl ||
      !this.hintEl.classList.contains("hint-interact") ||
      !this.onInteract
    ) {
      return;
    }

    this.onInteract();
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
    this.hintEl.classList.add("hint-interact");
    this.hintEl.setAttribute("role", "button");
    this.hintEl.setAttribute("tabindex", "0");
  }

  hideInteractPrompt() {
    if (this.hintEl) {
      this.hintEl.classList.remove("hint-interact");
      this.hintEl.removeAttribute("role");
      this.hintEl.removeAttribute("tabindex");
    }

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

  bindContent(content) {
    this.content = content;
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

  clearHotspotPanelMode() {
    clearHotspotTypography(this.modalEl);
    if (this.modalEl) {
      this.modalEl.classList.remove("modal-hotspot-panel");
    }
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove("hotspot-panel-mode");
    }
    if (this.modalStandard) {
      this.modalStandard.hidden = true;
    }
  }

  setHotspotPanelMode() {
    if (this.modalEl) {
      this.modalEl.classList.add("modal-hotspot-panel");
    }
    if (this.modalOverlay) {
      this.modalOverlay.classList.add("hotspot-panel-mode");
    }
    if (this.modalStandard) {
      this.modalStandard.hidden = false;
    }
  }

  setHotspotBody(body, technologies) {
    if (!this.modalBodyScroll) {
      return;
    }

    this.modalBodyScroll.innerHTML = "";
    const paragraphs = String(body || "")
      .split(/\n\s*\n/)
      .map(function (part) {
        return part.trim().replace(/\n/g, " ");
      })
      .filter(Boolean);

    const inner = document.createElement("div");
    inner.className = "modal-body-inner";

    paragraphs.forEach(function (text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      inner.appendChild(paragraph);
    }, this);

    if (technologies && technologies.length) {
      const list = document.createElement("ul");
      list.className = "modal-tech-list";

      technologies.slice(0,5).forEach(function (tech) {
        const item = document.createElement("li");
        item.textContent = tech;
        list.appendChild(item);
      });

      inner.appendChild(list);
    }

    this.modalBodyScroll.appendChild(inner);
  }

  getLinkIconType(link) {
    if (link.icon) {
      return link.icon;
    }

    if (!link.url) {
      return null;
    }

    const url = link.url.toLowerCase();
    if (url.includes("linkedin.com")) {
      return "linkedin";
    }

    if (url.startsWith("mailto:")) {
      return "email";
    }

    return null;
  }

  createContactIcon(iconType) {
    const icon = document.createElement("span");
    icon.className = "modal-contact-icon";
    icon.setAttribute("aria-hidden", "true");

    if (iconType === "linkedin") {
      icon.innerHTML =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img">' +
        '<path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.062 2.062 0 0 1 2.063-2.063 2.062 2.062 0 0 1 2.064 2.063 2.062 2.062 0 0 1-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>' +
        "</svg>";
      return icon;
    }

    if (iconType === "email") {
      icon.innerHTML =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img">' +
        '<path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>' +
        "</svg>";
      return icon;
    }

    return null;
  }

  getLinkDisplayText(link) {
    if (link.display) {
      return link.display;
    }

    if (link.url && link.url.toLowerCase().startsWith("mailto:")) {
      return link.url.slice(7);
    }

    return null;
  }

  appendModalLink(link, isSecondary) {
    const displayText = this.getLinkDisplayText(link);

    if (link.hotspotId) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = link.label;
      if (isSecondary) {
        button.classList.add("secondary");
      }
      button.addEventListener("click", () => {
        const targetHotspot =
          this.content && typeof this.content.getHotspot === "function"
            ? this.content.getHotspot(link.hotspotId)
            : null;
        if (targetHotspot) {
          this.openModal(Object.assign({}, targetHotspot));
        }
      });
      this.modalLinks.appendChild(button);
      return;
    }

    if (displayText) {
      const iconType = this.getLinkIconType(link);
      const row = document.createElement("div");
      row.className = "modal-link-row";

      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.className = "modal-link-url";
      anchor.target = link.url.startsWith("http") ? "_blank" : "_self";
      anchor.rel = "noopener noreferrer";

      if (iconType) {
        anchor.classList.add("modal-contact-card", "modal-contact-card--" + iconType);

        const icon = this.createContactIcon(iconType);
        if (icon) {
          anchor.appendChild(icon);
        }

        const copy = document.createElement("span");
        copy.className = "modal-contact-copy";

        const label = document.createElement("span");
        label.className = "modal-contact-label";
        label.textContent = link.label;

        const value = document.createElement("span");
        value.className = "modal-contact-value";
        value.textContent = displayText;

        copy.appendChild(label);
        copy.appendChild(value);
        anchor.appendChild(copy);
      } else {
        anchor.textContent = displayText;
        if (isSecondary) {
          anchor.classList.add("secondary");
        }
      }

      row.appendChild(anchor);
      this.modalLinks.appendChild(row);
      this.modalLinks.classList.add("modal-links-listed");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.textContent = link.label;
    anchor.target = link.url.startsWith("http") ? "_blank" : "_self";
    anchor.rel = "noopener noreferrer";
    if (isSecondary) {
      anchor.classList.add("secondary");
    }
    this.modalLinks.appendChild(anchor);
  }

  openModal(hotspot) {
    this.modalOpen = true;
    this.activeHotspot = hotspot;
    this.setHint("", false);
    this.hideInteractPrompt();

    if (this.isMobile) {
      hideMobileJoystickForOverlay();
    }

    if (hotspot.view === "desktop") {
      this.clearHotspotPanelMode();
      this.closeAppView();
      this.openGamesDesktop(hotspot);
      this.modalOverlay.classList.add("open", "games-mode");
      this.modalOverlay.classList.remove("app-mode", "hotspot-panel-mode");
      return;
    }

    if (hotspot.view === "app") {
      this.clearHotspotPanelMode();
      this.closeGamesDesktop();
      this.openAppView(hotspot);
      this.modalOverlay.classList.add("open", "app-mode");
      this.modalOverlay.classList.remove("games-mode", "hotspot-panel-mode");
      return;
    }

    this.closeGamesDesktop();
    this.closeAppView();
    this.setHotspotPanelMode();
    this.modalTitle.textContent = hotspot.title;
    this.setHotspotBody(hotspot.body, hotspot.technologies);
    this.modalLinks.innerHTML = "";
    this.modalLinks.classList.remove("modal-links-listed");

    if (this.modalBodyScroll) {
      this.modalBodyScroll.scrollTop = 0;
    }

    (hotspot.links || []).forEach((link, index) => {
      const isSecondary = link.secondary === true || index > 0;
      this.appendModalLink(link, isSecondary);
    });

    applyHotspotTypography(this.modalEl, hotspot, isHotspotMobileView());

    this.modalOverlay.classList.add("open");
    this.modalOverlay.classList.remove("games-mode", "app-mode");
  }

  openGamesDesktop(hotspot) {
    this.modalStandard.hidden = true;
    if (this.modalEl) {
      this.modalEl.classList.remove("modal-hotspot-panel");
    }
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
    if (this.modalEl) {
      this.modalEl.classList.remove("modal-hotspot-panel");
    }

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
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove("games-mode", "app-mode");
    }
  }

  closeModal() {
    this.modalOpen = false;
    this.activeHotspot = null;
    this.closeGamesDesktop();
    this.closeAppView();
    this.clearHotspotPanelMode();
    this.modalOverlay.classList.remove("open", "games-mode", "app-mode", "hotspot-panel-mode");

    if (this.isMobile && isGameStarted()) {
      showMobileJoystickAfterOverlay();
    }

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
