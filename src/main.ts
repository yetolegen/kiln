import './ui/styles.css';
import './ui/workshopTheme.css';
import './ui/atelierTheme.css';
import './ui/final.css';

// Route selection precedes the camera-first workshop and its model bootstrap.
if (location.hash.startsWith('#pot=')) {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) throw Error('KILN app root is missing.');
  const { createPublicViewer } = await import('./ui/publicViewer');
  const dispose = await createPublicViewer(root, location.hash);
  const reload = () => location.reload(); window.addEventListener('hashchange', reload);
  if (import.meta.hot) import.meta.hot.dispose(() => { dispose(); window.removeEventListener('hashchange', reload); });
} else {
  // a share link pasted into an open workshop tab only changes the fragment: reload into the viewer
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#pot=')) location.reload(); });
  await import('./workshop');
}
