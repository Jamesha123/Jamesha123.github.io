(function () {
  const NWS_HEADERS = {
    Accept: "application/geo+json",
    "User-Agent": "Jamesha123 Portfolio NWS Demo (github.io)",
  };

  const NOMINATIM_HEADERS = {
    Accept: "application/json",
    "User-Agent": "Jamesha123 Portfolio NWS Demo (github.io)",
  };

  const mapEl = document.getElementById("map");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const emailInput = document.getElementById("emailInput");
  const phoneInput = document.getElementById("phoneInput");
  const subscribeBtn = document.getElementById("subscribeBtn");
  const selectedPlaceText = document.getElementById("selectedPlaceText");
  const lookupEmailInput = document.getElementById("lookupEmailInput");
  const loadSubsBtn = document.getElementById("loadSubsBtn");
  const subscriptionsList = document.getElementById("subscriptionsList");
  const subscriptionsEmpty = document.getElementById("subscriptionsEmpty");
  const alertsList = document.getElementById("alertsList");
  const alertsStatus = document.getElementById("alertsStatus");
  const checkAlertsBtn = document.getElementById("checkAlertsBtn");

  let map;
  let marker;
  let selectedPlace = { name: "None", lat: null, lng: null };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCoords(lat, lng) {
    if (lat == null || lng == null) {
      return "—";
    }
    return Number(lat).toFixed(4) + ", " + Number(lng).toFixed(4);
  }

  function updateSelectedPlace() {
    if (!selectedPlace.lat || !selectedPlace.lng) {
      selectedPlaceText.textContent = "Click the map or search for a location.";
      return;
    }

    selectedPlaceText.textContent =
      selectedPlace.name + " (" + formatCoords(selectedPlace.lat, selectedPlace.lng) + ")";
  }

  function setSelection(lat, lng, name, moveView) {
    selectedPlace = {
      name: name || "Dropped pin",
      lat: lat,
      lng: lng,
    };
    marker.setLatLng([lat, lng]);
    if (!marker._map) {
      marker.addTo(map);
    }
    if (moveView) {
      map.setView([lat, lng], Math.max(map.getZoom(), 8));
    }
    updateSelectedPlace();
  }

  async function reverseGeocode(lat, lng) {
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
      encodeURIComponent(lat) +
      "&lon=" +
      encodeURIComponent(lng);
    const response = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data && data.display_name ? data.display_name : null;
  }

  async function searchCity() {
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    searchBtn.disabled = true;
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&q=" +
        encodeURIComponent(query) +
        "&limit=1";
      const response = await fetch(url, { headers: NOMINATIM_HEADERS });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const results = await response.json();
      if (!results.length) {
        window.alert("City not found. Try a different search term.");
        return;
      }
      const result = results[0];
      setSelection(parseFloat(result.lat), parseFloat(result.lon), result.display_name, true);
    } catch (_error) {
      window.alert("Search failed. Please try again.");
    } finally {
      searchBtn.disabled = false;
    }
  }

  function renderSubscriptions(items) {
    subscriptionsList.innerHTML = "";
    if (!items.length) {
      subscriptionsEmpty.hidden = false;
      subscriptionsEmpty.textContent = lookupEmailInput.value.trim()
        ? "No subscriptions found for " + lookupEmailInput.value.trim() + "."
        : "Enter your email and load subscriptions.";
      return;
    }

    subscriptionsEmpty.hidden = true;
    items.forEach(function (sub) {
      const li = document.createElement("li");
      li.className = "subscription-card";
      li.innerHTML =
        '<div class="subscription-card__body">' +
        '<h3 class="subscription-card__title">' +
        escapeHtml(sub.topic.placeName) +
        "</h3>" +
        '<p class="subscription-card__meta">Location: ' +
        escapeHtml(formatCoords(sub.topic.latitude, sub.topic.longitude)) +
        "</p>" +
        '<p class="subscription-card__meta">Email: ' +
        escapeHtml(sub.email) +
        "</p>" +
        '<p class="subscription-card__meta">Phone: ' +
        escapeHtml(sub.phone || "Not provided") +
        "</p>" +
        "</div>" +
        '<button type="button" class="btn-danger" data-unsubscribe="' +
        sub.id +
        '">Unsubscribe</button>';
      subscriptionsList.appendChild(li);
    });
  }

  function applyProfileToForm(profile) {
    const email = profile && profile.email ? profile.email : "";
    const phone = profile && profile.phone ? profile.phone : "";
    if (email) {
      emailInput.value = email;
      lookupEmailInput.value = email;
    }
    if (phone) {
      phoneInput.value = phone;
    }
  }

  function loadSubscriptions(options) {
    const silent = options && options.silent;
    const email = lookupEmailInput.value.trim() || window.NwsStore.getActiveEmail();
    if (!email) {
      if (!silent) {
        window.alert("Please enter an email address.");
      }
      return false;
    }

    lookupEmailInput.value = email;
    emailInput.value = email;
    window.NwsStore.setProfile(email);
    renderSubscriptions(window.NwsStore.getByEmail(email));
    return true;
  }

  function restoreSession() {
    const profile = window.NwsStore.getProfile();
    applyProfileToForm(profile);
    loadSubscriptions({ silent: true });
  }

  function subscribe() {
    if (!selectedPlace.lat || !selectedPlace.lng) {
      window.alert("Select a place on the map first.");
      return;
    }
    const email = emailInput.value.trim();
    if (!email) {
      window.alert("Select a place and enter email.");
      return;
    }

    window.NwsStore.subscribe({
      placeName: selectedPlace.name,
      latitude: selectedPlace.lat,
      longitude: selectedPlace.lng,
      email: email,
      phone: phoneInput.value.trim(),
    });

    loadSubscriptions();
    if (typeof unlockWorldAchievement === "function") {
      unlockWorldAchievement("demo:nws-subscribe");
    }
    window.alert("Subscribed! (Saved in this browser — production app uses Spring Boot + SNS.)");
  }

  function severityClass(severity) {
    const value = String(severity || "").toLowerCase();
    if (value === "extreme" || value === "severe") {
      return "alert-card--severe";
    }
    if (value === "moderate") {
      return "alert-card--moderate";
    }
    return "alert-card--minor";
  }

  function renderAlerts(entries) {
    alertsList.innerHTML = "";
    if (!entries.length) {
      alertsList.innerHTML = '<li class="alerts-empty">No active alerts for your subscriptions.</li>';
      return;
    }

    entries.forEach(function (entry) {
      const li = document.createElement("li");
      li.className = "alert-card " + severityClass(entry.severity);
      li.innerHTML =
        '<div class="alert-card__head">' +
        '<h3 class="alert-card__title">' +
        escapeHtml(entry.event) +
        "</h3>" +
        '<p class="alert-card__location">' +
        escapeHtml(entry.placeName) +
        "</p>" +
        "</div>" +
        '<p class="alert-card__meta">' +
        escapeHtml(entry.areaDesc) +
        " · " +
        escapeHtml(entry.severity) +
        " · expires " +
        escapeHtml(entry.expires) +
        "</p>" +
        '<p class="alert-card__summary">' +
        escapeHtml(entry.summary) +
        "</p>" +
        '<p class="alert-card__notify">Production: email/SMS notification would be sent via Amazon SNS.</p>';
      alertsList.appendChild(li);
    });
  }

  async function fetchAlertsForPoint(lat, lng) {
    const url =
      "https://api.weather.gov/alerts/active?point=" +
      encodeURIComponent(lat) +
      "," +
      encodeURIComponent(lng);
    const response = await fetch(url, { headers: NWS_HEADERS });
    if (!response.ok) {
      throw new Error("NWS request failed (" + response.status + ")");
    }
    const data = await response.json();
    return Array.isArray(data.features) ? data.features : [];
  }

  async function checkAlerts() {
    const email = lookupEmailInput.value.trim() || emailInput.value.trim();
    const subscriptions = email ? window.NwsStore.getByEmail(email) : window.NwsStore.readAll();

    if (!subscriptions.length) {
      alertsStatus.textContent = "Subscribe to at least one location first.";
      renderAlerts([]);
      return;
    }

    checkAlertsBtn.disabled = true;
    alertsStatus.textContent = "Checking NWS alerts…";
    renderAlerts([]);

    const seen = new Set();
    const alerts = [];

    try {
      for (const sub of subscriptions) {
        const key =
          sub.topic.latitude.toFixed(4) + "," + sub.topic.longitude.toFixed(4);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const features = await fetchAlertsForPoint(sub.topic.latitude, sub.topic.longitude);
        features.forEach(function (feature) {
          const props = feature.properties || {};
          const summary = props.description || props.instruction || "No details provided.";
          alerts.push({
            placeName: sub.topic.placeName,
            event: props.event || props.headline || "Weather Alert",
            areaDesc: props.areaDesc || "Unknown area",
            severity: props.severity || "Unknown",
            expires: props.expires ? new Date(props.expires).toLocaleString() : "Unknown",
            summary: summary.length > 240 ? summary.slice(0, 240) + "…" : summary,
          });
        });
      }

      alertsStatus.textContent =
        alerts.length +
        " active alert(s) across " +
        seen.size +
        " subscribed location(s).";
      renderAlerts(alerts.slice(0, 20));
    } catch (error) {
      alertsStatus.textContent = "Could not load alerts. " + (error.message || "Network error");
      alertsList.innerHTML =
        '<li class="alerts-empty">The public NWS API may rate-limit requests. Try again in a moment.</li>';
    } finally {
      checkAlertsBtn.disabled = false;
    }
  }

  function initMap() {
    map = L.map(mapEl, { zoomControl: true }).setView([39.8283, -98.5795], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    marker = L.marker([39.8283, -98.5795], { draggable: true });

    map.on("click", function (event) {
      setSelection(event.latlng.lat, event.latlng.lng, "Dropped pin", false);
      reverseGeocode(event.latlng.lat, event.latlng.lng).then(function (name) {
        if (name) {
          selectedPlace.name = name;
          updateSelectedPlace();
        }
      });
    });

    marker.on("dragend", function () {
      const latlng = marker.getLatLng();
      setSelection(latlng.lat, latlng.lng, "Dropped pin", false);
      reverseGeocode(latlng.lat, latlng.lng).then(function (name) {
        if (name) {
          selectedPlace.name = name;
          updateSelectedPlace();
        }
      });
    });

    setTimeout(function () {
      map.invalidateSize();
    }, 0);
  }

  searchBtn.addEventListener("click", searchCity);
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchCity();
    }
  });

  subscribeBtn.addEventListener("click", subscribe);
  loadSubsBtn.addEventListener("click", loadSubscriptions);
  checkAlertsBtn.addEventListener("click", checkAlerts);

  subscriptionsList.addEventListener("click", function (event) {
    const button = event.target.closest("[data-unsubscribe]");
    if (!button) {
      return;
    }
    if (!window.confirm("Are you sure you want to unsubscribe from this location?")) {
      return;
    }
    window.NwsStore.remove(Number(button.getAttribute("data-unsubscribe")));
    loadSubscriptions();
  });

  initMap();
  updateSelectedPlace();
  restoreSession();
})();
