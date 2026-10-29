// brush-mini's one shot: Bao is surprised, then happy, and hops (a pure function of t, the kit's way).
shots([[0, (t) => {
  paint(ellPts(960, 560, 700, 300, 30, 20), { fill: PAL.sky, fillOp: 70, bleed: .3, ink: null });
  character(CAST.bao, 960, 900, 46, { ...charEmotions(CAST.bao, t, [[0, 'neutral'], [0.6, 'surprised'], [1.2, 'happy']]), ...(t > 1.2 ? jump(t, 1.4, 1.8, 2) : {}) });
}]]);
