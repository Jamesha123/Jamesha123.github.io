import {
  hideMobileJoystickForOverlay,
  showMobileJoystickAfterOverlay,
} from "./mobile-controls.js?v=147";
import { isGameStarted } from "./title-screen.js?v=147";
import { isMobileDevice } from "../utils/device.js?v=147";

function formatUnlockTime(ts) {
  if (!ts) {
    return "";
  }
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export class AchievementLog {
  constructor(store) {
    this.store = store;
    this.isMobile = isMobileDevice();
    this.openState = false;
    this.overlay = document.getElementById("achievement-log-overlay");
    this.listEl = document.getElementById("achievement-log-list");
    this.summaryEl = document.getElementById("achievement-log-summary");
    this.toggleBtn = document.getElementById("achievement-log-btn");
    this.badgeEl = document.getElementById("achievement-log-badge");
    this.closeBtn = document.getElementById("achievement-log-close");
    this.toastEl = document.getElementById("achievement-toast");
    this.toastTimer = null;

    if (!this.overlay || !this.listEl || !this.toggleBtn || !this.store) {
      throw new Error("Achievement log markup is missing.");
    }

    this.handleKeydown = this.handleKeydown.bind(this);
    this.toggleBtn.addEventListener("click", () => this.toggle());
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });

    this.store.onChange((unlockedId) => {
      this.refreshBadge();
      if (unlockedId && !this.openState) {
        this.showToast(unlockedId);
      }
      if (this.openState) {
        this.render();
      }
    });

    this.refreshBadge();
  }

  isOpen() {
    return this.openState;
  }

  handleKeydown(event) {
    if (event.key === "Escape" && this.openState) {
      event.preventDefault();
      this.close();
    }
  }

  toggle() {
    if (this.openState) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.openState) {
      return;
    }

    this.openState = true;
    this.overlay.classList.add("open");
    this.overlay.setAttribute("aria-hidden", "false");
    this.toggleBtn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", this.handleKeydown);

    if (this.isMobile && isGameStarted()) {
      hideMobileJoystickForOverlay();
    }

    this.render();
    this.store.markAllSeen();
    this.refreshBadge();
    this.store.unlock("open-log");
  }

  close() {
    if (!this.openState) {
      return;
    }

    this.openState = false;
    this.overlay.classList.remove("open");
    this.overlay.setAttribute("aria-hidden", "true");
    this.toggleBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", this.handleKeydown);

    if (this.isMobile && isGameStarted()) {
      showMobileJoystickAfterOverlay();
    }
  }

  refreshBadge() {
    if (!this.badgeEl) {
      return;
    }

    const unread = this.store.getUnreadCount();
    this.badgeEl.hidden = unread === 0;
    this.badgeEl.textContent = unread > 99 ? "99+" : String(unread);
    this.toggleBtn.classList.toggle("achievement-log-btn--alert", unread > 0);
  }

  render() {
    const entries = this.store.getEntriesForLog();
    const unlocked = entries.filter(function (entry) {
      return entry.unlocked;
    }).length;
    const total = entries.length;

    if (this.summaryEl) {
      this.summaryEl.textContent = unlocked + " / " + total + " unlocked";
    }

    this.listEl.innerHTML = "";

    const sorted = entries.slice().sort(function (a, b) {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      if (a.unlocked && b.unlocked) {
        return (b.ts || 0) - (a.ts || 0);
      }
      return a.definition.title.localeCompare(b.definition.title);
    });

    sorted.forEach(function (entry) {
      const definition = entry.definition;
      const li = document.createElement("li");
      li.className = "achievement-log-item";
      if (entry.unlocked) {
        li.classList.add("achievement-log-item--unlocked");
        if (entry.unread) {
          li.classList.add("achievement-log-item--unread");
        }
      } else {
        li.classList.add("achievement-log-item--locked");
      }

      const icon = document.createElement("span");
      icon.className = "achievement-log-item__icon";
      icon.textContent = entry.unlocked ? definition.icon || "🏅" : "?";
      icon.setAttribute("aria-hidden", "true");

      const body = document.createElement("div");
      body.className = "achievement-log-item__body";

      const title = document.createElement("h3");
      title.className = "achievement-log-item__title";
      title.textContent = entry.unlocked
        ? definition.title
        : definition.hidden
          ? "Secret achievement"
          : definition.title;

      const description = document.createElement("p");
      description.className = "achievement-log-item__description";
      description.textContent = entry.unlocked
        ? definition.description
        : definition.hidden
          ? "Keep exploring to reveal this one."
          : definition.description;

      body.appendChild(title);
      body.appendChild(description);

      if (entry.unlocked && entry.ts) {
        const meta = document.createElement("p");
        meta.className = "achievement-log-item__meta";
        meta.textContent = "Unlocked " + formatUnlockTime(entry.ts);
        body.appendChild(meta);
      }

      li.appendChild(icon);
      li.appendChild(body);
      this.listEl.appendChild(li);
    }, this);
  }

  showToast(unlockedId) {
    const definition = this.store.getDefinition(unlockedId);
    if (!definition || !this.toastEl) {
      return;
    }

    this.toastEl.hidden = false;
    this.toastEl.classList.add("visible");
    this.toastEl.innerHTML =
      '<span class="achievement-toast__icon" aria-hidden="true">' +
      (definition.icon || "🏅") +
      "</span>" +
      '<span class="achievement-toast__copy">' +
      "<strong>Achievement unlocked</strong>" +
      "<span>" +
      definition.title +
      "</span>" +
      "</span>";

    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove("visible");
      window.setTimeout(() => {
        this.toastEl.hidden = true;
      }, 250);
    }, 3200);
  }
}
