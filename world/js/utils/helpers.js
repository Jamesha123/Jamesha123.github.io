export function cacheBust(path) {
  return path + "?v=" + Date.now();
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
  return obj.properties[name] ?? null;
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

export function showFatalError(message) {
  const loading = document.getElementById("loading");
  loading.classList.remove("hidden");
  loading.textContent = message;
}

export function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}
