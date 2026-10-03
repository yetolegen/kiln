/** A read-only stage label; it never dispatches navigation. */
export function createProcess() {
  const list = document.createElement('ol'); list.className = 'pottery-process'; list.setAttribute('aria-label', 'Путь сосуда');
  const stages = ['Форма', 'Декор', 'Глазурь', 'Обжиг', 'Готово'].map(label => {
    const item = document.createElement('li'); item.textContent = label; list.append(item); return item;
  });
  return {
    element: list,
    update(index: number) {
      list.hidden = index < 0;
      stages.forEach((item, i) => { item.dataset.complete = String(i < index); if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current'); });
    },
  };
}
