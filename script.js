// Burnfeed — burnfeed.app

// Called by the App Store links' onclick; the link itself opens the App Store.
window.appDownloadRedirect = () => {
  console.log('App download page redirect');
};

// Black → red → orange → yellow → white; index 0 is drawn transparent
const FIRE_PALETTE = [
  [7, 7, 7], [31, 7, 7], [47, 15, 7], [71, 15, 7], [87, 23, 7], [103, 31, 7], [119, 31, 7], [143, 39, 7],
  [159, 47, 7], [175, 63, 7], [191, 71, 7], [199, 71, 7], [223, 79, 7], [223, 87, 7], [223, 87, 7], [215, 95, 7],
  [215, 95, 7], [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15], [207, 135, 23], [199, 135, 23],
  [199, 143, 23], [199, 151, 31], [191, 159, 31], [191, 159, 31], [191, 167, 39], [191, 167, 39], [191, 175, 47],
  [183, 175, 47], [183, 183, 47], [183, 183, 55], [207, 207, 111], [223, 223, 159], [239, 239, 199], [255, 255, 255],
];
const FIRE_MAX = FIRE_PALETTE.length - 1;

// Hero demo: the feed burns away with the same low-res "Doom fire" the extension
// plays, and a quote takes its place.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const feed = demo.querySelector('[data-feed]');
  const canvas = demo.querySelector('[data-fire]');
  const replay = demo.querySelector('[data-replay]');
  const address = demo.querySelector('[data-address]');
  const sites = ['x.com', 'youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'linkedin.com'];
  let site = 0;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !canvas.getContext) {
    demo.classList.add('is-burned');
    return;
  }

  // Runs the fire on `canvas` (already sized and positioned by the caller, in CSS px).
  // Behind a ragged burn line climbing from the bottom, each cell flashes ember,
  // chars, then turns to ash in `cover` ([r, g, b], usually the page background;
  // null leaves it transparent). Flames lick above the line and embers drift up.
  // `onFront(fraction burnt)` runs every frame. Resolves when it has burnt out,
  // with the canvas still showing the ash for the caller to fade away.
  const CHAR = [26, 14, 9];
  const GLOW = [255, 132, 28];
  const pixelFire = (canvas, { duration = 1100, cell = 7, cover = null, embers = true, onFront = null } = {}) =>
    new Promise((resolve) => {
      const cssW = canvas.clientWidth || parseFloat(canvas.style.width) || 1;
      const cssH = canvas.clientHeight || parseFloat(canvas.style.height) || 1;
      const cols = Math.max(4, Math.ceil(cssW / cell));
      const rows = Math.max(4, Math.ceil(cssH / cell));
      const cells = cols * rows;
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.imageRendering = 'pixelated';
      const ctx = canvas.getContext('2d');
      const image = ctx.createImageData(cols, rows);
      const data = image.data;
      const fire = new Uint8Array(cells);
      const burntAt = new Float64Array(cells).fill(-1);
      const sparks = [];
      const tail = 420; // ms for the last flames and embers after the sweep
      const charMs = 160;

      // A wavy, slightly noisy burn line instead of a straight wipe
      const p1 = Math.random() * 6.28;
      const p2 = Math.random() * 6.28;
      const jitter = Float32Array.from({ length: cols }, (_, x) =>
        Math.sin(x * 0.35 + p1) * 1.8 + Math.sin(x * 0.11 + p2) * 2.4 + Math.random() * 1.2,
      );

      // Flames reach about half the canvas whatever its size, and spread fast
      // enough to keep up with the climbing line
      const flameRows = Math.max(4, rows * 0.55);
      const coolMax = Math.min(8, Math.max(2, Math.round((2 * FIRE_MAX) / flameRows + 1)));
      const passes = Math.max(1, Math.ceil((((rows + 10) * 33) / duration) * 1.7));

      const spread = () => {
        for (let x = 0; x < cols; x++) {
          for (let y = 1; y < rows; y++) {
            const src = y * cols + x;
            const heat = fire[src];
            if (heat === 0) {
              fire[src - cols] = 0;
            } else {
              const wind = (Math.random() * 3) | 0;
              const dst = Math.min(cells - 1, Math.max(cols, src - wind + 1));
              fire[dst - cols] = Math.max(0, heat - ((Math.random() * coolMax) | 0));
            }
          }
        }
      };

      const put = (i, r, g, b, a = 255) => {
        const o = i * 4;
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = a;
      };

      const start = performance.now();
      let last = start;

      const frame = (now) => {
        const t = now - start;
        const progress = Math.min(1, t / duration);
        const base = rows - progress * (rows + 10);

        // Advance the burn line: cells at or below it are burning or burnt
        if (t <= duration + 40) {
          for (let x = 0; x < cols; x++) {
            const front = Math.round(base + jitter[x]);
            for (let y = Math.max(0, front); y < rows; y++) {
              const i = y * cols + x;
              if (burntAt[i] < 0) burntAt[i] = t;
              fire[i] = y === front ? FIRE_MAX - ((Math.random() * 4) | 0) : 0;
            }
            if (embers && front > 0 && front < rows && Math.random() < 0.06) {
              sparks.push({ x: x + Math.random(), y: front - 1, vx: (Math.random() - 0.5) * 0.35, vy: -(0.35 + Math.random() * 0.55), born: t, life: 380 + Math.random() * 520 });
            }
          }
        }
        // Fixed ~30 steps a second whatever the display's refresh rate
        for (; last + 33 <= now; last += 33) {
          for (let i = 0; i < passes; i++) spread();
          for (const s of sparks) {
            s.x += s.vx;
            s.y += s.vy;
          }
        }

        for (let i = 0; i < cells; i++) {
          const heat = fire[i];
          if (heat >= 5) {
            const [r, g, b] = FIRE_PALETTE[heat];
            put(i, r, g, b);
            continue;
          }
          const at = burntAt[i];
          if (at < 0) {
            const [r, g, b] = FIRE_PALETTE[heat];
            put(i, r, g, b, heat * 50); // untouched, or the faint tip of a flame
            continue;
          }
          const age = t - at;
          if (age < charMs) {
            // Glowing ember cooling to char
            const k = age / charMs;
            put(i, GLOW[0] + (CHAR[0] - GLOW[0]) * k, GLOW[1] + (CHAR[1] - GLOW[1]) * k, GLOW[2] + (CHAR[2] - GLOW[2]) * k);
          } else if (cover) {
            // Char crumbling to ash over the next moment
            const k = Math.min(1, (age - charMs) / 260);
            put(i, CHAR[0] + (cover[0] - CHAR[0]) * k, CHAR[1] + (cover[1] - CHAR[1]) * k, CHAR[2] + (cover[2] - CHAR[2]) * k);
          } else {
            put(i, CHAR[0], CHAR[1], CHAR[2], Math.max(0, 255 - ((age - charMs) / 260) * 255));
          }
        }
        for (let n = sparks.length - 1; n >= 0; n--) {
          const s = sparks[n];
          const k = (t - s.born) / s.life;
          const x = Math.floor(s.x);
          const y = Math.floor(s.y);
          if (k >= 1 || y < 0 || x < 0 || x >= cols) {
            sparks.splice(n, 1);
            continue;
          }
          if (y < rows) put(y * cols + x, 255, 220 - 170 * k, 90 - 80 * k);
        }
        ctx.putImageData(image, 0, 0);
        if (onFront) onFront(Math.min(1, Math.max(0, (rows - base) / rows)));

        if (t < duration + tail) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

  let busy = false;

  const reset = () => {
    demo.classList.remove('is-burned');
    feed.style.clipPath = '';
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const rgbOf = (el) => {
    for (let node = el; node; node = node.parentElement) {
      const m = getComputedStyle(node).backgroundColor.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/);
      if (m && (m[4] == null || Number(m[4]) > 0.5)) return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    return [255, 255, 255];
  };

  const burn = async () => {
    if (busy) return;
    busy = true;
    replay.hidden = true;
    // The posts char and crumble to ash in the column's own colour, then the ash
    // clears to show the quote
    await pixelFire(canvas, {
      duration: 2100,
      cell: 7,
      cover: rgbOf(canvas.parentElement),
      onFront: (burnt) => { feed.style.clipPath = `inset(0 0 ${(burnt * 100).toFixed(2)}% 0)`; },
    });
    demo.classList.add('is-burned');
    canvas.style.transition = 'opacity 0.45s ease-out';
    canvas.style.opacity = '0';
    setTimeout(() => {
      busy = false;
      replay.hidden = false;
    }, 480);
  };

  replay.addEventListener('click', () => {
    if (busy) return;
    site = (site + 1) % sites.length;
    address.textContent = sites[site];
    reset();
    setTimeout(burn, 900);
  });

  // Burn once the demo is properly in view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        setTimeout(burn, 1100);
      }
    }, { threshold: 0.55 });
    io.observe(demo);
  } else {
    setTimeout(burn, 1500);
  }
})();

