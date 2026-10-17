/**
 * barcode.js - Parser Data QR Mandiri PT DPSA (Format Baru)
 */
function normalizeCode(str) {
  if (!str) return "";
  try { str = decodeURIComponent(str); } catch (e) {}
  return str.trim().toUpperCase().replace(/\s+/g, '');
}

function formatMultiline(str) {
  if (!str) return "-";
  return String(str).replace(/\n/g, "<br>");
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawTarget = urlParams.get("code") || urlParams.get("kode");

  if (!rawTarget) {
    const loader = document.getElementById("barcodeLoader");
    if (loader) loader.textContent = "Kode barang tidak ditemukan!";
    return;
  }

  const cleanTarget = normalizeCode(rawTarget);
  let foundItem = null;
  let isInventory = false;

  // 1. Ambil dari LocalStorage Cache
  try {
    const cachedFA = JSON.parse(localStorage.getItem("dpsa_cache_fa") || "[]");
    const cachedInv = JSON.parse(localStorage.getItem("dpsa_cache_inv") || "[]");
    
    foundItem = cachedFA.find(i => normalizeCode(i.kodeAktiva) === cleanTarget);
    if (!foundItem) {
      foundItem = cachedInv.find(i => normalizeCode(i.kodeBarang) === cleanTarget);
      if (foundItem) isInventory = true;
    }
  } catch (e) {}

  // Sembunyikan loader
  const loader = document.getElementById("barcodeLoader");
  if (loader) loader.style.display = "none";

  if (foundItem) {
    renderCard(foundItem, isInventory);
  } else {
    // Fallback tampilan aman
    renderCard({
      kodeAktiva: decodeURIComponent(rawTarget),
      namaAktiva: "BARANG TERDAFTAR",
      merk: "-",
      spesifikasi: "-",
      tglPerolehan: "-",
      hargaPerolehan: 0,
      lokasi: "PT DPSA",
      keterangan: "-",
      linkGambar: "no image.png"
    }, false);
  }
});

function renderCard(item, isInv) {
  if (isInv) {
    // 5 Atribut Paspor Inventory:
    // 1. Kode Barang
    document.getElementById("lblKode").textContent = "Kode Barang";
    document.getElementById("qrKode").textContent = item.kodeBarang || "-";

    // 2. Nama Barang
    document.getElementById("lblNama").textContent = "Nama Barang";
    document.getElementById("qrNama").innerHTML = formatMultiline(item.namaBarang);

    // 3. Tipe/Ukuran
    document.getElementById("rowTipe").style.display = "flex";
    document.getElementById("lblTipe").textContent = "Tipe / Ukuran";
    document.getElementById("qrTipe").innerHTML = formatMultiline(item.tipe);

    // Sembunyikan field yang khusus Fix Asset
    document.getElementById("rowMerk").style.display = "none";
    document.getElementById("rowTgl").style.display = "none";
    document.getElementById("rowHarga").style.display = "none";
    document.getElementById("rowLokasi").style.display = "none";

    // 4. Keterangan (Letak)
    document.getElementById("lblKeterangan").textContent = "Keterangan (Letak)";
    document.getElementById("qrKeterangan").innerHTML = formatMultiline(item.keteranganLetak);

    // 5. Dokumen Gambar
    document.getElementById("lblDokumenGambar").textContent = "Dokumen Gambar";
    const photoEl = document.getElementById("qrFoto");
    if (photoEl) {
      photoEl.src = CONFIG.formatDriveImageUrl(item.gambar);
    }
  } else {
    // 9 Atribut Paspor Fix Asset
    document.getElementById("lblKode").textContent = "Kode Aktiva";
    document.getElementById("qrKode").textContent = item.kodeAktiva || "-";

    document.getElementById("lblNama").textContent = "Nama Aktiva Tetap";
    document.getElementById("qrNama").innerHTML = formatMultiline(item.namaAktiva);

    document.getElementById("rowMerk").style.display = "flex";
    document.getElementById("qrMerk").innerHTML = formatMultiline(item.merk);

    document.getElementById("rowTipe").style.display = "flex";
    document.getElementById("lblTipe").textContent = "Spesifikasi";
    document.getElementById("qrTipe").innerHTML = formatMultiline(item.spesifikasi);

    document.getElementById("rowTgl").style.display = "flex";
    document.getElementById("qrTgl").textContent = item.tglPerolehan || "-";

    document.getElementById("rowHarga").style.display = "flex";
    document.getElementById("qrHarga").textContent = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.hargaPerolehan || 0);

    document.getElementById("rowLokasi").style.display = "flex";
    document.getElementById("qrLokasi").textContent = (item.lokasi || "-").toUpperCase();

    document.getElementById("lblKeterangan").textContent = "Keterangan";
    document.getElementById("qrKeterangan").innerHTML = formatMultiline(item.keterangan);

    document.getElementById("lblDokumenGambar").textContent = "Asset Foto";
    const photoEl = document.getElementById("qrFoto");
    if (photoEl) {
      photoEl.src = CONFIG.formatDriveImageUrl(item.linkGambar);
    }
  }
}
