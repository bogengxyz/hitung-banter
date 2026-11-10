# ATURAN KEUANGAN DAN PRICING ENGINE — HITUNG BANTER

Dokumen ini adalah acuan resmi sistem akuntansi dan kalkulator bagi operasional BANTER.

---

## 1. FORMULA TARIF REGULER

### A. Pembulatan Jarak (Round Half Up)
Formula matematis:
$$\text{rounded\_distance} = \lfloor \text{distance\_km} + 0.5 \rfloor$$

Contoh:
- $2.49\text{ KM} \rightarrow 2\text{ KM}$
- $2.50\text{ KM} \rightarrow 3\text{ KM}$
- $3.50\text{ KM} \rightarrow 4\text{ KM}$

### B. Ongkir Customer
- 0–2 KM: Rp8.000
- Di atas 2 KM: tambahan Rp2.500 per KM
$$\text{ongkir} = 8000 + \max(\text{rounded\_distance} - 2, 0) \times 2500$$

### C. Pembagian Admin
Admin mendapatkan potongan Rp500 per KM di atas 2 KM, dengan batas maksimal Rp2.000:
$$\text{admin\_share} = \min(\max(\text{rounded\_distance} - 2, 0) \times 500, 2000)$$

### D. Pembagian BANTER
BANTER mendapatkan 10% dari ongkir setelah dikurangi bagian Admin:
$$\text{banter\_share} = \text{round}(0.10 \times (\text{ongkir} - \text{admin\_share}))$$

### E. Hak Bersih Ongkir Driver
$$\text{driver\_delivery\_share} = \text{ongkir} - \text{admin\_share} - \text{banter\_share}$$

---

## 2. TABEL HASIL PERHITUNGAN RESMI

| Jarak | Ongkir | Bagian Admin | Bagian BANTER | Hak Bersih Driver |
|---|---|---|---|---|
| **2 KM** | Rp8.000 | Rp0 | Rp800 | Rp7.200 |
| **3 KM** | Rp10.500 | Rp500 | Rp1.000 | Rp9.000 |
| **4 KM** | Rp13.000 | Rp1.000 | Rp1.200 | Rp10.800 |
| **5 KM** | Rp15.500 | Rp1.500 | Rp1.400 | Rp12.600 |
| **6 KM** | Rp18.000 | Rp2.000 (Maks) | Rp1.600 | Rp14.400 |
| **7 KM** | Rp20.500 | Rp2.000 (Maks) | Rp1.850 | Rp16.650 |

---

## 3. BIAYA TAMBAHAN (100% HAK DRIVER)
Biaya tambahan dibebankan kepada customer dan **tidak dikenai potongan Admin atau BANTER**:
- Biaya Hujan: **Rp5.000**
- Biaya Order Malam: **Rp5.000**
- Biaya Tambahan Titik / Tempat Pembelian: **Rp2.000** per titik tambahan

$$\text{driver\_total\_delivery\_entitlement} = \text{driver\_delivery\_share} + \text{extra\_fees}$$

---

## 4. PEMISAHAN MODAL BELANJA (PENTING)
1. **Modal Pribadi Driver**: Pengeluaran yang ditalangi uang pribadi driver. **Wajib diganti** dan masuk sebagai hak pembayaran driver.
2. **Modal Kas Admin**: Pengeluaran yang ditalangi saldo kas/transfer admin. **Bukan utang kepada driver**.

$$\text{driver\_total\_entitlement} = \text{driver\_shopping\_modal} + \text{driver\_total\_delivery\_entitlement}$$

---

## 5. REKONSILIASI PENERIMAAN UANG CUSTOMER
- **Uang Diterima Driver**: Dialokasikan untuk melunasi hak driver. Kelebihannya wajib disetor ke kas admin.
- **Uang Diterima Admin (QRIS / Transfer)**: Disimpan di kas admin, tidak otomatis dianggap sudah diterima driver. Admin wajib mencairkan pembayaran ke driver via transfer bank atau cash.

$$\text{driver\_balance\_remaining} = \text{driver\_total\_entitlement} - \text{driver\_total\_received}$$
- **= 0**: Lunas
- **> 0**: Belum lunas (utang ke driver)
- **< 0**: Kelebihan bayar (perlu rekonsiliasi)