// Hero background: an endless feed falls, column by column, into a fire that
// never goes out. The cards are DOM (CSS transforms, cheap to composite); the
// fire is the same Doom fire at a few hundred cells wide, scaled up pixelated.
// Both stop when the hero is off-screen or the tab is hidden.
(() => {
  const stage = document.querySelector('[data-stage]');
  if (!stage) return;
  const cardsEl = stage.querySelector('[data-cards]');
  const canvas = stage.querySelector('[data-stage-fire]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dark = window.matchMedia('(prefers-color-scheme: dark)');

  // Small seeded random, so the feed looks the same on every visit
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---- the feed
  const card = (rand) => {
    const kind = rand();
    const lines = kind < 0.3 ? 3 : kind < 0.7 ? 2 : 1;
    let html = '<div class="bg-card"><header><i></i><span></span></header>';
    for (let n = 0; n < lines; n++) html += n === lines - 1 && lines > 1 ? '<b class="s"></b>' : '<b></b>';
    if (kind >= 0.3) {
      const tint = rand();
      const cls = tint < 0.14 ? ' c1' : tint < 0.28 ? ' c2' : tint < 0.42 ? ' c3' : '';
      html += `<span class="m${cls}" style="height:${Math.round(64 + rand() * 72)}px"></span>`;
    }
    return `${html}<footer><i></i><i></i><i></i></footer></div>`;
  };

  let built = 0;
  const build = () => {
    const style = getComputedStyle(stage);
    const cardW = parseFloat(style.getPropertyValue('--card-w')) || 210;
    const gap = parseFloat(style.getPropertyValue('--gap')) || 20;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    let count = Math.ceil((width + gap) / (cardW + gap)) + 1;
    if (count % 2 === 0) count += 1; // odd, so one column sits on the centre line
    const key = count * 10000 + Math.round(height / 100);
    if (key === built) return;
    built = key;

    const rand = seeded(7);
    cardsEl.textContent = '';
    for (let c = 0; c < count; c++) {
      const col = document.createElement('div');
      col.className = 'bg-col';
      const track = document.createElement('div');
      track.className = 'bg-track';
      let set = '';
      // One set of cards taller than the stage, repeated once for a seamless loop
      for (let n = 0; n < 4; n++) set += card(rand);
      track.innerHTML = set;
      col.appendChild(track);
      cardsEl.appendChild(col);
      while (track.offsetHeight < height + 120) {
        const more = card(rand);
        set += more;
        track.insertAdjacentHTML('beforeend', more);
      }
      track.insertAdjacentHTML('beforeend', set);
      const speed = 26 + rand() * 16; // px a second
      const dur = track.offsetHeight / 2 / speed;
      track.style.setProperty('--dur', `${dur.toFixed(1)}s`);
      track.style.setProperty('--delay', `${(-rand() * dur).toFixed(1)}s`);
    }
  };

  // ---- the fire
  const ctx = canvas.getContext && canvas.getContext('2d');
  let cols = 0;
  let rows = 0;
  let fire = null;
  let image = null;
  let decay = 3;
  let sparks = [];

  const sizeFire = () => {
    const cell = window.innerWidth < 480 ? 5 : 6;
    const w = Math.max(8, Math.ceil(canvas.clientWidth / cell));
    const h = Math.max(8, Math.ceil(canvas.clientHeight / cell));
    if (w === cols && h === rows) return false;
    const old = fire;
    const oldCols = cols;
    const oldRows = rows;
    cols = w;
    rows = h;
    canvas.width = cols;
    canvas.height = rows;
    fire = new Uint8Array(cols * rows);
    if (old) {
      // Keep the flames already burning across a resize
      for (let y = 0; y < Math.min(rows, oldRows); y++) {
        for (let x = 0; x < Math.min(cols, oldCols); x++) fire[(rows - 1 - y) * cols + x] = old[(oldRows - 1 - y) * oldCols + x];
      }
    }
    image = ctx.createImageData(cols, rows);
    // Tallest flames reach about four fifths of the canvas
    decay = Math.min(6, Math.max(2.2, (2 * FIRE_MAX) / (rows * 0.8) + 1));
    sparks = [];
    return true;
  };

  let clock = 0;
  const step = () => {
    clock += 1;
    const cells = cols * rows;
    // A source row that never goes out, breathing slowly along its length
    const base = (rows - 1) * cols;
    for (let x = 0; x < cols; x++) {
      const swell = 0.5 + 0.25 * Math.sin(x * 0.07 + clock * 0.021) + 0.25 * Math.sin(x * 0.19 - clock * 0.033);
      fire[base + x] = Math.max(0, Math.min(FIRE_MAX, Math.round(FIRE_MAX * (0.62 + 0.38 * swell)) - ((Math.random() * 3) | 0)));
    }
    for (let x = 0; x < cols; x++) {
      for (let y = 1; y < rows; y++) {
        const src = y * cols + x;
        const heat = fire[src];
        if (heat === 0) {
          fire[src - cols] = 0;
        } else {
          const wind = (Math.random() * 3) | 0;
          const dst = Math.min(cells - 1, Math.max(cols, src - wind + 1));
          fire[dst - cols] = Math.max(0, heat - ((Math.random() * decay) | 0));
        }
      }
    }
    if (Math.random() < cols / 90) {
      sparks.push({ x: Math.random() * cols, y: rows * (0.45 + Math.random() * 0.3), vx: (Math.random() - 0.5) * 0.3, vy: -(0.25 + Math.random() * 0.45), age: 0, life: 25 + Math.random() * 35 });
    }
    for (let n = sparks.length - 1; n >= 0; n--) {
      const s = sparks[n];
      s.x += s.vx;
      s.y += s.vy;
      s.age += 1;
      if (s.age >= s.life || s.y < 0 || s.x < 0 || s.x >= cols) sparks.splice(n, 1);
    }
  };

  // Light pages squeeze the whole palette into red (tips) to orange (base)
  const LIGHT_INDEX = Uint8Array.from({ length: FIRE_MAX + 1 }, (_, h) => (h ? Math.round(6 + (h * 13) / FIRE_MAX) : 0));
  const draw = () => {
    const data = image.data;
    const light = !dark.matches;
    for (let i = 0, o = 0; i < fire.length; i++, o += 4) {
      const heat = fire[i];
      // On a light page the near-black tips read as soot and the pale yellows as olive,
      // so light pages use the red-to-orange middle of the palette
      const [r, g, b] = FIRE_PALETTE[light ? LIGHT_INDEX[heat] : heat];
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      // Cool tips fade out instead of turning to black smoke on a light page
      data[o + 3] = light ? (heat < 4 ? 0 : Math.min(255, (heat - 3) * 34)) : Math.min(255, heat * 30);
    }
    for (const s of sparks) {
      const o = ((s.y | 0) * cols + (s.x | 0)) * 4;
      const k = s.age / s.life;
      data[o] = 255;
      data[o + 1] = 210 - 140 * k;
      data[o + 2] = 80 - 70 * k;
      data[o + 3] = 255 * (1 - k * 0.6);
    }
    ctx.putImageData(image, 0, 0);
  };

  build();
  if (!ctx) return;
  sizeFire();

  if (reduceMotion) {
    // A still frame of the fire, nothing moving
    for (let n = 0; n < rows * 3; n++) step();
    sparks = [];
    draw();
    stage.classList.add('is-paused');
    dark.addEventListener('change', draw);
    return;
  }

  // ~30 frames a second, only while the hero is on screen and the tab is visible
  let onScreen = true;
  let raf = 0;
  let last = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 32) return;
    last = now;
    step();
    draw();
  };
  const update = () => {
    const run = onScreen && !document.hidden;
    stage.classList.toggle('is-paused', !run);
    if (run && !raf) raf = requestAnimationFrame(loop);
    if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      update();
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', update);
  update();

  let pending = 0;
  const onResize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      build();
      if (sizeFire()) draw();
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);
  else window.addEventListener('resize', onResize);
})();

