// --- Helper to detect if running on GitHub Pages (static demo mode) ---
const isStaticDemo = () => {
  return window.location.hostname.endsWith('github.io');
};

// --- IndexedDB Setup for Local Fallback / Demo Mode ---
let localDbPromise = null;
function getLocalDb() {
  if (localDbPromise) return localDbPromise;
  
  localDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("throwing_log_local_db", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("throws")) {
        db.createObjectStore("throws", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "userId" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  return localDbPromise;
}

async function readLocal(storeName, key) {
  const db = await getLocalDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeLocal(storeName, value) {
  const db = await getLocalDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteLocal(storeName, key) {
  const db = await getLocalDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function listLocal(storeName) {
  const db = await getLocalDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Local Auth Operations (Active Session in Browser) ---
export function subscribeToAuth(callback) {
  const getActiveUser = () => {
    try {
      const mockUserJson = localStorage.getItem("throwing_log_mock_user");
      return mockUserJson ? JSON.parse(mockUserJson) : null;
    } catch (e) {
      return null;
    }
  };
  
  // Initial check
  setTimeout(() => callback(getActiveUser()), 50);
  
  const handleAuthChange = () => {
    callback(getActiveUser());
  };
  
  window.addEventListener("local-auth-changed", handleAuthChange);
  return () => {
    window.removeEventListener("local-auth-changed", handleAuthChange);
  };
}

export async function signOutUser() {
  localStorage.removeItem("throwing_log_mock_user");
  window.dispatchEvent(new CustomEvent("local-auth-changed"));
}

export async function wipeApplicationData() {
  // 1. Reset backend database and uploads if connected to Express server
  if (!isStaticDemo()) {
    try {
      await fetch('/centrd/api/reset', { method: 'POST' });
    } catch (e) {
      console.error("Failed to call server reset API:", e);
    }
  }

  // 2. Clear local IndexedDB stores
  try {
    const db = await getLocalDb();
    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length > 0) {
      const tx = db.transaction(storeNames, "readwrite");
      storeNames.forEach(name => tx.objectStore(name).clear());
      await new Promise((resolve) => {
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    }
  } catch (e) {
    console.error("Failed to clear local IndexedDB stores:", e);
  }

  // 3. Clear all localStorage keys (profiles, auth session, theme preferences)
  localStorage.clear();
  window.dispatchEvent(new CustomEvent("local-auth-changed"));
}

export function signInProfile(profile) {
  localStorage.setItem("throwing_log_mock_user", JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("local-auth-changed"));
}

// --- Potter Profile Operations ---
export async function getProfiles() {
  if (isStaticDemo()) {
    try {
      return JSON.parse(localStorage.getItem("throwing_log_profiles") || "[]");
    } catch (e) {
      return [];
    }
  }
  const res = await fetch('/centrd/api/profiles');
  if (!res.ok) throw new Error('Failed to load profiles');
  return res.json();
}

export async function createProfile(name, studio = "", avatar = "🍯") {
  if (isStaticDemo()) {
    const profiles = await getProfiles();
    const id = "profile_" + Math.random().toString(36).substr(2, 9);
    const newProfile = { id, name, studio, avatar };
    profiles.push(newProfile);
    localStorage.setItem("throwing_log_profiles", JSON.stringify(profiles));
    return newProfile;
  }
  const res = await fetch('/centrd/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, studio, avatar })
  });
  if (!res.ok) throw new Error('Failed to create profile');
  return res.json();
}

export async function updateProfile(profileId, updates) {
  let updatedProfile = null;
  if (isStaticDemo()) {
    const profiles = await getProfiles();
    const idx = profiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], ...updates };
      localStorage.setItem("throwing_log_profiles", JSON.stringify(profiles));
      updatedProfile = profiles[idx];
    }
  } else {
    const res = await fetch(`/centrd/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    updatedProfile = await res.json();
  }

  if (updatedProfile) {
    const activeUserJson = localStorage.getItem("throwing_log_mock_user");
    if (activeUserJson) {
      const activeUser = JSON.parse(activeUserJson);
      if (activeUser.id === profileId) {
        const merged = { ...activeUser, ...updatedProfile };
        localStorage.setItem("throwing_log_mock_user", JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("local-auth-changed"));
      }
    }
  }

  return updatedProfile;
}

export async function deleteProfile(profileId) {
  if (isStaticDemo()) {
    const profiles = await getProfiles();
    const updated = profiles.filter(p => p.id !== profileId);
    localStorage.setItem("throwing_log_profiles", JSON.stringify(updated));

    const activeUserJson = localStorage.getItem("throwing_log_mock_user");
    if (activeUserJson) {
      const activeUser = JSON.parse(activeUserJson);
      if (activeUser.id === profileId) {
        localStorage.removeItem("throwing_log_mock_user");
        window.dispatchEvent(new CustomEvent("local-auth-changed"));
      }
    }

    try {
      await deleteLocal("settings", profileId);
      const throwsList = await listLocal("throws");
      for (const t of throwsList) {
        if (t.userId === profileId) {
          await deleteLocal("throws", t.id);
        }
      }
      window.dispatchEvent(new CustomEvent("local-throws-updated"));
    } catch (e) {
      console.error("Local clean error:", e);
    }
    return { success: true };
  }
  const res = await fetch(`/centrd/api/profiles/${profileId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete profile');
  return res.json();
}

// --- Challenge Settings Operations ---
export async function loadSettings(userId) {
  if (isStaticDemo()) {
    const settings = await readLocal("settings", userId);
    if (settings) return settings;
    
    return {
      userId,
      enableChallenge: true,
      challengeName: "200 Cylinder Challenge",
      targetCylinders: 200,
      hasTimeLimit: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      scheduleType: "none",
      cadenceFrequency: 3,
      cadencePeriod: "week",
      globalUnit: "lb",
      potteryStages: [
        'Wet Clay',
        'Trimmed',
        'Glaze Application',
        'Fired'
      ],
      weightCategories: [
        { id: "1lb", name: "1 lb Cylinder", weight: 1, unit: "lb", targetCount: 100 },
        { id: "2lb", name: "2 lb Cylinder", weight: 2, unit: "lb", targetCount: 50 },
        { id: "3lb", name: "3 lb Cylinder", weight: 3, unit: "lb", targetCount: 30 },
        { id: "5lb", name: "5 lb Cylinder", weight: 5, unit: "lb", targetCount: 20 }
      ]
    };
  }
  const res = await fetch(`/centrd/api/settings/${userId}`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function saveSettings(userId, settings) {
  if (isStaticDemo()) {
    await writeLocal("settings", { ...settings, userId });
    return;
  }
  const res = await fetch('/centrd/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...settings, userId })
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

// Helper to batch-remap photo and note stages across all throw entries for a user
export async function remapThrowStages(userId, oldStage, newStage, currentThrows = []) {
  let throwsToProcess = currentThrows;
  if (!throwsToProcess || throwsToProcess.length === 0) {
    if (isStaticDemo()) {
      const all = await listLocal("throws");
      throwsToProcess = all.filter(t => t.userId === userId);
    } else {
      const res = await fetch(`/centrd/api/throws/${userId}`);
      if (res.ok) {
        throwsToProcess = await res.json();
      }
    }
  }

  let count = 0;
  for (const t of throwsToProcess) {
    let modified = false;
    
    // Remap photos
    let updatedPhotos = t.photos;
    if (Array.isArray(t.photos)) {
      updatedPhotos = t.photos.map(p => {
        if (p.stage && p.stage.toLowerCase().trim() === oldStage.toLowerCase().trim()) {
          modified = true;
          return { ...p, stage: newStage };
        }
        return p;
      });
    }

    // Remap notesArray
    let updatedNotesArray = t.notesArray;
    if (Array.isArray(t.notesArray)) {
      updatedNotesArray = t.notesArray.map(n => {
        if (n.stage && n.stage.toLowerCase().trim() === oldStage.toLowerCase().trim()) {
          modified = true;
          return { ...n, stage: newStage };
        }
        return n;
      });
    }

    if (modified) {
      count++;
      const summaryText = updatedNotesArray ? updatedNotesArray.map(n => `[${n.stage || 'General'}] ${n.text}`).join('\n') : t.notes;
      await updateThrowLog(t.id, {
        photos: updatedPhotos,
        notesArray: updatedNotesArray,
        notes: summaryText
      });
    }
  }
  return count;
}

// --- Cylinder Throw Logs Operations ---
export async function addThrowLog(userId, throwData) {
  if (isStaticDemo()) {
    const id = "throw_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    const data = {
      id,
      userId,
      createdAt: new Date().toISOString(),
      photos: [],
      ...throwData
    };
    await writeLocal("throws", data);
    window.dispatchEvent(new CustomEvent("local-throws-updated"));
    return id;
  }
  const res = await fetch('/centrd/api/throws', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...throwData, userId })
  });
  if (!res.ok) throw new Error('Failed to add throw log');
  const data = await res.json();
  return data.id;
}

export async function updateThrowLog(throwId, updates) {
  if (isStaticDemo()) {
    const existing = await readLocal("throws", throwId);
    if (existing) {
      const updated = { ...existing, ...updates };
      await writeLocal("throws", updated);
      window.dispatchEvent(new CustomEvent("local-throws-updated"));
    }
    return;
  }
  const res = await fetch(`/centrd/api/throws/${throwId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update throw log');
  return res.json();
}

export async function deleteThrowLog(throwId) {
  if (isStaticDemo()) {
    await deleteLocal("throws", throwId);
    window.dispatchEvent(new CustomEvent("local-throws-updated"));
    return;
  }
  const res = await fetch(`/centrd/api/throws/${throwId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete throw log');
  return res.json();
}

// Real-Time Event Sync using Server-Sent Events (SSE)
export function subscribeToThrows(userId, callback, errorCallback) {
  if (isStaticDemo()) {
    const fetchAndCallback = async () => {
      try {
        const all = await listLocal("throws");
        const filtered = all
          .filter(t => t.userId === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(filtered);
      } catch (err) {
        console.error("Local load throws failed:", err);
        if (errorCallback) errorCallback(err);
      }
    };

    fetchAndCallback();
    
    window.addEventListener("local-throws-updated", fetchAndCallback);
    return () => {
      window.removeEventListener("local-throws-updated", fetchAndCallback);
    };
  }

  // Fetch initial logs list
  fetch(`/centrd/api/throws/${userId}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load initial throws list');
      return res.json();
    })
    .then(callback)
    .catch(err => {
      console.error("Initial logs fetch failed:", err);
      if (errorCallback) errorCallback(err);
    });

  // Open EventSource SSE stream
  const eventSource = new EventSource(`/centrd/api/throws/stream/${userId}`);
  
  eventSource.onmessage = (event) => {
    try {
      const list = JSON.parse(event.data);
      callback(list);
    } catch (e) {
      console.error("Failed to parse SSE data stream:", e);
    }
  };

  eventSource.onerror = (err) => {
    console.warn("EventSource connection encountered error", err);
  };

  return () => {
    eventSource.close();
  };
}

// --- Local Multipart Image Upload Operation ---
export async function uploadThrowPhoto(userId, throwId, file, stageLabel = "Thrown") {
  if (isStaticDemo()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          id: "photo_" + Math.random().toString(36).substr(2, 9),
          url: reader.result,
          stage: stageLabel,
          timestamp: new Date().toISOString()
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('photo', file);
  formData.append('userId', userId);
  formData.append('throwId', throwId);
  formData.append('stageLabel', stageLabel);

  const res = await fetch('/centrd/api/photos/upload', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload image file');
  return res.json();
}
