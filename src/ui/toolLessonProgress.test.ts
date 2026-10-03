import { expect, it } from 'vitest';
import { ToolLessonProgress, type ToolFacts } from './toolLessonProgress';
const facts = (): ToolFacts => ({ saved: 0, restored: 0, damaged: false, handRotation: 0, attachments: 0, stamps: 0, glazed: false, shelfViews: 0, links: 0 });
it('recovery requires save then actual damage then a valid restoration', () => {
  const f = facts(), lesson = new ToolLessonProgress('recovery', f);
  lesson.update({ ...f, saved: 1 }); lesson.update({ ...f, saved: 1, restored: 1 }); expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 1, restored: 1, damaged: true }); expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 1, restored: 2, damaged: false }); expect(lesson.complete).toBe(true);
});
it('other modules validate produced changes, and a fresh module does not inherit an old action', () => {
  const f = facts();
  const rotation = new ToolLessonProgress('rotation', { ...f, handRotation: 1 }); rotation.update({ ...f, handRotation: 1.1 }); expect(rotation.complete).toBe(false); rotation.update({ ...f, handRotation: 1.2 }); expect(rotation.complete).toBe(true);
  const attachment = new ToolLessonProgress('attachment', f); attachment.update(f); expect(attachment.complete).toBe(false); attachment.update({ ...f, attachments: 1 }); attachment.update(f); expect(attachment.complete).toBe(true);
  const stamp = new ToolLessonProgress('stamp', f); stamp.update({ ...f, glazed: true }); expect(stamp.complete).toBe(false); stamp.update({ ...f, stamps: 1, glazed: true }); expect(stamp.complete).toBe(true);
  const share = new ToolLessonProgress('sharing', { ...f, shelfViews: 2, links: 2 }); share.update({ ...f, shelfViews: 3, links: 2 }); expect(share.complete).toBe(false); share.update({ ...f, shelfViews: 3, links: 3 }); expect(share.complete).toBe(true);
});

it('recovery does not count a restoration performed before the damage', () => {
  const f = { ...facts(), saved: 4, restored: 2 };
  const lesson = new ToolLessonProgress('recovery', f);
  lesson.update({ ...f, saved: 5 });
  lesson.update({ ...f, saved: 5, restored: 3 });
  lesson.update({ ...f, saved: 5, restored: 3, damaged: true });
  // Restarting clears the damage without restoring the saved checkpoint.
  lesson.update({ ...f, saved: 5, restored: 3 });
  expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 5, restored: 4 });
  expect(lesson.complete).toBe(true);
});

it('attachment is not completed by restoring a checkpoint from before the add', () => {
  const f = facts(), lesson = new ToolLessonProgress('attachment', f);
  lesson.update({ ...f, attachments: 1 });
  lesson.update({ ...f, restored: 1 }); // checkpoint restore removed it, not the delete action
  expect(lesson.complete).toBe(false);
  lesson.update({ ...f, restored: 1, attachments: 1 }); lesson.update({ ...f, restored: 1 });
  expect(lesson.complete).toBe(true);
});

it('recovery requires a new restoration after each subsequent damage', () => {
  const f = facts(), lesson = new ToolLessonProgress('recovery', f);
  lesson.update({ ...f, saved: 1, damaged: true });
  // Restoring a checkpoint that is still damaged is not a successful recovery.
  lesson.update({ ...f, saved: 1, restored: 1, damaged: true });
  lesson.update({ ...f, saved: 1, restored: 1 });
  expect(lesson.complete).toBe(false);
  lesson.update({ ...f, saved: 1, restored: 2 });
  expect(lesson.complete).toBe(true);
});
