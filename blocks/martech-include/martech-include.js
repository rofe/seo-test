/**
 * Determines if a string is a URL.
 * @param {string} value The string to check
 * @returns {boolean} Whether the string is a URL
 */
function isURL(value) {
  return /^https?:\/\//.test(value) || value.startsWith('/');
}

/**
 * Determines if a string is a CSS snippet.
 * @param {string} value The string to check
 * @returns {boolean} Whether the string is CSS
 */
function isCSS(value) {
  return /\{[^}]*:[^}]*\}/.test(value);
}

/**
 * Extracts inline JavaScript from a javascript: value.
 * @param {string} value The javascript: value
 * @returns {string} Normalized inline script text
 */
function getInlineScript(value) {
  let inlineScript = value.slice('javascript:'.length).trim();
  // javascript: URLs are often URL-encoded when authored as links.
  if (/%[0-9a-f]{2}/i.test(inlineScript)) {
    try {
      inlineScript = decodeURIComponent(inlineScript);
    } catch (error) {
      // Ignore decode errors and use the original script text.
    }
  }
  return inlineScript;
}

/**
 * decorate the block
 * @param {Element} block the block
 */
export default async function decorate(block) {
  const anchor = block.querySelector('a');
  const value = anchor ? anchor.getAttribute('href') : block.textContent.trim();
  if (!value) return;

  let el;
  if (isURL(value)) {
    if (value.endsWith('.css')) {
      el = document.createElement('link');
      el.setAttribute('rel', 'stylesheet');
      el.setAttribute('href', value);
    } else if (value.endsWith('.js')) {
      el = document.createElement('script');
      el.setAttribute('src', value);
    }
  } else if (isCSS(value)) {
    el = document.createElement('style');
    el.textContent = value;
  } else if (value.startsWith('javascript:')) {
    const inlineScript = getInlineScript(value);
    try {
      // Validate script syntax before inserting a <script> tag.
      // eslint-disable-next-line no-new-func
      new Function(inlineScript);
      el = document.createElement('script');
      el.textContent = inlineScript;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Invalid inline script in martech-include block:', inlineScript, error);
    }
  }

  if (el) {
    try {
      block.replaceChildren(el);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`failed to replace children for ${block.id}`, error);
    }
  }
}
