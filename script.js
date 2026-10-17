/**
 * script.js - Core Logic, Depreciation Calculator & Data Loader PT DPSA
 */

const VALID_USERS = [
  { u: "staff.it@dharmaputrainterior.co.id", p: "staff.itDPSA88", name: "Staff IT", role: "IT Support", initials: "IT" },
  { u: "hrga@dharmaputrainterior.co.id", p: "hrgaDPSA88", name: "HR & GA", role: "Human Resource & GA", initials: "HR" },
  { u: "keuangan@dharmaputrainterior.co.id", p: "keuanganDPSA88", name: "Keuangan", role: "Finance Accounting", initials: "KEU" }
];

let currentUser = null;
let rawFixAssets = [];
let calculatedFixAssets = [];
let inventoryItems = [];
let currentBatchType = 'fixasset';
let currentPaperSize = 'A4';
let isSidebarOpenDesktop = true;
let isSidebarOpenMobile = false;

// Format Angka Rupiah
function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);
}

// Format Angka Desimal Bersih
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
  return cleanStr ? parseFloat(cleanStr) : 0;
}

// Format Teks Multiline (Enter) agar Persis Spreadsheet
function formatMultilineText(text) {
  if (!text) return "-";
  return String(text).replace(/\n/g, "<br>");
}

// Generator URL QR Code
function getQrCodeUrl(code) {
  const baseUrl = window.location.href.split('index.html')[0].split('?')[0];
  const scanTargetUrl = `${baseUrl}barcode.html?code=${encodeURIComponent(String(code).trim())}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanTargetUrl)}&margin=1`;
}

// ==========================================
// FORMULA ENGINE SPREADSHEET (M, O, P, Q, R, S, U, V, W, X, Y)
// ==========================================
function calculateDepreciation(item, periodeBulan, periodeTahun) {
  const monthList = CONFIG.MONTH_NAMES;
  const cType = String(item.typeAktiva || "").toUpperCase();
  const kQty = item.qty || 1;
  const lHarga = item.hargaPerolehan || 0;

  // Rumus M : =IF(C8="","",K8*L8)
  const mTotalPerolehan = (cType === "") ? 0 : (kQty * lHarga);

  // Rumus O : =IFS(ISNUMBER(SEARCH("BANGUNAN", C8)), 20, ISNUMBER(SEARCH("MESIN", C8)), 8, ISNUMBER(SEARCH("KENDARAAN", C8)), 8, TRUE, 4)
  let oUmurTahun = 4;
  if (cType.includes("BANGUNAN")) {
    oUmurTahun = 20;
  } else if (cType.includes("MESIN") || cType.includes("KENDARAAN")) {
    oUmurTahun = 8;
  }

  // Rumus P : =IFERROR(O8*12,"")
  const pUmurBulan = oUmurTahun * 12;

  // Rumus Q : M8/P8
  const qDepresiasi = pUmurBulan > 0 ? (mTotalPerolehan / pUmurBulan) : 0;

  const nNilaiSisa = item.nilaiSisa || 0;
  const iBulanStr = String(item.bulanPenyusutan || "").trim().toUpperCase();
  const jTahun = parseInt(item.tahunPenyusutan) || 0;

  let uTahunKe = 0;
  let vBulanKe = 0;
  let wHasilBulan = 0;

  const matchR3 = monthList.indexOf(periodeBulan) + 1;
  const matchI8 = monthList.indexOf(iBulanStr) + 1;

  // Cek Kondisi: OR(TRIM(I8)="", N(J8)=0, N(O8)=0)
  if (iBulanStr !== "" && jTahun > 0 && oUmurTahun > 0 && matchR3 > 0 && matchI8 > 0) {
    // Perhitungan rentang bulan: (INT($R$4)-J8)*12 + MATCH($R$3,b,0) - MATCH(TRIM(I8),b,0) + 1
    const totalBulanBerjalan = ((parseInt(periodeTahun) - jTahun) * 12) + matchR3 - matchI8 + 1;
    
    // MIN(O8*12, totalBulanBerjalan)
    const effectiveMonths = Math.max(0, Math.min(oUmurTahun * 12, totalBulanBerjalan));

    // Rumus U : INT(MAX(0, MIN(...)) / 12)
    uTahunKe = Math.floor(effectiveMonths / 12);

    // Rumus V : MOD(MAX(0, MIN(...)), 12)
    vBulanKe = effectiveMonths % 12;

    // Rumus W : =U8*12+V8
    wHasilBulan = (uTahunKe * 12) + vBulanKe;
  }

  // Rumus X : =IFERROR((M8-N8)/P8,"")
  const xPenyusutanPerBulan = pUmurBulan > 0 ? ((mTotalPerolehan - nNilaiSisa) / pUmurBulan) : 0;

  // Rumus Y : =IF(OR(ISNUMBER(SEARCH("TANAH",C8)),N(X8)<=0,N(W8)<=0),0,MIN(N(W8)*N(X8),N(M8)-N(N8)))
  let yFixAkumulasi = 0;
  if (!cType.includes("TANAH") && xPenyusutanPerBulan > 0 && wHasilBulan > 0) {
    yFixAkumulasi = Math.min(wHasilBulan * xPenyusutanPerBulan, mTotalPerolehan - nNilaiSisa);
  }

  // Rumus R : =N(Y8)
  const rAkumulasiDepresiasi = yFixAkumulasi;

  // Rumus S : =MAX(0,M8-R8)
  const sNilaiBuku = Math.max(0, mTotalPerolehan - rAkumulasiDepresiasi);

  return {
    ...item,
    totalPerolehan: mTotalPerolehan,
    umurTahun: oUmurTahun,
    umurBulan: pUmurBulan,
    depresiasiRp: qDepresiasi,
    tahunKe: uTahunKe,
    bulanKe: vBulanKe,
    hasilBulan: wHasilBulan,
    penyusutanPerBulan: xPenyusutanPerBulan,
    akumulasiDepresiasi: rAkumulasiDepresiasi,
    nilaiBuku: sNilaiBuku
  };
}

