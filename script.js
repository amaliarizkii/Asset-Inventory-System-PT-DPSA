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

// Generator URL QR Code Tajam
function getQrCodeUrl(code) {
  // Langsung mengarah ke URL scanner barcode.html
  const scanTargetUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}barcode.html?code=${encodeURIComponent(code)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(scanTargetUrl)}&margin=1`;
}

// Data Bawaan Langsung dari Spreadsheet
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

function pickAccount(email, pass) {
  const user = VALID_USERS.find(usr => usr.u.toLowerCase() === email.toLowerCase() && pass === usr.p);
  if (user) {
    currentUser = user;
    try { sessionStorage.setItem("dpsa_logged_in", JSON.stringify(user)); } catch (e) {}
    document.getElementById("loginModal").style.display = "none";
    const app = document.getElementById("appContainer");
    app.style.display = "flex";
    app.classList.remove("hidden");

    document.getElementById("userProfileName").textContent = user.name;
    document.getElementById("userProfileRole").textContent = user.role;
    document.getElementById("userAvatarInitials").textContent = user.initials;

    initData();
  }
}

window.onload = function() {
  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      document.getElementById("loginModal").style.display = "none";
      const app = document.getElementById("appContainer");
      app.style.display = "flex";
      app.classList.remove("hidden");
      document.getElementById("userProfileName").textContent = currentUser.name;
      document.getElementById("userProfileRole").textContent = currentUser.role;
      document.getElementById("userAvatarInitials").textContent = currentUser.initials;
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

function initData() {
  fixAssets = SEED_FIX_ASSETS.map(item => ({
    ...item,
    gambar: item.driveId ? CONFIG.formatDriveImageUrl(`https://drive.google.com/file/d/${item.driveId}/view`) : 'no image.png'
  }));

  inventoryItems = SEED_INVENTORY.map(item => ({
    ...item,
    gambar: item.driveId ? CONFIG.formatDriveImageUrl(`https://drive.google.com/file/d/${item.driveId}/view`) : 'no image.png'
  }));

  try {
    localStorage.setItem("dpsa_cache_fa", JSON.stringify(fixAssets));
    localStorage.setItem("dpsa_cache_inv", JSON.stringify(inventoryItems));
  } catch (e) {}

  renderAll();
  syncDataViaJSONP();
}

