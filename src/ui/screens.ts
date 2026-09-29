import { ru } from '../i18n';

// B1 landing only. Phase screens will consume EngineSnapshot in B5.
export function showScaffold(root: HTMLElement): void {
  const page = document.createElement('main');
  page.className = 'workshop';

  const header = document.createElement('header');
  header.className = 'workshop__header';
  const brand = document.createElement('span');
  brand.className = 'wordmark';
  brand.textContent = ru.brand;
  const label = document.createElement('span');
  label.className = 'workshop__label';
  label.textContent = ru.eyebrow;
  header.append(brand, label);

  const content = document.createElement('section');
  content.className = 'workshop__content';
  const mark = document.createElement('img');
  mark.src = '/favicon.svg';
  mark.alt = '';
  mark.width = 88;
  mark.height = 88;
  const title = document.createElement('h1');
  title.textContent = ru.title;
  const description = document.createElement('p');
  description.className = 'workshop__description';
  description.textContent = ru.description;
  const status = document.createElement('p');
  status.className = 'workshop__status';
  status.textContent = ru.status;
  content.append(mark, title, description, status);

  const footer = document.createElement('footer');
  footer.textContent = ru.footer;
  page.append(header, content, footer);
  root.replaceChildren(page);
}
