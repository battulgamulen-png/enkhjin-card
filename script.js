const welcome = document.querySelector('#welcome');
const zodiac = document.querySelector('#zodiac');
const farewell = document.querySelector('#farewell');
const weather = document.querySelector('#weather');
const reply = document.querySelector('#reply');
const secretStar = document.querySelector('#secretStar');
const secretNote = document.querySelector('#secretNote');
const musicPlayer = document.querySelector('#musicPlayer');
const youtubePlayer = document.querySelector('#youtubePlayer');
const songStatus = document.querySelector('#songStatus');
const progressBar = document.querySelector('#progressBar');
const card = document.querySelector('#card');
const welcomeTitle = document.querySelector('#welcomeTitle');
const photoFrame = document.querySelector('#photoFrame');
const finalNote = document.querySelector('#finalNote');
const mascot = document.querySelector('#mascot');
const mascotBubble = document.querySelector('#mascotBubble');

// Плейлист: YouTube ID, нэр, эхлэх секунд
const PLAYLIST = [
  { id: 'qjW5YMM8RBA', title: 'Bilguun (The Pips) — Гүн цэнхэр нүд', start: 0 },
  { id: 'pWu6-LhGyeI', title: 'Choi Joo — Огт оргүй', start: 0 },
  { id: 'glscfhJyZHo', title: 'Daniel Caesar — Who Knows', start: 0 },
  { id: 'MDgPnYneeJA', title: 'A-Sound — Unexpected Answer', start: 0 },
  { id: 'mMfLzzHmN7g', title: 'The Pips — Thousand One Flowers', start: 0 },
];
let songIndex = 0;
const SONG_START_SECONDS = PLAYLIST[0].start;
let player = null;
let isSongPlaying = false;
let hasStarted = false;
let playerReady = false;
let pendingPlay = false;
let progressTimer = null;

// Өнөөдрийн зурхайг horoscope.json-оос (GitHub Actions өдөр бүр шинэчилдэг) ачаална
const horoscopeTitle = document.querySelector('#horoscopeTitle');
const horoscopeText = document.querySelector('#horoscopeText');
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
// Сарны үе шат: 2000-01-06 18:14 UTC шинэ сарнаас тооцно
const renderMoon = () => {
  const synodic = 29.530588853;
  const days = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const phase = ((days % synodic) + synodic) % synodic / synodic; // 0 шинэ, .5 бүтэн
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  const names = ['шинэ сар', 'өсөж буй хавирган сар', 'эхний улирал', 'өсөж буй дүүрэн сар', 'бүтэн сар', 'хорогдож буй дүүрэн сар', 'сүүлийн улирал', 'хорогдож буй хавирган сар'];
  const name = names[Math.round(phase * 8) % 8];
  // Сүүдрийн дискийг зөөж гэрэлтэй хэсгийг харуулна (баруун талаас өсөж, зүүн талаас хорогдоно)
  const shift = phase <= 0.5 ? -(phase * 2) * 26 : (1 - (phase - 0.5) * 2) * 26;
  document.querySelector('#moonPhase').innerHTML = `<span class="moon-disc" style="--shadow:${shift.toFixed(1)}px"></span><span>Сар: <strong>${name}</strong> · ${illumination}%</span>`;
};
renderMoon();

