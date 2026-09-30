import { CONFIG } from '../config';
import type { AppCommand, ClayState, EngineSnapshot, Hint } from '../types';
import { assessLessonShape, createLessonGoal, type LessonGoal, type ShapeAssessment } from './tutorialGeometry';

export const TUTORIAL_STEPS = [
  { gesture: 'shape', title: 'Сузьте середину', text: 'Ладони у стенок на средней высоте. Медленно сводите их, пока стенки не совпадут с прозрачным образцом.', demo: 'shape' },
  { gesture: 'pullUp', title: 'Поднимите глину', text: 'Одна раскрытая ладонь горизонтально у основания, другая у стенки. Замрите на 3 секунды, затем очень медленно поднимайте нижнюю руку.', demo: 'lift' },
  { gesture: 'indent', title: 'Сделайте маленькую ямку', text: 'Поддерживайте стенку. Медленно вводите большой палец вниз до голубой отметки дна. Жёлтая линия — безопасный предел: примерно одна фаланга. Глубже — риск пробить дно. Подойдёт любая рука.', demo: 'indent' },
  { gesture: 'open', title: 'Раскройте углубление', text: 'Поддерживайте стенку. Соедините большой и указательный пальцы другой руки внутри ямки, задержите щипок, затем медленно разведите пальцы.', demo: 'open' },
  { gesture: 'compressRim', title: 'Уплотните край', text: 'Одна рука поддерживает стенку. Другую раскройте горизонтально над краем, задержите на полсекунды и медленно опускайте. Край станет ровнее, сосуд — ниже.', demo: 'rim' },
  { gesture: 'raise', title: 'Готовая форма', text: 'Сравните готовую форму с образцом. Нажимать больше не нужно: поднимите обе открытые ладони выше сосуда и удерживайте полторы секунды.', demo: 'raise' },
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
  goal: LessonGoal | null = null;
  assessment: ShapeAssessment | null = null;
  status: 'working' | 'matched' | 'failed' = 'working';
  private actionSeen = false;
  private matchedSince: number | null = null;
  private confirming = false;
  constructor(private dispatch: (command: AppCommand) => void) {}
  private enter(step: number, clay: ClayState | null): void {
    const source = step === 5 ? this.goal?.target ?? clay : clay;
    this.step = step; this.progress = 0; this.status = 'working'; this.waitingRelease = false;
    this.goal = source ? createLessonGoal(step, source) : null;
    this.assessment = null; this.actionSeen = false; this.matchedSince = null; this.confirming = false;
    this.dispatch({ type: 'tutorialStep', step, expectedGesture: TUTORIAL_STEPS[step].gesture });
  }
  update(snapshot: EngineSnapshot, nowMs: number): void {
    if (snapshot.phase !== 'tutorial') { this.session = null; this.goal = null; return; }
    const session = snapshot.stats?.sessionId ?? 'tutorial';
    if (session !== this.session) {
      this.session = session; this.frame = -1; this.epoch = -1;
      this.waitingRelease = false; this.enter(0, snapshot.clay);
      return;
    }
    const input = snapshot.input, gesture = snapshot.gesture;
    const fresh = !!input && input.status === 'ready' && !!gesture?.inputUsable && nowMs >= input.tMs && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS && gesture.sourceFrameId === input.frameId;
    if (!fresh || !input || !gesture) { this.matchedSince = null; return; }
    if (input.epoch !== this.epoch) {
      this.epoch = input.epoch; this.frame = -1; this.matchedSince = null;
    }
    if (this.frame === input.frameId) return;
    this.frame = input.frameId;
    if (this.status === 'failed' || !snapshot.clay || !this.goal) return;
    this.assessment = assessLessonShape(snapshot.clay, this.goal);
    this.progress = this.assessment.similarity / 100;
    const expected = TUTORIAL_STEPS[this.step].gesture;
    if (this.assessment.failure) {
      this.status = 'failed'; this.waitingRelease = false;
      this.dispatch({ type: 'tutorialStep', step: this.step });
      return;
    }
    if (this.status === 'matched') {
      const released = gesture.gesture !== expected || (expected === 'shape' ? !gesture.contact.valid : gesture.activationProgress === 0);
      if (released) this.enter(this.step + 1, snapshot.clay);
      return;
    }
    if (this.step === 5) return; // The core finishes on raise, after the final geometry was validated.
    if (gesture.gesture === expected && gesture.deforming) this.actionSeen = true;
    if (!this.actionSeen || !this.assessment.matched) {
      this.matchedSince = null;
      if (this.confirming) this.dispatch({ type: 'tutorialStep', step: this.step, expectedGesture: expected });
      this.confirming = false;
      return;
    }
    if (this.matchedSince === null) {
      this.matchedSince = input.tMs;
      this.confirming = true;
      // Freeze at the target while fresh observations confirm it.
      this.dispatch({ type: 'tutorialStep', step: this.step });
    }
    if (input.tMs - this.matchedSince >= 350) {
      this.status = 'matched'; this.waitingRelease = true;
      // Freeze at the accepted geometry. The next action is armed only after a reliable release.
      this.dispatch({ type: 'tutorialStep', step: this.step });
    }
  }
}

