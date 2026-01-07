const toggle = document.getElementById('darkModeToggle');
toggle.onclick = () => {
  document.body.classList.toggle('dark');
  const icon = toggle.querySelector('i');
  icon.classList.toggle('fa-moon');
  icon.classList.toggle('fa-sun');
};