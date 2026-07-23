# 🌐 Local DNS & Port Setup Guide

This guide explains how to configure a friendly, natural hostname (like `http://centrd.local` or `http://centrd.home`) for your self-hosted **Centrd** diary, allowing you to bypass typing raw IP addresses and port numbers (`:5001`) on your home network.

---

## 🗺️ Step 1: Mapping the Hostname (DNS)

Choose one of the following methods to map a friendly name to your server's local IP address (e.g. `192.168.1.45`).

### Method A: Zero-Configuration mDNS (Easiest)
By default, most modern operating systems automatically broadcast their hostname on the local network as `<hostname>.local`.
1. Find your server's hostname (e.g. `pottery-pi` or `mac-studio`).
2. Visit **`http://[hostname].local:5001`** in your browser. 
3. This is built-in and requires no configuration on standard home routers.

### Method B: Pi-hole or AdGuard Home DNS (Cleanest)
If you run a local DNS resolver on your home network:
1. Open your Pi-hole or AdGuard Home admin dashboard.
2. Go to **Local DNS** -> **DNS Records**.
3. Create a record:
   * **Domain:** `centrd.home` (or `centrd.local`)
   * **IP Address:** `192.168.1.45` (your server's IP)
4. Save the record. You can now access it at `http://centrd.home:5001`.

### Method C: Public Domain Registrar Mapping
If you own a domain name (e.g. `yourname.com`):
1. In your registrar's DNS panel, add a new **A Record** (e.g., subdomain `diary.yourname.com`).
2. Point it to your **private local IP** (`192.168.1.45`).
3. Now, `http://diary.yourname.com:5001` will work.
   * *Note: This domain will only resolve when your devices are connected to your home Wi-Fi. Outside your home, it will timeout, ensuring local data privacy.*

---

## 🔌 Step 2: Bypassing the `:5001` Port Number

DNS only translates names to IPs. Browsers default HTTP requests to port **`80`** (and HTTPS to **`443`**). If your server runs on port `5001`, you must normally append `:5001` to the URL. 

To remove it, use one of the two strategies below:

### Strategy A: Run Centrd on Port 80 Directly
You can override the default server port to port `80`.
* **macOS / Linux:** Port 80 is privileged, so you must start the server with `sudo`:
  ```bash
  sudo PORT=80 npm run server
  ```
* **Windows (Command Prompt):**
  ```cmd
  set PORT=80 && npm run server
  ```

Now, typing **`http://centrd.local`** or **`http://centrd.home`** will open the app immediately.

### Strategy B: Set up a Reverse Proxy (Caddy)
If port `80` is already in use by other home services on your server, a reverse proxy handles forwarding traffic behind the scenes. **Caddy** is a lightweight, easy-to-use tool for this.

1. **Install Caddy** on your server.
2. Create a file named `Caddyfile` in your configuration folder containing:
   ```text
   centrd.local {
       reverse_proxy localhost:5001
   }
   ```
3. Start Caddy. It will listen on standard port 80 for `centrd.local` and seamlessly proxy traffic to port 5001. Typing **`http://centrd.local`** will now load the app.
