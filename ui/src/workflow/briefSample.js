// The sample brief behind the Sample brief button in New project (one per style). For a user who does not know what a brief is: it shows one that fits the chosen style. Loading a sample also sets the dialog's own
// fields to the sample's values (`fields`: length, aspect ratio and frame rate, 30 fps when a sample says none; the Brand Kit goes back to
// free), because what the dialog asks is not repeated in the text.
// Sources: the "general" sample is the sample prompt shared as an image ("From idea to app with Claude Code"; author unknown), kept as written (Three.js, materials, scene timings, SF Pro, the finish) with only what the dialog
// chooses taken out: the length (15 seconds), the size (1920x1080), the frame rate (60 fps) and the render method (the app renders); its
// fields put 0:15, 16:9 and 60 fps back in the dialog. Its Vietnamese is a full translation. The others are written for this app from each
// style's own inputs (config/styles.json).
// Two languages, the same content; the words inside the film stay English in both, as in the original.
// The 66 Lemo-Opuscar styles ("lemo-<slug>") have theirs in briefSampleLemo.js, adapted from each style's DEMO.md, with credit;
// the 15 mg-styles-15 styles ("mg-<id>") in briefSampleMg.js, adapted from each style's prompt, and the 32 anidoodle media
// ("anidoodle-<id>") in briefSampleAnidoodle.js, written from each medium's reference.
import { LEMO_BRIEF_SAMPLES } from "./briefSampleLemo.js";
import { MG_BRIEF_SAMPLES } from "./briefSampleMg.js";
import { ANIDOODLE_BRIEF_SAMPLES, ANIDOODLE_KIND_SAMPLES } from "./briefSampleAnidoodle.js";
import { BRUSH_BRIEF_SAMPLES } from "./briefSampleBrush.js";

