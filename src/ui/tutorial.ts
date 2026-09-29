import { CONFIG } from '../config';
import type { AppCommand, EngineSnapshot, Gesture, Hint } from '../types';

export const TUTORIAL_STEPS = [
  { gesture: 'shape', title: 'Найдите стенки', text: 'Откройте ладони по обе стороны сосуда. Медленно сводите и разводите их на одной высоте.', demo: 'shape' },
  { gesture: 'pullUp', title: 'Потяните вверх', text: 'Соедините большой и указательный пальцы на обеих руках. Ведите оба щипка вверх у стенок.', demo: 'pinch' },
  { gesture: 'pressDown', title: 'Сожмите вниз', text: 'Сожмите обе руки в кулаки и опускайте их вместе. Так сосуд становится ниже и восстанавливается.', demo: 'fist' },
  { gesture: 'shape', title: 'Попробуйте ошибиться', text: 'Сначала спокойно коснитесь стенок открытыми ладонями. Затем двигайте ими быстро, оставаясь у сосуда, до трещины.', demo: 'fast' },
  { gesture: 'shape', title: 'Верните спокойный ритм', text: 'Продолжайте формовать у стенок, но медленно. Дождитесь, пока предупреждение о скорости исчезнет.', demo: 'shape' },
  { gesture: 'raise', title: 'Завершите урок', text: 'Поднимите обе открытые ладони выше сосуда и удерживайте полторы секунды.', demo: 'raise' },
] as const;

export function lessonFeedback(snapshot: EngineSnapshot, step: number, progress: number): string {
  const gesture = snapshot.gesture;
  if (!snapshot.input || snapshot.input.status !== 'ready') return 'Покажите обе руки камере. Глина и урок ждут надёжного отслеживания.';
  if (step === 3) return progress === 1 ? 'Спокойное касание засчитано. Теперь ускорьте открытые ладони у стенок до предупреждения о трещине.' : 'Сначала спокойно коснитесь обеих стенок открытыми ладонями. Дождитесь заполнения полоски.';
  if (step === 4) return 'Трещина замечена. Продолжайте медленно формовать у обеих стенок, пока предупреждение не исчезнет.';
  if (step === 5) return 'Раскройте обе ладони выше верхнего края и удерживайте их полторы секунды.';
  if (gesture?.gesture !== TUTORIAL_STEPS[step].gesture) {
    return step === 0 ? 'Раскройте все пальцы обеих рук, отведите большие пальцы от указательных и поверните ладони к камере.' : step === 1 ? 'Соедините большой и указательный пальцы на каждой руке и двигайте обе руки вверх.' : 'Согните все четыре пальца каждой руки в кулак и двигайте оба кулака вниз.';
  }
  if (step === 0 && !gesture.contact.valid) return 'Ладони распознаны. Подведите каждую к своей стенке сосуда, на одной высоте и ниже верхнего края.';
  if (!gesture.deforming) return step === 0 ? 'Подведите обе открытые ладони к стенкам сосуда.' : 'Жест распознан. Теперь двигайте обе руки вместе в указанном направлении.';
  return 'Получается. Продолжайте это движение, пока полоска не заполнится.';
}

