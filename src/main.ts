import { showScaffold } from './ui/screens';
import './ui/styles.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('KILN app root is missing.');

showScaffold(root);

if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1') {
  void import('./dev/mockCore').then(({ installMockCore }) => installMockCore());
}
