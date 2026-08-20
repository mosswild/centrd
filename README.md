<p align="center">
  <img src="./public/favicon.svg" width="120" height="120" alt="Centrd Logo" />
</p>

# 🏺 Centrd: A Throwing Diary

> *Find your center. Challenge your limits. Log your growth.*

**Centrd** is a **free, open-source, and self-hostable** web-based diary designed for potters tracking their throw counts, stages, and challenge milestones (like the 200 Cylinder or 100 Bowl challenge). 

It runs on a **100% self-hosted, local-first architecture**, meaning all potter profiles, throw logs, configurations, and photos stay saved on your own home server or local machine with complete privacy.

---

## ✨ Features

* **Free, Open-Source & Self-Hostable:** 100% free and private software that you control. Run it on your home server (Synology NAS, Raspberry Pi, Docker) or local computer without cloud subscriptions or third-party trackers.
* **Multiple Potter Profiles & Studio Hosting:** Support multiple potter accounts with 100% data isolation on a single shared server — ideal for households with multiple potters or shared studio servers.
* **Custom Emoji Avatars:** Personalize your potter profile by choosing from default avatars or using your device's emoji keyboard to set any symbol you like.
* **iOS Safari Home Screen App & PWA Support:** Add Centrd directly to your iPhone or iPad home screen via Safari ("Add to Home Screen") for a full-screen, native app experience complete with custom clay touch icons and status bar styling.
* **Multiple Saved Challenges & Active Selector:** Create, save, and switch between multiple named challenge series (e.g. *"Spring 100 Bowl Challenge"*, *"Fall 200 Cylinder Sprint"*). Easily switch your active challenge, rename challenges in place, or create new ones right from Settings without losing any past progress.
* **Tag-Based Challenge Progress & Multi-Tagging:** Attach multiple challenge tags to any piece. Challenges track progress purely via tags, allowing a single entry to count toward multiple active or historical challenges simultaneously.
* **In-Place Challenge Renaming & Log Tag Migration:** Rename existing challenges anytime in Settings. Changing a challenge's title automatically updates all historical throw logs tagged with the old title so past progress stays perfectly synced.
* **Generic Pottery & Cylinder Targets:** Flexible target configuration supporting all pottery shapes (cylinders, bowls, mugs, plates, vases, pitchers) with custom weight classes and total challenge count goals.
* **Shareable Challenge Settings:** Export custom challenge configurations to JSON and share them with friends or studio mates so everyone can compete in the exact same challenge.
* **ZIP Logbook Backup & Rebuild:** Export your complete throwing log, sticky notes, and high-res photos into a structured markdown and ZIP archive. Import any exported ZIP backup file to rebuild your full journal and photo gallery on a new server or machine.
* **Pure Studio Logbook Mode (Disable Challenges Entirely):** Turn off challenges entirely with a single toggle in Settings to use Centrd as a peaceful, pressure-free studio diary with an unfiltered studio overview dashboard.
* **Interactive Sticky Notes:** Attach stage-specific sticky notes (e.g. *Wet Clay*, *Trimmed*, *Glaze Application*, *Fired*) to any entry. Notes are color-coded and organized in an interactive sticky-note stack on each entry card.
* **Full-Screen Lightbox & Stage Remapping:** View photos in high-res lightbox modals with instant stage remapping (reassign a photo's stage from Wet Clay to Bisque or Glazed without re-uploading).
* **Customizable Pottery Stages:** Add custom pottery stages (e.g. *Underglazed*, *Wood Fired*, *Raku Fired*) or delete/remap existing stages.
* **Custom Weight Classes & Class Targets:** Define custom weight categories with specific weights, names, units, and target counts.
* **Flexible Decimal Weights & Global Units:** Log throws using precise decimal weights (e.g. `1.3 lb` or `0.8 kg`). The app automatically maps entries to the closest whole-number challenge class while preserving the exact decimal value in history. Globally switch between Pounds (`lb`) and Kilograms (`kg`).
* **Pacing Strategies & Deadlines:** Track pacing strategies including custom target dates or daily/weekly/monthly cadence targets.
* **Real-Time Cross-Device Sync:** Built-in Server-Sent Events (SSE) automatically stream updates between all connected phones, tablets, and computers on your home network in real-time.

---

## 🚀 Home Server Setup Walkthrough

Setting up Centrd on a home server (like a Synology NAS, Raspberry Pi, Home Assistant host, or any local server) is quick and requires no external databases or cloud API keys.

---

### Option A: Docker Container & Synology NAS Deployment (Recommended for NAS)

Centrd can be deployed inside a Docker container with external volume mounts exposing the database (`db.json`) and photo uploads (`uploads/`) to your host filesystem.

Using `docker-compose`:

```yaml
version: '3.8'

services:
  centrd:
    build: .
    container_name: centrd
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - PUID=1000          # Set to your user ID (e.g. 1026 for Synology user)
      - PGID=1000          # Set to your group ID (e.g. 100 for Synology group)
      - TZ=America/New_York
      - PORT=5001
      - DATA_DIR=/config/data
      - UPLOADS_DIR=/config/uploads
    volumes:
      - ./config:/config  # Maps db.json & uploads folder to host
```

Start the container:
```bash
docker compose up -d --build
```

> 📖 **Synology NAS Setup Guide:** For step-by-step GUI instructions using **Synology Container Manager**, check out the [Synology NAS Docker Setup Guide](docs/DOCKER_SYNOLOGY.md).

---

### Option B: Local Node.js Setup (Bare Metal / Development)

#### 📋 Prerequisites
* **Node.js** (v18.0 or newer)
* **npm** (comes packaged with Node.js)

#### 1. Download and Install
Clone the repository and install the fullstack dependencies:

```bash
# Clone the repository
git clone https://github.com/mosswild/centrd.git
cd centrd

# Install packages
npm install
```

#### 2. Compile and Start the Server
From the root of your cloned `centrd` directory, build the optimized client files and boot the database backend:

```bash
# 1. Compile the frontend built assets
npm run build

# 2. Start the Express server
npm run server
```

The server is now running on port **`5001`**.

---

## 📱 Accessing Across Your Home Network

Once the server is running on your host machine, you can connect to it from any phone, tablet, or computer connected to your home Wi-Fi network.

### Step 1: Find your Server's IP Address
On your host server, open the terminal and find its local network IP address:

* **macOS / Linux:** Run `ifconfig` or `ip a` (look for `inet` under your active Wi-Fi or Ethernet adapter, e.g. `192.168.1.45`).
* **Windows:** Run `ipconfig` in Command Prompt (look for `IPv4 Address`).

### Step 2: Open Centrd on Client Devices
Open the web browser on your phone or tablet (e.g., Safari on iPhone, Chrome on Android) and navigate to your server's IP address on port `5001`:

```text
http://<YOUR-SERVER-IP-ADDRESS>:5001
```
*(Example: `http://192.168.1.45:5001`)*

> [!NOTE]
> **Custom Hostname (Local DNS):** If you prefer not to type your server's IP address and port number every time, you can configure a friendly hostname (like `http://centrd.local`). Check out the [Local DNS & Port Setup Guide](docs/DNS_SETUP.md) for instructions.

> [!TIP]
> **Mobile Home Screen App:** You can add Centrd to your phone's home screen for an app-like experience!
> * **iOS (Safari):** Tap the **Share** button and select **"Add to Home Screen"**.
> * **Android (Chrome):** Tap the **Menu** (three dots) and select **"Add to Home Screen"** or **"Install App"**.

---

## 🛠️ Development Operations

If you want to run the application locally to test, modify code, or style components:

```bash
# Concurrently starts the backend server (port 5001) and Vite frontend server (port 5173)
npm run dev
```

Open **`http://localhost:5173/centrd/`** in your browser. Any requests to `/centrd/api` are automatically proxied to port `5001` by the dev server.

---

## 🔒 Backup & Privacy
* All databases are stored in the server directory under `server/data/db.json`.
* All photo uploads are saved inside `server/uploads/`.
* Both of these paths are ignored by Git (configured in `server/.gitignore`), ensuring your private clay diary records and studio photos are **never** committed or uploaded online.

---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license.

* **Free for Personal Use**: Anyone is free to use, modify, share, and self-host this software for personal, educational, or studio use.
* **Non-Commercial**: Commercial use, selling copies of this software, monetizing derivative works, or profiting from its distribution is strictly prohibited.
* **ShareAlike**: Any derivative works or modifications must be distributed under the exact same non-commercial license.
