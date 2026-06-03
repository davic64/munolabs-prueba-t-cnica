/* icons.jsx — LucideIcon: builds an SVG React element from lucide UMD icon data.
   lucide.icons[Name] === ["svg", attrs, [ [tag, attrs], ... ]] */
function LucideIcon({ name, size = 16, strokeWidth = 2, className, style, color }) {
  const node = (window.lucide && window.lucide.icons && window.lucide.icons[name]) || null;
  if (!node) {
    // graceful fallback: a small ring so a typo is visible but not fatal
    return React.createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth, className, style,
    }, React.createElement('circle', { cx: 12, cy: 12, r: 9 }));
  }
  const children = node[2] || [];
  return React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color || 'currentColor', strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round', className,
    style: { display: 'block', flexShrink: 0, ...(style || {}) },
  }, children.map((c, i) => React.createElement(c[0], { key: i, ...c[1] })));
}

Object.assign(window, { LucideIcon });