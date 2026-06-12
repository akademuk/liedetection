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
  let lastScrollY = 0;

  function getHeaderOffset() {
    return header ? -header.offsetHeight : -112;
  }

  function handleSmartHeader() {
    if (!header) return;

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const delta = scrollY - lastScrollY;
    const navOpen = nav?.classList.contains('nav--open');

    if (scrollY <= 10) {
      header.classList.remove('site-header--scrolled', 'site-header--compact', 'site-header--hidden');
      lastScrollY = scrollY;
      return;
    }

    header.classList.add('site-header--scrolled');
    header.classList.toggle('site-header--compact', scrollY > 48);

    if (navOpen) {
      header.classList.remove('site-header--hidden');
    } else if (delta > 6 && scrollY > 140) {
      header.classList.add('site-header--hidden');
    } else if (delta < -6) {
      header.classList.remove('site-header--hidden');
    }

    lastScrollY = scrollY;
  }

  if (lenis) {
    lenis.on('scroll', handleSmartHeader);
  } else {
    window.addEventListener('scroll', handleSmartHeader, { passive: true });
  }

  handleSmartHeader();

  /* --- Mobile Navigation --- */
  const burger = document.getElementById('burger');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav--open');
      burger.classList.toggle('burger--active', isOpen);
      burger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) header?.classList.remove('site-header--hidden');
    });

    nav.querySelectorAll('.nav__link, .nav__dropdown-link').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav--open');
        burger.classList.remove('burger--active');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        closeAllDropdowns();
      });
    });
  }

  /* --- Nav Dropdown --- */
  const dropdowns = document.querySelectorAll('.nav__dropdown');

  function closeAllDropdowns(except) {
    dropdowns.forEach((dd) => {
      if (dd !== except && !except?.contains(dd)) {
        dd.classList.remove('nav__dropdown--open');
        const toggle = dd.querySelector(':scope > .nav__dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(':scope > .nav__dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('nav__dropdown--open');
      toggle.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        closeAllDropdowns(dropdown);
      }
    });
  });

  document.addEventListener('click', () => closeAllDropdowns());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
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

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: i % 4 * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
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

    /* Data bars animation */
    const dataPanel = document.querySelector('.data-panel');
    if (dataPanel) {
      const dataBars = dataPanel.querySelectorAll('.data-bar');
      dataBars.forEach((bar) => {
        const targetH = getComputedStyle(bar).getPropertyValue('--h').trim();
        bar.style.setProperty('--h', '0%');
        ScrollTrigger.create({
          trigger: dataPanel,
          start: 'top 80%',
          onEnter: () => {
            gsap.to(bar, {
              '--h': targetH,
              duration: 1.2,
              ease: 'power2.out',
            });
          },
          once: true,
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

  /* --- FAQ Accordion (single open) --- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      }
    });
  });

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

  /* --- Fancybox (ready for future gallery) --- */
  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind('[data-fancybox]', {});
  }
})();
