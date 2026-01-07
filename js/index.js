/** SECURITY LAYER: BLOCK SOURCE VIEWING **/
document.onkeydown = function(e) {
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || (e.ctrlKey && e.keyCode == 85)) {
    return false;
  }
};

/** DEBUGGER TRAP **/
(function() {
    (function(_0x2) {
        try { if (typeof _0x2 === 'function') { return _0x2; } else { (function() { return true; }).constructor('debugger').call('action'); } } catch (err) {}
    })(function() {});
})();

// Theme Logic
const toggle = document.getElementById('darkModeToggle');
const body = document.body;

const savedMode = localStorage.getItem('hx_theme') || 'dark';
body.className = savedMode;
updateIcon(savedMode);

toggle.onclick = () => {
  const isDark = body.classList.contains('dark');
  body.className = isDark ? 'light' : 'dark';
  localStorage.setItem('hx_theme', body.className);
  updateIcon(body.className);
};

function updateIcon(mode) {
  const icon = toggle.querySelector('i');
  icon.className = mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

if (window.top !== window.self) { window.top.location = window.self.location; }