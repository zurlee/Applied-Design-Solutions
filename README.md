# Grōth site template

Starting point for every new client site hosted on the Grōth stack (Coolify on
Hetzner, managed from portal.groth.io).

It's a single Grōth-branded "under construction" page with the client's name on it and
an animated three.js sprout (`sprout.js`; the SVG inside it is the no-WebGL fallback),
so a new client's preview (and their domain, if it goes live early) shows something
professional from day one. It's kept out of search results (`noindex`, `robots.txt`).
Replace it with the real site when it's built.

## New client site

1. On GitHub: this repo → **Use this template → Create a new repository**.
   Owner **Groth-Clients**, name it after the client (e.g. `Acme-Plumbing`), Private.
2. Clone it (GitHub Desktop: **Code → Open with GitHub Desktop**).
3. In the repo folder, run once:
   ```
   node setup.mjs
   ```
   It asks for the business name and portal slug, puts the name on the page, writes the
   client's README (with a pre-launch checklist), and deletes itself.
4. Commit and push to `main`.
5. portal.groth.io → Admin → **New client**: same slug, and this repo's name in
   **GitHub repo**. The page is live at `https://<slug>.groth.io` in 1–2 minutes.
6. Build the real site in the same repo. Every push to `main` redeploys the preview.

Full onboarding (invite, payment, DNS, go-live): `docs/new-client.md` in the Hosting repo.

Keep the site's `index.html` at the repo root; Coolify serves the root folder.
