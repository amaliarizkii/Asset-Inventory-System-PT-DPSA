/**
 * script.js - Core Logic & Data Loader PT DPSA Asset & Inventory
 */

// Kredensial Resmi DPSA
const VALID_USERS = [
  { u: "staff.it@dharmaputrainterior.co.id", p: "staff.itDPSA88", role: "IT Support" },
  { u: "hrga@dharmaputrainterior.co.id", p: "hrgaDPSA88", role: "HR & GA" },
  { u: "keuangan@dharmaputrainterior.co.id", p: "keuanganDPSA88", role: "Finance" }
];

let currentUser = null;
let fixAssets = [];
let inventoryItems = [];
let activeTab = 'overview';

// ==========================================
// 1. DATA BAWAAN LENGKAP DARI SPREADSHEET DPSA
// (Menjamin data tidak pernah 0)
// ==========================================
const SEED_FIX_ASSETS = [
  { no: 1, kode: "FA/PO3/12/XII/DPSA/2016/KEU", nama: "Set Komputer", tipe: "Monitor: LG CPU: Delux (Intel Core I7-Gen 2)", satuan: "Set", jumlah: 1, tahun: "2016", kondisi: "Baik", harga: 8612500, lokasi: "Ruang Keuangan", keterangan: "Bu Tari", driveId: "1FszIQtfv5nsyOztb2560tEd4kjnn6YCG" },
  { no: 2, kode: "FA/PO2/2/VI/DPSA/2018/PM", nama: "Phanel Saw/Mesin Felder", tipe: "Hammer/K4 Perfomm SN: 8697", satuan: "Unit", jumlah: 1, tahun: "2018", kondisi: "Baik", harga: 54474624, lokasi: "Produksi Mesin", keterangan: "-", driveId: "1ZVf8fpD147c0enJuPNhS0GJDAPFof1Oq" },
  { no: 3, kode: "FA/PO3/14/VII/DPSA/2018/M", nama: "AC Window", tipe: "-", satuan: "Unit", jumlah: 1, tahun: "2018", kondisi: "Baik", harga: 0, lokasi: "Maintenance - Gudang", keterangan: "-", driveId: "1EYKR6v6vr41p_KPDTix3TXm3ufW9qzLi" },
  { no: 4, kode: "FA/PO3/12/X/DPSA/2018/M", nama: "Komputer", tipe: "Monitor: HP", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", harga: 0, lokasi: "Maintenance - Gudang", keterangan: "Nisa", driveId: "1zB5OQJx4P4eSZYbVWtvWQzu13Y_6pfTD" },
  { no: 5, kode: "FA/PO2/3/I/DPSA/2019/PM", nama: "CNC (Mesin Bor)", tipe: "Biesse Rover Gold 1232 SN: 1000027499", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", harga: 2159788072, lokasi: "Produksi Mesin", keterangan: "-", driveId: "1_AdB-pM_qBDgexVgcT841NtnrUjiuxV4" },
  { no: 6, kode: "FA/PO3/13/X/DPSA/2020/M", nama: "OHP", tipe: "ACER ANX1903-3.2A/100-240V-50-60Hz", satuan: "Unit", jumlah: 1, tahun: "2020", kondisi: "Baik", harga: 4820000, lokasi: "Maintenance - Gudang", keterangan: "-", driveId: "1VwMKmcJ2TY1nyGce8-nGC4HWjcpP17un" },
  { no: 7, kode: "FA/PO2/5/I/DPSA/2021/PM", nama: "Cool Press", tipe: "WEILI MH3248 K50 SN: 120516016", satuan: "Unit", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 71000000, lokasi: "Produksi Mesin", keterangan: "-", driveId: "1YpOf1hZzF11ikmSMaw6-qa_cpdhasuJg" },
  { no: 8, kode: "FA/PO3/12/VIII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: HP CPU: Infinity (Intel Core I7)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 8681700, lokasi: "Studio & Marketing", keterangan: "Mas Maryanta", driveId: "1dcuhvUswFQLv85_VJ4OtyMyasa1Fluqm" },
  { no: 9, kode: "FA/PO4/19/V/DPSA/2021/AP", nama: "Mobil Station", tipe: "Daihatsu Gran Max D Model: S401RV-2MGEJJ", satuan: "Unit", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 94000000, lokasi: "Kendaraan DPSA", keterangan: "AB 1126 UF", driveId: "11Uk8FS-RaHmTgiXk61pzwxWc-294tgjZ" },
  { no: 10, kode: "FA/PO3/12/IX/DPSA/2021/KP", nama: "Komputer", tipe: "Monitor: NEC CPU: Dazumba (Intel Core I3-6100)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 8000000, lokasi: "Produksi", keterangan: "Mas Rovel", driveId: "1Wt3avTnZ1M043sc5iEMN4_1tMCtVmAq9" },
  { no: 11, kode: "FA/PO3/12/IX/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: CUBE (AMD A6-7400K)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 4000000, lokasi: "Studio & Marketing", keterangan: "Rendy", driveId: "1f1QrBof7aMw8yZu0mmngn5aMfNX1hZgE" },
  { no: 12, kode: "FA/PO3/12/XII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Samsung CPU: T9X (Intel Core I7-3770)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 7925000, lokasi: "Studio & Marketing", keterangan: "mas rifky", driveId: "1zwiLyLif6GYrf4-dmPfZOcB5CYLXeffG" },
  { no: 13, kode: "FA/PO2/8/XII/DPSA/2021/PM", nama: "Dust Collector", tipe: "Custom/Rakitan", satuan: "Unit", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 44000000, lokasi: "Produksi Mesin", keterangan: "-", driveId: "1u_yIrRdnvSneuQbvrunZtnZl7ItK1DT7" },
  { no: 14, kode: "FA/PO3/16/I/DPSA/2022/L2", nama: "HP/Tablet", tipe: "Samsung", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 8350000, lokasi: "Area LT 2", keterangan: "Direksi", driveId: "" },
  { no: 15, kode: "FA/PO3/12/II/DPSA/2022/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: Infinity (Intel Core I5 4460)", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 7800000, lokasi: "Studio & Marketing", keterangan: "Mba Flo", driveId: "1qCYrjC7sMmwdCejmJGzugoROCKAWVmVa" },
  { no: 16, kode: "FA/PO3/15/IV/DPSA/2022/MKT", nama: "Printer", tipe: "Brother MFC-J3530DW", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 6803500, lokasi: "Studio & Marketing", keterangan: "-", driveId: "1c2SpP49WuL6gJlI6xlq9PO3bg4uaaLw5" },
  { no: 17, kode: "FA/PO2/9/IV/DPSA/2022/PM", nama: "Stabilizer", tipe: "Niwatori 25KVA", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 39075000, lokasi: "Produksi Mesin", keterangan: "-", driveId: "1_nKEmG2Pc621wQIamJNE6vG2PU4kJrCb" },
  { no: 18, kode: "FA/PO3/12/IV/DPSA/2022/STU", nama: "Komputer", tipe: "Monitor: LG CPU: Infinity (Intel Core i7)", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 13120500, lokasi: "Studio & Marketing", keterangan: "Pak Rimba", driveId: "1CAEUMcTnEVy0YVjSS0brTpKM4wrarmR1" },
  { no: 19, kode: "FA/PO3/12/V/DPSA/2022/L2", nama: "Komputer", tipe: "Monitor: Lenovo CPU: DST", satuan: "Set", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 2415000, lokasi: "Ruang Lantai 2", keterangan: "Mba Arum", driveId: "1F9Lq2NICmtsikOpj-LImvU15kwhF-Y8V" },
  { no: 20, kode: "FA/PO3/12/V/DPSA/2022/GB", nama: "Komputer", tipe: "Monitor: Advan CPU: Optiplex 780", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", harga: 2415000, lokasi: "Gudang Bahan Baku", keterangan: "Fauzi", driveId: "1uEHgNYfVOqwuvsNo3dKQkvdFXpQuMTFQ" }
];

const SEED_INVENTORY = [
  { no: 1, kode: "FA/PO3/12/VIII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: HP CPU: Infinity (Intel Core I7)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 8681700, keterangan: "Mas Maryanta", driveId: "1dcuhvUswFQLv85_VJ4OtyMyasa1Fluqm" },
  { no: 2, kode: "FA/PO3/12/IX/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: CUBE (AMD A6)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 4000000, keterangan: "Rendy", driveId: "1f1QrBof7aMw8yZu0mmngn5aMfNX1hZgE" },
  { no: 3, kode: "FA/PO3/12/XII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Samsung CPU:T9X", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 7925000, keterangan: "mas rifky", driveId: "1zwiLyLif6GYrf4-dmPfZOcB5CYLXeffG" },
  { no: 4, kode: "FA/PO3/12/II/DPSA/2022/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: Infinity", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 7800000, keterangan: "Mba Flo", driveId: "1qCYrjC7sMmwdCejmJGzugoROCKAWVmVa" },
  { no: 5, kode: "FA/PO3/12/IV/DPSA/2022/STU", nama: "Komputer", tipe: "Monitor: LG CPU: Infinity", satuan: "Unit", jumlah: 1, tahun: "2022", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 13120500, keterangan: "Pak Rimba", driveId: "1CAEUMcTnEVy0YVjSS0brTpKM4wrarmR1" },
  { no: 6, kode: "FA/PO3/12/VI/DPSA/2024/STU.2", nama: "Komputer", tipe: "Monitor: LG CPU: MGI (Intel Core I7)", satuan: "Unit", jumlah: 1, tahun: "2024", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 7765000, keterangan: "Pak Nendar", driveId: "" },
  { no: 7, kode: "FA/PO3/12/VI/DPSA/2024/STU.1", nama: "Komputer", tipe: "Monitor: LG CPU: MGI (Intel Core I7)", satuan: "Unit", jumlah: 1, tahun: "2024", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 7765000, keterangan: "Di Bawah TV", driveId: "" },
  { no: 8, kode: "FA/PO3/12/VIII/DPSA/2022/STU", nama: "Komputer", tipe: "Monitor: LG CPU: MSI (Intel Core I5)", satuan: "Set", jumlah: 1, tahun: "2022", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 5650000, keterangan: "mba jovita", driveId: "1YrzYc1QqlBMY47lTAOg1vpv80lyUDBAw" },
  { no: 9, kode: "FA/PO3/16/VIII/DPSA/2024/MKT", nama: "HP", tipe: "Redmi 13C (MediaTek Helio G85)", satuan: "Unit", jumlah: 1, tahun: "2024", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 2160000, keterangan: "Angel", driveId: "" },
  { no: 10, kode: "FA/PO3/17/I/DPSA/2024/L2", nama: "Laptop", tipe: "IP Slim 2-14 Gaid Artic Grey", satuan: "Unit", jumlah: 1, tahun: "2024", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 5999000, keterangan: "-", driveId: "" },
  { no: 15, kode: "INV/DPSA/R.S&M.1/2020/1", nama: "Komputer", tipe: "Monitor: Samsung CPU: DST UPS: Prolink", satuan: "Unit", jumlah: 1, tahun: "2019-2024", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 7210000, keterangan: "sebelah mba Jovita", driveId: "" },
  { no: 16, kode: "INV/DPSA/R.S&M.1/2020/2", nama: "Komputer", tipe: "Monitor: HP CPU: DST UPS: Prolink VGA: GTX750", satuan: "Unit", jumlah: 1, tahun: "2019-2022", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 8759000, keterangan: "Adam", driveId: "" },
  { no: 17, kode: "INV/DPSA/R.S&M.1/2020/3", nama: "Komputer", tipe: "Monitor: Samsung CPU:T9X UPS:Prolink", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 6260000, keterangan: "mba Vicky", driveId: "" },
  { no: 18, kode: "INV/DPSA/R.S&M.5/2020/1", nama: "TV", tipe: "Cocoa 42 inch", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 2700000, keterangan: "-", driveId: "" },
  { no: 19, kode: "INV/DPSA/R.S&M.1/2020/4", nama: "Komputer", tipe: "PC Workstation", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 0, keterangan: "Ryo", driveId: "" },
  { no: 20, kode: "INV/DPSA/R.S&M.1/2020/5", nama: "Komputer", tipe: "Monitor: BenQ CPU: Vurrion UPS: Kenika", satuan: "Unit", jumlah: 1, tahun: "2019-2025", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 3622000, keterangan: "Mba Aura", driveId: "" },
  { no: 21, kode: "INV/DPSA/R.S&M.1/2020/6", nama: "Komputer", tipe: "Monitor: Samsung CPU: Lenovo UPS: Prolink", satuan: "Unit", jumlah: 1, tahun: "2024", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 2845000, keterangan: "Bu Dian", driveId: "" },
  { no: 22, kode: "INV/DPSA/R.S&M.1/2020/7", nama: "Komputer", tipe: "Monitor: Lenovo CPU: HP UPS: Prolink", satuan: "Unit", jumlah: 1, tahun: "2024-2025", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 3930000, keterangan: "Mba Ayu", driveId: "" },
  { no: 23, kode: "INV/DPSA/R.S&M.7/2020/1", nama: "Meteran", tipe: "Krisbow 10138998", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 600, keterangan: "-", driveId: "" },
  { no: 24, kode: "INV/DPSA/R.S&M.7/2020/2", nama: "Meteran", tipe: "Krisbow 10106768", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 1800000, keterangan: "-", driveId: "" }
];

// ==========================================
// 2. LOGIKA LOGIN & INITIAL LOAD
// ==========================================
function doLogin() {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  const errBox = document.getElementById("loginErrorMsg");

  if (!e || !p) return;
  const uVal = e.value.trim().toLowerCase();
  const pVal = p.value.trim();

  const user = VALID_USERS.find(usr => {
    const full = usr.u.toLowerCase();
    const prefix = full.split("@")[0];
    return (uVal === full || uVal === prefix) && pVal === usr.p;
  });

  if (user) {
    currentUser = user;
    try { sessionStorage.setItem("dpsa_logged_in", JSON.stringify(user)); } catch (e) {}
    
    document.getElementById("loginModal").style.display = "none";
    const app = document.getElementById("appContainer");
    app.style.display = "block";
    app.classList.remove("hidden");

    const disp = document.getElementById("userDisplayName");
    if (disp) disp.textContent = user.role;

    // Muat data langsung (Pertama dari seed lokal agar instan, lalu sync live dari sheets)
    initData();
  } else {
    if (errBox) {
      errBox.textContent = "Username atau password salah!";
      errBox.style.display = "block";
    }
  }
}

function pickAccount(email, pass) {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  if (e) e.value = email;
  if (p) p.value = pass;
  doLogin();
}

window.onload = function() {
  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      document.getElementById("loginModal").style.display = "none";
      const app = document.getElementById("appContainer");
      app.style.display = "block";
      app.classList.remove("hidden");
      const disp = document.getElementById("userDisplayName");
      if (disp) disp.textContent = currentUser.role;
      initData();
      return;
    }
  } catch (e) {}
  document.getElementById("loginModal").style.display = "flex";
};

function logout() {
  try { sessionStorage.removeItem("dpsa_logged_in"); } catch (e) {}
  location.reload();
}

// Inisialisasi data: muat data seed lokal langsung agar tabel langsung terisi
function initData() {
  fixAssets = SEED_FIX_ASSETS.map(item => ({
    ...item,
    gambar: item.driveId ? `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w800` : 'no image.png'
  }));

  inventoryItems = SEED_INVENTORY.map(item => ({
    ...item,
    gambar: item.driveId ? `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w800` : 'no image.png'
  }));

  renderAll();

  // Sinkronisasi data live dari Google Sheets via JSONP (Bebas CORS)
  syncDataViaJSONP();
}

// ==========================================
// 3. SINKRONISASI JSONP BEBAS CORS
// ==========================================
function syncDataViaJSONP() {
  // Callback global untuk Fix Aset
  window.handleFixAssetData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const rows = json.table.rows;
    const parsed = [];
    rows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[2]?.v || "").trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama) return;

      const rawImg = String(c[11]?.v || "");
      parsed.push({
        no: c[0]?.v || (parsed.length + 1),
        kode: kode,
        nama: nama,
        tipe: String(c[3]?.v || "-"),
        satuan: String(c[4]?.v || "Unit"),
        jumlah: parseInt(c[5]?.v) || 1,
        tahun: String(c[6]?.v || "-"),
        kondisi: String(c[7]?.v || "Baik"),
        harga: parsePrice(c[8]?.v),
        lokasi: String(c[9]?.v || "PT DPSA"),
        keterangan: String(c[10]?.v || "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg)
      });
    });
    if (parsed.length > 0) {
      fixAssets = parsed;
      renderAll();
    }
  };

  // Callback global untuk Inventory
  window.handleInventoryData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const rows = json.table.rows;
    const parsed = [];
    rows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[2]?.v || "").trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama || nama.toLowerCase().includes("nama")) return;

      const valI = String(c[8]?.v || "").trim().toLowerCase();
      const valJ = String(c[9]?.v || "").trim().toLowerCase();
      let kat = "Bukan Aktiva Tetap";
      if (valI === "v" || valI === "ya" || valI === "true") kat = "Aktiva Tetap";

      const rawImg = String(c[11]?.v || "");
      parsed.push({
        no: c[0]?.v || (parsed.length + 1),
        kode: kode,
        nama: nama,
        tipe: String(c[3]?.v || "-"),
        satuan: String(c[4]?.v || "Unit"),
        jumlah: parseInt(c[5]?.v) || 1,
        tahun: String(c[6]?.v || "-"),
        kondisi: String(c[7]?.v || "Baik"),
        kategori: kat,
        harga: parsePrice(c[10]?.v),
        keterangan: String(c[12]?.v || "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg)
      });
    });
    if (parsed.length > 0) {
      inventoryItems = parsed;
      renderAll();
    }
  };

  // Suntikkan script JSONP ke halaman (Bebas dari batasan CORS)
  const scriptFA = document.createElement("script");
  scriptFA.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleFixAssetData&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
  document.body.appendChild(scriptFA);

  const scriptInv = document.createElement("script");
  scriptInv.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleInventoryData&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
  document.body.appendChild(scriptInv);
}