const OPEN = 'M22 62L8 39Q5 32 11 31L22 42V15Q22 8 27 10V34V6Q29 0 33 6V34V10Q38 3 40 11V36V20Q45 14 47 21V49Q47 61 40 67';
const PINCH = 'M22 64L10 39Q7 30 14 28L24 36L34 27Q40 22 42 28Q43 34 35 40L28 45L38 48L38 18Q42 12 46 20V51Q47 61 40 67';
const THUMB_DOWN = 'M18 12H43V37Q43 44 36 44H28V64Q23 70 20 63V43L12 35V20Z';

export function createTutorial(parent: HTMLElement, dispatch: (command: AppCommand) => void, addRetry: (parent: HTMLElement) => HTMLButtonElement, refreshTargets: () => void) {
  const script = new TutorialScript(dispatch);
  const panel = document.createElement('aside'); panel.className = 'tutorial-card'; panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  const label = document.createElement('span'), title = document.createElement('h2'), text = document.createElement('p');
  text.className = 'tutorial-instruction';
  const demo = document.createElement('div'); demo.className = 'ghost-hands'; demo.setAttribute('aria-hidden', 'true');
  const progress = document.createElement('progress'); progress.max = 1; progress.setAttribute('aria-label', 'Совпадение формы с образцом');
  const match = document.createElement('p'); match.className = 'tutorial-match';
  const feedback = document.createElement('p'); feedback.className = 'tutorial-feedback';
  panel.append(label, title, text, demo, progress, match, feedback); parent.append(panel);
  let retry: HTMLButtonElement | null = null;
  let lastStep = -1;
  let lastSession: string | undefined;
  let lastMessage = '', coaching: Hint | null = null;
  const spoken = new Map<string, number>();
  return {
    get goal(): LessonGoal | null { return script.goal; },
    get status(): string { return script.status; },
    update(snapshot: EngineSnapshot, nowMs: number): Hint | null {
      script.update(snapshot, nowMs); panel.hidden = snapshot.phase !== 'tutorial';
      if (panel.hidden) { lastStep = -1; lastSession = undefined; lastMessage = ''; coaching = null; spoken.clear(); retry?.remove(); retry = null; return null; }
      if (!retry) { retry = addRetry(panel); retry.hidden = true; }
      const failed = script.status === 'failed';
      if (retry.hidden === failed) { retry.hidden = !failed; refreshTargets(); }
      panel.dataset.state = script.status;
      if (lastStep !== script.step || lastSession !== snapshot.stats?.sessionId) {
        lastSession = snapshot.stats?.sessionId; lastMessage = ''; coaching = null; spoken.clear();
        lastStep = script.step; const step = TUTORIAL_STEPS[lastStep];
        panel.dataset.step = String(lastStep); panel.dataset.demo = step.demo;
        label.textContent = `УРОК · ${lastStep + 1} / 6`; title.textContent = step.title; text.textContent = step.text;
        const path = step.demo === 'open' ? PINCH : step.demo === 'indent' ? THUMB_DOWN : OPEN;
        const rotate = step.demo === 'lift' || step.demo === 'rim' ? 'rotate(90 30 38)' : '';
        demo.innerHTML = `<svg viewBox="0 0 76 76"><path transform="translate(8 0)" d="${OPEN}"/></svg><svg viewBox="0 0 76 76"><path transform="translate(8 0) ${rotate}" d="${path}"/></svg>`;
      }
      progress.value = script.progress;
      match.textContent = `Форма: ${Math.round(script.progress * 100)}% · цель ≥ 90%`;
      const technique = lessonFeedback(snapshot, script.step, snapshot.gesture?.activationProgress ?? 0);
      const message = failed ? `Этап не выполнен. ${script.assessment!.failure} Повтор начинается с первого шага.` : script.status === 'matched' ? 'Форма совпала! Уберите рабочую руку от глины, чтобы перейти дальше.' : script.step < 5 && script.assessment?.matched ? 'Форма в допуске. Остановите движение и ненадолго удержите форму.' :
        snapshot.gesture?.gesture === TUTORIAL_STEPS[script.step].gesture && script.assessment && !script.assessment.matched && (snapshot.gesture.activationProgress >= 1 || script.step === 0) ? script.assessment.instruction : technique;
      feedback.hidden = message === TUTORIAL_STEPS[script.step].text;
      if (message !== lastMessage) {
        lastMessage = message; feedback.textContent = message;
        const speak = nowMs - (spoken.get(message) ?? -Infinity) >= 10_000;
        if (speak) spoken.set(message, nowMs);
        coaching = { id: 'notMoving', params: { instruction: message }, severity: failed ? 'error' : 'info', priority: failed ? 95 : 5, expiresAtMs: nowMs + 4000, speak };
      }
      return coaching;
    },
    destroy(): void { panel.remove(); },
  };
}
