# DocPackr Minimal API (Optional)

Two endpoints for advanced PDF workflows:

- POST `/compress-pdf` — multipart/form-data (`file`): compresses with Ghostscript (`/ebook` profile)
- POST `/sign` — JSON `{ "manifest": string }`: returns `{ sha256, signatureBase64 }` using RSA-PSS (SHA-256)

## Quick Start

```bash
# Build & run locally
export CORS_ORIGIN="https://your-docpackr.vercel.app"
export RSA_PRIVATE_KEY_PATH="/absolute/path/to/private.pem"

dotnet run --project server/Server.csproj
# -> http://localhost:8080
```

## Docker

```bash
docker build -t docpackr-api ./server
docker run --rm -p 8080:8080 \
  -e CORS_ORIGIN="https://your-docpackr.vercel.app" \
  -e RSA_PRIVATE_KEY_PATH="/keys/private.pem" \
  -v $PWD/keys:/keys:ro \
  docpackr-api
```

Image base: `debian:bookworm-slim` with `ghostscript` and `mupdf-tools` installed.

## Endpoints

### POST /compress-pdf

- Request: `multipart/form-data` with field `file` (PDF)
- Response: `application/pdf` optimized file (typically 10–60% smaller on text-heavy PDFs)

Ghostscript flags: `-sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dCompatibilityLevel=1.4 -dNOPAUSE -dBATCH -dQUIET` with modest image downsampling.

### POST /sign

- Request JSON: `{ "manifest": "..." }`
- Response JSON: `{ "sha256": "hex", "signatureBase64": "..." }`
- Algorithm: RSA-PSS with SHA-256. Private key PEM path from environment `RSA_PRIVATE_KEY_PATH`.

Client-side verify (WebCrypto):

```ts
async function verify(manifest: string, sigB64: string, publicKeyPem: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    { name: 'RSA-PSS', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const ok = await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    key,
    Uint8Array.from(atob(sigB64), c => c.charCodeAt(0)),
    await crypto.subtle.digest('SHA-256', enc.encode(manifest))
  )
  return ok
}
function pemToArrayBuffer(pem: string) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}
```

Expose the RSA public key (PEM) via your frontend (e.g., place `public/rsa-public.pem` and fetch it for verification).

## Environment

- `CORS_ORIGIN` — your Vercel origin (e.g., `https://docpackr.vercel.app`)
- `RSA_PRIVATE_KEY_PATH` — absolute path to RSA private key (PEM, PKCS#8 or PKCS#1)

## Deploy

- Vercel: deploy the frontend; the API is separate.
- Fly.io (one‑liner): `fly launch --now` inside `server/` after setting envs and volume for keys.

