/**
 * barcode.js - Tampilan Hasil Scan QR Mandiri (Sesuai Referensi Foto)
 */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code") || urlParams.get("id");

  if (!code) {
    document.getElementById("statusLoading").textContent = "Kode barang tidak ditemukan di URL.";
    return;
  }

  await loadAndDisplayAsset(code.trim());
});

async function loadAndDisplayAsset(targetCode) {
  try {
    // 1. Cari di sheet Fix Aset
    let url = CONFIG.getGvizUrl(CONFIG.SHEETS.FIX_ASSET);
    let resp = await fetch(url);
    let text = await resp.text();
    let jsonStr = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
    let data = JSON.parse(jsonStr);
    let rows = data.table ? data.table.rows : [];

    let found = null;

    rows.forEach(r => {
      const c = r.c || [];
      const kode = String(c[1]?.v || "").trim();
      if (kode.toLowerCase() === targetCode.toLowerCase()) {
        found = {
          nama: String(c[2]?.v || "-"),
          kode: kode,
          tipe: String(c[3]?.v || "-"),
          satuan: String(c[4]?.v || "Unit"),
          jumlah: c[5]?.v || 1,
          tahun: String(c[6]?.v || "-"),
          kondisi: String(c[7]?.v || "Baik"),
          lokasi: String(c[9]?.v || "Area PT DPSA"),
          keterangan: String(c[10]?.v || "-"),
          gambar: CONFIG.formatDriveImageUrl(String(c[11]?.v || ""))
        };
      }
    });

    // 2. Jika tidak ditemukan, cari di sheet Inventory
    if (!found) {
      url = CONFIG.getGvizUrl(CONFIG.SHEETS.INVENTORY);
      resp = await fetch(url);
      text = await resp.text();
      jsonStr = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"));
      data = JSON.parse(jsonStr);
      rows = data.table ? data.table.rows : [];

      rows.forEach(r => {
        const c = r.c || [];
        const kode = String(c[1]?.v || "").trim();
        if (kode.toLowerCase() === targetCode.toLowerCase()) {
          found = {
            nama: String(c[2]?.v || "-"),
            kode: kode,
            tipe: String(c[3]?.v || "-"),
            satuan: String(c[4]?.v || "Unit"),
            jumlah: c[5]?.v || 1,
            tahun: String(c[6]?.v || "-"),
            kondisi: String(c[7]?.v || "Baik"),
            lokasi: "Gudang & Operasional",
            keterangan: String(c[12]?.v || "-"),
            gambar: CONFIG.formatDriveImageUrl(String(c[11]?.v || ""))
          };
        }
      });
    }

    if (found) {
      displayAssetData(found);
    } else {
      document.getElementById("statusLoading").innerHTML = `<span class="text-red-400">Data dengan kode <b>${targetCode}</b> tidak ditemukan di spreadsheet.</span>`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById("statusLoading").textContent = "Gagal memuat data dari Spreadsheet.";
  }
}

function displayAssetData(item) {
  document.getElementById("statusLoading").style.display = "none";
  document.getElementById("assetCardWrapper").classList.remove("hidden");

  // Isi data ke elemen sesuai layout referensi
  document.getElementById("fieldNama").textContent = item.nama.toUpperCase();
  document.getElementById("fieldKode").textContent = item.kode;
  document.getElementById("fieldTipe").textContent = item.tipe.toUpperCase();
  document.getElementById("fieldTahun").textContent = item.tahun;
  document.getElementById("fieldLokasi").textContent = item.lokasi.toUpperCase();
  document.getElementById("fieldKeterangan").textContent = item.keterangan.toUpperCase();
  document.getElementById("fieldKondisi").textContent = item.kondisi.toUpperCase();

  // Pasang Gambar Aset
  const imgEl = document.getElementById("fieldGambar");
  if (imgEl) {
    imgEl.src = item.gambar;
    imgEl.onerror = () => { imgEl.src = 'no image.png'; };
  }
}
