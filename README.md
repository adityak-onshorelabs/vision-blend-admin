# Vision Blend admin

The content admin for the Vision Blend website, deployed on its own Vercel project. Editors change the hero (label, tagline, intro, with length limits), each **industry page** (hero photo and words, showcase films and posters, Drive folders, value, process, FAQs, closing, search listing, and the Drive portfolio), the copy on every **page** (home sections, showreel, beliefs, process steps, About, Work, Industries, Contact), Work projects (add, edit, reorder, feature, cover image), series episodes, the team and studio details. Only the contact form's microcopy, navigation and legal details stay in the site's `src/content/en.ts`.

Industry pages and page copy use one editor (`src/app/_components/doc-editor.tsx`) driven by a field spec per screen. It holds the whole record and saves it as JSON; images and films upload to Blob the moment they are picked (4.4 MB cap per file, so larger films go to ImageKit and are pasted as a link). Drive fields accept a full share link and keep only the file id.

## How it talks to the site

- **Storage:** the same Railway Postgres as the site (`DATABASE_URL`, Railway's `DATABASE_PUBLIC_URL`). The admin writes the `content` table and owns `admin_users`; the site only reads `content`.
- **Defaults:** where nothing is saved yet, forms start from the site's code, fetched from `GET {SITE_URL}/api/cms`.
- **Refresh:** after every save the admin calls `POST {SITE_URL}/api/cms`, which revalidates the site's `cms` cache tag, so no redeploy is needed.
- Both calls send `Authorization: Bearer {CMS_SECRET}`; the site must have the same `CMS_SECRET`.
- **Covers:** uploaded to a **public** Vercel Blob store (`BLOB_STORE_ID`, or `BLOB_READ_WRITE_TOKEN` on older stores), so the site can load them from `*.public.blob.vercel-storage.com`.

`src/lib/cms/schema.ts` and `team.ts` are copies of the site's files of the same name. Change both together: a document the site's schema rejects falls back to its default there.

## History and restore

Every save is kept in `content_revisions` (who, when, the saved value). Industry pages and each page's copy have their own **History and restore** screen (`/industries/<slug>/history`, `/pages/<page>/history`); everything else is under **History** (`/activity`). Each version shows the fields it changed from the one before, and **Restore this version** puts it live as a new save, so a restore can be undone the same way. The first save of a part also records what it replaced ("Before history began"). The last 300 versions per part are kept.

Changes made in the site's code show there too: whenever the admin fetches the site's defaults (at most every 5 minutes per server instance), it fingerprints each industry, page and document and records the ones that changed as "Changed in the site's code", with the deploy's commit message and author (from Vercel's git variables, sent by the site's `/api/cms`). Code changes are compared with the previous code version, admin saves with the previous save. A part already saved in the admin keeps showing the admin's version on the site; restoring a code version puts it live.

Saves run in a transaction with the document locked, so editors saving different industries at once never overwrite each other. The industry and page editors also send the version they opened: if someone else saved in between, the save is refused with a message instead of silently replacing their work.

## Security

- Sessions are checked against the account on every page and action: removing an editor, or changing a password, ends their other sessions at once. **Sign out everywhere** is on the Account screen. Sessions last 7 days.
- Sign-in allows 5 failed tries per email (30 per IP) in 15 minutes, and takes as long for an unknown email as for a wrong password.
- Uploads are checked by their bytes (JPG, PNG, WebP, AVIF; MP4, WebM), not by name.
- Links must be http(s); media paths can't be protocol-relative.
- Headers: no framing, no indexing, `nosniff`, HSTS. The proxy sends anyone without a session to the sign-in before any page renders.

Tables (`content_revisions`, `login_attempts`, `admin_users.session_version`) are created on first use; deploying this logs every editor out once.

## Environment

See `.env.example`: `SITE_URL`, `CMS_SECRET`, `DATABASE_URL`, `SESSION_SECRET`, and `BLOB_STORE_ID` (set by connecting a public Blob store).

## Setup

1. Create a Vercel project from this folder; set `DATABASE_URL` to the site's Railway Postgres, connect a Blob store; set the variables above.
2. Create the first owner: `npm run cms-setup -- --email you@onshorelabs.co.in --name "Your Name"` (password from `CMS_PASSWORD` or a prompt).
3. Sign in; owners add the client's editors under **Editors & account**.

## Local development

Run the site on port 3000 (`SITE_URL=http://localhost:3000`) and the admin with `npm run dev` (port 3001). Without `DATABASE_URL` both use `../website/.cms-dev.json`.
