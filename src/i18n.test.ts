import { expect, it } from 'vitest';
import { hintText } from './i18n';
import type { Hint } from './types';

const hint = (id: Hint['id'], params: Hint['params'] = {}): Hint => ({ id, params, severity: 'warn', priority: 50, expiresAtMs: 4000, speak: true });
it('gives actionable v4 instructions for support, activation, pose and speed', () => {
  expect(hintText(hint('noSupport', { side: 'left' }))).toContain('левой');
  expect(hintText(hint('noSupport', { side: 'right' }))).toContain('правой');
  expect(hintText(hint('holdStill', { remainingS: 2.3 }))).toContain('2.3');
  expect(hintText(hint('liftTooFast'))).toContain('три секунды');
  expect(hintText(hint('notHorizontal'))).toContain('горизонтально');
  expect(hintText(hint('thumbNotOnTop', { dx: 'left', dy: 'down' }))).toContain('левее, ниже');
  expect(hintText(hint('thumbNotOnTop', { dx: 'right', dy: 'up' }))).toContain('правее, выше');
  expect(hintText(hint('noIndentation'))).toContain('неглубокую');
  expect(hintText(hint('pinchFirst'))).toContain('внутри ямки');
  expect(hintText(hint('spreadTooFast'))).toContain('медленнее');
  expect(hintText(hint('rimPlacement', { dir: 'lower' }))).toContain('Опустите');
  expect(hintText(hint('rimPlacement', { dir: 'closer' }))).toContain('ближе');
  expect(hintText(hint('collapse'))).not.toContain('кулак');
});