const OWN_SAMPLES = {
  general: {
    fields: { length: "0:15", aspect: "16:9", fps: 60 },
    vi: `Làm một phim motion graphics giải thích bằng Three.js, phong cách glassmorphism, tên "From idea to app with Claude Code".

Không gian: một khoảng tối được chiếu sáng bởi một vòm lớn với các mảng gradient mềm màu tím, cam, xanh dương và hồng. Các tấm panel là kính mờ (MeshPhysicalMaterial có transmission, roughness khoảng 0.4, tấm khối đùn bo góc). Mỗi panel có một canvas texture trên mặt, vẽ lại mỗi khung hình cho phần giao diện: viền trắng và chữ trắng font SF Pro. Màu nhấn #ff8a4c.

Máy quay bay qua 4 cảnh đặt ở các vị trí 3D khác nhau. Nó trôi chậm trong mỗi cảnh và lướt nhanh giữa các cảnh (expo ease). Mỗi cảnh có một nhãn lớn: "STEP 0X" màu cam phía trên một chữ trắng lớn.

1. Describe it (0–3s): một thanh chat bằng kính gõ "Build me a habit tracker with streaks." với con trỏ nhấp nháy. Nút gửi sáng lên, rồi một bong bóng trả lời hiện dấu đang gõ, tiếp theo là "On it. Here's the plan."
2. Plan it (3–6s): một chồng thẻ kính xếp theo chiều sâu. Năm việc trượt vào, rồi lần lượt được tick với dấu check chuyển động và đường gạch ngang.
3. Build it (6–9.5s): một trình soạn code kính tối có chấm cửa sổ và tab gõ ra một component React ngắn có màu cú pháp. Sáu ô tên file bằng kính bay quanh nó theo quỹ đạo 3D. Kết thúc bằng huy hiệu xanh lá "✓ 12 tests passed".
4. Ship it (10–12.5s): một điện thoại kính xoay vào, hiện app habit đã xong. Bộ đếm streak chạy lên 12, các thói quen được tick, một biểu đồ cột mọc lên, và một đợt confetti (instanced) rơi theo trọng lực.
5. Reveal (12.5–15s): máy quay lùi ra thành cảnh rộng thấy mọi cảnh. Một lớp tối mờ dần hiện lên, rồi "ONE CONVERSATION / Idea → App" và một viên kính nhỏ ghi "Built with Claude Code" chuyển động vào, gắn cố định với máy quay.

Xuyên suốt: một ống phát sáng chạy theo đường cong CatmullRom nối mọi cảnh và vẽ dần ra khi câu chuyện đi tới, đầu ống sáng hơn. Rải các khối cầu, vòng và khối icosahedron bằng kính trong có tán sắc (dispersion), thêm các quả cầu phát sáng nhỏ để tạo chiều sâu (parallax), và giữ chúng tránh xa đường bay của máy quay.

Hoàn thiện: render target HDR có MSAA, bloom nhẹ (chỉ ở chỗ sáng), tone mapping trung tính, và một lượt cuối có chút lệch màu (chromatic aberration), vignette và hạt phim. Giữ mọi chữ nằm trong khung và dễ đọc, và kiểm tra ảnh tĩnh của từng cảnh trước khi render cả đoạn.`,
    en: `Make a motion-graphics explainer in Three.js, glassmorphism style, titled "From idea to app with Claude Code".

World: a dark space lit by a big dome with soft violet, orange, blue and pink gradient blobs. Panels are frosted glass (MeshPhysicalMaterial with transmission and roughness around 0.4, rounded extruded slabs). Each panel has a canvas texture on its face, redrawn every frame for the UI: a white border and white text in SF Pro. Accent colour #ff8a4c.

The camera flies through 4 scenes placed at different 3D positions. It drifts slowly within each scene and whips quickly between them (expo ease). Each scene has a big label: "STEP 0X" in orange above a large white word.

1. Describe it (0–3s): a glass chat bar types "Build me a habit tracker with streaks." with a blinking cursor. The send button lights up, then a reply bubble shows typing dots followed by "On it. Here's the plan."
2. Plan it (3–6s): a stack of glass cards in depth. Five tasks slide in, then tick off one by one with an animated checkmark and strikethrough.
3. Build it (6–9.5s): a dark glass code editor with window dots and tabs types out a short React component with syntax colours. Six glass file-name tiles orbit it in 3D. It ends with a green "✓ 12 tests passed" badge.
4. Ship it (10–12.5s): a glass phone swings in showing the finished habit app. The streak counter counts up to 12, habits check off, a bar chart grows, and a burst of instanced confetti falls under gravity.
5. Reveal (12.5–15s): the camera pulls back to a wide shot showing every scene. A dark scrim fades in, then "ONE CONVERSATION / Idea → App" and a small glass pill reading "Built with Claude Code" animate in, fixed to the camera.

Throughout: a glowing tube along a CatmullRom curve connects all the scenes and draws on as the story moves forward, with a bright head. Scatter clear glass spheres, rings and icosahedrons with dispersion plus small glowing orbs for parallax, and keep them away from the camera path.

Finish: HDR render target with MSAA, subtle bloom (bright highlights only), neutral tone mapping, and a final pass with slight chromatic aberration, vignette and film grain. Keep all text inside the frame and clearly readable, and check still frames from every scene before rendering the full clip.`,
  },
  "hf-explainer": {
    fields: { length: "1:00", aspect: "16:9" },
    vi: `Chủ đề: giải thích vì sao ngủ đủ giấc giúp nhớ bài tốt hơn.
Người xem: sinh viên và dân văn phòng trẻ, chưa biết gì về khoa học giấc ngủ.
Thông điệp: bộ não sắp xếp lại ký ức trong lúc ngủ, nên thức khuya học bài là học dở.

Ba ý chính, mỗi ý một cảnh:
1. Ban ngày, não thu thông tin như một chiếc hộp thư đầy.
2. Khi ngủ, não phân loại: giữ cái quan trọng, bỏ cái thừa.
3. Thiếu ngủ thì hộp thư vẫn đầy, ký ức không được giữ lại.

Giọng điệu: thân thiện, rõ ràng, như người bạn giải thích. Hình: chữ lớn, hình khối đơn giản, không có người thật. Kết bằng một lời khuyên: ngủ trước khi thi.`,
    en: `Topic: explain why enough sleep helps you remember what you study.
Audience: students and young office workers who know nothing about sleep science.
Message: the brain re-sorts memories while you sleep, so late-night cramming works against you.

Three ideas, one scene each:
1. By day, the brain collects information like an overflowing inbox.
2. During sleep, it sorts: keeps what matters, drops the rest.
3. Without sleep the inbox stays full and nothing is kept.

Tone: friendly and clear, like a friend explaining. Visuals: big type, simple shapes, no real people. End with one piece of advice: sleep before the exam.`,
  },
  "hf-launch": {
    fields: { length: "0:45", aspect: "16:9" },
    vi: `Sản phẩm: ứng dụng quản lý chi tiêu "Xu" cho người trẻ, vừa ra bản mới có tính năng chia hoá đơn nhóm.
Người xem: người 20-30 tuổi hay đi ăn chung và ngại đòi tiền bạn.

Vấn đề: chia tiền thủ công rất mệt và dễ gây khó chịu.
Giải pháp: quét hoá đơn, chọn ai ăn gì, app tính sẵn và gửi nhắc nhẹ nhàng.
Ba điểm nổi bật: quét hoá đơn, chia theo món, nhắc không gượng.

Giọng điệu: vui, nhẹ, không phô trương. Màu theo thương hiệu (xanh lá và trắng). Kết bằng lời kêu gọi "Tải Xu miễn phí".`,
    en: `Product: the budgeting app "Xu" for young people, newly released with a group bill-splitting feature.
Audience: 20 to 30 year-olds who eat out in groups and dread chasing friends for money.

Problem: splitting by hand is tiring and awkward.
Solution: scan the receipt, pick who had what, the app does the maths and sends a gentle reminder.
Three highlights: scan the receipt, split by item, reminders without awkwardness.

Tone: light and playful, never showy. Brand colours (green and white). End on the call to action "Get Xu free".`,
  },
  "hf-music": {
    fields: { length: "3:00", aspect: "16:9" },
    vi: `Bài nhạc: bài của tôi, thêm vào ở phần Tư liệu; lời bài hát dán ở bước Lời bài hát.
Tâm trạng: ấm áp, hơi hoài niệm, nhịp vừa. Đoạn điệp khúc bùng lên.

Hình ảnh: video lời bài hát. Chữ là nhân vật chính: mỗi câu hát hiện đúng lúc được hát, từ nhấn mạnh to hơn. Nền là những mảng màu mềm chuyển theo đoạn nhạc: đoạn đầu lạnh và tối, điệp khúc sáng và ấm.

Nhịp: cắt cảnh theo nhịp trống, điệp khúc có chuyển động nhanh hơn. Tên bài và nghệ sĩ hiện ở đầu, nhỏ và kín đáo. Tránh hình minh hoạ theo nghĩa đen của lời; ưu tiên màu, chữ và chuyển động.`,
    en: `Track: my song, added in Assets; the lyrics are pasted in the Lyrics step.
Mood: warm, a little nostalgic, mid tempo. The chorus lifts.

Visuals: a lyric video. The type is the star: each line appears exactly when it is sung, stressed words larger. The ground is soft colour fields that change with the sections: verses cool and dark, chorus bright and warm.

Rhythm: cut on the drums; the chorus moves faster. Song title and artist at the start, small and discreet. Avoid literal illustrations of the words; lean on colour, type and motion.`,
  },
  "hf-data": {
    fields: { length: "0:40", aspect: "16:9" },
    vi: `Chủ đề: một thư viện khu phố cho mượn hạt giống thay vì sách, và năm đầu tiên của nó qua những con số.
Người xem: người sống trong khu phố, chưa từng nghe về thư viện hạt giống.
Thông điệp: một ngăn kéo hạt giống nhỏ đã thành một mùa vụ chung của cả phố.

Từng con số một, mỗi số một cảnh: 1 tủ ngăn kéo cũ ở góc thư viện; 214 gói hạt được mượn; 68 gói được trả lại sau mùa (nhiều hơn số đã mượn của tháng đầu); 31 loại rau; 1 bữa cơm chung cuối năm.
Mỗi con số là thứ lớn nhất trên màn hình và biến thành vật thật: 214 gói hạt xếp thành một luống, 31 loại rau mọc thành một vườn nhỏ.

Phong cách: giấy kraft, mực xanh lá đậm, chữ số to và rõ. Không giọng đọc; chữ ngắn đi kèm từng con số. Các con số là số tự viết cho phim này.`,
    en: `Topic: a neighbourhood library that lends seeds instead of books, and its first year in numbers.
Audience: people living nearby who have never heard of a seed library.
Message: one small drawer of seeds became a harvest the whole street shares.

One number at a time, one scene each: 1 old card-catalogue drawer in the corner of the library; 214 seed packets borrowed; 68 packets returned after the season (more than the first month lent); 31 kinds of vegetable; 1 shared dinner at the end of the year.
Each number is the biggest thing on screen and becomes a real thing: 214 packets lined up into a garden bed, 31 kinds sprouting into a small garden.

Style: kraft paper, deep green ink, large clear figures. No voice-over; a short line of text with each number. The numbers are made up for this film.`,
  },
  "hf-vertical": {
    fields: { length: "0:20", aspect: "9:16" },
    vi: `Chủ đề: clip dọc cho mạng xã hội của một tiệm sửa ô dù nhỏ tên "Ô Cũ", khẩu hiệu "Đừng vứt, mang tới đây."
Câu chuyện: một chiếc ô gãy gọng bị ném vào thùng rác dưới mưa; một bàn tay nhặt lên; ba nhịp sửa nhanh (thay gọng, khâu vải, lau khô); chiếc ô bung ra như mới dưới mưa, rồi tên tiệm và khẩu hiệu.

Dựng cho 9:16: chủ thể ở giữa khung, chữ to trong vùng an toàn, giây đầu tiên đã có chuyển động. Không giọng đọc; nhạc vui và tiếng mưa. Màu: vàng ô và xanh mưa.`,
    en: `Topic: a vertical social clip for a small umbrella repair shop called "Old Umbrella", tagline "Don't bin it, bring it."
Story: an umbrella with a broken rib is thrown in a bin in the rain; a hand picks it out; three quick repair beats (new rib, stitched canopy, wiped dry); the umbrella snaps open as good as new in the rain, then the shop's name and tagline.

Made for 9:16: the subject in the middle of the frame, large type inside the safe area, motion from the very first second. No voice-over; upbeat music and the sound of rain. Colours: umbrella yellow and rainy blue.`,
  },
  "hf-3d": {
    fields: { length: "0:30", aspect: "16:9" },
    vi: `Chủ đề: một chiếc hộp nhạc bằng gỗ được mở ra từng lớp để thấy vì sao nó phát ra đúng một giai điệu.
Câu chuyện: chiếc hộp đóng nằm trên bàn; nắp mở, máy quay đi vào trong; trống gai quay chậm và từng chiếc gai gảy một răng lược thép; máy quay lùi ra, cả cơ chế xoay quanh mình; chiếc hộp đóng lại và giai điệu ngân thêm một nhịp.

3D vì vật thể là phần thưởng: gỗ ấm, kim loại sáng, ánh sáng mềm từ một bên. Chuyển động theo thời gian của phim, không ngẫu nhiên. Không giọng đọc; tiếng hộp nhạc là âm thanh chính.`,
    en: `Topic: a wooden music box opened layer by layer to show why it plays exactly one tune.
Story: the closed box sits on a table; the lid opens and the camera moves inside; the pinned drum turns slowly and each pin plucks one steel comb tooth; the camera pulls back as the whole mechanism turns; the box closes and the tune rings on for one more beat.

3D because the object is the payoff: warm wood, bright metal, soft light from one side. Motion follows the film's time, nothing random. No voice-over; the music box itself is the main sound.`,
  },
  "hf-character": {
    fields: { length: "0:30", aspect: "16:9" },
    vi: `Chủ đề: một chú robot hút bụi nhỏ tên Bụi sợ bóng tối, trong đêm mất điện.
Câu chuyện: điện tắt, Bụi đứng im giữa phòng khách tối; nó thử đi và va vào chân ghế, lùi lại; nó thấy một vệt sáng trăng trên sàn và đi theo vệt sáng từng đoạn; vệt sáng dẫn tới bé mèo đang ngủ, Bụi tắt máy nằm cạnh; điện có lại, cả hai cùng giật mình.

Nhân vật cho mỗi cảnh chuyển một lý do: Bụi tự thử, tự sai, tự tìm ra cách. Diễn bằng tư thế và nhịp dừng, không lời thoại. Nhạc nhẹ, tiếng động nhỏ cho mỗi lần va chạm.`,
    en: `Topic: a small robot vacuum called Dusty who is afraid of the dark, on a night the power goes out.
Story: the lights go off and Dusty freezes in the dark living room; it tries to move and bumps into a chair leg, backs off; it sees a strip of moonlight on the floor and follows it bit by bit; the moonlight leads to the sleeping cat, and Dusty powers down beside it; the power comes back and both of them jump.

The character gives each cut a cause: Dusty tries, fails and finds its own way. Acted with poses and pauses, no dialogue. Gentle music, a small sound for every bump.`,
  },
  slideshow: {
    fields: { length: "1:00", aspect: "16:9" },
    vi: `Chủ đề: tổng kết quý 3 của studio cho khách hàng.
Gồm 6 slide, mỗi slide một ý và một ảnh:
1. Tiêu đề: "Quý 3 trong một phút".
2. Số liệu chính: 12 dự án hoàn thành.
3. Dự án nổi bật: ảnh và hai dòng mô tả.
4. Lời khen của khách: một câu ngắn.
5. Điều học được: ba gạch đầu dòng.
6. Quý tới: ba mục tiêu và lời cảm ơn.

Phong cách: sạch, nhiều khoảng trắng, một màu nhấn. Chữ ngắn, tối đa hai dòng mỗi slide. Ảnh lấy từ phần Tư liệu. Chuyển slide nhẹ nhàng, không loè loẹt.`,
    en: `Topic: the studio's Q3 recap for clients.
Six slides, one idea and one picture each:
1. Title: "Q3 in one minute".
2. Key number: 12 projects delivered.
3. Featured project: a picture and two lines.
4. A client's praise: one short sentence.
5. What we learned: three bullets.
6. Next quarter: three goals and a thank-you.

Style: clean, plenty of white space, one accent colour. Short text, two lines at most per slide. Pictures come from Assets. Gentle slide changes, nothing flashy.`,
  },
};