export class TutorialScript {
  step = 0;
  progress = 0;
  private session: string | null = null;
  private frame = -1;
  private epoch = -1;
  private capturedAt = 0;
  private held = 0;
  private calmReady = false;
  private tear: string | null = null;
  private tearEnded = false;
  constructor(private dispatch: (command: AppCommand) => void) {}
  private enter(step: number): void {
    this.step = step; this.held = 0; this.progress = 0;
    this.dispatch({ type: 'tutorialStep', step, expectedGesture: TUTORIAL_STEPS[step].gesture });
  }
  update(snapshot: EngineSnapshot, nowMs: number): void {
    if (snapshot.phase !== 'tutorial') { this.session = null; return; }
    const session = snapshot.stats?.sessionId ?? 'tutorial';
    if (session !== this.session) {
      this.session = session; this.frame = -1; this.epoch = -1; this.capturedAt = 0;
      this.calmReady = false; this.tear = null; this.tearEnded = false; this.enter(0);
      return;
    }
    const input = snapshot.input, gesture = snapshot.gesture;
    const fresh = !!input && !!gesture?.inputUsable && nowMs >= input.tMs && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS && gesture.sourceFrameId === input.frameId;
    if (this.step === 4) {
      for (const event of snapshot.events) {
        if (event.type !== 'tear') continue;
        if (event.phase === 'begin') { this.tear = event.episodeId; this.tearEnded = false; }
        if (event.phase === 'end' && event.episodeId === this.tear) this.tearEnded = true;
      }
    }
    if (!fresh || !input || !gesture) { this.held = 0; this.progress = 0; this.frame = -1; this.calmReady = false; return; }
    if (input.epoch !== this.epoch) {
      this.epoch = input.epoch; this.frame = -1; this.held = 0; this.progress = 0; this.calmReady = false;
    }
    if (this.frame === input.frameId) return;
    const dt = this.frame < 0 ? 0 : input.tMs - this.capturedAt;
    this.frame = input.frameId; this.capturedAt = input.tMs;
    const continuous = dt >= 0 && dt <= CONFIG.MAX_INPUT_AGE_MS;
    if (!continuous) { this.held = 0; this.progress = 0; this.calmReady = false; }
    const expected: Gesture = TUTORIAL_STEPS[this.step].gesture;
    const accepted = gesture.gesture === expected && gesture.deforming && gesture.contact.valid;
    const calm = accepted && gesture.speedPalmPerS < CONFIG.TEAR_SPEED_PALM_PER_S && !snapshot.activeIssues.some((event) => event.type === 'tear');
    if (this.step <= 2) {
      this.held = accepted && continuous ? this.held + dt : 0;
      this.progress = Math.min(1, this.held / 600);
      if (this.progress === 1) this.enter(this.step + 1);
    } else if (this.step === 3) {
      this.held = calm && continuous ? this.held + dt : 0;
      if (this.held >= 300) this.calmReady = true;
      this.progress = this.calmReady ? 1 : Math.min(1, this.held / 300);
      if (this.calmReady && accepted) {
        const begin = snapshot.events.find((event) => event.type === 'tear' && event.phase === 'begin');
        if (begin) { this.tear = begin.episodeId; this.tearEnded = false; this.enter(4); }
      }
    } else if (this.step === 4) {
      this.held = calm && this.tearEnded && continuous ? this.held + dt : 0;
      this.progress = Math.min(1, this.held / 400);
      if (this.progress === 1) this.enter(5);
    } else this.progress = gesture.gesture === 'raise' ? Math.min(1, gesture.holdMs / CONFIG.HOLD_FIRE_MS) : 0;
  }
}

const OPEN = 'M22 62L8 39Q5 32 11 31L22 42V15Q22 8 27 10V34V6Q29 0 33 6V34V10Q38 3 40 11V36V20Q45 14 47 21V49Q47 61 40 67';
const PINCH = 'M22 64L10 39Q7 30 14 28L24 36L34 27Q40 22 42 28Q43 34 35 40L28 45L38 48L38 18Q42 12 46 20V51Q47 61 40 67';
const FIST = 'M21 64L12 42Q9 34 16 31L22 37V23Q24 16 29 23V31V20Q33 15 37 21V31V24Q42 18 46 26V48Q47 62 39 67';

export function createTutorial(parent: HTMLElement, dispatch: (command: AppCommand) => void) {
  const script = new TutorialScript(dispatch);
  const panel = document.createElement('aside'); panel.className = 'tutorial-card'; panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  const label = document.createElement('span'), title = document.createElement('h2'), text = document.createElement('p');
  const demo = document.createElement('div'); demo.className = 'ghost-hands'; demo.setAttribute('aria-hidden', 'true');
  const progress = document.createElement('progress'); progress.max = 1; progress.setAttribute('aria-label', 'Прогресс шага');
  const feedback = document.createElement('p'); feedback.className = 'tutorial-feedback';
  panel.append(label, title, text, demo, progress, feedback); parent.append(panel);
  let lastStep = -1;
  let lastMessage = '', coaching: Hint | null = null;
  const spoken = new Map<string, number>();
  return {
    update(snapshot: EngineSnapshot, nowMs: number): Hint | null {
      script.update(snapshot, nowMs); panel.hidden = snapshot.phase !== 'tutorial';
      if (panel.hidden) { lastMessage = ''; coaching = null; return null; }
      if (lastStep !== script.step) {
        lastStep = script.step; const step = TUTORIAL_STEPS[lastStep];
        panel.dataset.step = String(lastStep); panel.dataset.demo = step.demo;
        label.textContent = `УРОК · ${lastStep + 1} / 6`; title.textContent = step.title; text.textContent = step.text;
        const path = step.demo === 'pinch' ? PINCH : step.demo === 'fist' ? FIST : OPEN;
        demo.innerHTML = `<svg viewBox="0 0 60 76"><path d="${path}"/></svg><svg viewBox="0 0 60 76"><path d="${path}"/></svg>`;
      }
      progress.value = script.progress;
      const message = lessonFeedback(snapshot, script.step, script.progress);
      if (message !== lastMessage) {
        lastMessage = message; feedback.textContent = message;
        const speak = nowMs - (spoken.get(message) ?? -Infinity) >= 10_000;
        if (speak) spoken.set(message, nowMs);
        coaching = { id: 'notMoving', params: { instruction: message }, severity: 'info', priority: 5, expiresAtMs: nowMs + 4000, speak };
      }
      return coaching;
    },
    destroy(): void { panel.remove(); },
  };
}
