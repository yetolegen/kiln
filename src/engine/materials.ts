/** Shared material catalog: no rendering or browser dependencies. Existing ids keep their colors. */
export const GLAZES = [
  { id: 'amber', name: 'Янтарь', color: '#ba713d' },
  { id: 'jade', name: 'Нефрит', color: '#638976' },
  { id: 'chalk', name: 'Молоко', color: '#dfd9c8' },
  { id: 'cobalt', name: 'Кобальт', color: '#355690' },
  { id: 'plum', name: 'Слива', color: '#705174' },
  { id: 'coral', name: 'Коралл', color: '#bf776a' },
  { id: 'graphite', name: 'Графит', color: '#44494c' },
  { id: 'honey', name: 'Мёд', color: '#c7a35c' },
] as const;
export type MaterialId = typeof GLAZES[number]['id'];
export const isMaterial = (v: unknown): v is MaterialId => GLAZES.some(g => g.id === v);
export const glazeColor = (id: string | null) => GLAZES.find(g => g.id === id)?.color ?? '#b9825e';
