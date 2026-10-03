/**
 * script.js - Core Engine PT DPSA Asset & Inventory System
 */

let appState = {
  currentUser: null,
  activeTab: 'overview',
  fixAssets: [],
  inventories: [],
  usersList: [...APP_CONFIG.DEFAULT_USERS]
};

// Inisialisasi saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  setupAuthSystem();
  setupEventListeners();
  checkAuthSession();
});

// ==========================================================
// 1. SISTEM AUTENTIKASI LANGSUNG (100% BEBAS MACET)
// ==========================================================
function setupAuthSystem() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.onsubmit = function(e) {
      e.preventDefault();
      executeLogin();
      return false;
    };
  }

  const btnSubmit = document.getElementById("btnLoginSubmit");
  if (btnSubmit) {
    btnSubmit.onclick = function(e) {
      e.preventDefault();
      executeLogin();
    };
  }
}

function checkAuthSession() {
  const saved = localStorage.getItem("dpsa_auth_session") || sessionStorage.getItem("dpsa_auth_session");
  if (saved) {
    try {
      appState.currentUser = JSON.parse(saved);
      grantAccess();
      return;
    } catch (e) {
      localStorage.removeItem("dpsa_auth_session");
    }
  }
  showLoginModal();
}

function showLoginModal() {
  const modal = document.getElementById("loginModal");
  const app = document.getElementById("appMainLayout");
  if (modal) modal.style.display = "flex";
  if (app) app.style.display = "none";
}

function hideLoginModal() {
  const modal = document.getElementById("loginModal");
  const app = document.getElementById("appMainLayout");
  if (modal) modal.style.display = "none";
  if (app) app.style.display = "flex";
}

function executeLogin() {
  const userField = document.getElementById("inputLoginUsername");
  const passField = document.getElementById("inputLoginPassword");
  const errorEl = document.getElementById("loginErrorAlert");

  if (!userField || !passField) return;

  const inputUser = userField.value.trim().toLowerCase();
  const inputPass = passField.value.trim();

  if (!inputUser || !inputPass) {
    showLoginError("Silakan masukkan username dan password.");
    return;
  }

  // Cek kecocokan kredensial (mendukung email lengkap, alias, atau username pendek)
  const matched = appState.usersList.find(u => {
    const full = (u.username || "").toLowerCase();
    const alias = (u.alias || "").toLowerCase();
    const prefix = full.split("@")[0];
    const userMatch = (full === inputUser || alias === inputUser || prefix === inputUser);
    return userMatch && u.password === inputPass;
  });

  if (matched) {
    appState.currentUser = matched;
    localStorage.setItem("dpsa_auth_session", JSON.stringify(matched));
    if (errorEl) errorEl.classList.add("hidden");
    grantAccess();
    showToast(`Selamat datang, ${matched.role || matched.username}!`, "success");
  } else {
    showLoginError("Username atau password salah! Periksa kembali kredensial Anda.");
  }
}

function showLoginError(msg) {
  const errorEl = document.getElementById("loginErrorAlert");
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  } else {
    alert(msg);
  }
}

// Pintasan login cepat untuk kemudahan akses
function quickFillLogin(type) {
  const u = document.getElementById("inputLoginUsername");
  const p = document.getElementById("inputLoginPassword");
  if (type === 'it') {
    u.value = "staff.it@dharmaputrainterior.co.id";
    p.value = "staff.itDPSA88";
  } else if (type === 'hrga') {
    u.value = "hrga@dharmaputrainterior.co.id";
    p.value = "hrgaDPSA88";
  } else if (type === 'keuangan') {
    u.value = "keuangan@dharmaputrainterior.co.id";
    p.value = "keuanganDPSA88";
  } else if (type === 'admin') {
    u.value = "admin";
    p.value = "123";
  }
}

function grantAccess() {
  hideLoginModal();
  updateHeaderProfile();
  loadAllDataFromSpreadsheet();
}

function logout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
    localStorage.removeItem("dpsa_auth_session");
    sessionStorage.removeItem("dpsa_auth_session");
    appState.currentUser = null;
    location.reload();
  }
}

