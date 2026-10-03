/**
 * script.js - Core Logic PT DPSA Asset & Inventory System
 */

// State Aplikasi
let currentUser = null;
let fixAssets = [];
let inventoryItems = [];
let activeTab = 'overview';
let activeCategory = 'fix-asset'; // untuk modal form

// Inisialisasi saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  setupEventListeners();
});

// Autentikasi & Sesi
function checkSession() {
  const savedUser = sessionStorage.getItem("dpsa_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    onLoginSuccess();
  } else {
    showLoginModal();
  }
}

function showLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "flex";
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "none";
}

function logout() {
  sessionStorage.removeItem("dpsa_user");
  currentUser = null;
  location.reload();
}

// Fetch & Parsing Google Spreadsheet via GViz
async function fetchSheetData(sheetName) {
  const url = CONFIG.getGvizUrl(sheetName);
  try {
    const response = await fetch(url);
    const text = await response.text();
    // Format respons GViz dibungkus /*O_o*/ google.visualization.Query.setResponse({...});
    const jsonString = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
    const data = JSON.parse(jsonString);
    return data.table ? data.table.rows : [];
  } catch (error) {
    console.warn(`Gagal mengambil sheet "${sheetName}":`, error);
    return [];
  }
}

// Helper ekstraksi nilai cell
function getCellValue(cell) {
  if (!cell) return "";
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return "";
}

// Parser Harga Perolehan (Mendukung Rp, koma, titik)
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  // Ambil hanya angka pertama jika ada beberapa nilai
  const cleanStr = String(val).replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

// Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number || 0);
}

// Load Semua Data dari Spreadsheet
async function loadAllSpreadsheetData() {
  showLoading(true);
  try {
    // 1. Ambil Fix Aset
    const faRows = await fetchSheetData(CONFIG.SHEETS.FIX_ASSET);
    fixAssets = [];
    
    // Baris 0 biasanya header, data mulai baris 1
    faRows.forEach((row, idx) => {
      const c = row.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();
      
      // Lewati header jika terbaca
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
        lokasi: String(getCellValue(c[9]) || "Area DPSA"),
        keterangan: String(getCellValue(c[10]) || "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg,
        kategori: "Fix Asset"
      });
    });

    // 2. Ambil Inventory (Perhatikan merged header baris 0 & 1)
    const invRows = await fetchSheetData(CONFIG.SHEETS.INVENTORY);
    inventoryItems = [];

    invRows.forEach((row, idx) => {
      const c = row.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();

      if (!kode || kode.toLowerCase().includes("kode") || !nama) return;

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
        harga: parsePrice(getCellValue(c[10])), // Kolom K = index 10 (Harga Perolehan)
        lokasi: "Gudang & Operasional",
        keterangan: String(getCellValue(c[12]) || "-"), // Kolom M = index 12 (Keterangan/Letak)
        gambar: CONFIG.formatDriveImageUrl(rawImg),
        rawGambar: rawImg,
        kategori: "Inventory"
      });
    });

    renderAllViews();
    showToast(`Berhasil memuat ${fixAssets.length} Fix Asset dan ${inventoryItems.length} Inventory!`, "success");
  } catch (err) {
    console.error("Gagal sinkronisasi data:", err);
    showToast("Gagal memuat data dari Spreadsheet. Cek izin sharing publik link.", "error");
  } finally {
    showLoading(false);
  }
}

// Render Seluruh Halaman
function renderAllViews() {
  renderOverview();
  renderFixAssetTable();
  renderInventoryTable();
}

// Render Tab Overview
function renderOverview() {
  const totalFAItems = fixAssets.reduce((sum, item) => sum + (item.jumlah || 1), 0);
  const totalInvItems = inventoryItems.reduce((sum, item) => sum + (item.jumlah || 1), 0);
  const totalFANilai = fixAssets.reduce((sum, item) => sum + (item.harga * (item.jumlah || 1)), 0);
  const totalInvNilai = inventoryItems.reduce((sum, item) => sum + (item.harga * (item.jumlah || 1)), 0);

  document.getElementById("totalSemuaItem").textContent = (totalFAItems + totalInvItems).toLocaleString("id-ID");
  document.getElementById("totalSemuaNilai").textContent = formatRupiah(totalFANilai + totalInvNilai);
  document.getElementById("subtotalFANilai").textContent = formatRupiah(totalFANilai);
  document.getElementById("subtotalInvNilai").textContent = formatRupiah(totalInvNilai);
}

