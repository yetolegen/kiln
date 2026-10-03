import { CONFIG } from '../config';
import type { EngineSnapshot } from '../types';

/** Visual particles only. No particle feeds back into the clay model. */
export class WheelEffects {
  readonly capacity = 72;
  readonly positions = new Float32Array(this.capacity * 3);
  readonly velocities = new Float32Array(this.capacity * 3);
  readonly life = new Float32Array(this.capacity);
  angle = 0;
  private lastMs = 0;
  private frame = '';
  private next = 0;
  private seed = 0;
  private speed = 0;

  update(snapshot: EngineSnapshot, now: number, reduced: boolean, inspecting: boolean): void {
    const dt = this.lastMs ? Math.max(0, Math.min(.05, (now - this.lastMs) / 1000)) : 0;
    this.lastMs = now;
    const clay = snapshot.clay, input = snapshot.input, gesture = snapshot.gesture;
    const permanent = ['wallTorn', 'bottomHole', 'pancake'].includes(clay?.collapseCause ?? '');
    const shaping = ['studio', 'tutorial'].includes(snapshot.phase);
    if (reduced || inspecting || !shaping || permanent) this.life.fill(0);
    if (reduced || inspecting || permanent || snapshot.phase === 'firing') this.speed = 0;
    else {
      // the menu showcase turns slowly enough to admire, fast enough to read as spinning
      this.speed += ((shaping ? 3.2 : snapshot.phase === 'menu' ? 1.3 : .48) - this.speed) * (1 - Math.exp(-dt * 4));
      this.angle = (this.angle + dt * this.speed) % (Math.PI * 2);
    }
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      this.velocities[j + 1] -= 3.2 * dt;
      for (let k = 0; k < 3; k++) this.positions[j + k] += this.velocities[j + k] * dt;
      if (this.positions[j + 1] < -.12) this.life[i] = 0;
    }
    const key = input ? `${input.epoch}:${input.frameId}` : '';
    const fresh = input && now >= input.tMs && now - input.tMs <= CONFIG.MAX_INPUT_AGE_MS && ['ready', 'oneHand'].includes(input.status);
    if (key === this.frame) return;
    this.frame = key;
    if (!fresh || !shaping || permanent || reduced || inspecting || !clay || !gesture?.deforming || !gesture.inputUsable || gesture.sourceFrameId !== input.frameId) return;
    const band = gesture.contact.activeBand ?? clay.activeBand ?? clay.radii.length - 1;
    for (let count = 0; count < 2; count++) {
      const i = this.next++ % this.capacity, j = i * 3, a = this.angle + this.seed++ * 2.39996;
      const radius = clay.radii[band], sin = Math.sin(a), cos = Math.cos(a);
      this.positions[j] = radius * sin; this.positions[j + 1] = clay.height * band / (clay.radii.length - 1); this.positions[j + 2] = radius * cos;
      this.velocities[j] = sin * .8 + cos * .65; this.velocities[j + 1] = .25 + (i % 3) * .08; this.velocities[j + 2] = cos * .8 - sin * .65;
      this.life[i] = .65;
    }
  }
}