function updateHeaderProfile() {
  if (!appState.currentUser) return;
  const nameEl = document.getElementById("headerUserName");
  const roleEl = document.getElementById("headerUserRole");
  const avatarEl = document.getElementById("headerUserAvatar");

  const name = appState.currentUser.alias || appState.currentUser.username.split("@")[0];
  if (nameEl) nameEl.textContent = name.toUpperCase();
  if (roleEl) roleEl.textContent = appState.currentUser.role || "Operator";
  if (avatarEl) avatarEl.textContent = name.substring(0, 2).toUpperCase();
}

// ==========================================================
// 2. PARSER & SINKRONISASI GOOGLE SPREADSHEET
// ==========================================================
async function fetchGvizRaw(sheetName) {
  const url = APP_CONFIG.getGvizUrl(sheetName);
  const resp = await fetch(url);
  const text = await resp.text();
  const raw = text.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(|\);$/g, "");
  const obj = JSON.parse(raw);
  return (obj.table && obj.table.rows) ? obj.table.rows : [];
}

function getCell(cell) {
  if (!cell) return "";
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return "";
}

// Parsing cerdas untuk nominal harga (mendukung multi-baris seperti '1.265.000 4.400.000 595.000')
function parseRupiahValue(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  const matches = str.match(/\d+([.,]\d+)*/g);
  if (matches && matches.length > 0) {
    let total = 0;
    matches.forEach(m => {
      const clean = parseInt(m.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(clean)) total += clean;
    });
    return total;
  }
  const cleanOnly = str.replace(/[^0-9]/g, '');
  return cleanOnly ? parseInt(cleanOnly, 10) : 0;
}

