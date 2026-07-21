(function (global) {
  const STORAGE_KEY = "nws-demo-subscriptions-v2";

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function subscribe(payload) {
    const items = readAll();
    const subscription = {
      id: Date.now(),
      email: payload.email,
      phone: payload.phone || "",
      topic: {
        placeName: payload.placeName,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    };
    items.push(subscription);
    writeAll(items);
    return subscription;
  }

  function getByEmail(email) {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return [];
    }
    return readAll().filter(function (item) {
      return String(item.email || "")
        .trim()
        .toLowerCase() === normalized;
    });
  }

  function remove(id) {
    writeAll(
      readAll().filter(function (item) {
        return item.id !== id;
      })
    );
  }

  global.NwsStore = {
    subscribe: subscribe,
    getByEmail: getByEmail,
    remove: remove,
    readAll: readAll,
  };
})(window);
