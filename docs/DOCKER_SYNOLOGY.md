# 🐳 Synology NAS & Docker Container Setup Guide

This guide explains how to host **Centrd** in a Docker container on a **Synology NAS** (or any Linux server running Docker) with external volume mounts for your JSON database and photo uploads.

Following the [Linuxserver container design pattern](https://docs.linuxserver.io/general/docker-compose/), this setup supports `PUID` and `PGID` environment variables to ensure container file permissions match your Synology NAS host user permissions.

---

## 📁 Directory & Storage Structure

When mounted to the container, all persistent application data is stored under the `/config` path on the host system:

```text
/volume1/docker/centrd/
└── config/
    ├── data/
    │   └── db.json       <-- Potter profiles, settings, throw count logs
    └── uploads/
        └── throw_photo_... <-- Studio throw photo attachments
```

You can view, edit, or back up `db.json` and photo files directly via **Synology File Station** or standard file shares (SMB/NFS).

---

## 👤 Finding your PUID and PGID

To prevent permission issues when writing to host folders on Synology NAS, set the container's `PUID` (User ID) and `PGID` (Group ID) to match your Synology user account.

1. SSH into your Synology NAS:
   ```bash
   ssh your_synology_user@<SYNOLOGY-IP>
   ```
2. Run the `id` command:
   ```bash
   id
   ```
3. Note your `uid` (e.g. `1026`) and `gid` (e.g. `100`). Use these values for `PUID` and `PGID` in your configuration.

---

## 🚀 Deployment Methods

### Option A: Deploying via Synology Container Manager (Recommended GUI)

1. Open **Container Manager** in DSM (DSM 7.2+).
2. Go to the **Project** tab and click **Create**.
3. Configure the project:
   * **Project Name:** `centrd`
   * **Path:** Choose or create `/docker/centrd` (e.g., `/volume1/docker/centrd`).
   * **Source:** Select **Create docker-compose.yml**.
4. Paste the following configuration:

```yaml
version: '3.8'

services:
  centrd:
    build: https://github.com/mosswild/centrd.git#main
    # Or use local path / custom image if building manually:
    # image: centrd:latest
    container_name: centrd
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - PUID=1026          # Replace with your Synology UID
      - PGID=100           # Replace with your Synology GID
      - TZ=America/New_York
      - PORT=5001
      - DATA_DIR=/config/data
      - UPLOADS_DIR=/config/uploads
    volumes:
      - /volume1/docker/centrd/config:/config
```

5. Click **Next** and finish setup. Container Manager will build/download the container, mount the `/config` directory, and start the service.

---

### Option B: Deploying via Docker Compose (SSH / CLI)

1. SSH into your Synology NAS:
   ```bash
   ssh your_user@<SYNOLOGY-IP>
   ```
2. Navigate to your Docker shared folder and clone the repository:
   ```bash
   cd /volume1/docker
   git clone https://github.com/mosswild/centrd.git
   cd centrd
   ```
3. Edit `docker-compose.yml` to set your `PUID` and `PGID`:
   ```bash
   nano docker-compose.yml
   ```
4. Build and start the container in detached mode:
   ```bash
   docker compose up -d --build
   ```

---

## 🌐 Accessing Centrd

Once the container is running, access Centrd in your web browser at:

```text
http://<YOUR-SYNOLOGY-IP>:5001
```
*(Example: `http://192.168.1.100:5001`)*

### Setting up a Custom Domain / HTTPS (Synology Reverse Proxy)

If you want a clean address like `https://centrd.local` or `https://centrd.myhome.nas`:

1. In DSM, open **Control Panel** > **Login Portal** > **Advanced** tab > **Reverse Proxy**.
2. Click **Create**:
   * **Source:**
     * Protocol: `HTTPS`
     * Hostname: `centrd.local` (or your domain)
     * Port: `443`
   * **Destination:**
     * Protocol: `HTTP`
     * Hostname: `localhost`
     * Port: `5001`
3. Click **Save**.

---

## 🔒 Backups & Restores

Since data and uploads are stored in an external mount (`/config`):
* **Backup:** Copy the `/volume1/docker/centrd/config` folder using **Synology Hyper Backup**, **Cloud Sync**, or File Station.
* **Restore:** Place your backed-up `config` folder into `/volume1/docker/centrd/` before launching the container.
