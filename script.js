/**
 * PT DPSA Asset & Inventory System - Main Engine
 * Autentikasi Google Sheets Users, Sync Fix Asset & Inventory, Manajemen Data & Upload Manual
 */

let appState = {
  currentUser: null,
  activeTab: 'overview',
  fixAssets: [],
  inventories: [],
  isSyncing: false,
  charts: {
    pie: null,
    bar: null
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initAuthSession();
  setupEventListeners();
  loadData();
});

// ==========================================
// 1. SISTEM AUTENTIKASI LOGIN DPSA
// ==========================================
function initAuthSession() {
  const savedUser = localStorage.getItem("dpsa_auth_user");
  if (savedUser) {
    appState.currentUser = JSON.parse(savedUser);
    updateUserInterface();
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  document.getElementById("loginModal").classList.remove("hidden");
}

function hideLoginModal() {
  document.getElementById("loginModal").classList.add("hidden");
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("loginUsername").value.trim();
  const passwordInput = document.getElementById("loginPassword").value.trim();
  const loginBtn = document.getElementById("btnLoginSubmit");
  const loginErr = document.getElementById("loginErrorMsg");

  loginErr.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<span>Memverifikasi...</span>`;

  let users = [];

  // Ambil data users dari Google Sheets tab 'Users'
  try {
    const url = APP_CONFIG.getGvizUrl(APP_CONFIG.SHEETS.USERS);
    const res = await fetch(url);
    const text = await res.text();
    const raw = text.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(|\);$/g, "");
    const obj = JSON.parse(raw);
    users = obj.table.rows.map(r => ({
      username: r.c[0] ? String(r.c[0].v).trim() : "",
      password: r.c[1] ? String(r.c[1].v).trim() : "",
      nama: r.c[2] ? String(r.c[2].v).trim() : "Pengguna DPSA",
      role: r.c[3] ? String(r.c[3].v).trim() : "Staff"
    }));
  } catch (err) {
    console.warn("Gagal fetch tab Users spreadsheet, menggunakan fallback auth lokal:", err);
    users = APP_CONFIG.FALLBACK_USERS;
  }

  // Cocokkan kredensial
  const matched = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);

  if (matched) {
    appState.currentUser = matched;
    localStorage.setItem("dpsa_auth_user", JSON.stringify(matched));
    hideLoginModal();
    updateUserInterface();
    showToast("Login Berhasil", `Selamat datang kembali, ${matched.nama}!`);
  } else {
    loginErr.textContent = "Username atau password salah! Silakan periksa kembali.";
    loginErr.classList.remove("hidden");
  }

  loginBtn.disabled = false;
  loginBtn.innerHTML = `<span>Masuk ke Sistem</span>`;
}

function logout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem PT DPSA?")) {
    localStorage.removeItem("dpsa_auth_user");
    appState.currentUser = null;
    location.reload();
  }
}

function updateUserInterface() {
  if (appState.currentUser) {
    document.getElementById("userProfileName").textContent = appState.currentUser.nama;
    document.getElementById("userProfileRole").textContent = appState.currentUser.role;
    document.getElementById("userAvatarInitials").textContent = (appState.currentUser.nama || "GA").substring(0, 2).toUpperCase();
  }
}

// ==========================================
// 2. DATA SYNCHRONIZATION WITH SPREADSHEET
// ==========================================
async function loadData() {
  appState.isSyncing = true;
  updateSyncIndicator(true);

  // Ambil cache lokal dahulu agar render instan
  const localFA = localStorage.getItem("dpsa_fixasset_data");
  const localInv = localStorage.getItem("dpsa_inventory_data");

  if (localFA) appState.fixAssets = JSON.parse(localFA);
  else appState.fixAssets = [...APP_CONFIG.DEFAULT_FIX_ASSET];

  if (localInv) appState.inventories = JSON.parse(localInv);
  else appState.inventories = [...APP_CONFIG.DEFAULT_INVENTORY];

  renderCurrentTab();

  // Tarik data terbaru dari Google Spreadsheet
  try {
    await fetchSpreadsheetCategory("fixasset", APP_CONFIG.SHEETS.FIX_ASSET);
    await fetchSpreadsheetCategory("inventory", APP_CONFIG.SHEETS.INVENTORY);
    showToast("Sinkronisasi Selesai", "Data terbaru dari Google Sheets berhasil dimuat.");
  } catch (e) {
    console.warn("Gagal sinkron live spreadsheet, mempertahankan data saat ini.", e);
  } finally {
    appState.isSyncing = false;
    updateSyncIndicator(false);
    renderCurrentTab();
  }
}

async function fetchSpreadsheetCategory(catType, sheetName) {
  const url = APP_CONFIG.getGvizUrl(sheetName);
  const response = await fetch(url);
  const text = await response.text();
  const raw = text.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(|\);$/g, "");
  const obj = JSON.parse(raw);
  const rows = obj.table.rows;

  const parsed = rows.map((r, index) => {
    const c = r.c;
    return {
      id: `${catType}-${index + 1}`,
      kategori: catType,
      kode: c[1] ? String(c[1].v) : `KODE-${index+1}`,
      nama: c[2] ? String(c[2].v) : "-",
      spek: c[3] ? String(c[3].v) : "-",
      satuan: c[4] ? String(c[4].v) : "Unit",
      jumlah: c[5] ? Number(c[5].v) : 1,
      tahun: c[6] ? Number(c[6].v) : 2026,
      kondisi: c[7] ? String(c[7].v) : "Baik",
      harga: c[8] ? Number(c[8].v) : 0,
      lokasi: c[9] ? String(c[9].v) : "Gudang",
      keterangan: c[10] ? String(c[10].v) : "-",
      gambar: c[11] ? String(c[11].v) : "no image.png"
    };
  });

  if (parsed.length > 0) {
    if (catType === 'fixasset') {
      appState.fixAssets = parsed;
      localStorage.setItem("dpsa_fixasset_data", JSON.stringify(parsed));
    } else {
      appState.inventories = parsed;
      localStorage.setItem("dpsa_inventory_data", JSON.stringify(parsed));
    }
  }
}

function updateSyncIndicator(isSyncing) {
  const badge = document.getElementById("syncStatusBadge");
  if (!badge) return;
  if (isSyncing) {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span><span class="text-[10px] text-amber-300 font-bold">Sinkron Google Sheets...</span>`;
  } else {
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-[10px] text-emerald-300 font-bold">Google Sheets Terhubung</span>`;
  }
}

