# diploma.ba API: automatsko izdavanje certifikata

Ključ se pravi na stranici **Profil → API pristup** (samo za odobrene ustanove). Ključ se prikaže jednom i u bazi se čuva samo njegov hash.

## POST /api/v1/certificates

Zaglavlja:
```
Authorization: Bearer dpl_...
Content-Type: application/json
```

Tijelo:

| Polje | Obavezno | Opis |
|---|---|---|
| `studentName` | da | Ime i prezime (najviše 200 znakova) |
| `studentEmail` | da | Email primaoca; na njega stiže certifikat |
| `certificateType` | ne | Naziv certifikata/kursa (zadano: „Diploma o završenom studiju“) |
| `identifier` | ne | Vaš interni ID (najviše 100 znakova) |
| `metadata` | ne | JSON objekat s dodatnim podacima (najviše 4000 znakova) |
| `expiresAt` | ne | Datum isteka, npr. `2030-12-31` |
| `sendEmail` | ne | `false` ako ne želite da šaljemo mail primaocu (zadano `true`) |

Odgovor `201` (novi certifikat) ili `200` (već postoji, `alreadyIssued: true`):
```json
{
  "success": true,
  "alreadyIssued": false,
  "certificateId": 123,
  "certificateHash": "…",
  "txHash": "0x…",
  "status": "active",
  "verifyUrl": "https://diploma.ba/verifikuj?hash=…"
}
```

Isti podaci (ustanova, ime, email, tip, identifikator, metadata) uvijek daju isti hash, pa je poziv **idempotentan**: ponovljen zahtjev ne pravi duplikat ni novi upis na blockchain.

Greške: `400` neispravni podaci, `401` nevažeći ključ, `403` nalog nije odobren, `429` previše zahtjeva (60/min), `502` greška blockchain upisa, `500` greška servera.

## Primjer (Node.js)
```js
const res = await fetch('https://diploma.ba/api/v1/certificates', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.DIPLOMA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    studentName: user.fullName,
    studentEmail: user.email,
    certificateType: course.title,
    identifier: `course-${course.id}-user-${user.id}`,
  }),
});
const data = await res.json();
// sačuvajte data.verifyUrl uz zapis "položio kurs" u svojoj bazi
```
