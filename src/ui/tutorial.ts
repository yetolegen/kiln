import { CONFIG } from '../config';
import type { AppCommand, ClayState, EngineSnapshot, Gesture, Hint } from '../types';

export const TUTORIAL_STEPS = [
  { gesture: 'shape', title: 'Найдите стенки', text: 'Откройте ладони по обе стороны сосуда. Медленно сводите и разводите их на одной высоте.', demo: 'shape' },
  { gesture: 'pullUp', title: 'Поднимите глину', text: 'Одна раскрытая ладонь горизонтально у основания, другая у стенки. Замрите на 3 секунды, затем очень медленно поднимайте нижнюю руку.', demo: 'lift' },
  { gesture: 'indent', title: 'Сделайте маленькую ямку', text: 'Поддерживайте стенку одной рукой. Большой палец другой направьте вниз к центру верхней поверхности и слегка надавите. Подойдёт любая рука.', demo: 'indent' },
  { gesture: 'open', title: 'Раскройте углубление', text: 'Поддерживайте стенку. Соедините большой и указательный пальцы другой руки внутри ямки, задержите щипок, затем медленно разведите пальцы.', demo: 'open' },
  { gesture: 'compressRim', title: 'Уплотните край', text: 'Одна рука поддерживает стенку. Другую раскройте горизонтально над краем, задержите на полсекунды и медленно опускайте. Край станет ровнее, сосуд — ниже.', demo: 'rim' },
  { gesture: 'raise', title: 'Завершите урок', text: 'Поднимите обе открытые ладони выше сосуда и удерживайте полторы секунды.', demo: 'raise' },
] as const;

export function lessonFeedback(snapshot: EngineSnapshot, step: number, progress: number, waitingRelease = false): string {
  const gesture = snapshot.gesture;
  if (!snapshot.input || snapshot.input.status !== 'ready') return 'Покажите обе руки камере. Глина и урок ждут надёжного отслеживания.';
  if (waitingRelease) return 'Предыдущий шаг выполнен. Отпустите жест и переместите руки для следующего действия.';
  if (step === 5) return 'Раскройте обе ладони выше верхнего края и удерживайте их полторы секунды.';
  if (gesture?.gesture !== TUTORIAL_STEPS[step].gesture) {
    return step === 0 ? 'Раскройте все пальцы обеих рук, отведите большие пальцы от указательных и поверните ладони к камере.' : TUTORIAL_STEPS[step].text;
  }
  if (step === 0 && !gesture.contact.valid) return 'Ладони распознаны. Подведите каждую к своей стенке сосуда, на одной высоте и ниже верхнего края.';
  if (step === 1 && progress < 1) return 'Держите ладонь горизонтально у основания три секунды, пока круг не заполнится. Другую руку держите у стенки.';
  if (step === 3 && progress < 1) return 'Сначала задержите сомкнутый щипок внутри ямки. Затем медленно разводите пальцы, сохраняя опору у стенки.';
  if (step === 4 && progress < 1) return 'Держите горизонтальную ладонь над краем полсекунды, пока круг не заполнится. Затем медленно опускайте.';
  return step === 0 ? 'Медленно сводите или разводите ладони у стенок: для завершения шага должна измениться ширина.' : step === 1 ? 'Активация завершена. Очень медленно поднимайте нижнюю руку, чтобы сосуд стал выше.' : step === 2 ? 'Большой палец вниз: слегка протолкните его в верхнюю поверхность, чтобы появилась неглубокая ямка.' : step === 3 ? 'Медленно разведите большой и указательный пальцы: отверстие должно стать шире и глубже.' : 'Медленно опускайте горизонтальную ладонь: верхний край должен стать ниже.';
}

