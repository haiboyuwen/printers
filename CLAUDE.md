# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Build to dist/ (single HTML file via vite-plugin-singlefile)
npm run preview    # Preview the production build
```

- **No test runner** is configured (no test dependencies).
- All builds produce a single self-contained `index.html` via `vite-plugin-singlefile` — suitable for opening directly in a browser or Electron.
- Project scaffold initially from a React+Vite+Tailwind template; no build-time code generation.

## Architecture Overview

**Purpose**: A browser-based batch PDF invoice printing tool (UI in simplified Chinese). Users load PDF files, the app renders each page to canvas, displays a preview with print settings, and opens a window for browser printing.

### Stack
- **React 19** with TypeScript (strict mode)
- **Vite 7** with `@vitejs/plugin-react`
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **pdfjs-dist** (v4) for client-side PDF rendering — renders pages to `<canvas>`, then extracts data URLs
- **vite-plugin-singlefile** — bundles the entire app into one HTML file
- **clsx + tailwind-merge** for conditional class merging (`cn()` utility in `src/utils/cn.ts`)
- **lucide-react** for icons

### Source Layout

```
src/
├── main.tsx                        # Entry point
├── App.tsx                         # Root component, state management, print logic
├── types.ts                        # InvoiceFile, PrintSettings, AppView, PageMargins
├── index.css                       # Tailwind import, custom scrollbar, reset
├── utils/
│   ├── pdf.ts                      # PDF parsing + amount extraction
│   └── cn.ts                       # Class name utility (tailwind-merge + clsx)
└── components/
    ├── TitleBar.tsx                # macOS-style title bar with back button
    ├── HomeView.tsx                # Initial landing: drag-drop or file picker
    ├── InvoiceListView.tsx         # Thumbnail sidebar + preview + settings panel
    ├── PrintSettingsPanel.tsx      # All print settings controls (reused in sidebar & modal)
    ├── SettingsModal.tsx           # Modal wrapper for batch settings
    └── MarginsDialog.tsx           # Modal for margin configuration with visual preview
```

### Key Data Types (from `types.ts`)

- **InvoiceFile** — represents a loaded PDF: file ref, rendered page data URLs, thumbnail, extracted amount, selected state
- **PrintSettings** — comprehensive print configuration: paper size, orientation, margins, layout (1x1/1x2/2x2), scaling, duplex, color, etc.
- **AppView** — `'home' | 'list'` toggles between the two views

### App State Flow (App.tsx)

1. User selects/drops PDF files → `parsePDFFile()` renders each page to canvas (scale 1.5), extracts text
2. `extractAmount()` scans text for Chinese invoice patterns (价税合计, 小写, etc.) to auto-detect amounts
3. Invoices populate the list view with real PDF thumbnails
4. User can adjust amounts manually, toggle selection, configure print settings
5. On print: opens a new window, generates an HTML layout with CSS `@page` sizing, places images in a grid, calls `window.print()`

### Print Output Logic (in App.tsx `handlePrint`)

Pages from selected invoices are collected, laid out on sheets matching the chosen `layout` (1x1/1x2/2x2), collated or uncollated per copies setting, and rendered as an HTML document with precise mm-based CSS sizing. The print output is controlled entirely via CSS — no PDF generation.

### Key Design Decisions

- All PDF parsing is client-side — no server upload
- `pdfjs-dist` worker is loaded from CDN (`cdnjs.cloudflare.com`)
- Settings modal (triggered from home view) and sidebar settings (in list view) share `PrintSettingsPanel` via `mode` prop
- Margins dialog shows a visual A4 preview with draggable/input-based margin controls
- PostCSS/autoprefixer not needed — Tailwind 4 handles it via Vite plugin
- Path alias `@/` maps to `src/`