// Inisialisasi Data Awal (Seed Fallback)
const SEED_FIX_ASSETS_NEW = [
  {
    no: 1,
    kodeAktiva: "FA/PO1/1/VII/DPSA/2021/P",
    typeAktiva: "BANGUNAN_1",
    namaAktiva: "Ruko Purwokerto",
    merk: "-",
    spesifikasi: "-",
    satuan: "Unit",
    tglPerolehan: "01/07/21",
    bulanPenyusutan: "JULI",
    tahunPenyusutan: "2021",
    qty: 1,
    hargaPerolehan: 392886900,
    nilaiSisa: 0,
    lokasi: "Produksi Mesin",
    keterangan: "Dekat Ruang Maintenance",
    linkGambar: "https://drive.google.com/file/d/1ZVf8fpD147c0enJuPNhS0GJDAPFof1Oq/view?usp=sharing"
  }
];

const SEED_INVENTORY_NEW = [
  {
    no: 1,
    kodeBarang: "INVNT/DPSA/R.S&M.1/2020/1",
    namaBarang: "Komputer",
    tipe: "Monitor: Samsung (I7)\nCPU: DST\nUPS: Prolink",
    satuan: "Set",
    jumlah: 1,
    tahun: "2024\n2019\n2019",
    kondisi: "Baik\nBaik\nBaik",
    hargaPerolehan: "1.265.000\n5.350.000\n595.000",
    totalHargaPerolehan: 7210000,
    gambar: "no image.png",
    keteranganLetak: "sebelah mba Jovita"
  }
];

