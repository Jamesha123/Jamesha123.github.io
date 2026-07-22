const STORAGE_KEY = "world.achievements.v1";
const META_IDS = new Set(["collector", "completionist"]);

let instance = null;

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") {
      return { unlocked: {}, seenTs: 0 };
    }
    return {
      unlocked: parsed.unlocked && typeof parsed.unlocked === "object" ? parsed.unlocked : {},
      seenTs: Number(parsed.seenTs) || 0,
    };
  } catch (_error) {
    return { unlocked: {}, seenTs: 0 };
  }
}

function writeState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      unlocked: state.unlocked,
      seenTs: state.seenTs,
    })
  );
}

export class AchievementStore {
  constructor(definitions) {
    this.definitions = Array.isArray(definitions) ? definitions : [];
    this.definitionMap = new Map();
    this.definitions.forEach((entry) => {
      if (entry && entry.id) {
        this.definitionMap.set(entry.id, entry);
      }
    });
    this.state = readState();
    this.listeners = new Set();
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyChange(unlockedId) {
    this.listeners.forEach(function (listener) {
      listener(unlockedId || null);
    });
  }

  getDefinitions() {
    return this.definitions.slice();
  }

  getDefinition(id) {
    return this.definitionMap.get(id) || null;
  }

  isUnlocked(id) {
    return !!this.state.unlocked[id];
  }

  getUnlockRecord(id) {
    return this.state.unlocked[id] || null;
  }

  unlockedCount(excludeMeta) {
    return Object.keys(this.state.unlocked).filter(function (id) {
      return !excludeMeta || !META_IDS.has(id);
    }).length;
  }

  getUnreadCount() {
    const seenTs = this.state.seenTs;
    let count = 0;
    Object.keys(this.state.unlocked).forEach(function (id) {
      const record = this.state.unlocked[id];
      if (record && record.ts > seenTs) {
        count += 1;
      }
    }, this);
    return count;
  }

  markAllSeen() {
    const unlocked = this.state.unlocked;
    const newest = Object.keys(unlocked).reduce(function (max, id) {
      const ts = unlocked[id].ts || 0;
      return Math.max(max, ts);
    }, 0);
    if (newest > this.state.seenTs) {
      this.state.seenTs = newest;
      writeState(this.state);
      this.notifyChange(null);
    }
  }

  unlock(id) {
    if (!this.definitionMap.has(id) || this.isUnlocked(id)) {
      return false;
    }

    this.state.unlocked[id] = { ts: Date.now() };
    writeState(this.state);
    this.checkMetaAchievements();
    this.notifyChange(id);
    return true;
  }

  checkMetaAchievements() {
    const regularUnlocked = Object.keys(this.state.unlocked).filter(function (id) {
      return !META_IDS.has(id);
    }).length;

    if (regularUnlocked >= 5) {
      this.unlock("collector");
    }

    const regularTotal = this.definitions.filter(function (entry) {
      return entry && entry.id && !META_IDS.has(entry.id);
    }).length;

    if (regularTotal > 0 && regularUnlocked >= regularTotal) {
      this.unlock("completionist");
    }
  }

  getEntriesForLog() {
    return this.definitions.map((definition) => {
      const record = this.getUnlockRecord(definition.id);
      return {
        definition: definition,
        unlocked: !!record,
        ts: record ? record.ts : null,
        unread: record ? record.ts > this.state.seenTs : false,
      };
    });
  }
}

export function initAchievementStore(definitions) {
  instance = new AchievementStore(definitions);
  return instance;
}

export function getAchievementStore() {
  return instance;
}