// Текстийг өгүүлбэр бүрээр зөөлөн гаргана
const revealLines = (element, text) => {
  element.textContent = '';
  text.match(/[^.!?]+[.!?]*\s*/g).forEach((sentence, i) => {
    const span = document.createElement('span');
    span.className = 'line';
    span.style.setProperty('--i', i);
    span.textContent = sentence;
    element.appendChild(span);
  });
};
let storyData = null;
const loadHoroscope = async () => {
  try {
    const response = await fetch(`horoscope.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { days } = await response.json();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date());
    const entry = days.find((d) => d.date === today) || days.filter((d) => d.date <= today).pop();
    if (!entry) return;
    const [year, month, day] = entry.date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    horoscopeTitle.textContent = `Өнөөдрийн хувьд · ${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}, ${weekday} гараг`;
    storyData = { title: horoscopeTitle.textContent, text: entry.text, ratings: entry.ratings, lucky: entry.lucky };
    revealLines(horoscopeText, entry.text);
    if (entry.advice) revealLines(document.querySelector('#starText'), entry.advice);
    if (entry.ratings) {
      const stars = (n) => '★'.repeat(n) + `<span class="off">${'★'.repeat(5 - n)}</span>`;
      document.querySelector('#ratingOverall').innerHTML = stars(entry.ratings.overall);
      document.querySelector('#ratingMood').innerHTML = stars(entry.ratings.mood);
      document.querySelector('#ratingSuccess').innerHTML = stars(entry.ratings.success);
      document.querySelector('#starRatings').classList.remove('hidden');
    }
    if (entry.lucky) {
      document.querySelector('#luckyNumber').textContent = entry.lucky.number;
      document.querySelector('#luckyColor').textContent = entry.lucky.color;
      document.querySelector('#luckyDot').style.setProperty('--lucky', entry.lucky.hex);
      document.querySelector('#lucky').classList.remove('hidden');
    }
  } catch {
    // Ачаалагдахгүй бол HTML доторх текст хэвээр үлдэнэ
  }
};
loadHoroscope();

// Улаанбаатар хотын цаг агаар (Open-Meteo, түлхүүр шаардахгүй)
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=47.9184&longitude=106.9177'
  + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
  + '&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset'
  + '&timezone=Asia%2FUlaanbaatar&forecast_days=4';
const WEATHER_CODES = [
  [[0], 'Цэлмэг', '☀︎', 'sun'],
  [[1], 'Ихэвчлэн цэлмэг', '☀︎', 'sun'],
  [[2], 'Үүлэрхэг', '⛅︎', 'clouds'],
  [[3], 'Бүрхэг', '☁︎', 'clouds'],
  [[45, 48], 'Манантай', '≋', 'fog'],
  [[51, 53, 55, 56, 57], 'Шиврээ бороо', '☂︎', 'rain'],
  [[61, 63, 65, 66, 67], 'Бороотой', '☂︎', 'rain'],
  [[71, 73, 75, 77], 'Цастай', '❄︎', 'snow'],
  [[80, 81, 82], 'Аадар бороо', '☂︎', 'rain'],
  [[85, 86], 'Цасан шуурга', '❄︎', 'snow'],
  [[95, 96, 99], 'Аянга цахилгаантай', '⚡︎', 'rain'],
];
const describeWeather = (code) => {
  const found = WEATHER_CODES.find(([codes]) => codes.includes(code));
  return found ? { text: found[1], icon: found[2], sky: found[3] } : { text: 'Тодорхойгүй', icon: '☁︎', sky: 'clouds' };
};
// Хувцасны зөвлөгөө: температур, нөхцөлөөс хамаарна
const outfitFor = (code, temp, wind) => {
  const items = [];
  if (temp <= 0) items.push('Дулаан куртка', 'Ороолт', 'Малгай, бээлий');
  else if (temp <= 10) items.push('Куртка', 'Зузаан цамц', 'Ороолт');
  else if (temp <= 17) items.push('Хүрэм', 'Урт ханцуйтай цамц');
  else if (temp <= 24) items.push('Хөнгөн хүрэм', 'Футболк');
  else items.push('Хөнгөн хувцас', 'Нарны шил');
  if (code >= 51 && code <= 67 || code >= 80) items.push('Шүхэр ☂');
  if (code >= 71 && code <= 86) items.push('Гулгахгүй гутал');
  if (wind >= 30) items.push('Салхинаас хамгаалах хүрэм');
  return items.slice(0, 4);
};

// Нөхцөлөөс хамаарсан амьд дэвсгэр
const weatherSky = document.querySelector('#weatherSky');
const makeParticles = (className, count, make) => {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = className;
    make(el, i);
    weatherSky.appendChild(el);
  }
};
const paintSky = (sky, isDay) => {
  weatherSky.textContent = '';
  weather.classList.toggle('is-night', !isDay);
  if (!isDay) {
    const moon = document.createElement('div');
    moon.className = 'moon';
    weatherSky.appendChild(moon);
    makeParticles('night-star', 14, (el) => {
      el.textContent = Math.random() > 0.5 ? '✦' : '✧';
      el.style.setProperty('--x', `${random(2, 96)}%`);
      el.style.setProperty('--y', `${random(2, 60)}%`);
      el.style.setProperty('--s', `${random(9, 18)}px`);
      el.style.setProperty('--delay', `${random(0, 2.5)}s`);
    });
  } else if (sky === 'sun') {
    const sun = document.createElement('div');
    sun.className = 'sun';
    const rays = document.createElement('div');
    rays.className = 'rays';
    weatherSky.append(sun, rays);
  }
  if (sky === 'clouds' || sky === 'rain' || sky === 'snow') {
    makeParticles('cloud', sky === 'clouds' ? 3 : 2, (el, i) => {
      el.style.setProperty('--y', `${[3, 14, 26][i]}%`);
      el.style.setProperty('--d', `${[52, 70, 62][i]}s`);
      el.style.setProperty('--delay', `${[-10, -35, -50][i]}s`);
      el.style.transform = `scale(${[1, .7, .85][i]})`;
    });
  }
  if (sky === 'rain') {
    makeParticles('drop', 36, (el) => {
      el.style.setProperty('--x', `${random(0, 100)}%`);
      el.style.setProperty('--d', `${random(0.9, 1.6)}s`);
      el.style.setProperty('--delay', `${random(-2, 0)}s`);
    });
  }
  if (sky === 'snow') {
    makeParticles('flake', 26, (el) => {
      el.textContent = '❄';
      el.style.setProperty('--x', `${random(0, 100)}%`);
      el.style.setProperty('--s', `${random(8, 16)}px`);
      el.style.setProperty('--d', `${random(6, 11)}s`);
      el.style.setProperty('--delay', `${random(-10, 0)}s`);
    });
  }
  if (sky === 'fog') {
    makeParticles('fog', 4, (el, i) => {
      el.style.setProperty('--y', `${12 + i * 22}%`);
      el.style.setProperty('--d', `${6 + i * 2}s`);
    });
  }
};

// Температур 0-оос тоолж гарч ирнэ
const weatherTemp = document.querySelector('#weatherTemp');
let targetTemp = null;
let tempShown = false;
const renderTemp = (value) => {
  weatherTemp.innerHTML = `${Math.round(value)}<span class="deg">°</span>`;
};
const animateTemp = () => {
  if (targetTemp === null) return;
  const start = performance.now();
  const duration = 1100;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    renderTemp(targetTemp * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const showWeatherPage = () => {
  tempShown = true;
  animateTemp();
};

const loadWeather = async () => {
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) throw new Error(res.status);
    const { current, hourly, daily } = await res.json();
    const now = describeWeather(current.weather_code);
    document.querySelector('#weatherIcon').textContent = current.is_day ? now.icon : '☾';
    targetTemp = current.temperature_2m;
    if (tempShown) animateTemp(); else renderTemp(targetTemp);
    document.querySelector('#weatherDesc').textContent = now.text;
    document.querySelector('#weatherFeels').textContent = `Мэдрэгдэх: ${Math.round(current.apparent_temperature)}°`;
    document.querySelector('#weatherTime').textContent = `${current.time.slice(11, 16)}, Улаанбаатарын цагаар`;
    document.querySelector('#weatherMeta').innerHTML = [
      `Дээд <strong>${Math.round(daily.temperature_2m_max[0])}°</strong> · доод <strong>${Math.round(daily.temperature_2m_min[0])}°</strong>`,
      `Салхи <strong>${Math.round(current.wind_speed_10m)} км/ц</strong>`,
      `Чийгшил <strong>${current.relative_humidity_2m}%</strong>`,
      `Нар <strong>${daily.sunrise[0].slice(11, 16)} – ${daily.sunset[0].slice(11, 16)}</strong>`,
    ].map((item) => `<span>${item}</span>`).join('');
    paintSky(now.sky, current.is_day === 1);
    mascot.classList.toggle('rainy', now.sky === 'rain');
    lastWeatherSky = now.sky;

    const outfit = outfitFor(current.weather_code, current.temperature_2m, current.wind_speed_10m);
    document.querySelector('#weatherOutfit').textContent = `Өнөөдөр: ${outfit.join(', ').toLowerCase()}`;

    // Ойрын 8 цаг
    const hours = document.querySelector('#weatherHours');
    hours.textContent = '';
    const startIndex = Math.max(0, hourly.time.findIndex((t) => t >= current.time.slice(0, 13)));
    hourly.time.slice(startIndex, startIndex + 8).forEach((time, i) => {
      const info = describeWeather(hourly.weather_code[startIndex + i]);
      const cell = document.createElement('div');
      cell.innerHTML = `<span class="hour-time">${i === 0 ? 'Одоо' : time.slice(11, 16)}</span>`
        + `<span class="hour-icon">${info.icon}</span><strong>${Math.round(hourly.temperature_2m[startIndex + i])}°</strong>`;
      hours.appendChild(cell);
    });

    const days = document.querySelector('#weatherDays');
    days.textContent = '';
    daily.time.slice(1).forEach((date, i) => {
      const [y, m, d] = date.split('-').map(Number);
      const info = describeWeather(daily.weather_code[i + 1]);
      const card = document.createElement('div');
      card.innerHTML = `<span class="day-name">${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}</span>`
        + `<span class="day-icon">${info.icon}</span>${Math.round(daily.temperature_2m_max[i + 1])}° / ${Math.round(daily.temperature_2m_min[i + 1])}°`;
      days.appendChild(card);
    });

  } catch {
    document.querySelector('#weatherDesc').textContent = 'Цаг агаар татаж чадсангүй';
    document.querySelector('#weatherTime').textContent = 'дахин оролдоорой';
  }
};
loadWeather();

// Шөнийн горим: 18:00–06:00 (хөтчийн цагаар) автоматаар
const nightSky = document.querySelector('#nightSky');
for (let i = 0; i < 26; i++) {
  const star = document.createElement('span');
  star.className = 'nstar';
  star.textContent = Math.random() > 0.6 ? '✦' : '·';
  star.style.setProperty('--x', `${1 + Math.random() * 98}%`);
  star.style.setProperty('--y', `${1 + Math.random() * 94}%`);
  star.style.setProperty('--s', `${8 + Math.random() * 10}px`);
  star.style.setProperty('--delay', `${Math.random() * 3}s`);
  nightSky.appendChild(star);
}
let nightState = null;
let nightSwitchTimer = null;
const applyNightMode = () => {
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;
  if (isNight === nightState) return;
  if (nightState !== null) {
    // Өдөр ↔ шөнө шилжилтийг 2.5 секундэд зөөлөн хийнэ
    document.body.classList.add('night-switching');
    clearTimeout(nightSwitchTimer);
    nightSwitchTimer = setTimeout(() => document.body.classList.remove('night-switching'), 3000);
  }
  nightState = isNight;
  document.body.classList.toggle('night', isNight);
  mascot.classList.toggle('sleeping', isNight);
};
applyNightMode();
setInterval(applyNightMode, 60000);

// Instagram story зураг: өнөөдрийн зурхайг 1080x1920 зураг болгоно
const shareButton = document.querySelector('#shareButton');
const wrapText = (ctx, text, maxWidth) => {
  const lines = [];
  let line = '';
  text.split(' ').forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  });
  if (line) lines.push(line);
  return lines;
};
const buildStoryImage = async () => {
  try { await Promise.all([document.fonts.load('700 96px Caveat'), document.fonts.load('600 34px Manrope'), document.fonts.load('700 28px Manrope')]); } catch { /* фонт ачаалагдаагүй ч зурна */ }
  const data = storyData || { title: horoscopeTitle.textContent, text: horoscopeText.textContent, ratings: null, lucky: null };
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1538'); sky.addColorStop(1, '#3a2a55');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(244, 217, 166, ${0.3 + Math.random() * 0.7})`;
    ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Агуулгыг эхлээд хэмжээд картын өндрийг тооцно
  const cx = 80, cw = W - 160, r = 48;
  ctx.font = '600 34px Manrope';
  const bodyLines = wrapText(ctx, data.text, cw - 200);
  let contentHeight = 490 + bodyLines.length * 52;
  if (data.ratings) contentHeight += 150;
  if (data.lucky) contentHeight += 70;
  contentHeight += 80;
  const ch = Math.min(H - 360, contentHeight);
  const cy = Math.max(160, Math.round((H - ch) / 2) - 40);
  ctx.fillStyle = 'rgba(255, 253, 251, 0.97)';
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, r); ctx.fill();
  ctx.strokeStyle = 'rgba(239, 173, 192, 0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx + 18, cy + 18, cw - 36, ch - 36, r - 14); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e9aa78'; ctx.font = '700 64px Caveat'; ctx.fillText('✦', W / 2, cy + 110);
  ctx.fillStyle = '#9b7bd8'; ctx.font = '700 96px Caveat'; ctx.fillText('Энхжингийн', W / 2, cy + 230);
  ctx.fillStyle = '#593f4a'; ctx.fillText('өнөөдрийн зурхай', W / 2, cy + 330);
  ctx.fillStyle = '#bd788c'; ctx.font = '700 28px Manrope'; ctx.fillText(data.title.replace('Өнөөдрийн хувьд · ', '').toUpperCase() + '  ·  ХУМХ', W / 2, cy + 400);
  ctx.fillStyle = '#593f4a'; ctx.font = '600 34px Manrope';
  let y = cy + 490;
  bodyLines.forEach((line) => { ctx.fillText(line, W / 2, y); y += 52; });
  if (data.ratings) {
    y += 40;
    const rows = [['Ерөнхий', data.ratings.overall], ['Сэтгэл санаа', data.ratings.mood], ['Амжилт', data.ratings.success]];
    rows.forEach(([label, value], i) => {
      const x = cx + 150 + i * ((cw - 300) / 2);
      ctx.fillStyle = '#bd788c'; ctx.font = '700 24px Manrope'; ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = '#e9aa78'; ctx.font = '700 40px Manrope'; ctx.fillText('★'.repeat(value) , x, y + 52);
    });
    y += 110;
  }
  if (data.lucky) {
    y += 40;
    const luckyText = `Азын тоо: ${data.lucky.number}   ·   Азын өнгө: ${data.lucky.color}`;
    ctx.fillStyle = '#765c66'; ctx.font = '600 30px Manrope';
    ctx.fillText(luckyText, W / 2 - 16, y);
    ctx.fillStyle = data.lucky.hex; ctx.beginPath(); ctx.arc(W / 2 - 16 + ctx.measureText(luckyText).width / 2 + 28, y - 10, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};
shareButton.addEventListener('click', async () => {
  shareButton.disabled = true;
  const original = shareButton.textContent;
  shareButton.textContent = 'Зураг бэлдэж байна…';
  try {
    const blob = await buildStoryImage();
    const file = new File([blob], 'enkhjin-zurhai.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Энхжингийн өнөөдрийн зурхай' });
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'enkhjin-zurhai.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    }
  } catch { /* хэрэглэгч цуцалсан эсвэл дэмжихгүй */ }
  shareButton.textContent = original;
  shareButton.disabled = false;
});

// Гарчгийг үсэг үсгээр гаргах (typewriter)
const typewrite = (element) => {
  let index = 0;
  const wrap = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      // Үг бүрийг нэг блок болгож, мөр зөвхөн үгийн завсраар таслагдана
      for (const part of node.textContent.split(/(\s+)/)) {
        if (part.trim() === '') {
          if (part) fragment.appendChild(document.createTextNode(part));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        for (const char of part) {
          const span = document.createElement('span');
          span.className = 'char';
          span.style.setProperty('--i', index++);
          span.textContent = char;
          word.appendChild(span);
        }
        fragment.appendChild(word);
      }
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      [...node.childNodes].forEach(wrap);
    }
  };
  [...element.childNodes].forEach(wrap);
};
let titleTyped = false;

// Түгжээгүй: нээгдэнгүүт гарчгийг бичиж, муурыг гаргаж, орсныг мэдэгдэнэ
window.addEventListener('load', () => {
  notifyVisit();
  if (!titleTyped) {
    titleTyped = true;
    typewrite(welcomeTitle);
  }
  setTimeout(showMascot, 600);
});
// Мэдэгдлийн зөвшөөрөл, хазайлтын зөвшөөрөл нь хэрэглэгчийн товшилт шаарддаг тул эхний товшилтоор асууна
document.addEventListener('click', () => {
  enableNotifications();
  requestTilt();
}, { once: true });

// Од, зүрх бууж унах
const random = (min, max) => min + Math.random() * (max - min);
const dropConfetti = () => {
  const symbols = ['✦', '✧', '★', '·'];
  const colors = ['#e9aa78', '#e86c88', '#f4b6c7', '#ffd166'];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    piece.style.setProperty('--x', `${random(2, 98)}vw`);
    piece.style.setProperty('--s', `${random(12, 26)}px`);
    piece.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
    piece.style.setProperty('--d', `${random(1.8, 3.2)}s`);
    piece.style.setProperty('--r', `${random(-540, 540)}deg`);
    piece.style.animationDelay = `${random(0, 0.5)}s`;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
};

// Жижиг муур: нээхэд даллана, дуу тоглоход бүжиглэнэ, шөнө унтна, бороотой бол шүхэртэй, дарвал ярина
// Муур дээр дарахад хэлэх үгс (Чой бичнэ)
const MASCOT_LINES = [
  'Сайн уу хүүхдээ?',
  'Өдрийг гоё өнгөрүүлээрэй',
  'Эрч хүчтэй байгаарай',
  'Хоолоо сайн идээрэй',
  'Даарч болохгүй шүү',
];
// Шөнө унтаж байхдаа хэлэх үгс
const MASCOT_SLEEP_LINES = ['zzz…'];
let bubbleTimer = null;
const mascotSay = (text) => {
  mascotBubble.textContent = text;
  mascotBubble.classList.remove('show');
  void mascotBubble.offsetWidth;
  mascotBubble.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => mascotBubble.classList.remove('show'), 2200);
};
const showMascot = () => {
  if (!mascot.classList.contains('hidden')) return;
  mascot.classList.remove('hidden');
  mascot.classList.add('waving');
  setTimeout(() => mascot.classList.remove('waving'), 2600);
  setTimeout(() => mascotSay('сайн уу, Энхжин ✦'), 700);
};
mascot.addEventListener('click', () => {
  mascot.classList.remove('bouncing');
  void mascot.offsetWidth;
  mascot.classList.add('bouncing');
  const lines = mascot.classList.contains('sleeping') ? MASCOT_SLEEP_LINES : MASCOT_LINES;
  if (lines.length) mascotSay(lines[Math.floor(Math.random() * lines.length)]);
});

