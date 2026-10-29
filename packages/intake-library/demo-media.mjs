// Pictures for the intake demos, drawn here in SVG (Moworks, 17/10/2026): no photo, logo or font is downloaded for a preview. Each is a
// self-contained SVG text an item writes into its assets/ (an asset of { path, data }).
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/** A sunset over hills and a lake (1600 x 1000). */
export const LANDSCAPE = svg(1600, 1000, `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".45" stop-color="#9d174d"/><stop offset=".7" stop-color="#f97316"/><stop offset="1" stop-color="#fde68a"/></linearGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7ed"/><stop offset=".6" stop-color="#fdba74"/><stop offset="1" stop-color="#fb923c" stop-opacity="0"/></radialGradient>
<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c2d12"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>
<rect width="1600" height="640" fill="url(#sky)"/><circle cx="1050" cy="520" r="230" fill="url(#sun)"/>
<path d="M0 560 L180 430 L330 520 L520 360 L700 500 L860 410 L1040 540 L1240 380 L1420 500 L1600 420 L1600 660 L0 660Z" fill="#4c1d95" opacity=".85"/>
<path d="M0 610 L220 520 L420 600 L640 500 L880 610 L1100 520 L1340 610 L1600 540 L1600 680 L0 680Z" fill="#2e1065"/>
<rect y="660" width="1600" height="340" fill="url(#lake)"/>
<g fill="#fdba74" opacity=".55"><rect x="930" y="690" width="240" height="6" rx="3"/><rect x="960" y="730" width="180" height="5" rx="2.5"/><rect x="990" y="770" width="120" height="4" rx="2"/><rect x="1010" y="810" width="80" height="3" rx="1.5"/></g>`);

/** Glossy shapes on a studio backdrop, like a product shot (1200 x 1200). */
export const PRODUCT = svg(1200, 1200, `<defs>
<radialGradient id="bg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#6366f1"/></radialGradient>
<radialGradient id="ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#f9a8d4"/><stop offset="1" stop-color="#9d174d"/></radialGradient>
<linearGradient id="box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
<radialGradient id="shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1e1b4b" stop-opacity=".45"/><stop offset="1" stop-color="#1e1b4b" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="1200" fill="url(#bg)"/><ellipse cx="600" cy="930" rx="430" ry="70" fill="url(#shadow)"/>
<rect x="250" y="520" width="340" height="400" rx="40" fill="url(#box)"/><rect x="250" y="520" width="340" height="80" rx="40" fill="#fff" opacity=".35"/>
<circle cx="760" cy="700" r="230" fill="url(#ball)"/><circle cx="690" cy="610" r="40" fill="#fff" opacity=".7"/>`);

/** A soft abstract of colour blobs (1200 x 900). */
export const ABSTRACT = svg(1200, 900, `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter></defs>
<rect width="1200" height="900" fill="#0f172a"/><g filter="url(#b)"><circle cx="320" cy="300" r="260" fill="#22d3ee"/><circle cx="820" cy="260" r="240" fill="#a855f7"/>
<circle cx="640" cy="640" r="300" fill="#f43f5e"/><circle cx="1000" cy="700" r="200" fill="#facc15"/></g>`);

/** A phone app screen: header, a card, a list (720 x 1600, fits 360 x 800 frames at 2x). Text-free so any font can sit on top. */
export const APP_SCREEN = svg(720, 1600, `<defs><linearGradient id="hd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
<rect width="720" height="1600" fill="#0b0b10"/><rect width="720" height="520" fill="url(#hd)"/>
<rect x="48" y="120" width="260" height="28" rx="14" fill="#fff" opacity=".9"/><rect x="48" y="170" width="380" height="20" rx="10" fill="#fff" opacity=".55"/>
<rect x="48" y="300" width="624" height="300" rx="40" fill="#fff"/><circle cx="140" cy="390" r="44" fill="#a5b4fc"/><rect x="210" y="360" width="300" height="24" rx="12" fill="#1e1b4b" opacity=".8"/>
<rect x="210" y="402" width="200" height="18" rx="9" fill="#1e1b4b" opacity=".35"/><rect x="96" y="480" width="528" height="70" rx="35" fill="#4f46e5"/>
<g fill="#18181b"><rect x="48" y="680" width="624" height="150" rx="32"/><rect x="48" y="860" width="624" height="150" rx="32"/><rect x="48" y="1040" width="624" height="150" rx="32"/><rect x="48" y="1220" width="624" height="150" rx="32"/></g>
<g fill="#f472b6"><circle cx="128" cy="755" r="36"/></g><g fill="#38bdf8"><circle cx="128" cy="935" r="36"/></g><g fill="#a3e635"><circle cx="128" cy="1115" r="36"/></g><g fill="#facc15"><circle cx="128" cy="1295" r="36"/></g>
<g fill="#fafafa" opacity=".85"><rect x="196" y="730" width="300" height="20" rx="10"/><rect x="196" y="910" width="260" height="20" rx="10"/><rect x="196" y="1090" width="320" height="20" rx="10"/><rect x="196" y="1270" width="240" height="20" rx="10"/></g>
<g fill="#fafafa" opacity=".35"><rect x="196" y="766" width="200" height="16" rx="8"/><rect x="196" y="946" width="180" height="16" rx="8"/><rect x="196" y="1126" width="220" height="16" rx="8"/><rect x="196" y="1306" width="160" height="16" rx="8"/></g>
<rect x="250" y="1540" width="220" height="12" rx="6" fill="#fafafa" opacity=".6"/>`);

/** A landing page (2400 x 1400, fits 1200 x 700 browser frames at 2x). */
export const WEB_PAGE = svg(2400, 1400, `<defs><radialGradient id="glow" cx=".5" cy=".1" r=".7"><stop offset="0" stop-color="#7c3aed" stop-opacity=".7"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient></defs>
<rect width="2400" height="1400" fill="#09090b"/><rect width="2400" height="1400" fill="url(#glow)"/>
<rect x="120" y="70" width="180" height="40" rx="20" fill="#fafafa"/><g fill="#a1a1aa"><rect x="1500" y="80" width="140" height="22" rx="11"/><rect x="1690" y="80" width="140" height="22" rx="11"/><rect x="1880" y="80" width="140" height="22" rx="11"/></g>
<rect x="2080" y="62" width="200" height="58" rx="29" fill="#fafafa"/>
<rect x="700" y="330" width="1000" height="90" rx="45" fill="#fafafa"/><rect x="820" y="450" width="760" height="90" rx="45" fill="#fafafa"/><rect x="900" y="600" width="600" height="30" rx="15" fill="#a1a1aa"/>
<rect x="960" y="700" width="220" height="76" rx="38" fill="#7c3aed"/><rect x="1220" y="700" width="220" height="76" rx="38" fill="none" stroke="#3f3f46" stroke-width="4"/>
<g fill="#18181b" stroke="#27272a" stroke-width="4"><rect x="220" y="900" width="600" height="380" rx="36"/><rect x="900" y="900" width="600" height="380" rx="36"/><rect x="1580" y="900" width="600" height="380" rx="36"/></g>`);