// The calculator: what the feed's minutes add up to.
(() => {
  const calc = document.querySelector('[data-calc]');
  if (!calc) return;
  const AVERAGE = 141; // DataReportal, Digital 2025 (GWI): 2 h 21 min a day
  const UNTIL = 80; // counted to age 80
  const WAKING = 16 * 60; // waking minutes in a day
  const NOVEL_HOURS = 90000 / 260 / 60; // 90,000 words at 260 wpm (Brysbaert, 2019)
  const SPANISH_HOURS = 750; // FSI: 600–750 class hours for Spanish; counted at the high end
  const WORK_WEEK = 40;

  const minutes = calc.querySelector('[data-in="minutes"]');
  const age = calc.querySelector('[data-in="age"]');
  const outMinutes = calc.querySelector('[data-out="minutes"]');
  const outAge = calc.querySelector('[data-out="age"]');
  const reset = calc.querySelector('[data-reset]');
  const nums = {};
  for (const el of document.querySelectorAll('[data-num]')) (nums[el.dataset.num] ||= []).push(el);

  const digits = { hours: 0, days: 1, years: 1, waking: 1, share: 0, novels: 0, spanish: 1, weeks: 1 };
  const formats = Object.fromEntries(
    Object.entries(digits).map(([k, d]) => [k, new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })]),
  );

  const figures = () => {
    const m = Number(minutes.value);
    const left = Math.max(0, UNTIL - Number(age.value));
    const hours = (m * 365) / 60;
    return {
      hours,
      days: hours / 24,
      years: (left * m) / 1440,
      waking: (left * m) / WAKING,
      share: (m / WAKING) * 100,
      novels: hours / NOVEL_HOURS,
      spanish: hours / SPANISH_HOURS,
      weeks: hours / WORK_WEEK,
    };
  };

  const shown = figures();
  let target = shown;
  const paint = () => {
    for (const k in nums) {
      const text = formats[k].format(shown[k]);
      for (const el of nums[k]) if (el.textContent !== text) el.textContent = text;
    }
  };

  // Numbers ease towards their new values instead of jumping
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let prev = 0;
  const tween = (now) => {
    const dt = prev ? Math.min(250, now - prev) : 16;
    prev = now;
    const k = 1 - Math.exp(-dt / 110);
    let moving = false;
    for (const key in target) {
      const diff = target[key] - shown[key];
      if (Math.abs(diff) > Math.abs(target[key]) * 0.0005 + 0.001) {
        shown[key] += diff * k;
        moving = true;
      } else {
        shown[key] = target[key];
      }
    }
    paint();
    raf = moving ? requestAnimationFrame(tween) : 0;
    if (!moving) prev = 0;
  };

  const fill = (input) => {
    const f = (input.value - input.min) / (input.max - input.min);
    input.style.setProperty('--p', `calc(${f.toFixed(4)} * (100% - 24px) + 12px)`);
  };

  const update = () => {
    const m = Number(minutes.value);
    const h = Math.floor(m / 60);
    outMinutes.textContent = m >= 60 ? `${h} h ${m % 60} min` : `${m} min`;
    outAge.textContent = age.value;
    reset.hidden = m === AVERAGE;
    fill(minutes);
    fill(age);
    target = figures();
    // Screen readers hear the result with the slider instead of every tweened frame
    const sum = `${formats.hours.format(target.hours)} hours a year, ${formats.years.format(target.years)} years of the rest of your life`;
    minutes.setAttribute('aria-valuetext', `${m} minutes a day: ${sum}`);
    age.setAttribute('aria-valuetext', `${age.value} years old: ${sum}`);
    if (reduceMotion) {
      Object.assign(shown, target);
      paint();
    } else if (!raf) {
      raf = requestAnimationFrame(tween);
    }
  };

  minutes.addEventListener('input', update);
  age.addEventListener('input', update);
  reset.addEventListener('click', () => {
    minutes.value = AVERAGE;
    update();
    minutes.focus();
  });
  update();
  paint();
})();

