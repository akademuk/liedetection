/**
 * Lie Detection Group — Main JavaScript
 * Lenis smooth scroll · GSAP animations · Swiper · Theme toggle
 */

(function () {
  'use strict';

  /* --- Theme Toggle --- */
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  const STORAGE_KEY = 'ldg-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return 'dark';
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  setTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* --- Lenis Smooth Scroll --- */
  let lenis;

  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  /* --- Smart Header --- */
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');

  function getScrollY() {
    if (lenis && typeof lenis.scroll === 'number') return lenis.scroll;
    return window.scrollY || document.documentElement.scrollTop;
  }

  function getHeaderOffset() {
    return header ? -header.offsetHeight : -112;
  }

  function handleSmartHeader() {
    if (!header) return;

    const scrollY = getScrollY();

    if (scrollY <= 10) {
      header.classList.remove('site-header--scrolled', 'site-header--compact', 'site-header--hidden');
      return;
    }

    header.classList.add('site-header--scrolled');
    header.classList.toggle('site-header--compact', scrollY > 48);
    header.classList.remove('site-header--hidden');
  }

  if (lenis) {
    lenis.on('scroll', handleSmartHeader);
  } else {
    window.addEventListener('scroll', handleSmartHeader, { passive: true });
  }

  handleSmartHeader();

  /* --- Language picker --- */
  const langPickers = document.querySelectorAll('[data-lang-picker]');

  function closeAllLangPickers(except) {
    langPickers.forEach((picker) => {
      if (picker === except) return;
      picker.classList.remove('lang-picker--open');
      picker.querySelector('.lang-picker__toggle')?.setAttribute('aria-expanded', 'false');
    });
  }

  /* --- Navigation: drawer + dropdowns --- */
  const burger = document.getElementById('burger');
  const navOverlay = document.getElementById('navOverlay');
  const navDrawer = document.getElementById('navDrawer');
  const desktopDropdowns = document.querySelectorAll('.nav__list--desktop .nav__dropdown');
  const navDropdownBackdrop = document.getElementById('navDropdownBackdrop');
  const DESKTOP_NAV_BP = 1201;

  function syncDropdownBackdrop() {
    const anyOpen = document.querySelector('.nav__list--desktop .nav__dropdown--open');
    header?.classList.toggle('site-header--dropdown-open', !!anyOpen);
    if (navDropdownBackdrop) {
      navDropdownBackdrop.setAttribute('aria-hidden', anyOpen ? 'false' : 'true');
    }
  }

  function isDesktopNav() {
    return window.innerWidth >= DESKTOP_NAV_BP;
  }

  function openDropdown(dropdown) {
    if (!dropdown) return;
    closeAllDropdowns(dropdown);
    closeAllLangPickers();
    dropdown.classList.add('nav__dropdown--open');
    const toggle = dropdown.querySelector(':scope > .nav__dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    syncDropdownBackdrop();
  }

  function closeDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove('nav__dropdown--open');
    const toggle = dropdown.querySelector(':scope > .nav__dropdown-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    syncDropdownBackdrop();
  }

  function closeAllDropdowns(except) {
    desktopDropdowns.forEach((dd) => {
      if (dd !== except && !except?.contains?.(dd)) {
        closeDropdown(dd);
      }
    });
    if (!except) syncDropdownBackdrop();
  }

  navDropdownBackdrop?.addEventListener('click', () => closeAllDropdowns());

  langPickers.forEach((picker) => {
    const toggle = picker.querySelector('.lang-picker__toggle');
    if (!toggle) return;

    picker.addEventListener('click', (e) => e.stopPropagation());

    toggle.addEventListener('click', () => {
      const isOpen = picker.classList.toggle('lang-picker--open');
      toggle.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        closeAllLangPickers(picker);
        closeAllDropdowns();
      }
    });
  });

  function openDrawer() {
    if (!nav) return;
    closeAllLangPickers();
    nav.classList.add('nav--open');
    burger?.classList.add('burger--active');
    burger?.setAttribute('aria-expanded', 'true');
    navOverlay?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    header?.classList.remove('site-header--hidden');
  }

  function closeDrawer() {
    if (!nav) return;
    nav.classList.remove('nav--open');
    burger?.classList.remove('burger--active');
    burger?.setAttribute('aria-expanded', 'false');
    navOverlay?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (burger && nav) {
    burger.addEventListener('click', () => {
      if (nav.classList.contains('nav--open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    navOverlay?.addEventListener('click', closeDrawer);

    navDrawer?.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
        closeAllDropdowns();
      });
    });
  }

  /* Mobile drawer accordion */
  document.querySelectorAll('.drawer-nav__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.drawer-nav__group');
      if (!group) return;
      const isOpen = group.classList.toggle('drawer-nav__group--open');
      toggle.setAttribute('aria-expanded', isOpen);
    });
  });

  /* Desktop dropdowns: click + hover */
  desktopDropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(':scope > .nav__dropdown-toggle');
    if (!toggle) return;

    let leaveTimer;

    toggle.addEventListener('click', (e) => {
      if (!isDesktopNav()) return;
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('nav__dropdown--open');
      if (isOpen) {
        closeDropdown(dropdown);
      } else {
        openDropdown(dropdown);
      }
    });

    dropdown.addEventListener('mouseenter', () => {
      if (!isDesktopNav()) return;
      clearTimeout(leaveTimer);
      openDropdown(dropdown);
    });

    dropdown.addEventListener('mouseleave', () => {
      if (!isDesktopNav()) return;
      leaveTimer = setTimeout(() => closeDropdown(dropdown), 160);
    });

    dropdown.addEventListener('focusin', () => {
      if (!isDesktopNav()) return;
      openDropdown(dropdown);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__dropdown')) {
      closeAllDropdowns();
    }
    if (!e.target.closest('[data-lang-picker]')) {
      closeAllLangPickers();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeAllDropdowns();
    closeAllLangPickers();
    closeDrawer();
  });

  window.addEventListener('resize', () => {
    if (isDesktopNav()) {
      closeDrawer();
    } else {
      closeAllDropdowns();
    }
  });

  /* Active nav link by hash */
  function setActiveNavLink() {
    const hash = window.location.hash;
    document.querySelectorAll('.nav__link[href^="#"], .nav__dropdown-link[href^="#"], .mega-menu__link[href^="#"]').forEach((link) => {
      const href = link.getAttribute('href');
      const isActive = href === hash && hash !== '';
      link.classList.toggle('nav__link--active', isActive && link.classList.contains('nav__link'));
      link.classList.toggle('nav__dropdown-link--active', isActive && link.classList.contains('nav__dropdown-link'));
    });
  }

  window.addEventListener('hashchange', setActiveNavLink);
  setActiveNavLink();

  document.querySelectorAll('.mega-menu__link, .nav__dropdown-link, .mega-menu__cta-btn').forEach((link) => {
    link.addEventListener('click', () => closeAllDropdowns());
  });

  /* --- Smooth anchor links with Lenis --- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      if (this.classList.contains('services-nav__link')) return;

      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      if (lenis) {
        lenis.scrollTo(target, { offset: getHeaderOffset() });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* --- GSAP Scroll Animations --- */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.reveal').forEach((el, i) => {
      if (el.closest('.team-slider, .reviews-slider, .section--services')) return;

      const isLiftCard = el.matches('.quick-choice-card, .when-card');
      const animProps = {
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        delay: i % 4 * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      };

      if (isLiftCard) {
        gsap.to(el, animProps);
      } else {
        gsap.to(el, { ...animProps, y: 0 });
      }
    });

    /* Hero entrance */
    const heroReveals = document.querySelectorAll('.hero .reveal');
    if (heroReveals.length) {
      gsap.to(heroReveals, {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.2,
      });
    }

    /* Subtle parallax on hero glows */
    const glows = document.querySelectorAll('.hero__glow');
    if (glows.length) {
      glows.forEach((glow, i) => {
        gsap.to(glow, {
          y: i % 2 === 0 ? 60 : -40,
          ease: 'none',
          scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    }

  } else {
    /* Fallback: show all reveals without GSAP */
    document.querySelectorAll('.reveal').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function refreshSwiperOnImages(swiper) {
    if (!swiper?.el) return;

    const update = () => {
      window.requestAnimationFrame(() => {
        if (swiper.el) swiper.el.style.height = '';
        if (swiper.wrapperEl) swiper.wrapperEl.style.height = 'auto';
        swiper.update();
      });
    };

    swiper.on('init resize slideChange', update);

    swiper.el.querySelectorAll('img').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', update, { once: true });
      img.addEventListener('error', update, { once: true });
    });

    window.addEventListener('load', update, { once: true });
    update();
  }

  const swiperBaseOptions = {
    grabCursor: true,
    speed: 600,
    observer: true,
    observeParents: true,
    resizeObserver: true,
  };

  /* --- Swiper Team --- */
  if (typeof Swiper !== 'undefined') {
    const teamSwiper = new Swiper('.team-swiper', {
      ...swiperBaseOptions,
      slidesPerView: 1.12,
      spaceBetween: 16,
      navigation: {
        nextEl: '.team-swiper__next',
        prevEl: '.team-swiper__prev',
      },
      pagination: {
        el: '.team-swiper__pagination',
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 1.6,
          spaceBetween: 20,
        },
        900: {
          slidesPerView: 2.2,
          spaceBetween: 24,
        },
        1200: {
          slidesPerView: 2.6,
          spaceBetween: 24,
        },
      },
    });

    refreshSwiperOnImages(teamSwiper);
  }

  /* --- Swiper Reviews --- */
  if (typeof Swiper !== 'undefined') {
    const reviewsSwiper = new Swiper('.reviews-swiper', {
      ...swiperBaseOptions,
      slidesPerView: 1.1,
      spaceBetween: 16,
      navigation: {
        nextEl: '.reviews-swiper__next',
        prevEl: '.reviews-swiper__prev',
      },
      pagination: {
        el: '.reviews-swiper__pagination',
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 1.6,
          spaceBetween: 20,
        },
        900: {
          slidesPerView: 2.2,
          spaceBetween: 24,
        },
        1200: {
          slidesPerView: 2.6,
          spaceBetween: 24,
        },
      },
    });

    refreshSwiperOnImages(reviewsSwiper);
  }

  /* --- Swiper Blog --- */
  if (typeof Swiper !== 'undefined') {
    const blogSwiper = new Swiper('.blog-swiper', {
      ...swiperBaseOptions,
      slidesPerView: 1.1,
      spaceBetween: 16,
      navigation: {
        nextEl: '.blog-swiper__next',
        prevEl: '.blog-swiper__prev',
      },
      pagination: {
        el: '.blog-swiper__pagination',
        clickable: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 1.6,
          spaceBetween: 20,
        },
        900: {
          slidesPerView: 2.2,
          spaceBetween: 24,
        },
        1200: {
          slidesPerView: 3,
          spaceBetween: 24,
        },
      },
    });
  }

  /* --- FAQ nested accordion --- */
  const faqRoot = document.querySelector('[data-faq-accordion]');
  if (faqRoot) {
    const faqCategories = faqRoot.querySelectorAll('.faq-category');
    const faqPanels = faqRoot.querySelectorAll('.faq-panel');

    faqCategories.forEach((category) => {
      category.addEventListener('toggle', () => {
        if (!category.open) return;
        faqCategories.forEach((other) => {
          if (other !== category) other.open = false;
        });
      });
    });

    faqPanels.forEach((panel) => {
      panel.addEventListener('toggle', () => {
        if (!panel.open) return;
        faqPanels.forEach((other) => {
          if (other !== panel) other.open = false;
        });
      });
    });
  }

  /* --- Services sticky nav --- */
  const serviceCards = document.querySelectorAll('.service-card[id]');
  const servicesNavLinks = document.querySelectorAll('.services-nav__link');

  function setActiveService(id) {
    servicesNavLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.target === id);
    });
    serviceCards.forEach((card) => {
      card.classList.toggle('is-active', card.id === id);
    });
  }

  if (serviceCards.length && servicesNavLinks.length) {
    const servicesObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveService(entry.target.id);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    serviceCards.forEach((card) => servicesObserver.observe(card));

    servicesNavLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();
        setActiveService(targetId);

        if (lenis) {
          lenis.scrollTo(target, { offset: getHeaderOffset() });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  /* --- Contact Form --- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = contactForm.querySelector('#name');
      const phone = contactForm.querySelector('#phone');

      if (!name.value.trim() || !phone.value.trim()) {
        return;
      }

      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Заявку надіслано ✓';
      btn.disabled = true;
      btn.style.opacity = '0.8';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '';
        contactForm.reset();
      }, 3000);
    });
  }

  /* --- Fancybox gallery (contact page) --- */
  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind('[data-fancybox="contact-gallery"]', {
      groupAll: true,
      Carousel: {
        infinite: true,
      },
      Toolbar: {
        display: {
          left: ['infobar'],
          middle: [],
          right: ['close'],
        },
      },
    });
  }

  /* --- Sticky Mobile CTA --- */
  const stickyCta = document.getElementById('stickyCta');
  const contactSection = document.getElementById('contact');
  const footer = document.querySelector('.footer');

  function updateStickyCta() {
    if (!stickyCta || window.innerWidth > 768) {
      document.body.classList.remove('sticky-cta--off');
      stickyCta?.classList.remove('sticky-cta--hidden');
      return;
    }

    const hideZone = contactSection || footer;
    if (!hideZone) return;

    const rect = hideZone.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const nearContact = rect.top < viewportH - 72;

    stickyCta.classList.toggle('sticky-cta--hidden', nearContact);
    document.body.classList.toggle('sticky-cta--off', nearContact);
  }

  if (stickyCta) {
    if (lenis) {
      lenis.on('scroll', updateStickyCta);
    } else {
      window.addEventListener('scroll', updateStickyCta, { passive: true });
    }
    window.addEventListener('resize', updateStickyCta, { passive: true });
    updateStickyCta();
  }

  /* --- Military discount promo + modal --- */
  const MILITARY_PROMO_HTML = `
    <button type="button" class="military-promo" id="militaryPromo" aria-haspopup="dialog" aria-controls="militaryModal" aria-expanded="false">
      <span class="military-promo__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </span>
      <span class="military-promo__text">Військовим знижки</span>
    </button>
    <div class="military-modal" id="militaryModal" aria-hidden="true">
      <div class="military-modal__overlay" data-military-close tabindex="-1"></div>
      <div class="military-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="militaryModalTitle">
        <button type="button" class="military-modal__close" data-military-close aria-label="Закрити">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div class="military-modal__scroll" data-lenis-prevent>
        <form class="contact-form military-form" id="militaryForm" novalidate>
          <span class="military-form__badge">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 15.8 7.1 17.5 8 11.9 4 8l5.6-1.2L12 2z"/></svg>
            Спеціальна пропозиція
          </span>
          <h2 class="military-form__title" id="militaryModalTitle">Знижки для військових</h2>
          <p class="military-form__lead">Заповніть форму — ми звʼяжемося з вами та повідомимо умови знижки для ЗСУ, Тероборони та ветеранів.</p>
          <div class="form-group">
            <label for="militaryName" class="form-label">Імʼя</label>
            <input type="text" id="militaryName" name="name" class="form-input" placeholder="Ваше імʼя" required autocomplete="name">
          </div>
          <div class="form-group">
            <label for="militaryPhone" class="form-label">Телефон</label>
            <input type="tel" id="militaryPhone" name="phone" class="form-input" placeholder="+38 0XX XXX XX XX" required autocomplete="tel">
          </div>
          <div class="form-group">
            <label for="militaryStatus" class="form-label">Статус</label>
            <select id="militaryStatus" name="status" class="form-input form-select" required>
              <option value="">Оберіть статус</option>
              <option value="zsu">Військовослужбовець ЗСУ</option>
              <option value="terdef">Бійці Тероборони</option>
              <option value="veteran">Ветеран</option>
              <option value="family">Член родини військового</option>
              <option value="other">Інше</option>
            </select>
          </div>
          <div class="form-group">
            <label for="militaryMessage" class="form-label">Коментар (необовʼязково)</label>
            <textarea id="militaryMessage" name="message" class="form-input form-textarea" rows="3" placeholder="Коротко опишіть запит"></textarea>
          </div>
          <button type="submit" class="btn btn--primary btn--lg btn--full">Отримати знижку</button>
          <p class="contact-form__microcopy">Передзвонимо, уточнимо деталі та підтвердимо розмір знижки.</p>
          <p class="contact-form__privacy">Надсилаючи форму, ви погоджуєтесь з <a href="/#privacy">політикою конфіденційності</a>.</p>
        </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', MILITARY_PROMO_HTML);

  const militaryPromo = document.getElementById('militaryPromo');
  const militaryModal = document.getElementById('militaryModal');
  const militaryForm = document.getElementById('militaryForm');
  const militaryScroll = militaryModal?.querySelector('.military-modal__scroll');
  let militaryLastFocus = null;

  function setMilitaryModalOpen(isOpen) {
    document.documentElement.classList.toggle('military-modal-open', isOpen);
    document.body.classList.toggle('military-modal-open', isOpen);
  }

  function openMilitaryModal() {
    if (!militaryModal || !militaryPromo) return;

    militaryLastFocus = document.activeElement;
    militaryModal.classList.add('military-modal--open');
    militaryModal.setAttribute('aria-hidden', 'false');
    militaryPromo.setAttribute('aria-expanded', 'true');
    setMilitaryModalOpen(true);
    lenis?.stop?.();

    const firstField = militaryForm?.querySelector('#militaryName');
    window.requestAnimationFrame(() => firstField?.focus());
  }

  function closeMilitaryModal() {
    if (!militaryModal || !militaryPromo) return;

    militaryModal.classList.remove('military-modal--open');
    militaryModal.setAttribute('aria-hidden', 'true');
    militaryPromo.setAttribute('aria-expanded', 'false');
    setMilitaryModalOpen(false);
    lenis?.start?.();

    if (militaryLastFocus && typeof militaryLastFocus.focus === 'function') {
      militaryLastFocus.focus();
    } else {
      militaryPromo.focus();
    }
  }

  [militaryModal, militaryScroll].forEach((el) => {
    if (!el) return;
    el.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    el.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  });

  militaryPromo?.addEventListener('click', openMilitaryModal);

  militaryModal?.querySelectorAll('[data-military-close]').forEach((el) => {
    el.addEventListener('click', closeMilitaryModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && militaryModal?.classList.contains('military-modal--open')) {
      closeMilitaryModal();
    }
  });

  militaryModal?.addEventListener('click', (e) => {
    if (e.target === militaryModal.querySelector('.military-modal__overlay')) {
      closeMilitaryModal();
    }
  });

  if (militaryForm) {
    militaryForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = militaryForm.querySelector('#militaryName');
      const phone = militaryForm.querySelector('#militaryPhone');
      const status = militaryForm.querySelector('#militaryStatus');

      if (!name.value.trim() || !phone.value.trim() || !status.value) {
        return;
      }

      const btn = militaryForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Заявку надіслано ✓';
      btn.disabled = true;
      btn.style.opacity = '0.8';

      window.setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = '';
        militaryForm.reset();
        closeMilitaryModal();
      }, 2500);
    });
  }

  /* Hide military promo near contact/footer on mobile (same as sticky CTA logic) */
  function updateMilitaryPromo() {
    if (!militaryPromo) return;

    if (window.innerWidth > 768) {
      militaryPromo.classList.remove('military-promo--hidden');
      return;
    }

    const hideZone = contactSection || footer;
    if (!hideZone) return;

    const rect = hideZone.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const nearContact = rect.top < viewportH - 72;

    militaryPromo.classList.toggle('military-promo--hidden', nearContact);
  }

  if (militaryPromo) {
    if (lenis) {
      lenis.on('scroll', updateMilitaryPromo);
    } else {
      window.addEventListener('scroll', updateMilitaryPromo, { passive: true });
    }
    window.addEventListener('resize', updateMilitaryPromo, { passive: true });
    updateMilitaryPromo();
  }
})();
