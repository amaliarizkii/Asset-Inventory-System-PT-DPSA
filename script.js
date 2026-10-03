/**
 * script.js - Sistem Manajemen Asset & Inventory PT DPSA
 */

let currentUser = null;
let fixAssets = [];
let inventoryItems = [];
let sheetUsers = [...CONFIG.DEFAULT_USERS];
let activeTab = 'overview';

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  preloadUsers();
  checkSession();
});

// 1. Ambil Data Akses User dari Spreadsheet secara Background
async function preloadUsers() {
  try {
    const rows = await fetchSheetData(CONFIG.SHEETS.USERS);
    if (rows && rows.length > 0) {
      const parsedUsers = [];
      rows.forEach((r, idx) => {
        if (idx === 0) return; // lewati header
        const c = r.c || [];
        const u = String(getCellValue(c[0])).trim();
        const p = String(getCellValue(c[1])).trim();
        if (u && p && u.toLowerCase() !== "username") {
          parsedUsers.push({ username: u, password: p, role: "User DPSA" });
        }
      });
      if (parsedUsers.length > 0) {
        sheetUsers = parsedUsers;
      }
    }
  } catch (e) {
    console.warn("Menggunakan pengguna default lokal.");
  }
}

// 2. Autentikasi Sesi
function checkSession() {
  const saved = sessionStorage.getItem("dpsa_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    onLoginSuccess();
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.remove("hidden");
  }
  document.getElementById("appContainer").classList.add("hidden");
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
  }
}

function logout() {
  sessionStorage.removeItem("dpsa_user");
  currentUser = null;
  location.reload();
}

function onLoginSuccess() {
  closeLoginModal();
  const appContainer = document.getElementById("appContainer");
  if (appContainer) {
    appContainer.classList.remove("hidden");
    appContainer.classList.remove("opacity-0");
  }
  const nameEl = document.getElementById("userDisplayName");
  if (nameEl && currentUser) {
    nameEl.textContent = currentUser.username.split("@")[0].toUpperCase();
  }
  loadAllData();
}

// 3. Fetch GViz Query
async function fetchSheetData(sheetName) {
  const url = CONFIG.getGvizUrl(sheetName);
  const resp = await fetch(url);
  const text = await resp.text();
  const jsonStr = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
  const data = JSON.parse(jsonStr);
  return data.table ? data.table.rows : [];
}

function getCellValue(cell) {
  if (!cell) return "";
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return "";
}

// Pembersih Harga (Mendukung "1.265.000 4.400.000" dengan menjumlahkannya atau mengambil total)
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // Jika ada format gabungan seperti "1.265.000 4.400.000 595.000"
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

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number || 0);
}

// 4. Load Data Utama
async function loadAllData() {
  showLoading(true);
  try {
    // A. Ambil Data Fix Aset
    const faRows = await fetchSheetData(CONFIG.SHEETS.FIX_ASSET);
    fixAssets = [];
    faRows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();
      if (!kode || kode.toLowerCase() === "kode barang" || !nama) return;

      const rawImg = String(getCellValue(c[11]) || "");
      fixAssets.push({
        id: "FA-" + idx,
        no: getCellValue(c[0]) || fixAssets.length + 1,
        kode: kode,
        nama: nama,
        tipe: String(getCellValue(c[3]) || "-"),
        satuan: String(getCellValue(c[4]) || "Unit"),
        jumlah: parseInt(getCellValue(c[5])) || 1,
        tahun: String(getCellValue(c[6]) || "-"),
        kondisi: String(getCellValue(c[7]) || "Baik"),
        harga: parsePrice(getCellValue(c[8])),
        lokasi: String(getCellValue(c[9]) || "PT DPSA"),
        keterangan: String(getCellValue(c[10]) || "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg
      });
    });

    // B. Ambil Data Inventory Sesuai Struktur Screenshot
    const invRows = await fetchSheetData(CONFIG.SHEETS.INVENTORY);
    inventoryItems = [];
    invRows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();

      // Lewati baris header ganda
      if (!kode || kode.toLowerCase().includes("kode") || !nama || nama.toLowerCase().includes("nama")) return;

      // Klasifikasi: Kolom I (index 8) = Aktiva Tetap, Kolom J (index 9) = Bukan Aktiva Tetap
      const isAktivaTetap = String(getCellValue(c[8])).trim().toLowerCase();
      const isBukanAktivaTetap = String(getCellValue(c[9])).trim().toLowerCase();

      let klasifikasiText = "-";
      if (isAktivaTetap === "v" || isAktivaTetap === "ya" || isAktivaTetap === "true") {
        klasifikasiText = "Aktiva Tetap";
      } else if (isBukanAktivaTetap === "v" || isBukanAktivaTetap === "ya" || isBukanAktivaTetap === "true") {
        klasifikasiText = "Bukan Aktiva Tetap";
      } else {
        // Fallback jika tidak dicentang
        klasifikasiText = isAktivaTetap ? "Aktiva Tetap" : (isBukanAktivaTetap ? "Bukan Aktiva Tetap" : "Bukan Aktiva Tetap");
      }

      const rawImg = String(getCellValue(c[11]) || "");
      inventoryItems.push({
        id: "INV-" + idx,
        no: getCellValue(c[0]) || inventoryItems.length + 1,
        kode: kode,
        nama: nama,
        tipe: String(getCellValue(c[3]) || "-"),
        satuan: String(getCellValue(c[4]) || "Unit"),
        jumlah: parseInt(getCellValue(c[5])) || 1,
        tahun: String(getCellValue(c[6]) || "-"),
        kondisi: String(getCellValue(c[7]) || "Baik"),
        kategori: klasifikasiText, // "Aktiva Tetap" atau "Bukan Aktiva Tetap"
        harga: parsePrice(getCellValue(c[10])), // Kolom K = Harga Perolehan
        gambar: CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg,
        keterangan: String(getCellValue(c[12]) || "-") // Kolom M = Keterangan (Letak)
      });
    });

    renderOverview();
    renderFixAssetTable();
    renderInventoryTable();
    showToast(`Berhasil memuat ${fixAssets.length} Fix Asset dan ${inventoryItems.length} Inventory!`, "success");
  } catch (err) {
    console.error(err);
    showToast("Gagal mengambil data dari Google Sheets. Pastikan hak akses Viewer aktif.", "error");
  } finally {
    showLoading(false);
  }
}