// Playground: the popover's switch, pause buttons and timers work, for fun.
// Pauses run at 60x so you can watch them burn again.
(() => {
  const SPEED = 60;
  const pop = document.querySelector('.popover');
  if (!pop) return;
  pop.removeAttribute('aria-hidden');

  // Switch rows
  for (const row of pop.querySelectorAll('.row')) {
    const sw = row.querySelector('.sw');
    if (!sw) continue;
    row.dataset.toggle = '';
    row.setAttribute('role', 'switch');
    row.tabIndex = 0;
    const sync = () => row.setAttribute('aria-checked', String(sw.classList.contains('on')));
    const flip = () => {
      sw.classList.toggle('on');
      sync();
      row.dispatchEvent(new CustomEvent('flip', { bubbles: true }));
    };
    sync();
    row.addEventListener('click', flip);
    row.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flip();
      }
    });
  }

  // The pauses
  const status = pop.querySelector('.pop-head span');
  const siteSw = pop.querySelector('.row .sw');
  const button = pop.querySelector('.pop-btn');
  const segs = [...pop.querySelectorAll('.seg span')];
  const foot = pop.querySelector('.pop-foot');
  let siteUntil = 0;
  let allUntil = 0;
  const clock = (realMs) => {
    const s = Math.max(0, Math.ceil((realMs * SPEED) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  button.setAttribute('role', 'button');
  button.tabIndex = 0;
  for (const seg of segs) {
    seg.setAttribute('role', 'button');
    seg.tabIndex = 0;
    seg.classList.remove('on');
  }

  const render = () => {
    const now = Date.now();
    if (siteUntil && siteUntil <= now) siteUntil = 0;
    if (allUntil && allUntil <= now) allUntil = 0;
    const on = siteSw.classList.contains('on');
    const paused = on && (siteUntil || allUntil);
    const until = Math.max(siteUntil, allUntil);

    status.textContent = !on ? 'Off' : paused ? `Back · ${clock(until - now)}` : 'Burning';
    status.classList.toggle('paused', Boolean(paused));
    status.classList.toggle('off', !on);
    button.textContent = !on ? 'x.com feed is showing' : paused ? 'Burn Now' : 'Show feed for 5 min';
    button.classList.toggle('primary', Boolean(paused));
    button.classList.toggle('disabled', !on);
    for (const seg of segs) seg.classList.toggle('on', Boolean(allUntil) && seg.dataset.minutes === String(seg.dataset.picked));
    foot.textContent = allUntil ? `Everything burns again in ${clock(allUntil - now)}.` : 'Burns again automatically.';
  };

  const press = () => {
    if (!siteSw.classList.contains('on')) return;
    if (siteUntil || allUntil) {
      siteUntil = 0;
      allUntil = 0;
    } else {
      siteUntil = Date.now() + (5 * 60 * 1000) / SPEED;
    }
    render();
  };
  button.addEventListener('click', press);
  button.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), press()));

  segs.forEach((seg, i) => {
    const minutes = i === 0 ? 15 : 60;
    seg.dataset.minutes = String(minutes);
    const pick = () => {
      allUntil = Date.now() + (minutes * 60 * 1000) / SPEED;
      segs.forEach((s) => (s.dataset.picked = String(minutes)));
      render();
    };
    seg.addEventListener('click', pick);
    seg.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick()));
  });

  pop.addEventListener('flip', render);
  setInterval(() => (siteUntil || allUntil) && render(), 250);
  render();
})();
