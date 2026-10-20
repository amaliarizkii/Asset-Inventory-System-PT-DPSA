/**
 * script.js - Core Logic, Dynamic Auth, Calculations & URL Router PT DPSA
 */

// Akun Pengguna Dinamis (Akan dimuat langsung dari tab "Akses User")
let dynamicUsers = [
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

// Format Rupiah
function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num || 0);
}

// Parse Harga Bersih
function parsePrice(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
  return cleanStr ? parseFloat(cleanStr) : 0;
}

// Format Teks Multiline (Enter)
function formatMultilineText(text) {
  if (!text || text === "-") return "-";
  return String(text).replace(/\n/g, "<br>");
}

// Helper khusus untuk menampilkan nilai rupiah hanya jika nilainya > 0 / ada di spreadsheet
function formatNilaiInventory(num) {
  if (!num || num === 0) return "-";
  return formatRupiah(num);
}

// Generator QR Code (Format Baru: /?kode=...)
function getQrCodeUrl(code) {
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/index\.html$/, '');
  const cleanPath = path.endsWith('/') ? path : `${path}/`;
  const scanTargetUrl = `${origin}${cleanPath}?kode=${encodeURIComponent(String(code).trim())}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scanTargetUrl)}&margin=1`;
}

// Tombol Detail di Tabel (Format Baru: /?kode=...)
function openDetailData(kode) {
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/index\.html$/, '');
  const cleanPath = path.endsWith('/') ? path : `${path}/`;
  window.open(`${origin}${cleanPath}?kode=${encodeURIComponent(String(kode).trim())}`, '_blank');
}

