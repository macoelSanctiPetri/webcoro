const state = {
  lang: 'es',
  translations: {},
  agenda: [],
  programs: {}
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function loadData() {
  const [translations, agenda, programs] = await Promise.all([
    fetch('data/translations.json').then(r => r.json()),
    fetch('data/agenda.json').then(r => r.json()),
    fetch('data/programs.json').then(r => r.json())
  ]);
  state.translations = translations;
  state.agenda = agenda;
  state.programs = programs;
  renderAll();
}

function setLang(lang) {
  state.lang = lang;
  $$('.lang-switch__btn').forEach(btn => {
    btn.classList.toggle('lang-switch__btn--active', btn.dataset.lang === lang);
  });
  renderAll();
}

function renderText() {
  const t = state.translations[state.lang];
  if (!t) return;
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach(node => {
    const path = node.dataset.i18n.split('.');
    let value = t;
    path.forEach(p => value = value?.[p]);
    if (typeof value === 'string') node.textContent = value;
  });
  // placeholders for form
  const form = t.contact.form;
  $('input[name="name"]').placeholder = form.nameLabel;
  $('input[name="email"]').placeholder = form.emailLabel;
  $('textarea[name="message"]').placeholder = form.messageLabel;
}

function renderAgenda() {
  const list = $('#agenda-list');
  list.innerHTML = '';
  state.agenda.forEach(item => {
    const dateObj = new Date(`${item.date}T${item.time || '00:00'}`);
    const formatted = dateObj.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__top">
        <p class="tag">${formatted} · ${item.time}</p>
        <p class="muted">${item.city} · ${item.venue}</p>
      </div>
      <h4>${item.program}</h4>
      <p class="muted">${item.notes || ''}</p>
    `;
    list.appendChild(card);
  });
}

function renderMilestones() {
  const list = $('#milestones');
  list.innerHTML = '';
  (state.translations[state.lang]?.about?.milestones || []).forEach(m => {
    const li = document.createElement('li');
    li.textContent = m;
    list.appendChild(li);
  });
}

function renderPrograms(category = document.querySelector('.tab--active')?.dataset.category || 'sacred') {
  const t = state.translations[state.lang];
  const list = $('#programs-list');
  list.innerHTML = '';
  (state.programs[category] || []).forEach(p => {
    const el = document.createElement('article');
    el.className = 'program';
    el.innerHTML = `
      <h4>${p.title}</h4>
      <ul>${p.items.map(it => `<li>${it}</li>`).join('')}</ul>
    `;
    list.appendChild(el);
  });
  $$('.tab').forEach(tab => {
    tab.classList.toggle('tab--active', tab.dataset.category === category);
    tab.setAttribute('aria-selected', tab.dataset.category === category ? 'true' : 'false');
    tab.textContent = t.programs.tabs[tab.dataset.category];
  });
}

function renderSpotlight() {
  const spotlight = $('#agenda-spotlight');
  if (!spotlight) return;
  const t = state.translations[state.lang];
  if (!t) return;
  const cta = $('#spotlight-cta');
  const titleNode = $('#spotlight-title');
  const metaNode = $('#spotlight-meta');
  const notesNode = $('#spotlight-notes');

  if (!state.agenda.length) {
    titleNode.textContent = t.hero.emptySpotlight;
    metaNode.textContent = '';
    notesNode.textContent = '';
    cta.textContent = t.hero.ctaSpotlight || t.hero.ctaPrimary;
    return;
  }

  const today = new Date();
  const sorted = [...state.agenda].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));
  const upcoming = sorted.find(item => new Date(`${item.date}T${item.time || '00:00'}`) >= today) || sorted[0];
  const dateObj = new Date(`${upcoming.date}T${upcoming.time || '00:00'}`);
  const formatted = dateObj.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  titleNode.textContent = upcoming.program;
  metaNode.textContent = `${formatted} · ${upcoming.time} · ${upcoming.city} · ${upcoming.venue}`;
  notesNode.textContent = upcoming.notes || '';
  cta.textContent = t.hero.ctaSpotlight || t.hero.ctaPrimary;
}

function bindEvents() {
  $$('.lang-switch__btn').forEach(btn =>
    btn.addEventListener('click', () => setLang(btn.dataset.lang))
  );
  $$('.tab').forEach(tab =>
    tab.addEventListener('click', () => renderPrograms(tab.dataset.category))
  );
  const toggle = $('.nav-toggle');
  const navList = $('#nav-links');
  toggle.addEventListener('click', () => {
    const open = navList.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function renderAll() {
  renderText();
  renderAgenda();
  renderSpotlight();
  renderMilestones();
  renderPrograms();
}

bindEvents();
initCarousel();
loadData();

// --- Carousel ---
let carouselInit = false;
function initCarousel() {
  const track = document.querySelector('.carousel__track');
  if (!track || carouselInit) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;
  carouselInit = true;

  const dotsContainer = document.querySelector('.carousel__dots');
  const prevBtn = document.querySelector('.carousel__btn--prev');
  const nextBtn = document.querySelector('.carousel__btn--next');
  if (!dotsContainer || !prevBtn || !nextBtn) return;
  dotsContainer.innerHTML = '';
  slides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot' + (idx === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', `Slide ${idx + 1}`);
    dot.addEventListener('click', () => goTo(idx));
    dotsContainer.appendChild(dot);
  });

  let current = 0;
  let timer;

  const update = () => {
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.carousel__dot').forEach((d, i) =>
      d.classList.toggle('is-active', i === current)
    );
  };

  const goTo = (idx) => {
    current = (idx + slides.length) % slides.length;
    update();
    restart();
  };

  const restart = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  };

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  update();
  restart();
}