// JSONP Sync
function syncDataViaJSONP() {
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
        gambar: CONFIG.formatDriveImageUrl(String(c[11]?.v || ""))
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
        gambar: CONFIG.formatDriveImageUrl(String(c[11]?.v || ""))
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

  document.getElementById("ovTotalItemAll").textContent = `${(totalFA + totalInv).toLocaleString("id-ID")} Item`;
  document.getElementById("ovTotalNilaiAll").textContent = formatRupiah(nilaiFA + nilaiInv);
  document.getElementById("ovNilaiFixAsset").textContent = formatRupiah(nilaiFA);
  document.getElementById("ovNilaiInventory").textContent = formatRupiah(nilaiInv);
  document.getElementById("badgeCountFixAsset").textContent = fixAssets.length;
  document.getElementById("badgeCountInventory").textContent = inventoryItems.length;

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
            <!-- QR Code berdampingan -->
            <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-200 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk scan / buka detail">
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

// Render Tabel Fix Asset (QR Code Bersanding di Samping Tombol "Lihat Detail Data")
function renderFixAssetTable(filtered = null) {
  const tbody = document.getElementById("faTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || fixAssets;

  document.getElementById("faTotalItem").textContent = `${data.length} Unit`;
  document.getElementById("faTotalNilai").textContent = formatRupiah(data.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0));

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
          <!-- QR Code Berdampingan di samping tombol -->
          <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-300 bg-white p-0.5 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk buka paspor detail">
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

// Render Tabel Inventory (QR Code Bersanding di Samping Tombol "Lihat Detail Data")
function renderInventoryTable(filtered = null) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || inventoryItems;

  document.getElementById("invTotalItem").textContent = `${data.length} SKU`;
  document.getElementById("invTotalNilai").textContent = formatRupiah(data.reduce((s, i) => s + (i.harga * (i.jumlah || 1)), 0));
  document.getElementById("invTotalKuantitas").textContent = data.reduce((s, i) => s + (i.jumlah || 1), 0).toLocaleString("id-ID");

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
          <!-- QR Code Berdampingan di samping tombol -->
          <img src="${qrUrl}" alt="QR" class="w-8 h-8 rounded border border-slate-300 bg-white p-0.5 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kode}')" title="Klik untuk buka detail">
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
// FITUR CETAK SELURUH BARCODE (PISAHKAN FIX ASSET & INVENTORY)
// ========================================================
function openBatchPrintModal(type) {
  currentBatchType = type;
  const isFA = type === 'fixasset';
  const list = isFA ? fixAssets : inventoryItems;
  const modal = document.getElementById("batchPrintModal");
  const title = document.getElementById("batchPrintTitle");
  const sub = document.getElementById("batchPrintSubtitle");
  const container = document.getElementById("barcodeGridContainer");

  title.textContent = isFA ? "Cetak Seluruh Barcode Fix Asset (Aktiva Tetap)" : "Cetak Seluruh Barcode Inventory (Persediaan)";
  sub.textContent = `Menyiapkan ${list.length} label barcode untuk dicetak`;

  // Render Grid Barcode Label Stiker
  container.innerHTML = "";
  list.forEach(item => {
    const qrUrl = getQrCodeUrl(item.kode);
    const card = document.createElement("div");
    card.className = "border-2 border-slate-300 rounded-xl p-2.5 flex flex-col items-center justify-between text-center bg-white shadow-xs print-card";
    card.innerHTML = `
      <div class="w-full flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 text-[9px] font-bold text-slate-600">
        <span class="text-blue-800 font-black">PT DPSA</span>
        <span>${isFA ? 'FIX ASSET' : 'INVENTORY'}</span>
      </div>
      <div class="my-1">
        <img src="${qrUrl}" alt="QR" class="w-24 h-24 sm:w-28 sm:h-28 object-contain">
      </div>
      <div class="w-full mt-1.5 pt-1 border-t border-slate-200">
        <p class="font-mono font-black text-[10px] sm:text-xs text-slate-900 break-all leading-tight">${item.kode}</p>
        <p class="text-[9px] text-slate-600 truncate mt-0.5">${item.nama}</p>
      </div>
    `;
    container.appendChild(card);
  });

  setPaperSize('A4'); // default A4
  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeBatchPrintModal() {
  document.getElementById("batchPrintModal").classList.add("hidden");
}

function setPaperSize(size) {
  currentPaperSize = size;
  const btnA4 = document.getElementById("btnPaperA4");
  const btnA3 = document.getElementById("btnPaperA3");
  const printable = document.getElementById("printableArea");
  const container = document.getElementById("barcodeGridContainer");

  if (size === 'A4') {
    btnA4.className = "px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white transition";
    btnA3.className = "px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
    printable.className = "bg-white p-6 shadow-md rounded-2xl w-full max-w-4xl paper-a4";
    container.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4";
  } else {
    btnA3.className = "px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white transition";
    btnA4.className = "px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
    printable.className = "bg-white p-8 shadow-md rounded-2xl w-full max-w-6xl paper-a3";
    container.className = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3";
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
  ['overview', 'fixasset', 'inventory'].forEach(s => {
    document.getElementById(`section-${s}`).classList.add('hidden');
    document.getElementById(`nav-${s}`).className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition";
  });
  document.getElementById(`section-${tabId}`).classList.remove('hidden');
  document.getElementById(`nav-${tabId}`).className = "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition text-white bg-blue-600 shadow-md shadow-blue-900/40";
  
  const titles = { overview: "1. Overview", fixasset: "2. Dashboard Fix Asset", inventory: "3. Dashboard Inventory" };
  document.getElementById("topBarTitle").textContent = titles[tabId];
}
