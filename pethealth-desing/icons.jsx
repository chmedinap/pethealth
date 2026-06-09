/* icons.jsx — thin wrapper over the Lucide UMD global.
   Lucide ships each icon as an IconNode: an array of [tag, attrs] pairs.
   We render it into a single <svg> with stroke styling. */

function Icon({ name, size = 20, stroke = 2.1, className, style, title }) {
  const lib = (typeof window !== 'undefined' && window.lucide) || {};
  // UMD exposes icons either on `lucide.icons[Name]` or directly as `lucide.Name`.
  // `icons` may be keyed PascalCase or kebab-case depending on build — try both.
  const kebab = String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();
  const lookup = (k) => (lib.icons && (lib.icons[k])) || lib[k] || null;
  const node = lookup(name) || lookup(kebab);
  // Lucide UMD shape: ["svg", attrs, [ [tag, attrs], ... ]].
  // Some builds expose just the child array, or { iconNode: [...] }.
  let children = null;
  if (Array.isArray(node)) {
    if (node[0] === "svg" && Array.isArray(node[2])) children = node[2];
    else if (Array.isArray(node[0])) children = node;
  } else if (node && Array.isArray(node.iconNode)) {
    children = node.iconNode;
  }

  if (!children) {
    // graceful fallback dot so layout never collapses if a name is missing
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

window.Icon = Icon;
