export type ToolLesson = 'recovery' | 'rotation' | 'attachment' | 'stamp' | 'sharing' | 'handles';
export interface ToolFacts {
  saved: number; restored: number; damaged: boolean; handRotation: number;
  attachments: number; stamps: number; glazed: boolean; shelfViews: number; links: number;
  handles?: number;
}
/** Completion follows actual state changes. Skip/repeat are external navigation, never success. */
export class ToolLessonProgress {
  private saved = false;
  private damaged = false;
  private restoredAtDamage = 0;
  private added = false;
  private restoredAtAdd = 0;
  complete = false;
  constructor(readonly lesson: ToolLesson, private baseline: ToolFacts) {}
  update(f: ToolFacts): string {
    if (this.complete) return 'Урок выполнен.';
    if (this.lesson === 'handles') { this.complete = (f.handles ?? 0) > 0; return 'Основная форма готова. При желании выберите готовую ручку сбоку или сверху → укажите место → «Применить». «Мои ручки» позволяет удалить её; «Добавить ещё» — выбрать другую. Это необязательно: урок можно пропустить.'; }
    if (this.lesson === 'recovery') {
      this.saved ||= f.saved > this.baseline.saved;
      if (this.saved && f.damaged) {
        this.damaged = true;
        this.restoredAtDamage = f.restored;
      }
      this.complete = this.damaged && !f.damaged && f.restored > this.restoredAtDamage;
      return !this.saved ? 'Сначала выберите «Сохранить точку».' : !this.damaged ? 'Учебный пример: намеренно сплющите глину до лепёшки. Пределы и последствия настоящие.' : !this.complete ? 'В центральном сообщении выберите «Восстановить точку».' : 'Геометрия восстановлена. Ошибки остались в истории этой учебной попытки.';
    }
    if (this.lesson === 'rotation') { this.complete = f.handRotation - this.baseline.handRotation >= .12; return 'Выберите «Осмотреть в 3D». Раскройте пальцы, соедините большой и указательный и плавно проведите рукой. Разомкните щипок для отпускания.'; }
    if (this.lesson === 'attachment') {
      // a checkpoint restore also empties the list: only a removal without a restore since the add counts as delete
      if (f.attachments > 0) { this.added = true; this.restoredAtAdd = f.restored; }
      this.complete = this.added && f.attachments === 0 && f.restored === this.restoredAtAdd;
      if (this.added && f.restored !== this.restoredAtAdd) this.added = false;
      return !this.added ? 'Выберите «Детали и штампы» → «Добавить деталь». Укажите место на стенке, соедините пальцы и примените.' : 'Откройте «Мои детали и штампы», выберите вашу деталь и удалите её. Только выбранный элемент будет удалён.';
    }
    if (this.lesson === 'stamp') { this.complete = f.stamps > 0 && f.glazed; return !f.stamps ? 'В оформлении добавьте любой штамп и примените. Рисунок остаётся на поверхности при вращении.' : 'Вернитесь «К глазури и обжигу» и выберите цвет глазури. Страницы цветов переключаются ладонью.'; }
    this.complete = f.shelfViews > this.baseline.shelfViews && f.links > this.baseline.links;
    return f.shelfViews <= this.baseline.shelfViews ? 'Выберите глазурь, обожгите учебный сосуд, откройте «Моя полка» и осмотрите сохранённую работу.' : 'В просмотре выберите «Поделиться». Ссылка откроет сосуд без камеры. Учебная полка отдельна от ваших работ.';
  }
}
