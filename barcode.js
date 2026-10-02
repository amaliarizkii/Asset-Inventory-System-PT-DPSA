/**
 * PT DPSA Asset & Inventory System - Barcode Scan Page Engine
 * Mengambil parameter ?code=... dari URL QR dan menampilkan kartu identitas presisi 100%
 */

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetCode = urlParams.get("code") || urlParams.get("kode") || "FA/PO3/12/XII/DPSA/2016/KEU";

  document.getElementById("statusLoading").classList.remove("hidden");

  let foundItem = null;

  // 1. Coba ambil dari Cache LocalStorage
  const cachedFA = JSON.parse(localStorage.getItem("dpsa_fixasset_data") || "[]");
  const cachedInv = JSON.parse(localStorage.getItem("dpsa_inventory_data") || "[]");
  const combined = [...cachedFA, ...cachedInv];

  foundItem = combined.find(i => (i.kode || "").toUpperCase() === targetCode.toUpperCase());

  // 2. Jika tidak ada di cache, coba fetch dari Google Spreadsheet
  if (!foundItem) {
    try {
      const gvizFAUrl = APP_CONFIG.getGvizUrl(APP_CONFIG.SHEETS.FIX_ASSET);
      const res = await fetch(gvizFAUrl);
      const text = await res.text();
      const json = parseGvizJson(text);
      foundItem = json.find(i => (i.kode || "").toUpperCase() === targetCode.toUpperCase());

      if (!foundItem) {
        const gvizInvUrl = APP_CONFIG.getGvizUrl(APP_CONFIG.SHEETS.INVENTORY);
        const resInv = await fetch(gvizInvUrl);
        const textInv = await resInv.text();
        const jsonInv = parseGvizJson(textInv);
        foundItem = jsonInv.find(i => (i.kode || "").toUpperCase() === targetCode.toUpperCase());
      }
    } catch (e) {
      console.warn("Gagal fetching langsung ke Google Sheets. Menggunakan fallback data...", e);
    }
  }

  // 3. Fallback jika masih belum ditemukan
  if (!foundItem) {
    const fallbacks = [...APP_CONFIG.DEFAULT_FIX_ASSET, ...APP_CONFIG.DEFAULT_INVENTORY];
    foundItem = fallbacks.find(i => (i.kode || "").toUpperCase() === targetCode.toUpperCase()) || APP_CONFIG.DEFAULT_FIX_ASSET[0];
  }

  document.getElementById("statusLoading").classList.add("hidden");
  renderScanCard(foundItem);
});

function parseGvizJson(gvizResponseText) {
  try {
    const raw = gvizResponseText.replace(/^\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(|\);$/g, "");
    const obj = JSON.parse(raw);
    const rows = obj.table.rows;
    return rows.map(r => {
      const c = r.c;
      return {
        kode: c[1] ? c[1].v : "",
        nama: c[2] ? c[2].v : "",
        spek: c[3] ? c[3].v : "",
        satuan: c[4] ? c[4].v : "Unit",
        jumlah: c[5] ? c[5].v : 1,
        tahun: c[6] ? c[6].v : "",
        kondisi: c[7] ? c[7].v : "Baik",
        harga: c[8] ? c[8].v : 0,
        lokasi: c[9] ? c[9].v : "",
        keterangan: c[10] ? c[10].v : "",
        gambar: c[11] ? c[11].v : "no image.png"
      };
    });
  } catch (err) {
    return [];
  }
}

function renderScanCard(item) {
  document.getElementById("qrCardNama").textContent = (item.nama || "-").toUpperCase();
  document.getElementById("qrCardKode").textContent = (item.kode || "-").toUpperCase();
  
  const spekEl = document.getElementById("qrCardSpek");
  spekEl.innerHTML = (item.spek || "-").toUpperCase().replace(/\n/g, "<br>");

  document.getElementById("qrCardTahun").textContent = item.tahun || "-";
  document.getElementById("qrCardLokasi").textContent = (item.lokasi || "-").toUpperCase();
  document.getElementById("qrCardPic").textContent = (item.keterangan || "-").toUpperCase();
  document.getElementById("qrCardKondisi").textContent = (item.kondisi || "BAIK").toUpperCase();

  const photoEl = document.getElementById("qrCardPhoto");
  photoEl.src = item.gambar && item.gambar.trim() !== "" ? item.gambar : "no image.png";
  photoEl.onerror = () => { photoEl.src = "no image.png"; };
}