// Login Handlers
function doLogin() {
  const e = document.getElementById("loginEmail");
  const p = document.getElementById("loginPassword");
  const errBox = document.getElementById("loginErrorMsg");

  const inputEmail = e ? e.value.trim().toLowerCase() : "";
  const inputPass = p ? p.value.trim() : "";

  const user = VALID_USERS.find(usr => {
    const full = usr.u.toLowerCase();
    const prefix = full.split("@")[0];
    return (inputEmail === full || inputEmail === prefix) && inputPass === usr.p;
  });

  if (user) {
    currentUser = user;
    try { sessionStorage.setItem("dpsa_logged_in", JSON.stringify(user)); } catch (err) {}
    
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("appContainer").style.display = "flex";

    document.getElementById("userProfileName").textContent = user.name;
    document.getElementById("userProfileRole").textContent = user.role;
    document.getElementById("userAvatarInitials").textContent = user.initials;

    if (errBox) errBox.style.display = "none";
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
  const isDesktop = window.innerWidth >= 768;
  const sidebar = document.getElementById("mainSidebar");
  if (sidebar) {
    if (isDesktop) {
      sidebar.classList.remove("md:hidden");
      sidebar.classList.add("md:flex");
      isSidebarOpenDesktop = true;
    } else {
      sidebar.classList.add("-translate-x-full");
      isSidebarOpenMobile = false;
    }
  }

  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      document.getElementById("loginModal").style.display = "none";
      document.getElementById("appContainer").style.display = "flex";
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

function toggleSidebar(forceState) {
  const sidebar = document.getElementById("mainSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const isDesktop = window.innerWidth >= 768;

  if (isDesktop) {
    isSidebarOpenDesktop = (typeof forceState === "boolean") ? forceState : !isSidebarOpenDesktop;
    if (isSidebarOpenDesktop) {
      sidebar.classList.remove("md:hidden");
      sidebar.classList.add("md:flex");
    } else {
      sidebar.classList.remove("md:flex");
      sidebar.classList.add("md:hidden");
    }
  } else {
    isSidebarOpenMobile = (typeof forceState === "boolean") ? forceState : !isSidebarOpenMobile;
    if (isSidebarOpenMobile) {
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0");
      if (backdrop) {
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100", "pointer-events-auto");
      }
    } else {
      sidebar.classList.add("-translate-x-full");
      sidebar.classList.remove("translate-x-0");
      if (backdrop) {
        backdrop.classList.add("opacity-0", "pointer-events-none");
        backdrop.classList.remove("opacity-100", "pointer-events-auto");
      }
    }
  }
  if (window.lucide) lucide.createIcons();
}

function onMobileNavClick() {
  if (window.innerWidth < 768) {
    toggleSidebar(false);
  }
}

// Inisialisasi Data
function initData() {
  rawFixAssets = SEED_FIX_ASSETS_NEW;
  inventoryItems = SEED_INVENTORY_NEW;
  
  applyFixAssetFilters();
  renderInventoryTable();
  syncDataViaJSONP();
}

// ==========================================
// PROSES DEPRESIASI & SINKRONISASI FILTER
// ==========================================
function applyFixAssetFilters() {
  const periodeBulan = document.getElementById("faPeriodeBulan").value;
  const periodeTahun = document.getElementById("faPeriodeTahun").value;
  const query = document.getElementById("faSearchInput").value.toLowerCase();

  // Olah rumus depresiasi untuk setiap baris aktiva
  calculatedFixAssets = rawFixAssets.map(item => calculateDepreciation(item, periodeBulan, periodeTahun));

  // Simpan cache agar barcode.html bisa membacanya instan
  try {
    localStorage.setItem("dpsa_cache_fa", JSON.stringify(calculatedFixAssets));
    localStorage.setItem("dpsa_cache_inv", JSON.stringify(inventoryItems));
  } catch (e) {}

  // Filter Search
  const filtered = calculatedFixAssets.filter(i => 
    String(i.kodeAktiva).toLowerCase().includes(query) ||
    String(i.namaAktiva).toLowerCase().includes(query) ||
    String(i.merk).toLowerCase().includes(query) ||
    String(i.lokasi).toLowerCase().includes(query)
  );

  renderOverview();
  renderFixAssetTable(filtered);
}

function filterInventory() {
  const query = document.getElementById("invSearchInput").value.toLowerCase();
  const filtered = inventoryItems.filter(i => 
    String(i.kodeBarang).toLowerCase().includes(query) ||
    String(i.namaBarang).toLowerCase().includes(query) ||
    String(i.keteranganLetak).toLowerCase().includes(query)
  );
  renderInventoryTable(filtered);
}

// ==========================================
// RENDERING OVERVIEW & TABEL
// ==========================================
function renderOverview() {
  // Total Nilai Fix Aset Diambil dari Kolom M (totalPerolehan)
  const nilaiFA = calculatedFixAssets.reduce((s, i) => s + (i.totalPerolehan || 0), 0);
  
  // Total Nilai Inventory Diambil dari Kolom J (totalHargaPerolehan)
  const nilaiInv = inventoryItems.reduce((s, i) => s + (i.totalHargaPerolehan || 0), 0);

  document.getElementById("ovTotalNilaiAll").textContent = formatRupiah(nilaiFA + nilaiInv);
  document.getElementById("ovTotalItemAll").textContent = `${calculatedFixAssets.length + inventoryItems.length} Item`;
  document.getElementById("ovNilaiFixAsset").textContent = formatRupiah(nilaiFA);
  document.getElementById("ovNilaiInventory").textContent = formatRupiah(nilaiInv);

  document.getElementById("badgeCountFixAsset").textContent = calculatedFixAssets.length;
  document.getElementById("badgeCountInventory").textContent = inventoryItems.length;

  // 5 Aset Nilai Tertinggi
  const topBody = document.getElementById("overviewTopTableBody");
  if (topBody) {
    topBody.innerHTML = "";
    [...calculatedFixAssets].sort((a, b) => b.totalPerolehan - a.totalPerolehan).slice(0, 5).forEach(item => {
      const qrUrl = getQrCodeUrl(item.kodeAktiva);
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 border-b border-slate-100";
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono font-bold text-blue-700 text-center">${item.kodeAktiva}</td>
        <td class="py-2.5 px-3 font-semibold text-slate-800 text-center">${formatMultilineText(item.namaAktiva)}</td>
        <td class="py-2.5 px-3 text-slate-600 text-center">${item.lokasi || "-"}</td>
        <td class="py-2.5 px-3 font-bold text-slate-900 text-center">${formatRupiah(item.totalPerolehan)}</td>
        <td class="py-2.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <img src="${qrUrl}" alt="QR" class="w-6 h-6 rounded border border-slate-200 cursor-pointer" onclick="openDetailData('${item.kodeAktiva}')">
            <button onclick="openDetailData('${item.kodeAktiva}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-[10px] font-bold transition">Detail</button>
          </div>
        </td>
      `;
      topBody.appendChild(tr);
    });
  }
}

// Render Tabel Fix Asset (Kolom A:S & U:AB)
function renderFixAssetTable(data) {
  const tbody = document.getElementById("faTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kodeAktiva);
    const imgUrl = CONFIG.formatDriveImageUrl(item.linkGambar);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-slate-100 text-center";
    tr.innerHTML = `
      <td class="py-2.5 px-2 text-slate-500">${idx + 1}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">${item.kodeAktiva}</td>
      <td class="py-2.5 px-3 font-medium text-slate-700">${item.typeAktiva}</td>
      <td class="py-2.5 px-4 font-semibold text-slate-800 text-left">${formatMultilineText(item.namaAktiva)}</td>
      <td class="py-2.5 px-3 text-slate-600">${formatMultilineText(item.merk)}</td>
      <td class="py-2.5 px-4 text-slate-600 text-[11px] max-w-xs text-left">${formatMultilineText(item.spesifikasi)}</td>
      <td class="py-2.5 px-2 text-slate-600">${item.satuan}</td>
      <td class="py-2.5 px-3 text-slate-600 whitespace-nowrap">${item.tglPerolehan}</td>
      <td class="py-2.5 px-2 text-slate-600">${item.bulanPenyusutan}</td>
      <td class="py-2.5 px-2 text-slate-600">${item.tahunPenyusutan}</td>
      <td class="py-2.5 px-2 font-bold text-slate-800">${item.qty}</td>
      <td class="py-2.5 px-3 font-medium text-slate-900">${formatRupiah(item.hargaPerolehan)}</td>
      <td class="py-2.5 px-3 font-bold text-blue-900 bg-amber-50/50">${formatRupiah(item.totalPerolehan)}</td>
      <td class="py-2.5 px-2 text-slate-500">${formatRupiah(item.nilaiSisa)}</td>
      <td class="py-2.5 px-2 text-slate-700 font-bold">${item.umurTahun}</td>
      <td class="py-2.5 px-2 text-slate-700">${item.umurBulan}</td>
      <td class="py-2.5 px-3 text-slate-700">${formatRupiah(item.depresiasiRp)}</td>
      <td class="py-2.5 px-3 text-slate-700 font-medium">${formatRupiah(item.akumulasiDepresiasi)}</td>
      <td class="py-2.5 px-3 font-bold text-emerald-700 bg-sky-50/50">${formatRupiah(item.nilaiBuku)}</td>
      <td class="py-2.5 px-2 bg-slate-50 font-semibold">${item.tahunKe}</td>
      <td class="py-2.5 px-2 bg-slate-50 font-semibold">${item.bulanKe}</td>
      <td class="py-2.5 px-2 bg-slate-50">${item.hasilBulan}</td>
      <td class="py-2.5 px-3 bg-slate-50">${formatRupiah(item.penyusutanPerBulan)}</td>
      <td class="py-2.5 px-3 bg-slate-50">${formatRupiah(item.akumulasiDepresiasi)}</td>
      <td class="py-2.5 px-3 text-slate-700 whitespace-nowrap">${item.lokasi || "-"}</td>
      <td class="py-2.5 px-3 text-slate-500 text-[11px]">${formatMultilineText(item.keterangan)}</td>
      <td class="py-2.5 px-2">
        <img src="${imgUrl}" alt="${item.namaAktiva}" class="w-8 h-8 object-cover rounded-lg border border-slate-200 mx-auto" onerror="this.onerror=null;this.src='no image.png';">
      </td>
      <td class="py-2.5 px-3 whitespace-nowrap">
        <div class="flex items-center justify-center gap-1.5">
          <img src="${qrUrl}" alt="QR" class="w-7 h-7 rounded border border-slate-300 bg-white p-0.5 cursor-pointer" onclick="openDetailData('${item.kodeAktiva}')">
          <button onclick="openDetailData('${item.kodeAktiva}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-[10px] font-bold transition">Detail</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

// Render Tabel Inventory Sesuai Urutan Kolom A:L
function renderInventoryTable(filtered = null) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || inventoryItems;

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kodeBarang);
    const imgUrl = CONFIG.formatDriveImageUrl(item.gambar);

    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/40 border-b border-slate-100 text-center";
    tr.innerHTML = `
      <td class="py-2.5 px-2 text-slate-500">${idx + 1}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">${item.kodeBarang}</td>
      <td class="py-2.5 px-4 font-semibold text-slate-800 text-left">${formatMultilineText(item.namaBarang)}</td>
      <td class="py-2.5 px-4 text-slate-600 text-[11px] text-left leading-relaxed">${formatMultilineText(item.tipe)}</td>
      <td class="py-2.5 px-3 text-slate-600">${item.satuan}</td>
      <td class="py-2.5 px-2 font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-2.5 px-2 text-slate-600 leading-relaxed">${formatMultilineText(item.tahun)}</td>
      <td class="py-2.5 px-2 text-slate-600 leading-relaxed">${formatMultilineText(item.kondisi)}</td>
      <td class="py-2.5 px-3 font-medium text-slate-700 text-right leading-relaxed">${formatMultilineText(item.hargaPerolehan)}</td>
      <td class="py-2.5 px-3 font-bold text-emerald-900 bg-emerald-50/50 text-right">${formatRupiah(item.totalHargaPerolehan)}</td>
      <td class="py-2.5 px-2">
        <img src="${imgUrl}" alt="${item.namaBarang}" class="w-8 h-8 object-cover rounded-lg border border-slate-200 mx-auto" onerror="this.onerror=null;this.src='no image.png';">
      </td>
      <td class="py-2.5 px-3 text-slate-500 text-[11px] text-left leading-relaxed">${formatMultilineText(item.keteranganLetak)}</td>
      <td class="py-2.5 px-3 whitespace-nowrap">
        <div class="flex items-center justify-center gap-1.5">
          <img src="${qrUrl}" alt="QR" class="w-7 h-7 rounded border border-slate-300 bg-white p-0.5 cursor-pointer hover:scale-125 transition-transform" onclick="openDetailData('${item.kodeBarang}')" title="Klik untuk lihat detail">
          <button onclick="openDetailData('${item.kodeBarang}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
            <i data-lucide="eye" class="w-3 h-3"></i>
            <span>Detail</span>
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

// JSONP Live Data
function syncDataViaJSONP() {
  if (typeof CONFIG === 'undefined') return;

  // Handler Fix Aset Baru (0-based Index Kolom A s/d AB)
  window.handleFixAssetData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const parsed = [];
    json.table.rows.forEach((r, idx) => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[3]?.v || "").trim();
      if (!kode || kode.toUpperCase().includes("KODE") || !nama) return;

      parsed.push({
        no: c[0]?.v || (parsed.length + 1),
        kodeAktiva: kode,
        typeAktiva: String(c[2]?.v || ""),
        namaAktiva: nama,
        merk: String(c[4]?.v || "-"),
        spesifikasi: String(c[5]?.v || "-"),
        satuan: String(c[6]?.v || "Unit"),
        tglPerolehan: String(c[7]?.f || c[7]?.v || "-"),
        bulanPenyusutan: String(c[8]?.v || "").toUpperCase(),
        tahunPenyusutan: c[9]?.v || 0,
        qty: parseInt(c[10]?.v) || 1,
        hargaPerolehan: parsePrice(c[11]?.v),
        nilaiSisa: parsePrice(c[13]?.v),
        lokasi: String(c[25]?.v || ""),
        keterangan: String(c[26]?.v || ""),
        linkGambar: String(c[27]?.v || "")
      });
    });

    if (parsed.length > 0) {
      rawFixAssets = parsed;
      applyFixAssetFilters();
    }
  };

  // Handler Inventory (Kolom A s/d L)
window.handleInventoryData = function(json) {
  if (!json || !json.table || !json.table.rows) return;
  const parsed = [];
  json.table.rows.forEach((r, idx) => {
    const c = r.c || [];
    const kode = String(c[1]?.v || "").trim();
    const nama = String(c[2]?.v || "").trim();
    
    // Abaikan baris header atau baris kosong
    if (!kode || kode.toUpperCase().includes("KODE") || !nama || nama.toUpperCase().includes("NAMA")) return;

    // Helper untuk mengambil nilai format teks (mempertahankan enter)
    const getText = (cell) => {
      if (!cell) return "-";
      return cell.f !== undefined && cell.f !== null ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : "-");
    };

    parsed.push({
      no: c[0]?.v || (parsed.length + 1),
      kodeBarang: kode,                         // Kolom B
      namaBarang: nama,                         // Kolom C
      tipe: getText(c[3]),                      // Kolom D (Tipe/Ukuran multiline)
      satuan: String(c[4]?.v || "Unit"),        // Kolom E (Satuan/ kemasan terkecil)
      jumlah: parseInt(c[5]?.v) || 1,           // Kolom F (Jumlah)
      tahun: getText(c[6]),                     // Kolom G (Tahun Perolehan multiline)
      kondisi: getText(c[7]),                   // Kolom H (Kondisi Aset multiline)
      hargaPerolehan: getText(c[8]),            // Kolom I (Harga Perolehan multiline)
      totalHargaPerolehan: parsePrice(c[9]?.v), // Kolom J (Total Harga Perolehan)
      gambar: String(c[10]?.v || ""),           // Kolom K (Dokumen Gambar)
      keteranganLetak: getText(c[11])           // Kolom L (Keterangan Letak)
    });
  });

  if (parsed.length > 0) {
    inventoryItems = parsed;
    renderInventoryTable();
    renderOverview();
  }
};

  const scriptFA = document.createElement("script");
  scriptFA.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleFixAssetData&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
  document.body.appendChild(scriptFA);

  const scriptInv = document.createElement("script");
  scriptInv.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleInventoryData&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
  document.body.appendChild(scriptInv);
}

// Navigasi Tab
function switchTab(tabId) {
  ['overview', 'fixasset', 'inventory'].forEach(s => {
    const secEl = document.getElementById(`section-${s}`);
    const navEl = document.getElementById(`nav-${s}`);
    if (secEl) secEl.classList.add('hidden');
    if (navEl) {
      navEl.className = "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer text-left";
    }
  });

  const targetSec = document.getElementById(`section-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetNav) {
    targetNav.className = "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-white bg-blue-600 shadow-sm shadow-blue-900/40 cursor-pointer text-left";
  }

  const titles = { 
    overview: "Overview", 
    fixasset: "Dashboard Fix Asset", 
    inventory: "Dashboard Inventory" 
  };
  document.getElementById("topBarTitle").textContent = titles[tabId];
}

// Batch Print Barcode (Stiker 5x5 cm)
function openBatchPrintModal(type) {
  currentBatchType = type;
  const isFA = (type === 'fixasset');
  const list = isFA ? calculatedFixAssets : inventoryItems;
  
  const modal = document.getElementById("batchPrintModal");
  const title = document.getElementById("batchPrintTitle");
  const sub = document.getElementById("batchPrintSubtitle");
  const container = document.getElementById("barcodeGridContainer");

  if (!modal || !container) return;

  title.textContent = isFA ? "Cetak Barcode Fix Asset" : "Cetak Barcode Inventory";
  sub.textContent = `Total ${list.length} label stiker baku 5 x 5 cm`;

  container.innerHTML = "";
  list.forEach((item) => {
    const kode = isFA ? item.kodeAktiva : item.kodeBarang;
    const qrUrl = getQrCodeUrl(kode);
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
        <img src="${qrUrl}" alt="${kode}" class="sticker-qr-img">
      </div>
      <div class="sticker-footer">
        <div class="sticker-code">${kode}</div>
      </div>
    `;
    container.appendChild(card);
  });

  modal.classList.remove("hidden");
  modal.style.display = "flex";
  setPaperSize('A4');
  if (window.lucide) lucide.createIcons();
}

function setPaperSize(size) {
  currentPaperSize = size;
  const btnA4 = document.getElementById("btnPaperA4");
  const btnA3 = document.getElementById("btnPaperA3");
  const printableArea = document.getElementById("printableArea");
  const container = document.getElementById("barcodeGridContainer");

  if (!btnA4 || !btnA3 || !printableArea || !container) return;

  if (size === 'A4') {
    btnA4.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white transition";
    btnA3.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white transition";
    printableArea.className = "paper-sheet paper-a4";
    container.className = "grid-a4";
  } else {
    btnA3.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white transition";
    btnA4.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white transition";
    printableArea.className = "paper-sheet paper-a3";
    container.className = "grid-a3";
  }
}

function triggerPrint() {
  window.print();
}
