import { getFirebase } from "./firebase";
import { 
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";

const isMock = () => localStorage.getItem("throwing_log_use_mock_db") === "true";

// --- IndexedDB Setup for Offline/Mock Mode ---
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

// --- Auth Operations ---
export function subscribeToAuth(callback) {
  if (isMock()) {
    const mockUserJson = localStorage.getItem("throwing_log_mock_user");
    const mockUser = mockUserJson ? JSON.parse(mockUserJson) : null;
    
    // Simulate async auth state trigger
    const timer = setTimeout(() => callback(mockUser), 100);
    return () => clearTimeout(timer);
  } else {
    const { auth } = getFirebase();
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }
}

export async function signOutUser() {
  if (isMock()) {
    localStorage.removeItem("throwing_log_mock_user");
    window.location.reload();
  } else {
    const { auth } = getFirebase();
    if (auth) {
      await signOut(auth);
    }
  }
}

export function mockSignIn(email) {
  const mockUser = {
    uid: "mock-user-123",
    email: email || "potter@demo.com",
    displayName: "Studio Potter"
  };
  localStorage.setItem("throwing_log_mock_user", JSON.stringify(mockUser));
  window.location.reload();
}

// --- Challenge Settings ---
export async function loadSettings(userId) {
  if (isMock()) {
    const settings = await readLocal("settings", userId);
    if (settings) return settings;
    
    // Default structure matching 200 cylinder challenge
    return {
      userId,
      targetCylinders: 200,
      hasTimeLimit: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      scheduleType: "none", // "none" | "deadline" | "cadence"
      cadenceFrequency: 3,
      cadencePeriod: "week", // "day" | "week" | "month"
      globalUnit: "lb",
      weightCategories: [
        { id: "1lb", name: "1 lb Cylinder", weight: 1, unit: "lb", targetCount: 100 },
        { id: "2lb", name: "2 lb Cylinder", weight: 2, unit: "lb", targetCount: 50 },
        { id: "3lb", name: "3 lb Cylinder", weight: 3, unit: "lb", targetCount: 30 },
        { id: "5lb", name: "5 lb Cylinder", weight: 5, unit: "lb", targetCount: 20 }
      ]
    };
  } else {
    const { db } = getFirebase();
    const docRef = doc(db, "settings", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    
    return {
      userId,
      targetCylinders: 200,
      hasTimeLimit: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      scheduleType: "none", // "none" | "deadline" | "cadence"
      cadenceFrequency: 3,
      cadencePeriod: "week", // "day" | "week" | "month"
      globalUnit: "lb",
      weightCategories: [
        { id: "1lb", name: "1 lb Cylinder", weight: 1, unit: "lb", targetCount: 100 },
        { id: "2lb", name: "2 lb Cylinder", weight: 2, unit: "lb", targetCount: 50 },
        { id: "3lb", name: "3 lb Cylinder", weight: 3, unit: "lb", targetCount: 30 },
        { id: "5lb", name: "5 lb Cylinder", weight: 5, unit: "lb", targetCount: 20 }
      ]
    };
  }
}

export async function saveSettings(userId, settings) {
  if (isMock()) {
    await writeLocal("settings", { ...settings, userId });
  } else {
    const { db } = getFirebase();
    await setDoc(doc(db, "settings", userId), settings);
  }
}

// --- Cylinder Throw Logs ---
export async function addThrowLog(userId, throwData) {
  const id = "throw_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  const data = {
    id,
    userId,
    createdAt: new Date().toISOString(),
    photos: [], // Array of objects: { id, url, stage, timestamp }
    ...throwData
  };

  if (isMock()) {
    await writeLocal("throws", data);
    window.dispatchEvent(new CustomEvent("local-throws-updated"));
    return id;
  } else {
    const { db } = getFirebase();
    await setDoc(doc(db, "throws", id), {
      ...data,
      createdAt: serverTimestamp()
    });
    return id;
  }
}

export async function updateThrowLog(throwId, updates) {
  if (isMock()) {
    const existing = await readLocal("throws", throwId);
    if (existing) {
      const updated = { ...existing, ...updates };
      await writeLocal("throws", updated);
      window.dispatchEvent(new CustomEvent("local-throws-updated"));
    }
  } else {
    const { db } = getFirebase();
    await updateDoc(doc(db, "throws", throwId), updates);
  }
}

export async function deleteThrowLog(throwId) {
  if (isMock()) {
    await deleteLocal("throws", throwId);
    window.dispatchEvent(new CustomEvent("local-throws-updated"));
  } else {
    const { db } = getFirebase();
    await deleteDoc(doc(db, "throws", throwId));
  }
}

export function subscribeToThrows(userId, callback, errorCallback) {
  if (isMock()) {
    const fetchAndCallback = async () => {
      const all = await listLocal("throws");
      const filtered = all
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(filtered);
    };

    fetchAndCallback();
    
    window.addEventListener("local-throws-updated", fetchAndCallback);
    return () => {
      window.removeEventListener("local-throws-updated", fetchAndCallback);
    };
  } else {
    const { db } = getFirebase();
    const q = query(
      collection(db, "throws"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.createdAt && typeof d.createdAt.toDate === "function") {
          d.createdAt = d.createdAt.toDate().toISOString();
        }
        list.push(d);
      });
      callback(list);
    }, (error) => {
      console.warn("Firestore ordered subscription failed (possibly missing index). Falling back to client-side sorting.", error);
      const simpleQ = query(
        collection(db, "throws"),
        where("userId", "==", userId)
      );
      return onSnapshot(simpleQ, (snap) => {
        const list = [];
        snap.forEach((doc) => {
          const d = doc.data();
          if (d.createdAt && typeof d.createdAt.toDate === "function") {
            d.createdAt = d.createdAt.toDate().toISOString();
          }
          list.push(d);
        });
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(list);
      }, (err) => {
        console.error("Simple query fallback subscription failed:", err);
        if (errorCallback) errorCallback(err);
      });
    });
  }
}

// --- Image Upload Operation ---
export async function uploadThrowPhoto(userId, throwId, file, stageLabel = "Thrown") {
  if (isMock()) {
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
  } else {
    const { storage } = getFirebase();
    if (!storage) {
      throw new Error("Firebase Storage is not initialized.");
    }
    const photoId = "photo_" + Math.random().toString(36).substr(2, 9);
    const fileExtension = file.name.split('.').pop() || "jpg";
    const storagePath = `users/${userId}/throws/${throwId}/${photoId}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return {
      id: photoId,
      url,
      storagePath,
      stage: stageLabel,
      timestamp: new Date().toISOString()
    };
  }
}