// Render Tabel Fix Asset
function renderFixAssetTable() {
  const tbody = document.getElementById("fixAssetTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Update KPI Fix Asset
  const totalItems = fixAssets.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalNilai = fixAssets.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  document.getElementById("faTotalItem").textContent = totalItems.toLocaleString("id-ID");
  document.getElementById("faTotalNilai").textContent = formatRupiah(totalNilai);

  if (fixAssets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="text-center py-6 text-gray-500">Tidak ada data Fix Asset.</td></tr>`;
    return;
  }

  fixAssets.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 transition-colors text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${index + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title="${item.tipe}">${item.tipe}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.satuan}</td>
      <td class="px-4 py-3 text-center font-bold text-gray-700">${item.jumlah}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.tahun}</td>
      <td class="px-4 py-3 text-center"><span class="badge-baik">${item.kondisi}</span></td>
      <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="px-4 py-3 text-gray-700 whitespace-nowrap">${item.lokasi}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item.keterangan}</td>
      <td class="px-4 py-3 text-center">
        <div class="thumbnail-wrapper" onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" title="Klik untuk memperbesar gambar">
          <img src="${item.gambar}" alt="${item.nama}" class="w-10 h-10 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:scale-110 transition-transform" onerror="this.onerror=null;this.src='no image.png';"/>
        </div>
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

// Render Tabel Inventory
function renderInventoryTable() {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const totalItems = inventoryItems.reduce((sum, i) => sum + (i.jumlah || 1), 0);
  const totalNilai = inventoryItems.reduce((sum, i) => sum + (i.harga * (i.jumlah || 1)), 0);
  document.getElementById("invTotalItem").textContent = totalItems.toLocaleString("id-ID");
  document.getElementById("invTotalNilai").textContent = formatRupiah(totalNilai);

  if (inventoryItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="text-center py-6 text-gray-500">Tidak ada data Inventory.</td></tr>`;
    return;
  }

  inventoryItems.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-gray-100 transition-colors text-sm";
    tr.innerHTML = `
      <td class="px-4 py-3 text-center text-gray-500">${index + 1}</td>
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">${item.kode}</td>
      <td class="px-4 py-3 font-medium text-gray-800">${item.nama}</td>
      <td class="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title="${item.tipe}">${item.tipe}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.satuan}</td>
      <td class="px-4 py-3 text-center font-bold text-gray-700">${item.jumlah}</td>
      <td class="px-4 py-3 text-center text-gray-600">${item.tahun}</td>
      <td class="px-4 py-3 text-center"><span class="badge-baik">${item.kondisi}</span></td>
      <td class="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">${formatRupiah(item.harga)}</td>
      <td class="px-4 py-3 text-gray-700 whitespace-nowrap">${item.lokasi}</td>
      <td class="px-4 py-3 text-gray-500 text-xs">${item.keterangan}</td>
      <td class="px-4 py-3 text-center">
        <div class="thumbnail-wrapper" onclick="openLightbox('${item.gambar}', '${item.nama}', '${item.kode}')" title="Klik untuk memperbesar gambar">
          <img src="${item.gambar}" alt="${item.nama}" class="w-10 h-10 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:scale-110 transition-transform" onerror="this.onerror=null;this.src='no image.png';"/>
        </div>
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

// Lightbox Foto Full Resolution
function openLightbox(imgUrl, title, code) {
  const modal = document.getElementById("lightboxModal");
  const imgEl = document.getElementById("lightboxImg");
  const titleEl = document.getElementById("lightboxTitle");
  const codeEl = document.getElementById("lightboxCode");

  if (modal && imgEl) {
    imgEl.src = imgUrl;
    imgEl.onerror = () => { imgEl.src = 'no image.png'; };
    if (titleEl) titleEl.textContent = title || "Foto Aset";
    if (codeEl) codeEl.textContent = code || "";
    modal.style.display = "flex";
  }
}

function closeLightbox() {
  const modal = document.getElementById("lightboxModal");
  if (modal) modal.style.display = "none";
}

// Buka Halaman Hasil Scan QR
function openBarcodePage(kode) {
  window.open(`barcode.html?code=${encodeURIComponent(kode)}`, '_blank');
}

// Navigasi Tab (Overview, Fix Asset, Inventory)
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".nav-tab-btn").forEach(el => el.classList.remove("active-tab"));

  const targetTab = document.getElementById(tabId + "Tab");
  const targetBtn = document.getElementById("btnTab-" + tabId);
  if (targetTab) targetTab.classList.remove("hidden");
  if (targetBtn) targetBtn.classList.add("active-tab");
}

// Setup Event Listeners
function setupEventListeners() {
  // Form Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = document.getElementById("loginEmail").value.trim();
      const p = document.getElementById("loginPassword").value.trim();

      // Cek ke sheet Akses User atau Default
      let validUser = CONFIG.DEFAULT_USERS.find(user => user.username === u && user.password === p);
      if (validUser) {
        sessionStorage.setItem("dpsa_user", JSON.stringify(validUser));
        currentUser = validUser;
        closeLoginModal();
        onLoginSuccess();
      } else {
        showToast("Username atau Password salah!", "error");
      }
    });
  }

  // Preview Upload Gambar Manual di Modal Tambah Data
  const manualFileEl = document.getElementById("inputGambarFile");
  if (manualFileEl) {
    manualFileEl.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const previewImg = document.getElementById("previewGambarUpload");
          if (previewImg) {
            previewImg.src = event.target.result;
            previewImg.classList.remove("hidden");
          }
          // Simpan base64 ke hidden field
          document.getElementById("inputGambarUrl").value = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function onLoginSuccess() {
  document.getElementById("userDisplayName").textContent = currentUser.username.split("@")[0].toUpperCase();
  document.getElementById("appContainer").classList.remove("opacity-0");
  loadAllSpreadsheetData();
}

function showLoading(show) {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-5 right-5 px-5 py-3 rounded-lg shadow-xl text-white text-sm z-50 transition-all transform duration-300 ${type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