// ==========================================
// 3. TAB NAVIGATION & VIEW RENDERING
// ==========================================
function switchTab(tabName) {
  appState.activeTab = tabName;
  ['overview', 'fixasset', 'inventory'].forEach(t => {
    const sec = document.getElementById(`section-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    if (t === tabName) {
      sec.classList.remove('hidden');
      navBtn.className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition text-white bg-blue-600 shadow-md shadow-blue-900/40";
    } else {
      sec.classList.add('hidden');
      navBtn.className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition";
    }
  });

  const titleEl = document.getElementById("topBarTitle");
  const subEl = document.getElementById("topBarSubtitle");
  const btnTambah = document.getElementById("btnTopTambahText");

  if (tabName === 'overview') {
    titleEl.textContent = "1. Overview";
    subEl.textContent = "Rangkuman Total Item & Akumulasi Nilai Perolehan Fix Asset + Inventory";
    btnTambah.textContent = "Tambah Item";
    renderOverview();
  } else if (tabName === 'fixasset') {
    titleEl.textContent = "2. Dashboard Fix Asset";
    subEl.textContent = "Database Aktiva Tetap, Nilai Perolehan & Distribusi Area Gedung";
    btnTambah.textContent = "Tambah Fix Asset";
    renderFixAsset();
  } else if (tabName === 'inventory') {
    titleEl.textContent = "3. Dashboard Inventory";
    subEl.textContent = "Database Persediaan, Nilai Perolehan Stok & Distribusi Area Gudang";
    btnTambah.textContent = "Tambah Inventory";
    renderInventory();
  }

  lucide.createIcons();
}

function renderCurrentTab() {
  document.getElementById("badgeCountFixAsset").textContent = appState.fixAssets.length;
  document.getElementById("badgeCountInventory").textContent = appState.inventories.length;

  if (appState.activeTab === 'overview') renderOverview();
  else if (appState.activeTab === 'fixasset') renderFixAsset();
  else if (appState.activeTab === 'inventory') renderInventory();
}

// ------------------------------------------
// RENDER OVERVIEW
// ------------------------------------------
function renderOverview() {
  const totalFAVal = appState.fixAssets.reduce((sum, i) => sum + (i.harga || 0), 0);
  const totalInvVal = appState.inventories.reduce((sum, i) => sum + ((i.harga || 0) * (i.jumlah || 1)), 0);
  const grandTotal = totalFAVal + totalInvVal;
  const grandCount = appState.fixAssets.length + appState.inventories.length;

  document.getElementById("ovTotalNilaiAll").textContent = formatRupiah(grandTotal);
  document.getElementById("ovTotalItemAll").textContent = `${grandCount} Item Terdaftar`;
  document.getElementById("ovNilaiFixAsset").textContent = formatRupiah(totalFAVal);
  document.getElementById("ovItemFixAsset").textContent = `${appState.fixAssets.length} Unit Aktiva Tetap`;
  document.getElementById("ovNilaiInventory").textContent = formatRupiah(totalInvVal);
  document.getElementById("ovItemInventory").textContent = `${appState.inventories.length} SKU Persediaan`;

  // Top 5 High Value Assets
  const allItems = [...appState.fixAssets, ...appState.inventories];
  const sorted = allItems.sort((a, b) => {
    const valA = (a.harga || 0) * (a.kategori === 'inventory' ? a.jumlah : 1);
    const valB = (b.harga || 0) * (b.kategori === 'inventory' ? b.jumlah : 1);
    return valB - valA;
  }).slice(0, 5);

  const tbody = document.getElementById("overviewTopTableBody");
  tbody.innerHTML = "";

  sorted.forEach(item => {
    const itemVal = (item.harga || 0) * (item.kategori === 'inventory' ? item.jumlah : 1);
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
    tr.innerHTML = `
      <td class="py-3.5 px-6 font-mono font-bold text-blue-700">${item.kode}</td>
      <td class="py-3.5 px-6">
        <span class="font-bold text-slate-800">${item.nama}</span>
        <p class="text-[11px] text-slate-400 truncate max-w-xs">${item.spek}</p>
      </td>
      <td class="py-3.5 px-6">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.kategori === 'fixasset' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">
          ${item.kategori === 'fixasset' ? 'Fix Asset' : 'Inventory'}
        </span>
      </td>
      <td class="py-3.5 px-6 font-medium">${item.lokasi}</td>
      <td class="py-3.5 px-6 text-right font-extrabold text-slate-900">${formatRupiah(itemVal)}</td>
      <td class="py-3.5 px-6 text-center">
        <button onclick="openScanModalForItem('${item.kode}')" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition" title="Lihat Tampilan Paspor Scan QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderOverviewCharts(totalFAVal, totalInvVal);
}

function renderOverviewCharts(faVal, invVal) {
  // Pie Chart
  const pieCtx = document.getElementById('overviewPieChart').getContext('2d');
  if (appState.charts.pie) appState.charts.pie.destroy();
  appState.charts.pie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Fix Asset', 'Inventory'],
      datasets: [{
        data: [faVal, invVal],
        backgroundColor: ['#2563eb', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } } }
      }
    }
  });

  // Bar Chart by Location
  const barCtx = document.getElementById('overviewBarChart').getContext('2d');
  if (appState.charts.bar) appState.charts.bar.destroy();

  const locMap = {};
  [...appState.fixAssets, ...appState.inventories].forEach(item => {
    const val = (item.harga || 0) * (item.kategori === 'inventory' ? item.jumlah : 1);
    locMap[item.lokasi] = (locMap[item.lokasi] || 0) + val;
  });

  appState.charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(locMap),
      datasets: [{
        label: 'Total Nilai (Rp)',
        data: Object.values(locMap),
        backgroundColor: '#0284c7',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => 'Rp ' + (v/1000000) + ' Jt', font: { family: 'Plus Jakarta Sans', size: 10 } } },
        x: { ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } } }
      }
    }
  });
}

