import { describe, expect, it } from 'vitest';
import { createClay } from '../src/engine/clay';
import { computeContact } from '../src/engine/contact';
import { hand } from './helpers';

describe('two-wall contact', () => {
  const clay = createClay(); // r = 1, height 1.2

  it('T05 pot r=1, hands at x=0.1 and x=2.1 → no contact', () => {
    const c = computeContact(hand(0.1, 0.6), hand(2.1, 0.6), clay, 180, false);
    expect(c.contact.valid).toBe(false);
    expect(c.contact.reason).toBe('handsNotOpposite');
    expect(c.targetRadiusWorld).toBeNull();
  });

  it('hands at both walls → contact with target radius = half the gap', () => {
    const c = computeContact(hand(-1.1, 0.6), hand(0.9, 0.6), clay, 180, false);
    expect(c.contact.valid).toBe(true);
    expect(c.targetRadiusWorld).toBeCloseTo(1.0);
    expect(c.contact.leftErrorWorld).toBeCloseTo(0.1); // left hand 0.1 outside its wall
    expect(c.contact.rightErrorWorld).toBeCloseTo(-0.1); // right hand 0.1 into the clay
    expect(c.centerOffsetPalm).toBeCloseTo((-0.1 * 180) / 100);
  });

  it('uneven hands → no contact', () => {
    expect(computeContact(hand(-1, 0.2), hand(1, 0.9), clay, 180, false).contact.reason).toBe('handsUneven');
  });

  it('reach hysteresis: 0.55 outside is too far to enter but close enough to stay', () => {
    const l = hand(-1.55, 0.6), r = hand(1, 0.6);
    expect(computeContact(l, r, clay, 180, false).contact.valid).toBe(false);
    expect(computeContact(l, r, clay, 180, true).contact.valid).toBe(true);
  });
});
