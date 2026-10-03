/**
 * script.js - Sistem Asset & Inventory PT DPSA
 */

// Kredensial Resmi DPSA (Offline-first, dijamin langsung tembus)
const VALID_USERS = [
  { u: "staff.it@dharmaputrainterior.co.id", p: "staff.itDPSA88", role: "IT Support" },
  { u: "hrga@dharmaputrainterior.co.id", p: "hrgaDPSA88", role: "HR & GA" },
  { u: "keuangan@dharmaputrainterior.co.id", p: "keuanganDPSA88", role: "Finance" }
];

let currentUser = null;
let fixAssets = [];
let inventoryItems = [];

// Fungsi login yang dipanggil LANGSUNG oleh tombol (onclick)
function doLogin() {
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const errBox = document.getElementById("loginErrorMsg");

  if (!emailInput || !passInput) {
    alert("Elemen login tidak ditemukan!");
    return;
  }

  const uVal = emailInput.value.trim().toLowerCase();
  const pVal = passInput.value.trim();

  // Validasi kecocokan username / email dan password
  const matched = VALID_USERS.find(user => {
    const userEmail = user.u.toLowerCase();
    const userPrefix = userEmail.split("@")[0];
    return (uVal === userEmail || uVal === userPrefix) && pVal === user.p;
  });

  if (matched) {
    currentUser = matched;
    try {
      sessionStorage.setItem("dpsa_logged_in", JSON.stringify(matched));
    } catch (e) {
      console.warn("Storage restricted, proceeding in memory.");
    }
    
    // Sembunyikan modal login, tampilkan aplikasi
    const modal = document.getElementById("loginModal");
    const app = document.getElementById("appContainer");
    if (modal) modal.style.display = "none";
    if (app) {
      app.style.display = "block";
      app.classList.remove("hidden");
    }

    const disp = document.getElementById("userDisplayName");
    if (disp) disp.textContent = matched.role;

    // Muat data dari spreadsheet
    loadAllSpreadsheetData();
  } else {
    if (errBox) {
      errBox.textContent = "Username atau password salah! Silakan coba lagi.";
      errBox.style.display = "block";
      errBox.classList.remove("hidden");
    } else {
      alert("Username atau Password salah!");
    }
  }
}

// Fungsi shortcut tombol cepat di login modal
function pickAccount(email, pass) {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  if (e) e.value = email;
  if (p) p.value = pass;
  doLogin(); // Langsung proses login
}

// Inisialisasi saat window dimuat
window.onload = function() {
  // Cek apakah sudah pernah login
  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      const modal = document.getElementById("loginModal");
      const app = document.getElementById("appContainer");
      if (modal) modal.style.display = "none";
      if (app) {
        app.style.display = "block";
        app.classList.remove("hidden");
      }
      const disp = document.getElementById("userDisplayName");
      if (disp) disp.textContent = currentUser.role;
      loadAllSpreadsheetData();
      return;
    }
  } catch (e) {}

  // Pastikan modal login tampil di awal
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "flex";
};

function logout() {
  try {
    sessionStorage.removeItem("dpsa_logged_in");
  } catch (e) {}
  location.reload();
}

// Fetch GViz Google Sheets
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

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number || 0);
}

// Load Data Fix Asset & Inventory
async function loadAllSpreadsheetData() {
  const loader = document.getElementById("globalLoader");
  if (loader) loader.style.display = "flex";

  try {
    // 1. Ambil Fix Aset
    const faRows = await fetchSheetData(CONFIG.SHEETS.FIX_ASSET);
    fixAssets = [];
    faRows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama) return;

      const rawImg = String(getCellValue(c[11]) || "");
      fixAssets.push({
        no: getCellValue(c[0]) || (fixAssets.length + 1),
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
        gambar: CONFIG.formatDriveImageUrl(rawImg)
      });
    });

    // 2. Ambil Inventory
    const invRows = await fetchSheetData(CONFIG.SHEETS.INVENTORY);
    inventoryItems = [];
    invRows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(getCellValue(c[1])).trim();
      const nama = String(getCellValue(c[2])).trim();
      if (!kode || kode.toLowerCase().includes("kode") || !nama || nama.toLowerCase().includes("nama")) return;

      // Klasifikasi Aktiva Tetap (Kolom I) vs Bukan Aktiva Tetap (Kolom J)
      const valI = String(getCellValue(c[8])).trim().toLowerCase();
      const valJ = String(getCellValue(c[9])).trim().toLowerCase();

      let klasifikasiText = "Bukan Aktiva Tetap";
      if (valI === "v" || valI === "ya" || valI === "true") {
        klasifikasiText = "Aktiva Tetap";
      } else if (valJ === "v" || valJ === "ya" || valJ === "true") {
        klasifikasiText = "Bukan Aktiva Tetap";
      }

      const rawImg = String(getCellValue(c[11]) || "");
      inventoryItems.push({
        no: getCellValue(c[0]) || (inventoryItems.length + 1),
        kode: kode,
        nama: nama,
        tipe: String(getCellValue(c[3]) || "-"),
        satuan: String(getCellValue(c[4]) || "Unit"),
        jumlah: parseInt(getCellValue(c[5])) || 1,
        tahun: String(getCellValue(c[6]) || "-"),
        kondisi: String(getCellValue(c[7]) || "Baik"),
        kategori: klasifikasiText,
        harga: parsePrice(getCellValue(c[10])),
        keterangan: String(getCellValue(c[12]) || "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg)
      });
    });

    renderOverview();
    renderFixAssetTable();
    renderInventoryTable();
  } catch (err) {
    console.error("Gagal sinkron data:", err);
  } finally {
    if (loader) loader.style.display = "none";
  }
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