// Push мэдэгдэл: утсыг бүртгэж, бүртгэлийг Чойн имэйл рүү явуулна
const VAPID_PUBLIC_KEY = 'BJQhjyjXhAnfAUgag836h1oKp3shMMvRhQa2WAJy8431fjMLYe6jBplJuNmnlWmys0ZsXpBf2bOVt-Qiosbkj0g';
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const urlBase64ToUint8Array = (base64) => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
};
let swRegistration = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => { swRegistration = reg; }).catch(() => {});
}
// Имэйл илгээх: Web3Forms-оор Чойн имэйл рүү очно (түлхүүр нь Чойн имэйлтэй холбоотой)
const WEB3FORMS_KEY = '43f70c18-6073-4512-b8f3-36fce686981b';
const sendMail = (subject, fields) => fetch('https://api.web3forms.com/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: 'Энхжингийн карт', ...fields }),
});
const sendSubscription = (sub) => sendMail('Push бүртгэл ✦', {
  'Төхөөрөмж': navigator.userAgent,
  'Бүртгэл': JSON.stringify(sub),
});
// Код зөв оруулмагц (хэрэглэгчийн товшилт) системийн "Allow" асуултыг шууд гаргана
const enableNotifications = async () => {
  if (!VAPID_PUBLIC_KEY) return;
  if (isIOS && !isStandalone) return; // iPhone дээр зөвхөн нүүр дэлгэцэнд нэмсэн үед боломжтой
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  try {
    const reg = swRegistration || await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    await sendSubscription(sub.toJSON());
  } catch { /* дараагийн удаа дахин оролдоно */ }
};

