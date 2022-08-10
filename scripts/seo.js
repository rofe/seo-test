import { buildBlock } from './scripts.js';

async function fetchPageContent(path) {
  if (!(window.seo && window.seo.data)) {
    window.seo = {};
    const resp = await fetch('/seo.json');
    window.seo.data = resp.ok ? (await resp.json()).data : [];
  }
  return window.seo.data.find((p) => p.path === path);
}

function handleMetadata({ title, description }) {
  if (title) {
    document.title = title;
    document.querySelector('h1').textContent = title;
    document.querySelectorAll('meta[property$=":title"]').forEach((meta) => {
      meta.setAttribute('content', `${title} | Adobe Express`);
    });
  }
  if (description) {
    document.querySelectorAll('meta[property$=":description"]').forEach((meta) => {
      meta.setAttribute('content', description);
    });
  }
}

function buildBlocks(data) {
  const section = document.querySelector('main > div');
  if (data['column-left']) {
    // add columns block
    const left = data['column-left'];
    const right = data['column-right']
    section.append(buildBlock('columns', [[left, right]]));
  }
}

const page = await fetchPageContent(window.location.pathname);
if (page) {
  console.log(page);
  handleMetadata(page);
  buildBlocks(page);
}