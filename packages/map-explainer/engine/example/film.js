// Worked example: the Bir Tawil film's story for the engine (Test 33, "overall good" from the owner). Study it, never copy its places or lines.
// A film's lib/film.js holds only this: its places, its camera keyed to the voice's words, what lies on the ground, what the marker draws.
(function () {
  var W = MAPFILM.W, E = MAPFILM.E;
  var BT = [[33.23, 22], [33.42, 21.89], [33.64, 21.76], [33.85, 21.74], [34.09, 21.76], [34.12, 21.88], [34.15, 22]];
  var HALAIB = [[34.15, 22], [34.9, 22.6], [35.65, 23.15], [38, 23.15], [38, 22]];
  var LINE_1902 = [[31, 22]].concat(BT.slice(0, -1), [[34.15, 22], [34.9, 22.6], [35.65, 23.15]]);
  var ROUTE = [[34.03, 22.6], [33.95, 22.36], [33.88, 22.16], [33.84, 22], [33.78, 21.89], [33.62, 21.89]];
  var HERE = [33.69, 21.88], TWO = ['Egypt', 'Sudan'], EGYPT = 'rgba(201,122,58,', SUDAN = 'rgba(42,98,116,';
  var stamp = W('năm', 3), bigMap = W('không', 6), cross = W('qua');

  MAPFILM.film({
    atlas: '50m', seed: 2060, center: 30, ground: { biome: 'desert' },
    colors: { Egypt: '#EEDAA4', Sudan: '#D2DEB8', Libya: '#E6C1A7', 'Saudi Arabia': '#D2DEB8' },
    camera: {
      start: [33.64, 21.9, 10.22], shakes: [stamp + .54],
      endShift: { at: W('số', 1), dur: .7, fromLon: 31, lon: 29 },
      keys: [
        [0, W('phía'), 33.7, 21.88, 10.58, 'open'],
        [W('phía'), W('phía') + 1, 33.61, 22.03, 9.86, 'move'], [W('phía') + 1, W('hai'), 33.7, 22, 9.97, 'hold'],
        [W('hai'), W('hai') + .9, 33.74, 21.85, 10.76, 'move'], [W('hai') + .9, W('năm'), 33.69, 21.87, 10.87, 'hold'],
        [W('năm'), W('năm') + 1.3, 34.3, 24.1, 5.97, 'move'], [W('năm') + 1.3, W('năm', 2), 33, 24.5, 6.07, 'hold'],
        [W('năm', 2), W('năm', 2) + 1.1, 34.51, 22.44, 9.56, 'move'], [W('năm', 2) + 1.1, W('đường', 2), 34.6, 22.4, 9.67, 'hold'],
        [W('đường', 2), W('đường', 2) + .85, 35.33, 22.33, 9.16, 'move'], [W('đường', 2) + .85, W('ai', 3), 35.2, 22.3, 9.27, 'hold'],
        [W('ai', 3), W('ai', 3) + .7, 34.85, 22.38, 9.01, 'move'], [W('ai', 3) + .7, W('nhận', 2), 35, 22.35, 9.12, 'hold'],
        [W('nhận', 2), W('nhận', 2) + .6, 35.02, 22.22, 9.36, 'move'], [W('nhận', 2) + .6, stamp, 34.9, 22.25, 9.47, 'hold'],
        [stamp, stamp + .7, 33.69, 21.92, 10.06, 'move'], [stamp + .7, W('lập'), 33.75, 21.9, 10.17, 'hold'],
        [W('lập'), W('lập') + .6, 33.75, 21.85, 10.55, 'move'], [W('lập') + .6, bigMap, 33.7, 21.87, 10.67, 'hold'],
        [bigMap, bigMap + 1.1, 31.8, 24.1, 5.9, 'move'], [bigMap + 1.1, W('số', 1), 31, 24, 5.82, 'hold'],
        [W('số', 1), 45, 31, 24, 5.73, 'hold'],
      ],
    },

    // What lies on the ground, under the marker.
    under: function (M) {
      var t = M.t, c = M.c, a = M.win(t, W('phía'), .35, W('hai'), .22) + M.win(t, stamp + .54, .3, bigMap + .15, .3);
      if (a > 0) { c.globalAlpha = a; M.outline(BT, true); c.globalAlpha = 1; }
      var gone = 1 - M.S(stamp, stamp + .22, t);
      // Bir Tawil takes Egypt's colour, spreading up from the 1902 line; Hala'ib takes Sudan's, spreading out to the coast.
      c.globalAlpha = gone; M.tint(BT, EGYPT + '.62)', M.ease.p2IO((t - W('bir', 2)) / .7), [33.85, 21.74], [33.85, 22]);
      M.inside(TWO, function () {
        var faint = 1 - .55 * M.S(W('đòi', 2), W('đòi', 2) + .8, t);
        c.globalAlpha = gone * faint; M.tint(HALAIB, SUDAN + '.55)', M.ease.p2IO((t - W("hala'ib")) / .7), [34.15, 22], [36.4, 20.9]);
        var dark = M.ease.p2IO((t - W('mất')) / .56);
        if (dark > 0) { c.globalAlpha = gone; M.tint(HALAIB, 'rgba(10,8,6,' + (.45 * dark) + ')'); }
      });
      c.globalAlpha = 1;
      var a22 = M.win(t, W('năm', 2) + .68, .3, stamp, .22);
      if (a22 > 0) { c.globalAlpha = a22; M.outline([[30, 22], [38, 22]]); c.globalAlpha = 1; }
      // The frame splits along the line; both countries tinted on the big map, split on the same line.
      M.split(22, M.ease.p2IO((t - stamp - .54) / .42), EGYPT + '.34)', SUDAN + '.42)', 1 - M.S(bigMap + .15, bigMap + .44, t));
      var big = M.ease.p2IO((t - bigMap - .6) / .4);
      if (big > 0) M.inside(TWO, function () { var y = M.P(33, 22)[1]; c.globalAlpha = big; c.fillStyle = EGYPT + '.5)'; c.fillRect(-40, -40, 2000, y + 40); c.fillStyle = SUDAN + '.46)'; c.fillRect(-40, y, 2000, 1200); c.globalAlpha = 1; });
    },

    // What the marker draws: every stroke starts on a word, each with its own seed.
    ink: function (M) {
      var t = M.t, c = M.c, a;
      a = 1 - M.S(W('hai'), W('hai') + .22, t);
      if (a > 0 && t >= W('xưng')) { c.globalAlpha = a; M.ring(HERE[0], HERE[1], .42, .173, M.ease.p2IO((t - W('xưng')) / (E('vương') - W('xưng'))), 11, { world: true, w: t < W('phía') ? 10 : 8 }); c.globalAlpha = 1; }
      a = 1 - M.S(W('năm'), W('năm') + .3, t);
      if (a > 0 && t >= W('hai') + .15) { c.globalAlpha = a; M.mark(BT.concat([BT[0]]), 8, M.ease.sine((t - W('hai') - .15) / 1.75), 17, { dash: [24, 16], off: t > W('hai') + 1.9 ? -(t - W('hai') - 1.9) * 12 : 0 }); c.globalAlpha = 1; }
      a = 1 - M.S(W('năm', 2), W('năm', 2) + .5, t);
      if (a > 0 && t >= W('theo')) { c.globalAlpha = a; M.mark([[24.6, 22], [37, 22]], 10, M.ease.sine((t - W('theo')) / (E('hai', 3) - W('theo'))), 29); c.globalAlpha = 1; }
      // The 1902 line, on the ground, then up to the sea.
      a = 1 - M.S(stamp, stamp + .22, t);
      if (a > 0 && t >= W('kẻ', 2)) { c.globalAlpha = a; M.mark(LINE_1902, t < W('đường', 2) ? 9 : 8, M.ease.sine((t - W('kẻ', 2)) / (W('dùng') - W('kẻ', 2))), 37); c.globalAlpha = 1; }
      // Hala'ib hatched in both colours, stroke by stroke, because both claim it.
      a = 1 - M.S(W('nhận', 2), W('nhận', 2) + .22, t);
      if (a > 0 && t >= W('đòi', 2)) { c.globalAlpha = a; M.inside(TWO, function () { M.hatch(HALAIB, ['42,98,116', '201,122,58'], W('đòi', 2)); }); c.globalAlpha = 1; }
      a = 1 - M.S(stamp, stamp + .22, t);
      if (a > 0 && t >= W('bir', 3)) {
        c.globalAlpha = a; M.ring(HERE[0], HERE[1], .37, .13, M.ease.p2IO((t - W('bir', 3)) / .5), 47, { world: true });
        if (t >= W('mất')) { M.mark([[35, 22.15], [36.3, 22.75]], 10, M.ease.p2In((t - W('mất')) / .2), 53); M.mark([[35.1, 22.72], [36.2, 22.12]], 10, M.ease.p2In((t - W('mất') - .22) / .2), 59); }
        c.globalAlpha = 1;
      }
      // The farmer: a dotted path whose marker crosses the line on the word "qua" (the route is illustrative, and says so on screen).
      a = 1 - M.S(bigMap + .15, bigMap + .44, t);
      if (a > 0 && t >= W('một', 5)) {
        c.globalAlpha = a; var t0 = W('một', 5), t1 = W('lập') + .3, u = t < cross ? .55 * M.ease.sine((t - t0) / (cross - t0)) : .55 + .45 * (1 - Math.pow(1 - Math.min(1, (t - cross) / (t1 - cross)), 2));
        M.route(ROUTE, u, t > t1); c.globalAlpha = 1;
      }
      // The big map: the line and the ring.
      if (t >= bigMap + .5) { var p = M.ease.p2IO((t - bigMap - .5) / .55); M.mark([[24.6, 22], [37, 22]], 8, p, 67); M.ring(HERE[0], HERE[1], 80 / Math.pow(2, 5.85), 60 / Math.pow(2, 5.85), p, 71, { world: true }); }
    },
  });
})();
