# Studio 56 — Gandía

Website for Studio 56, an aesthetics studio in Gandía (Valencia):
Endospheres, depilación láser, electrodepilación, cera y sugaring.

Static site — plain HTML, one stylesheet, one script. No build step.

## Pages

| File | |
|---|---|
| `index.html` | Home |
| `endospheres.html` · `depilacion-laser.html` · `electrodepilacion.html` · `cera-y-sugaring.html` | Treatments |
| `precios.html` | Full price list (+ `studio56-precios.pdf` download) |
| `bono-regalo.html` | Gift voucher — buyer builds and orders |
| `bono.html` | Gift voucher — what the recipient opens. All data comes from the URL |
| `sobre-nosotras.html` · `contacto.html` | About, contact |

## Local preview

```bash
python3 devserver.py 4056
```

Serves on port 4056 with no-cache headers. `/fresh` redirects to a one-off URL,
which is the reliable way past iOS Safari holding an old copy.

## Notes

- Prices come from `studio56-precios.pdf`, which is the single source of truth.
- Mobile first — most visitors arrive on a phone.
- Booking currently goes to WhatsApp; the Altegio embed replaces the
  placeholder forms (marked `TODO` in the markup).