export class TutorialScript {
  step = 0;
  progress = 0;
  private session: string | null = null;
  private frame = -1;
  private epoch = -1;
  waitingRelease = false;
  private previousGesture: Gesture = 'none';
  private baseline: Pick<ClayState, 'height' | 'cavityRadiusWorld' | 'cavityDepthWorld'> & { radii: number[] } | null = null;
  constructor(private dispatch: (command: AppCommand) => void) {}
  private enter(step: number, clay: ClayState | null): void {
    this.step = step; this.progress = 0;
    this.baseline = clay ? { height: clay.height, cavityRadiusWorld: clay.cavityRadiusWorld, cavityDepthWorld: clay.cavityDepthWorld, radii: Array.from(clay.radii) } : null;
    this.dispatch({ type: 'tutorialStep', step, expectedGesture: TUTORIAL_STEPS[step].gesture });
  }
  update(snapshot: EngineSnapshot, nowMs: number): void {
    if (snapshot.phase !== 'tutorial') { this.session = null; return; }
    const session = snapshot.stats?.sessionId ?? 'tutorial';
    if (session !== this.session) {
      this.session = session; this.frame = -1; this.epoch = -1;
      this.waitingRelease = false; this.enter(0, snapshot.clay);
      return;
    }
    const input = snapshot.input, gesture = snapshot.gesture;
    const fresh = !!input && input.status === 'ready' && !!gesture?.inputUsable && nowMs >= input.tMs && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS && gesture.sourceFrameId === input.frameId;
    if (!fresh || !input || !gesture) { this.progress = 0; return; }
    if (input.epoch !== this.epoch) {
      this.epoch = input.epoch; this.frame = -1; this.progress = 0;
    }
    if (this.frame === input.frameId) return;
    this.frame = input.frameId;
    if (this.waitingRelease) {
      if (gesture.gesture === this.previousGesture && gesture.activationProgress > 0) return;
      this.waitingRelease = false;
    }
    const expected: Gesture = TUTORIAL_STEPS[this.step].gesture;
    this.progress = gesture.gesture === expected ? (this.step === 5 ? Math.min(1, gesture.holdMs / CONFIG.HOLD_FIRE_MS) : gesture.activationProgress) : 0;
    const c = snapshot.clay, b = this.baseline;
    if (!c || !b || this.step === 5 || gesture.gesture !== expected || !gesture.deforming) return;
    const changed = this.step === 0 ? c.radii.some((r, i) => Math.abs(r - b.radii[i]) > .003) :
      this.step === 1 ? c.height > b.height + .005 :
      this.step === 2 ? c.cavityDepthWorld > b.cavityDepthWorld && c.cavityDepthWorld > 0 :
      this.step === 3 ? c.cavityRadiusWorld > b.cavityRadiusWorld + .005 && c.cavityDepthWorld > b.cavityDepthWorld : c.height < b.height - .005;
    if (changed) {
      this.previousGesture = expected; this.waitingRelease = true;
      this.enter(this.step + 1, c);
    }
  }
}

const OPEN = 'M22 62L8 39Q5 32 11 31L22 42V15Q22 8 27 10V34V6Q29 0 33 6V34V10Q38 3 40 11V36V20Q45 14 47 21V49Q47 61 40 67';
const PINCH = 'M22 64L10 39Q7 30 14 28L24 36L34 27Q40 22 42 28Q43 34 35 40L28 45L38 48L38 18Q42 12 46 20V51Q47 61 40 67';
const THUMB_DOWN = 'M18 12H43V37Q43 44 36 44H28V64Q23 70 20 63V43L12 35V20Z';

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
        const path = step.demo === 'open' ? PINCH : step.demo === 'indent' ? THUMB_DOWN : OPEN;
        const rotate = step.demo === 'lift' || step.demo === 'rim' ? 'rotate(90 30 38)' : '';
        demo.innerHTML = `<svg viewBox="0 0 76 76"><path transform="translate(8 0)" d="${OPEN}"/></svg><svg viewBox="0 0 76 76"><path transform="translate(8 0) ${rotate}" d="${path}"/></svg>`;
      }
      progress.value = script.progress;
      const message = lessonFeedback(snapshot, script.step, script.progress, script.waitingRelease);
      feedback.hidden = message === TUTORIAL_STEPS[script.step].text;
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
