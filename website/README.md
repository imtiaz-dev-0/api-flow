# api-flow-client — Official Website

Official landing page and showcase for the **[api-flow-client](https://www.npmjs.com/package/api-flow-client)** npm package.

- **Production Domain:** [http://api-flow-client.online/](http://api-flow-client.online/) (redirects to HTTPS)
- **PayPal Support:** [https://paypal.me/imtiaz579](https://paypal.me/imtiaz579)

---

## 📁 File Structure for cPanel

All files in this folder are completely standalone individual files (vanilla HTML5, CSS3, and modern JS) with zero build step required.

```
website/
├── index.html        # Main landing page
├── style.css         # Individual stylesheet (Dark/Light theme, glassmorphism)
├── script.js         # Interactive demo, copy buttons, simulator
├── .htaccess         # cPanel/Apache config (HTTPS redirect, gzip, security)
├── CNAME             # api-flow-client.online
└── assets/
    ├── logo.svg      # High-res vector logo
    └── favicon.svg   # Favicon
```

---

## 🚀 How to Upload to cPanel (Step-by-Step)

### Option 1: File Manager (Easiest)

1. **Zip the contents** of this `website/` folder on your computer:
   - Select: `index.html`, `style.css`, `script.js`, `.htaccess`, and the `assets/` folder.
   - Compress them into a file named `website.zip`.
2. Log into your **cPanel**.
3. Open **File Manager** and navigate to your domain's document root (usually `public_html` or `public_html/api-flow-client.online`).
4. Click **Upload** and upload `website.zip`.
5. Select `website.zip` and click **Extract**.
6. Ensure `index.html` sits directly inside `public_html/` (not inside a subfolder).
7. Visit **[http://api-flow-client.online/](http://api-flow-client.online/)** in your browser!

### Option 2: FTP / SFTP (FileZilla / Cyberduck)

1. Connect to your cPanel host via FTP.
2. Navigate to `public_html/`.
3. Upload `index.html`, `style.css`, `script.js`, `.htaccess`, and the `assets/` directory.

---

## 🌐 DNS Settings for `api-flow-client.online`

If your domain registrar is different from your cPanel hosting:

1. **A Record:**
   - Host: `@`
   - Points to: `YOUR_CPANEL_SERVER_IP`
2. **CNAME Record:**
   - Host: `www`
   - Points to: `api-flow-client.online`

In cPanel, make sure to enable **AutoSSL / Let's Encrypt** under **SSL/TLS Status** so your site has the green padlock (`https://`).

---

## ☕ PayPal Support

The website includes pre-configured donation links pointing directly to:
- **`https://paypal.me/imtiaz579`**
- Preset tiers: $5, $15, $50, and custom amounts.
