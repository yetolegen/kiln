import type { ClayEventType, SessionResult } from '../types';

export const ISSUE_LABELS: Partial<Record<ClayEventType, string>> = {
  tear: 'Резкие движения', wobble: 'Смещение от центра', tooThin: 'Тонкая стенка', collapse: 'Оседание', overhang: 'Резкое расширение',
  thinFloor: 'Слишком глубокое надавливание', overStretch: 'Долгое растягивание', tooFlat: 'Сильное сжатие',
  oneHand: 'Одна рука вне кадра', noHands: 'Руки вне кадра', trackingUncertain: 'Неуверенное распознавание',
};
const TIPS: Partial<Record<ClayEventType, string>> = {
  tear: 'В следующий раз ведите руки медленнее и оставайтесь у стенок.',
  wobble: 'Следите, чтобы середина между руками совпадала с осью круга.',
  tooThin: 'Уплотняйте край: одна рука у стенки, другая горизонтально над краем — задержите её и медленно опускайте.',
  collapse: 'В следующей попытке следите за высотой, дном и толщиной стенок. Сквозное дно, разрыв и лепёшку можно исправить только новой попыткой.',
  thinFloor: 'Останавливайте большой палец на небольшой глубине — примерно одна фаланга.',
  overStretch: 'Отпускайте щипок, когда достигли нужного отверстия: после 7 секунд растягивания стенки истончаются.',
  tooFlat: 'Останавливайте нажим, когда край достиг нужной высоты.',
  overhang: 'Расширяйте соседние участки постепенно, без резкой ступеньки.',
};
export function mostFrequentMistake(result: SessionResult): ClayEventType | null {
  let type: ClayEventType | null = null, count = 0;
  for (const key of Object.keys(TIPS) as ClayEventType[]) if ((result.stats.executionEpisodes[key] ?? 0) > count) { count = result.stats.executionEpisodes[key]!; type = key; }
  return type;
}
export function renderResult(parent: HTMLElement, result: SessionResult, persistent: boolean): void {
  const summary = document.createElement('div'); summary.className = 'result-summary';
  const duration = document.createElement('p');
  duration.textContent = `У круга · ${Math.round(result.stats.durationMs / 1000)} с`;
  summary.append(duration);
  if (result.stats.restores) { const restores = document.createElement('p'); restores.textContent = `Восстановлений: ${result.stats.restores} · ошибки и время сохранены`; summary.append(restores); }
  if (result.customization) { const decor = document.createElement('p'); decor.textContent = `Оформление: ${result.customization.attachments.length} деталей · ${result.customization.stamps.length} штампов · исправлений при оформлении: ${result.customization.editMistakes}`; summary.append(decor); }
  if (result.stats.mode === 'commission' && result.stats.similarity) {
    const score = document.createElement('strong'); score.className = 'result-score';
    score.textContent = `${Math.round(result.stats.similarity.score)}%`;
    const caption = document.createElement('span'); caption.textContent = 'сходство с образцом';
    summary.append(score, caption);
  }
  const mistakes = document.createElement('p');
  const entries = (Object.keys(TIPS) as ClayEventType[]).filter((key) => result.stats.executionEpisodes[key]);
  mistakes.textContent = entries.length ? entries.map((key) => `${ISSUE_LABELS[key]}: ${result.stats.executionEpisodes[key]}`).join(' · ') : 'Без ошибок исполнения';
  const tip = document.createElement('p'); const frequent = mostFrequentMistake(result);
  tip.className = 'result-tip'; tip.textContent = frequent ? TIPS[frequent]! : 'Сохраните этот спокойный ритм для следующего сосуда.';
  const tracking = document.createElement('p'); tracking.className = 'result-tracking';
  const losses = Object.entries(result.stats.trackingEpisodes).filter(([, count]) => count);
  tracking.textContent = losses.length ? `Паузы распознавания (отдельно): ${losses.map(([key, count]) => `${ISSUE_LABELS[key as ClayEventType] ?? key}: ${count}`).join(' · ')}` : 'Распознавание без пауз';
  const saved = document.createElement('p'); saved.className = 'storage-status';
  saved.textContent = persistent ? 'Сохранено на полке в этом браузере' : 'Сосуд на полке до закрытия страницы: браузер не разрешил сохранение';
  summary.append(mistakes, tip, tracking, saved); parent.append(summary);
}

export async function downloadPot(exportPng: () => Promise<Blob | null>, result: SessionResult): Promise<boolean> {
  let url: string | null = null;
  try {
    const blob = await exportPng(); if (!blob) return false;
    url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kiln-${result.id.replace(/[^a-z0-9_-]/gi, '').slice(0, 64)}.png`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    const savedUrl = url; setTimeout(() => URL.revokeObjectURL(savedUrl), 30_000); url = null;
    return true;
  } catch { return false; }
  finally { if (url) URL.revokeObjectURL(url); }
}
