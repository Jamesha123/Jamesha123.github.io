(function (global) {
  const STORAGE_KEY = "nws-demo-subscriptions-v2";
  const PROFILE_KEY = "nws-demo-profile-v1";

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

  function readProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function writeProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function setProfile(email, phone) {
    const next = readProfile();
    const trimmedEmail = String(email || "").trim();
    if (trimmedEmail) {
      next.email = trimmedEmail;
    }
    if (phone !== undefined) {
      next.phone = String(phone || "").trim();
    }
    writeProfile(next);
    return next;
  }

  function getActiveEmail() {
    const profile = readProfile();
    if (profile.email) {
      return profile.email;
    }

    const items = readAll();
    const seen = new Set();
    let fallback = "";

    items.forEach(function (item) {
      const email = String(item.email || "").trim();
      const normalized = email.toLowerCase();
      if (!email || seen.has(normalized)) {
        return;
      }
      seen.add(normalized);
      if (!fallback) {
        fallback = email;
      }
    });

    return seen.size === 1 ? fallback : "";
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
    setProfile(payload.email, payload.phone || "");
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
    getActiveEmail: getActiveEmail,
    getProfile: readProfile,
    setProfile: setProfile,
  };
})(window);
