/** Keyboard/mouse isolation for the existing modal action scope. */
export function createDialogFocus(layer: HTMLElement) {
  let previous: HTMLElement | null = null;
  const siblings = new Map<HTMLElement, boolean>();
  const focusable = () => Array.from(layer.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]'));
  const trap = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const items = focusable(), index = items.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1)?.focus(); }
    else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0]?.focus(); }
  };
  return {
    enter() {
      if (!siblings.size) {
        previous = document.activeElement as HTMLElement;
        for (const sibling of Array.from(layer.parentElement!.children)) {
          if (sibling instanceof HTMLElement && sibling !== layer) { siblings.set(sibling, sibling.inert); sibling.inert = true; }
        }
        layer.addEventListener('keydown', trap);
      }
      focusable()[0]?.focus({ preventScroll: true });
    },
    leave() {
      layer.removeEventListener('keydown', trap);
      for (const [sibling, inert] of siblings) sibling.inert = inert;
      siblings.clear();
      if (previous?.isConnected && !previous.closest('[inert], [hidden]')) previous.focus({ preventScroll: true });
      previous = null;
    },
  };
}