// Улаанбаатарын цаг (муурны үгсэд хэрэглэнэ)
const ubNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ulaanbaatar', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')), date: `${get('year')}-${get('month')}-${get('day')}` };
};

// Ухаалаг муур: нөхцөл мэдэрч хааяа өөрөө ярина (нэг нөхцөлд нэг л удаа)
let lastWeatherSky = null;
const mascotSaid = new Set();
const mascotContext = () => {
  if (mascot.classList.contains('hidden')) return;
  const now = ubNow();
  const lines = [];
  if (lastWeatherSky === 'rain') lines.push([`rain-${now.date}`, 'гадаа бороотой, шүхрээ ав ☂']);
  if (lastWeatherSky === 'snow') lines.push([`snow-${now.date}`, 'цас орж байна, дулаан хувцасла ❄']);
  if (now.minutes >= 22 * 60 + 30) lines.push([`sleep-${now.date}`, 'орой боллоо, сайн унтаарай ✦']);
  const fresh = lines.find(([key]) => !mascotSaid.has(key));
  if (!fresh) return;
  mascotSaid.add(fresh[0]);
  mascot.classList.remove('bouncing');
  void mascot.offsetWidth;
  mascot.classList.add('bouncing');
  mascotSay(fresh[1]);
};
setInterval(mascotContext, 30000);
setTimeout(mascotContext, 6000);