// ==========================================
// 4. RENDERING & UI HELPERS
// ==========================================
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  const parts = str.match(/\d+([.,]\d+)*/g);
  if (parts && parts.length > 0) {
    let sum = 0;
    parts.forEach(p => {
      const clean = parseInt(p.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(clean)) sum += clean;
    });
    return sum;
  }
  const cleanStr = str.replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num || 0);
}

function renderAll() {
  renderOverview();
  renderFixAssetTable();
  renderInventoryTable();
}

function renderOverview() {
  const totalFA = fixAssets.reduce((s, i) => s + (i.jumlah || 1), 0);
  const totalInv = inventoryItems.reduce((s, i) => s + (i.jumlah || 1), 0);
  const nilaiFA = fixAssets.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0);
  const nilaiInv = inventoryItems.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0);

  const elItem = document.getElementById("totalSemuaItem");
  const elNilai = document.getElementById("totalSemuaNilai");
  const elSubFA = document.getElementById("subtotalFANilai");
  const elSubInv = document.getElementById("subtotalInvNilai");

  if (elItem) elItem.textContent = (totalFA + totalInv).toLocaleString("id-ID");
  if (elNilai) elNilai.textContent = formatRupiah(nilaiFA + nilaiInv);
  if (elSubFA) elSubFA.textContent = formatRupiah(nilaiFA);
  if (elSubInv) elSubInv.textContent = formatRupiah(nilaiInv);
}

