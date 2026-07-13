export class VirtualJoystick {
  constructor(rootEl) {
    if (!rootEl) {
      throw new Error("VirtualJoystick requires a root element.");
    }

    this.root = rootEl;
    this.base = rootEl.querySelector(".joystick-base");
    this.stick = rootEl.querySelector(".joystick-stick");

    if (!this.base || !this.stick) {
      throw new Error("VirtualJoystick markup is missing base or stick elements.");
    }
    this.x = 0;
    this.y = 0;
    this.active = false;
    this.pointerId = null;
    this.maxRadius = 42;
    this.baseCenter = { x: 0, y: 0 };

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.root.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
  }

  show() {
    this.root.hidden = false;
    this.root.setAttribute("aria-hidden", "false");
  }

  hide() {
    this.reset();
    this.root.hidden = true;
    this.root.setAttribute("aria-hidden", "true");
  }

  getVector() {
    return { x: this.x, y: this.y };
  }

  containsPoint(clientX, clientY) {
    const rect = this.root.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  onPointerDown(event) {
    if (!this.containsPoint(event.clientX, event.clientY)) {
      return;
    }

    event.preventDefault();
    this.active = true;
    this.pointerId = event.pointerId;
    this.root.setPointerCapture(event.pointerId);
    this.updateStick(event.clientX, event.clientY);
  }

  onPointerMove(event) {
    if (!this.active || event.pointerId !== this.pointerId) {
      return;
    }

    event.preventDefault();
    this.updateStick(event.clientX, event.clientY);
  }

  onPointerUp(event) {
    if (!this.active || event.pointerId !== this.pointerId) {
      return;
    }

    event.preventDefault();
    this.reset();
  }

  updateStick(clientX, clientY) {
    const rect = this.base.getBoundingClientRect();
    this.baseCenter = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };

    let dx = clientX - this.baseCenter.x;
    let dy = clientY - this.baseCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.maxRadius) {
      dx = (dx / distance) * this.maxRadius;
      dy = (dy / distance) * this.maxRadius;
    }

    this.stick.style.transform = "translate(" + dx + "px, " + dy + "px)";

    this.x = dx / this.maxRadius;
    this.y = dy / this.maxRadius;
  }

  reset() {
    this.active = false;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.stick.style.transform = "translate(0, 0)";
  }
}
