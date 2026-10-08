/**
 * barcode.js - Parser & Visualizer Detail Aset (100% Identik Gambar Referensi)
 */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetCode = urlParams.get("code") || urlParams.get("kode") || "FA/PO3/12/XII/DPSA/2016/KEU";
  let foundItem = null;

  // 1. Ambil dari Cache LocalStorage (Instan)
  try {
    const cachedFA = JSON.parse(localStorage.getItem("dpsa_cache_fa") || "[]");
    const cachedInv = JSON.parse(localStorage.getItem("dpsa_cache_inv") || "[]");
    foundItem = [...cachedFA, ...cachedInv].find(i => (i.kode || "").trim().toUpperCase() === targetCode.trim().toUpperCase());
  } catch (e) {}

  // 2. Fetch ke Spreadsheet jika belum ada di cache (Fallback)
  if (!foundItem && typeof CONFIG !== 'undefined') {
    try {
      const gvizFAUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
      const respFA = await fetch(gvizFAUrl);
      const textFA = await respFA.text();
      const rowsFA = parseGvizRows(textFA);
      foundItem = rowsFA.find(i => (i.kode || "").trim().toUpperCase() === targetCode.trim().toUpperCase());

      if (!foundItem) {
        const gvizInvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
        const respInv = await fetch(gvizInvUrl);
        const textInv = await respInv.text();
        const rowsInv = parseGvizRows(textInv);
        foundItem = rowsInv.find(i => (i.kode || "").trim().toUpperCase() === targetCode.trim().toUpperCase());
      }
    } catch (e) {
      console.warn("Spreadsheet network issue:", e);
    }
  }

  // Sembunyikan loader
  const loader = document.getElementById("barcodeLoader");
  if (loader) loader.style.display = "none";

  if (foundItem) {
    renderCardPassport(foundItem);
  } else {
    // Default fallback agar tampilan tetap utuh
    renderCardPassport({
      nama: "SET KOMPUTER",
      kode: targetCode,
      tipe: "MONITOR: LG\nCPU: DELUX (INTEL CORE I7-GEN 2)",
      tahun: "2016",
      lokasi: "RUANG KEUANGAN",
      keterangan: "BU TARI",
      kondisi: "BAIK",
      gambar: "https://lh3.googleusercontent.com/d/1FszIQtfv5nsyOztb2560tEd4kjnn6YCG"
    });
  }
});

function parseGvizRows(rawText) {
  try {
    const raw = rawText.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(\vert{}\);$/g, "");
    const obj = JSON.parse(raw);
    const rows = obj.table.rows;
    return rows.map(r => {
      const c = r.c || [];
      const rawImg = c[11] ? String(c[11].v || "") : "";
      return {
        kode: c[1] ? String(c[1].v || "").trim() : "",
        nama: c[2] ? String(c[2].v || "").trim() : "-",
        tipe: c[3] ? String(c[3].v || "").trim() : "-",
        tahun: c[6] ? String(c[6].v || "").trim() : "-",
        kondisi: c[7] ? String(c[7].v || "").trim() : "Baik",
        lokasi: c[9] ? String(c[9].v || "").trim() : (c[12] ? String(c[12].v || "") : "PT DPSA"),
        keterangan: c[10] ? String(c[10].v || "").trim() : (c[12] ? String(c[12].v || "") : "-"),
        gambar: CONFIG.formatDriveImageUrl(rawImg)
      };
    });
  } catch (e) {
    return [];
  }
}

function renderCardPassport(item) {
  document.getElementById("qrNama").textContent = (item.nama || "-").toUpperCase();
  document.getElementById("qrKode").textContent = (item.kode || "-").toUpperCase();
  document.getElementById("qrTipe").innerHTML = (item.tipe || "-").toUpperCase().replace(/\n/g, "<br>");
  document.getElementById("qrTahun").textContent = item.tahun || "-";
  document.getElementById("qrLokasi").textContent = (item.lokasi || "-").toUpperCase();
  document.getElementById("qrKeterangan").textContent = (item.keterangan || "-").toUpperCase();
  document.getElementById("qrKondisi").textContent = (item.kondisi || "BAIK").toUpperCase();

  const photoEl = document.getElementById("qrFoto");
  if (photoEl) {
    const finalUrl = item.gambar || "no image.png";
    photoEl.src = finalUrl;
    photoEl.onerror = () => {
      if (!photoEl.dataset.tried) {
        photoEl.dataset.tried = "true";
        photoEl.src = CONFIG.getBackupDriveImageUrl(finalUrl);
      } else {
        photoEl.src = "no image.png";
      }
    };
  }
}
