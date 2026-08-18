/* ============================================================================
   CoachEngine — a fully local, rule-based pattern analyst.

   No network calls, no external AI model. Everything here is arithmetic over
   your own logged trades: grouping, win rates, streak detection, and simple
   correlation checks. It only surfaces a pattern once there's enough sample
   size behind it (thresholds below), and every insight is traceable back to
   the trades that produced it. This is the entire "AI Coach" — private,
   offline-capable, and honest about when it doesn't have enough data yet.
   ============================================================================ */
(function (global) {
  "use strict";

  var MIN_GROUP = 4;      // minimum trades in a bucket before we'll speak about it
  var MIN_COMPARE = 4;     // minimum trades in EACH side of a comparison
  var DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmtMoney(n) {
    n = Number(n) || 0;
    var neg = n < 0;
    var v = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + '$' + v;
  }
  function pct(n) { return Math.round(n * 100); }
  function active(trades) { return (trades || []).filter(function (t) { return !t.deleted; }); }
  function pnlOf(t) { return Number(t.pnl) || 0; }
  function isWin(t) { return pnlOf(t) > 0; }
  function isLoss(t) { return pnlOf(t) < 0; }
  function sum(arr, fn) { return arr.reduce(function (a, x) { return a + fn(x); }, 0); }
  function winRate(arr) { var w = arr.filter(isWin).length, l = arr.filter(isLoss).length; return (w + l) ? w / (w + l) : 0; }
  function sortedByTime(trades) {
    return active(trades).slice().sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); });
  }

  var EVENT_DEFS = [
    { key: 'FOMC', match: /\bfomc\b|fed (chair|chairman)|powell|warsh|mps\b|official bank rate|cash rate|\bboc\b|\bmrr\b/i },
    { key: 'CPI', match: /\bcpi\b|\bcppi\b|core cpi|inflation/i },
    { key: 'NFP', match: /\bnfp\b|non.?farm|employment change|unemployment rate|\bahe\b/i },
    { key: 'PPI', match: /\bppi\b/i },
    { key: 'GDP', match: /\bgdp\b/i },
    { key: 'Claims', match: /claims|claimant/i },
    { key: 'PMI', match: /\bpmi\b|\bism\b/i },
    { key: 'PCE', match: /\bpce\b/i },
    { key: 'Retail Sales', match: /retail sales/i },
    { key: 'JOLTS/ADP', match: /\bjolts\b|\badp\b/i },
    { key: 'ECB / BOE', match: /\becb\b|\bboe\b|bailey/i }
  ];
  function eventsForTrade(t) {
    var hay = (t.notes || '') + ' ' + (t.tags || []).join(' ');
    var found = [];
    EVENT_DEFS.forEach(function (d) { if (d.match.test(hay)) found.push(d.key); });
    return found;
  }

  function confidenceFor(n) {
    if (n >= 12) return 'high';
    if (n >= 6) return 'medium';
    return 'low';
  }

  // ---------- Individual pattern detectors ----------
  // Each returns an array of insight objects (or []):
  // { kind, title, body, confidence, n, impact, cta }

  function dayOfWeekPattern(trades) {
    var t = active(trades);
    if (t.length < 8) return [];
    var buckets = [0, 1, 2, 3, 4, 5, 6].map(function () { return []; });
    t.forEach(function (tr) { buckets[new Date(tr.date + 'T00:00:00').getDay()].push(tr); });
    var rows = buckets.map(function (arr, i) {
      return { day: DOW_NAMES[i], n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (rows.length < 2) return [];
    rows.sort(function (a, b) { return b.net - a.net; });
    var best = rows[0], worst = rows[rows.length - 1];
    if (best.day === worst.day || best.net <= 0) return [];
    var out = [];
    out.push({
      kind: 'Timing', title: best.day + ' is your strongest day',
      body: best.day + ': ' + fmtMoney(best.net) + ' net across ' + best.n + ' trades (' + pct(best.wr) + '% win rate).' +
        (worst.net < 0 ? ' ' + worst.day + ' is the weak point at ' + fmtMoney(worst.net) + ' across ' + worst.n + ' trades.' : ''),
      confidence: confidenceFor(best.n), n: best.n, impact: best.net
    });
    return out;
  }

  function tagPattern(trades) {
    var t = active(trades).filter(function (tr) { return (tr.tags || []).length && tr.tags.join('') !== 'Imported'; });
    if (t.length < 6) return [];
    var byTag = {};
    t.forEach(function (tr) {
      (tr.tags || []).forEach(function (tag) {
        if (!tag || tag.toLowerCase() === 'imported') return;
        if (!byTag[tag]) byTag[tag] = [];
        byTag[tag].push(tr);
      });
    });
    var rows = Object.keys(byTag).map(function (k) {
      var arr = byTag[k];
      return { tag: k, n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (!rows.length) return [];
    rows.sort(function (a, b) { return b.net - a.net; });
    var out = [];
    var best = rows[0];
    out.push({
      kind: 'Setup', title: '"' + best.tag + '" is your highest-expectancy setup',
      body: fmtMoney(best.net) + ' net across ' + best.n + ' trades, ' + pct(best.wr) + '% win rate. This is the tag worth trading more of.',
      confidence: confidenceFor(best.n), n: best.n, impact: best.net
    });
    if (rows.length > 1) {
      var worst = rows[rows.length - 1];
      if (worst.net < 0 && worst.tag !== best.tag) {
        out.push({
          kind: 'Setup', title: '"' + worst.tag + '" is costing you',
          body: fmtMoney(worst.net) + ' net across ' + worst.n + ' trades, ' + pct(worst.wr) + '% win rate. Worth reviewing whether this setup earns its place in your plan.',
          confidence: confidenceFor(worst.n), n: worst.n, impact: worst.net
        });
      }
    }
    return out;
  }

  function emotionPattern(trades) {
    var t = active(trades).filter(function (tr) { return tr.emotion; });
    if (t.length < 6) return [];
    var byE = {};
    t.forEach(function (tr) { (byE[tr.emotion] = byE[tr.emotion] || []).push(tr); });
    var rows = Object.keys(byE).map(function (k) {
      var arr = byE[k];
      return { emotion: k, n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (!rows.length) return [];
    rows.sort(function (a, b) { return a.net - b.net; });
    var out = [];
    var worst = rows[0];
    if (worst.net < 0) {
      out.push({
        kind: 'Mindset', title: 'Trading while "' + worst.emotion + '" is expensive',
        body: fmtMoney(worst.net) + ' net across ' + worst.n + ' trades tagged "' + worst.emotion + '" (' + pct(worst.wr) + '% win rate). This is the clearest emotional leak in your log.',
        confidence: confidenceFor(worst.n), n: worst.n, impact: worst.net
      });
    }
    var best = rows[rows.length - 1];
    if (best.net > 0 && best.emotion !== worst.emotion) {
      out.push({
        kind: 'Mindset', title: 'You trade best while "' + best.emotion + '"',
        body: fmtMoney(best.net) + ' net across ' + best.n + ' trades (' + pct(best.wr) + '% win rate). Worth naming what makes that state repeatable.',
        confidence: confidenceFor(best.n), n: best.n, impact: best.net
      });
    }
    return out;
  }

  function streakPattern(trades) {
    var sorted = sortedByTime(trades);
    if (sorted.length < 10) return [];
    var afterLoss = [], afterWin = [], afterTwoLosses = [];
    var consecLoss = 0;
    for (var i = 1; i < sorted.length; i++) {
      var prev = pnlOf(sorted[i - 1]), cur = sorted[i];
      consecLoss = prev < 0 ? consecLoss + 1 : 0;
      if (prev < 0) afterLoss.push(cur);
      else if (prev > 0) afterWin.push(cur);
      if (consecLoss >= 2) afterTwoLosses.push(cur);
    }
    if (afterLoss.length < MIN_COMPARE || afterWin.length < MIN_COMPARE) return [];
    var wrLoss = winRate(afterLoss), wrWin = winRate(afterWin);
    var gap = pct(wrWin) - pct(wrLoss);
    var out = [];
    if (gap >= 12) {
      out.push({
        kind: 'Behavior', title: 'Your edge drops after a loss',
        body: 'Win rate falls from ' + pct(wrWin) + '% after a win to ' + pct(wrLoss) + '% after a loss (' + gap + ' point gap), net ' + fmtMoney(sum(afterLoss, pnlOf)) + ' across ' + afterLoss.length + ' trades. This is the clearest tilt signal in your data — consider a rule to step away after one red trade.',
        confidence: confidenceFor(afterLoss.length), n: afterLoss.length, impact: sum(afterLoss, pnlOf)
      });
    } else if (gap <= -10) {
      out.push({
        kind: 'Behavior', title: 'You trade better after a loss than after a win',
        body: 'Win rate is ' + pct(wrLoss) + '% after a loss vs ' + pct(wrWin) + '% after a win. Watch for overconfidence following green trades instead.',
        confidence: confidenceFor(afterWin.length), n: afterWin.length, impact: sum(afterWin, pnlOf)
      });
    }
    if (afterTwoLosses.length >= MIN_COMPARE) {
      var netTwo = sum(afterTwoLosses, pnlOf);
      if (netTwo < 0) {
        out.push({
          kind: 'Behavior', title: 'Trades after 2+ losses in a row lose money',
          body: fmtMoney(netTwo) + ' net across ' + afterTwoLosses.length + ' trades taken after two-plus consecutive losses (' + pct(winRate(afterTwoLosses)) + '% win rate). This is your revenge-trade window.',
          confidence: confidenceFor(afterTwoLosses.length), n: afterTwoLosses.length, impact: netTwo
        });
      }
    }
    return out;
  }

  function ruleAdherencePattern(trades) {
    var t = active(trades).filter(function (tr) { return typeof tr.rulesFollowed === 'boolean'; });
    var followed = t.filter(function (tr) { return tr.rulesFollowed; });
    var broke = t.filter(function (tr) { return !tr.rulesFollowed; });
    if (followed.length < MIN_COMPARE || broke.length < MIN_COMPARE) return [];
    var netF = sum(followed, pnlOf), netB = sum(broke, pnlOf);
    var expF = netF / followed.length, expB = netB / broke.length;
    var out = [];
    if (expF > expB) {
      out.push({
        kind: 'Discipline', title: 'Breaking your own rules is measurably costing you',
        body: 'Trades where you followed your plan average ' + fmtMoney(expF) + ' each vs ' + fmtMoney(expB) + ' when you didn’t (' + followed.length + ' vs ' + broke.length + ' trades). That gap is pure discipline, not market conditions.',
        confidence: confidenceFor(Math.min(followed.length, broke.length)), n: broke.length, impact: netB
      });
    }
    return out;
  }

  function symbolPattern(trades) {
    var t = active(trades);
    if (t.length < 8) return [];
    var by = {};
    t.forEach(function (tr) { (by[tr.symbol] = by[tr.symbol] || []).push(tr); });
    var rows = Object.keys(by).map(function (k) {
      var arr = by[k];
      return { symbol: k, n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (rows.length < 2) return [];
    rows.sort(function (a, b) { return b.net - a.net; });
    var best = rows[0], worst = rows[rows.length - 1];
    var out = [];
    if (worst.net < 0 && worst.symbol !== best.symbol) {
      out.push({
        kind: 'Instrument', title: worst.symbol + ' is your weakest instrument',
        body: fmtMoney(worst.net) + ' net across ' + worst.n + ' trades (' + pct(worst.wr) + '% win rate), vs ' + best.symbol + ' at ' + fmtMoney(best.net) + ' across ' + best.n + ' trades.',
        confidence: confidenceFor(worst.n), n: worst.n, impact: worst.net
      });
    }
    return out;
  }

  function macroEventPattern(trades) {
    var t = active(trades);
    if (t.length < 8) return [];
    var byEvent = {}, newsDay = [], quietDay = [];
    t.forEach(function (tr) {
      var evs = eventsForTrade(tr);
      (evs.length ? newsDay : quietDay).push(tr);
      evs.forEach(function (e) { (byEvent[e] = byEvent[e] || []).push(tr); });
    });
    var out = [];
    if (newsDay.length >= MIN_COMPARE && quietDay.length >= MIN_COMPARE) {
      var netNews = sum(newsDay, pnlOf), netQuiet = sum(quietDay, pnlOf);
      var expNews = netNews / newsDay.length, expQuiet = netQuiet / quietDay.length;
      if (Math.abs(expNews - expQuiet) > 50) {
        out.push({
          kind: 'Macro', title: expNews < expQuiet ? 'Economic-release days are your weak spot' : 'You trade news days better than quiet ones',
          body: 'News-event trades average ' + fmtMoney(expNews) + ' each (' + newsDay.length + ' trades) vs ' + fmtMoney(expQuiet) + ' on quiet days (' + quietDay.length + ' trades).',
          confidence: confidenceFor(Math.min(newsDay.length, quietDay.length)), n: newsDay.length, impact: netNews
        });
      }
    }
    var rows = Object.keys(byEvent).map(function (k) {
      var arr = byEvent[k];
      return { key: k, n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (rows.length) {
      rows.sort(function (a, b) { return a.net - b.net; });
      var worst = rows[0];
      if (worst.net < 0) {
        out.push({
          kind: 'Macro', title: worst.key + ' sessions are your costliest event',
          body: fmtMoney(worst.net) + ' net across ' + worst.n + ' trades noted around ' + worst.key + ' (' + pct(worst.wr) + '% win rate). Detected from your own trade notes.',
          confidence: confidenceFor(worst.n), n: worst.n, impact: worst.net
        });
      }
      var best = rows[rows.length - 1];
      if (best.net > 0 && best.key !== worst.key) {
        out.push({
          kind: 'Macro', title: best.key + ' sessions are your strongest event',
          body: fmtMoney(best.net) + ' net across ' + best.n + ' trades (' + pct(best.wr) + '% win rate).',
          confidence: confidenceFor(best.n), n: best.n, impact: best.net
        });
      }
    }
    return out;
  }

  function outlierPattern(trades) {
    var t = active(trades);
    if (t.length < 6) return [];
    var losses = t.filter(isLoss).map(pnlOf);
    if (losses.length < MIN_GROUP) return [];
    var avgLoss = sum(t.filter(isLoss), pnlOf) / losses.length;
    var worst = Math.min.apply(null, losses);
    var out = [];
    if (avgLoss !== 0 && worst / avgLoss > 2.2) {
      out.push({
        kind: 'Risk', title: 'One outsized loss is skewing your results',
        body: 'Your worst single loss (' + fmtMoney(worst) + ') is ' + (worst / avgLoss).toFixed(1) + '× your average loss (' + fmtMoney(avgLoss) + '). A hard stop-loss rule would cap this kind of outlier.',
        confidence: confidenceFor(losses.length), n: losses.length, impact: worst
      });
    }
    return out;
  }

  function sizingPattern(trades) {
    var t = active(trades).filter(function (tr) { return tr.size !== '' && tr.size != null && !isNaN(Number(tr.size)); });
    if (t.length < 10) return [];
    var sizes = t.map(function (tr) { return Number(tr.size); });
    var avgSize = sum(t, function (tr) { return Number(tr.size); }) / t.length;
    var big = t.filter(function (tr) { return Number(tr.size) > avgSize * 1.3; });
    var small = t.filter(function (tr) { return Number(tr.size) <= avgSize * 1.3; });
    if (big.length < MIN_COMPARE || small.length < MIN_COMPARE) return [];
    var wrBig = winRate(big), wrSmall = winRate(small);
    var out = [];
    if (pct(wrSmall) - pct(wrBig) >= 12) {
      out.push({
        kind: 'Sizing', title: 'You size up on your lower-probability trades',
        body: 'Above-average size trades win ' + pct(wrBig) + '% of the time vs ' + pct(wrSmall) + '% at normal size (' + big.length + ' vs ' + small.length + ' trades). Sizing and win rate are moving in the wrong direction relative to each other.',
        confidence: confidenceFor(big.length), n: big.length, impact: sum(big, pnlOf)
      });
    }
    return out;
  }

  function timeOfDayPattern(trades) {
    var t = active(trades).filter(function (tr) { return tr.time && /^\d{1,2}:\d{2}/.test(tr.time); });
    if (t.length < 10) return [];
    function block(tr) {
      var h = parseInt(tr.time.split(':')[0], 10);
      if (h < 10) return 'Pre-10am';
      if (h < 12) return '10am–12pm';
      if (h < 14) return '12–2pm';
      if (h < 16) return '2–4pm';
      return 'After 4pm';
    }
    var by = {};
    t.forEach(function (tr) { var k = block(tr); (by[k] = by[k] || []).push(tr); });
    var rows = Object.keys(by).map(function (k) {
      var arr = by[k];
      return { block: k, n: arr.length, net: sum(arr, pnlOf), wr: winRate(arr) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (rows.length < 2) return [];
    rows.sort(function (a, b) { return b.net - a.net; });
    var best = rows[0], worst = rows[rows.length - 1];
    var out = [];
    if (best.net > 0 && worst.net < best.net) {
      out.push({
        kind: 'Timing', title: 'Your edge is concentrated in the ' + best.block + ' window',
        body: fmtMoney(best.net) + ' net, ' + pct(best.wr) + '% win rate across ' + best.n + ' trades in that window' +
          (worst.net < 0 ? '; ' + worst.block + ' is net negative at ' + fmtMoney(worst.net) + '.' : '.'),
        confidence: confidenceFor(best.n), n: best.n, impact: best.net
      });
    }
    return out;
  }

  function mistakePattern(trades) {
    var t = active(trades).filter(function (tr) { return tr.mistakes && tr.mistakes.length; });
    if (t.length < MIN_GROUP) return [];
    var by = {};
    t.forEach(function (tr) {
      (tr.mistakes || []).forEach(function (m) {
        (by[m] = by[m] || []).push(tr);
      });
    });
    var rows = Object.keys(by).map(function (k) {
      var arr = by[k];
      return { m: k, n: arr.length, net: sum(arr, pnlOf) };
    }).filter(function (r) { return r.n >= MIN_GROUP; });
    if (!rows.length) return [];
    rows.sort(function (a, b) { return a.net - b.net; });
    var worst = rows[0];
    var out = [];
    if (worst.net < 0) {
      out.push({
        kind: 'Mistakes', title: '"' + worst.m + '" is your costliest tagged mistake',
        body: fmtMoney(worst.net) + ' net across ' + worst.n + ' trades tagged "' + worst.m + '". Cutting this one habit would move your numbers the most.',
        confidence: confidenceFor(worst.n), n: worst.n, impact: worst.net
      });
    }
    return out;
  }

  function buildInsights(trades) {
    var detectors = [dayOfWeekPattern, tagPattern, emotionPattern, streakPattern, ruleAdherencePattern, symbolPattern, macroEventPattern, outlierPattern, sizingPattern, timeOfDayPattern, mistakePattern];
    var out = [];
    detectors.forEach(function (fn) {
      try {
        var r = fn(trades);
        if (r && r.length) out = out.concat(r);
      } catch (e) { /* one bad detector shouldn't break the rest */ }
    });
    var order = { high: 0, medium: 1, low: 2 };
    out.sort(function (a, b) {
      if (order[a.confidence] !== order[b.confidence]) return order[a.confidence] - order[b.confidence];
      return Math.abs(b.impact) - Math.abs(a.impact);
    });
    return out;
  }

  function weeklyRead(trades, insights) {
    var t = active(trades);
    if (t.length < 5) {
      return "Not enough trades logged yet to read a pattern with any confidence — usually somewhere around 15–20 gives the first reliable signal. Keep logging; this updates itself automatically as your history grows.";
    }
    var net = sum(t, pnlOf);
    var wr = pct(winRate(t));
    var lines = [];
    lines.push(t.length + ' trades logged, ' + fmtMoney(net) + ' net, ' + wr + '% win rate.');
    if (insights.length) {
      var top = insights[0];
      lines.push(top.title + ' — ' + top.body);
      if (insights.length > 1) {
        lines.push('Second most notable: ' + insights[1].title.charAt(0).toLowerCase() + insights[1].title.slice(1) + '.');
      }
    } else {
      lines.push('Nothing stands out strongly yet at your current confidence thresholds — add tags, mindset, and time-of-day on new trades to unlock sharper reads (setup quality, tilt, timing windows).');
    }
    return lines.join(' ');
  }

  // ---------- Free-text query routing ----------
  function pickInsightsByKind(insights, kinds) {
    return insights.filter(function (i) { return kinds.indexOf(i.kind) > -1; });
  }
  function joinInsightBodies(list, none) {
    if (!list.length) return none;
    return list.slice(0, 3).map(function (i) { return i.title + ' — ' + i.body; }).join('\n\n');
  }

  function generalSummary(trades) {
    var t = active(trades);
    if (!t.length) return "You haven't logged any trades yet — once you do, ask me anything about your patterns.";
    var net = sum(t, pnlOf);
    var wr = pct(winRate(t));
    var wins = t.filter(isWin).length, losses = t.filter(isLoss).length;
    var grossWin = sum(t.filter(isWin), pnlOf), grossLoss = Math.abs(sum(t.filter(isLoss), pnlOf));
    var pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? '∞' : '—');
    return t.length + ' trades, ' + fmtMoney(net) + ' net, ' + wr + '% win rate (' + wins + 'W / ' + losses + 'L), profit factor ' + pf + '.';
  }

  function answerQuery(q, trades, insights) {
    q = (q || '').toLowerCase();
    var t = active(trades);
    if (!t.length) return "There's nothing in the log yet. Once you record some trades I can point out real patterns instead of guessing.";

    if (/discipline|rule|plan\b/.test(q)) {
      var d = pickInsightsByKind(insights, ['Discipline']);
      return joinInsightBodies(d, 'Not enough trades with the "followed my rules" checkbox set (on both sides) to say anything reliable yet. Keep marking it on every trade you log.') +
        (d.length ? '' : '');
    }
    if (/revenge|tilt|after a loss|streak/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Behavior']), "No clear tilt pattern detected yet — either your results hold steady after losses, or there aren't enough trades in a row to tell. That itself is a fine sign.");
    }
    if (/setup|strategy|edge|best trade|what.*good at/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Setup']), 'Tag your trades (breakout, fade, reversal, etc.) when you log them — once a handful share a tag, I can tell you which setups actually make you money.');
    }
    if (/mood|emotion|feel|mindset|psycholog/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Mindset']), 'Set the "mindset" field when logging trades — once there\'s a spread of moods logged, I can show you which emotional states cost you money.');
    }
    if (/mistake|rule break|revenge trade|chasing|fomo entry/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Mistakes']), 'Not enough tagged mistakes yet to say anything reliable — tag "Chasing", "Moved Stop", etc. on the trade form as they happen and the cost adds up here.');
    }
    if (/lose|loss|losing|weak|worst/.test(q)) {
      var neg = insights.filter(function (i) { return i.impact < 0; });
      return joinInsightBodies(neg, "Nothing stands out as a clear leak yet at current sample sizes — that's a genuinely good sign, or you just need more logged trades.");
    }
    if (/news|fomc|cpi|nfp|macro|event|econom/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Macro']), 'Mention the day\'s events in your trade notes (FOMC, CPI, NFP, claims…) and I\'ll automatically read them and show you which ones you trade well.');
    }
    if (/size|sizing|position/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Sizing']), 'Not enough size data logged yet to see a sizing pattern — fill in the size/qty field consistently and this unlocks.');
    }
    if (/time|hour|morning|afternoon|open|session/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Timing']), 'Log the time of entry on your trades and I can show you which part of the session is actually working for you.');
    }
    if (/symbol|instrument|ticker|market\b/.test(q)) {
      return joinInsightBodies(pickInsightsByKind(insights, ['Instrument']), 'Not enough trades on any single instrument yet to compare.');
    }
    if (/how am i doing|overview|summary|stats|performance/.test(q)) {
      return generalSummary(t);
    }
    // default: best-effort mix of general summary + top insight
    var head = generalSummary(t);
    if (insights.length) return head + '\n\n' + insights[0].title + ' — ' + insights[0].body;
    return head;
  }

  global.CoachEngine = {
    buildInsights: buildInsights,
    weeklyRead: weeklyRead,
    answerQuery: answerQuery,
    generalSummary: generalSummary,
    EVENT_DEFS: EVENT_DEFS,
    eventsForTrade: eventsForTrade
  };
})(window);
