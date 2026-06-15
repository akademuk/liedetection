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
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function getSystemTheme() {
    return colorSchemeQuery.matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  }

  function getPreferredTheme() {
    return getStoredTheme() ?? getSystemTheme();
  }

  function setTheme(theme, persist) {
    html.setAttribute('data-theme', theme);
    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  function applyTheme() {
    setTheme(getPreferredTheme(), false);
  }

  applyTheme();

  colorSchemeQuery.addEventListener('change', () => {
    if (!getStoredTheme()) {
      setTheme(getSystemTheme(), false);
    }
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* --- Hero video loop --- */
  const heroVideo = document.querySelector('.polygraph-panel__video');
  if (heroVideo) {
    heroVideo.loop = true;
    heroVideo.muted = true;
    heroVideo.setAttribute('playsinline', '');

    const playHeroVideo = () => {
      const playPromise = heroVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    heroVideo.addEventListener('ended', () => {
      heroVideo.currentTime = 0;
      playHeroVideo();
    });

    playHeroVideo();
  }

  /* --- Lenis Smooth Scroll (disabled in Safari / iOS) --- */
  let lenis;

  function shouldUseLenis() {
    if (typeof Lenis === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|FxiOS/.test(ua);

    return !isSafari && !isIOS;
  }

  if (shouldUseLenis()) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    if (typeof ScrollTrigger !== 'undefined' && typeof gsap !== 'undefined') {
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

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = picker.classList.toggle('lang-picker--open');
      toggle.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        closeAllLangPickers(picker);
        closeAllDropdowns();
      }
    });
  });

  /* Drawer must live on body — .header backdrop-filter clips position:fixed children */
  if (navOverlay && navDrawer && navOverlay.parentElement !== document.body) {
    document.body.appendChild(navOverlay);
    document.body.appendChild(navDrawer);
  }

  navDrawer?.setAttribute('data-lenis-prevent', '');
  navOverlay?.setAttribute('data-lenis-prevent', '');

  function openDrawer() {
    if (!nav) return;
    closeAllLangPickers();
    closeAllDropdowns();
    nav.classList.add('nav--open');
    document.body.classList.add('nav-drawer-open');
    burger?.classList.add('burger--active');
    burger?.setAttribute('aria-expanded', 'true');
    navOverlay?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    header?.classList.remove('site-header--hidden');
    lenis?.stop?.();
  }

  function closeDrawer() {
    if (!nav) return;
    nav.classList.remove('nav--open');
    document.body.classList.remove('nav-drawer-open');
    burger?.classList.remove('burger--active');
    burger?.setAttribute('aria-expanded', 'false');
    navOverlay?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lenis?.start?.();
  }

  if (burger && nav) {
    burger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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

  document.querySelectorAll('.mega-menu__link, .mega-menu__title--link, .nav__dropdown-link, .mega-menu__cta-btn').forEach((link) => {
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
  function showAllReveals() {
    document.querySelectorAll('.reveal').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      showAllReveals();
    } else {
      const REVEAL_EXCLUDE = '.team-slider, .reviews-slider, .section--services';
      const HERO_SELECTORS = '.hero, .article-page-hero, .faq-page-hero, .contact-page-hero, .price-page-hero';
      const REVEAL_GROUP_SELECTORS = [
        '.section',
        '.legality-section',
        '.limits-section',
        '.cheat-section',
        '.services-section',
        '.legality-aside',
        '.limits-aside',
        '.cheat-aside',
        '.services-aside',
        '.article-page-layout',
        '.blog-grid',
        '.contact-page-layout',
        '.legal-doc',
      ].join(', ');

      function isExcludedReveal(el) {
        return !!el.closest(REVEAL_EXCLUDE);
      }

      function isHeroReveal(el) {
        return !!el.closest(HERO_SELECTORS);
      }

      function getRevealGroup(el) {
        return el.closest(REVEAL_GROUP_SELECTORS) || el;
      }

      function animateRevealGroup(trigger, reveals) {
        if (!reveals.length) return;

        const liftCards = reveals.filter((el) => el.matches('.quick-choice-card, .when-card'));
        const fadeUps = reveals.filter((el) => !el.matches('.quick-choice-card, .when-card'));

        if (liftCards.length) {
          gsap.to(liftCards, {
            opacity: 1,
            duration: 0.75,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          });
        }

        if (fadeUps.length) {
          gsap.to(fadeUps, {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          });
        }
      }

      const heroReveals = gsap.utils.toArray('.reveal').filter(
        (el) => isHeroReveal(el) && !isExcludedReveal(el)
      );
      if (heroReveals.length) {
        gsap.to(heroReveals, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.15,
        });
      }

      const groupedReveals = new Map();
      gsap.utils.toArray('.reveal').forEach((el) => {
        if (isExcludedReveal(el) || isHeroReveal(el)) return;

        const group = getRevealGroup(el);
        if (!groupedReveals.has(group)) groupedReveals.set(group, []);
        groupedReveals.get(group).push(el);
      });

      groupedReveals.forEach((reveals, trigger) => {
        animateRevealGroup(trigger, reveals);
      });

      /* Compare teaser cards (no .reveal class) */
      gsap.utils.toArray('.compare-teaser-card, .compare-teaser-hub').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 24,
          scale: 0.98,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        });
      });

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

      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      ScrollTrigger.refresh();
    }
  } else {
    showAllReveals();
  }

  function refreshSwiperOnImages(swiper, options = {}) {
    if (!swiper?.el) return;

    const update = () => {
      window.requestAnimationFrame(() => {
        if (!swiper.el) return;
        swiper.el.style.height = '';
        if (swiper.wrapperEl) swiper.wrapperEl.style.height = 'auto';
        swiper.update();
        swiper.navigation?.update?.();
      });
    };

    swiper.on('init', update);
    swiper.on('resize', update);
    if (!options.skipSlideChange) {
      swiper.on('slideChange', update);
    }

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

  /* --- Swiper Services (homepage) --- */
  if (typeof Swiper !== 'undefined') {
    document.querySelectorAll('.services-group .services-swiper').forEach((swiperEl) => {
      const group = swiperEl.closest('.services-group');
      if (!group) return;

      const prevEl = group.querySelector('.services-swiper__prev');
      const nextEl = group.querySelector('.services-swiper__next');
      const paginationEl = group.querySelector('.services-swiper__pagination');

      [prevEl, nextEl, paginationEl].forEach((el) => {
        el?.setAttribute('data-lenis-prevent', '');
      });

      const servicesSwiper = new Swiper(swiperEl, {
        ...swiperBaseOptions,
        observer: false,
        observeParents: false,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 16,
        centeredSlides: false,
        roundLengths: true,
        preventClicks: false,
        preventClicksPropagation: false,
        navigation: {
          nextEl,
          prevEl,
          disabledClass: 'swiper-button-disabled',
        },
        pagination: {
          el: paginationEl,
          clickable: true,
        },
        breakpoints: {
          768: {
            slidesPerView: 2,
            slidesPerGroup: 1,
            spaceBetween: 20,
          },
          1200: {
            slidesPerView: 2,
            slidesPerGroup: 1,
            spaceBetween: 24,
          },
        },
        on: {
          afterInit(sw) {
            requestAnimationFrame(() => {
              sw.update();
              sw.navigation?.update?.();
              sw.pagination?.update?.();
            });
          },
        },
      });

      refreshSwiperOnImages(servicesSwiper, { skipSlideChange: true });
    });
  }

  /* --- Services sticky nav (catalog + homepage categories) --- */
  const serviceCards = document.querySelectorAll('.services-layout .service-card[id]');
  const serviceGroups = document.querySelectorAll('.services-group[id]');
  const serviceTargets = serviceCards.length ? serviceCards : serviceGroups;
  const servicesNavLinks = document.querySelectorAll('.services-nav__link');

  function setActiveService(id) {
    servicesNavLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.target === id);
    });
    serviceCards.forEach((card) => {
      card.classList.toggle('is-active', card.id === id);
    });
  }

  if (serviceTargets.length && servicesNavLinks.length) {
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

    serviceTargets.forEach((target) => servicesObserver.observe(target));

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
      const status = contactForm.querySelector('#contactFormStatus');

      if (!name.value.trim() || !phone.value.trim()) {
        if (status) {
          status.textContent = 'Будь ласка, заповніть імʼя та телефон.';
        }
        (name.value.trim() ? phone : name).focus();
        return;
      }

      if (status) {
        status.textContent = '';
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

  /* --- Sticky Mobile CTA + utility dock --- */
  const stickyCta = document.getElementById('stickyCta');
  const contactSection = document.getElementById('contact');
  const footer = document.querySelector('.footer');

  function setupMobileDock() {
    if (document.getElementById('mobileDock')) return;

    const dock = document.createElement('div');
    dock.id = 'mobileDock';
    dock.className = 'mobile-dock';
    dock.setAttribute('aria-label', 'Додаткові дії');

    if (stickyCta?.parentNode) {
      stickyCta.parentNode.insertBefore(dock, stickyCta);
    } else {
      document.body.appendChild(dock);
    }

    [
      document.getElementById('militaryPromo'),
      document.querySelector('.blackout-fix'),
      document.getElementById('backToTop'),
    ].filter(Boolean).forEach((el) => dock.appendChild(el));

    const blackoutText = dock.querySelector('.blackout-fix__text');
    if (blackoutText && !blackoutText.dataset.fullText) {
      blackoutText.dataset.fullText = blackoutText.textContent.trim();
    }
  }

  function syncMobileDockLabels() {
    const blackoutText = document.querySelector('.blackout-fix__text');
    if (!blackoutText?.dataset.fullText) return;
    blackoutText.textContent = window.innerWidth <= 768
      ? 'Блекаут'
      : blackoutText.dataset.fullText;
  }

  function updateMobileBottomBar() {
    const mobileDock = document.getElementById('mobileDock');
    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
      document.body.classList.remove('sticky-cta--off');
      stickyCta?.classList.remove('sticky-cta--hidden');
      mobileDock?.classList.remove('mobile-dock--hidden');
      syncMobileDockLabels();
      return;
    }

    syncMobileDockLabels();

    const hideZone = contactSection || footer;
    if (!hideZone) return;

    const rect = hideZone.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const nearContact = rect.top < viewportH - 72;

    stickyCta?.classList.toggle('sticky-cta--hidden', nearContact);
    document.body.classList.toggle('sticky-cta--off', nearContact);
    mobileDock?.classList.toggle('mobile-dock--hidden', nearContact);
  }

  function bindMobileBottomBarScroll() {
    if (lenis) {
      lenis.on('scroll', updateMobileBottomBar);
    } else {
      window.addEventListener('scroll', updateMobileBottomBar, { passive: true });
    }
    window.addEventListener('resize', updateMobileBottomBar, { passive: true });
    updateMobileBottomBar();
  }

  /* --- Military discount promo + modal --- */
  const MILITARY_PROMO_HTML = `
    <button type="button" class="military-promo" id="militaryPromo" aria-haspopup="dialog" aria-controls="militaryModal" aria-expanded="false">
      <span class="military-promo__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </span>
      <span class="military-promo__text">Знижки ЗСУ</span>
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
          <p class="contact-form__privacy">Надсилаючи форму, ви погоджуєтесь з <a href="/dogovir-oferta/">політикою конфіденційності</a>.</p>
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

  /* --- Back to top --- */
  if (!document.getElementById('backToTop')) {
    const backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.id = 'backToTop';
    backToTop.setAttribute('aria-label', 'Повернутись нагору');
    backToTop.innerHTML = `
      <span class="back-to-top__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </span>
      <span class="back-to-top__text">Вгору</span>
    `;
    document.body.appendChild(backToTop);

    function scrollToTop() {
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (lenis) {
        lenis.scrollTo(0, { duration: instant ? 0 : 1.1 });
      } else {
        window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
      }
    }

    function updateBackToTop() {
      backToTop.classList.toggle('back-to-top--visible', getScrollY() > 400);
    }

    backToTop.addEventListener('click', scrollToTop);

    if (lenis) {
      lenis.on('scroll', updateBackToTop);
    } else {
      window.addEventListener('scroll', updateBackToTop, { passive: true });
    }

    updateBackToTop();
  }

  initBlackoutInfo(lenis);
  setupMobileDock();
  syncMobileDockLabels();
  bindMobileBottomBarScroll();
})();

function initBlackoutInfo(lenis) {
  let blackoutBtn = document.querySelector('.blackout-fix');
  if (!blackoutBtn) return;

  if (blackoutBtn.tagName !== 'BUTTON') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = blackoutBtn.className;
    button.innerHTML = blackoutBtn.innerHTML;
    button.setAttribute(
      'aria-label',
      'Працюємо під час блекауту — натисніть, щоб дізнатися більше'
    );
    blackoutBtn.replaceWith(button);
    blackoutBtn = button;
  }

  if (document.getElementById('blackoutModal')) {
    wireBlackoutModal(blackoutBtn, lenis);
    return;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="blackout-modal" id="blackoutModal" aria-hidden="true">
      <div class="blackout-modal__overlay" data-blackout-close tabindex="-1"></div>
      <div class="blackout-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="blackoutModalTitle">
        <button type="button" class="blackout-modal__close" data-blackout-close aria-label="Закрити">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <span class="blackout-modal__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" fill="currentColor"/>
          </svg>
        </span>
        <h2 class="blackout-modal__title" id="blackoutModalTitle">Працюємо під час блекаутів</h2>
        <p class="blackout-modal__text">У нашому офісі є резервне живлення, тому перевірки на поліграфі проводяться навіть під час відключень світла.</p>
        <p class="blackout-modal__text">Запис і консультації доступні за звичайним графіком: <strong>09:00–21:00, без вихідних</strong>.</p>
        <button type="button" class="btn btn--primary btn--full" data-blackout-close>Зрозуміло</button>
      </div>
    </div>
  `);

  wireBlackoutModal(blackoutBtn, lenis);
}

function wireBlackoutModal(blackoutBtn, lenis) {
  const modal = document.getElementById('blackoutModal');
  if (!modal || blackoutBtn.dataset.blackoutWired) return;

  blackoutBtn.dataset.blackoutWired = '1';
  let lastFocus = null;

  function setModalOpen(isOpen) {
    document.documentElement.classList.toggle('blackout-modal-open', isOpen);
    document.body.classList.toggle('blackout-modal-open', isOpen);
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add('blackout-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    setModalOpen(true);
    lenis?.stop?.();
    modal.querySelector('.blackout-modal__dialog .btn')?.focus();
  }

  function closeModal() {
    modal.classList.remove('blackout-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    setModalOpen(false);
    lenis?.start?.();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    } else {
      blackoutBtn.focus();
    }
  }

  blackoutBtn.addEventListener('click', openModal);

  modal.querySelectorAll('[data-blackout-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('blackout-modal--open')) {
      closeModal();
    }
  });
}
