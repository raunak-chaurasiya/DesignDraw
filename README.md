# 🎨 DesignDraw — Virtual Whiteboard & Diagram Editor

<div align="center">

[![React](https://img.shields.io/badge/React-19.x-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![RoughJS](https://img.shields.io/badge/Rough.js-Hand--Drawn-orange.svg)](https://roughjs.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-black.svg?logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A lightweight, intuitive virtual whiteboard web application inspired by Excalidraw. Sketch diagrams, flowcharts, wireframes, and notes with an authentic hand-drawn feel, connect shapes dynamically, and export high-resolution JPG images.**

[Explore Live Demo](https://design-draw.vercel.app/) · [Report Bug](https://github.com/raunak-chaurasiya/DesignDraw/issues) · [Request Feature](https://github.com/raunak-chaurasiya/DesignDraw/issues)

</div>

---

## 🌟 Key Features

### ✏️ 1. Hand-Drawn Sketch Aesthetics (Rough.js)
- Authentic hand-drawn sketch style powered by **Rough.js**.
- Customizable **sloppiness / roughness** levels:
  - **Clean (Architect)**: Crisp and straight lines.
  - **Artist**: Natural whiteboard sketch strokes.
  - **Cartoon**: Quirky, organic drawings.
- Rich fill styles: **Solid**, **Hachure (sketch lines)**, **Cross-hatch**, and **Transparent**.

### 🧲 2. Smart Shape Binding & Magnetic Snapping
- **Dynamic Connection Points (Anchors)**: Every shape (Rectangle, Diamond, Ellipse, Sticky Note, Text) features 4 magnetic snap anchors (Top, Right, Bottom, Left).
- **Auto-Following Arrows**: When you connect shapes with an Arrow or Line, moving any shape automatically stretches and rotates the arrow to follow it!
- **Interactive Reconnecting**: Select any arrow to drag and snap its endpoints to new shapes.

### 🖼️ 3. High-Definition JPG & PNG Export
- **Export as JPG**: High-resolution (1x, 2x Retina, 3x Ultra-HD) JPG export with 0.95 quality.
- **Smart Bounding Crop**: Automatically calculates diagram boundaries with clean padding instead of exporting empty canvas.
- **Background Customization**: Choose dark canvas theme, clean white, or custom background colors.
- **Copy to Clipboard**: Instant 1-click clipboard copy to paste straight into Slack, Notion, or WhatsApp.
- **Project JSON Import/Export**: Save editable whiteboard project files (`.json`) to reload anytime.

### 📝 4. Rich Text & Sticky Notes
- **Direct Canvas Text**: Select Text tool (`T`) and click anywhere to write with auto-focus.
- **Double-Click Creation**: Double-click on any empty canvas area to start typing.
- **Handwritten Fonts**: Supports *Patrick Hand*, *Architects Daughter*, *Inter*, and monospace fonts.
- **Pastel Sticky Notes**: Drop yellow/pastel notes on the board for quick brainstorming.

### 💥 5. Animated Satisfying Eraser
- Custom glowing eraser ring cursor following the mouse.
- **Fading Red Trail**: Real-time trail showing the path being erased.
- **Particle Burst Explosion**: 16 sparkling dust particles explode whenever an element is erased, giving tactile 60 FPS visual feedback.

### 🔍 6. Infinite Canvas Navigation
- **Pan**: Hold `Spacebar + Drag`, use `Hand Tool (H)`, or drag with the `Mouse Scroll Wheel`.
- **Zoom**: Smooth mouse wheel zoom centered at cursor position, or use the bottom-left `[-] 100% [+]` controls.
- **Undo / Redo**: Multi-step history stack with `Ctrl + Z` and `Ctrl + Y`.

---

## ⌨️ Keyboard Shortcuts

| Tool / Action | Shortcut | Description |
|---|---|---|
| **Selection Tool** | `V` or `1` | Select, move, and resize shapes |
| **Hand (Pan)** | `H` or `Space + Drag` | Pan and navigate the infinite canvas |
| **Rectangle** | `R` or `2` | Draw hand-drawn rectangles |
| **Diamond** | `D` or `3` | Draw decision/flowchart diamonds |
| **Ellipse / Circle** | `O` or `4` | Draw hand-drawn circles |
| **Arrow** | `A` or `5` | Connect shapes with dynamic arrows |
| **Line** | `L` or `6` | Draw straight connector lines |
| **Pencil / Freehand** | `P` or `7` | Freehand drawing and sketching |
| **Text** | `T` or `8` | Type text (or double-click canvas) |
| **Sticky Note** | `N` or `9` | Place sticky brainstorming notes |
| **Eraser** | `E` or `0` | Erase elements with particle effects |
| **Undo** | `Ctrl + Z` | Undo last action |
| **Redo** | `Ctrl + Y` or `Ctrl + Shift + Z` | Redo undone action |
| **Duplicate** | `Ctrl + D` | Duplicate selected element |
| **Delete** | `Delete` or `Backspace` | Delete selected element |
| **Reset Zoom** | `Ctrl + 0` | Reset canvas zoom to 100% |

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Graphics Engine**: [Rough.js 4.6](https://roughjs.com/) (Hand-drawn algorithmic canvas rendering)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: [Google Fonts](https://fonts.google.com/) (*Patrick Hand*, *Architects Daughter*, *Inter*, *Fira Code*)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/raunak-chaurasiya/DesignDraw.git
   cd DesignDraw
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173` in your browser.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## ☁️ Deployment on Vercel

### Method 1: Using GitHub (Recommended)
1. Push your repository to GitHub:
   ```bash
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **`DesignDraw`** repository.
4. Framework preset will automatically detect **Vite**.
5. Click **Deploy**!

### Method 2: Using Vercel CLI
```bash
npx vercel
```
Follow the terminal prompts to instantly deploy to a live URL.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Crafted with ❤️ by **[Raunak Chaurasiya](https://github.com/raunak-chaurasiya)**

*If you found this project helpful, please give it a ⭐️ on GitHub!*

</div>
