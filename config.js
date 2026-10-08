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

  // Helper untuk mengekstrak Google Drive File ID
  extractDriveId: function(url) {
    if (!url || typeof url !== 'string') return null;
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) return matchD[1];
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    return null;
  },

  // Direct High-Res Image Streamer (Bebas Iframe/CSP block)
  formatDriveImageUrl: function(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'no image.png';
    const trimmed = rawUrl.trim();
    if (!trimmed) return 'no image.png';
    if (trimmed.startsWith('data:image') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
      return trimmed;
    }
    const fileId = this.extractDriveId(trimmed);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return trimmed;
  },

  // Fallback Thumbnail URL jika streaming pertama lambat
  getBackupDriveImageUrl: function(rawUrl) {
    const fileId = this.extractDriveId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return 'no image.png';
  }
};

// Aliaskan ke APP_CONFIG agar kompatibel jika ada pemanggilan lama
window.CONFIG = CONFIG;
window.APP_CONFIG = CONFIG;
