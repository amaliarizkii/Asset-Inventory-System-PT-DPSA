/**
 * script.js - Core Logic & Data Loader PT DPSA Asset & Inventory
 */

const VALID_USERS = [
  { u: "staff.it@dharmaputrainterior.co.id", p: "staff.itDPSA88", name: "Staff IT", role: "IT Support", initials: "IT" },
  { u: "hrga@dharmaputrainterior.co.id", p: "hrgaDPSA88", name: "HR & GA", role: "Human Resource & GA", initials: "HR" },
  { u: "keuangan@dharmaputrainterior.co.id", p: "keuanganDPSA88", name: "Keuangan", role: "Finance Accounting", initials: "KEU" }
];

let currentUser = null;
let fixAssets = [];
let inventoryItems = [];
let currentBatchType = 'fixasset';
let currentPaperSize = 'A4';

// Helper Format Gambar Drive (Fail-Safe jika CONFIG belum siap)
function formatImageUrl(driveId, rawUrl) {
  if (typeof CONFIG !== 'undefined' && CONFIG.formatDriveImageUrl) {
    if (driveId) return CONFIG.formatDriveImageUrl(`https://drive.google.com/file/d/${driveId}/view`);
    if (rawUrl) return CONFIG.formatDriveImageUrl(rawUrl);
  }
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  return 'no image.png';
}

// ==========================================
// FITUR TOGGLE SIDEBAR (EXPAND & MINI COLLAPSE)
// ==========================================
let isSidebarExpanded = true;