// ------------------------------------------
// RENDER FIX ASSET
// ------------------------------------------
function renderFixAsset() {
  const search = (document.getElementById('faSearchInput').value || "").toLowerCase();
  const filterLokasi = document.getElementById('faFilterLokasi').value;
  const filterKondisi = document.getElementById('faFilterKondisi').value;

  // Populate Dropdown Lokasi
  const lokasiSelect = document.getElementById('faFilterLokasi');
  const uniqueLocs = Array.from(new Set(appState.fixAssets.map(i => i.lokasi).filter(Boolean)));
  const currVal = lokasiSelect.value;
  lokasiSelect.innerHTML = '<option value="ALL">Semua Lokasi</option>';
  uniqueLocs.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    if (loc === currVal) opt.selected = true;
    lokasiSelect.appendChild(opt);
  });

  const filtered = appState.fixAssets.filter(item => {
    const matchSearch = (item.kode || "").toLowerCase().includes(search) ||
                        (item.nama || "").toLowerCase().includes(search) ||
                        (item.lokasi || "").toLowerCase().includes(search) ||
                        (item.keterangan || "").toLowerCase().includes(search);
    const matchLok = (filterLokasi === 'ALL') || (item.lokasi === filterLokasi);
    const matchKon = (filterKondisi === 'ALL') || (item.kondisi === filterKondisi);
    return matchSearch && matchLok && matchKon;
  });

  const totalNilai = filtered.reduce((acc, c) => acc + (c.harga || 0), 0);
  document.getElementById('faTotalNilai').textContent = formatRupiah(totalNilai);
  document.getElementById('faTotalItem').textContent = `${filtered.length} Unit`;
  const baik = filtered.filter(i => i.kondisi === 'Baik').length;
  document.getElementById('faKondisiBaik').textContent = filtered.length > 0 ? `${Math.round((baik / filtered.length) * 100)}%` : '0%';

  // Distribution Bars
  const distEl = document.getElementById('faDistributionBars');
  distEl.innerHTML = "";
  const counts = {};
  filtered.forEach(i => counts[i.lokasi] = (counts[i.lokasi] || 0) + 1);
  document.getElementById('faTotalAreaBadge').textContent = `${Object.keys(counts).length} Lokasi Terdaftar`;

  Object.entries(counts).forEach(([loc, cnt]) => {
    const pct = Math.round((cnt / filtered.length) * 100);
    const div = document.createElement('div');
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

  // Table Rows
  const tbody = document.getElementById('faTableBody');
  tbody.innerHTML = "";

  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-blue-50/30 transition border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-4 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
      <td class="py-4 px-4">
        <span class="code-font font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">${item.kode}</span>
      </td>
      <td class="py-4 px-4 font-bold text-slate-900">${item.nama}</td>
      <td class="py-4 px-4 text-slate-600 whitespace-pre-line">${item.spek}</td>
      <td class="py-4 px-3 text-center"><span class="px-2 py-0.5 rounded bg-slate-100 font-semibold">${item.satuan}</span></td>
      <td class="py-4 px-3 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-700">${item.tahun}</td>
      <td class="py-4 px-3 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">${item.kondisi}</span>
      </td>
      <td class="py-4 px-4 text-right font-extrabold ${item.harga ? 'text-slate-900' : 'text-slate-400 italic'}">${formatRupiah(item.harga)}</td>
      <td class="py-4 px-4 font-semibold text-slate-800">${item.lokasi}</td>
      <td class="py-4 px-4 text-slate-600">${item.keterangan}</td>
      <td class="py-4 px-4 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}', '${item.lokasi}', '${item.keterangan}')" 
          class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-110 hover:border-blue-400 transition mx-auto"
          onerror="this.src='no image.png'"
        >
      </td>
      <td class="py-4 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="openScanModalForItem('${item.kode}')" title="Scan Paspor (Identik Referensi)" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          <button onclick="openStickerModal('${item.id}', 'fixasset')" title="Cetak Stiker Fisik" class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition">
            <i data-lucide="printer" class="w-4 h-4"></i>
          </button>
          <button onclick="openEditDataModal('${item.id}', 'fixasset')" title="Edit Data" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteDataItem('${item.id}', 'fixasset')" title="Hapus" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// ------------------------------------------
// RENDER INVENTORY
// ------------------------------------------
function renderInventory() {
  const search = (document.getElementById('invSearchInput').value || "").toLowerCase();
  const filterLokasi = document.getElementById('invFilterLokasi').value;

  const lokasiSelect = document.getElementById('invFilterLokasi');
  const uniqueLocs = Array.from(new Set(appState.inventories.map(i => i.lokasi).filter(Boolean)));
  const currVal = lokasiSelect.value;
  lokasiSelect.innerHTML = '<option value="ALL">Semua Area Gudang</option>';
  uniqueLocs.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc;
    opt.textContent = loc;
    if (loc === currVal) opt.selected = true;
    lokasiSelect.appendChild(opt);
  });

  const filtered = appState.inventories.filter(item => {
    const matchSearch = (item.kode || "").toLowerCase().includes(search) ||
                        (item.nama || "").toLowerCase().includes(search) ||
                        (item.lokasi || "").toLowerCase().includes(search) ||
                        (item.keterangan || "").toLowerCase().includes(search);
    const matchLok = (filterLokasi === 'ALL') || (item.lokasi === filterLokasi);
    return matchSearch && matchLok;
  });

  const totalNilai = filtered.reduce((acc, c) => acc + ((c.harga || 0) * (c.jumlah || 1)), 0);
  const totalQty = filtered.reduce((acc, c) => acc + (c.jumlah || 1), 0);

  document.getElementById('invTotalNilai').textContent = formatRupiah(totalNilai);
  document.getElementById('invTotalItem').textContent = `${filtered.length} SKU`;
  document.getElementById('invTotalKuantitas').textContent = `${totalQty} Pcs/Unit`;

  // Distribution Bars
  const distEl = document.getElementById('invDistributionBars');
  distEl.innerHTML = "";
  const counts = {};
  filtered.forEach(i => counts[i.lokasi] = (counts[i.lokasi] || 0) + (i.jumlah || 1));
  document.getElementById('invTotalAreaBadge').textContent = `${Object.keys(counts).length} Area Gudang`;

  Object.entries(counts).forEach(([loc, cnt]) => {
    const pct = totalQty > 0 ? Math.round((cnt / totalQty) * 100) : 0;
    const div = document.createElement('div');
    div.className = "space-y-1";
    div.innerHTML = `
      <div class="flex justify-between text-xs font-semibold text-slate-700">
        <span>${loc}</span>
        <span>${cnt} Unit (${pct}%)</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2">
        <div class="bg-emerald-600 h-2 rounded-full" style="width: ${pct}%"></div>
      </div>
    `;
    distEl.appendChild(div);
  });

  // Table Rows (100% Identical Schema)
  const tbody = document.getElementById('invTableBody');
  tbody.innerHTML = "";

  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-emerald-50/30 transition border-b border-slate-100 text-xs";
    tr.innerHTML = `
      <td class="py-4 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
      <td class="py-4 px-4">
        <span class="code-font font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">${item.kode}</span>
      </td>
      <td class="py-4 px-4 font-bold text-slate-900">${item.nama}</td>
      <td class="py-4 px-4 text-slate-600 whitespace-pre-line">${item.spek}</td>
      <td class="py-4 px-3 text-center"><span class="px-2 py-0.5 rounded bg-slate-100 font-semibold">${item.satuan}</span></td>
      <td class="py-4 px-3 text-center font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-4 px-3 text-center font-semibold text-slate-700">${item.tahun}</td>
      <td class="py-4 px-3 text-center">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">${item.kondisi}</span>
      </td>
      <td class="py-4 px-4 text-right font-extrabold text-slate-900">${formatRupiah(item.harga)}</td>
      <td class="py-4 px-4 font-semibold text-slate-800">${item.lokasi}</td>
      <td class="py-4 px-4 text-slate-600">${item.keterangan}</td>
      <td class="py-4 px-4 text-center">
        <img 
          src="${item.gambar}" 
          alt="${item.nama}" 
          onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}', '${item.lokasi}', '${item.keterangan}')" 
          class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-110 hover:border-emerald-400 transition mx-auto"
          onerror="this.src='no image.png'"
        >
      </td>
      <td class="py-4 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="openScanModalForItem('${item.kode}')" title="Scan Paspor (Identik Referensi)" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          <button onclick="openStickerModal('${item.id}', 'inventory')" title="Cetak Stiker Fisik" class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition">
            <i data-lucide="printer" class="w-4 h-4"></i>
          </button>
          <button onclick="openEditDataModal('${item.id}', 'inventory')" title="Edit Data" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteDataItem('${item.id}', 'inventory')" title="Hapus" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// ==========================================
// 4. IMAGE LIGHTBOX & MANUAL UPLOAD PREVIEW
// ==========================================
function openLightbox(imgUrl, nama, kode, lokasi, pic) {
  document.getElementById('lightboxTitle').textContent = nama;
  document.getElementById('lightboxImage').src = imgUrl || 'no image.png';
  document.getElementById('lightboxKode').textContent = kode;
  document.getElementById('lightboxLokasi').textContent = `Lokasi: ${lokasi} | PIC: ${pic}`;

  document.getElementById('lightboxBtnScan').onclick = () => {
    closeLightbox();
    openScanModalForItem(kode);
  };

  document.getElementById('imageLightboxModal').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('imageLightboxModal').classList.add('hidden');
}

// Menangani unggah foto aset manual dari disk lokal (Base64 DataURL)
function handleManualImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Url = e.target.result;
    document.getElementById('inputGambar').value = base64Url;

    // Preview thumbnail
    const preview = document.getElementById('manualImagePreview');
    preview.src = base64Url;
    preview.classList.remove('hidden');
    showToast("Foto Terpilih", "Gambar berhasil diproses dan siap disimpan.");
  };
  reader.readAsDataURL(file);
}

// ==========================================
// 5. MODAL FORM TAMBAH / EDIT IDENTIK
// ==========================================
function openAddDataModal() {
  document.getElementById('formEditId').value = "-1";
  document.getElementById('unifiedDataForm').reset();
  document.getElementById('manualImagePreview').classList.add('hidden');

  const yr = new Date().getFullYear();
  if (appState.activeTab === 'inventory') {
    document.getElementById('radioInventory').checked = true;
    document.getElementById('formModalTitle').textContent = "Tambah Item Inventory";
    document.getElementById('inputKode').value = `INV/RM/${Math.floor(Math.random()*30) + 1}/DPSA/${yr}/LOG`;
  } else {
    document.getElementById('radioFixAsset').checked = true;
    document.getElementById('formModalTitle').textContent = "Tambah Item Fix Asset";
    document.getElementById('inputKode').value = `FA/PO3/${Math.floor(Math.random()*30) + 1}/XII/DPSA/${yr}/KEU`;
  }

  document.getElementById('inputTahun').value = yr;
  document.getElementById('formModal').classList.remove('hidden');
  lucide.createIcons();
}

function openEditDataModal(id, category) {
  const list = category === 'fixasset' ? appState.fixAssets : appState.inventories;
  const item = list.find(i => i.id === id);
  if (!item) return;

  document.getElementById('formEditId').value = item.id;
  document.getElementById('formModalTitle').textContent = `Edit Item: ${item.nama}`;

  if (category === 'inventory') {
    document.getElementById('radioInventory').checked = true;
  } else {
    document.getElementById('radioFixAsset').checked = true;
  }

  document.getElementById('inputKode').value = item.kode;
  document.getElementById('inputNama').value = item.nama;
  document.getElementById('inputSpek').value = item.spek || '';
  document.getElementById('inputSatuan').value = item.satuan || 'Unit';
  document.getElementById('inputJumlah').value = item.jumlah || 1;
  document.getElementById('inputTahun').value = item.tahun || 2026;
  document.getElementById('inputKondisi').value = item.kondisi || 'Baik';
  document.getElementById('inputHarga').value = item.harga || '';
  document.getElementById('inputLokasi').value = item.lokasi || '';
  document.getElementById('inputKeterangan').value = item.keterangan || '';
  document.getElementById('inputGambar').value = item.gambar || '';

  const preview = document.getElementById('manualImagePreview');
  if (item.gambar && item.gambar !== 'no image.png') {
    preview.src = item.gambar;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }

  document.getElementById('formModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeFormModal() {
  document.getElementById('formModal').classList.add('hidden');
}

function handleUnifiedFormSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('formEditId').value;
  const category = document.querySelector('input[name="formKategori"]:checked').value;

  const itemObj = {
    id: editId !== "-1" ? editId : `${category}-${Date.now()}`,
    kategori: category,
    kode: document.getElementById('inputKode').value.trim(),
    nama: document.getElementById('inputNama').value.trim(),
    spek: document.getElementById('inputSpek').value.trim(),
    satuan: document.getElementById('inputSatuan').value,
    jumlah: parseInt(document.getElementById('inputJumlah').value) || 1,
    tahun: parseInt(document.getElementById('inputTahun').value) || 2026,
    kondisi: document.getElementById('inputKondisi').value,
    harga: document.getElementById('inputHarga').value ? parseFloat(document.getElementById('inputHarga').value) : 0,
    lokasi: document.getElementById('inputLokasi').value.trim(),
    keterangan: document.getElementById('inputKeterangan').value.trim() || "-",
    gambar: document.getElementById('inputGambar').value.trim() || "no image.png"
  };

  if (category === 'fixasset') {
    if (editId !== "-1") {
      const idx = appState.fixAssets.findIndex(i => i.id === editId);
      if (idx !== -1) appState.fixAssets[idx] = itemObj;
    } else {
      appState.fixAssets.unshift(itemObj);
    }
    localStorage.setItem("dpsa_fixasset_data", JSON.stringify(appState.fixAssets));
  } else {
    if (editId !== "-1") {
      const idx = appState.inventories.findIndex(i => i.id === editId);
      if (idx !== -1) appState.inventories[idx] = itemObj;
    } else {
      appState.inventories.unshift(itemObj);
    }
    localStorage.setItem("dpsa_inventory_data", JSON.stringify(appState.inventories));
  }

  closeFormModal();
  renderCurrentTab();
  showToast("Sukses", `Data ${itemObj.nama} berhasil disimpan ke sistem lokal.`);
}

function deleteDataItem(id, category) {
  if (confirm("Apakah Anda yakin ingin menghapus data item ini?")) {
    if (category === 'fixasset') {
      appState.fixAssets = appState.fixAssets.filter(i => i.id !== id);
      localStorage.setItem("dpsa_fixasset_data", JSON.stringify(appState.fixAssets));
    } else {
      appState.inventories = appState.inventories.filter(i => i.id !== id);
      localStorage.setItem("dpsa_inventory_data", JSON.stringify(appState.inventories));
    }
    renderCurrentTab();
    showToast("Dihapus", "Item telah berhasil dihapus.");
  }
}

// ==========================================
// 6. EXACT SCAN PASSPORT & STICKER MODAL
// ==========================================
function openScanModalForItem(kode) {
  // Arahkan atau buka jendela popup identik barcode.html
  window.open(`barcode.html?code=${encodeURIComponent(kode)}`, '_blank');
}

function openStickerModal(id, category) {
  const list = category === 'fixasset' ? appState.fixAssets : appState.inventories;
  const item = list.find(i => i.id === id);
  if (!item) return;

  document.getElementById('stickerKode').textContent = item.kode;
  document.getElementById('stickerKategori').textContent = category === 'fixasset' ? 'Fix Asset' : 'Inventory';
  document.getElementById('stickerNama').textContent = item.nama;
  document.getElementById('stickerLokasi').textContent = `Lokasi: ${item.lokasi}`;
  document.getElementById('stickerPic').textContent = `PIC: ${item.keterangan}`;

  // QR menargetkan barcode.html secara otomatis
  const targetUrl = window.location.origin + window.location.pathname.replace('index.html', '') + `barcode.html?code=${encodeURIComponent(item.kode)}`;
  document.getElementById('stickerQrImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(targetUrl)}`;

  document.getElementById('printStickerModal').classList.remove('hidden');
}

function closeStickerModal() {
  document.getElementById('printStickerModal').classList.add('hidden');
}

// ==========================================
// 7. UTILITIES
// ==========================================
function formatRupiah(num) {
  if (!num || isNaN(num) || num === 0) return "-";
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

function showToast(title, msg) {
  const toast = document.getElementById('toastNotification');
  document.getElementById('toastTitle').textContent = title;
  document.getElementById('toastMessage').textContent = msg;

  toast.classList.remove('-translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('-translate-y-24', 'opacity-0');
  }, 3500);
}

function setupEventListeners() {
  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('unifiedDataForm').addEventListener('submit', handleUnifiedFormSubmit);

  document.getElementById('faSearchInput').addEventListener('input', renderFixAsset);
  document.getElementById('faFilterLokasi').addEventListener('change', renderFixAsset);
  document.getElementById('faFilterKondisi').addEventListener('change', renderFixAsset);

  document.getElementById('invSearchInput').addEventListener('input', renderInventory);
  document.getElementById('invFilterLokasi').addEventListener('change', renderInventory);

  const fileInput = document.getElementById('inputManualUpload');
  if (fileInput) {
    fileInput.addEventListener('change', handleManualImageUpload);
  }
}