// 5. Render Overview
function renderOverview() {
  const totalFA = fixAssets.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalInv = inventoryItems.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const nilaiFA = fixAssets.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  const nilaiInv = inventoryItems.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);

  const elSemuaItem = document.getElementById("totalSemuaItem");
  const elSemuaNilai = document.getElementById("totalSemuaNilai");
  const elSubFA = document.getElementById("subtotalFANilai");
  const elSubInv = document.getElementById("subtotalInvNilai");

  if (elSemuaItem) elSemuaItem.textContent = (totalFA + totalInv).toLocaleString("id-ID");
  if (elSemuaNilai) elSemuaNilai.textContent = formatRupiah(nilaiFA + nilaiInv);
  if (elSubFA) elSubFA.textContent = formatRupiah(nilaiFA);
  if (elSubInv) elSubInv.textContent = formatRupiah(nilaiInv);
}

// 6. Render Tabel Fix Asset
function renderFixAssetTable() {
  const tbody = document.getElementById("fixAssetTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const totalItems = fixAssets.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalNilai = fixAssets.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);

  document.getElementById("faTotalItem").textContent = totalItems.toLocaleString("id-ID");
  document.getElementById("faTotalNilai").textContent = formatRupiah(totalNilai);

  fixAssets.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${index + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs max-w-xs">${item.tipe}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.satuan}</td>
      <td class="px-4 py-3 text-center font-bold text-gray-700">${item.jumlah}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.tahun}</td>
      <td class="px-4 py-3 text-center"><span class="badge-baik">${item.kondisi}</span></td>
      <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="px-4 py-3 text-gray-700 whitespace-nowrap">${item.lokasi}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item.keterangan}</td>
      <td class="px-4 py-3 text-center">
        <img src="${item.gambar}" alt="${item.nama}" class="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform mx-auto" onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" onerror="this.onerror=null;this.src='no image.png';"/>
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button onclick="openBarcodePage('${item.kode}')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Lihat Hasil Scan QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// 7. Render Tabel Inventory (Memuat Kolom Kategori: Aktiva Tetap / Bukan Aktiva Tetap)
function renderInventoryTable() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const totalItems = inventoryItems.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalNilai = inventoryItems.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);

  document.getElementById("invTotalItem").textContent = totalItems.toLocaleString("id-ID");
  document.getElementById("invTotalNilai").textContent = formatRupiah(totalNilai);

  inventoryItems.forEach((item, index) => {
    const isAktiva = item.kategori === "Aktiva Tetap";
    const badgeClass = isAktiva ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-teal-100 text-teal-800 border-teal-300";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${index + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs max-w-xs">${item.tipe}</td>
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
        <img src="${item.gambar}" alt="${item.nama}" class="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:scale-110 transition-transform mx-auto" onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" onerror="this.onerror=null;this.src='no image.png';"/>
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button onclick="openBarcodePage('${item.kode}')" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Lihat Hasil Scan QR">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  lucide.createIcons();
}

// 8. Event Listeners & Navigasi
function setupEventListeners() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("loginEmail").value.trim().toLowerCase();
      const p = document.getElementById("loginPassword").value.trim();

      // Cek kredensial
      const validUser = sheetUsers.find(user => user.username.toLowerCase() === u && user.password === p);

      if (validUser) {
        sessionStorage.setItem("dpsa_user", JSON.stringify(validUser));
        currentUser = validUser;
        onLoginSuccess();
        showToast("Login berhasil! Selamat datang.", "success");
      } else {
        showToast("Username atau Password tidak cocok!", "error");
      }
    });
  }
}

function switchTab(tabId) {
  activeTab = tabId;
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

function showLoading(show) {
  const el = document.getElementById("globalLoader");
  if (el) el.style.display = show ? "flex" : "none";
}

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-5 right-5 px-5 py-3 rounded-lg shadow-xl text-white text-sm z-50 transition-all ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
