/**
 * barcode.js - Parser Data QR Mandiri PT DPSA (Sinkronisasi Penuh)
 */

function normalizeCode(str) {
  if (!str) return "";
  try { str = decodeURIComponent(str); } catch (e) {}
  return str.trim().toUpperCase().replace(/\s+/g, '');
}

function formatMultiline(str) {
  if (!str || str === "-") return "-";
  return String(str).replace(/\n/g, "<br>");
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawTarget = urlParams.get("code") || urlParams.get("kode");

  if (!rawTarget) {
    const loader = document.getElementById("barcodeLoader");
    if (loader) loader.textContent = "Kode barang tidak ditemukan pada URL!";
    return;
  }

  const cleanTarget = normalizeCode(rawTarget);
  let foundItem = null;
  let isInventory = false;

  // 1. Cek dari LocalStorage Cache
  try {
    const cachedFA = JSON.parse(localStorage.getItem("dpsa_cache_fa") || "[]");
    const cachedInv = JSON.parse(localStorage.getItem("dpsa_cache_inv") || "[]");
    
    foundItem = cachedFA.find(i => normalizeCode(i.kodeAktiva) === cleanTarget);
    if (!foundItem) {
      foundItem = cachedInv.find(i => normalizeCode(i.kodeBarang) === cleanTarget);
      if (foundItem) isInventory = true;
    }
  } catch (e) {}

  // 2. Jika tidak ada di cache lokal, ambil langsung dari Spreadsheet secara online
  if (!foundItem && typeof CONFIG !== 'undefined') {
    try {
      // Cek sheet Inventory terlebih dahulu jika kode memiliki awalan INV
      if (cleanTarget.includes("INV")) {
        const invUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
        const respInv = await fetch(invUrl);
        const textInv = await respInv.text();
        const jsonStrInv = textInv.substring(textInv.indexOf("(") + 1, textInv.lastIndexOf(")"));
        const dataInv = JSON.parse(jsonStrInv);

        if (dataInv && dataInv.table && dataInv.table.rows) {
          dataInv.table.rows.forEach(r => {
            const c = r.c || [];
            const kode = String(c[1]?.v || "").trim();
            if (normalizeCode(kode) === cleanTarget) {
              foundItem = {
                kodeBarang: kode,
                namaBarang: c[2]?.v || "-",
                tipe: c[3]?.v || "-",
                gambar: c[12]?.v || "", // Kolom M (Dokumen Gambar)
                keteranganLetak: c[13]?.v || "-" // Kolom N (Keterangan Letak)
              };
              isInventory = true;
            }
          });
        }
      }

      // Cek sheet Fix Asset jika belum ditemukan
      if (!foundItem) {
        const faUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
        const respFA = await fetch(faUrl);
        const textFA = await respFA.text();
        const jsonStrFA = textFA.substring(textFA.indexOf("(") + 1, textFA.lastIndexOf(")"));
        const dataFA = JSON.parse(jsonStrFA);

        if (dataFA && dataFA.table && dataFA.table.rows) {
          dataFA.table.rows.forEach(r => {
            const c = r.c || [];
            const kode = String(c[1]?.v || "").trim();
            if (normalizeCode(kode) === cleanTarget) {
              foundItem = {
                kodeAktiva: kode,
                namaAktiva: c[3]?.v || "-",
                merk: c[4]?.v || "-",
                spesifikasi: c[5]?.v || "-",
                tglPerolehan: c[7]?.f || c[7]?.v || "-",
                hargaPerolehan: c[11]?.v || 0,
                lokasi: c[25]?.v || "PT DPSA",
                keterangan: c[26]?.v || "-",
                linkGambar: c[27]?.v || ""
              };
              isInventory = false;
            }
          });
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil data live spreadsheet:", err);
    }
  }

  // Sembunyikan loader
  const loader = document.getElementById("barcodeLoader");
  if (loader) loader.style.display = "none";

  if (foundItem) {
    renderCard(foundItem, isInventory);
  } else {
    renderCard({
      kodeBarang: decodeURIComponent(rawTarget),
      namaBarang: "BARANG TIDAK DITEMUKAN",
      tipe: "-",
      keteranganLetak: "-",
      gambar: "no image.png"
    }, true);
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

    // Sembunyikan atribut khusus Fix Asset
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
