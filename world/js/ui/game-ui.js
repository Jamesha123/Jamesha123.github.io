export class GameUI {
  constructor() {
    this.hintEl = document.getElementById("interaction-hint");
    this.modalOverlay = document.getElementById("modal-overlay");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBody = document.getElementById("modal-body");
    this.modalLinks = document.getElementById("modal-links");
    this.modalOpen = false;
    this.activeHotspot = null;
    this.scene = null;

    document.getElementById("modal-close").addEventListener("click", () => this.closeModal());
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
        this.closeModal();
      }
    });
  }

  bindScene(scene) {
    this.scene = scene;
  }

  setHint(text, visible) {
    this.hintEl.textContent = text;
    this.hintEl.classList.toggle("visible", visible);
  }

  openModal(hotspot) {
    this.modalOpen = true;
    this.activeHotspot = hotspot;
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
    this.setHint("", false);
  }

  closeModal() {
    this.modalOpen = false;
    this.activeHotspot = null;
    this.modalOverlay.classList.remove("open");
  }

  isModalOpen() {
    return this.modalOpen;
  }
}
