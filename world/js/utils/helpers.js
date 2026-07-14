let cachedWorldRoot = null;

export function getWorldRootUrl() {
  if (!cachedWorldRoot) {
    var root =
      typeof window !== "undefined" && window.__WORLD_ROOT__ ? window.__WORLD_ROOT__ : null;
    if (!root) {
      throw new Error("World root is not configured.");
    }
    cachedWorldRoot = new URL(root, window.location.href);
  }
  return cachedWorldRoot;
}

export function resolveWorldAsset(relativePath) {
  if (!relativePath) {
    return relativePath;
  }
  if (/^https?:\/\//i.test(relativePath)) {
    return relativePath;
  }
  return new URL(String(relativePath).replace(/^\//, ""), getWorldRootUrl()).href;
}

export function cacheBust(path) {
  const resolved = resolveWorldAsset(path);
  const separator = resolved.includes("?") ? "&" : "?";
  return resolved + separator + "v=" + Date.now();
}
export function parseBooleanProperty(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return !!value;
}

export function getObjectProperty(obj, name) {
  if (!obj.properties) {
    return null;
  }
  if (Array.isArray(obj.properties)) {
    const prop = obj.properties.find(function (item) {
      return item.name === name;
    });
    return prop ? prop.value : null;
  }
  return obj.properties[name] != null ? obj.properties[name] : null;
}

export function getObjectFeetPosition(obj, tileSize) {
  const width = obj.width || tileSize;
  const height = obj.height || tileSize;

  if (obj.gid) {
    return {
      x: obj.x + width / 2,
      y: obj.y,
    };
  }

  return {
    x: obj.x + width / 2,
    y: obj.y + height,
  };
}

export function getObjectRectHitbox(obj, tileSize) {
  const width = obj.width || tileSize;
  const height = obj.height || tileSize;

  return {
    left: obj.x,
    top: obj.y,
    right: obj.x + width,
    bottom: obj.y + height,
    width: width,
    height: height,
  };
}

export function setBootStage(message) {
  const loading = document.getElementById("loading");
  if (!loading || loading.classList.contains("hidden")) {
    return;
  }
  loading.textContent = "Loading world...\n" + message;
}

export function showFatalError(message) {
  const loading = document.getElementById("loading");
  const version =
    typeof window !== "undefined" && window.__WORLD_VERSION__
      ? " (build v" + window.__WORLD_VERSION__ + ")"
      : "";
  const fullMessage = String(message || "Unknown error") + version;
  if (!loading) {
    console.error(fullMessage);
    return;
  }
  loading.classList.remove("hidden");
  loading.textContent = fullMessage;
}

export function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}
