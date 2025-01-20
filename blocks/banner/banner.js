import {
  decorateMain,
} from '../../scripts/scripts.js';
import {
  getMetadata,
  loadSections,
} from '../../scripts/aem.js';

/**
   * Turns a globbing into a regular expression.
   * @private
   * @param {string} glob The globbing
   * @returns The regular expression
   */
function globToRegExp(glob) {
  if (!glob) {
    glob = '**';
  }
  const reString = glob
    .replace('.', '\\.') // don't match every char, just real dots
    .replace(/\*\*/g, '_')
    .replace(/\*/g, '[0-9a-z-.]*')
    .replace(/_/g, '.*');
  return new RegExp(`^${reString}$`);
}

/**
 * Converts a spreadhseet date value into a Date object.
 * @param {number} date The date
 * @returns {Date} The Date object
 */
function sheetToDate(date) {
  // number case, coming from Excel
  // 1/1/1900 is day 1 in Excel, so:
  // - add this
  // - add days between 1/1/1900 and 1/1/1970
  // - add one more day for Excel's leap year bug
  return new Date(Math.round((date - (1 + 25567 + 1)) * 86400 * 1000));
}

/**
 * Loads a banner schedule and returns matching banners.
 * @param {string} scheduleJson The path to the banner schedule
 * @returns {string[]} the matched banners
 */
async function getScheduledBanners(scheduleJson) {
  let resp = await fetch(scheduleJson);
  let json = resp.ok ? await resp.json() : null;
  if (!json) {
    // fall back to global banner schedule
    resp = await fetch('/banner-schedule.json');
    json = resp.ok ? await resp.json() : null;
  }
  if (!json) {
    return [];
  }

  const now = new Date();
  const { data } = json;
  return data
    .filter(({ URL }) => globToRegExp(URL).test(window.location.pathname))
    .filter(({ start, end }) => {
      if (!start || sheetToDate(start) <= now) {
        if (!end || sheetToDate(end) > now) {
          return true;
        }
      }
      return false;
    })
    .map(({ banner }) => banner);
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link?.getAttribute('href') || block.textContent.trim() || getMetadata('banners');
  if (!path) {
    return;
  }

  const banners = await getScheduledBanners(path);
  const banner = await loadFragment(banners[0]);
  if (banner) {
    const bannerSection = banner.querySelector(':scope .section');
    if (bannerSection) {
      block.closest('.section').classList.add(...bannerSection.classList);
      block.closest('.banner').replaceWith(...bannerSection.firstElementChild.children);
    }
  }
}
