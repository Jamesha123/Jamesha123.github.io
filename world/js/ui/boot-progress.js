const STAGES = {
  start: [0, 5],
  manifest: [5, 10],
  data: [10, 20],
  assets: [20, 92],
  world: [92, 100],
};

const BOOT_MIN_DURATION_MS = 1000;
const bootStartedAt = Date.now();

let currentPercent = 0;
let statusEl = null;
let barEl = null;
let percentEl = null;

function getElements() {
  if (!statusEl) {
    statusEl = document.getElementById("boot-status");
    barEl = document.getElementById("boot-progress-bar");
    percentEl = document.getElementById("boot-percent");
  }
  return { statusEl, barEl, percentEl };
}

export function setBootProgress(percent, message) {
  const next = Math.max(currentPercent, Math.min(100, Math.round(percent)));
  currentPercent = next;

  const { statusEl: status, barEl: bar, percentEl: percentLabel } = getElements();
  if (bar) {
    bar.style.width = next + "%";
  }
  if (percentLabel) {
    percentLabel.textContent = next + "%";
  }
  if (message && status) {
    status.textContent = message;
  }
}

export function setBootStageProgress(stage, fraction, message) {
  const range = STAGES[stage];
  if (!range) {
    if (message) {
      const { statusEl: status } = getElements();
      if (status) {
        status.textContent = message;
      }
    }
    return;
  }

  const clamped = Math.max(0, Math.min(1, fraction));
  const percent = range[0] + (range[1] - range[0]) * clamped;
  setBootProgress(percent, message);
}

export function getBootProgress() {
  return currentPercent;
}

export function finishBoot(message) {
  const elapsed = Date.now() - bootStartedAt;
  const remaining = Math.max(0, BOOT_MIN_DURATION_MS - elapsed);
  const startPercent = currentPercent;
  const finalMessage = message || "Ready";

  if (remaining <= 0) {
    setBootProgress(100, finalMessage);
    return Promise.resolve();
  }

  return new Promise(function (resolve) {
    const startTime = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - startTime) / remaining);
      const percent = startPercent + (100 - startPercent) * t;
      setBootProgress(percent, t < 1 ? "Loading..." : finalMessage);
      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    window.requestAnimationFrame(frame);
  });
}