// Онцгой өдрүүд: төрсөн өдөр, Шинэ жил, Цагаан сар, Valentine (?special=birthday гэж урьдчилж үзэж болно)
// Энхжингийн төрсөн өдөр (сар, өдөр). Чой бөглөнө, 0 байвал баяр гарахгүй
const BIRTHDAY = { month: 0, day: 0 };
const SPECIAL_DAYS = [
  { key: 'birthday', match: (m, d) => BIRTHDAY.month > 0 && m === BIRTHDAY.month && d === BIRTHDAY.day, badge: 'Төрсөн өдрийн мэнд ✦', title: 'Төрсөн өдрийн мэнд<br /><em>Энхжин минь!</em>', effect: 'confetti', cake: true },
  { key: 'newyear', match: (m, d) => (m === 12 && d === 31) || (m === 1 && d === 1), badge: 'Шинэ жил ✦', title: 'Энхжинд<br /><em>Шинэ жилийн мэнд!</em>', effect: 'snow' },
  { key: 'tsagaansar', match: (m, d, iso) => ['2027-02-07', '2027-02-08', '2027-02-09'].includes(iso), badge: 'Цагаан сар ✦', title: 'Энхжин<br /><em>амар байна уу?</em>', effect: 'confetti' },
  { key: 'valentine', match: (m, d) => m === 2 && d === 14, badge: 'Valentine ✦', title: 'Энхжинд<br /><em>хайрын өдрийн мэнд!</em>', effect: 'confetti' },
];
const specialBadge = document.querySelector('#specialBadge');
const startSnow = () => {
  const layer = document.createElement('div');
  layer.className = 'snowfall';
  for (let i = 0; i < 40; i++) {
    const flake = document.createElement('span');
    flake.textContent = '❄';
    flake.style.setProperty('--x', `${random(0, 100)}%`);
    flake.style.setProperty('--s', `${random(8, 18)}px`);
    flake.style.setProperty('--d', `${random(7, 13)}s`);
    flake.style.setProperty('--delay', `${random(-12, 0)}s`);
    layer.appendChild(flake);
  }
  document.body.appendChild(layer);
};
const applySpecialDay = () => {
  const forced = new URLSearchParams(location.search).get('special');
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const day = SPECIAL_DAYS.find((sd) => (forced ? sd.key === forced : sd.match(now.getMonth() + 1, now.getDate(), iso)));
  if (!day) return;
  document.body.dataset.special = day.key;
  specialBadge.textContent = day.badge;
  specialBadge.classList.remove('hidden');
  welcomeTitle.innerHTML = day.title;
  if (day.cake) {
    const cake = document.createElement('div');
    cake.className = 'cake';
    cake.innerHTML = '<div class="layer b"></div><div class="layer m"></div><div class="layer t"></div><div class="candle"></div><div class="flame"></div>';
    welcomeTitle.before(cake);
  }
  if (day.effect === 'snow') startSnow();
  if (day.effect === 'confetti') {
    setInterval(() => { if (!welcome.classList.contains('hidden')) dropConfetti(); }, 4500);
  }
};
applySpecialDay();

