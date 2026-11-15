# 🎨 DesignDraw

<div align="center">

**A lightweight, zero-latency virtual whiteboard & diagramming web app with an authentic hand-drawn feel.**

[![Live Demo](https://img.shields.io/badge/Demo-design--draw.vercel.app-6965db?style=flat-square)](https://design-draw.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Live Demo](https://design-draw.vercel.app/) · [Report Bug](https://github.com/raunak-chaurasiya/DesignDraw/issues) · [Request Feature](https://github.com/raunak-chaurasiya/DesignDraw/issues)

</div>

---

## 📌 Overview

**DesignDraw** is an open-source virtual whiteboard inspired by Excalidraw, designed for quick sketching, system design diagrams, flowcharts, and collaborative brainstorms. Built with **React 19**, **Rough.js**, and **Tailwind CSS v4**, it combines tactile sketch aesthetics with modern productivity features like **P2P live collaboration**, **smart magnetic arrow snapping**, **auto-branching mind maps**, and **cloud board persistence**.

---

## ✨ Features at a Glance

| Feature | Description |
|---|---|
| ✏️ **Hand-Drawn Aesthetics** | Rough.js canvas with adjustable roughness (Architect, Artist, Cartoon) and organic fill patterns (hachure, cross-hatch, solid). |
| 🧲 **Smart Shape Binding** | Magnetic connection points on all shapes with auto-following arrows that stay connected when shapes move. |
| 🌐 **Real-Time Collaboration** | Serverless peer-to-peer room collaboration via WebRTC. Share a link or QR code to draw simultaneously with live remote cursors. |
| ☁️ **Cloud & Local Storage** | Secure board persistence to the cloud with Clerk authentication, or export/import reusable `.json` scenes locally. |
| 🧠 **Mind Mapping & Auto-Branch** | Keyboard-driven auto-branching: press `Tab` for connected child nodes and `Enter` for siblings without node overlap. |
| 📊 **Hand-Drawn Tables** | Native sketch tables with dynamic row/column management and in-place keyboard cell editing. |
| 🖼️ **High-Res Export & Clipboard** | Export pixel-perfect JPG or PNG images with automatic boundary cropping (1x, 2x Retina, 3x UHD), or copy straight to clipboard. |
| 🌓 **Light & Dark Canvas** | Full dark and light theme support with smooth visual transitions and mobile-optimized responsive toolbars. |

---

## 🎯 How to Use

### 1. Drawing & Diagramming
1. **Select a Tool**: Pick a shape from the toolbar (`V` for select, `R` for rectangle, `D` for diamond, `O` for ellipse, `A` for arrow, `P` for pencil).
2. **Connect Shapes**: Drag an arrow near any shape's magnetic anchor points. The arrow binds automatically and follows the shape when moved.
3. **Style Elements**: Click the **Palette** icon in the toolbar to customize stroke color, fill pattern, roughness, and stroke width.

### 2. Fast Mind Mapping
- Click any node and press **`Tab`** to instantly spawn a child branch to the right.
- Press **`Enter`** to spawn a sibling node beneath it.
- Hover over any shape to use directional `+` handles.

### 3. Real-Time Collaboration
1. Click the **Collab** button on the toolbar.
2. Share the generated room link or QR code with teammates.
3. Start drawing together with zero setup—peer cursors and updates synchronize in real time.

### 4. Cloud Saving & Local Export
- **Cloud Sync**: Open Menu (`top-left`) → **Save to cloud** to access your boards across devices (requires Clerk sign-in).
- **Export**: Click Menu → **Export image** to save as JPG, PNG, or reusable JSON, or copy the cropped diagram directly to your clipboard.

---

## ⌨️ Essential Hotkeys

| Key | Action | Key | Action |
|---|---|---|---|
| `V` | Selection tool | `Tab` | Add child mind map branch |
| `H` / `Space + Drag` | Pan canvas | `Enter` | Add sibling branch |
| `R` / `D` / `O` | Rectangle / Diamond / Ellipse | `Ctrl + G` | Group selected elements |
| `A` / `L` | Arrow / Line | `Ctrl + Shift + G` | Ungroup elements |
| `P` / `E` | Pencil / Eraser | `Ctrl + D` | Duplicate selection |
| `T` / `N` | Text / Sticky note | `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `B` | Hand-drawn Table | `Ctrl + 0` | Reset zoom to 100% |
| `Ctrl + V` | Paste image or screenshot | `Delete` | Remove selected elements |

---

## 🛠️ Tech Stack

- **Core**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Canvas Rendering**: [Rough.js](https://roughjs.com/), HTML5 2D Canvas
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Collaboration**: WebRTC via [PeerJS](https://peerjs.com/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or pnpm

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/raunak-chaurasiya/DesignDraw.git
cd DesignDraw

# 2. Install dependencies
npm install

# 3. (Optional) Set up Clerk authentication in .env
cp .env.example .env
# Add your VITE_CLERK_PUBLISHABLE_KEY

# 4. Start local dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).

<div align="center">

Crafted with ❤️ by **[Raunak Chaurasiya](https://github.com/raunak-chaurasiya)**

</div>
