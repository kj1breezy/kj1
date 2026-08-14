(function () {
  "use strict";

  // ==========================================================================
  // State
  // ==========================================================================
  var state = {
    trades: [],
    accounts: [],
    settings: { driveClientId: '' },
    calendar: null,
    calendarMeta: null,
    calCurrency: 'ALL',
    calImpact: 'both',
    tab: 'dashboard',
    calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calSelectedDay: null,
    coachThread: [], // {role:'user'|'assistant', text}
    loaded: false,
    deferredInstallPrompt: null
  };

  var EMOTIONS = ['Disciplined', 'Confident', 'FOMO', 'Revenge', 'Hesitant', 'Overconfident', 'Anxious', 'Neutral'];
  var MARKETS = [
    { v: 'stock', l: 'Stock / ETF' },
    { v: 'option', l: 'Option' },
    { v: 'future', l: 'Future' },
    { v: 'forex', l: 'Forex' },
    { v: 'crypto', l: 'Crypto' }
  ];

  // ---- Seed data: your real ES futures trade history, carried over from your prior journal ----
  var IMPORTED_TRADES = [{"id":"imp_20260102_0","date":"2026-01-02","time":"","symbol":"ES","market":"future","direction":"long","entry":6878.5,"exit":6904.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260108_1","date":"2026-01-08","time":"","symbol":"ES","market":"future","direction":"long","entry":6957.5,"exit":6983.75,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"Unemployment Claims","emotion":"","rulesFollowed":true},{"id":"imp_20260115_2","date":"2026-01-15","time":"","symbol":"ES","market":"future","direction":"short","entry":7007.25,"exit":6981.0,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"London GDP/Claims","emotion":"","rulesFollowed":true},{"id":"imp_20260120_3","date":"2026-01-20","time":"","symbol":"ES","market":"future","direction":"long","entry":6890.75,"exit":6879.75,"size":1,"fees":0,"pnl":-550.0,"tags":["Imported"],"notes":"London Claimant/London BOE Gov","emotion":"","rulesFollowed":true},{"id":"imp_20260128_4","date":"2026-01-28","time":"","symbol":"ES","market":"future","direction":"long","entry":7009.25,"exit":6999.75,"size":1,"fees":0,"pnl":-475.0,"tags":["Imported"],"notes":"BOC/FOMC","emotion":"","rulesFollowed":true},{"id":"imp_20260130_5","date":"2026-01-30","time":"","symbol":"ES","market":"future","direction":"short","entry":6972.5,"exit":2946.25,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"Exit price in original sheet appears mistyped (2946.25); shown as recorded. GDP/Core PPI/PPI","emotion":"","rulesFollowed":true},{"id":"imp_20260204_6","date":"2026-02-04","time":"","symbol":"ES","market":"future","direction":"long","entry":6907.25,"exit":6897.0,"size":1,"fees":0,"pnl":-512.5,"tags":["Imported"],"notes":"ADP Non-Farm/ISM PMI","emotion":"","rulesFollowed":true},{"id":"imp_20260217_7","date":"2026-02-17","time":"","symbol":"ES","market":"future","direction":"long","entry":6846.25,"exit":6835.5,"size":1,"fees":0,"pnl":-537.5,"tags":["Imported"],"notes":"CPI","emotion":"","rulesFollowed":true},{"id":"imp_20260218_8","date":"2026-02-18","time":"","symbol":"ES","market":"future","direction":"short","entry":6921.5,"exit":6895.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"FOMC","emotion":"","rulesFollowed":true},{"id":"imp_20260219_9","date":"2026-02-19","time":"","symbol":"ES","market":"future","direction":"long","entry":6863.5,"exit":6852.5,"size":1,"fees":0,"pnl":-550.0,"tags":["Imported"],"notes":"Unemployment Claims","emotion":"","rulesFollowed":true},{"id":"imp_20260226_10","date":"2026-02-26","time":"","symbol":"ES","market":"future","direction":"long","entry":6888.75,"exit":6881.25,"size":1,"fees":0,"pnl":-375.0,"tags":["Imported"],"notes":"unemployment claims/post earnings","emotion":"","rulesFollowed":true},{"id":"imp_20260227_11","date":"2026-02-27","time":"","symbol":"ES","market":"future","direction":"short","entry":6883.25,"exit":6857.0,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"gdp/ppi","emotion":"","rulesFollowed":true},{"id":"imp_20260306_12","date":"2026-03-06","time":"","symbol":"ES","market":"future","direction":"long","entry":6754.25,"exit":6780.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"nfp/hella red folder news","emotion":"","rulesFollowed":true},{"id":"imp_20260311_13","date":"2026-03-11","time":"","symbol":"ES","market":"future","direction":"long","entry":6755.0,"exit":6781.0,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"CPI","emotion":"","rulesFollowed":true},{"id":"imp_20260319_14","date":"2026-03-19","time":"","symbol":"ES","market":"future","direction":"short","entry":6646.0,"exit":6619.75,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"unemployment claims/MRR/MPS/ECB","emotion":"","rulesFollowed":true},{"id":"imp_20260326_15","date":"2026-03-26","time":"","symbol":"ES","market":"future","direction":"long","entry":6593.5,"exit":6585.5,"size":1,"fees":0,"pnl":-400.0,"tags":["Imported"],"notes":"unemployment claims","emotion":"","rulesFollowed":true},{"id":"imp_20260327_16","date":"2026-03-27","time":"","symbol":"ES","market":"future","direction":"short","entry":6462.75,"exit":6472.75,"size":1,"fees":0,"pnl":-500.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260331_17","date":"2026-03-31","time":"","symbol":"ES","market":"future","direction":"long","entry":6470.25,"exit":6496.25,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"GDP/JOLTS","emotion":"","rulesFollowed":true},{"id":"imp_20260408_18","date":"2026-04-08","time":"","symbol":"ES","market":"future","direction":"short","entry":6799.0,"exit":6808.0,"size":1,"fees":0,"pnl":-450.0,"tags":["Imported"],"notes":"FOMC","emotion":"","rulesFollowed":true},{"id":"imp_20260414_19","date":"2026-04-14","time":"","symbol":"ES","market":"future","direction":"short","entry":6973.75,"exit":6982.5,"size":1,"fees":0,"pnl":-437.5,"tags":["Imported"],"notes":"CPPI/PPI","emotion":"","rulesFollowed":true},{"id":"imp_20260415_20","date":"2026-04-15","time":"","symbol":"ES","market":"future","direction":"short","entry":7031.25,"exit":7039.75,"size":1,"fees":0,"pnl":-425.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260417_21","date":"2026-04-17","time":"","symbol":"ES","market":"future","direction":"short","entry":7169.5,"exit":7179.75,"size":1,"fees":0,"pnl":-512.5,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260422_22","date":"2026-04-22","time":"","symbol":"ES","market":"future","direction":"long","entry":7122.75,"exit":7112.5,"size":1,"fees":0,"pnl":0.0,"tags":["Imported"],"notes":"Sheet recorded this as breakeven despite the price move; shown as recorded.","emotion":"","rulesFollowed":true},{"id":"imp_20260423_23","date":"2026-04-23","time":"","symbol":"ES","market":"future","direction":"short","entry":7176.5,"exit":7178.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"Sheet's P&L (win) doesn't match entry/exit price move for this row — possible price typo in original sheet; P&L shown as recorded.","emotion":"","rulesFollowed":true},{"id":"imp_20260428_24","date":"2026-04-28","time":"","symbol":"ES","market":"future","direction":"long","entry":7152.5,"exit":7178.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260508_25","date":"2026-05-08","time":"","symbol":"ES","market":"future","direction":"short","entry":7420.5,"exit":7394.25,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"nfp","emotion":"","rulesFollowed":true},{"id":"imp_20260515_26","date":"2026-05-15","time":"","symbol":"ES","market":"future","direction":"long","entry":7440.5,"exit":7466.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260519_27","date":"2026-05-19","time":"","symbol":"ES","market":"future","direction":"long","entry":7360.25,"exit":7386.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"cpi","emotion":"","rulesFollowed":true},{"id":"imp_20260520_28","date":"2026-05-20","time":"","symbol":"ES","market":"future","direction":"short","entry":7445.5,"exit":7419.25,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"fomc","emotion":"","rulesFollowed":true},{"id":"imp_20260521_29","date":"2026-05-21","time":"","symbol":"ES","market":"future","direction":"long","entry":7419.5,"exit":7410.25,"size":1,"fees":0,"pnl":-462.5,"tags":["Imported"],"notes":"boe gov","emotion":"","rulesFollowed":true},{"id":"imp_20260528_30","date":"2026-05-28","time":"","symbol":"ES","market":"future","direction":"long","entry":7572.75,"exit":7598.75,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"cppi/gdp","emotion":"","rulesFollowed":true},{"id":"imp_20260529_31","date":"2026-05-29","time":"","symbol":"ES","market":"future","direction":"short","entry":7601.25,"exit":7610.75,"size":1,"fees":0,"pnl":-475.0,"tags":["Imported"],"notes":"gdp","emotion":"","rulesFollowed":true},{"id":"imp_20260603_32","date":"2026-06-03","time":"","symbol":"ES","market":"future","direction":"long","entry":7583.75,"exit":7573.75,"size":1,"fees":0,"pnl":-500.0,"tags":["Imported"],"notes":"pmi","emotion":"","rulesFollowed":true},{"id":"imp_20260616_33","date":"2026-06-16","time":"","symbol":"ES","market":"future","direction":"long","entry":7608.0,"exit":7597.25,"size":1,"fees":0,"pnl":-537.5,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260617_34","date":"2026-06-17","time":"","symbol":"ES","market":"future","direction":"short","entry":7590.5,"exit":7564.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"fomc","emotion":"","rulesFollowed":true},{"id":"imp_20260618_35","date":"2026-06-18","time":"","symbol":"ES","market":"future","direction":"short","entry":7562.0,"exit":7570.5,"size":1,"fees":0,"pnl":-425.0,"tags":["Imported"],"notes":"mpc/official bank rate","emotion":"","rulesFollowed":true},{"id":"imp_20260709_36","date":"2026-07-09","time":"","symbol":"ES","market":"future","direction":"long","entry":7548.75,"exit":7574.75,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"unemp claims","emotion":"","rulesFollowed":true},{"id":"imp_20260716_37","date":"2026-07-16","time":"","symbol":"ES","market":"future","direction":"short","entry":7610.25,"exit":7584.25,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260717_38","date":"2026-07-17","time":"","symbol":"ES","market":"future","direction":"long","entry":7515.0,"exit":7503.25,"size":1,"fees":0,"pnl":-587.5,"tags":["Imported"],"notes":"Extended 23.5 points before reversing.","emotion":"","rulesFollowed":true},{"id":"imp_20260724_39","date":"2026-07-24","time":"","symbol":"ES","market":"future","direction":"short","entry":7493.25,"exit":7467.0,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260729_40","date":"2026-07-29","time":"","symbol":"ES","market":"future","direction":"short","entry":7408.25,"exit":7382.0,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"FOMC","emotion":"","rulesFollowed":true},{"id":"imp_20260804_41","date":"2026-08-04","time":"","symbol":"ES","market":"future","direction":"long","entry":7739.25,"exit":7748.5,"size":1,"fees":0,"pnl":-475.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260806_42","date":"2026-08-06","time":"","symbol":"ES","market":"future","direction":"short","entry":7740.25,"exit":7754.25,"size":1,"fees":0,"pnl":-700.0,"tags":["Imported"],"notes":"","emotion":"","rulesFollowed":true},{"id":"imp_20260811_43","date":"2026-08-11","time":"","symbol":"ES","market":"future","direction":"short","entry":7767.5,"exit":7741.5,"size":1,"fees":0,"pnl":1300.0,"tags":["Imported"],"notes":"Cash Rate/RBA","emotion":"","rulesFollowed":true}];

  // ==========================================================================
  // DOM / format helpers
  // ==========================================================================
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function uid() { return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtMoney(n) {
    n = Number(n) || 0;
    var neg = n < 0;
    var v = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + '$' + v;
  }
  function fmtDate(d) {
    var dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function toast(msg, isError) {
    var root = $('#toastRoot');
    root.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'toast';
    if (isError) el.style.borderColor = 'var(--loss)';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
  }
  function active(list) { return (list || []).filter(function (x) { return !x.deleted; }); }

  // ==========================================================================
  // Storage: localStorage (always) + Google Drive (best-effort background sync)
  // ==========================================================================
  var LS_PREFIX = 'ledger:';
  var syncDebounceTimer = null;

  var LocalStore = {
    get: function (key) {
      try {
        var raw = localStorage.getItem(LS_PREFIX + key);
        return raw === null ? null : JSON.parse(raw);
      } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { toast('Local save failed: ' + (e && e.message ? e.message : 'storage full?'), true); return false; }
    }
  };

  function loadScreenshot(tradeId) {
    try { return localStorage.getItem(LS_PREFIX + 'shot:' + tradeId); } catch (e) { return null; }
  }
  function saveScreenshot(tradeId, dataUrl) {
    try { localStorage.setItem(LS_PREFIX + 'shot:' + tradeId, dataUrl); }
    catch (e) { toast('Screenshot could not be saved locally (storage limit)', true); }
  }
  function deleteScreenshotLocal(tradeId) {
    try { localStorage.removeItem(LS_PREFIX + 'shot:' + tradeId); } catch (e) {}
  }

  function mergeById(localArr, remoteArr) {
    var map = {};
    (localArr || []).forEach(function (r) { map[r.id] = r; });
    (remoteArr || []).forEach(function (r) {
      var cur = map[r.id];
      if (!cur || (Number(r.updatedAt) || 0) > (Number(cur.updatedAt) || 0)) map[r.id] = r;
    });
    var cutoff = Date.now() - 90 * 24 * 3600 * 1000;
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) {
      return !(r.deleted && (Number(r.updatedAt) || 0) < cutoff);
    });
  }

  function buildSyncPayload() {
    return { version: 1, syncedAt: Date.now(), trades: state.trades, accounts: state.accounts, settings: state.settings };
  }

  function loadLocal() {
    state.trades = LocalStore.get('trades') || [];
    state.accounts = LocalStore.get('accounts') || [];
    var settings = LocalStore.get('settings');
    if (settings) state.settings = Object.assign({}, state.settings, settings);
  }

  function persistLocal() {
    LocalStore.set('trades', state.trades);
    LocalStore.set('accounts', state.accounts);
    LocalStore.set('settings', state.settings);
  }

  function scheduleDriveSync() {
    if (!window.DriveSync || !window.DriveSync.isConnected()) return;
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(function () {
      window.DriveSync.push(buildSyncPayload()).then(function () {
        renderSyncBits();
      }).catch(function (e) {
        toast('Drive sync failed: ' + (e && e.message ? e.message : 'unknown error'), true);
      });
    }, 2500);
  }

  async function fullSync(showToast) {
    if (!window.DriveSync || !window.DriveSync.isConnected()) return;
    try {
      var remote = await window.DriveSync.pull();
      if (remote) {
        state.trades = mergeById(state.trades, remote.trades);
        state.accounts = mergeById(state.accounts, remote.accounts);
        if (remote.settings) state.settings = Object.assign({}, remote.settings, state.settings);
        persistLocal();
      }
      await window.DriveSync.push(buildSyncPayload());
      if (showToast) toast('Synced with Google Drive');
      render();
      renderSyncBits();
    } catch (e) {
      if (showToast) toast('Sync failed: ' + (e && e.message ? e.message : 'unknown error'), true);
    }
  }

  // ==========================================================================
  // Stats
  // ==========================================================================
  function computeStats(trades) {
    var s = {
      count: 0, net: 0, wins: 0, losses: 0, breakeven: 0,
      grossWin: 0, grossLoss: 0, best: null, worst: null,
      winRate: 0, profitFactor: null, avgWin: 0, avgLoss: 0,
      currentStreak: 0, streakType: null, ruleAdherence: null
    };
    var live = active(trades);
    s.count = live.length;
    if (!live.length) return s;
    var sorted = live.slice().sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); });
    var ruleTrades = 0, ruleFollowed = 0;
    sorted.forEach(function (t) {
      var pnl = Number(t.pnl) || 0;
      s.net += pnl;
      if (pnl > 0) { s.wins++; s.grossWin += pnl; }
      else if (pnl < 0) { s.losses++; s.grossLoss += Math.abs(pnl); }
      else { s.breakeven++; }
      if (s.best === null || pnl > s.best.pnl) s.best = t;
      if (s.worst === null || pnl < s.worst.pnl) s.worst = t;
      if (typeof t.rulesFollowed === 'boolean') { ruleTrades++; if (t.rulesFollowed) ruleFollowed++; }
    });
    s.winRate = s.count ? (s.wins / (s.wins + s.losses || 1)) * 100 : 0;
    s.profitFactor = s.grossLoss > 0 ? (s.grossWin / s.grossLoss) : (s.grossWin > 0 ? Infinity : null);
    s.avgWin = s.wins ? s.grossWin / s.wins : 0;
    s.avgLoss = s.losses ? s.grossLoss / s.losses : 0;
    s.avgRR = s.avgLoss > 0 ? (s.avgWin / s.avgLoss) : null;
    s.ruleAdherence = ruleTrades ? (ruleFollowed / ruleTrades) * 100 : null;
    var streak = 0, type = null;
    for (var i = sorted.length - 1; i >= 0; i--) {
      var p = Number(sorted[i].pnl) || 0;
      var t2 = p > 0 ? 'win' : (p < 0 ? 'loss' : 'be');
      if (type === null) { type = t2; streak = 1; }
      else if (t2 === type) { streak++; }
      else break;
    }
    s.currentStreak = streak;
    s.streakType = type;
    s.sorted = sorted;
    return s;
  }

  function groupBy(trades, keyFn) {
    var map = {};
    active(trades).forEach(function (t) {
      var keys = keyFn(t);
      if (!Array.isArray(keys)) keys = [keys];
      keys.forEach(function (k) {
        if (k == null || k === '') return;
        if (!map[k]) map[k] = { key: k, net: 0, wins: 0, count: 0 };
        map[k].net += Number(t.pnl) || 0;
        map[k].count++;
        if (Number(t.pnl) > 0) map[k].wins++;
      });
    });
    return Object.values(map).sort(function (a, b) { return b.net - a.net; });
  }

  // ==========================================================================
  // Render dispatch
  // ==========================================================================
  function render() {
    $all('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === state.tab); });
    var main = $('#main');
    if (!state.loaded) { main.innerHTML = '<div class="empty-state"><div class="em-title">Loading your ledger…</div></div>'; return; }
    if (state.tab === 'dashboard') renderDashboard(main);
    else if (state.tab === 'log') renderLog(main);
    else if (state.tab === 'calendar') renderCalendar(main);
    else if (state.tab === 'macro') renderMacro(main);
    else if (state.tab === 'props') renderProps(main);
    else if (state.tab === 'coach') renderCoach(main);
    else if (state.tab === 'settings') renderSettings(main);
    renderPulse();
  }

  function renderPulse() {
    var s = computeStats(state.trades);
    var svg = $('#pulseSvg');
    var valEl = $('#pulseValue');
    valEl.textContent = fmtMoney(s.net);
    valEl.style.color = s.net > 0 ? 'var(--gain)' : (s.net < 0 ? 'var(--loss)' : 'var(--text-dim)');
    if (!s.sorted || !s.sorted.length) {
      svg.innerHTML = '<line x1="0" y1="17" x2="1000" y2="17" stroke="var(--line-soft)" stroke-width="1.5" stroke-dasharray="4 5"/>';
    } else {
      var cum = 0; var pts = [0];
      s.sorted.forEach(function (t) { cum += Number(t.pnl) || 0; pts.push(cum); });
      var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      var range = (max - min) || 1;
      var w = 1000, h = 34, pad = 4;
      var step = w / (pts.length - 1 || 1);
      var d = pts.map(function (v, i) {
        var x = i * step;
        var y = h - pad - ((v - min) / range) * (h - pad * 2);
        return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      var color = cum >= 0 ? 'var(--gain)' : 'var(--loss)';
      var lastY = h - pad - ((pts[pts.length - 1] - min) / range) * (h - pad * 2);
      svg.innerHTML =
        '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6" opacity="0.9"/>' +
        '<circle cx="' + w + '" cy="' + lastY.toFixed(1) + '" r="3" fill="' + color + '"><animate attributeName="r" values="3;5;3" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite"/></circle>';
    }
    renderSyncBits();
  }

  function renderSyncBits() {
    var dot = $('#pulseSyncDot');
    var hint = $('#storageHint');
    if (!window.DriveSync) return;
    var st = window.DriveSync.getStatus();
    if (dot) {
      dot.className = 'pulse-sync-dot' + (st.state === 'connected' ? ' on' : (st.state === 'connecting' ? ' busy' : ''));
      dot.title = st.state === 'connected' ? 'Synced to Google Drive' + (st.email ? ' (' + st.email + ')' : '') : (st.state === 'connecting' ? 'Connecting…' : 'Not connected to Google Drive');
    }
    if (hint) {
      hint.innerHTML = st.state === 'connected'
        ? 'Synced to Google Drive<br>(private, your account only)'
        : 'Saved locally on this device<br>Connect Drive in Settings to sync';
    }
  }

  // ==========================================================================
  // Dashboard
  // ==========================================================================
  function renderDashboard(main) {
    var s = computeStats(state.trades);
    if (!active(state.trades).length) {
      main.innerHTML =
        '<div class="page-head"><div><div class="page-title">Dashboard</div><div class="page-sub">Your performance, at a glance</div></div></div>' +
        installBanner() +
        '<div class="panel"><div class="empty-state">' +
        '<div class="em-title">The ledger is empty</div>' +
        '<div class="em-sub">Log your first trade to start building your equity curve, win rate, and behavioral patterns.</div>' +
        '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
        '<button class="btn-primary" style="width:auto;" onclick="App.openTradeModal()">+ Log a trade</button>' +
        '<button class="btn-ghost" style="width:auto;" onclick="App.importSpreadsheetTrades()">↑ Import ES trade history</button>' +
        '</div></div></div>';
      bindInstallBanner();
      return;
    }
    var pf = s.profitFactor === null ? '—' : (s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2));
    var byEmotion = groupBy(state.trades, function (t) { return t.emotion; }).slice(0, 6);

    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Dashboard</div><div class="page-sub">' + s.count + ' trades logged</div></div></div>' +
      installBanner() +
      sessionBrief(s) +
      '<div class="stat-grid">' +
      stat('Net P&L', fmtMoney(s.net), s.net >= 0 ? 'gain' : 'loss') +
      stat('Win Rate', s.winRate.toFixed(1) + '%', '', s.wins + 'W / ' + s.losses + 'L') +
      stat('Avg Risk:Reward', s.avgRR === null ? '—' : (s.avgRR.toFixed(2) + 'R'), '', 'avg win ÷ avg loss') +
      stat('Profit Factor', pf) +
      stat('Current Streak', s.currentStreak + ' ' + (s.streakType === 'win' ? 'Win' : s.streakType === 'loss' ? 'Loss' : 'B/E') + (s.currentStreak > 1 ? 's' : ''), s.streakType === 'win' ? 'gain' : s.streakType === 'loss' ? 'loss' : '') +
      '</div>' +
      '<div class="dash-grid">' +
      '<div class="panel"><div class="panel-title">Equity Curve</div>' + equityCurveSvg(s) + '</div>' +
      '<div class="panel"><div class="panel-title">Trades by Weekday</div>' + weekdayChart(s) + '</div>' +
      '</div>' +
      '<div class="dash-grid">' +
      '<div class="panel"><div class="panel-title">Edge Factor</div>' + edgeFactorPanel(s) + '</div>' +
      '<div class="panel"><div class="panel-title">After a loss — what you do next</div>' + tiltPanel(s) + '</div>' +
      '</div>' +
      (byEmotion.length ? '<div class="panel"><div class="panel-title">By Mindset — where discipline slips</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:10px;">' +
        byEmotion.map(function (e) {
          var wr = e.count ? Math.round(e.wins / e.count * 100) : 0;
          var cls = e.net >= 0 ? 'gain' : 'loss';
          return '<div style="background:var(--surface-2); border:1px solid var(--line-soft); border-radius:9px; padding:10px 14px; min-width:120px;">' +
            '<div style="font-size:12px; color:var(--text-dim); margin-bottom:4px;">' + esc(e.key) + '</div>' +
            '<div style="font-family:var(--font-mono); font-weight:600; color:var(--' + cls + ')">' + fmtMoney(e.net) + '</div>' +
            '<div style="font-size:10.5px; color:var(--text-faint); margin-top:2px;">' + e.count + ' trades · ' + wr + '% win</div>' +
            '</div>';
        }).join('') +
        '</div></div>' : '');
    bindInstallBanner();
  }

  function stat(label, value, cls, note) {
    var cardCls = cls === 'gain' ? ' pos' : (cls === 'loss' ? ' neg' : '');
    return '<div class="stat-card' + cardCls + '"><div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value ' + (cls || '') + '">' + value + '</div>' +
      (note ? '<div class="stat-note">' + esc(note) + '</div>' : '') +
      '</div>';
  }

  function weekdayChart(s) {
    if (!s.count) return '<div style="color:var(--text-faint); font-size:12.5px;">No trades yet</div>';
    var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    var buckets = [0, 1, 2, 3, 4].map(function () { return { count: 0, wins: 0, net: 0, gw: 0, gl: 0 }; });
    active(state.trades).forEach(function (t) {
      var dow = new Date(t.date + 'T00:00:00').getDay();
      var idx = dow - 1;
      if (idx < 0 || idx > 4) return;
      var p = Number(t.pnl) || 0;
      var b = buckets[idx];
      b.count++; b.net += p;
      if (p > 0) { b.wins++; b.gw += p; }
      else if (p < 0) { b.gl += Math.abs(p); }
    });
    var maxCount = Math.max.apply(null, buckets.map(function (b) { return b.count; }).concat([1]));
    var barsHtml = buckets.map(function (b, i) {
      var pctW = b.count ? Math.max(24, Math.round(b.count / maxCount * 100)) : 3;
      var wr = b.count ? Math.round(b.wins / b.count * 100) : 0;
      var pf = b.gl > 0 ? (b.gw / b.gl) : (b.gw > 0 ? Infinity : null);
      var pfLabel = pf === null ? '' : (pf === Infinity ? '∞' : pf.toFixed(2));
      var profitable = b.net > 0;
      var barColor = b.count === 0 ? 'var(--line-soft)' : (profitable ? 'var(--gain)' : 'var(--loss)');
      var pfText = b.count === 0 ? '' :
        '<div style="position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); text-align:center; font-family:var(--font-mono); font-size:12px; font-weight:700; color:#08090D;">' + pfLabel + '</div>';
      return '<div style="display:flex; flex-direction:column; align-items:center; flex:1; gap:6px;">' +
        '<div style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim);">' + (b.count ? b.count : '') + '</div>' +
        '<div style="width:100%; height:130px; display:flex; align-items:flex-end;">' +
        '<div style="position:relative; width:100%; height:' + pctW + '%; background:' + barColor + '; border-radius:6px 6px 3px 3px; opacity:' + (b.count ? '0.92' : '0.3') + ';">' + pfText + '</div>' +
        '</div>' +
        '<div style="font-family:var(--font-mono); font-size:11px; color:var(--text-faint);">' + labels[i] + '</div>' +
        '<div style="font-size:10px; color:var(--text-faint);">' + (b.count ? wr + '% WR' : '—') + '</div>' +
        '</div>';
    }).join('');
    return '<div style="display:flex; gap:14px; align-items:flex-end; padding-top:6px;">' + barsHtml + '</div>' +
      '<div style="margin-top:12px; font-size:10.5px; color:var(--text-faint); text-align:center;">Number in each bar is that day\'s profit factor · bar height is trade count · green = net profitable</div>';
  }

  function edgeFactor(s) {
    if (!s.count) return null;
    var winScore = Math.max(0, Math.min(100, (s.winRate / 60) * 100));
    var pfVal = s.profitFactor === Infinity ? 3 : (s.profitFactor || 0);
    var pfScore = Math.max(0, Math.min(100, (pfVal / 2) * 100));
    var rrVal = s.avgRR === null ? 0 : s.avgRR;
    var rrScore = Math.max(0, Math.min(100, (rrVal / 2) * 100));

    var byDay = {};
    active(state.trades).forEach(function (t) { byDay[t.date] = (byDay[t.date] || 0) + (Number(t.pnl) || 0); });
    var dayVals = Object.keys(byDay).map(function (k) { return byDay[k]; });
    var profitDays = dayVals.filter(function (v) { return v > 0; });
    var totalProfit = profitDays.reduce(function (a, b) { return a + b; }, 0);
    var biggestDay = profitDays.length ? Math.max.apply(null, profitDays) : 0;
    var concentration = totalProfit > 0 ? biggestDay / totalProfit : 1;
    var consistencyScore = Math.max(0, Math.min(100, (1 - concentration) * 130));

    var losses = active(state.trades).filter(function (t) { return Number(t.pnl) < 0; }).map(function (t) { return Math.abs(Number(t.pnl)); });
    var worstLoss = losses.length ? Math.max.apply(null, losses) : 0;
    var riskScore = (s.avgLoss > 0 && worstLoss > 0) ? Math.max(0, Math.min(100, 100 - ((worstLoss / s.avgLoss) - 1) * 45)) : 60;

    var overall = Math.round(winScore * 0.20 + pfScore * 0.28 + rrScore * 0.20 + consistencyScore * 0.16 + riskScore * 0.16);
    return {
      overall: overall,
      parts: [
        { label: 'Win rate', score: Math.round(winScore), detail: s.winRate.toFixed(1) + '%' },
        { label: 'Profit factor', score: Math.round(pfScore), detail: (s.profitFactor == null ? '—' : (s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2))) },
        { label: 'Risk:reward', score: Math.round(rrScore), detail: (s.avgRR == null ? '—' : s.avgRR.toFixed(2) + 'R') },
        { label: 'Consistency', score: Math.round(consistencyScore), detail: Math.round(concentration * 100) + '% from best day' },
        { label: 'Risk control', score: Math.round(riskScore), detail: 'worst ' + fmtMoney(worstLoss) }
      ]
    };
  }

  function edgeFactorPanel(s) {
    var ef = edgeFactor(s);
    if (!ef) return '<div style="color:var(--text-faint); font-size:12.5px;">No trades yet</div>';
    var band = ef.overall >= 70 ? { t: 'Strong', c: 'var(--gain)' }
      : ef.overall >= 50 ? { t: 'Developing', c: 'var(--warn)' }
        : { t: 'Needs work', c: 'var(--loss)' };
    var R = 52, C = 2 * Math.PI * R;
    var dash = (ef.overall / 100) * C;
    var ring =
      '<svg viewBox="0 0 140 140" style="width:132px; height:132px; flex-shrink:0;">' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--surface-3)" stroke-width="10"/>' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + band.c + '" stroke-width="10" stroke-linecap="round" ' +
      'stroke-dasharray="' + dash.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="66" text-anchor="middle" fill="var(--text)" font-family="JetBrains Mono, monospace" font-size="30" font-weight="700">' + ef.overall + '</text>' +
      '<text x="70" y="88" text-anchor="middle" fill="' + band.c + '" font-family="Inter, sans-serif" font-size="11" font-weight="600">' + band.t + '</text>' +
      '</svg>';
    var bars = ef.parts.map(function (p) {
      var c = p.score >= 70 ? 'var(--gain)' : (p.score >= 45 ? 'var(--warn)' : 'var(--loss)');
      return '<div style="margin-bottom:9px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:4px;">' +
        '<span style="color:var(--text-dim);">' + p.label + '</span>' +
        '<span style="font-family:var(--font-mono); color:var(--text-faint);">' + esc(p.detail) + '</span>' +
        '</div>' +
        '<div class="meter" style="margin:0; height:5px;"><div style="width:' + p.score + '%; background:' + c + ';"></div></div>' +
        '</div>';
    }).join('');
    return '<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">' + ring + '<div style="flex:1; min-width:190px;">' + bars + '</div></div>';
  }

  function equityCurveSvg(s) {
    if (!s.sorted || !s.sorted.length) return '<div style="color:var(--text-faint); font-size:12.5px;">Log trades to see your curve</div>';
    var cum = 0, pts = [0];
    s.sorted.forEach(function (t) { cum += Number(t.pnl) || 0; pts.push(cum); });
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    var range = (max - min) || 1;
    var w = 560, h = 180, pad = 14;
    var step = (w - pad * 2) / (pts.length - 1 || 1);
    var d = pts.map(function (v, i) {
      var x = pad + i * step;
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
    var color = cum >= 0 ? '#6FA88A' : '#C1614A';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%; height:190px;">' +
      '<line x1="' + pad + '" y1="' + zeroY.toFixed(1) + '" x2="' + (w - pad) + '" y2="' + zeroY.toFixed(1) + '" stroke="#242B34" stroke-dasharray="3 4"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
      '</svg>';
  }

  function installBanner() {
    if (state.installDismissed) return '';
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return '';
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      return '<div class="install-banner"><div class="ib-text"><b>Install this journal as an app.</b> Tap the Share icon in Safari, then "Add to Home Screen" — it opens full-screen, works offline, and syncs via Google Drive.</div>' +
        '<button class="btn-ghost" id="installDismissBtn">Got it</button></div>';
    }
    if (state.deferredInstallPrompt) {
      return '<div class="install-banner"><div class="ib-text"><b>Install this journal as an app.</b> Get an icon on your desktop / start menu, full-screen, and offline-capable.</div>' +
        '<button class="btn-primary" style="width:auto;" id="installNowBtn">Install</button></div>';
    }
    return '';
  }
  function bindInstallBanner() {
    var dismiss = $('#installDismissBtn');
    if (dismiss) dismiss.addEventListener('click', function () { state.installDismissed = true; render(); });
    var install = $('#installNowBtn');
    if (install) install.addEventListener('click', function () {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      state.deferredInstallPrompt.userChoice.finally(function () { state.deferredInstallPrompt = null; render(); });
    });
  }

  // ==========================================================================
  // Trade Log
  // ==========================================================================
  var logSearch = '';
  function renderLog(main) {
    var trades = active(state.trades).slice().sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); });
    if (logSearch) {
      var q = logSearch.toLowerCase();
      trades = trades.filter(function (t) {
        return (t.symbol || '').toLowerCase().indexOf(q) > -1 ||
          (t.tags || []).join(' ').toLowerCase().indexOf(q) > -1 ||
          (t.notes || '').toLowerCase().indexOf(q) > -1;
      });
    }
    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Trade Log</div><div class="page-sub">' + active(state.trades).length + ' total trades</div></div></div>' +
      '<div class="log-toolbar"><input class="search-input" id="logSearchInput" placeholder="Search symbol, tag, or note…" value="' + esc(logSearch) + '"></div>' +
      (trades.length ? logTable(trades) :
        '<div class="panel"><div class="empty-state"><div class="em-title">' + (logSearch ? 'No matches' : 'Nothing logged yet') + '</div>' +
        '<div class="em-sub">' + (logSearch ? 'Try a different search term.' : 'Every trade you log builds your track record.') + '</div></div></div>');

    $('#logSearchInput').addEventListener('input', function (e) { logSearch = e.target.value; renderLog(main); });
    $('#logSearchInput').focus();
    $('#logSearchInput').selectionStart = $('#logSearchInput').value.length;
    $all('.trade-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.row-del')) return;
        var id = row.dataset.id;
        var t = state.trades.find(function (x) { return x.id === id; });
        if (t) openTradeModal(t);
      });
    });
    $all('.row-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        if (confirm('Delete this trade? This cannot be undone.')) deleteTrade(id);
      });
    });
  }

  function logTable(trades) {
    return '<div class="panel" style="overflow-x:auto;"><table class="trade-table"><thead><tr>' +
      '<th>Date</th><th>Symbol</th><th>Dir</th><th>Size</th><th>Entry</th><th>Exit</th><th>Tags</th><th>P&amp;L</th><th></th>' +
      '</tr></thead><tbody>' +
      trades.map(function (t) {
        var cls = Number(t.pnl) > 0 ? 'gain' : (Number(t.pnl) < 0 ? 'loss' : '');
        return '<tr class="trade-row" data-id="' + t.id + '">' +
          '<td>' + fmtDate(t.date) + '</td>' +
          '<td style="font-weight:600;">' + esc(t.symbol) + '</td>' +
          '<td><span class="dir-pill ' + t.direction + '">' + t.direction.toUpperCase() + '</span></td>' +
          '<td>' + (t.size != null && t.size !== '' ? esc(t.size) : '—') + '</td>' +
          '<td>' + (t.entry != null && t.entry !== '' ? esc(t.entry) : '—') + '</td>' +
          '<td>' + (t.exit != null && t.exit !== '' ? esc(t.exit) : '—') + '</td>' +
          '<td>' + (t.tags || []).map(function (tag) { return '<span class="tag-chip">' + esc(tag) + '</span>'; }).join('') + '</td>' +
          '<td class="pnl-cell ' + cls + '">' + fmtMoney(t.pnl) + '</td>' +
          '<td><button class="row-del" data-id="' + t.id + '" title="Delete">✕</button></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  async function importSpreadsheetTrades() {
    var alreadyIn = state.trades.some(function (t) { return t.id.indexOf('imp_') === 0; });
    if (alreadyIn) { toast('These trades are already imported'); return; }
    var net = IMPORTED_TRADES.reduce(function (s, t) { return s + t.pnl; }, 0);
    var ok = confirm(
      'Import ' + IMPORTED_TRADES.length + ' trades from your ES futures history?\n\n' +
      'ES futures, Jan 2 – Aug 11 2026\n' +
      'Net P&L: ' + fmtMoney(net) + '\n\n' +
      'A couple of rows had inconsistencies in the original sheet (a mistyped price, and one trade whose P&L didn\'t match its price move) — these are imported as recorded, with a note flagged on that trade so you can double check it.'
    );
    if (!ok) return;
    var now = Date.now();
    var stamped = IMPORTED_TRADES.map(function (t) { return Object.assign({}, t, { updatedAt: now, deleted: false }); });
    state.trades = state.trades.concat(stamped);
    persistLocal();
    scheduleDriveSync();
    toast('Imported ' + IMPORTED_TRADES.length + ' trades');
    render();
  }

  function deleteTrade(id) {
    var t = state.trades.find(function (x) { return x.id === id; });
    if (!t) return;
    t.deleted = true;
    t.deletedAt = Date.now();
    t.updatedAt = Date.now();
    persistLocal();
    scheduleDriveSync();
    deleteScreenshotLocal(id);
    toast('Trade deleted');
    render();
  }

  // ==========================================================================
  // Calendar
  // ==========================================================================
  function renderCalendar(main) {
    var y = state.calMonth.getFullYear(), m = state.calMonth.getMonth();
    var first = new Date(y, m, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var byDay = {};
    active(state.trades).forEach(function (t) {
      if (!byDay[t.date]) byDay[t.date] = { net: 0, count: 0 };
      byDay[t.date].net += Number(t.pnl) || 0;
      byDay[t.date].count++;
    });
    var maxAbs = 1;
    Object.keys(byDay).forEach(function (k) {
      var d = new Date(k + 'T00:00:00');
      if (d.getFullYear() === y && d.getMonth() === m) maxAbs = Math.max(maxAbs, Math.abs(byDay[k].net));
    });

    var cells = '';
    for (var i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var info = byDay[dateStr];
      var style = '', pnlHtml = '', countHtml = '', hasCls = '';
      if (info) {
        hasCls = 'has-trades';
        var alpha = 0.12 + Math.min(0.55, Math.abs(info.net) / maxAbs * 0.55);
        var color = info.net >= 0 ? '111,168,138' : '193,97,74';
        style = 'background:rgba(' + color + ',' + alpha.toFixed(2) + '); border-color:rgba(' + color + ',0.4);';
        pnlHtml = '<div class="cal-pnl" style="color:' + (info.net >= 0 ? 'var(--gain)' : 'var(--loss)') + '">' + fmtMoney(info.net) + '</div>';
        countHtml = '<div class="cal-count">' + info.count + ' trade' + (info.count > 1 ? 's' : '') + '</div>';
      }
      var sel = state.calSelectedDay === dateStr ? 'selected' : '';
      cells += '<div class="cal-cell ' + hasCls + ' ' + sel + '" style="' + style + '" data-date="' + dateStr + '">' +
        '<div class="cal-daynum">' + day + '</div>' + pnlHtml + countHtml +
        '</div>';
    }

    var monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Calendar</div><div class="page-sub">Daily P&amp;L at a glance</div></div>' +
      '<div class="cal-nav"><button id="calPrev">←</button><div class="cal-month-label">' + monthLabel + '</div><button id="calNext">→</button></div></div>' +
      '<div class="panel">' +
      '<div class="cal-grid">' +
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('') +
      cells +
      '</div>' +
      '<div class="cal-detail" id="calDetail"></div>' +
      '</div>';

    $('#calPrev').addEventListener('click', function () { state.calMonth = new Date(y, m - 1, 1); state.calSelectedDay = null; renderCalendar(main); });
    $('#calNext').addEventListener('click', function () { state.calMonth = new Date(y, m + 1, 1); state.calSelectedDay = null; renderCalendar(main); });
    $all('.cal-cell.has-trades').forEach(function (cell) {
      cell.addEventListener('click', function () { state.calSelectedDay = cell.dataset.date; renderCalendar(main); });
    });
    if (state.calSelectedDay) renderCalDetail(state.calSelectedDay);
  }

  function renderCalDetail(dateStr) {
    var trades = active(state.trades).filter(function (t) { return t.date === dateStr; });
    var el = $('#calDetail');
    if (!el) return;
    if (!trades.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="panel-title" style="margin-top:14px;">' + fmtDate(dateStr) + '</div>' + logTable(trades);
    $all('.trade-row', el).forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.row-del')) return;
        var id = row.dataset.id;
        var t = state.trades.find(function (x) { return x.id === id; });
        if (t) openTradeModal(t);
      });
    });
    $all('.row-del', el).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Delete this trade?')) deleteTrade(btn.dataset.id);
      });
    });
  }

  // ==========================================================================
  // Trade modal
  // ==========================================================================
  function openTradeModal(trade) {
    var isEdit = !!trade;
    var t = trade || {
      id: uid(), date: todayStr(), time: '', symbol: '', market: 'stock', direction: 'long',
      entry: '', exit: '', size: '', fees: '', pnl: '', tags: [], notes: '', emotion: '', rulesFollowed: null
    };
    var root = $('#modalRoot');
    root.innerHTML =
      '<div class="modal-overlay" id="modalOverlay"><div class="modal">' +
      '<div class="modal-head"><div class="modal-title">' + (isEdit ? 'Edit Trade' : 'New Trade') + '</div><button class="modal-close" id="modalCloseBtn">✕</button></div>' +
      '<form id="tradeForm">' +
      '<div class="form-grid">' +
      field('Date', 'date', 'date', t.date, true) +
      field('Time (optional)', 'time', 'time', t.time) +
      field('Symbol', 'text', 'symbol', t.symbol, true, 'e.g. AAPL, ES, BTCUSD') +
      selectField('Market', 'market', MARKETS.map(function (mm) { return { v: mm.v, l: mm.l }; }), t.market) +
      selectField('Direction', 'direction', [{ v: 'long', l: 'Long' }, { v: 'short', l: 'Short' }], t.direction) +
      field('Size / Qty', 'number', 'size', t.size, false, 'shares, contracts…') +
      field('Entry Price', 'number', 'entry', t.entry) +
      field('Exit Price', 'number', 'exit', t.exit) +
      field('Fees', 'number', 'fees', t.fees) +
      field('P&L ($) — auto or override', 'number', 'pnl', t.pnl, true) +
      '</div>' +
      field('Tags / Strategy (comma separated)', 'text', 'tags', (t.tags || []).join(', '), false, 'breakout, earnings play, ORB', true) +
      selectFieldFull('Mindset while trading', 'emotion', [{ v: '', l: '— none —' }].concat(EMOTIONS.map(function (e) { return { v: e, l: e }; })), t.emotion) +
      selectFieldFull('Account', 'accountId', [{ v: '', l: '— personal / untagged —' }].concat(active(state.accounts).map(function (a) { return { v: a.id, l: a.firm + (a.nickname ? ' · ' + a.nickname : '') }; })), t.accountId || '') +
      '<div class="form-field full-span"><label>Notes</label><textarea id="f_notes" placeholder="What was your thesis? What did you do well or poorly?">' + esc(t.notes || '') + '</textarea></div>' +
      '<div class="form-field full-span"><label>Screenshot</label>' +
      '<div class="file-row"><input type="file" id="f_screenshot" accept="image/*"><span id="shotPreviewWrap"></span></div>' +
      '</div>' +
      '<div class="toggle-row full-span" style="margin-bottom:16px;"><input type="checkbox" id="f_rules" ' + (t.rulesFollowed ? 'checked' : '') + '><label for="f_rules" style="text-transform:none; font-family:inherit; letter-spacing:0; color:var(--text-dim); font-size:12.5px;">I followed my trading plan / rules on this trade</label></div>' +
      '<div class="modal-actions">' +
      '<button type="submit" class="btn-primary" style="width:auto; flex:1;">' + (isEdit ? 'Save Changes' : 'Log Trade') + '</button>' +
      (isEdit ? '<button type="button" class="btn-danger" id="modalDeleteBtn">Delete</button>' : '') +
      '<button type="button" class="btn-ghost" id="modalCancelBtn">Cancel</button>' +
      '</div>' +
      '</form>' +
      '</div></div>';

    var newImageData = null;
    if (isEdit) {
      var existingShot = loadScreenshot(t.id);
      if (existingShot) $('#shotPreviewWrap').innerHTML = '<img src="' + existingShot + '" alt="screenshot">';
    }

    $('#f_screenshot').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        newImageData = ev.target.result;
        $('#shotPreviewWrap').innerHTML = '<img src="' + newImageData + '" alt="screenshot">';
      };
      reader.readAsDataURL(file);
    });

    function closeModal() { root.innerHTML = ''; }
    $('#modalCloseBtn').addEventListener('click', closeModal);
    $('#modalCancelBtn').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', function (e) { if (e.target.id === 'modalOverlay') closeModal(); });
    if (isEdit) {
      $('#modalDeleteBtn').addEventListener('click', function () {
        if (confirm('Delete this trade? This cannot be undone.')) { closeModal(); deleteTrade(t.id); }
      });
    }

    ['f_entry', 'f_exit', 'f_size', 'f_fees', 'f_direction'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('input', function () {
        var entry = parseFloat($('#f_entry').value);
        var exit = parseFloat($('#f_exit').value);
        var size = parseFloat($('#f_size').value);
        var fees = parseFloat($('#f_fees').value) || 0;
        var dir = $('#f_direction').value;
        if (!isNaN(entry) && !isNaN(exit) && !isNaN(size)) {
          var raw = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
          $('#f_pnl').value = (raw - fees).toFixed(2);
        }
      });
    });

    $('#tradeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var newTrade = {
        id: t.id,
        date: $('#f_date').value,
        time: $('#f_time').value,
        symbol: ($('#f_symbol').value || '').toUpperCase().trim(),
        market: $('#f_market').value,
        direction: $('#f_direction').value,
        entry: $('#f_entry').value,
        exit: $('#f_exit').value,
        size: $('#f_size').value,
        fees: $('#f_fees').value,
        pnl: parseFloat($('#f_pnl').value) || 0,
        tags: $('#f_tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
        notes: $('#f_notes').value,
        emotion: $('#f_emotion').value,
        accountId: $('#f_accountId').value,
        rulesFollowed: $('#f_rules').checked,
        updatedAt: Date.now(),
        deleted: false
      };
      if (!newTrade.date || !newTrade.symbol) { toast('Date and symbol are required', true); return; }
      var idx = state.trades.findIndex(function (x) { return x.id === t.id; });
      if (idx > -1) state.trades[idx] = newTrade; else state.trades.push(newTrade);
      persistLocal();
      scheduleDriveSync();
      if (newImageData) saveScreenshot(t.id, newImageData);
      closeModal();
      toast(isEdit ? 'Trade updated' : 'Trade logged');
      render();
    });
  }

  function field(label, type, name, val, required, placeholder, full) {
    return '<div class="form-field' + (full ? ' full-span' : '') + '"><label>' + esc(label) + '</label>' +
      '<input type="' + type + '" id="f_' + name + '" ' + (required ? 'required' : '') + ' value="' + esc(val == null ? '' : val) + '" ' + (placeholder ? 'placeholder="' + esc(placeholder) + '"' : '') + ' step="any">' +
      '</div>';
  }
  function selectField(label, name, options, val) {
    return '<div class="form-field"><label>' + esc(label) + '</label><select id="f_' + name + '">' +
      options.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === val ? 'selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') +
      '</select></div>';
  }
  function selectFieldFull(label, name, options, val) {
    return '<div class="form-field full-span"><label>' + esc(label) + '</label><select id="f_' + name + '">' +
      options.map(function (o) { return '<option value="' + o.v + '" ' + (o.v === val ? 'selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') +
      '</select></div>';
  }

  // ==========================================================================
  // Tilt / behavior after a loss
  // ==========================================================================
  function tiltPanel(s) {
    if (!s.sorted || s.sorted.length < 4) return '<div style="color:var(--text-faint); font-size:12.5px;">Not enough trades to read a pattern yet.</div>';
    var afterLoss = { count: 0, wins: 0, net: 0 };
    var afterWin = { count: 0, wins: 0, net: 0 };
    var afterTwoLosses = { count: 0, wins: 0, net: 0 };
    var consecLoss = 0;
    for (var i = 1; i < s.sorted.length; i++) {
      var prev = Number(s.sorted[i - 1].pnl) || 0;
      var cur = Number(s.sorted[i].pnl) || 0;
      consecLoss = prev < 0 ? consecLoss + 1 : 0;
      var target = prev < 0 ? afterLoss : (prev > 0 ? afterWin : null);
      if (target) { target.count++; target.net += cur; if (cur > 0) target.wins++; }
      if (consecLoss >= 2) { afterTwoLosses.count++; afterTwoLosses.net += cur; if (cur > 0) afterTwoLosses.wins++; }
    }
    function row(label, b, note) {
      if (!b.count) return '';
      var wr = Math.round(b.wins / b.count * 100);
      var cls = b.net >= 0 ? 'gain' : 'loss';
      return '<div style="padding:11px 0; border-bottom:1px solid var(--line-soft);">' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline;">' +
        '<span style="font-size:13px;">' + label + '</span>' +
        '<span style="font-family:var(--font-mono); font-weight:600; font-size:14px; color:var(--' + cls + ');">' + fmtMoney(b.net) + '</span>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; margin-top:4px;">' +
        '<span style="font-size:11px; color:var(--text-faint);">' + b.count + ' trades · ' + wr + '% win rate</span>' +
        (note ? '<span style="font-size:11px; color:var(--text-faint);">' + note + '</span>' : '') +
        '</div>' +
        '</div>';
    }
    var wrLoss = afterLoss.count ? afterLoss.wins / afterLoss.count * 100 : 0;
    var wrWin = afterWin.count ? afterWin.wins / afterWin.count * 100 : 0;
    var gap = wrWin - wrLoss;
    var verdict = '';
    if (afterLoss.count >= 4 && afterWin.count >= 4) {
      if (gap >= 12) {
        verdict = '<div style="margin-top:12px; padding:10px 12px; background:var(--loss-dim); border-radius:8px; font-size:12px; color:var(--loss); line-height:1.5;">Your win rate drops ' + Math.round(gap) + ' points after a loss. That gap is the clearest tilt signal in your data — consider a hard rule to step away after one red trade.</div>';
      } else if (gap <= -8) {
        verdict = '<div style="margin-top:12px; padding:10px 12px; background:var(--warn-dim); border-radius:8px; font-size:12px; color:var(--warn); line-height:1.5;">You actually trade better after a loss than after a win — watch for overconfidence following green trades instead.</div>';
      } else {
        verdict = '<div style="margin-top:12px; padding:10px 12px; background:var(--gain-dim); border-radius:8px; font-size:12px; color:var(--gain); line-height:1.5;">Your results hold steady regardless of the previous trade. That emotional consistency is a real edge — protect it.</div>';
      }
    }
    return row('Next trade after a win', afterWin) + row('Next trade after a loss', afterLoss) +
      row('After 2+ losses in a row', afterTwoLosses, 'revenge-trade window') + verdict;
  }

  // ==========================================================================
  // Session brief
  // ==========================================================================
  function sessionBrief(s) {
    var today = new Date();
    var dow = today.getDay();
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var todayIso = todayStr();
    var todaysEvents = folderEvents('both').filter(function (e) { return e.date === todayIso; });

    var wd = { count: 0, wins: 0, net: 0 };
    active(state.trades).forEach(function (t) {
      if (new Date(t.date + 'T00:00:00').getDay() === dow) { wd.count++; wd.net += Number(t.pnl) || 0; if (Number(t.pnl) > 0) wd.wins++; }
    });

    var recent = (s.sorted || []).slice(-5);
    var recentNet = recent.reduce(function (a, t) { return a + (Number(t.pnl) || 0); }, 0);
    var lastWasLoss = recent.length && Number(recent[recent.length - 1].pnl) < 0;

    var riskTone, toneColor, toneWhy;
    var highImpactToday = todaysEvents.filter(function (e) { return e.impact === 'High'; });
    if (highImpactToday.length && lastWasLoss) {
      riskTone = 'Defensive'; toneColor = 'var(--loss)';
      toneWhy = 'High-impact data today and you\'re coming off a loss — the two conditions that historically pair worst.';
    } else if (highImpactToday.length) {
      riskTone = 'Cautious'; toneColor = 'var(--warn)';
      toneWhy = 'High-impact release on the calendar. Expect wider spreads and false breaks around the print.';
    } else if (lastWasLoss) {
      riskTone = 'Reset'; toneColor = 'var(--warn)';
      toneWhy = 'Last trade was red. Check your after-a-loss numbers below before sizing up.';
    } else {
      riskTone = 'Normal'; toneColor = 'var(--gain)';
      toneWhy = 'No high-impact events flagged and recent form is intact. Trade your plan.';
    }

    var eventsHtml = todaysEvents.length
      ? todaysEvents.slice(0, 7).map(function (e) {
        return '<div style="display:flex; align-items:center; gap:9px; padding:5px 0;">' +
          impactDot(e.impact) +
          '<span style="font-family:var(--font-mono); font-size:11px; color:var(--text-faint); width:62px;">' + esc(e.time) + '</span>' +
          '<span style="font-size:9px; font-weight:700; color:var(--text-faint); width:26px;">' + esc(e.cur) + '</span>' +
          '<span style="font-size:12.5px; flex:1;">' + esc(e.title) + '</span>' +
          '</div>';
      }).join('')
      : '<div style="font-size:12.5px; color:var(--text-faint);">No red or orange folder events today.</div>';

    var wdLine = wd.count
      ? dayNames[dow] + 's: ' + wd.count + ' trades, ' + Math.round(wd.wins / wd.count * 100) + '% win rate, ' + fmtMoney(wd.net) + ' net.'
      : 'No history on ' + dayNames[dow] + 's yet.';

    return '<div class="panel" style="border-color:var(--accent-dim); background:linear-gradient(160deg, var(--accent-dim), transparent 65%);">' +
      '<div class="panel-title" style="color:var(--accent-2);">Session brief · ' + dayNames[dow] + '</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">' +
      '<div>' +
      '<div style="font-size:11px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px;">Risk tone</div>' +
      '<div style="font-size:20px; font-weight:700; color:' + toneColor + '; margin-bottom:8px;">' + riskTone + '</div>' +
      '<div style="font-size:12.5px; color:var(--text-dim); line-height:1.55;">' + toneWhy + '</div>' +
      '<div style="font-size:12px; color:var(--text-faint); margin-top:12px; line-height:1.55;">' + esc(wdLine) + '<br>Last 5 trades: <span style="font-family:var(--font-mono); color:' + (recentNet >= 0 ? 'var(--gain)' : 'var(--loss)') + '">' + fmtMoney(recentNet) + '</span></div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size:11px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px;">On the calendar today</div>' +
      eventsHtml +
      '</div>' +
      '</div>' +
      '<div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--line-soft); font-size:10.5px; color:var(--text-faint);">Context from your own history and the week\'s scheduled releases. Not a signal, not a directional call.</div>' +
      '</div>';
  }

  // ==========================================================================
  // Macro calendar (live Forex Factory feed with graceful fallback)
  // ==========================================================================
  var FF_FEEDS = [
    'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json'
  ];
  var CORS_RELAYS = [
    function (u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); },
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); }
  ];
  var CAL_TTL_MS = 6 * 60 * 60 * 1000;
  var FALLBACK_EVENTS = [
    { date: '2026-08-11', time: '12:30am', title: 'Cash Rate', impact: 'High', cur: 'AUD' },
    { date: '2026-08-12', time: '8:30am', title: 'CPI m/m', impact: 'High', cur: 'USD' },
    { date: '2026-08-12', time: '8:30am', title: 'Core CPI m/m', impact: 'High', cur: 'USD' },
    { date: '2026-08-13', time: '8:30am', title: 'PPI m/m', impact: 'High', cur: 'USD' },
    { date: '2026-08-13', time: '8:30am', title: 'Unemployment Claims', impact: 'Medium', cur: 'USD' },
    { date: '2026-08-14', time: '8:30am', title: 'Retail Sales m/m', impact: 'Medium', cur: 'USD' },
    { date: '2026-08-14', time: '10:00am', title: 'Prelim UoM Consumer Sentiment', impact: 'Medium', cur: 'USD' }
  ];

  function normalizeFFEvent(raw) {
    var d = new Date(raw.date);
    if (isNaN(d.getTime())) return null;
    var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return { date: iso, time: time, ts: d.getTime(), title: raw.title || '', impact: raw.impact || 'Low', cur: raw.country || '', forecast: raw.forecast || '', previous: raw.previous || '' };
  }
  async function tryFetchJson(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var txt = await res.text();
    if (txt.indexOf('Request Denied') > -1 || txt.trim().charAt(0) === '<') throw new Error('rate limited');
    return JSON.parse(txt);
  }
  async function fetchCalendar(force) {
    if (!force) {
      var cached = LocalStore.get('calendar');
      if (cached && Date.now() - cached.fetchedAt < CAL_TTL_MS && cached.events && cached.events.length) {
        state.calendar = cached.events;
        state.calendarMeta = { fetchedAt: cached.fetchedAt, source: cached.source, live: true };
        return;
      }
    }
    var routes = [];
    FF_FEEDS.forEach(function (feed) {
      routes.push({ label: 'Forex Factory', url: feed });
      CORS_RELAYS.forEach(function (mk) { routes.push({ label: 'Forex Factory (via relay)', url: mk(feed) }); });
    });
    for (var i = 0; i < routes.length; i++) {
      try {
        var data = await tryFetchJson(routes[i].url);
        if (Array.isArray(data) && data.length) {
          var events = data.map(normalizeFFEvent).filter(Boolean);
          state.calendar = events;
          state.calendarMeta = { fetchedAt: Date.now(), source: routes[i].label, live: true };
          LocalStore.set('calendar', { fetchedAt: Date.now(), source: routes[i].label, events: events });
          return;
        }
      } catch (e) { /* try next route */ }
    }
    state.calendar = FALLBACK_EVENTS.map(function (e) {
      return { date: e.date, time: e.time, ts: new Date(e.date + 'T12:00:00').getTime(), title: e.title, impact: e.impact, cur: e.cur, forecast: '', previous: '' };
    });
    state.calendarMeta = { fetchedAt: null, source: 'offline snapshot', live: false };
  }

  function folderEvents(minImpact) {
    var cal = state.calendar || [];
    var want = minImpact === 'high' ? ['High'] : ['High', 'Medium'];
    var curFilter = state.calCurrency || 'ALL';
    return cal.filter(function (e) {
      if (want.indexOf(e.impact) === -1) return false;
      if (curFilter !== 'ALL' && e.cur !== curFilter) return false;
      return true;
    }).sort(function (a, b) { return a.ts - b.ts; });
  }
  function impactDot(impact) {
    var color = impact === 'High' ? 'var(--loss)' : (impact === 'Medium' ? 'var(--warn)' : 'var(--text-faint)');
    var title = impact === 'High' ? 'red folder' : (impact === 'Medium' ? 'orange folder' : 'low impact');
    return '<span title="' + title + '" style="display:inline-block; width:9px; height:11px; border-radius:2px 3px 3px 2px; background:' + color + '; flex-shrink:0;"></span>';
  }

  var EVENT_DEFS = window.CoachEngine ? window.CoachEngine.EVENT_DEFS.map(function (d) {
    return { key: d.key, impact: /fomc|cpi|nfp|pce/i.test(d.key) ? 'high' : (/ppi|gdp|claims|pmi|retail|ecb/i.test(d.key) ? 'med' : 'low'), match: d.match };
  }) : [];
  function eventsForTrade(t) { return window.CoachEngine ? window.CoachEngine.eventsForTrade(t) : []; }

  // General educational context on what each release is and how it has historically
  // tended to ripple through equity index futures. This is background on typical
  // market mechanics, not a prediction or signal for any specific upcoming print.
  var EVENT_INFO = {
    'FOMC': "The Fed's rate decision and Powell press conference. Markets reprice the expected rate path around this event, and hawkish or dovish surprises can move all three indices sharply within minutes of the statement and again during Q&A. NQ tends to see the largest swings since higher-duration mega-cap tech is most sensitive to rate expectations; YM (industrials/financials-heavy) is usually the most muted; ES sits in between as the broad benchmark.",
    'CPI': "Monthly inflation report. A hotter-than-expected print raises the odds of higher-for-longer rates and tends to pressure all three indices — again hardest on NQ given its long-duration growth concentration. A cooler print is typically read as dovish and can lift index futures broadly, with more value-tilted YM sometimes lagging the rally NQ sees.",
    'NFP': "The monthly jobs report. A much-stronger-than-expected number cuts both ways: read as economic strength, but also as reducing the case for rate cuts, which can weigh more on growth-heavy NQ than value-tilted YM. A weak number raises growth concerns but also rate-cut odds, so the net effect on ES/NQ/YM depends on which narrative dominates that session.",
    'PPI': "Producer-side inflation — a leading indicator for consumer inflation (CPI) and corporate margins. Usually less market-moving than CPI alone, but a surprise can shift rate expectations in a similar direction: hot prints tend to pressure NQ more than YM.",
    'GDP': "Quarterly growth data. Strong GDP tends to support cyclical/value names (YM) but can pressure long-duration growth (NQ) if it reinforces a higher-for-longer rate view. Weak GDP raises growth-scare risk across all three, typically hitting YM's more cyclical components hardest.",
    'Claims': "Weekly initial and continuing jobless claims — a higher-frequency read on labor health between NFP reports. Rising claims can be read as an early recession signal (broadly negative for ES/NQ/YM) or as disinflationary and rate-cut-supportive (can be mildly positive, especially for rate-sensitive NQ) — the reaction usually depends on the market's prevailing narrative that week.",
    'PMI': "Manufacturing and services purchasing-manager surveys — forward-looking gauges of business activity. A strong services print has historically moved rate expectations more than manufacturing (services inflation is stickier), so surprises there can move NQ and ES more than the more industrially-weighted YM; a weak manufacturing print can weigh on YM's industrial names specifically.",
    'PCE': "The Fed's preferred inflation gauge. Mechanically similar to CPI but carries more direct weight in Fed decision-making, so surprises here can move rate expectations — and NQ in particular — even more directly than a CPI surprise.",
    'Retail Sales': "Consumer spending data, a read on economic and consumer health. Strong sales tend to support cyclical/value names (YM) but, like GDP, can pressure NQ if it reinforces higher-for-longer rate expectations. Weak sales raise growth-scare risk broadly across ES/NQ/YM.",
    'JOLTS/ADP': "Job openings (JOLTS) and private payrolls (ADP) — earlier, noisier previews of the labor market ahead of NFP. Historically a smaller market reaction than NFP itself, but can still nudge rate expectations modestly into the bigger release.",
    'ECB / BOE': "European Central Bank / Bank of England rate decisions. These primarily move European indices and EUR/GBP directly, but can spill into US index futures (ES/NQ/YM) through the rates and dollar channel, especially when the decision or guidance surprises versus expectations."
  };

  function macroStats() {
    var byEvent = {};
    var newsDay = { count: 0, wins: 0, net: 0 };
    var quietDay = { count: 0, wins: 0, net: 0 };
    active(state.trades).forEach(function (t) {
      var evs = eventsForTrade(t);
      var pnl = Number(t.pnl) || 0;
      var isWin = pnl > 0;
      var bucket = evs.length ? newsDay : quietDay;
      bucket.count++; bucket.net += pnl; if (isWin) bucket.wins++;
      evs.forEach(function (e) {
        if (!byEvent[e]) byEvent[e] = { key: e, count: 0, wins: 0, net: 0 };
        byEvent[e].count++; byEvent[e].net += pnl; if (isWin) byEvent[e].wins++;
      });
    });
    var list = Object.values(byEvent).sort(function (a, b) { return b.count - a.count; });
    return { byEvent: list, newsDay: newsDay, quietDay: quietDay };
  }

  function renderMacro(main) {
    var m = macroStats();
    if (!active(state.trades).length) {
      main.innerHTML =
        '<div class="page-head"><div><div class="page-title">Macro Calendar</div><div class="page-sub">How you actually trade around the news</div></div></div>' +
        weekCalendarPanel() +
        '<div class="panel"><div class="empty-state"><div class="em-title">No trades to read yet</div>' +
        '<div class="em-sub">Log trades and mention the day\'s events in the notes field (FOMC, CPI, NFP…). This page reads those notes automatically and shows which events you trade well and which ones cost you.</div></div></div>';
      bindCalendarControls();
      return;
    }
    function cmp(a, b) {
      var awr = a.count ? Math.round(a.wins / a.count * 100) : 0;
      var bwr = b.count ? Math.round(b.wins / b.count * 100) : 0;
      return '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">' + panelStat('News-event days', a, awr) + panelStat('Quiet days', b, bwr) + '</div>';
    }
    function panelStat(label, b, wr) {
      var cls = b.net >= 0 ? 'gain' : 'loss';
      return '<div style="background:var(--surface-2); border:1px solid var(--line-soft); border-radius:10px; padding:14px 16px;">' +
        '<div class="stat-label">' + label + '</div>' +
        '<div class="stat-value ' + cls + '" style="font-size:19px;">' + fmtMoney(b.net) + '</div>' +
        '<div class="stat-note">' + b.count + ' trades · ' + wr + '% win rate</div>' +
        '</div>';
    }
    var maxCount = Math.max.apply(null, m.byEvent.map(function (e) { return e.count; }).concat([1]));
    var rows = m.byEvent.map(function (e) {
      var wr = e.count ? Math.round(e.wins / e.count * 100) : 0;
      var cls = e.net >= 0 ? 'gain' : 'loss';
      var def = EVENT_DEFS.filter(function (d) { return d.key === e.key; })[0];
      var impact = def ? def.impact : 'low';
      var badgeCls = impact === 'high' ? 'bad' : (impact === 'med' ? 'warn' : 'neutral');
      var pctW = Math.max(5, Math.round(e.count / maxCount * 100));
      return '<div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line-soft);">' +
        '<div style="width:96px; flex-shrink:0; font-size:13px; font-weight:600;">' + esc(e.key) + '</div>' +
        '<div style="width:52px; flex-shrink:0;"><span class="badge ' + badgeCls + '">' + impact + '</span></div>' +
        '<div style="flex:1; min-width:60px;"><div class="meter"><div style="width:' + pctW + '%; background:var(--' + cls + ');"></div></div></div>' +
        '<div style="width:64px; text-align:right; font-family:var(--font-mono); font-size:12px; color:var(--text-dim);">' + e.count + '×</div>' +
        '<div style="width:52px; text-align:right; font-family:var(--font-mono); font-size:12px; color:' + (wr >= 50 ? 'var(--gain)' : 'var(--loss)') + ';">' + wr + '%</div>' +
        '<div style="width:88px; text-align:right; font-family:var(--font-mono); font-size:13px; font-weight:600; color:var(--' + cls + ');">' + fmtMoney(e.net) + '</div>' +
        '</div>';
    }).join('');

    var worst = m.byEvent.slice().filter(function (e) { return e.count >= 3; }).sort(function (a, b) { return a.net - b.net; })[0];
    var best = m.byEvent.slice().filter(function (e) { return e.count >= 3; }).sort(function (a, b) { return b.net - a.net; })[0];
    var insight = '';
    if (best && worst && best.key !== worst.key) {
      insight = '<div class="panel" style="border-color:var(--accent-dim); background:linear-gradient(180deg, var(--accent-dim), transparent);">' +
        '<div class="panel-title" style="color:var(--accent-2);">What your data says</div>' +
        '<div style="font-size:13.5px; line-height:1.6; color:var(--text-dim);">' +
        'Your strongest event is <b style="color:var(--gain)">' + esc(best.key) + '</b> (' + fmtMoney(best.net) + ' across ' + best.count + ' trades). ' +
        'Your weakest is <b style="color:var(--loss)">' + esc(worst.key) + '</b> (' + fmtMoney(worst.net) + ' across ' + worst.count + ' trades). ' +
        'That gap is worth reviewing before your next ' + esc(worst.key) + ' session — the edge may be in sitting it out rather than trading it differently.' +
        '</div></div>';
    }

    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Macro Calendar</div><div class="page-sub">This week\'s releases, plus how you\'ve historically traded each event</div></div></div>' +
      weekCalendarPanel() +
      '<div class="panel"><div class="panel-title">News days vs quiet days</div>' + cmp(m.newsDay, m.quietDay) + '</div>' +
      insight +
      '<div class="panel"><div class="panel-title">Performance by event</div>' +
      (rows || '<div style="color:var(--text-faint); font-size:12.5px;">No recognised events found in your trade notes yet.</div>') +
      '<div style="margin-top:14px; font-size:11px; color:var(--text-faint); line-height:1.5;">Events are detected from each trade\'s notes and tags. Write the day\'s releases into your notes (FOMC, CPI, NFP, claims…) and they\'ll appear here automatically.</div>' +
      '</div>';
    bindCalendarControls();
  }

  function weekCalendarPanel() {
    var todayIso = todayStr();
    var meta = state.calendarMeta || {};
    var events = folderEvents(state.calImpact || 'both');
    if (!state.calendar) {
      return '<div class="panel"><div class="panel-title">This week\'s calendar</div>' +
        '<div style="color:var(--text-faint); font-size:12.5px; padding:10px 0;">Loading Forex Factory feed…</div></div>';
    }
    var days = {};
    events.forEach(function (e) { if (!days[e.date]) days[e.date] = []; days[e.date].push(e); });
    var dates = Object.keys(days).sort();
    function matchFamily(title) {
      var hit = null;
      EVENT_DEFS.forEach(function (d) { if (!hit && d.match.test(title)) hit = d.key; });
      return hit;
    }
    var cols = dates.map(function (d) {
      var dt = new Date(d + 'T00:00:00');
      var isToday = d === todayIso;
      var isPast = d < todayIso;
      var items = days[d].map(function (e) {
        var fam = matchFamily(e.title);
        var info = fam && EVENT_INFO[fam];
        var infoLine = info
          ? '<div style="font-size:10px; line-height:1.5; color:var(--text-dim); margin-top:6px; padding-top:6px; border-top:1px dashed var(--line-soft);">' + esc(info) + '</div>'
          : '';
        var fc = (e.forecast || e.previous)
          ? '<div style="font-size:9.5px; color:var(--text-faint); margin-top:2px; font-family:var(--font-mono);">' +
          (e.forecast ? 'f ' + esc(e.forecast) : '') + (e.forecast && e.previous ? ' · ' : '') + (e.previous ? 'p ' + esc(e.previous) : '') + '</div>'
          : '';
        return '<div style="padding:8px 0; border-bottom:1px solid var(--line-soft);">' +
          '<div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">' +
          impactDot(e.impact) +
          '<span style="font-family:var(--font-mono); font-size:9.5px; color:var(--text-faint);">' + esc(e.time) + '</span>' +
          '<span style="font-size:9px; font-weight:700; color:var(--text-faint); letter-spacing:.04em;">' + esc(e.cur) + '</span>' +
          '</div>' +
          '<div style="font-size:11.5px; line-height:1.35;">' + esc(e.title) + '</div>' + fc + infoLine +
          '</div>';
      }).join('');
      return '<div style="flex:1; min-width:260px; max-width:340px; background:var(--surface-2); border:1px solid ' + (isToday ? 'var(--accent)' : 'var(--line-soft)') + '; border-radius:10px; padding:12px; opacity:' + (isPast ? '0.45' : '1') + ';">' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">' +
        '<span style="font-size:13px; font-weight:700; color:' + (isToday ? 'var(--accent-2)' : 'var(--text)') + ';">' + dt.toLocaleDateString(undefined, { weekday: 'short' }) + '</span>' +
        '<span style="font-family:var(--font-mono); font-size:10px; color:var(--text-faint);">' + dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + '</span>' +
        '</div>' + items +
        '</div>';
    }).join('');
    var currencies = ['ALL'].concat(Array.from(new Set((state.calendar || []).filter(function (e) { return e.impact === 'High' || e.impact === 'Medium'; }).map(function (e) { return e.cur; }))).sort());
    var curOpts = currencies.map(function (c) { return '<option value="' + c + '"' + ((state.calCurrency || 'ALL') === c ? ' selected' : '') + '>' + (c === 'ALL' ? 'All currencies' : c) + '</option>'; }).join('');
    var freshness = meta.live ? (meta.fetchedAt ? 'Live from Forex Factory · updated ' + timeAgo(meta.fetchedAt) : 'Live from Forex Factory') : 'Could not reach the feed — showing a built-in snapshot. Hit refresh to retry.';
    return '<div class="panel">' +
      '<div class="panel-title" style="align-items:center;">' +
      '<span>This week · red &amp; orange folder</span>' +
      '<span style="display:flex; gap:8px; align-items:center; text-transform:none; letter-spacing:0;">' +
      '<select id="calCur" style="background:var(--surface-2); border:1px solid var(--line-soft); color:var(--text); border-radius:7px; padding:5px 8px; font-size:11.5px;">' + curOpts + '</select>' +
      '<select id="calImp" style="background:var(--surface-2); border:1px solid var(--line-soft); color:var(--text); border-radius:7px; padding:5px 8px; font-size:11.5px;">' +
      '<option value="both"' + ((state.calImpact || 'both') === 'both' ? ' selected' : '') + '>Red + orange</option>' +
      '<option value="high"' + (state.calImpact === 'high' ? ' selected' : '') + '>Red only</option>' +
      '</select>' +
      '<button id="calRefresh" class="btn-ghost" style="padding:5px 11px; font-size:11.5px;">Refresh</button>' +
      '</span>' +
      '</div>' +
      (dates.length ? '<div style="display:flex; gap:10px; flex-wrap:wrap;">' + cols + '</div>' : '<div style="color:var(--text-faint); font-size:12.5px;">No red or orange folder events match this filter.</div>') +
      '<div style="margin-top:12px; display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:10.5px; color:var(--text-faint);">' +
      '<span style="display:flex; align-items:center; gap:5px;">' + impactDot('High') + ' red folder — high impact</span>' +
      '<span style="display:flex; align-items:center; gap:5px;">' + impactDot('Medium') + ' orange folder — medium impact</span>' +
      '<span>· ' + esc(freshness) + '</span>' +
      '</div>' +
      '</div>';
  }

  function timeAgo(ts) {
    var mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
  }
  function bindCalendarControls() {
    var cur = $('#calCur'), imp = $('#calImp'), ref = $('#calRefresh');
    if (cur) cur.addEventListener('change', function () { state.calCurrency = cur.value; render(); });
    if (imp) imp.addEventListener('change', function () { state.calImpact = imp.value; render(); });
    if (ref) ref.addEventListener('click', function () {
      ref.textContent = 'Refreshing…'; ref.disabled = true;
      fetchCalendar(true).then(function () {
        toast(state.calendarMeta && state.calendarMeta.live ? 'Calendar updated' : 'Feed unreachable — using snapshot', !(state.calendarMeta && state.calendarMeta.live));
        render();
      });
    });
  }

  // ==========================================================================
  // Prop Firms
  // ==========================================================================
  function accountStats(acc) {
    var trades = active(state.trades).filter(function (t) { return t.accountId === acc.id; });
    var net = trades.reduce(function (s, t) { return s + (Number(t.pnl) || 0); }, 0);
    var byDay = {};
    trades.forEach(function (t) { byDay[t.date] = (byDay[t.date] || 0) + (Number(t.pnl) || 0); });
    var worstDay = 0, worstDayDate = null;
    Object.keys(byDay).forEach(function (d) { if (byDay[d] < worstDay) { worstDay = byDay[d]; worstDayDate = d; } });
    var sorted = trades.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var cum = 0, peak = 0;
    sorted.forEach(function (t) { cum += Number(t.pnl) || 0; if (cum > peak) peak = cum; });
    var trailingUsed = peak - cum;
    var target = Number(acc.profitTarget) || 0;
    var maxDD = Number(acc.maxDrawdown) || 0;
    var dailyLimit = Number(acc.dailyLoss) || 0;
    return {
      trades: trades, count: trades.length, net: net, byDay: byDay,
      worstDay: worstDay, worstDayDate: worstDayDate, peak: peak, trailingUsed: trailingUsed,
      targetPct: target > 0 ? Math.max(0, Math.min(100, net / target * 100)) : null,
      ddPct: maxDD > 0 ? Math.max(0, Math.min(100, trailingUsed / maxDD * 100)) : null,
      dailyBreached: dailyLimit > 0 && Math.abs(worstDay) >= dailyLimit,
      ddBreached: maxDD > 0 && trailingUsed >= maxDD,
      passed: target > 0 && net >= target
    };
  }

  function renderProps(main) {
    var accts = active(state.accounts);
    var spend = accts.reduce(function (s, a) { return s + (Number(a.feesPaid) || 0); }, 0);
    var payouts = accts.reduce(function (s, a) { return s + (Number(a.payouts) || 0); }, 0);
    var trueNet = payouts - spend;
    var roi = spend > 0 ? (trueNet / spend * 100) : null;
    var head = '<div class="page-head"><div><div class="page-title">Prop Firms</div><div class="page-sub">Rules, drawdown, and what you\'ve actually netted</div></div>' +
      '<button class="btn-primary" style="width:auto;" onclick="App.openAccountModal()">+ Add Account</button></div>';

    if (!accts.length) {
      main.innerHTML = head +
        '<div class="panel"><div class="empty-state">' +
        '<div class="em-title">No prop accounts tracked</div>' +
        '<div class="em-sub">Add an evaluation or funded account with its rules — profit target, daily loss limit, trailing drawdown — and every trade you tag to it updates the meters live. Log eval and reset fees too, so you can see real net ROI rather than just trading P&L.</div>' +
        '<button class="btn-primary" style="width:auto;" onclick="App.openAccountModal()">+ Add your first account</button>' +
        '</div></div>';
      return;
    }
    var finance = '<div class="stat-grid">' +
      stat('Spent on Fees', fmtMoney(spend), 'loss', 'evals, resets, activations') +
      stat('Payouts Received', fmtMoney(payouts), 'gain') +
      stat('True Net', fmtMoney(trueNet), trueNet >= 0 ? 'gain' : 'loss', 'payouts − fees') +
      stat('ROI on Fees', roi === null ? '—' : (roi.toFixed(0) + '%'), roi !== null && roi >= 0 ? 'gain' : 'loss') +
      stat('Active Accounts', String(accts.filter(function (a) { return a.status === 'active'; }).length) + ' / ' + accts.length) +
      '</div>';
    var cards = accts.map(function (acc) {
      var st = accountStats(acc);
      var statusBadge = acc.status === 'passed' ? '<span class="badge ok">passed</span>'
        : acc.status === 'failed' ? '<span class="badge bad">failed</span>'
          : acc.status === 'funded' ? '<span class="badge ok">funded</span>'
            : '<span class="badge neutral">active</span>';
      var alerts = '';
      if (st.ddBreached) alerts += '<div style="background:var(--loss-dim); color:var(--loss); border-radius:8px; padding:9px 12px; font-size:12.5px; margin-bottom:10px;">Drawdown limit exceeded — this account would be breached.</div>';
      else if (st.ddPct !== null && st.ddPct >= 75) alerts += '<div style="background:var(--warn-dim); color:var(--warn); border-radius:8px; padding:9px 12px; font-size:12.5px; margin-bottom:10px;">' + Math.round(st.ddPct) + '% of your drawdown is used. Size down.</div>';
      if (st.dailyBreached) alerts += '<div style="background:var(--loss-dim); color:var(--loss); border-radius:8px; padding:9px 12px; font-size:12.5px; margin-bottom:10px;">A single day (' + fmtDate(st.worstDayDate) + ', ' + fmtMoney(st.worstDay) + ') broke your daily loss limit.</div>';
      if (st.passed) alerts += '<div style="background:var(--gain-dim); color:var(--gain); border-radius:8px; padding:9px 12px; font-size:12.5px; margin-bottom:10px;">Profit target reached.</div>';
      var targetBar = st.targetPct === null ? '' :
        '<div class="kv"><span>Profit target</span><b>' + fmtMoney(st.net) + ' / ' + fmtMoney(acc.profitTarget) + '</b></div>' +
        '<div class="meter"><div style="width:' + st.targetPct + '%; background:var(--gain);"></div></div>';
      var ddBar = st.ddPct === null ? '' :
        '<div class="kv"><span>Drawdown used</span><b style="color:' + (st.ddPct >= 75 ? 'var(--loss)' : 'var(--text)') + '">' + fmtMoney(st.trailingUsed) + ' / ' + fmtMoney(acc.maxDrawdown) + '</b></div>' +
        '<div class="meter"><div style="width:' + st.ddPct + '%; background:' + (st.ddPct >= 75 ? 'var(--loss)' : 'var(--warn)') + ';"></div></div>';
      var dailyRow = !acc.dailyLoss ? '' :
        '<div class="kv"><span>Worst day vs limit</span><b style="color:' + (st.dailyBreached ? 'var(--loss)' : 'var(--text)') + '">' + fmtMoney(st.worstDay) + ' / -' + fmtMoney(acc.dailyLoss).replace('$', '$') + '</b></div>';
      return '<div class="panel">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">' +
        '<div><div style="font-size:15px; font-weight:700;">' + esc(acc.firm) + '</div>' +
        '<div style="font-size:12px; color:var(--text-dim); margin-top:3px;">' + esc(acc.nickname || '') + (acc.size ? ' · ' + fmtMoney(acc.size) + ' account' : '') + '</div></div>' +
        '<div style="display:flex; gap:8px; align-items:center;">' + statusBadge +
        '<button class="row-del" onclick="App.deleteAccount(\'' + acc.id + '\')" title="Delete">✕</button>' +
        '<button class="row-del" onclick="App.openAccountModal(\'' + acc.id + '\')" title="Edit">✎</button></div>' +
        '</div>' +
        alerts + targetBar + ddBar + dailyRow +
        '<div class="kv" style="border-top:1px solid var(--line-soft); margin-top:8px; padding-top:10px;"><span>Trades on this account</span><b>' + st.count + '</b></div>' +
        '<div class="kv"><span>Fees paid</span><b style="color:var(--loss)">' + fmtMoney(acc.feesPaid || 0) + '</b></div>' +
        '<div class="kv"><span>Payouts</span><b style="color:var(--gain)">' + fmtMoney(acc.payouts || 0) + '</b></div>' +
        '</div>';
    }).join('');
    main.innerHTML = head + finance +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:18px;">' + cards + '</div>' +
      '<div class="panel" style="border-color:var(--line-soft);"><div style="font-size:11.5px; color:var(--text-faint); line-height:1.6;">' +
      'Meters update from trades you assign to each account in the trade form. Fees and payouts are entered by hand — this journal can\'t connect to your bank or your firm\'s dashboard, so there\'s no automatic transaction import here.' +
      '</div></div>';
  }

  function openAccountModal(accId) {
    var acc = accId ? active(state.accounts).filter(function (a) { return a.id === accId; })[0] : null;
    var isEdit = !!acc;
    var a = acc || { id: 'acc_' + Date.now().toString(36), firm: '', nickname: '', size: '', profitTarget: '', maxDrawdown: '', dailyLoss: '', feesPaid: '', payouts: '', status: 'active' };
    var root = $('#modalRoot');
    root.innerHTML =
      '<div class="modal-overlay" id="modalOverlay"><div class="modal">' +
      '<div class="modal-head"><div class="modal-title">' + (isEdit ? 'Edit Account' : 'Add Prop Account') + '</div><button class="modal-close" id="acctCloseBtn">✕</button></div>' +
      '<form id="acctForm">' +
      '<div class="form-grid">' +
      '<div class="form-field"><label>Firm</label><input id="a_firm" required value="' + esc(a.firm) + '" placeholder="Apex, Topstep, FTMO…"></div>' +
      '<div class="form-field"><label>Nickname</label><input id="a_nickname" value="' + esc(a.nickname) + '" placeholder="Eval #2"></div>' +
      '<div class="form-field"><label>Account Size ($)</label><input id="a_size" type="number" step="any" value="' + esc(a.size) + '" placeholder="50000"></div>' +
      selectField('Status', 'a_status_sel', [{ v: 'active', l: 'Active' }, { v: 'passed', l: 'Passed' }, { v: 'funded', l: 'Funded' }, { v: 'failed', l: 'Failed' }], a.status).replace('f_a_status_sel', 'a_status') +
      '<div class="form-field"><label>Profit Target ($)</label><input id="a_profitTarget" type="number" step="any" value="' + esc(a.profitTarget) + '" placeholder="3000"></div>' +
      '<div class="form-field"><label>Max / Trailing Drawdown ($)</label><input id="a_maxDrawdown" type="number" step="any" value="' + esc(a.maxDrawdown) + '" placeholder="2500"></div>' +
      '<div class="form-field"><label>Daily Loss Limit ($)</label><input id="a_dailyLoss" type="number" step="any" value="' + esc(a.dailyLoss) + '" placeholder="1000"></div>' +
      '<div class="form-field"><label>Fees Paid ($)</label><input id="a_feesPaid" type="number" step="any" value="' + esc(a.feesPaid) + '" placeholder="evals + resets"></div>' +
      '<div class="form-field"><label>Payouts Received ($)</label><input id="a_payouts" type="number" step="any" value="' + esc(a.payouts) + '"></div>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button type="submit" class="btn-primary" style="width:auto; flex:1;">' + (isEdit ? 'Save Changes' : 'Add Account') + '</button>' +
      '<button type="button" class="btn-ghost" id="acctCancelBtn">Cancel</button>' +
      '</div>' +
      '</form>' +
      '</div></div>';

    function close() { root.innerHTML = ''; }
    $('#acctCloseBtn').addEventListener('click', close);
    $('#acctCancelBtn').addEventListener('click', close);
    $('#modalOverlay').addEventListener('click', function (e) { if (e.target.id === 'modalOverlay') close(); });

    $('#acctForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var obj = {
        id: a.id, firm: $('#a_firm').value.trim(), nickname: $('#a_nickname').value.trim(), size: $('#a_size').value,
        profitTarget: $('#a_profitTarget').value, maxDrawdown: $('#a_maxDrawdown').value, dailyLoss: $('#a_dailyLoss').value,
        feesPaid: $('#a_feesPaid').value, payouts: $('#a_payouts').value, status: $('#a_status').value,
        updatedAt: Date.now(), deleted: false
      };
      if (!obj.firm) { toast('Firm name is required', true); return; }
      var idx = state.accounts.findIndex(function (x) { return x.id === a.id; });
      if (idx > -1) state.accounts[idx] = obj; else state.accounts.push(obj);
      persistLocal();
      scheduleDriveSync();
      close();
      toast(isEdit ? 'Account updated' : 'Account added');
      render();
    });
  }

  function deleteAccount(id) {
    if (!confirm('Delete this account? Trades stay in your log but lose their account tag.')) return;
    var a = state.accounts.find(function (x) { return x.id === id; });
    if (!a) return;
    a.deleted = true; a.deletedAt = Date.now(); a.updatedAt = Date.now();
    persistLocal();
    scheduleDriveSync();
    toast('Account deleted');
    render();
  }

  // ==========================================================================
  // AI Coach — local rule-based pattern engine (no network calls, ever)
  // ==========================================================================
  function renderCoach(main) {
    var trades = active(state.trades);
    var insights = window.CoachEngine ? window.CoachEngine.buildInsights(trades) : [];
    var read = window.CoachEngine ? window.CoachEngine.weeklyRead(trades, insights) : '';

    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Coach</div><div class="page-sub">Reads your own trade log — entirely on this device, no external calls</div></div></div>' +
      '<div class="panel" style="border-color:var(--accent-dim); background:linear-gradient(160deg, var(--accent-dim), transparent 65%);">' +
      '<div class="panel-title" style="color:var(--accent-2);">This week\'s read</div>' +
      '<div style="font-size:13.5px; line-height:1.65; color:var(--text-dim);">' + esc(read) + '</div>' +
      '</div>' +
      (insights.length ? '<div class="panel"><div class="panel-title">Detected patterns</div>' +
        insights.slice(0, 8).map(function (ins) {
          return '<div style="padding:12px 0; border-bottom:1px solid var(--line-soft);">' +
            '<div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">' +
            '<span class="coach-badge">' + esc(ins.kind) + '</span>' +
            '<span class="coach-badge conf-' + ins.confidence + '">' + ins.confidence + ' confidence</span>' +
            '</div>' +
            '<div style="font-size:13.5px; font-weight:600; margin-bottom:3px;">' + esc(ins.title) + '</div>' +
            '<div style="font-size:12.5px; color:var(--text-dim); line-height:1.55;">' + esc(ins.body) + '</div>' +
            '</div>';
        }).join('') + '</div>' : '') +
      '<div class="coach-wrap" style="height:auto; max-height:none;">' +
      '<div class="coach-log" id="coachLog" style="flex:none; max-height:420px;"></div>' +
      (state.coachThread.length === 0 ? '<div class="coach-suggest">' +
        ['Where is my discipline breaking down?', 'What is my best setup?', 'How is my behavior after a loss?', 'What should I stop doing?']
          .map(function (q) { return '<button class="coach-suggest-btn" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') +
        '</div>' : '') +
      '<div class="coach-input-bar">' +
      '<textarea id="coachTextInput" rows="1" placeholder="Ask about your setups, mindset, timing, discipline…"></textarea>' +
      '<button class="coach-send-btn" id="coachSendBtn">Send</button>' +
      '</div>' +
      '<div class="coach-disclaimer">Computed entirely from your own logged trades on this device — not financial advice, not a market prediction.</div>' +
      '</div>';

    renderCoachLog();
    $all('.coach-suggest-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { askCoach(btn.dataset.q, trades, insights); });
    });
    $('#coachSendBtn').addEventListener('click', function () {
      var val = $('#coachTextInput').value.trim();
      if (val) askCoach(val, trades, insights);
    });
    $('#coachTextInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var val = $('#coachTextInput').value.trim();
        if (val) askCoach(val, trades, insights);
      }
    });
  }

  function askCoach(question, trades, insights) {
    state.coachThread.push({ role: 'user', text: question });
    var answer = window.CoachEngine ? window.CoachEngine.answerQuery(question, trades, insights) : "Coach engine unavailable.";
    state.coachThread.push({ role: 'assistant', text: answer });
    var input = $('#coachTextInput');
    if (input) input.value = '';
    renderCoachLog();
  }

  function renderCoachLog() {
    var log = $('#coachLog');
    if (!log) return;
    log.innerHTML = state.coachThread.map(function (m) {
      return '<div class="coach-msg ' + (m.role === 'user' ? 'user' : 'assistant') + '">' + esc(m.text).replace(/\n/g, '<br>') + '</div>';
    }).join('');
    log.scrollTop = log.scrollHeight;
  }

  // ==========================================================================
  // Settings
  // ==========================================================================
  function renderSettings(main) {
    var st = window.DriveSync ? window.DriveSync.getStatus() : { state: 'unsupported' };
    var clientId = window.DriveSync ? window.DriveSync.getClientId() : '';
    var pillCls = st.state === 'connected' ? 'on' : (st.state === 'connecting' ? 'busy' : (st.state === 'error' ? 'err' : ''));
    var pillText = st.state === 'connected' ? 'Connected' + (st.email ? ' · ' + st.email : '') : st.state === 'connecting' ? 'Connecting…' : st.state === 'error' ? 'Error' : 'Not connected';

    main.innerHTML =
      '<div class="page-head"><div><div class="page-title">Settings</div><div class="page-sub">Sync, backup, and app info</div></div></div>' +

      '<div class="panel">' +
      '<div class="panel-title">Google Drive sync <span class="sync-status-pill ' + pillCls + '"><span class="dot"></span>' + esc(pillText) + '</span></div>' +
      '<div style="font-size:12.5px; color:var(--text-dim); line-height:1.6; margin-bottom:14px;">Your trades sync to a hidden, private folder in your own Google Drive — invisible in your normal Drive UI and inaccessible to any other app. This is what keeps your iPhone, MacBook, and PC in sync. See the setup guide for how to create your free Google Client ID.</div>' +
      '<div class="form-field"><label>Google OAuth Client ID</label><input id="gClientId" value="' + esc(clientId) + '" placeholder="xxxxxxxxxx.apps.googleusercontent.com"></div>' +
      '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">' +
      '<button class="btn-primary" style="width:auto;" id="gSaveClientBtn">Save Client ID</button>' +
      (st.state === 'connected'
        ? '<button class="btn-ghost" id="gSyncNowBtn">Sync now</button><button class="btn-ghost" id="gDisconnectBtn">Disconnect</button>'
        : '<button class="btn-ghost" id="gConnectBtn">Connect Google Drive</button>') +
      '</div>' +
      (st.lastSyncedAt ? '<div style="font-size:11px; color:var(--text-faint); margin-top:10px;">Last synced ' + timeAgo(st.lastSyncedAt) + '</div>' : '') +
      (st.lastError ? '<div style="font-size:11px; color:var(--loss); margin-top:10px;">' + esc(st.lastError) + '</div>' : '') +
      '</div>' +

      '<div class="panel">' +
      '<div class="panel-title">Install as an app</div>' +
      '<div style="font-size:12.5px; color:var(--text-dim); line-height:1.6;">On iPhone: open this page in Safari → Share icon → "Add to Home Screen". On Mac / PC: open in Chrome or Edge → look for the install icon in the address bar, or use the button below if it appears. Once installed it runs full-screen, works offline, and keeps syncing via Drive.</div>' +
      '<div style="margin-top:12px;">' + (state.deferredInstallPrompt ? '<button class="btn-primary" style="width:auto;" id="installNowBtn2">Install now</button>' : '<span style="font-size:11.5px; color:var(--text-faint);">Install prompt not available on this browser right now — use your browser\'s menu instead.</span>') + '</div>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="panel-title">Backup</div>' +
      '<div class="settings-row"><div><div class="settings-row-label">Export a backup file</div><div class="settings-row-sub">Downloads everything — trades, accounts, settings — as a JSON file you can keep or move to another device manually.</div></div><button class="btn-ghost" id="exportBtn">Export</button></div>' +
      '<div class="settings-row"><div><div class="settings-row-label">Import a backup file</div><div class="settings-row-sub">Merges a previously exported file into this device (newer edits win, nothing is silently overwritten).</div></div><label class="btn-ghost" style="cursor:pointer;">Import<input type="file" id="importFile" accept="application/json" style="display:none;"></label></div>' +
      '</div>' +

      '<div class="panel">' +
      '<div class="panel-title">Data</div>' +
      '<div class="settings-row"><div><div class="settings-row-label">Trades stored on this device</div><div class="settings-row-sub">' + active(state.trades).length + ' active, ' + (state.trades.length - active(state.trades).length) + ' deleted (kept briefly so deletions sync across devices)</div></div></div>' +
      '<div class="settings-row"><div><div class="settings-row-label">Wipe all local data</div><div class="settings-row-sub">Clears trades, accounts, and screenshots from this device only. If Drive is connected, reconnecting will restore from your synced copy.</div></div><button class="btn-danger" id="wipeBtn">Wipe device data</button></div>' +
      '</div>' +

      '<div class="panel" style="border-color:var(--line-soft);">' +
      '<div style="font-size:11.5px; color:var(--text-faint); line-height:1.6;">This is your private journal. Nothing here is sent anywhere except, if you choose to connect it, your own Google Drive account. The Coach tab runs entirely on-device — no trade data is ever sent to any AI service.</div>' +
      '</div>';

    $('#gSaveClientBtn').addEventListener('click', function () {
      var id = $('#gClientId').value.trim();
      window.DriveSync.setClientId(id);
      toast('Client ID saved');
    });
    var connectBtn = $('#gConnectBtn');
    if (connectBtn) connectBtn.addEventListener('click', function () {
      window.DriveSync.connect().then(function () { fullSync(true); render(); }).catch(function (e) { toast(e.message || 'Could not connect', true); render(); });
    });
    var syncBtn = $('#gSyncNowBtn');
    if (syncBtn) syncBtn.addEventListener('click', function () { fullSync(true); });
    var discBtn = $('#gDisconnectBtn');
    if (discBtn) discBtn.addEventListener('click', function () { window.DriveSync.disconnect(); render(); });
    var install2 = $('#installNowBtn2');
    if (install2) install2.addEventListener('click', function () {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      state.deferredInstallPrompt.userChoice.finally(function () { state.deferredInstallPrompt = null; render(); });
    });
    $('#exportBtn').addEventListener('click', exportBackup);
    $('#importFile').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) importBackup(file);
    });
    $('#wipeBtn').addEventListener('click', function () {
      if (!confirm('Wipe all trades, accounts, and screenshots from THIS DEVICE? This cannot be undone locally. Your Drive copy (if connected) is not touched.')) return;
      state.trades = []; state.accounts = [];
      persistLocal();
      Object.keys(localStorage).filter(function (k) { return k.indexOf(LS_PREFIX + 'shot:') === 0; }).forEach(function (k) { localStorage.removeItem(k); });
      toast('Local data wiped');
      render();
    });
  }

  function exportBackup() {
    var payload = { version: 1, exportedAt: Date.now(), trades: state.trades, accounts: state.accounts, settings: state.settings };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast('Backup downloaded');
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = JSON.parse(ev.target.result);
        state.trades = mergeById(state.trades, data.trades || []);
        state.accounts = mergeById(state.accounts, data.accounts || []);
        if (data.settings) state.settings = Object.assign({}, data.settings, state.settings);
        persistLocal();
        scheduleDriveSync();
        toast('Backup imported');
        render();
      } catch (e) {
        toast('Could not read that backup file', true);
      }
    };
    reader.readAsText(file);
  }

  // ==========================================================================
  // Init
  // ==========================================================================
  function bindNav() {
    $all('.nav-item').forEach(function (btn) {
      btn.addEventListener('click', function () { state.tab = btn.dataset.tab; render(); });
    });
    $('#addTradeBtn').addEventListener('click', function () { openTradeModal(); });
    $('#importBtn').addEventListener('click', function () { importSpreadsheetTrades(); });
    renderSyncBits();
  }

  window.App = {
    openTradeModal: openTradeModal,
    importSpreadsheetTrades: importSpreadsheetTrades,
    openAccountModal: openAccountModal,
    deleteAccount: deleteAccount
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    if (state.loaded) render();
  });

  async function init() {
    bindNav();
    loadLocal();
    state.loaded = true;
    render();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    if (window.DriveSync) {
      window.DriveSync.onStatus(function () { renderSyncBits(); });
      window.DriveSync.tryAutoReconnect().then(function (ok) {
        if (ok) fullSync(false);
      });
    }

    fetchCalendar(false).then(function () { render(); });
  }

  init();
})();
