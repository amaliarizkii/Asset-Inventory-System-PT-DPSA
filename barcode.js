/**
 * barcode.js - Parser & Visualizer Detail Aset Dinamis PT DPSA
 */

// Data Bawaan Lengkap Cadangan (Fix Asset & Inventory)
const DEFAULT_FA_ITEMS = [
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

const DEFAULT_INV_ITEMS = [
  { no: 1, kode: "FA/PO3/12/VIII/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: HP CPU: Infinity (Intel Core I7)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 8681700, lokasi: "Studio & Marketing", keterangan: "Mas Maryanta", driveId: "1dcuhvUswFQLv85_VJ4OtyMyasa1Fluqm" },
  { no: 2, kode: "FA/PO3/12/IX/DPSA/2021/STU", nama: "Komputer", tipe: "Monitor: Dell CPU: CUBE (AMD A6)", satuan: "Set", jumlah: 1, tahun: "2021", kondisi: "Baik", kategori: "Aktiva Tetap", harga: 4000000, lokasi: "Studio & Marketing", keterangan: "Rendy", driveId: "1f1QrBof7aMw8yZu0mmngn5aMfNX1hZgE" },
  { no: 18, kode: "INV/DPSA/R.S&M.5/2020/1", nama: "TV", tipe: "Cocoa 42 inch", satuan: "Unit", jumlah: 1, tahun: "2019", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 2700000, lokasi: "Ruang R.S&M.5", keterangan: "-", driveId: "" },
  { no: 23, kode: "INV/DPSA/R.S&M.7/2020/1", nama: "Meteran", tipe: "Krisbow 10138998", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 600, lokasi: "Ruang R.S&M.7", keterangan: "-", driveId: "" },
  { no: 24, kode: "INV/DPSA/R.S&M.7/2020/2", nama: "Meteran", tipe: "Krisbow 10106768", satuan: "Unit", jumlah: 1, tahun: "-", kondisi: "Baik", kategori: "Bukan Aktiva Tetap", harga: 1800000, lokasi: "Ruang R.S&M.7", keterangan: "-", driveId: "" }
];

// Helper pembersih format kode barang
function normalizeCode(str) {
  if (!str) return "";
  try {
    str = decodeURIComponent(str);
  } catch (e) {}
  return str.trim().toUpperCase().replace(/\s+/g, '');
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawTarget = urlParams.get("code") || urlParams.get("kode") || urlParams.get("id");

  if (!rawTarget) {
    const loader = document.getElementById("barcodeLoader");
    if (loader) loader.textContent = "Kode barang tidak ditemukan pada URL!";
    return;
  }

  const cleanTarget = normalizeCode(rawTarget);
  let foundItem = null;

  // 1. Cek dari LocalStorage Cache
  try {
    const cachedFA = JSON.parse(localStorage.getItem("dpsa_cache_fa") || "[]");
    const cachedInv = JSON.parse(localStorage.getItem("dpsa_cache_inv") || "[]");
    foundItem = [...cachedFA, ...cachedInv].find(i => normalizeCode(i.kode) === cleanTarget);
  } catch (e) {}

  // 2. Cek dari Data Cadangan Internal (Jika cache kosong)
  if (!foundItem) {
    foundItem = [...DEFAULT_FA_ITEMS, ...DEFAULT_INV_ITEMS].find(i => normalizeCode(i.kode) === cleanTarget);
    if (foundItem && foundItem.driveId) {
      foundItem.gambar = `https://lh3.googleusercontent.com/d/${foundItem.driveId}`;
    }
  }

  // 3. Jika belum ditemukan, lakukan live search ke Google Sheets
  if (!foundItem && typeof CONFIG !== 'undefined') {
    try {
      const gvizFAUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.FIX_ASSET)}&headers=0`;
      const respFA = await fetch(gvizFAUrl);
      const textFA = await respFA.text();
      const rowsFA = parseGvizRows(textFA);
      foundItem = rowsFA.find(i => normalizeCode(i.kode) === cleanTarget);

      if (!foundItem) {
        const gvizInvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEETS.INVENTORY)}&headers=0`;
        const respInv = await fetch(gvizInvUrl);
        const textInv = await respInv.text();
        const rowsInv = parseGvizRows(textInv);
        foundItem = rowsInv.find(i => normalizeCode(i.kode) === cleanTarget);
      }
    } catch (err) {
      console.warn("Gagal fetch live sheets:", err);
    }
  }

  // Sembunyikan loader
  const loader = document.getElementById("barcodeLoader");
  if (loader) loader.style.display = "none";

  // Tampilkan data yang sesuai
  if (foundItem) {
    renderCardPassport(foundItem);
  } else {
    // Jika benar-benar tidak ada di database, tampilkan kartu dengan kode yang di-scan (bukan Set Komputer)
    renderCardPassport({
      nama: "BARANG TERDAFTAR",
      kode: decodeURIComponent(rawTarget),
      tipe: "-",
      tahun: "-",
      lokasi: "PT DPSA",
      keterangan: "-",
      kondisi: "BAIK",
      gambar: "no image.png"
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
      
      let imgUrl = "no image.png";
      if (typeof CONFIG !== 'undefined' && CONFIG.formatDriveImageUrl) {
        imgUrl = CONFIG.formatDriveImageUrl(rawImg);
      }

      return {
        kode: c[1] ? String(c[1].v || "").trim() : "",
        nama: c[2] ? String(c[2].v || "").trim() : "-",
        tipe: c[3] ? String(c[3].v || "").trim() : "-",
        tahun: c[6] ? String(c[6].v || "").trim() : "-",
        kondisi: c[7] ? String(c[7].v || "").trim() : "Baik",
        lokasi: c[9] ? String(c[9].v || "").trim() : (c[12] ? String(c[12].v || "") : "PT DPSA"),
        keterangan: c[10] ? String(c[10].v || "").trim() : (c[12] ? String(c[12].v || "") : "-"),
        gambar: imgUrl
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
    const finalImg = item.gambar || "no image.png";
    photoEl.src = finalImg;
    photoEl.onerror = () => {
      photoEl.src = "no image.png";
    };
  }
}
