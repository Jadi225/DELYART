/* =====================================================================
   DELYART V12 · script unique, sans bibliothèque.
   Règle d'or : le site marche sans ce fichier. Il ne fait qu'ajouter du mouvement.
   - Aucun scroll-jacking : on LIT la position du défilement, on ne la modifie jamais.
   - Un seul écouteur de scroll (passif) + requestAnimationFrame.
   - IntersectionObserver : seules les scènes visibles sont calculées.
   ===================================================================== */
(() => {
  'use strict';
  const racine = document.documentElement;
  const anim = racine.classList.contains('anim'); // ajouté dans le <head> si l'utilisateur accepte le mouvement
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));

  /* 1. Anciens liens index.html#graphisme et #web : on redirige vers la bonne page */
  if (document.body.classList.contains('accueil')) {
    const cible = { graphisme: 'graphisme.html', web: 'web.html' }[location.hash.slice(1)];
    if (cible) location.replace(cible);
  }

  /* 2. Année du pied de page */
  document.querySelectorAll('[data-annee]').forEach(el => { el.textContent = new Date().getFullYear(); });

  if (!('IntersectionObserver' in window)) return;

  if (!anim) return; // mouvement réduit : la version statique est complète, on s'arrête là

  /* 3. Repli des micro-interactions si le navigateur ne connaît pas animation-timeline */
  if (!(window.CSS && CSS.supports('animation-timeline: view()'))) {
    racine.classList.add('repli-js');
    const ioVu = new IntersectionObserver(entrees => entrees.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vu'); ioVu.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.masque, .repere').forEach(el => ioVu.observe(el));
  }

  /* 3 bis. Mouvement ajouté en V13 : points, logo à démonter, boutons attirés par la souris.
        Chaque bloc est indépendant : supprime-en un pour couper l'effet. */
  const souris = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* a. Champ de points qui pulse depuis le bouton du héros Web (CSS : .champ-points, @keyframes onde) */
  const heroWeb = document.querySelector('.hero-web');
  if (heroWeb) {
    const champ = document.createElement('div');
    champ.className = 'champ-points';
    champ.setAttribute('aria-hidden', 'true');
    heroWeb.prepend(champ);
    const MAILLE = 72; // taille d'une case en px (plus grand = moins de points = plus léger)
    const construire = () => {
      const r = heroWeb.getBoundingClientRect();
      const nc = Math.min(24, Math.max(6, Math.ceil(r.width / MAILLE)));
      const nr = Math.min(11, Math.max(4, Math.ceil(r.height / MAILLE)));
      champ.style.setProperty('--nc', nc);
      champ.style.setProperty('--nr', nr);
      const cible = heroWeb.querySelector('.actions');
      const a = cible ? cible.getBoundingClientRect() : r;
      const ox = ((a.left + a.width / 2) - r.left) / r.width * nc;
      const oy = ((a.top + a.height / 2) - r.top) / r.height * nr;
      const frag = document.createDocumentFragment();
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
        const point = document.createElement('i');
        point.style.setProperty('--d', Math.round(Math.hypot(i + .5 - ox, j + .5 - oy)));
        frag.appendChild(point);
      }
      champ.replaceChildren(frag);
    };
    construire();
    let retard = 0;
    addEventListener('resize', () => { clearTimeout(retard); retard = setTimeout(construire, 250); }, { passive: true });
    new IntersectionObserver(es => es.forEach(e => champ.classList.toggle('en-pause', !e.isIntersecting))).observe(heroWeb); // pause hors écran
  }

  /* b. Logo à démonter : on attrape une pièce, au lâcher elle revient avec un ressort */
  document.querySelectorAll('.logo-jeu').forEach(fig => {
    const svg = fig.querySelector('svg');
    const RAIDEUR = 120, FREIN = 6; // ressort : moins de FREIN = plus de rebond
    const pieces = [...fig.querySelectorAll('.glisse')].map(el => ({ el, x: 0, y: 0, vx: 0, vy: 0, tenu: false, px: 0, py: 0, pt: 0 }));
    let rafJeu = 0, avant = 0;
    const ecrire = s => { s.el.style.transform = (s.x || s.y) ? `translate(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px)` : ''; };
    function pas(t) {
      rafJeu = 0;
      const dt = Math.min(0.033, (t - avant) / 1000 || 0.016); avant = t;
      let vivant = false;
      for (const s of pieces) {
        if (s.tenu) { vivant = true; continue; }
        if (!s.x && !s.y && !s.vx && !s.vy) continue;
        s.vx += (-RAIDEUR * s.x - FREIN * s.vx) * dt; s.vy += (-RAIDEUR * s.y - FREIN * s.vy) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.vx) + Math.abs(s.vy) < 0.03) { s.x = s.y = s.vx = s.vy = 0; }
        ecrire(s); vivant = true;
      }
      if (vivant) rafJeu = requestAnimationFrame(pas);
    }
    const lancer = () => { if (!rafJeu) { avant = performance.now(); rafJeu = requestAnimationFrame(pas); } };
    pieces.forEach(s => {
      s.el.addEventListener('pointerdown', e => {
        e.preventDefault(); s.el.setPointerCapture(e.pointerId);
        s.tenu = true; s.px = e.clientX; s.py = e.clientY; s.pt = performance.now(); s.vx = s.vy = 0;
        s.el.classList.add('saisi'); fig.classList.add('touche'); lancer();
      });
      s.el.addEventListener('pointermove', e => {
        if (!s.tenu) return;
        const k = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width; // px écran → unités du dessin
        const t = performance.now(), dt = Math.max(1, t - s.pt);
        const dx = (e.clientX - s.px) * k, dy = (e.clientY - s.py) * k;
        s.x = borne(s.x + dx, -140, 140); s.y = borne(s.y + dy, -140, 140);
        s.vx = borne(dx / dt * 1000, -700, 700); s.vy = borne(dy / dt * 1000, -700, 700);
        s.px = e.clientX; s.py = e.clientY; s.pt = t; ecrire(s);
      });
      const lacher = () => {
        if (!s.tenu) return;
        s.tenu = false; s.el.classList.remove('saisi');
        if (performance.now() - s.pt > 90) { s.vx = s.vy = 0; } // la main s'était arrêtée avant de lâcher
        lancer();
      };
      s.el.addEventListener('pointerup', lacher);
      s.el.addEventListener('pointercancel', lacher);
    });
  });

  /* c. Boutons attirés par la souris (propriété « translate » : ne gêne aucune autre animation) */
  if (souris) {
    const aimants = [...document.querySelectorAll('.btn')].map(el => ({ el, tx: 0, ty: 0, cx: 0, cy: 0 }));
    const RAYON = 90, FORCE = 0.35;
    let rafAimant = 0;
    const boucle = () => {
      let actif = false;
      for (const m of aimants) {
        m.cx += (m.tx - m.cx) * 0.18; m.cy += (m.ty - m.cy) * 0.18;
        if (Math.abs(m.tx - m.cx) > 0.05 || Math.abs(m.ty - m.cy) > 0.05) { actif = true; m.el.style.translate = `${m.cx.toFixed(2)}px ${m.cy.toFixed(2)}px`; }
        else if (m.el.style.translate) { m.cx = m.tx; m.cy = m.ty; m.el.style.translate = (m.tx || m.ty) ? `${m.tx}px ${m.ty}px` : ''; }
      }
      rafAimant = actif ? requestAnimationFrame(boucle) : 0;
    };
    if (aimants.length) addEventListener('mousemove', e => {
      let relance = false;
      for (const m of aimants) {
        const b = m.el.getBoundingClientRect();
        if (b.bottom < -RAYON || b.top > innerHeight + RAYON) continue;
        const dx = e.clientX - (b.left + b.width / 2 - m.cx), dy = e.clientY - (b.top + b.height / 2 - m.cy);
        if (Math.hypot(dx, dy) < RAYON) { m.tx = dx * FORCE; m.ty = dy * FORCE; relance = true; }
        else if (m.tx || m.ty) { m.tx = 0; m.ty = 0; relance = true; }
      }
      if (relance && !rafAimant) rafAimant = requestAnimationFrame(boucle);
    }, { passive: true });
  }

  /* 4. Scènes pilotées par le défilement
        p = progression brute (0 → 1) selon la position de la section
        --p = progression lissée (lerp), écrite dans une variable CSS
        data-etape = étape en cours, selon les seuils nets de data-seuils
        data-paliers = nombre d'écrans : le défilement marque une pause sur chacun */
  const LISSAGE = 0.18; // 0.1 = plus doux et plus lent, 0.3 = plus sec
  const scenes = [...document.querySelectorAll('[data-scene]')].map(el => ({
    el, p: 0, brut: 0, actif: false, pret: false, etape: -1,
    seuils: (el.dataset.seuils || '').split(',').filter(Boolean).map(Number),
    paliers: Number(el.dataset.paliers) || 0
  }));
  if (!scenes.length) return;

  let raf = 0;
  const demander = () => { if (!raf) raf = requestAnimationFrame(image); };

  function image() {
    raf = 0;
    let encore = false;
    const hauteurVue = window.innerHeight;
    for (const s of scenes) {
      if (!s.actif) continue;
      const r = s.el.getBoundingClientRect();
      const course = r.height - hauteurVue;
      s.brut = course > 0 ? borne(-r.top / course, 0, 1) : 0;
      if (!s.pret) { s.p = s.brut; s.pret = true; } // arrivée directe (ancre, bouton retour) : pas de rattrapage
      const ecart = s.brut - s.p;
      s.p = Math.abs(ecart) < 0.0008 ? s.brut : s.p + ecart * LISSAGE;
      if (s.p !== s.brut) encore = true;
      s.el.style.setProperty('--p', s.p.toFixed(4));

      let etape = 0;
      if (s.paliers > 1) {
        const n = s.paliers - 1;
        const t = borne((s.p - 0.06) / 0.88, 0, 1) * n;
        const k = Math.min(n - 1, Math.floor(t));
        const f = borne((t - k - 0.3) / 0.4, 0, 1);
        const doux = f * f * (3 - 2 * f);
        s.el.style.setProperty('--x', ((k + doux) / n).toFixed(4));
        etape = Math.round(k + doux);
      } else {
        for (const v of s.seuils) if (s.p >= v) etape++;
      }
      if (etape !== s.etape) { s.etape = etape; s.el.dataset.etape = etape; }
    }
    if (encore) demander();
  }

  const ioScenes = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      const s = scenes.find(x => x.el === e.target);
      s.actif = e.isIntersecting;
      if (!s.actif) s.pret = false;
      s.el.classList.toggle('active', s.actif); // will-change seulement quand la scène est à l'écran
    });
    demander();
  });
  scenes.forEach(s => { s.el.dataset.etape = 0; ioScenes.observe(s.el); });
  addEventListener('scroll', demander, { passive: true });
  addEventListener('resize', demander, { passive: true });
})();
