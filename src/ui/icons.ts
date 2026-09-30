const PATHS: Record<string, string> = {
  tutorial: 'M4 4h7q3 0 3 3v15q0-3-3-3H4z M24 4h-7q-3 0-3 3v15q0-3 3-3h7z M7 8h4 M17 8h4 M7 12h4 M17 12h4',
  commission: 'M10 3h8 M11 3v5C4 14 7 23 14 24c7-1 10-10 3-16V3 M5 6H2v5 M23 6h3v5 M2 18v6h5 M26 18v6h-5',
  free: 'M9 3h10 M10 3l1 6C3 17 7 25 14 25s11-8 3-16l1-6 M9 18q5 3 10 0 M11 10h6',
  gallery: 'M2 25h24 M2 13h24 M5 3h5l-1 4q4 5-1.5 5T6 7z M17 2h5v9h-5z M4 16h8l-1 7H5z M17 16h6v7h-6z',
  done: 'M4 14l6 6L24 6',
  restart: 'M6 8a10 10 0 1 1-2 12 M6 2v7H0',
  menu: 'M3 3h8v8H3z M17 3h8v8h-8z M3 17h8v8H3z M17 17h8v8h-8z',
  inspect: 'M4 8l10-5 10 5v12l-10 5-10-5z M4 8l10 6 10-6 M14 14v11',
};

export function actionIcon(id: string): string {
  const path = PATHS[id];
  return path ? `<svg class="action-icon" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>` : '';
}