export const BRIEF_SAMPLES = { ...OWN_SAMPLES, ...LEMO_BRIEF_SAMPLES, ...MG_BRIEF_SAMPLES, ...ANIDOODLE_BRIEF_SAMPLES, ...BRUSH_BRIEF_SAMPLES };

// The What If film kind's two samples, any style: one for a style that draws characters, one for the others.
// Our own premises, written from the seven-beat formula of What If animation (FreshStack, MIT; kelano86/what-if-animation at 3725a22);
// no channel's episode. The twist's fact is left for Claude to find and cite (rules/what-if §3).
const WI_CREDIT = { text: "Written from the What If formula of What If animation by FreshStack, MIT", link: "https://github.com/kelano86/what-if-animation/blob/3725a22d2d101320cae5b7d761af8d75120c4987/references/formula.md" };
export const WHAT_IF_SAMPLES = {
  characters: { fields: { length: "0:20" }, credit: WI_CREDIT,
    en: `Topic: What if you could talk to animals?
Cold open, three quick demos, the power's word every time: your cat says the food is late ("Listen."), a pigeon gives you directions, the neighbour's dog tells you a secret about the neighbour.
Title card: WHAT IF YOU COULD / TALK TO ANIMALS?
The turn: one true fact with a number about how many animals live around one person in a city (find it and cite the source; no source, no number), then: "And they all want to talk to you."
Our own characters. Second person, short lines, about 20 seconds.`,
    vi: `Chủ đề: Nếu bạn nói chuyện được với động vật thì sao?
Mở đầu bằng ba cảnh thử nhanh, mỗi lần đều nói từ của năng lực: con mèo bảo cơm muộn rồi ("Nghe này."), chim bồ câu chỉ đường cho bạn, con chó nhà bên kể một bí mật về chủ nó.
Thẻ tiêu đề: NẾU BẠN CÓ THỂ / NÓI CHUYỆN VỚI ĐỘNG VẬT?
Cú ngoặt: một sự thật có con số về số con vật sống quanh một người ở thành phố (tìm và ghi nguồn; không có nguồn thì không dùng số), rồi: "Và tất cả đều muốn nói chuyện với bạn."
Nhân vật của riêng phim. Ngôi thứ hai, câu ngắn, khoảng 20 giây.` },
  general: { fields: { length: "0:20" }, credit: WI_CREDIT,
    en: `Topic: What if your phone never ran out of battery?
Cold open, three quick demos, the power's word every time ("Full."): a call that never drops, a night of maps on a road trip, a video that plays for a week.
Title card: WHAT IF YOUR PHONE / NEVER DIED?
The turn: one true fact with a number about how much energy that would take (find it and cite the source; no source, no number), then: "So where is it coming from?"
Second person, lines of 3 to 8 words, each line one picture, about 20 seconds.`,
    vi: `Chủ đề: Nếu điện thoại của bạn không bao giờ hết pin thì sao?
Mở đầu bằng ba cảnh thử nhanh, mỗi lần đều nói từ của năng lực ("Đầy pin."): cuộc gọi không bao giờ rớt, cả đêm dùng bản đồ trên đường đi, một video chạy suốt một tuần.
Thẻ tiêu đề: NẾU ĐIỆN THOẠI / KHÔNG BAO GIỜ TẮT?
Cú ngoặt: một sự thật có con số về lượng năng lượng cần có (tìm và ghi nguồn; không có nguồn thì không dùng số), rồi: "Vậy nó lấy từ đâu ra?"
Ngôi thứ hai, mỗi câu 3 đến 8 chữ, mỗi câu một hình, khoảng 20 giây.` },
};
const WHAT_IF_DRAWN = /^(anidoodle-|brush-cartoon$)/;
/** The sample a style and a film kind use: the What If kind's own (any style), else the style's. */
export const sampleOf = (styleId, kind = null) => (kind === "whatIf" ? WHAT_IF_SAMPLES[WHAT_IF_DRAWN.test(String(styleId ?? "")) ? "characters" : "general"]
  : ANIDOODLE_KIND_SAMPLES[kind] && /^anidoodle-/.test(String(styleId ?? "")) ? ANIDOODLE_KIND_SAMPLES[kind] : BRIEF_SAMPLES[styleId] ?? BRIEF_SAMPLES.general);
/** The samples a style offers on its Sample brief button: [kind or null, label]; only Anidoodle has more than one. */
export const samplesFor = (styleId) => (/^anidoodle-/.test(String(styleId ?? "")) ? [[null, "Story film"], ...Object.entries(ANIDOODLE_KIND_SAMPLES).map(([k, x]) => [k, x.label])] : [[null, "Sample brief"]]);
/** The sample for a style (and film kind) in the UI language (falls back to the general one). */
export const briefSampleFor = (styleId, lang, kind = null) => sampleOf(styleId, kind)[lang === "vi" ? "vi" : "en"];
/** The dialog fields that go with a style's sample: { length, aspect, fps? }. */
export const sampleFieldsFor = (styleId, kind = null) => sampleOf(styleId, kind).fields;
/** Every sample text there is (a box still holding one of them is a sample). */
export const ALL_SAMPLES = [...Object.values(BRIEF_SAMPLES), ...Object.values(WHAT_IF_SAMPLES), ...Object.values(ANIDOODLE_KIND_SAMPLES)];