// Хуудас эргэж солигдох
let isFlipping = false;
const goToPage = (from, to, backward = false) => {
  if (isFlipping) return;
  isFlipping = true;
  card.classList.toggle('backward', backward);
  card.classList.add('flip-out');
  document.body.dataset.theme = to.id;
  setTimeout(() => {
    from.classList.add('hidden');
    to.classList.remove('hidden');
    card.classList.remove('flip-out');
    card.classList.add('flip-in');
    card.addEventListener('animationend', () => {
      card.classList.remove('flip-in', 'backward');
      isFlipping = false;
    }, { once: true });
  }, 320);
};


// Энхжин орох бүрт Чойн имэйл рүү мэдэгдэл явуулна
const notifyVisit = () => {
  const now = new Date();
  const local = now.toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar', hour12: false });
  const device = /iPhone|iPad|Android/i.test(navigator.userAgent) ? 'утаснаас' : 'компьютерээс';
  sendMail('Энхжин орлоо ✦', {
    'Орсон цаг': `${local} (Улаанбаатарын цагаар)`,
    'Төхөөрөмж': device,
  }).catch(() => {});
};

// Хариу бичих: Web3Forms-оор имэйл рүү илгээнэ
const replyForm = document.querySelector('#replyForm');
const replyText = document.querySelector('#replyText');
const replyStatus = document.querySelector('#replyStatus');
const replyDone = document.querySelector('#replyDone');
const sendButton = document.querySelector('#sendButton');
replyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = replyText.value.trim();
  if (!message) {
    replyStatus.textContent = 'Юм бичээрэй';
    replyText.focus();
    return;
  }
  sendButton.disabled = true;
  replyStatus.textContent = 'Илгээж байна…';
  try {
    const response = await sendMail('Энхжингээс захиа ✦', {
      'Захиа': message,
      'Огноо': new Date().toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }) + ' (Улаанбаатар)',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) throw new Error(result.message || response.status);
    replyForm.classList.add('hidden');
    replyDone.classList.remove('hidden');
  } catch (error) {
    replyStatus.textContent = 'Илгээж чадсангүй, интернэтээ шалгаад дахин дараарай';
  } finally {
    sendButton.disabled = false;
  }
});
document.querySelector('#replyAgainButton').addEventListener('click', () => {
  replyText.value = '';
  replyStatus.textContent = '';
  replyDone.classList.add('hidden');
  replyForm.classList.remove('hidden');
  replyText.focus();
});

secretStar.addEventListener('click', () => {
  secretNote.classList.toggle('hidden');
});

