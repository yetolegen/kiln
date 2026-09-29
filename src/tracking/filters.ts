// One Euro filter (Casiez et al., 2012): a low-pass filter whose cutoff rises with speed.
// Still hand → low cutoff → jitter removed. Fast hand → high cutoff → little lag.
import type { Vec2 } from '../types';

export interface OneEuroParams { minCutoff: number; beta: number; dCutoff: number }

// smoothing factor of an exponential filter with the given cutoff (Hz) at step dt (s)
const alpha = (cutoffHz: number, dtS: number) => 1 / (1 + 1 / (2 * Math.PI * cutoffHz * dtS));

export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  constructor(private readonly p: OneEuroParams) {}

  filter(value: number, dtS: number): number {
    if (this.x === null) return (this.x = value);
    if (dtS <= 0) return this.x;
    this.dx += alpha(this.p.dCutoff, dtS) * ((value - this.x) / dtS - this.dx);
    const cutoff = this.p.minCutoff + this.p.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dtS) * (value - this.x);
    return this.x;
  }
}

export class OneEuroVec2 {
  private readonly fx: OneEuro;
  private readonly fy: OneEuro;
  constructor(p: OneEuroParams) {
    this.fx = new OneEuro(p);
    this.fy = new OneEuro(p);
  }
  filter(v: Vec2, dtS: number): Vec2 {
    return { x: this.fx.filter(v.x, dtS), y: this.fy.filter(v.y, dtS) };
  }
}
