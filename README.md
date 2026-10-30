# Vision Blend admin

The content admin for the Vision Blend website, deployed on its own Vercel project. Editors change the hero (label, tagline, intro, with length limits), Work projects (add, edit, reorder, feature, cover image), series episodes and studio details (team size, email, CC, phone). Long-form copy stays in the site's `src/content/en.ts`.

## How it talks to the site

- **Storage:** the same Railway Postgres as the site (`DATABASE_URL`, Railway's `DATABASE_PUBLIC_URL`). The admin writes the `content` table and owns `admin_users`; the site only reads `content`.
- **Defaults:** where nothing is saved yet, forms start from the site's code, fetched from `GET {SITE_URL}/api/cms`.
- **Refresh:** after every save the admin calls `POST {SITE_URL}/api/cms`, which revalidates the site's `cms` cache tag, so no redeploy is needed.
- Both calls send `Authorization: Bearer {CMS_SECRET}`; the site must have the same `CMS_SECRET`.
- **Covers:** uploaded to Vercel Blob (`BLOB_READ_WRITE_TOKEN`), so the site can load them from `*.public.blob.vercel-storage.com`.

`src/lib/cms/schema.ts` and `team.ts` are copies of the site's files of the same name. Change both together: a document the site's schema rejects falls back to its default there.

## Environment

See `.env.example`: `SITE_URL`, `CMS_SECRET`, `DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`.

## Setup

1. Create a Vercel project from this folder; set `DATABASE_URL` to the site's Railway Postgres, connect a Blob store; set the variables above.
2. Create the first owner: `npm run cms-setup -- --email you@onshorelabs.co.in --name "Your Name"` (password from `CMS_PASSWORD` or a prompt).
3. Sign in; owners add the client's editors under **Editors & account**.

## Local development

Run the site on port 3000 (`SITE_URL=http://localhost:3000`) and the admin with `npm run dev` (port 3001). Without `DATABASE_URL` both use `../website/.cms-dev.json`.
