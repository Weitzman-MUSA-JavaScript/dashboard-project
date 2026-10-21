/**
 * An accessible search-as-you-type dropdown (the ARIA "combobox" pattern).
 * Keyboard: Up/Down move through suggestions, Enter picks one, Escape closes.
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */

const DEBOUNCE_MS = 350;
const MIN_LENGTH = 3;

/**
 * @param {object} options
 * @param {HTMLInputElement} options.input The text box (role="combobox").
 * @param {HTMLUListElement} options.listbox The dropdown list (role="listbox").
 * @param {(query: string, signal: AbortSignal) => Promise<Array<{main: string, detail: string, type: string}>>} options.getSuggestions
 * @param {(item: object) => void} options.onChoose Called when a suggestion is picked.
 * @returns {{close: () => void, activeItem: () => object|null}}
 */
function initAutocomplete({ input, listbox, getSuggestions, onChoose }) {
  let items = [];
  let active = -1;
  let timer = null;
  let controller = null;

  function close() {
    listbox.hidden = true;
    listbox.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    items = [];
    active = -1;
  }

  function setActive(index) {
    active = index;
    listbox.querySelectorAll('[role="option"]').forEach((option, i) => {
      option.setAttribute('aria-selected', String(i === active));
      if (i === active) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
    if (active < 0) {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function choose(index) {
    const item = items[index];
    if (!item) {
      return;
    }
    input.value = item.main;
    close();
    onChoose(item);
  }

  function show(results) {
    items = results;
    active = -1;
    if (results.length === 0) {
      close();
      return;
    }
    const options = results.map((item, i) => {
      const option = document.createElement('li');
      option.id = `suggestion-${i}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.className = `suggestion suggestion-${item.type}`;

      const main = document.createElement('span');
      main.className = 'suggestion-main';
      main.textContent = item.main;
      const detail = document.createElement('span');
      detail.className = 'suggestion-detail';
      detail.textContent = item.detail;
      option.append(main, detail);

      // mousedown fires before the input loses focus, so the click isn't lost.
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        choose(i);
      });
      return option;
    });
    listbox.replaceChildren(...options);
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < MIN_LENGTH) {
      close();
      return;
    }
    timer = setTimeout(async () => {
      if (controller) {
        controller.abort();
      }
      controller = new AbortController();
      try {
        const results = await getSuggestions(query, controller.signal);
        if (input.value.trim() === query) {
          show(results);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          close();
        }
      }
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (listbox.hidden) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((active + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active <= 0 ? items.length - 1 : active - 1);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  input.addEventListener('blur', close);

  return { close, activeItem: () => items[active] ?? null };
}

export { initAutocomplete };
