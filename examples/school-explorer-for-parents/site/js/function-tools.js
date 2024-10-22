/**
 * NOTE:
 * ~~~~~
 * The following functions are re-implementations of functions that are
 * available from the Lodash library: https://lodash.com/
 */

/**
 * Creates an array of values by a particular attribute value (denoted by
 * `key`) off of each object in an input array. For example:
 *
 * const users = [
 *   { 'user': 'barney' },
 *   { 'user': 'fred' }
 * ];
 *
 * _.map(users, 'user');
 * // => ['barney', 'fred']
 *
 * @param {Array} arr The input array
 * @param {String} key The attribute name to search for within each object
 * @return {Array} A new array of only the given properties of each input array object
 */
function pluck(arr, key) {
  return arr.map((elem) => elem[key]);
}

/**
 * Create a new array with only unique elements. Order is not guaranteed to be
 * maintained. For example:
 *
 * _.uniq([1, 1, 2]);
 * // => [1, 2]
 *
 * @param {Array} arr An input array
 * @return {Array} A new array with only the unique elements from the input
 */
function uniq(arr) {
  return [...new Set(arr)];
}

/**
 * Create a new function that waits some number of milliseconds after its last
 * call to run the given function. Useful for doing things like requesting data
 * from an API, where you want to limit the frequency with which you call the
 * API.
 *
 * @param {Function} func The function that should be run when the timer runs out
 * @param {Number} timeout How long (in milliseconds) to wait after the last call to actually run the function
 * @return {Function} A new function that waits some number of milliseconds after its last call to run the wrapped function
 */
function debounce(func, timeout) {
  let timer = null;

  function wrapper(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      func.apply(this, args); // eslint-disable-line no-invalid-this
      timer = null;
    }, timeout);
  }

  return wrapper;
}

window.functionTools = {
  pluck,
  uniq,
  debounce,
};

export { pluck, uniq, debounce };
