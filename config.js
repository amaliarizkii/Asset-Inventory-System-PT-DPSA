/**
 * config.js - Konfigurasi Spreadsheet & Pengaturan Terpusat PT DPSA
 */
const CONFIG = {
  SPREADSHEET_ID: "1BISVBIrs7EgtzKDm0rArAQitYRHvzkkT8-VXB9N-cJk",

  // Nama Sheet persis seperti tab di file Google Sheets Anda
  SHEETS: {
    USERS: "Akses User",
    FIX_ASSET: "Fix Aset",
    INVENTORY: "Inventory"
  },

  // GViz Data Query URL
  getGvizUrl: function(sheetName) {
    const encoded = encodeURIComponent(sheetName);
    return `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encoded}&headers=0`;
  },

  // Ekstrak ID Google Drive dan ubah jadi Direct Image URL
  formatDriveImageUrl: function(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'no image.png';
    const trimmed = rawUrl.trim();
    if (!trimmed) return 'no image.png';
    if (trimmed.startsWith('data:image') || trimmed.endsWith('.png') || trimmed.endsWith('.jpg') || trimmed.endsWith('.jpeg')) {
      return trimmed;
    }

    let fileId = null;
    const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      fileId = matchD[1];
    } else {
      const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        fileId = matchId[1];
      }
    }

    if (fileId) {
      // Gunakan thumbnail generator Google Drive beresolusi tinggi
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return trimmed;
  },

  // Kredensial default (sesuai sheet Akses User)
  DEFAULT_USERS: [
    { username: "staff.it@dharmaputrainterior.co.id", password: "staff.itDPSA88", role: "IT Support" },
    { username: "hrga@dharmaputrainterior.co.id", password: "hrgaDPSA88", role: "HR & GA" },
    { username: "keuangan@dharmaputrainterior.co.id", password: "keuanganDPSA88", role: "Finance" }
  ]
};
