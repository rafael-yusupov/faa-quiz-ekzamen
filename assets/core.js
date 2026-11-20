/* Fashion Art Academy · общее ядро тестов-посадок
   Язык (ru/uz), переводы, сквозная аналитика, форма заявки, таймер.
   Настройки — в файле /config.js (window.FAA_CONFIG). */
(function(){
  const CFG = Object.assign({
    endpoint: "",                    // URL веб-приложения Google Apps Script (…/exec)
    telegram: "fashion_art_academy", // юзернейм Telegram админа без @
    phoneText: "",                   // номер для показа, например "+998 90 123 45 67"
    pixelId: "",                     // ID пикселя Meta
    offerHours: 48,
    trialPrice: 100000
  }, window.FAA_CONFIG || {});

  /* ---------- ЯЗЫК ---------- */
  function detectLang(){
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "uz" || q === "ru") return q;
    if (/\/uz(\/|$)/.test(location.pathname)) return "uz";
    if (/\/ru(\/|$)/.test(location.pathname)) return "ru";
    try { const s = localStorage.getItem("faa_lang"); if (s === "uz" || s === "ru") return s; } catch(e){}
    return "ru";
  }
  let LANG = detectLang();
  let PAGE = { id:"", name:"", i18n:{ru:{},uz:{}}, onLang:null };

  function T(key, vars){
    let s = (PAGE.i18n[LANG]||{})[key];
    if (s === undefined) s = (COMMON[LANG]||{})[key];
    if (s === undefined) s = (PAGE.i18n.ru||{})[key];
    if (s === undefined) s = COMMON.ru[key];
    if (s === undefined) return key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split("{"+k+"}").join(vars[k]); });
    return s;
  }
  const tr = x => Array.isArray(x) ? x[LANG === "uz" ? 1 : 0] : x;
  const ru = x => Array.isArray(x) ? x[0] : x;

  function applyI18n(){
    document.documentElement.lang = LANG;
    document.querySelectorAll("[data-i]").forEach(el => { el.innerHTML = T(el.dataset.i); });
    document.querySelectorAll("[data-ip]").forEach(el => { el.placeholder = T(el.dataset.ip); });
    document.querySelectorAll(".lang-sw button").forEach(b => b.classList.toggle("on", b.dataset.l === LANG));
    const tt = T("page_title"); if (tt !== "page_title") document.title = tt;
  }
  function setLang(l){
    if (l === LANG) return;
    LANG = l;
    try { localStorage.setItem("faa_lang", l); } catch(e){}
    try {
      const p = location.pathname;
      if (/\/(ru|uz)(\/|$)/.test(p)) history.replaceState(null, "", p.replace(/\/(ru|uz)(\/|$)/, "/"+l+"$2") + location.search);
    } catch(e){}
    applyI18n();
    if (PAGE.onLang) PAGE.onLang();
    track("lang_switch", l);
  }

  /* ---------- АНАЛИТИКА ---------- */
  const P = new URLSearchParams(location.search);
  const UTM = {};
  ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid"].forEach(k => UTM[k] = P.get(k) || "");
  const rnd = () => Math.random().toString(36).slice(2,8);
  let SID = "";
  const st = { sec:0, scroll:{intro:0,result:0}, screen:"intro", maxQ:0, totalQ:0, lastPingSec:-1 };
  const device = /iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop");
  function cookie(n){ const m = document.cookie.match(new RegExp("(?:^|; )"+n+"=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  let FT = {};
  function initSession(){
    const key = "faa_sid_" + PAGE.id;
    try { SID = sessionStorage.getItem(key) || ""; } catch(e){}
    if (!SID){ SID = "s_" + Date.now().toString(36) + "_" + rnd(); try { sessionStorage.setItem(key, SID); } catch(e){} }
    try { FT = JSON.parse(localStorage.getItem("faa_ft") || "null") || {}; } catch(e){ FT = {}; }
    if (!FT.ts){
      let ref = ""; try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch(e){}
      FT = { src: UTM.utm_source || ref || "direct", camp: UTM.utm_campaign || "", ts: new Date().toISOString() };
      try { localStorage.setItem("faa_ft", JSON.stringify(FT)); } catch(e){}
    }
  }
  function base(){
    let fbc = cookie("_fbc");
    if (!fbc && UTM.fbclid) fbc = "fb.1." + Date.now() + "." + UTM.fbclid;
    return Object.assign({
      sid: SID, landing: PAGE.name, lang: LANG,
      page: location.href.split("#")[0], ref: document.referrer || "",
      ft_src: FT.src || "", ft_camp: FT.camp || "", ft_ts: FT.ts || "",
      device, screen: (screen.width||0) + "x" + (screen.height||0), ua: navigator.userAgent,
      sec: st.sec, scroll_intro: st.scroll.intro, scroll_result: st.scroll.result,
      max_q: st.maxQ, total_q: st.totalQ, fbp: cookie("_fbp"), fbc
    }, UTM);
  }
  function send(obj, beacon){
    if (!CFG.endpoint) return;
    const body = JSON.stringify(Object.assign(base(), obj));
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon(CFG.endpoint, new Blob([body], {type:"text/plain"})); return; }
      fetch(CFG.endpoint, { method:"POST", mode:"no-cors", keepalive:true, headers:{"Content-Type":"text/plain;charset=utf-8"}, body });
    } catch(e){}
  }
  const once = {};
  function track(event, detail, extra){
    if (extra && extra.once){ if (once[event]) return; once[event] = 1; }
    send(Object.assign({ type:"event", event, detail: detail==null ? "" : String(detail) }, extra||{}));
  }
  function ping(beacon){ if (st.sec === st.lastPingSec) return; st.lastPingSec = st.sec; send({ type:"ping", event:"ping", detail: st.screen }, beacon); }
  function px(ev, params, id){ try { if (window.fbq) fbq("track", ev, params||{}, id ? {eventID:id} : undefined); } catch(e){} }

  function startTracking(){
    setInterval(() => { if (document.visibilityState === "visible") st.sec++; }, 1000);
    setInterval(() => { if (document.visibilityState === "visible" && st.sec < 1800) ping(); }, 20000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") ping(true); });
    window.addEventListener("pagehide", () => ping(true));
    window.addEventListener("scroll", () => {
      const k = st.screen === "result" ? "result" : (st.screen === "intro" ? "intro" : null);
      if (!k) return;
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h <= 0 ? 100 : Math.min(100, Math.round(scrollY / h * 100));
      if (p > st.scroll[k]) st.scroll[k] = p;
    }, { passive:true });
    document.addEventListener("click", e => {
      const a = e.target.closest("[data-track]"); if (a) track(a.dataset.track, a.dataset.detail || "");
    });
  }
  function pixelInit(){
    if (!CFG.pixelId) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq("init", CFG.pixelId); fbq("track", "PageView");
  }

  /* ---------- ЭКРАНЫ ---------- */
  const $ = s => document.querySelector(s);
  function show(id, screenName){
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(id).classList.add("active");
    st.screen = screenName || id.replace("#s-","");
    window.scrollTo({ top:0, behavior:"smooth" });
  }
  function question(n, total, detail){
    st.totalQ = total;
    if (n > st.maxQ){
      st.maxQ = n;
      track("answer", n + ": " + detail, { q:n });
      if (n === Math.ceil(total/2)) track("half", n);
    }
  }

  /* ---------- ТАЙМЕР ---------- */
  let timerInt = null;
  function startTimer(){
    const key = "faa_done_" + PAGE.id;
    let t0 = 0; try { t0 = parseInt(localStorage.getItem(key), 10) || 0; } catch(e){}
    if (!t0){ t0 = Date.now(); try { localStorage.setItem(key, String(t0)); } catch(e){} }
    const end = t0 + CFG.offerHours*3600*1000, pad = x => String(x).padStart(2,"0");
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0){ clearInterval(timerInt); ["#th","#tm","#ts"].forEach(s => $(s).textContent = "00"); $("#timerL").style.display = "none"; $("#expired").style.display = "block"; return; }
      $("#th").textContent = pad(Math.floor(left/3600000));
      $("#tm").textContent = pad(Math.floor(left%3600000/60000));
      $("#ts").textContent = pad(Math.floor(left%60000/1000));
    };
    clearInterval(timerInt); tick(); timerInt = setInterval(tick, 1000);
  }

  /* ---------- ФОРМА ---------- */
  let formOpts = null, prefTime = "", prefTimeRu = "";
  function initForm(opts){
    formOpts = opts;
    document.querySelectorAll("#timeChips .chip").forEach(c => c.onclick = () => {
      document.querySelectorAll("#timeChips .chip").forEach(x => x.classList.remove("sel"));
      c.classList.add("sel"); prefTimeRu = c.dataset.v;
    });
    $("#phone").addEventListener("input", e => {
      let d = e.target.value.replace(/\D/g,""); if (d.startsWith("998")) d = d.slice(3); d = d.slice(0,9);
      e.target.value = [d.slice(0,2),d.slice(2,5),d.slice(5,7),d.slice(7,9)].filter(Boolean).join(" ");
      $("#fPhone").classList.remove("bad");
    });
    $("#name").addEventListener("input", () => $("#fName").classList.remove("bad"));
    $("#form").addEventListener("focusin", () => track("form_focus", "", { once:true }));
    if ("IntersectionObserver" in window){
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ track("offer_view", "", { once:true }); io.disconnect(); } }), { threshold:.25 });
      io.observe($("#offer"));
    }
    $("#form").addEventListener("submit", async e => {
      e.preventDefault();
      const name = $("#name").value.trim(), digits = $("#phone").value.replace(/\D/g,"");
      let ok = true;
      if (name.length < 2){ $("#fName").classList.add("bad"); ok = false; }
      if (digits.length !== 9){ $("#fPhone").classList.add("bad"); ok = false; }
      if (!ok) return;
      const btn = $("#submit"); btn.disabled = true; btn.textContent = T("sending");
      const eventId = "lead_" + SID + "_" + rnd();
      const data = Object.assign({ type:"lead", event:"lead", detail:"", name, phone:"+998"+digits, time: prefTimeRu || "не указано", event_id:eventId }, formOpts.data());
      send(data);
      px("Lead", { content_name: PAGE.id, value: CFG.trialPrice, currency:"UZS" }, eventId);
      $("#doneName").textContent = name;
      $("#tgBtn").href = "https://t.me/" + CFG.telegram + "?text=" + encodeURIComponent(formOpts.tg(name, digits));
      $("#contactText").textContent = CFG.phoneText ? T("call_us") + CFG.phoneText : "";
      show("#s-done", "done");
    });
    $("#tgBtn").addEventListener("click", () => track("tg_click"));
    $("#shareBtn").onclick = async () => {
      track("share_click");
      const url = location.href.split("#")[0];
      try { await navigator.clipboard.writeText(url); $("#copied").textContent = T("copied"); } catch(e){ $("#copied").textContent = url; }
    };
  }

  /* ---------- ЗАПУСК ---------- */
  function init(page){
    PAGE = Object.assign(PAGE, page);
    initSession();
    applyI18n();
    document.querySelectorAll(".lang-sw button").forEach(b => b.onclick = () => setLang(b.dataset.l));
    pixelInit();
    startTracking();
    track("page_view");
  }

  /* ---------- ОБЩИЕ ТЕКСТЫ ---------- */
  const COMMON = {
    ru: {
      brand_sub: "Ташкент · школа рисунка и моды",
      price_old: "500 000 сум", price_unit: "сум",
      price_why: "для тех, кто прошёл тест, при записи в течение 48 часов",
      t_h: "часов", t_m: "минут", t_s: "секунд", timer_l: "до конца спеццены",
      expired: "48 часов прошли. Оставь заявку, и администратор подскажет актуальные условия.",
      f_name: "Как тебя зовут", f_name_ph: "Имя", f_name_err: "Напиши имя",
      f_phone: "Телефон", f_phone_err: "Проверь номер: нужно 9 цифр",
      f_time: "Когда удобнее заниматься", ch1: "Будни, утро", ch2: "Будни, вечер", ch3: "Выходные",
      secure: "Администратор позвонит или напишет в Telegram и подберёт время урока",
      sending: "Отправляем…",
      done_big: "Спасибо",
      done_fast: "Хочешь быстрее? Напиши нам сама, сообщение уже готово:",
      tg_btn: "Написать в Telegram <span class=\"arr\">→</span>",
      call_us: "или позвони: ",
      share_btn: "Скопировать ссылку", copied: "Ссылка скопирована, отправь её подруге",
      footer: "Фэшн-иллюстрация · Академический рисунок и живопись · Шитьё · Ташкент"
    },
    uz: {
      brand_sub: "Toshkent · rasm va moda maktabi",
      price_old: "500 000 so'm", price_unit: "so'm",
      price_why: "testdan o'tganlar uchun, 48 soat ichida yozilsang",
      t_h: "soat", t_m: "daqiqa", t_s: "soniya", timer_l: "maxsus narx tugashiga",
      expired: "48 soat o'tdi. Ariza qoldir, administrator amaldagi shartlarni aytib beradi.",
      f_name: "Isming nima", f_name_ph: "Ism", f_name_err: "Ismingni yoz",
      f_phone: "Telefon", f_phone_err: "Raqamni tekshir: 9 ta raqam kerak",
      f_time: "Qachon shug'ullanish qulay", ch1: "Ish kunlari, ertalab", ch2: "Ish kunlari, kechqurun", ch3: "Dam olish kunlari",
      secure: "Administrator qo'ng'iroq qiladi yoki Telegram'da yozib, dars vaqtini tanlaydi",
      sending: "Yuborilmoqda…",
      done_big: "Rahmat",
      done_fast: "Tezroq bo'lsinmi? O'zing yoz, xabar tayyor:",
      tg_btn: "Telegram'da yozish <span class=\"arr\">→</span>",
      call_us: "yoki qo'ng'iroq qil: ",
      share_btn: "Havolani nusxalash", copied: "Havola nusxalandi, dugonangga yubor",
      footer: "Fashion-illyustratsiya · Akademik rasm va rangtasvir · Tikuvchilik · Toshkent"
    }
  };

  window.FAA = { CFG, T, tr, ru, get lang(){ return LANG; }, setLang, applyI18n, init, track, show, question, startTimer, initForm, px, $ };
})();
