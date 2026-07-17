# 🏺 Centrd: A Throwing Diary

> *Find your center. Challenge your limits. Log your growth.*

**Centrd** is a clean, modern, and private web-based diary designed for potters tracking their cylinder throw counts, stages, and challenge milestones (like the 200 Cylinder challenge). 

This version runs on a **100% self-hosted, local-first fullstack architecture**, meaning all potter profiles, throw logs, configurations, and photos are saved directly onto your own home server or local machine.

---

## ✨ Features

* **Local Potter Profiles:** Create multiple potter accounts (with custom names, studios, and pottery emoji stamp avatars) to share a single server on multiple devices.
* **Flexible Decimal Weights:** Log throws using precise decimal weights (e.g. `1.3 lb` or `0.8 kg`). The app automatically maps entries to the closest whole-number challenge class while preserving the exact decimal value in history logs.
* **Global Units:** Globally configure your dashboard and inputs to display in Pounds (`lb`) or Kilograms (`kg`).
* **Interactive Challenges:** Track pacing strategies including custom target dates or daily/weekly/monthly cadence targets.
* **Stage Progression & Gallery:** Log throw photos and update them chronologically through the 6 stages of clay (*Wet Clay*, *Leather Hard*, *Bone Dry*, *Bisqueware*, *Glazed*, and *Finished Glaze*).
* **Real-Time Cross-Device Sync:** Built-in Server-Sent Events (SSE) automatically stream updates between all connected devices in real-time. Log a throw on your phone in the studio, and watch the dashboard update instantly on your laptop.
* **ZIP Exporter:** Export your logs, metadata, and photos into a structured markdown journal and ZIP archive for offline backups.

---

## 🚀 Home Server Setup Walkthrough

Setting up Centrd on a home server (like a Raspberry Pi, NAS, Home Assistant host, or any computer on your network) is quick and requires no external databases or cloud API keys.

### 📋 Prerequisites
* **Node.js** (v18.0 or newer)
* **npm** (comes packaged with Node.js)

### 1. Download and Install
Clone the repository and install the fullstack dependencies:

```bash
# Clone the repository
git clone https://github.com/faberc/centrd.git
cd centrd

# Switch to the self-hosted branch
git checkout self-hosted

# Install packages
npm install
```

### 2. Compile and Start the Server
Build the optimized client files and boot the database backend:

```bash
# 1. Compile the frontend built assets
npm run build

# 2. Start the Express server
npm run server
```

The server is now running on port **`5000`**.

---

## 📱 Accessing Across Your Home Network

Once the server is running on your host machine, you can connect to it from any phone, tablet, or computer connected to your home Wi-Fi network.

### Step 1: Find your Server's IP Address
On your host server, open the terminal and find its local network IP address:

* **macOS / Linux:** Run `ifconfig` or `ip a` (look for `inet` under your active Wi-Fi or Ethernet adapter, e.g. `192.168.1.45`).
* **Windows:** Run `ipconfig` in Command Prompt (look for `IPv4 Address`).

### Step 2: Open Centrd on Client Devices
Open the web browser on your phone or tablet (e.g., Safari on iPhone, Chrome on Android) and navigate to your server's IP address on port `5000`:

```text
http://<YOUR-SERVER-IP-ADDRESS>:5000
```
*(Example: `http://192.168.1.45:5000`)*

> [!TIP]
> **Mobile Home Screen App:** You can add Centrd to your phone's home screen for an app-like experience!
> * **iOS (Safari):** Tap the **Share** button and select **"Add to Home Screen"**.
> * **Android (Chrome):** Tap the **Menu** (three dots) and select **"Add to Home Screen"** or **"Install App"**.

---

## 🛠️ Development Operations

If you want to run the application locally to test, modify code, or style components:

```bash
# Concurrently starts the backend server (port 5000) and Vite frontend server (port 5173)
npm run dev
```

Open **`http://localhost:5173/centrd/`** in your browser. Any requests to `/centrd/api` are automatically proxied to port `5000` by the dev server.

---

## 🔒 Backup & Privacy
* All databases are stored in the server directory under `server/data/db.json`.
* All photo uploads are saved inside `server/uploads/`.
* Both of these paths are ignored by Git (configured in `server/.gitignore`), ensuring your private clay diary records and studio photos are **never** committed or uploaded online.