// Хуудас солих: хуруугаар эсвэл хулганаар гүйлгэх, ← → товчлуур
const PAGES = [welcome, zodiac, farewell, weather, reply];
const currentPage = () => PAGES.find((page) => !page.classList.contains('hidden'));
const movePage = (direction) => {
  if (isFlipping) return;
  const from = currentPage();
  const index = PAGES.indexOf(from);
  const to = PAGES[index + direction];
  if (!to) return;
  if (from === welcome) dropConfetti();
  goToPage(from, to, direction < 0);
  if (to === weather) setTimeout(showWeatherPage, 340);
};
let swipe = null;
const startSwipe = (x, y, target) => {
  swipe = null;
  if (isFlipping) return;
  if (target.closest('textarea, input, .weather-hours, .playlist-nav')) return;
  swipe = { x, y, dx: 0, moved: false };
};
const moveSwipe = (x, y) => {
  if (!swipe) return;
  const dx = x - swipe.x;
  const dy = y - swipe.y;
  if (!swipe.moved && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) swipe.moved = true;
  if (!swipe.moved) return;
  swipe.dx = dx;
  card.classList.add('dragging');
  card.style.transform = `translateX(${dx * 0.35}px) rotate(${dx * 0.008}deg)`;
};
const endSwipe = () => {
  if (!swipe) return;
  const { dx, moved } = swipe;
  swipe = null;
  card.classList.remove('dragging');
  card.style.transform = '';
  if (!moved) return;
  lastDragEnd = Date.now();
  if (Math.abs(dx) < 60) return;
  movePage(dx < 0 ? 1 : -1);
};
// Чирсний дараа шууд ирэх click-ийг хаана (товч санамсаргүй дарагдахгүй)
let lastDragEnd = 0;
document.addEventListener('click', (event) => {
  if (Date.now() - lastDragEnd < 500) {
    event.stopPropagation();
    event.preventDefault();
  }
}, true);
card.addEventListener('touchstart', (event) => startSwipe(event.touches[0].clientX, event.touches[0].clientY, event.target), { passive: true });
card.addEventListener('touchmove', (event) => moveSwipe(event.touches[0].clientX, event.touches[0].clientY), { passive: true });
card.addEventListener('touchend', endSwipe);
card.addEventListener('touchcancel', endSwipe);
card.addEventListener('mousedown', (event) => { if (event.button === 0) startSwipe(event.clientX, event.clientY, event.target); });
window.addEventListener('mousemove', (event) => moveSwipe(event.clientX, event.clientY));
window.addEventListener('mouseup', endSwipe);
// 1-р хуудасны цэс: нэрийг нь дарахад тэр хуудас руу шууд очно
document.querySelectorAll('.menu-button').forEach((button) => {
  button.addEventListener('click', () => {
    const from = currentPage();
    const to = document.querySelector(`#${button.dataset.page}`);
    if (!from || !to || from === to || isFlipping) return;
    goToPage(from, to);
    if (to === weather) setTimeout(showWeatherPage, 340);
  });
});

window.addEventListener('keydown', (event) => {
  if (event.target.closest('textarea, input')) return;
  if (event.key === 'ArrowRight') movePage(1);
  if (event.key === 'ArrowLeft') movePage(-1);
});