function formatRupiah(num) {
  if (!num || isNaN(num) || num === 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(num);
}

async function loadAllDataFromSpreadsheet() {
  toggleSyncBadge(true);
  try {
    // 1. Ambil Fix Aset
    const faRows = await fetchGvizRaw(APP_CONFIG.SHEETS.FIX_ASSET);
    appState.fixAssets = [];
    faRows.forEach((row, idx) => {
      const c = row.c || [];
      const kode = String(getCell(c[1])).trim();
      const nama = String(getCell(c[2])).trim();

      // Lewati header atau baris kosong
      if (!kode || kode.toLowerCase() === "kode barang" || !nama) return;

      const rawImg = String(getCell(c[11]) || "");
      appState.fixAssets.push({
        id: "fa-" + idx,
        no: getCell(c[0]) || (appState.fixAssets.length + 1),
        kode: kode,
        nama: nama,
        tipe: String(getCell(c[3]) || "-"),
        satuan: String(getCell(c[4]) || "Unit"),
        jumlah: parseInt(getCell(c[5])) || 1,
        tahun: String(getCell(c[6]) || "-"),
        kondisi: String(getCell(c[7]) || "Baik"),
        harga: parseRupiahValue(getCell(c[8])),
        lokasi: String(getCell(c[9]) || "PT DPSA"),
        keterangan: String(getCell(c[10]) || "-"),
        gambar: APP_CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg
      });
    });

    // 2. Ambil Inventory (Sesuai Struktur Screenshot Persis)
    // Kolom: No(0), Kode(1), Nama(2), Tipe(3), Satuan(4), Jumlah(5), Tahun(6), Kondisi(7),
    // Klasifikasi Aktiva Tetap(8), Klasifikasi Bukan Aktiva Tetap(9), Harga(10), Gambar(11), Keterangan/Letak(12)
    const invRows = await fetchGvizRaw(APP_CONFIG.SHEETS.INVENTORY);
    appState.inventories = [];
    invRows.forEach((row, idx) => {
      const c = row.c || [];
      const kode = String(getCell(c[1])).trim();
      const nama = String(getCell(c[2])).trim();

      // Lewati baris header bertingkat
      if (!kode || kode.toLowerCase().includes("kode") || !nama || nama.toLowerCase().includes("nama")) return;

      const aktivaTetapVal = String(getCell(c[8])).trim().toLowerCase();
      const bukanAktivaVal = String(getCell(c[9])).trim().toLowerCase();

      // Tentukan Klasifikasi Kategori
      let kategoriLabel = "Bukan Aktiva Tetap";
      if (aktivaTetapVal === "v" || aktivaTetapVal === "ya" || aktivaTetapVal === "1" || aktivaTetapVal === "x") {
        kategoriLabel = "Aktiva Tetap";
      } else if (bukanAktivaVal === "v" || bukanAktivaVal === "ya" || bukanAktivaVal === "1" || bukanAktivaVal === "x") {
        kategoriLabel = "Bukan Aktiva Tetap";
      } else if (aktivaTetapVal !== "") {
        kategoriLabel = "Aktiva Tetap";
      }

      const rawImg = String(getCell(c[11]) || "");
      appState.inventories.push({
        id: "inv-" + idx,
        no: getCell(c[0]) || (appState.inventories.length + 1),
        kode: kode,
        nama: nama,
        tipe: String(getCell(c[3]) || "-"),
        satuan: String(getCell(c[4]) || "Unit"),
        jumlah: parseInt(getCell(c[5])) || 1,
        tahun: String(getCell(c[6]) || "-"),
        kondisi: String(getCell(c[7]) || "Baik"),
        kategori: kategoriLabel, // "Aktiva Tetap" atau "Bukan Aktiva Tetap"
        harga: parseRupiahValue(getCell(c[10])),
        gambar: APP_CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg,
        lokasi: "Gudang & Operasional",
        keterangan: String(getCell(c[12]) || "-")
      });
    });

    // Simpan ke cache lokal untuk akses cepat
    localStorage.setItem("dpsa_cache_fa", JSON.stringify(appState.fixAssets));
    localStorage.setItem("dpsa_cache_inv", JSON.stringify(appState.inventories));

    renderActiveTab();
    showToast(`Sukses sinkron ${appState.fixAssets.length} Fix Asset dan ${appState.inventories.length} Inventory!`, "success");
  } catch (err) {
    console.error("Gagal sinkron data:", err);
    // Muat dari cache jika ada
    const cFA = localStorage.getItem("dpsa_cache_fa");
    const cInv = localStorage.getItem("dpsa_cache_inv");
    if (cFA && cInv) {
      appState.fixAssets = JSON.parse(cFA);
      appState.inventories = JSON.parse(cInv);
      renderActiveTab();
      showToast("Memuat data dari cache lokal (offline).", "warning");
    } else {
      showToast("Gagal terhubung ke Google Sheets.", "error");
    }
  } finally {
    toggleSyncBadge(false);
  }
}

function toggleSyncBadge(syncing) {
  const badge = document.getElementById("syncStatusIndicator");
  if (!badge) return;
  if (syncing) {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span><span class="text-[11px] text-amber-300 font-semibold">Menghubungkan Spreadsheet...</span>`;
  } else {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-[11px] text-emerald-300 font-semibold">Google Sheets Terhubung</span>`;
  }
}

// ==========================================================
// 3. RENDER VIEW (OVERVIEW, FIX ASSET, INVENTORY)
// ==========================================================
function switchModule(moduleName) {
  appState.activeTab = moduleName;

  ['overview', 'fixasset', 'inventory'].forEach(m => {
    const sec = document.getElementById(`section-${m}`);
    const nav = document.getElementById(`navBtn-${m}`);
    if (m === moduleName) {
      sec.classList.remove('hidden');
      nav.className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition text-white bg-blue-600 shadow-md shadow-blue-900/40";
    } else {
      sec.classList.add('hidden');
      nav.className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition";
    }
  });

  const titles = {
    overview: { title: "1. Overview", sub: "Rangkuman Total Item, Nilai Perolehan Fix Asset dan Inventory" },
    fixasset: { title: "2. Dashboard Fix Asset", sub: "Database Aktiva Tetap, Nilai Perolehan, Distribusi Area dan Tabel Item" },
    inventory: { title: "3. Dashboard Inventory", sub: "Database Persediaan, Klasifikasi Aktiva, Nilai Stok dan Tabel Item" }
  };

  document.getElementById("topPageTitle").textContent = titles[moduleName].title;
  document.getElementById("topPageSubtitle").textContent = titles[moduleName].sub;

  renderActiveTab();
}

function renderActiveTab() {
  document.getElementById("sidebarBadgeFA").textContent = appState.fixAssets.length;
  document.getElementById("sidebarBadgeInv").textContent = appState.inventories.length;

  if (appState.activeTab === 'overview') renderOverviewView();
  else if (appState.activeTab === 'fixasset') renderFixAssetView();
  else if (appState.activeTab === 'inventory') renderInventoryView();
}

// RENDER 1: OVERVIEW
function renderOverviewView() {
  const totalFA = appState.fixAssets.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalInv = appState.inventories.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const grandTotalItems = totalFA + totalInv;

  const nilaiFA = appState.fixAssets.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  const nilaiInv = appState.inventories.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  const grandTotalNilai = nilaiFA + nilaiInv;

  document.getElementById("ovGrandTotalNilai").textContent = formatRupiah(grandTotalNilai);
  document.getElementById("ovGrandTotalItems").textContent = `${grandTotalItems.toLocaleString("id-ID")} Item Terdaftar`;
  document.getElementById("ovSubNilaiFA").textContent = formatRupiah(nilaiFA);
  document.getElementById("ovSubItemsFA").textContent = `${appState.fixAssets.length} SKU (${totalFA} Unit Fisik)`;
  document.getElementById("ovSubNilaiInv").textContent = formatRupiah(nilaiInv);
  document.getElementById("ovSubItemsInv").textContent = `${appState.inventories.length} SKU (${totalInv} Unit Stok)`;

  // Tabel 5 Aset Nilai Tertinggi
  const combined = [...appState.fixAssets, ...appState.inventories].sort((a, b) => b.harga - a.harga).slice(0, 5);
  const tbody = document.getElementById("ovTopAssetsTableBody");
  tbody.innerHTML = "";

  combined.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-3.5 px-4 font-mono font-bold text-blue-700">${item.kode}</td>
      <td class="py-3.5 px-4">
        <span class="font-bold text-slate-800">${item.nama}</span>
        <p class="text-[11px] text-slate-400 truncate max-w-xs">${item.tipe}</p>
      </td>
      <td class="py-3.5 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.id.startsWith('fa') ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
          ${item.id.startsWith('fa') ? 'Fix Asset' : 'Inventory'}
        </span>
      </td>
      <td class="py-3.5 px-4 font-medium text-slate-700">${item.lokasi || item.keterangan}</td>
      <td class="py-3.5 px-4 text-right font-extrabold text-slate-900">${formatRupiah(item.harga)}</td>
      <td class="py-3.5 px-4 text-center">
        <button onclick="openScanModal('${item.kode}')" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition" title="Lihat Hasil Scan Paspor">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// RENDER 2: FIX ASSET
function renderFixAssetView() {
  const search = (document.getElementById("faSearchInput")?.value || "").toLowerCase();
  const filterLokasi = document.getElementById("faFilterLokasi")?.value || "ALL";

  // Populasi Dropdown Lokasi
  const lokasiSelect = document.getElementById("faFilterLokasi");
  const uniqueLocs = Array.from(new Set(appState.fixAssets.map(i => i.lokasi).filter(Boolean)));
  const curr = lokasiSelect.value;
  lokasiSelect.innerHTML = `<option value="ALL">Semua Lokasi</option>`;
  uniqueLocs.forEach(loc => {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    if (loc === curr) opt.selected = true;
    lokasiSelect.appendChild(opt);
  });

  const filtered = appState.fixAssets.filter(item => {
    const matchQ = item.kode.toLowerCase().includes(search) || item.nama.toLowerCase().includes(search) || item.keterangan.toLowerCase().includes(search);
    const matchLoc = (filterLokasi === "ALL") || (item.lokasi === filterLokasi);
    return matchQ && matchLoc;
  });

  const totalNilai = filtered.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  const totalItems = filtered.reduce((sum, i) => sum + (i.jumlah || 1), 0);

  document.getElementById("faTotalNilaiPerolehan").textContent = formatRupiah(totalNilai);
  document.getElementById("faTotalItemTerdaftar").textContent = `${totalItems} Unit (${filtered.length} Baris)`;

  // Distribusi Area Ruangan
  const distEl = document.getElementById("faAreaDistributionList");
  distEl.innerHTML = "";
  const counts = {};
  filtered.forEach(i => counts[i.lokasi] = (counts[i.lokasi] || 0) + (i.jumlah || 1));
  document.getElementById("faTotalLokasiBadge").textContent = `${Object.keys(counts).length} Area`;

  Object.entries(counts).forEach(([loc, cnt]) => {
    const pct = totalItems > 0 ? Math.round((cnt / totalItems) * 100) : 0;
    const div = document.createElement("div");
    div.className = "space-y-1";
    div.innerHTML = `
      <div class="flex justify-between text-xs font-semibold text-slate-700">
        <span>${loc}</span>
        <span>${cnt} Unit (${pct}%)</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2">
        <div class="bg-blue-600 h-2 rounded-full" style="width: ${pct}%"></div>
      </div>
    `;
    distEl.appendChild(div);
  });

  // Render Baris Tabel
  const tbody = document.getElementById("faTableBody");
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="text-center py-8 text-slate-400">Tidak ada item Fix Asset ditemukan.</td></tr>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/30 transition border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-4 px-3 text-center text-slate-400 font-bold">${item.no || (idx + 1)}</td>
      <td class="py-4 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">${item.kode}</td>
      <td class="py-4 px-4 font-bold text-slate-800">${item.nama}</td>
      <td class="py-4 px-4 text-slate-600 whitespace-pre-line max-w-xs">${item.tipe}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-700">${item.satuan}</td>
      <td class="py-4 px-3 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-600">${item.tahun}</td>
      <td class="py-4 px-3 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">${item.kondisi}</span>
      </td>
      <td class="py-4 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="py-4 px-4 font-semibold text-slate-800">${item.lokasi}</td>
      <td class="py-4 px-4 text-slate-600">${item.keterangan}</td>
      <td class="py-4 px-4 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')"
          class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-110 hover:border-blue-400 transition mx-auto"
          onerror="this.onerror=null;this.src='no image.png';"
        />
      </td>
      <td class="py-4 px-4 text-center whitespace-nowrap">
        <button onclick="openScanModal('${item.kode}')" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition" title="Lihat Tampilan Paspor Scan QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// RENDER 3: INVENTORY (Dengan Kolom Kategori: Aktiva Tetap / Bukan Aktiva Tetap)
function renderInventoryView() {
  const search = (document.getElementById("invSearchInput")?.value || "").toLowerCase();
  const filterKat = document.getElementById("invFilterKategori")?.value || "ALL";

  const filtered = appState.inventories.filter(item => {
    const matchQ = item.kode.toLowerCase().includes(search) || item.nama.toLowerCase().includes(search) || item.keterangan.toLowerCase().includes(search);
    const matchK = (filterKat === "ALL") || (item.kategori === filterKat);
    return matchQ && matchK;
  });

  const totalNilai = filtered.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  const totalItems = filtered.reduce((sum, i) => sum + (i.jumlah || 1), 0);

  document.getElementById("invTotalNilaiPerolehan").textContent = formatRupiah(totalNilai);
  document.getElementById("invTotalItemTerdaftar").textContent = `${totalItems} Unit (${filtered.length} Baris)`;

  // Distribusi Klasifikasi
  const distEl = document.getElementById("invCategoryDistributionList");
  distEl.innerHTML = "";
  const counts = { "Aktiva Tetap": 0, "Bukan Aktiva Tetap": 0 };
  filtered.forEach(i => {
    if (i.kategori === "Aktiva Tetap") counts["Aktiva Tetap"] += (i.jumlah || 1);
    else counts["Bukan Aktiva Tetap"] += (i.jumlah || 1);
  });

  Object.entries(counts).forEach(([kat, cnt]) => {
    const pct = totalItems > 0 ? Math.round((cnt / totalItems) * 100) : 0;
    const color = kat === "Aktiva Tetap" ? "bg-amber-500" : "bg-teal-500";
    const div = document.createElement("div");
    div.className = "space-y-1";
    div.innerHTML = `
      <div class="flex justify-between text-xs font-semibold text-slate-700">
        <span>${kat}</span>
        <span>${cnt} Unit (${pct}%)</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2">
        <div class="${color} h-2 rounded-full" style="width: ${pct}%"></div>
      </div>
    `;
    distEl.appendChild(div);
  });

  // Render Baris Tabel Inventory
  const tbody = document.getElementById("invTableBody");
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" class="text-center py-8 text-slate-400">Tidak ada item Inventory ditemukan.</td></tr>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const isAktiva = item.kategori === "Aktiva Tetap";
    const badgeClass = isAktiva ? "badge-aktiva" : "badge-bukan-aktiva";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-emerald-50/30 transition border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-4 px-3 text-center text-slate-400 font-bold">${item.no || (idx + 1)}</td>
      <td class="py-4 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">${item.kode}</td>
      <td class="py-4 px-4 font-bold text-slate-800">${item.nama}</td>
      <td class="py-4 px-4 text-slate-600 whitespace-pre-line max-w-xs">${item.tipe}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-700">${item.satuan}</td>
      <td class="py-4 px-3 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-600">${item.tahun}</td>
      <td class="py-4 px-3 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">${item.kondisi}</span>
      </td>
      <td class="py-4 px-3 text-center whitespace-nowrap">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
          ${item.kategori}
        </span>
      </td>
      <td class="py-4 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="py-4 px-4 text-slate-600">${item.keterangan}</td>
      <td class="py-4 px-4 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')"
          class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-110 hover:border-emerald-400 transition mx-auto"
          onerror="this.onerror=null;this.src='no image.png';"
        />
      </td>
      <td class="py-4 px-4 text-center whitespace-nowrap">
        <button onclick="openScanModal('${item.kode}')" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition" title="Lihat Tampilan Paspor Scan QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// ==========================================================
// 4. LIGHTBOX & SCAN PASSPORT
// ==========================================================
function openLightbox(url, nama, kode) {
  const modal = document.getElementById("imageLightboxModal");
  const imgEl = document.getElementById("lightboxImage");
  const titleEl = document.getElementById("lightboxTitle");
  const codeEl = document.getElementById("lightboxCode");

  if (modal && imgEl) {
    imgEl.src = url;
    imgEl.onerror = () => { imgEl.src = 'no image.png'; };
    if (titleEl) titleEl.textContent = nama;
    if (codeEl) codeEl.textContent = kode;
    modal.classList.remove("hidden");
  }
}

function closeLightbox() {
  const modal = document.getElementById("imageLightboxModal");
  if (modal) modal.classList.add("hidden");
}

function openScanModal(kode) {
  window.open(`barcode.html?code=${encodeURIComponent(kode)}`, '_blank');
}

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  const color = type === "success" ? "bg-emerald-600" : (type === "warning" ? "bg-amber-600" : (type === "error" ? "bg-rose-600" : "bg-blue-600"));
  toast.className = `fixed bottom-5 right-5 px-5 py-3 rounded-2xl shadow-xl text-white text-xs font-bold z-50 transition-all ${color}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function setupEventListeners() {
  document.getElementById("faSearchInput")?.addEventListener("input", renderFixAssetView);
  document.getElementById("faFilterLokasi")?.addEventListener("change", renderFixAssetView);

  document.getElementById("invSearchInput")?.addEventListener("input", renderInventoryView);
  document.getElementById("invFilterKategori")?.addEventListener("change", renderInventoryView);
}