// ========================================================
// RUMUS FIX ASET TERBARU (M, O, P, Q, R, S, U, V, W, X, Y)
// ========================================================
function calculateDepreciation(item, periodeBulan, periodeTahun) {
  const monthList = (typeof CONFIG !== 'undefined' && CONFIG.MONTH_NAMES) ? CONFIG.MONTH_NAMES : [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
  ];
  
  const cType = String(item.typeAktiva || "").toUpperCase();
  const kQty = item.qty || 1;
  const lHarga = item.hargaPerolehan || 0;

  // M : =IF(C8="","",K8*L8)
  const mTotalPerolehan = (cType === "") ? 0 : (kQty * lHarga);

  // O : =IFS(ISNUMBER(SEARCH("BANGUNAN", C8)), 20, ISNUMBER(SEARCH("MESIN", C8)), 8, ISNUMBER(SEARCH("KENDARAAN", C8)), 8, TRUE, 4)
  let oUmurTahun = 4;
  if (cType.includes("BANGUNAN")) {
    oUmurTahun = 20;
  } else if (cType.includes("MESIN") || cType.includes("KENDARAAN")) {
    oUmurTahun = 8;
  }

  // P : =IFERROR(O8*12,"")
  const pUmurBulan = oUmurTahun * 12;

  // Q : M8/P8
  const qDepresiasi = pUmurBulan > 0 ? (mTotalPerolehan / pUmurBulan) : 0;

  const nNilaiSisa = item.nilaiSisa || 0;
  const iBulanStr = String(item.bulanPenyusutan || "").trim().toUpperCase();
  const jTahun = parseInt(item.tahunPenyusutan) || 0;

  let uTahunKe = 0;
  let vBulanKe = 0;
  let wHasilBulan = 0;

  const matchR3 = monthList.indexOf(periodeBulan) + 1;
  const matchI8 = monthList.indexOf(iBulanStr) + 1;

  // Rumus U & V dengan LET(b, ..., INT(MAX(0, MIN(O8*12, ...))/12))
  if (iBulanStr !== "" && jTahun > 0 && oUmurTahun > 0 && matchR3 > 0 && matchI8 > 0) {
    const totalBulanBerjalan = ((parseInt(periodeTahun) - jTahun) * 12) + matchR3 - matchI8 + 1;
    const effectiveMonths = Math.max(0, Math.min(oUmurTahun * 12, totalBulanBerjalan));

    uTahunKe = Math.floor(effectiveMonths / 12);
    vBulanKe = effectiveMonths % 12;
    wHasilBulan = (uTahunKe * 12) + vBulanKe; // Rumus W : =U8*12+V8
  }

  // X : =IFERROR((M8-N8)/P8,"")
  const xPenyusutanPerBulan = pUmurBulan > 0 ? ((mTotalPerolehan - nNilaiSisa) / pUmurBulan) : 0;

  // Y : =IF(OR(ISNUMBER(SEARCH("TANAH",C8)),N(X8)<=0,N(W8)<=0),0,MIN(N(W8)*N(X8),N(M8)-N(N8)))
  let yFixAkumulasi = 0;
  if (!cType.includes("TANAH") && xPenyusutanPerBulan > 0 && wHasilBulan > 0) {
    yFixAkumulasi = Math.min(wHasilBulan * xPenyusutanPerBulan, mTotalPerolehan - nNilaiSisa);
  }

  // R : =N(Y8)
  const rAkumulasiDepresiasi = yFixAkumulasi;

  // S : =MAX(0,M8-R8)
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

// ========================================================
// SISTEM LOGIN & OTENTIKASI DINAMIS DARI SPREADSHEET
// ========================================================
function loadDynamicUsersFromSheets() {
  if (typeof CONFIG === 'undefined') return;

  window.handleUsersData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const users = [];
    json.table.rows.forEach(r => {
      const c = r.c || [];
      const username = String(c[0]?.v || "").trim();
      const password = String(c[1]?.v || "").trim();
      const name = String(c[2]?.v || username).trim();
      const role = String(c[3]?.v || "Staff").trim();

      if (username && password) {
        users.push({
          u: username,
          p: password,
          name: name,
          role: role,
          initials: name.substring(0, 2).toUpperCase()
        });
      }
    });

    if (users.length > 0) {
      dynamicUsers = users;
    }
  };

  const scriptUsers = document.createElement("script");
  scriptUsers.src = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:handleUsersData&sheet=${encodeURIComponent(CONFIG.SHEETS.USERS)}&headers=0`;
  document.body.appendChild(scriptUsers);
}

function doLogin() {
  const emailInput = document.getElementById("loginEmail");
  const passInput = document.getElementById("loginPassword");
  const errBox = document.getElementById("loginErrorMsg");

  const inputEmail = emailInput ? emailInput.value.trim().toLowerCase() : "";
  const inputPass = passInput ? passInput.value.trim() : "";

  const user = dynamicUsers.find(usr => {
    const fullEmail = usr.u.toLowerCase();
    const prefix = fullEmail.split("@")[0];
    return (inputEmail === fullEmail || inputEmail === prefix) && inputPass === usr.p;
  });

  if (user) {
    currentUser = user;
    try { sessionStorage.setItem("dpsa_logged_in", JSON.stringify(user)); } catch (e) {}
    
    const loginModal = document.getElementById("loginModal");
    const appContainer = document.getElementById("appContainer");
    if (loginModal) loginModal.style.display = "none";
    if (appContainer) appContainer.style.display = "flex";

    const nameEl = document.getElementById("userProfileName");
    const roleEl = document.getElementById("userProfileRole");
    const initEl = document.getElementById("userAvatarInitials");
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (initEl) initEl.textContent = user.initials;

    if (errBox) errBox.style.display = "none";
    
    switchTab('overview');
    initData();
  } else {
    if (errBox) {
      errBox.textContent = "Username atau password salah!";
      errBox.style.display = "block";
    } else {
      alert("Username atau password salah!");
    }
  }
}

// ========================================================
// ROUTER LANGSUNG KE PASPOR ASET (?kode=...)
// ========================================================
function checkDirectPassportParameter() {
  const params = new URLSearchParams(window.location.search);
  const targetKode = params.get('kode') || params.get('code');
  
  if (targetKode) {
    const cleanTarget = String(targetKode).trim().toUpperCase().replace(/\s+/g, '');
    
    const loginModal = document.getElementById("loginModal");
    const appContainer = document.getElementById("appContainer");
    const passportView = document.getElementById("directPassportView");
    
    if (loginModal) loginModal.style.display = "none";
    if (appContainer) appContainer.style.display = "none";
    if (passportView) passportView.style.display = "flex";

    let found = null;
    let isInv = false;
    try {
      const cachedFA = JSON.parse(localStorage.getItem("dpsa_cache_fa") || "[]");
      const cachedInv = JSON.parse(localStorage.getItem("dpsa_cache_inv") || "[]");
      found = cachedFA.find(i => String(i.kodeAktiva).trim().toUpperCase().replace(/\s+/g, '') === cleanTarget);
      if (!found) {
        found = cachedInv.find(i => String(i.kodeBarang).trim().toUpperCase().replace(/\s+/g, '') === cleanTarget);
        if (found) isInv = true;
      }
    } catch (e) {}

    if (found) {
      renderDirectPassport(found, isInv);
    } else {
      fetchLiveItemAndRender(cleanTarget, targetKode);
    }
    return true;
  }
  return false;
}

function renderDirectPassport(item, isInv) {
  if (isInv) {
    const lblKode = document.getElementById("passLblKode");
    const qrKode = document.getElementById("passQrKode");
    const lblNama = document.getElementById("passLblNama");
    const qrNama = document.getElementById("passQrNama");
    const rowSpek = document.getElementById("passRowSpek");
    const lblSpek = document.getElementById("passLblSpek");
    const qrSpek = document.getElementById("passQrSpek");
    const rowMerk = document.getElementById("passRowMerk");
    const rowTgl = document.getElementById("passRowTgl");
    const rowHarga = document.getElementById("passRowHarga");
    const rowLokasi = document.getElementById("passRowLokasi");
    const lblKet = document.getElementById("passLblKeterangan");
    const qrKet = document.getElementById("passQrKeterangan");
    const fotoEl = document.getElementById("passQrFoto");

    if (lblKode) lblKode.textContent = "Kode Barang";
    if (qrKode) qrKode.textContent = item.kodeBarang || "-";
    if (lblNama) lblNama.textContent = "Nama Barang";
    if (qrNama) qrNama.innerHTML = formatMultilineText(item.namaBarang);
    
    if (rowSpek) rowSpek.style.display = "flex";
    if (lblSpek) lblSpek.textContent = "Tipe / Ukuran";
    if (qrSpek) qrSpek.innerHTML = formatMultilineText(item.tipe);

    if (rowMerk) rowMerk.style.display = "none";
    if (rowTgl) rowTgl.style.display = "none";
    if (rowHarga) rowHarga.style.display = "none";
    if (rowLokasi) rowLokasi.style.display = "none";

    if (lblKet) lblKet.textContent = "Keterangan (Letak)";
    if (qrKet) qrKet.innerHTML = formatMultilineText(item.keteranganLetak);

    if (fotoEl && typeof CONFIG !== 'undefined') {
      fotoEl.src = CONFIG.formatDriveImageUrl(item.gambar);
    }
  } else {
    const lblKode = document.getElementById("passLblKode");
    const qrKode = document.getElementById("passQrKode");
    const lblNama = document.getElementById("passLblNama");
    const qrNama = document.getElementById("passQrNama");
    const rowMerk = document.getElementById("passRowMerk");
    const qrMerk = document.getElementById("passQrMerk");
    const rowSpek = document.getElementById("passRowSpek");
    const lblSpek = document.getElementById("passLblSpek");
    const qrSpek = document.getElementById("passQrSpek");
    const rowTgl = document.getElementById("passRowTgl");
    const qrTgl = document.getElementById("passQrTgl");
    const rowHarga = document.getElementById("passRowHarga");
    const qrHarga = document.getElementById("passQrHarga");
    const rowLokasi = document.getElementById("passRowLokasi");
    const qrLokasi = document.getElementById("passQrLokasi");
    const lblKet = document.getElementById("passLblKeterangan");
    const qrKet = document.getElementById("passQrKeterangan");
    const fotoEl = document.getElementById("passQrFoto");

    if (lblKode) lblKode.textContent = "Kode Aktiva";
    if (qrKode) qrKode.textContent = item.kodeAktiva || "-";
    if (lblNama) lblNama.textContent = "Nama Aktiva Tetap";
    if (qrNama) qrNama.innerHTML = formatMultilineText(item.namaAktiva);

    if (rowMerk) rowMerk.style.display = "flex";
    if (qrMerk) qrMerk.innerHTML = formatMultilineText(item.merk);

    if (rowSpek) rowSpek.style.display = "flex";
    if (lblSpek) lblSpek.textContent = "Spesifikasi";
    if (qrSpek) qrSpek.innerHTML = formatMultilineText(item.spesifikasi);

    if (rowTgl) rowTgl.style.display = "flex";
    if (qrTgl) qrTgl.textContent = item.tglPerolehan || "-";

    if (rowHarga) rowHarga.style.display = "flex";
    if (qrHarga) qrHarga.textContent = formatRupiah(item.hargaPerolehan || 0);

    if (rowLokasi) rowLokasi.style.display = "flex";
    if (qrLokasi) qrLokasi.textContent = (item.lokasi || "-").toUpperCase();

    if (lblKet) lblKet.textContent = "Keterangan";
    if (qrKet) qrKet.innerHTML = formatMultilineText(item.keterangan);

    if (fotoEl && typeof CONFIG !== 'undefined') {
      fotoEl.src = CONFIG.formatDriveImageUrl(item.linkGambar);
    }
  }
  if (window.lucide) lucide.createIcons();
}

async function fetchLiveItemAndRender(cleanTarget, originalKode) {
  if (typeof CONFIG === 'undefined') return;

  try {
    const faUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
    const respFA = await fetch(faUrl);
    const textFA = await respFA.text();
    const jsonStrFA = textFA.substring(textFA.indexOf("(") + 1, textFA.lastIndexOf(")"));
    const dataFA = JSON.parse(jsonStrFA);

    let match = null;
    if (dataFA?.table?.rows) {
      dataFA.table.rows.forEach(r => {
        const c = r.c || [];
        const kode = String(c[1]?.v || "").trim();
        if (kode.toUpperCase().replace(/\s+/g, '') === cleanTarget) {
          match = {
            kodeAktiva: kode,
            namaAktiva: c[3]?.v || "-",
            merk: c[4]?.v || "-",
            spesifikasi: c[5]?.v || "-",
            tglPerolehan: c[7]?.f || c[7]?.v || "-",
            hargaPerolehan: parsePrice(c[11]?.v),
            lokasi: c[25]?.v || "PT DPSA",
            keterangan: c[26]?.v || "-",
            linkGambar: c[27]?.v || ""
          };
        }
      });
    }

    if (match) {
      renderDirectPassport(match, false);
      return;
    }

    const invUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
    const respInv = await fetch(invUrl);
    const textInv = await respInv.text();
    const jsonStrInv = textInv.substring(textInv.indexOf("(") + 1, textInv.lastIndexOf(")"));
    const dataInv = JSON.parse(jsonStrInv);

    if (dataInv?.table?.rows) {
      dataInv.table.rows.forEach(r => {
        const c = r.c || [];
        const kode = String(c[1]?.v || "").trim();
        if (kode.toUpperCase().replace(/\s+/g, '') === cleanTarget) {
          match = {
            kodeBarang: kode,
            namaBarang: c[2]?.v || "-",
            tipe: c[3]?.v || "-",
            gambar: c[12]?.v || "",
            keteranganLetak: c[13]?.v || "-"
          };
        }
      });
    }

    if (match) {
      renderDirectPassport(match, true);
    } else {
      renderDirectPassport({
        kodeAktiva: originalKode,
        namaAktiva: "DATA BARANG TIDAK DITEMUKAN",
        merk: "-",
        spesifikasi: "-",
        tglPerolehan: "-",
        hargaPerolehan: 0,
        lokasi: "PT DPSA",
        keterangan: "-",
        linkGambar: "no image.png"
      }, false);
    }
  } catch (err) {
    console.error("Gagal mengambil data live:", err);
  }
}

// ========================================================
// WINDOW ONLOAD UTAMA
// ========================================================
window.onload = function() {
  // 1. Cek parameter scan QR (?kode=...) terlebih dahulu
  if (checkDirectPassportParameter()) {
    return;
  }

  // 2. Muat akun dinamis dari tab Akses User
  loadDynamicUsersFromSheets();

  // 3. Konfigurasi sidebar default
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

  // 4. Cek sesi login tersimpan
  try {
    const saved = sessionStorage.getItem("dpsa_logged_in");
    if (saved) {
      currentUser = JSON.parse(saved);
      const loginModal = document.getElementById("loginModal");
      const appContainer = document.getElementById("appContainer");
      if (loginModal) loginModal.style.display = "none";
      if (appContainer) appContainer.style.display = "flex";

      const nameEl = document.getElementById("userProfileName");
      const roleEl = document.getElementById("userProfileRole");
      const initEl = document.getElementById("userAvatarInitials");
      if (nameEl) nameEl.textContent = currentUser.name;
      if (roleEl) roleEl.textContent = currentUser.role;
      if (initEl) initEl.textContent = currentUser.initials;
      
      switchTab('overview');
      initData();
      return;
    }
  } catch (e) {}

  const loginModal = document.getElementById("loginModal");
  if (loginModal) loginModal.style.display = "flex";
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
  applyFixAssetFilters();
  renderInventoryTable();
  syncDataViaJSONP();
}

function applyFixAssetFilters() {
  const periodeBulanEl = document.getElementById("faPeriodeBulan");
  const periodeTahunEl = document.getElementById("faPeriodeTahun");
  const faSearchInputEl = document.getElementById("faSearchInput");

  const periodeBulan = periodeBulanEl ? periodeBulanEl.value : "JANUARI";
  const periodeTahun = periodeTahunEl ? periodeTahunEl.value : "2026";
  const query = faSearchInputEl ? faSearchInputEl.value.toLowerCase() : "";

  calculatedFixAssets = rawFixAssets.map(item => calculateDepreciation(item, periodeBulan, periodeTahun));

  try {
    localStorage.setItem("dpsa_cache_fa", JSON.stringify(calculatedFixAssets));
    localStorage.setItem("dpsa_cache_inv", JSON.stringify(inventoryItems));
  } catch (e) {}

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
  const invSearchInputEl = document.getElementById("invSearchInput");
  const query = invSearchInputEl ? invSearchInputEl.value.toLowerCase() : "";
  const filtered = inventoryItems.filter(i => 
    String(i.kodeBarang).toLowerCase().includes(query) ||
    String(i.namaBarang).toLowerCase().includes(query) ||
    String(i.keteranganLetak).toLowerCase().includes(query)
  );
  renderInventoryTable(filtered);
}

// ========================================================
// RENDERING OVERVIEW
// ========================================================
function renderOverview() {
  const totalItemFA = calculatedFixAssets.length;
  const totalNilaiFA = calculatedFixAssets.reduce((s, i) => s + (i.totalPerolehan || 0), 0);

  const ovFaTotalItem = document.getElementById("ovFaTotalItem");
  const ovFaTotalNilai = document.getElementById("ovFaTotalNilai");
  if (ovFaTotalItem) ovFaTotalItem.textContent = `${totalItemFA} Item`;
  if (ovFaTotalNilai) ovFaTotalNilai.textContent = formatRupiah(totalNilaiFA);

  const totalItemInv = inventoryItems.length;
  const totalNilaiDPSA = inventoryItems.reduce((s, i) => s + (i.totalDPSA || 0), 0);
  const totalNilaiDPM = inventoryItems.reduce((s, i) => s + (i.totalDPM || 0), 0);
  const totalNilaiBoyke = inventoryItems.reduce((s, i) => s + (i.totalBoyke || 0), 0);
  const totalNilaiInventorySemua = totalNilaiDPSA + totalNilaiDPM + totalNilaiBoyke;

  const ovInvTotalItem = document.getElementById("ovInvTotalItem");
  const ovInvTotalNilaiSemua = document.getElementById("ovInvTotalNilaiSemua");
  const ovInvNilaiDPSA = document.getElementById("ovInvNilaiDPSA");
  const ovInvNilaiDPM = document.getElementById("ovInvNilaiDPM");
  const ovInvNilaiBoyke = document.getElementById("ovInvNilaiBoyke");

  if (ovInvTotalItem) ovInvTotalItem.textContent = `${totalItemInv} Item`;
  if (ovInvTotalNilaiSemua) ovInvTotalNilaiSemua.textContent = formatRupiah(totalNilaiInventorySemua);
  if (ovInvNilaiDPSA) ovInvNilaiDPSA.textContent = formatRupiah(totalNilaiDPSA);
  if (ovInvNilaiDPM) ovInvNilaiDPM.textContent = formatRupiah(totalNilaiDPM);
  if (ovInvNilaiBoyke) ovInvNilaiBoyke.textContent = formatRupiah(totalNilaiBoyke);

  const badgeFA = document.getElementById("badgeCountFixAsset");
  const badgeInv = document.getElementById("badgeCountInventory");
  if (badgeFA) badgeFA.textContent = totalItemFA;
  if (badgeInv) badgeInv.textContent = totalItemInv;

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

// Render Tabel Fix Asset
function renderFixAssetTable(data) {
  const tbody = document.getElementById("faTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kodeAktiva);
    const imgUrl = (typeof CONFIG !== 'undefined') ? CONFIG.formatDriveImageUrl(item.linkGambar) : 'no image.png';

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

// Render Tabel Inventory Sesuai Format Kolom Screenshot Baru
function renderInventoryTable(filtered = null) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = filtered || inventoryItems;

  data.forEach((item, idx) => {
    const qrUrl = getQrCodeUrl(item.kodeBarang);
    const imgUrl = (typeof CONFIG !== 'undefined') ? CONFIG.formatDriveImageUrl(item.gambar) : 'no image.png';

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50/60 border-b border-slate-100 text-center";
    tr.innerHTML = `
      <td class="py-2.5 px-2 text-slate-500">${idx + 1}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap bg-yellow-50/30">${item.kodeBarang}</td>
      <td class="py-2.5 px-4 font-semibold text-slate-800 text-left bg-yellow-50/30">${formatMultilineText(item.namaBarang)}</td>
      <td class="py-2.5 px-4 text-slate-600 text-[11px] text-left leading-relaxed bg-yellow-50/30">${formatMultilineText(item.tipe)}</td>
      <td class="py-2.5 px-3 text-slate-600">${item.satuan}</td>
      <td class="py-2.5 px-2 font-bold text-slate-800">${item.jumlah}</td>
      <td class="py-2.5 px-2 text-slate-600 leading-relaxed">${formatMultilineText(item.tahun)}</td>
      <td class="py-2.5 px-2 text-slate-600 leading-relaxed">${formatMultilineText(item.kondisi)}</td>
      <td class="py-2.5 px-3 font-medium text-slate-700 text-right leading-relaxed bg-purple-50/30">${formatMultilineText(item.hargaSatuan)}</td>
      <td class="py-2.5 px-3 font-medium text-slate-900 text-right bg-[#e8f1fa]">
        ${formatNilaiInventory(item.totalDPSA)}
      </td>
      <td class="py-2.5 px-3 font-medium text-slate-900 text-right bg-[#f7edf2]">
        ${formatNilaiInventory(item.totalDPM)}
      </td>
      <td class="py-2.5 px-3 font-medium text-slate-900 text-right bg-[#fef6ee]">
        ${formatNilaiInventory(item.totalBoyke)}
      </td>
      <td class="py-2.5 px-2 bg-yellow-50/30">
        <img src="${imgUrl}" alt="${item.namaBarang}" class="w-8 h-8 object-cover rounded-lg border border-slate-200 mx-auto" onerror="this.onerror=null;this.src='no image.png';">
      </td>
      <td class="py-2.5 px-3 text-slate-500 text-[11px] text-left leading-relaxed bg-yellow-50/30">${formatMultilineText(item.keteranganLetak)}</td>
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

// ========================================================
// JSONP DATA PARSER SPREADSHEET
// ========================================================
function syncDataViaJSONP() {
  if (typeof CONFIG === 'undefined') return;

  // Handler Fix Aset
  window.handleFixAssetData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const parsed = [];
    json.table.rows.forEach(r => {
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

  // Handler Inventory Sesuai Kolom A:N
  window.handleInventoryData = function(json) {
    if (!json || !json.table || !json.table.rows) return;
    const parsed = [];
    json.table.rows.forEach(r => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      const nama = String(c[2]?.v || "").trim();
      if (!kode || kode.toUpperCase().includes("KODE") || !nama) return;

      const getText = (cell) => {
        if (!cell) return "-";
        return cell.f !== undefined && cell.f !== null ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : "-");
      };

      parsed.push({
        no: c[0]?.v || (parsed.length + 1),
        kodeBarang: kode,
        namaBarang: nama,
        tipe: getText(c[3]),
        satuan: String(c[4]?.v || "Unit"),
        jumlah: parseInt(c[5]?.v) || 1,
        tahun: getText(c[6]),
        kondisi: getText(c[7]),
        hargaSatuan: getText(c[8]),
        totalDPSA: parsePrice(c[9]?.v),
        totalDPM: parsePrice(c[10]?.v),
        totalBoyke: parsePrice(c[11]?.v),
        gambar: String(c[12]?.v || ""),
        keteranganLetak: getText(c[13])
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
  const topTitle = document.getElementById("topBarTitle");
  if (topTitle) topTitle.textContent = titles[tabId];
}

// Batch Print Barcode 5x5 cm
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
  list.forEach(item => {
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
