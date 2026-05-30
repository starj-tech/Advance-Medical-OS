/**
 * Inline, render-blocking script that applies the stored (or system) theme to
 * <html> before first paint, preventing a flash of the wrong color scheme.
 * Kept tiny and dependency-free; mirrors the logic in ThemeProvider.
 */
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('abecca-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
