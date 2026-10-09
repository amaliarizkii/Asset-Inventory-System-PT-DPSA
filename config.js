/**
 * config.js - Konfigurasi Terpusat PT DPSA Asset & Inventory
 */
const CONFIG = {
  SPREADSHEET_ID: "1BISVBIrs7EgtzKDm0rArAQitYRHvzkkT8-VXB9N-cJk",
  SHEETS: {
    USERS: "Akses User",
    FIX_ASSET: "Fix Aset",
    INVENTORY: "Inventory"
  },

  // Ekstrak ID file Google Drive
  extractDriveId: function(url) {
    if (!url || typeof url !== 'string') return null;
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) return matchD[1];
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    return null;
  },

  // Endpoint gambar Google Drive bebas blokir
  formatDriveImageUrl: function(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'no image.png';
    const trimmed = rawUrl.trim();
    if (!trimmed) return 'no image.png';

    if (trimmed.startsWith('data:image') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
      return trimmed;
    }

    const fileId = this.extractDriveId(trimmed);
    if (fileId) {
      // Thumbnail Google Drive resolusi tinggi
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    return trimmed;
  },

  // Fallback melalui image proxy jika jaringan memblokir domain drive
  getBackupDriveImageUrl: function(rawUrl) {
    const fileId = this.extractDriveId(rawUrl);
    if (fileId) {
      const driveThumb = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      return `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(driveThumb)}`;
    }
    return 'no image.png';
  }
};

window.CONFIG = CONFIG;
