// adapted from dom-exercises
/**
 * Escape a value before inserting it into HTML text or quoted attributes.
*/
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
  }[character]));
}

/**
 * Parse trusted markup; escape interpolated data with escapeHTML first.
*/
export function htmlToElement(html, ownerDocument = document) {
  const nodes = htmlToElements(html.trim(), ownerDocument);
  if (nodes.length !== 1 || nodes[0].nodeType !== 1) {
    throw new Error('Expected exactly one HTML element.');
  }
  return nodes[0];
}

/**
 * Parse trusted sibling markup using the course exercise template approach.
 * @param {string} html Markup; this function is not an HTML sanitizer.
 * @param {Document} ownerDocument Browser document or a test document.
 * @return {NodeList} Parsed sibling nodes.
 */
export function htmlToElements(html, ownerDocument = document) {
  const template = ownerDocument.createElement('template');
  template.innerHTML = html;
  return template.content.childNodes;
}
