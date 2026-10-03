import { expect, it } from 'vitest';
import { ToolLessonProgress, type ToolFacts } from './toolLessonProgress';
const facts = (): ToolFacts => ({ saved: 0, restored: 0, damaged: false, handRotation: 0, attachments: 0, stamps: 0, glazed: false, shelfViews: 0, links: 0 });
it('recovery requires save then actual damage then a valid restoration', () => {
  const f = facts(), lesson = new ToolLessonProgress('recovery', f);
  lesson.update({ ...f, saved: 1 }); lesson.update({ ...f, saved: 1, restored: 1 }); expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 1, damaged: true }); expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 1, restored: 1, damaged: false }); expect(lesson.complete).toBe(true);
});
it('other modules validate produced changes, and a fresh module does not inherit an old action', () => {
  const f = facts();
  const rotation = new ToolLessonProgress('rotation', { ...f, handRotation: 1 }); rotation.update({ ...f, handRotation: 1.1 }); expect(rotation.complete).toBe(false); rotation.update({ ...f, handRotation: 1.2 }); expect(rotation.complete).toBe(true);
  const attachment = new ToolLessonProgress('attachment', f); attachment.update(f); expect(attachment.complete).toBe(false); attachment.update({ ...f, attachments: 1 }); attachment.update(f); expect(attachment.complete).toBe(true);
  const stamp = new ToolLessonProgress('stamp', f); stamp.update({ ...f, glazed: true }); expect(stamp.complete).toBe(false); stamp.update({ ...f, stamps: 1, glazed: true }); expect(stamp.complete).toBe(true);
  const share = new ToolLessonProgress('sharing', { ...f, shelfViews: 2, links: 2 }); share.update({ ...f, shelfViews: 3, links: 2 }); expect(share.complete).toBe(false); share.update({ ...f, shelfViews: 3, links: 3 }); expect(share.complete).toBe(true);
});
