/**
 * Particles and visual effects for eraser tool
 */

export class EraserEffectManager {
  constructor() {
    this.particles = [];
    this.trail = [];
    this.cursorPos = null;
  }

  setCursor(x, y) {
    this.cursorPos = { x, y };
  }

  clearCursor() {
    this.cursorPos = null;
  }

  addTrailPoint(x, y) {
    this.trail.push({
      x,
      y,
      alpha: 1,
      createdAt: performance.now(),
    });
  }

  // Create particle burst when an element is deleted
  createBurst(x, y, count = 16) {
    const colors = ['#ff6b6b', '#fa5252', '#f06595', '#ffa8a8', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 3.5 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  }

  // Render cursor, trail, and particles
  render(ctx, isErasing = false) {
    const now = performance.now();

    // 1. Render and age trail
    this.trail = this.trail.filter((p) => now - p.createdAt < 300);
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        const age = now - pt.createdAt;
        const progress = 1 - age / 300; // 1 to 0

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (12 + (1 - progress) * 6), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${progress * 0.25})`;
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Render and update particles
    if (this.particles.length > 0) {
      ctx.save();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Render floating eraser ring cursor
    if (this.cursorPos) {
      ctx.save();
      const { x, y } = this.cursorPos;

      ctx.beginPath();
      ctx.arc(x, y, isErasing ? 16 : 14, 0, Math.PI * 2);
      ctx.fillStyle = isErasing ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)';
      ctx.fill();

      ctx.lineWidth = isErasing ? 2.5 : 1.5;
      ctx.strokeStyle = isErasing ? '#ef4444' : 'rgba(239, 68, 68, 0.7)';
      ctx.stroke();

      // Small center cross or dot
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.restore();
    }

    // Return true if still has active animations needing next frame
    return this.particles.length > 0 || this.trail.length > 0;
  }
}
