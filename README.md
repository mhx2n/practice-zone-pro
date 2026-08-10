# 🎯 Target — Smart Bengali Exam Platform

A production-grade, fully customizable online MCQ exam platform built for Bengali-medium students. Designed for HSC, admission, and competitive prep with first-class **KaTeX math**, **mhchem chemistry**, **photocard branding**, **live exams**, **leaderboards**, and **vector PDF question paper exports**.

> 🇧🇩 **Bengali-first UI** • 🎨 **Theme + brand fully editable from the admin panel** • 📄 **Print-ready PDF papers** • ⚡ **Lovable Cloud backend** (auth, database, storage, edge functions)

---

## ✨ Key Features

### For Students
- 📚 **Exam attempts** with countdown, auto-submit, negative marking, mandatory subjects
- 📖 **Revision mode** — read questions + answers + explanations after one attempt
- 🏆 **Live exams** with real-time leaderboard and custom-styled PDF reports
- ❌ **Wrong-answers bank** — review every question you missed across all exams
- 🤖 **AI tutor** — per-question chat + general assistant (Lovable AI Gateway)
- 🎴 **Photocards** — admins build branded "Breaking News" style cards with pixel-perfect download
- 📱 PWA-friendly, mobile-first, dark / light themes

### For Admins
- 🧪 **Two question import flows**:
  - CSV bulk upload (legacy)
  - **Bulk Paste** — paste raw text in `1. … (a) … *(b) …` format, separator `n` between questions, auto-parses answers and explanations
- 🎨 **Live theme customizer** — preset palettes + per-color HSL editor, instant preview
- 📄 **PDF Exporter** — every visual default (font size, margins, colours, footer slots, logo, watermark) configurable per-export AND saved as **site-wide defaults** for all admins
- 📊 **Live exam dashboard** — start/stop, real-time submissions, podium colours, leaderboard PDF
- 🎴 **Photocard builder** — drag, layer, text, overlays, save reusable templates
- 🔔 **Notices / banners / reminders** — push messages to students with images and CTAs
- 💎 **Premium batches** — per-user access control with payment hooks
- 🪪 **User & role management** — server-side `has_role` security definer, never client-checked

---

## 🛠 Tech Stack

| Layer | Choice |
|------|--------|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui + semantic HSL design tokens |
| State / Data | TanStack Query + custom Supabase hooks |
| Backend | **Lovable Cloud** (managed Supabase — Postgres, Auth, Storage, Edge Functions) |
| Math | KaTeX + mhchem extension |
| PDF | Native browser print (vector, crystal-clear) with custom A4 paginator |
| Image export | `html-to-image` (3× super-sampling, true 1:1 layout) |
| Auth | Email/password + roles table with security-definer `has_role()` |
| AI | Lovable AI Gateway (no external keys) |

---

## 📂 Project Structure (top level)

```
src/
├── components/         Reusable UI (MathText, ExamCard, ExamPdfExporter, …)
├── pages/
│   ├── admin/          Admin portal (exams, questions, theme, bulk paste, photocard …)
│   └── student/        Student portal (exams, attempts, results, revision …)
├── hooks/              useAuth, useSupabaseData, usePremiumAccess
├── lib/                api, types, themePresets, answerUtils, …
├── contexts/           SiteSettingsContext
├── layouts/            PublicLayout, StudentLayout, AdminLayout
└── integrations/       supabase client, lovable bindings
supabase/
├── functions/          general-ai-assistant, question-helper
└── migrations/         Schema (questions, exams, users, roles, live exams, …)
```

---

## 🚀 Getting Started

```bash
bun install
bun run dev
```

Open <http://localhost:8080>. Lovable Cloud is auto-provisioned — no `.env` editing needed in the Lovable editor.

**First admin login**: create an account, then in the SQL editor:
```sql
insert into public.user_roles (user_id, role) values ('<your-uuid>', 'admin');
```

---

## 🎨 Customization Cheatsheet

| Want to change… | Where |
|---|---|
| Brand name / emoji / tagline | Admin → Theme Settings |
| App colour palette | Admin → Theme Settings → Preset or Custom HSL |
| Footer text + social links | Admin → Theme Settings → Report theme & footer |
| Leaderboard podium colours | Admin → Theme Settings → Leaderboard |
| Live exam card logo | Admin → Theme Settings → Live exam logo |
| **PDF defaults** (font, margin, colour, logo, footer) | Admin → any exam → PDF Export → **"🌐 সাইট ডিফল্ট হিসেবে সেভ করো"** |
| Photocard templates | Admin → Photocard Builder → Save template |
| Subjects / sections / categories | Admin → Subjects / Sections |

---

## 📄 PDF Export Engine

- **Vector output** via the browser's native print pipeline (`window.open` + `window.print`) — sharp at any zoom, tiny file size.
- **Smart A4 paginator** — questions never get clipped. When a question + explanation overflows a fresh column, the explanation auto-flows to the next column/page with a "ব্যাখ্যা (চলমান) — প্রশ্ন N" continuation header.
- **Two-column layout, footer with up to 3 hyperlinked slots, watermark, page numbers, debug overlay** all toggleable.
- **Saved presets**: localStorage (`লোকাল সেভ`) for this device, OR site-wide for every admin (`🌐 সাইট ডিফল্ট হিসেবে সেভ করো`).

---

## 🎴 Photocard Builder

- WYSIWYG canvas, drag/resize/rotate/lock layers
- Text + image + decorative overlays
- **Pixel-perfect 3× PNG download** powered by `html-to-image` (no more shifted text / boxes vs preview)
- Reusable templates stored locally per admin

---

## 🔐 Security Notes

- **No role data on `profiles`.** A dedicated `user_roles` table is checked through the `has_role()` security-definer function — prevents RLS recursion and privilege-escalation.
- **RLS on every public table.** `service_role` for server tasks, `authenticated` for app reads/writes scoped by `auth.uid()`.
- **No secrets in source.** Lovable AI Gateway + Cloud handle keys server-side.

---

## 🌍 Deployment

The app deploys as a static SPA. Cloudflare Pages, Vercel, Netlify all work. Lovable's own publish button is the fastest path. The `public/_redirects` and `vercel.json` files are pre-wired for SPA routing.

> Tip: the `.pages.dev` subdomain occasionally triggers Cloudflare's anti-phishing warning. Attach a custom domain (`.xyz` from any registrar, ~$1/yr) to remove it permanently.

---

## 🤝 Contributing

This project ships through the [Lovable](https://lovable.dev) editor. To work locally:

1. GitHub-connect via Lovable → push edits → auto-sync.
2. Or clone directly and use any IDE.

Built with ❤️ in Bangladesh.