function toggleSidebar() {
  const sidebar = document.getElementById("mainSidebar");
  const toggleIcon = document.getElementById("sidebarToggleIcon");
  const textElements = document.querySelectorAll(".sidebar-text");
  
  if (!sidebar) return;
  
  isSidebarExpanded = !isSidebarExpanded;
  
  if (isSidebarExpanded) {
    // Mode Penuh (Expanded - Lebar 16rem / 256px)
    sidebar.classList.remove("w-20");
    sidebar.classList.add("w-64");
    
    // Tampilkan label teks menu
    textElements.forEach(el => {
      el.style.display = "";
      el.classList.remove("hidden");
    });

    if (toggleIcon) toggleIcon.setAttribute("data-lucide", "panel-left-close");
  } else {
    // Mode Mini Desktop (Collapsed - Tetap Berdiri dengan Lebar 5rem / 80px)
    sidebar.classList.remove("w-64");
    sidebar.classList.add("w-20");
    
    // Sembunyikan label teks (hanya tampilkan icon menu)
    textElements.forEach(el => {
      el.style.display = "none";
      el.classList.add("hidden");
    });

    if (toggleIcon) toggleIcon.setAttribute("data-lucide", "panel-left-open");
  }
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Generator URL QR Code Dinamis Sesuai Kode Masing-Masing
function getQrCodeUrl(code) {
  // Ambil URL dasar halaman tanpa index.html
  const baseUrl = window.location.href.split('index.html')[0].split('?')[0];
  // Susun URL barcode dengan parameter code ter-encode rapi
  const scanTargetUrl = `${baseUrl}barcode.html?code=${encodeURIComponent(code.trim())}`;
  
  // Masukkan URL utuh ke QR generator API
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanTargetUrl)}&margin=1`;
}

// ==========================================
// DATA BAWAAN LENGKAP DARI SPREADSHEET DPSA
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
  { no: 10, kode: "FA/PO3/12/IX/DPSA/2021/KP", nama: "Komputer", tipe: "Monitor: NEC CPU: Dazumba (Intel Core I3-6100)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", harga: 8000000, lokasi: "Produksi", keterangan: "Mas Rovel", driveId: "1Wt3avTnZ1M043sc5iEMN4_1tMCtVmAq9" }
];

const SEED_INVENTORY = [
  { no: 1, kode: "FA/PO3/12/VIII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: HP CPU: Infinity (Intel Core I7)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 8681700, keterangan: "Mas Maryanta", driveId: "1dcuhvUswFQLv85_VJ4OtyMyasa1Fluqm" },
  { no: 2, kode: "FA/PO3/12/IX/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: CUBE (AMD A6)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 4000000, keterangan: "Rendy", driveId: "1f1QrBof7aMw8yZu0mmngn5aMfNX1hZgE" },
  { no: 18, kode: "INV/DPSA/R.S&M.5/2020/1", nama: "TV", tipe: "Cocoa 42 inch", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 2700000, keterangan: "-", driveId: "" },
  { no: 23, kode: "INV/DPSA/R.S&M.7/2020/1", nama: "Meteran", tipe: "Krisbow 10138998", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 600, keterangan: "-", driveId: "" },
  { no: 24, kode: "INV/DPSA/R.S&M.7/2020/2", nama: "Meteran", tipe: "Krisbow 10106768", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 1800000, keterangan: "-", driveId: "" }
];

// ==========================================
// SISTEM LOGIN & OTENTIKASI LENGKAP
// ==========================================
function doLogin() {
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const errBox = document.getElementById("loginErrorMsg");

  const inputEmail = emailInput ? emailInput.value.trim().toLowerCase() : "";
  const inputPass = passInput ? passInput.value.trim() : "";

  const user = VALID_USERS.find(usr => {
    const fullEmail = usr.u.toLowerCase();
    const prefix = fullEmail.split("@")[0];
    return (inputEmail === fullEmail || inputEmail === prefix) && inputPass === usr.p;
  });

  if (user) {
    currentUser = user;
    try { sessionStorage.setItem("dpsa_logged_in", JSON.stringify(user)); } catch (e) {}
    
    // Sembunyikan Modal Login
    const modal = document.getElementById("loginModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }

    // Tampilkan App Container
    const app = document.getElementById("appContainer");
    if (app) {
      app.classList.remove("hidden");
      app.style.display = "flex";
    }

    // Update Profil User di Sidebar
    const nameEl = document.getElementById("userProfileName");
    const roleEl = document.getElementById("userProfileRole");
    const initEl = document.getElementById("userAvatarInitials");
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (initEl) initEl.textContent = user.initials;

    if (errBox) {
      errBox.classList.add("hidden");
      errBox.style.display = "none";
    }

    initData();
  } else {
    if (errBox) {
      errBox.textContent = "Username atau password salah!";
      errBox.classList.remove("hidden");
      errBox.style.display = "block";
    } else {
      alert("Username atau password salah!");
    }
  }
}

function pickAccount(email, pass) {
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  if (emailInput) emailInput.value = email;
  if (passInput) passInput.value = pass;
  doLogin();
}

window.onload = function() {
  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      const modal = document.getElementById("loginModal");
      const app = document.getElementById("appContainer");
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
      if (app) {
        app.classList.remove("hidden");
        app.style.display = "flex";
      }
      const nameEl = document.getElementById("userProfileName");
      const roleEl = document.getElementById("userProfileRole");
      const initEl = document.getElementById("userAvatarInitials");
      if (nameEl) nameEl.textContent = currentUser.name;
      if (roleEl) roleEl.textContent = currentUser.role;
      if (initEl) initEl.textContent = currentUser.initials;
      initData();
      return;
    }
  } catch (e) {}

  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
};

function logout() {
  try { sessionStorage.removeItem("dpsa_logged_in"); } catch (e) {}
  location.reload();
}

// Inisialisasi Data Awal
function initData() {
  fixAssets = SEED_FIX_ASSETS.map(item => ({
    ...item,
    gambar: formatImageUrl(item.driveId, null)
  }));

  inventoryItems = SEED_INVENTORY.map(item => ({
    ...item,
    gambar: formatImageUrl(item.driveId, null)
  }));

  try {
    localStorage.setItem("dpsa_cache_fa", JSON.stringify(fixAssets));
    localStorage.setItem("dpsa_cache_inv", JSON.stringify(inventoryItems));
  } catch (e) {}

  renderAll();
  syncDataViaJSONP();
}

// JSONP Sync Bebas CORS
function syncDataViaJSONP() {
  if (typeof CONFIG === 'undefined') return;

  window.handleFixAssetData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const parsed = [];
    json.table.rows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[2]?.v || "").trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama) return;
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
        gambar: formatImageUrl(null, String(c[11]?.v || ""))
      });
    });
    if (parsed.length > 0) {
      fixAssets = parsed;
      try { localStorage.setItem("dpsa_cache_fa", JSON.stringify(fixAssets)); } catch(e){}
      renderAll();
    }
  };

  window.handleInventoryData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const parsed = [];
    json.table.rows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[2]?.v || "").trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama) return;
      const valI = String(c[8]?.v || "").trim().toLowerCase();
      let kat = (valI === "v" || valI === "ya" || valI === "true") ? "Aktiva Tetap" : "Bukan Aktiva Tetap";
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
        gambar: formatImageUrl(null, String(c[11]?.v || ""))
      });
    });
    if (parsed.length > 0) {
      inventoryItems = parsed;
      try { localStorage.setItem("dpsa_cache_inv", JSON.stringify(inventoryItems)); } catch(e){}
      renderAll();
    }
  };

  const scriptFA = document.createElement("script");
  scriptFA.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleFixAssetData&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
  document.body.appendChild(scriptFA);

  const scriptInv = document.createElement("script");
  scriptInv.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleInventoryData&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
  document.body.appendChild(scriptInv);
}

function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);
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

  const elItemAll = document.getElementById("ovTotalItemAll");
  const elNilaiAll = document.getElementById("ovTotalNilaiAll");
  const elNilaiFA = document.getElementById("ovNilaiFixAsset");
  const elNilaiInv = document.getElementById("ovNilaiInventory");
  const badgeFA = document.getElementById("badgeCountFixAsset");
  const badgeInv = document.getElementById("badgeCountInventory");

  if (elItemAll) elItemAll.textContent = `${(totalFA + totalInv).toLocaleString("id-ID")} Item`;
  if (elNilaiAll) elNilaiAll.textContent = formatRupiah(nilaiFA + nilaiInv);
  if (elNilaiFA) elNilaiFA.textContent = formatRupiah(nilaiFA);
  if (elNilaiInv) elNilaiInv.textContent = formatRupiah(nilaiInv);
  if (badgeFA) badgeFA.textContent = fixAssets.length;
  if (badgeInv) badgeInv.textContent = inventoryItems.length;

  const topTable = document.getElementById("overviewTopTableBody");
  if (topTable) {
    topTable.innerHTML = "";
    [...fixAssets].sort((a, b) => b.harga - a.harga).slice(0, 5).forEach(item => {
      const qrUrl = getQrCodeUrl(item.kode);
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 border-b border-slate-100 text-xs";
      tr.innerHTML = `
        <td class="py-3.5 px-6 font-mono font-bold text-blue-700">${item.kode}</td>
        <td class="py-3.5 px-6 font-semibold text-slate-800">${item.nama}</td>
        <td class="py-3.5 px-6 text-slate-600">${item.lokasi}</td>
        <td class="py-3.5 px-6 text-right font-bold text-slate-900">${formatRupiah(item.harga)}</td>
        <td class="py-3.5 px-6 text-center">
          <div class="flex items-center justify-center gap-2">
            <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-200 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk lihat detail">
            <button onclick="openDetailData('${item.kode}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Lihat Detail Data</span>
            </button>
          </div>
        </td>
      `;
      topTable.appendChild(tr);
    });
  }
}

// Render Tabel Fix Asset
function renderFixAssetTable(filtered = null) {
  const tbody = document.getElementById("faTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || fixAssets;

  const totalEl = document.getElementById("faTotalItem");
  const nilaiEl = document.getElementById("faTotalNilai");
  if (totalEl) totalEl.textContent = `${data.length} Unit`;
  if (nilaiEl) nilaiEl.textContent = formatRupiah(data.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0));

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kode);
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-3.5 px-3 text-center text-slate-500">${idx + 1}</td>
      <td class="py-3.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="py-3.5 px-3 font-semibold text-slate-800">${item.nama}</td>
      <td class="py-3.5 px-3 text-slate-600 text-[11px] max-w-xs">${item.tipe}</td>
      <td class="py-3.5 px-2 text-center text-slate-600">${item.satuan}</td>
      <td class="py-3.5 px-2 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-3.5 px-2 text-center text-slate-600">${item.tahun}</td>
      <td class="py-3.5 px-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${item.kondisi}</span></td>
      <td class="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="py-3.5 px-3 text-slate-700 whitespace-nowrap">${item.lokasi}</td>
      <td class="py-3.5 px-3 text-slate-500 text-[11px]">${item.keterangan}</td>
      <td class="py-3.5 px-3 text-center">
        <img src="${item.gambar}" alt="${item.nama}" class="w-9 h-9 object-cover rounded-lg border border-slate-200 mx-auto" onerror="this.onerror=null;this.src='no image.png';">
      </td>
      <td class="py-3.5 px-4 text-center whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-300 bg-white p-0.5 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk lihat detail">
          <button onclick="openDetailData('${item.kode}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            <span>Lihat Detail Data</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

// Render Tabel Inventory
function renderInventoryTable(filtered = null) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || inventoryItems;

  const totalEl = document.getElementById("invTotalItem");
  const nilaiEl = document.getElementById("invTotalNilai");
  const qtyEl = document.getElementById("invTotalKuantitas");

  if (totalEl) totalEl.textContent = `${data.length} SKU`;
  if (nilaiEl) nilaiEl.textContent = formatRupiah(data.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0));
  if (qtyEl) qtyEl.textContent = data.reduce((s, i) => s + (i.jumlah || 1), 0).toLocaleString("id-ID");

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kode);
    const isAktiva = item.kategori === "Aktiva Tetap";
    const badgeClass = isAktiva ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-3.5 px-3 text-center text-slate-500">${idx + 1}</td>
      <td class="py-3.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="py-3.5 px-3 font-semibold text-slate-800">${item.nama}</td>
      <td class="py-3.5 px-3 text-slate-600 text-[11px] max-w-xs">${item.tipe}</td>
      <td class="py-3.5 px-2 text-center text-slate-600">${item.satuan}</td>
      <td class="py-3.5 px-2 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-3.5 px-2 text-center text-slate-600">${item.tahun}</td>
      <td class="py-3.5 px-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">${item.kondisi}</span></td>
      <td class="py-3.5 px-3 text-center whitespace-nowrap">
        <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${badgeClass}">
          ${item.kategori}
        </span>
      </td>
      <td class="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="py-3.5 px-3 text-slate-500 text-[11px]">${item.keterangan}</td>
      <td class="py-3.5 px-3 text-center">
        <img src="${item.gambar}" alt="${item.nama}" class="w-9 h-9 object-cover rounded-lg border border-slate-200 mx-auto" onerror="this.onerror=null;this.src='no image.png';">
      </td>
      <td class="py-3.5 px-4 text-center whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-300 bg-white p-0.5 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk lihat detail">
          <button onclick="openDetailData('${item.kode}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
            <span>Lihat Detail Data</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function openDetailData(kode) {
  window.open(`barcode.html?code=${encodeURIComponent(kode)}`, '_blank');
}

// ========================================================
// FITUR CETAK SELURUH BARCODE (PRESISI 5 x 5 CM & A4/A3 FIT)
// ========================================================
function openBatchPrintModal(type) {
  currentBatchType = type;
  const isFA = (type === 'fixasset');
  const list = isFA ? fixAssets : inventoryItems;
  
  const modal = document.getElementById("batchPrintModal");
  const title = document.getElementById("batchPrintTitle");
  const sub = document.getElementById("batchPrintSubtitle");
  const container = document.getElementById("barcodeGridContainer");

  if (!modal || !container) {
    console.error("Elemen modal batch print tidak ditemukan!");
    return;
  }

  title.textContent = isFA 
    ? "Cetak Barcode Fix Asset (Aktiva Tetap)" 
    : "Cetak Barcode Inventory (Persediaan)";
  
  sub.textContent = `Total ${list.length} label stiker terdaftar (Ukuran Presisi 5 x 5 cm)`;

  // Render Grid Barcode Stiker (100% Sesuai Gambar Referensi)
  container.innerHTML = "";
  
  list.forEach((item) => {
    const qrUrl = getQrCodeUrl(item.kode);
    const card = document.createElement("div");
    card.className = "sticker-5x5cm print-card";
    
    card.innerHTML = `
      <div class="sticker-header">
        <img src="logo dpsa.png" alt="Logo" class="sticker-logo" onerror="this.onerror=null;this.src='no image.png';">
        <div class="sticker-brand">
          <div class="sticker-title">PT DPSA</div>
          <div class="sticker-subtitle">Asset & Inventory System</div>
        </div>
      </div>

      <div class="sticker-qr-wrapper">
        <img src="${qrUrl}" alt="${item.kode}" class="sticker-qr-img">
      </div>

      <div class="sticker-footer">
        <div class="sticker-code">${item.kode}</div>
      </div>
    `;
    container.appendChild(card);
  });

  modal.classList.remove("hidden");
  modal.style.display = "flex";

  setPaperSize('A4');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeBatchPrintModal() {
  const modal = document.getElementById("batchPrintModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function setPaperSize(size) {
  currentPaperSize = size;
  const btnA4 = document.getElementById("btnPaperA4");
  const btnA3 = document.getElementById("btnPaperA3");
  const printableArea = document.getElementById("printableArea");
  const container = document.getElementById("barcodeGridContainer");

  if (!btnA4 || !btnA3 || !printableArea || !container) return;

  if (size === 'A4') {
    btnA4.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white transition shadow-sm";
    btnA3.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
    printableArea.className = "paper-sheet paper-a4";
    container.className = "grid-a4";
  } else {
    btnA3.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white transition shadow-sm";
    btnA4.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
    printableArea.className = "paper-sheet paper-a3";
    container.className = "grid-a3";
  }
}

function triggerPrint() {
  window.print();
}

// Navigasi & Filter
function filterFixAsset() {
  const q = document.getElementById("faSearchInput").value.toLowerCase();
  renderFixAssetTable(fixAssets.filter(i => i.kode.toLowerCase().includes(q) || i.nama.toLowerCase().includes(q) || i.lokasi.toLowerCase().includes(q)));
}

function filterInventory() {
  const q = document.getElementById("invSearchInput").value.toLowerCase();
  renderInventoryTable(inventoryItems.filter(i => i.kode.toLowerCase().includes(q) || i.nama.toLowerCase().includes(q) || i.keterangan.toLowerCase().includes(q)));
}

function switchTab(tabId) {
  // Sembunyikan semua section
  ['overview', 'fixasset', 'inventory'].forEach(s => {
    const secEl = document.getElementById(`section-${s}`);
    const navEl = document.getElementById(`nav-${s}`);
    if (secEl) secEl.classList.add('hidden');
    if (navEl) {
      navEl.className = "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer";
    }
  });
  
  // Tampilkan section target
  const targetSec = document.getElementById(`section-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetNav) {
    targetNav.className = "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition text-white bg-blue-600 shadow-md shadow-blue-900/40 cursor-pointer";
  }
  
  // Judul Header Bersih Tanpa Penomoran
  const titles = { 
    overview: "Overview", 
    fixasset: "Dashboard Fix Asset", 
    inventory: "Dashboard Inventory" 
  };
  const topTitle = document.getElementById("topBarTitle");
  if (topTitle) topTitle.textContent = titles[tabId];
}
