/* All article content and result values live in index.html. */
(() => {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.getElementById('blog-main'), {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      trust: false
    });
  }

  // Let keyboard users scroll formulas that exceed the available width.
  const updateEquationFocus = () => {
    document.querySelectorAll('.equation').forEach((equation) => {
      if (equation.scrollWidth > equation.clientWidth + 1) {
        equation.setAttribute('tabindex', '0');
        equation.setAttribute('role', 'region');
        equation.setAttribute('aria-label', 'Equation; scroll horizontally to read');
      } else {
        equation.removeAttribute('tabindex');
        equation.removeAttribute('role');
        equation.removeAttribute('aria-label');
      }
    });
  };
  document.fonts.ready.then(updateEquationFocus);
  window.addEventListener('resize', updateEquationFocus);
  document.querySelectorAll('details').forEach((detail) => {
    detail.addEventListener('toggle', updateEquationFocus);
  });
})();