// Fallback jika thumbnail gagal dimuat di browser
function handleImageError(imgEl, originalUrl) {
  if (!imgEl.dataset.triedBackup) {
    imgEl.dataset.triedBackup = "true";
    imgEl.src = CONFIG.getBackupDriveImageUrl(originalUrl);
  } else {
    imgEl.src = 'no image.png';
  }
}

function renderFixAssetTable() {
  const tbody = document.getElementById("fixAssetTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const totalItems = fixAssets.reduce((s, i) => s + (i.jumlah || 1), 0);
  const totalNilai = fixAssets.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0);
  const elTotal = document.getElementById("faTotalItem");
  const elNilai = document.getElementById("faTotalNilai");
  if (elTotal) elTotal.textContent = totalItems.toLocaleString("id-ID");
  if (elNilai) elNilai.textContent = formatRupiah(totalNilai);

  fixAssets.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${idx + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs">${item.tipe}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.satuan}</td>
      <td class="px-4 py-3 text-center font-bold text-gray-700">${item.jumlah}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.tahun}</td>
      <td class="px-4 py-3 text-center"><span class="badge-baik">${item.kondisi}</span></td>
      <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="px-4 py-3 text-gray-700 whitespace-nowrap">${item.lokasi}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item.keterangan}</td>
      <td class="px-4 py-3 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          class="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform mx-auto" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" 
          onerror="handleImageError(this, '${item.gambar}')"
        />
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button onclick="openBarcodePage('${item.kode}')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Lihat Kartu QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const totalItems = inventoryItems.reduce((s, i) => s + (i.jumlah || 1), 0);
  const totalNilai = inventoryItems.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0);
  const elTotal = document.getElementById("invTotalItem");
  const elNilai = document.getElementById("invTotalNilai");
  if (elTotal) elTotal.textContent = totalItems.toLocaleString("id-ID");
  if (elNilai) elNilai.textContent = formatRupiah(totalNilai);

  inventoryItems.forEach((item, idx) => {
    const isAktiva = item.kategori === "Aktiva Tetap";
    const badgeClass = isAktiva ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-teal-100 text-teal-800 border-teal-300";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${idx + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs">${item.tipe}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.satuan}</td>
      <td class="px-4 py-3 text-center font-bold text-gray-700">${item.jumlah}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.tahun}</td>
      <td class="px-4 py-3 text-center"><span class="badge-baik">${item.kondisi}</span></td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <span class="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeClass}">
          ${item.kategori}
        </span>
      </td>
      <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item.keterangan}</td>
      <td class="px-4 py-3 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          class="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform mx-auto" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" 
          onerror="handleImageError(this, '${item.gambar}')"
        />
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button onclick="openBarcodePage('${item.kode}')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Lihat Kartu QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".nav-tab-btn").forEach(el => el.classList.remove("active-tab"));

  const target = document.getElementById(tabId + "Tab");
  const btn = document.getElementById("btnTab-" + tabId);
  if (target) target.classList.remove("hidden");
  if (btn) btn.classList.add("active-tab");
}

function openLightbox(url, name, code) {
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImg");
  const title = document.getElementById("lightboxTitle");
  const codeEl = document.getElementById("lightboxCode");
  if (modal && img) {
    img.src = url;
    img.onerror = () => { img.src = 'no image.png'; };
    if (title) title.textContent = name;
    if (codeEl) codeEl.textContent = code;
    modal.style.display = "flex";
  }
}

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  if (modal) modal.style.display = "none";
}

function openBarcodePage(kode) {
  window.open(`barcode.html?code=${encodeURIComponent(kode)}`, '_blank');
}