// Parallax: хулгана эсвэл утасны хазайлтаар од, сар зөөлөн хөдөлнө
const clampUnit = (value) => Math.max(-1, Math.min(1, value));
const setParallax = (x, y) => {
  document.documentElement.style.setProperty('--px', clampUnit(x).toFixed(3));
  document.documentElement.style.setProperty('--py', clampUnit(y).toFixed(3));
};
window.addEventListener('mousemove', (event) => {
  setParallax((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
});
let tiltEnabled = false;
const enableTilt = () => {
  if (tiltEnabled) return;
  tiltEnabled = true;
  window.addEventListener('deviceorientation', (event) => {
    if (event.gamma === null || event.beta === null) return;
    setParallax(event.gamma / 30, (event.beta - 45) / 30);
  });
};
const requestTilt = () => {
  if (typeof DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then((state) => { if (state === 'granted') enableTilt(); }).catch(() => {});
  } else {
    enableTilt();
  }
};
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') enableTilt();


// Зураг дээр дарахад дараагийн зураг руу солигдоно (3 зураг ээлжлэнэ)
const PHOTOS = ['enkhjin-photo.jpg', 'enkhjin-photo-2.jpg', 'enkhjin-photo-3.jpg'];
const photoMain = photoFrame.querySelector('.zodiac-photo');
const photoAlt = photoFrame.querySelector('.zodiac-photo-alt');
PHOTOS.forEach((src) => { const img = new Image(); img.src = src; });
let photoIndex = 0;
let photoBusy = false;
photoFrame.addEventListener('click', () => {
  if (photoBusy) return;
  photoBusy = true;
  photoFrame.classList.add('flipped');
  setTimeout(() => {
    photoIndex = (photoIndex + 1) % PHOTOS.length;
    photoMain.src = PHOTOS[photoIndex];
    photoFrame.classList.remove('flipped');
    setTimeout(() => {
      photoAlt.src = PHOTOS[(photoIndex + 1) % PHOTOS.length];
      photoBusy = false;
    }, 460);
  }, 460);
});

// Дуу тоглох үед урсах нот, од
let noteTimer = null;
const spawnNote = () => {
  const symbols = ['♪', '♫', '✦', '✧'];
  const colors = ['#e9aa78', '#e86c88', '#f4b6c7'];
  const note = document.createElement('span');
  note.className = 'float-note';
  note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
  note.style.setProperty('--x', `${random(8, 88)}%`);
  note.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
  note.style.setProperty('--s', `${random(14, 26)}px`);
  note.style.setProperty('--d', `${random(2.6, 4)}s`);
  note.style.setProperty('--dx', `${random(-40, 40)}px`);
  farewell.appendChild(note);
  note.addEventListener('animationend', () => note.remove());
};
const startNotes = () => {
  if (noteTimer) return;
  spawnNote();
  noteTimer = setInterval(spawnNote, 650);
};
const stopNotes = () => {
  clearInterval(noteTimer);
  noteTimer = null;
};

const formatTime = (seconds) => {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const setPlaying = (playing) => {
  isSongPlaying = playing;
  musicPlayer.classList.toggle('is-playing', playing);
  if (playing) startNotes(); else stopNotes();
  card.classList.toggle('music-on', playing);
  mascot.classList.toggle('dancing', playing);
  playIcon.textContent = playing ? '❚❚' : '▶';
  songStatus.textContent = playing ? 'одоо тоглож байна' : 'дарж тоглуулаарай';
};

const updateProgress = () => {
  if (!player || typeof player.getDuration !== 'function') return;
  const duration = player.getDuration();
  if (!duration) return;
  const current = player.getCurrentTime();
  progressBar.style.width = `${(current / duration) * 100}%`;
  songStatus.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
};

const stopProgress = () => {
  clearInterval(progressTimer);
  progressTimer = null;
};

// Видео ачаалагдахгүй бол (жишээ нь file://-оор нээсэн) YouTube-ийн алдааг ил гаргана
const showFallbackPlayer = () => {
  if (youtubePlayer.classList.contains('is-visible')) return;
  youtubePlayer.classList.add('is-visible');
  youtubePlayer.removeAttribute('aria-hidden');
  youtubePlayer.removeAttribute('tabindex');
  songStatus.textContent = 'дуу ачаалагдсангүй';
};

const playSong = () => {
  if (!hasStarted) {
    hasStarted = true;
    player.seekTo(PLAYLIST[songIndex].start, true);
  }
  player.playVideo();
};

// Пянзны голын album зураг (YouTube-ийн thumbnail)
const albumArt = document.querySelector('#albumArt');
const playIcon = document.querySelector('#playIcon');
const setAlbumArt = (videoId) => {
  albumArt.classList.remove('loaded');
  albumArt.onload = () => albumArt.classList.add('loaded');
  albumArt.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};
setAlbumArt(PLAYLIST[0].id);

// Дуу солих
const songTitle = document.querySelector('#songTitle');
const playlistIndex = document.querySelector('#playlistIndex');
const changeSong = (step) => {
  songIndex = (songIndex + step + PLAYLIST.length) % PLAYLIST.length;
  const song = PLAYLIST[songIndex];
  songTitle.textContent = song.title;
  playlistIndex.textContent = `${songIndex + 1} / ${PLAYLIST.length}`;
  setAlbumArt(song.id);
  progressBar.style.width = '0';
  hasStarted = true;
  if (!playerReady) {
    youtubePlayer.src = `https://www.youtube.com/embed/${song.id}?enablejsapi=1&playsinline=1&rel=0&start=${song.start}`;
    return;
  }
  if (isSongPlaying) player.loadVideoById({ videoId: song.id, startSeconds: song.start });
  else {
    player.cueVideoById({ videoId: song.id, startSeconds: song.start });
    songStatus.textContent = 'дарж тоглуулаарай';
  }
};
document.querySelector('#prevSong').addEventListener('click', () => changeSong(-1));
document.querySelector('#nextSong').addEventListener('click', () => changeSong(1));

// YouTube IFrame API: дуу тоглох, зогсох төлөвийг custom карттай тааруулна
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('youtubePlayer', {
    events: {
      onReady: () => {
        playerReady = true;
        if (!pendingPlay && !isSongPlaying) songStatus.textContent = 'дарж тоглуулаарай';
        if (pendingPlay) {
          pendingPlay = false;
          playSong();
        }
      },
      onStateChange: ({ data }) => {
        if (data === YT.PlayerState.PLAYING) {
          setPlaying(true);
          stopProgress();
          progressTimer = setInterval(updateProgress, 500);
          updateProgress();
        } else if (data === YT.PlayerState.PAUSED) {
          setPlaying(false);
          stopProgress();
        } else if (data === YT.PlayerState.ENDED) {
          setPlaying(false);
          stopProgress();
          progressBar.style.width = '100%';
          finalNote.classList.remove('hidden');
        }
      },
      onError: showFallbackPlayer
    }
  });
};

const apiScript = document.createElement('script');
apiScript.src = 'https://www.youtube.com/iframe_api';
apiScript.onerror = () => {
  songStatus.textContent = 'YouTube ачаалагдсангүй (ad blocker?)';
};
document.head.appendChild(apiScript);
setTimeout(() => {
  if (!playerReady) songStatus.textContent = 'YouTube хариу өгсөнгүй (file:// эсвэл ad blocker?)';
}, 10000);

musicPlayer.addEventListener('click', () => {
  if (!playerReady) {
    // Тоглогч бэлэн болмогц автоматаар эхэлнэ
    pendingPlay = !pendingPlay;
    songStatus.textContent = pendingPlay ? 'ачаалж байна...' : 'дарж тоглуулаарай';
    musicPlayer.classList.toggle('is-playing', pendingPlay);
    return;
  }
  if (isSongPlaying) player.pauseVideo();
  else playSong();
});
