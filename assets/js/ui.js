
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.navbar');
  const updateNav = () => {
    if (!nav) return;
    nav.classList.toggle('nav-scrolled', window.scrollY > 12);
  };
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  const selectors = '.panel, .module-card, .glass-card, .stats-card, main > section, .hero-stat, footer, .result-box';
  const revealItems = [...document.querySelectorAll(selectors)];
  revealItems.forEach((el, index) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(el => observer.observe(el));

  const topBtn = document.createElement('button');
  topBtn.className = 'back-to-top';
  topBtn.type = 'button';
  topBtn.setAttribute('aria-label', 'Volver arriba');
  topBtn.innerHTML = '↑';
  document.body.appendChild(topBtn);
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const toggleTopBtn = () => topBtn.classList.toggle('show', window.scrollY > 360);
  toggleTopBtn();
  window.addEventListener('scroll', toggleTopBtn, { passive: true });

  const mainAction = document.querySelector('.btn-crisis');
  if (mainAction && document.querySelector('.hero')) {
    mainAction.classList.add('pulse-soft');
  }
});
