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

  // Helper untuk mengekstrak File ID Google Drive
  extractDriveId: function(url) {
    if (!url || typeof url !== 'string') return null;
    const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) return matchD[1];
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) return matchId[1];
    return null;
  },

  // Multi-tier Fallback Image URL untuk Google Drive
  formatDriveImageUrl: function(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'no image.png';
    const trimmed = rawUrl.trim();
    if (!trimmed) return 'no image.png';

    // Jika base64 atau path lokal
    if (trimmed.startsWith('data:image') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
      return trimmed;
    }

    const fileId = this.extractDriveId(trimmed);
    if (fileId) {
      // Endpoint thumbnail Google Drive resmi beresolusi tinggi
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return trimmed;
  },

  // Alternatif CDN jika thumbnail awal terhalang
  getBackupDriveImageUrl: function(rawUrl) {
    const fileId = this.extractDriveId(rawUrl);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return 'no image.png';
  }
};
