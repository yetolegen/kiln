import { CONFIG } from '../config';
import type { ClayState } from '../types';

export interface LessonShape {
  radii: readonly number[];
  height: number;
  cavityRadiusWorld: number;
  cavityDepthWorld: number;
}
export interface LessonGoal {
  step: number;
  start: LessonShape;
  target: LessonShape;
}
export interface ShapeAssessment {
  similarity: number;
  matched: boolean;
  failure: string | null;
  instruction: string;
}
export const LESSON_FINISH_STEP = 6;
// Lesson steps 1 and 2: a 0.20 narrowing, then a 0.18 widening, centred on band 24. Both land wherever the
// hands touch, so any centre within NARROW_SHIFT_BANDS of it counts (±6 bands ≈ ±0.15 of the height,
// ~±30 px on a laptop webcam). v9.2: the widening is local like the narrowing (it used to be the whole body).
const NARROW_DEPTH = .20, WIDEN_DEPTH = .18, NARROW_BAND = 24, NARROW_SHIFT_BANDS = 6;
const bumped = (start: readonly number[], centre: number, depth: number) =>
  start.map((r, i) => r + depth * Math.exp(-.5 * ((i - centre) / CONFIG.SIGMA_BANDS) ** 2));
const depthOf = (step: number) => (step === 0 ? -NARROW_DEPTH : WIDEN_DEPTH);
const maxError = (radii: ArrayLike<number>, target: readonly number[]) => Math.max(...Array.from(radii, (r, i) => Math.abs(r - target[i])));

export const copyShape = (c: LessonShape | ClayState): LessonShape => ({ radii: Array.from(c.radii), height: c.height, cavityRadiusWorld: c.cavityRadiusWorld, cavityDepthWorld: c.cavityDepthWorld });

/** Curriculum goals; these never change the engine's clay or follow a moving target. */
export function createLessonGoal(step: number, clay: LessonShape | ClayState): LessonGoal {
  const start = copyShape(clay), target = copyShape(clay);
  if (step === 0 || step === 1) target.radii = bumped(start.radii, NARROW_BAND, depthOf(step));
  if (step === 2) { target.height += .30; target.radii = start.radii.map((r) => r * .977); }
  if (step === 3) { target.cavityRadiusWorld = CONFIG.INDENT_RADIUS_WORLD; target.cavityDepthWorld = CONFIG.INDENT_DEPTH_WORLD; }
  if (step === 4) { target.cavityRadiusWorld += .26; target.cavityDepthWorld += .468; }
  if (step === 5) {
    target.height -= .22; target.radii = start.radii.map((r) => r * 1.018);
    target.cavityRadiusWorld = Math.max(0, start.cavityRadiusWorld - .066);
    target.cavityDepthWorld = Math.max(0, start.cavityDepthWorld - .22);
  }
  return { step, start, target };
}

export function assessLessonShape(clay: ClayState, goal: LessonGoal): ShapeAssessment {
  const { start: s, step } = goal;
  let t = goal.target;
  if (step === 0 || step === 1) {
    // Compare against the narrowing / widening moved to where the user actually made it, if that is close enough.
    let best = maxError(clay.radii, t.radii);
    for (let c = NARROW_BAND - NARROW_SHIFT_BANDS; c <= NARROW_BAND + NARROW_SHIFT_BANDS; c++) {
      const radii = bumped(s.radii, c, depthOf(step)), e = maxError(clay.radii, radii);
      if (e < best) { best = e; t = { ...t, radii }; }
    }
  }
  const dent = step === 3;
  const hTol = .035, rTol = .045, cavityRTol = dent ? .025 : .045, cavityDTol = dent ? .025 : .065;
  const radiusError = maxError(clay.radii, t.radii);
  const errors = [Math.abs(clay.height - t.height) / hTol, radiusError / rTol,
    Math.abs(clay.cavityRadiusWorld - t.cavityRadiusWorld) / cavityRTol,
    Math.abs(clay.cavityDepthWorld - t.cavityDepthWorld) / cavityDTol];
  const worst = Math.max(...errors);
  let failure: string | null = null;
  if (clay.bottomHole) failure = 'Дно пробито насквозь. Начните заново и вдавливайте большой палец только до отмеченного дна.';
  else if (clay.collapseCause === 'wallTorn') failure = 'Стенка разорвалась от долгого растягивания. Начните заново и отпускайте щипок у нужной ширины.';
  else if (clay.collapseCause === 'pancake') failure = 'Сосуд сплющен в лепёшку. Начните заново и останавливайте давление у прозрачного края.';
  else if (clay.collapsed) failure = 'Сосуд обрушился. Начните заново и двигайте рабочую руку медленнее, сохраняя опору.';
  else if (Math.max(...clay.damage) > .35) failure = 'Стенка повреждена. Начните заново и работайте медленнее, не растягивая её за образец.';
  else if (clay.height > Math.max(s.height, t.height) + (step === 2 ? hTol : .08)) failure = 'Вы подняли сосуд выше образца. Поднимайте только до прозрачного края.';
  else if (clay.height < Math.min(s.height, t.height) - (step === 5 ? hTol : .08)) failure = 'Вы сжали сосуд ниже образца. Остановите ладонь, когда края совпадут.';
  else if (step === 1 && clay.radii.some((r, i) => r > t.radii[i] + rTol)) failure = 'Корпус шире образца. Разводите обе руки медленно и разомкните щипки у прозрачных стенок.';
  else if (clay.cavityRadiusWorld > Math.max(s.cavityRadiusWorld, t.cavityRadiusWorld) + cavityRTol) failure = 'Отверстие стало шире образца. Разводите пальцы медленно и остановитесь у прозрачного контура.';
  else if (clay.cavityDepthWorld > Math.max(s.cavityDepthWorld, t.cavityDepthWorld) + cavityDTol) failure = 'Углубление слишком глубокое. Вдавливайте палец только до отмеченного дна.';
  else if (clay.radii.some((r, i) => r < Math.min(s.radii[i], t.radii[i]) - .10 || r > Math.max(s.radii[i], t.radii[i]) + .10)) failure = 'Стенки вышли за допустимую форму. Работайте на отмеченной высоте до прозрачного контура.';
  const instructions = [clay.height < t.height ? 'Поднимите верхний край до прозрачного контура.' : 'Опустите верхний край до прозрачного контура.',
    step === 1 ? 'Удерживайте щипок каждой рукой снаружи у стенок, затем медленно разводите обе руки до прозрачного контура.' : 'Совместите стенки с прозрачным контуром на отмеченной высоте.',
    clay.cavityRadiusWorld < t.cavityRadiusWorld ? 'Расширьте отверстие до прозрачного внутреннего контура.' : 'Отверстие шире цели. Уплотняйте край до внутреннего контура.',
    clay.cavityDepthWorld < t.cavityDepthWorld ? 'Углубите ямку до отмеченного дна.' : 'Дно ниже цели. Остановитесь у отмеченной глубины.'];
  return { similarity: Math.max(0, Math.floor(100 - 10 * worst)), matched: worst <= 1 && !failure,
    failure, instruction: failure ?? instructions[errors.indexOf(worst)] };
}
