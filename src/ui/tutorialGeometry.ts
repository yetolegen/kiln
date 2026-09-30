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
export const copyShape = (c: LessonShape | ClayState): LessonShape => ({ radii: Array.from(c.radii), height: c.height, cavityRadiusWorld: c.cavityRadiusWorld, cavityDepthWorld: c.cavityDepthWorld });

/** Curriculum goals; these never change the engine's clay or follow a moving target. */
export function createLessonGoal(step: number, clay: LessonShape | ClayState): LessonGoal {
  const start = copyShape(clay), target = copyShape(clay);
  if (step === 0) target.radii = start.radii.map((r, i) => r - .20 * Math.exp(-.5 * ((i - 24) / CONFIG.SIGMA_BANDS) ** 2));
  if (step === 1) { target.height += .30; target.radii = start.radii.map((r) => r * .977); }
  if (step === 2) { target.cavityRadiusWorld = CONFIG.INDENT_RADIUS_WORLD; target.cavityDepthWorld = CONFIG.INDENT_DEPTH_WORLD; }
  if (step === 3) { target.cavityRadiusWorld += .26; target.cavityDepthWorld += .468; }
  if (step === 4) {
    target.height -= .22; target.radii = start.radii.map((r) => r * 1.018);
    target.cavityRadiusWorld = Math.max(0, start.cavityRadiusWorld - .066);
    target.cavityDepthWorld = Math.max(0, start.cavityDepthWorld - .22);
  }
  return { step, start, target };
}

export function assessLessonShape(clay: ClayState, goal: LessonGoal): ShapeAssessment {
  const { target: t, start: s, step } = goal;
  const dent = step === 2;
  const hTol = .035, rTol = .045, cavityRTol = dent ? .025 : .045, cavityDTol = dent ? .025 : .065;
  const radiusError = Math.max(...clay.radii.map((r, i) => Math.abs(r - t.radii[i])));
  const errors = [Math.abs(clay.height - t.height) / hTol, radiusError / rTol,
    Math.abs(clay.cavityRadiusWorld - t.cavityRadiusWorld) / cavityRTol,
    Math.abs(clay.cavityDepthWorld - t.cavityDepthWorld) / cavityDTol];
  const worst = Math.max(...errors);
  let failure: string | null = null;
  if (clay.collapsed) failure = 'Сосуд обрушился. Начните заново и двигайте рабочую руку медленнее, сохраняя опору.';
  else if (Math.max(...clay.damage) > .35) failure = 'Стенка повреждена. Начните заново и работайте медленнее, не растягивая её за образец.';
  else if (clay.height > Math.max(s.height, t.height) + (step === 1 ? hTol : .08)) failure = 'Вы подняли сосуд выше образца. Поднимайте только до прозрачного края.';
  else if (clay.height < Math.min(s.height, t.height) - (step === 4 ? hTol : .08)) failure = 'Вы сжали сосуд ниже образца. Остановите ладонь, когда края совпадут.';
  else if (clay.cavityRadiusWorld > Math.max(s.cavityRadiusWorld, t.cavityRadiusWorld) + cavityRTol) failure = 'Отверстие стало шире образца. Разводите пальцы медленно и остановитесь у прозрачного контура.';
  else if (clay.cavityDepthWorld > Math.max(s.cavityDepthWorld, t.cavityDepthWorld) + cavityDTol) failure = 'Углубление слишком глубокое. Вдавливайте палец только до отмеченного дна.';
  else if (clay.radii.some((r, i) => r < Math.min(s.radii[i], t.radii[i]) - .10 || r > Math.max(s.radii[i], t.radii[i]) + .10)) failure = 'Стенки вышли за допустимую форму. Работайте на отмеченной высоте до прозрачного контура.';
  const instructions = [clay.height < t.height ? 'Поднимите верхний край до прозрачного контура.' : 'Опустите верхний край до прозрачного контура.',
    'Совместите стенки с прозрачным контуром на отмеченной высоте.',
    clay.cavityRadiusWorld < t.cavityRadiusWorld ? 'Расширьте отверстие до прозрачного внутреннего контура.' : 'Отверстие шире цели. Уплотняйте край до внутреннего контура.',
    clay.cavityDepthWorld < t.cavityDepthWorld ? 'Углубите ямку до отмеченного дна.' : 'Дно ниже цели. Остановитесь у отмеченной глубины.'];
  return { similarity: Math.max(0, Math.floor(100 - 10 * worst)), matched: worst <= 1 && !failure,
    failure, instruction: failure ?? instructions[errors.indexOf(worst)] };
}
