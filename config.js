/**
 * PT DPSA Asset & Inventory System - Configuration
 * Integrasi Google Spreadsheet & Global System Config
 */

const APP_CONFIG = {
  COMPANY_NAME: "PT DPSA",
  SYSTEM_TITLE: "Asset & Inventory System",
  
  // Google Spreadsheet ID dari URL yang diberikan
  SPREADSHEET_ID: "1BISVBIrs7EgtzKDm0rArAQitYRHvzkkT8-VXB9N-cJk",
  
  // Nama Sheet / Tabs di Spreadsheet
  SHEETS: {
    USERS: "Users",          // Kolom: username, password, nama, role
    FIX_ASSET: "Fix Asset",  // Kolom: no, kode_barang, nama_barang, tipe_ukuran, satuan, jumlah, tahun, kondisi, harga, lokasi, keterangan, gambar
    INVENTORY: "Inventory"   // Kolom yang sama persis dengan Fix Asset
  },

  // Base URL Google Visualization API (GViz) untuk ekspor data CSV/JSON secara live tanpa perlu API Key berbayar
  getGvizUrl: function(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  },

  // Kredensial lokal bawaan (digunakan jika spreadsheet dalam mode privat/offline)
  FALLBACK_USERS: [
    { username: "admin", password: "123", nama: "Admin GA", role: "Administrator" },
    { username: "keuangan", password: "123", nama: "Bu Tari", role: "Finance" },
    { username: "gudang", password: "123", nama: "Nisa", role: "Warehouse" }
  ],

  // Fallback awal jika koneksi spreadsheet belum dibuka aksesnya ke "Anyone with the link can view"
  DEFAULT_FIX_ASSET: [
    {
      id: "fa-1",
      kode: "FA/PO3/12/XII/DPSA/2016/KEU",
      nama: "Set Komputer",
      spek: "Monitor: LG\nCPU: Delux (Intel Core I7-Gen 2)",
      satuan: "Set",
      jumlah: 1,
      tahun: 2016,
      kondisi: "Baik",
      harga: 8612500,
      lokasi: "Ruang Keuangan",
      keterangan: "Bu Tari",
      gambar: "logo dpsa.png"
    },
    {
      id: "fa-2",
      kode: "FA/PO2/2/VI/DPSA/2018/PM",
      nama: "Phanel Saw/Mesin Felder",
      spek: "Hammer/K4 PerformmSN: 8697",
      satuan: "Unit",
      jumlah: 1,
      tahun: 2018,
      kondisi: "Baik",
      harga: 54474624,
      lokasi: "Produksi Mesin",
      keterangan: "-",
      gambar: "no image.png"
    },
    {
      id: "fa-3",
      kode: "FA/PO3/14/VII/DPSA/2018/M",
      nama: "AC Window",
      spek: "-",
      satuan: "Unit",
      jumlah: 1,
      tahun: 2018,
      kondisi: "Baik",
      harga: 0,
      lokasi: "Maintenance - Gudang",
      keterangan: "-",
      gambar: "no image.png"
    },
    {
      id: "fa-4",
      kode: "FA/PO3/12/X/DPSA/2018/M",
      nama: "Komputer",
      spek: "Monitor: HP",
      satuan: "Unit",
      jumlah: 1,
      tahun: 2019,
      kondisi: "Baik",
      harga: 0,
      lokasi: "Maintenance - Gudang",
      keterangan: "Nisa",
      gambar: "no image.png"
    }
  ],

  DEFAULT_INVENTORY: [
    {
      id: "inv-1",
      kode: "INV/RM/01/DPSA/2026/LOG",
      nama: "Mata Pisau Circular Felder",
      spek: "Diameter 300mm Z72 Carbide",
      satuan: "Pcs",
      jumlah: 15,
      tahun: 2026,
      kondisi: "Baik",
      harga: 1250000,
      lokasi: "Gudang Sparepart",
      keterangan: "Rak A-02 / Pak Joko",
      gambar: "no image.png"
    },
    {
      id: "inv-2",
      kode: "INV/EL/04/DPSA/2026/MT",
      nama: "Refrigerant Gas Freon R32",
      spek: "Tabung Silinder 3 Kg",
      satuan: "Unit",
      jumlah: 8,
      tahun: 2026,
      kondisi: "Baik",
      harga: 420000,
      lokasi: "Maintenance - Gudang",
      keterangan: "Zona Servis AC",
      gambar: "no image.png"
    }
  ]
};
