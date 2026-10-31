// The sample brief behind the Sample brief button in New project (one per style). For a user who does not know what a brief is: it shows one that fits the chosen style. Its `fields` (length, aspect ratio and
// frame rate) are what the sample was written for: the dialog shows them under Format, with one button to take them; the boxes never change by themselves.
// Sources: the "general" sample is the sample prompt shared as an image ("From idea to app with Claude Code"; author unknown), kept as written (Three.js, materials, scene timings, the finish; its SF Pro, which the app does not have, became Inter: #172, owner 01/11) with only what the dialog
// chooses taken out: the length (15 seconds), the size (1920x1080), the frame rate (60 fps) and the render method (the app renders); its
// fields put 0:15, 16:9 and 60 fps back in the dialog. Its Vietnamese is a full translation. The others are written for this app from each
// style's own inputs (config/styles.json).
// Two languages, the same content; the words inside the film stay English in both, as in the original.
// The 66 Lemo-Opuscar styles ("lemo-<slug>") have theirs in briefSampleLemo.js, written from each style's STYLE.md, with credit;
// the 15 mg-styles-15 styles ("mg-<id>") in briefSampleMg.js, written from each style's prompt, and the 35 anidoodle media
// ("anidoodle-<id>") in briefSampleAnidoodle.js, written from each medium's reference.
import { LEMO_BRIEF_SAMPLES } from "./briefSampleLemo.js";
import { MG_BRIEF_SAMPLES } from "./briefSampleMg.js";
import { ANIDOODLE_BRIEF_SAMPLES, ANIDOODLE_KIND_SAMPLES } from "./briefSampleAnidoodle.js";
import { BRUSH_BRIEF_SAMPLES } from "./briefSampleBrush.js";

const WI_CREDIT = { text: "Written from the What If formula of What If animation by FreshStack, MIT", link: "https://github.com/kelano86/what-if-animation/blob/3725a22d2d101320cae5b7d761af8d75120c4987/references/formula.md" };

const OWN_SAMPLES = {
  general: {
    fields: { length: "0:15", aspect: "16:9", fps: 60 },
    vi: `Làm một phim motion graphics giải thích bằng Three.js, phong cách glassmorphism, tên "From idea to app with Claude Code".

Không gian: một khoảng tối được chiếu sáng bởi một vòm lớn với các mảng gradient mềm màu tím, cam, xanh dương và hồng. Các tấm panel là kính mờ (MeshPhysicalMaterial có transmission, roughness khoảng 0.4, tấm khối đùn bo góc). Mỗi panel có một canvas texture trên mặt, vẽ lại mỗi khung hình cho phần giao diện: viền trắng và chữ trắng font Inter. Màu nhấn #ff8a4c.

Máy quay bay qua 4 cảnh đặt ở các vị trí 3D khác nhau. Nó trôi chậm trong mỗi cảnh và lướt nhanh giữa các cảnh (expo ease). Mỗi cảnh có một nhãn lớn: "STEP 0X" màu cam phía trên một chữ trắng lớn.

1. Describe it (0–3s): một thanh chat bằng kính gõ "Build me a habit tracker with streaks." với con trỏ nhấp nháy. Nút gửi sáng lên, rồi một bong bóng trả lời hiện dấu đang gõ, tiếp theo là "On it. Here's the plan."
2. Plan it (3–6s): một chồng thẻ kính xếp theo chiều sâu. Năm việc trượt vào, rồi lần lượt được tick với dấu check chuyển động và đường gạch ngang.
3. Build it (6–9.5s): một trình soạn code kính tối có chấm cửa sổ và tab gõ ra một component React ngắn có màu cú pháp. Sáu ô tên file bằng kính bay quanh nó theo quỹ đạo 3D. Kết thúc bằng huy hiệu xanh lá "✓ 12 tests passed".
4. Ship it (10–12.5s): một điện thoại kính xoay vào, hiện app habit đã xong. Bộ đếm streak chạy lên 12, các thói quen được tick, một biểu đồ cột mọc lên, và một đợt confetti (instanced) rơi theo trọng lực.
5. Reveal (12.5–15s): máy quay lùi ra thành cảnh rộng thấy mọi cảnh. Một lớp tối mờ dần hiện lên, rồi "ONE CONVERSATION / Idea → App" và một viên kính nhỏ ghi "Built with Claude Code" chuyển động vào, gắn cố định với máy quay.

Xuyên suốt: một ống phát sáng chạy theo đường cong CatmullRom nối mọi cảnh và vẽ dần ra khi câu chuyện đi tới, đầu ống sáng hơn. Rải các khối cầu, vòng và khối icosahedron bằng kính trong có tán sắc (dispersion), thêm các quả cầu phát sáng nhỏ để tạo chiều sâu (parallax), và giữ chúng tránh xa đường bay của máy quay.

Hoàn thiện: render target HDR có MSAA, bloom nhẹ (chỉ ở chỗ sáng), tone mapping trung tính, và một lượt cuối có chút lệch màu (chromatic aberration), vignette và hạt phim. Giữ mọi chữ nằm trong khung và dễ đọc, và kiểm tra ảnh tĩnh của từng cảnh trước khi render cả đoạn.`,
    en: `Make a motion-graphics explainer in Three.js, glassmorphism style, titled "From idea to app with Claude Code".

World: a dark space lit by a big dome with soft violet, orange, blue and pink gradient blobs. Panels are frosted glass (MeshPhysicalMaterial with transmission and roughness around 0.4, rounded extruded slabs). Each panel has a canvas texture on its face, redrawn every frame for the UI: a white border and white text in Inter. Accent colour #ff8a4c.

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
    vi: `Chủ đề: vì sao một đêm ngủ đủ giúp nhớ bài tốt hơn.
Người xem: sinh viên và dân văn phòng trẻ, chưa biết gì về khoa học giấc ngủ.
Thông điệp: bộ não sắp xếp ký ức trong lúc ngủ, nên thức trắng đêm là học dở.

Một ví dụ từ đầu tới cuối: Linh thi lúc 8 giờ sáng và nửa đêm còn 40 trang. Đi theo một mốc năm cô đọc ở trang 12 suốt đêm ấy.
1. Ban ngày, mốc năm ấy rơi vào một hộp thư nhỏ đầy ắp trong đầu, cạnh mọi thứ cô thấy trong ngày.
2. Nếu Linh ngủ, hộp thư được phân loại: mốc năm được cất đi, phần thừa bị bỏ. Một sơ đồ lớn dần, thêm một phần mỗi khi giọng đọc nhắc tới.
3. Nếu Linh thức, hộp thư vẫn đầy và mốc năm trôi mất. Trở lại Linh trong phòng thi: một câu cô biết, một câu không.

Giọng điệu: thân thiện, rõ ràng, như người bạn giải thích, chuyển động vui. Chỉ nói điều nghiên cứu về giấc ngủ thật sự nói, ghi lại nguồn. Kết bằng một câu: ngủ trước khi thi.`,
    en: `Topic: why a night's sleep helps you remember what you studied.
Audience: students and young office workers who know nothing about sleep science.
Message: the brain sorts memories while you sleep, so an all-nighter works against you.

One example from start to finish: Linh has an exam at 8 am and 40 pages left at midnight. Follow one date she reads on page 12 through the night.
1. By day that date lands in a small overflowing inbox in her head, beside everything else she saw today.
2. If she sleeps, the inbox gets sorted: the date is filed away and the rest is dropped. One diagram grows, one part each time the voice names it.
3. If she stays up, the inbox stays full and the date slips out. Back to Linh at the exam: one answer she knows, one she does not.

Tone: friendly and clear, like a friend explaining, with playful moves. Say only what sleep research really says, and note the source. End on one line: sleep before the exam.`,
  },
  "hf-launch": {
    fields: { length: "0:45", aspect: "16:9" },
    vi: `Sản phẩm: "Xu", một ứng dụng quản lý chi tiêu tự đặt ra cho người trẻ, vừa ra bản mới có tính năng chia hoá đơn nhóm. Đây không phải sản phẩm thật: vẽ màn hình của nó, ghi nhãn "Example", và đừng tìm trên web.
Người xem: người 20-30 tuổi hay đi ăn chung và ngại đòi tiền bạn.

Vấn đề: chia tiền thủ công rất mệt và dễ gây khó chịu.
Giải pháp: quét hoá đơn, chọn ai ăn gì, app tính sẵn và gửi nhắc nhẹ nhàng.
Ba điểm nổi bật: quét hoá đơn, chia theo món, nhắc không gượng.

Giọng điệu: vui, nhẹ, chuyển động táo bạo. Màu theo thương hiệu (xanh lá và trắng). Kết bằng lời kêu gọi "Tải Xu miễn phí".`,
    en: `Product: "Xu", a made-up budgeting app for young people, newly released with a group bill-splitting feature. It is not a real product: draw its screens, label them "Example", and do not search the web for it.
Audience: 20 to 30 year-olds who eat out in groups and dread chasing friends for money.

Problem: splitting by hand is tiring and awkward.
Solution: scan the receipt, pick who had what, the app does the maths and sends a gentle reminder.
Three highlights: scan the receipt, split by item, reminders without awkwardness.

Tone: light and playful, with bold moves. Brand colours (green and white). End on the call to action "Get Xu free".`,
  },
  "hf-music": {
    fields: { length: "3:00", aspect: "16:9", fps: 60 },
    vi: `Bài nhạc: bài của tôi, thêm vào ở phần Tư liệu; lời bài hát dán ở bước Lời bài hát. Phim dài đúng bằng bài hát.
Tâm trạng: ấm áp, hơi hoài niệm, nhịp vừa. Đoạn điệp khúc bùng lên.

Hình ảnh: video lời bài hát. Chữ được hát là nhân vật chính: mỗi chữ đáp đúng lúc được hát, chữ hát lại là một khoảnh khắc mới, có cỡ, màu và cách xuất hiện riêng. Ít nhất 3 giây một thế giới mới: đoạn đầu lạnh và tối, điệp khúc sáng và ấm, và điệp khúc trở về một sân khấu lớn dần mỗi lần. Một vật nhỏ, chiếc diều giấy, đi qua mọi thế giới, được chuyền từ cảnh này sang cảnh khác.

Nhịp: đổi cảnh theo ô nhịp và phách mạnh, chuyển động đáp đúng các cú nhấn, điệp khúc nhanh hơn. Tên bài và nghệ sĩ chỉ hiện ở đoạn dạo đầu, trước chữ hát đầu tiên. Chỉ có bài hát: không tiếng động, không âm nền.`,
    en: `Track: my song, added in Assets; the lyrics are pasted in the Lyrics step. The film runs as long as the song.
Mood: warm, a little nostalgic, mid tempo. The chorus lifts.

Visuals: a lyric video. The sung words are the star: each word lands on its sung time, and a word sung again is a new moment, with its own size, colour and entrance. A new world at least every 3 seconds: the verses cool and dark, the chorus bright and warm, and the chorus comes home to one stage that grows bigger each time. One small thing, a paper kite, travels through every world, passed from shot to shot.

Rhythm: shots change on bars and downbeats, the moves land on the hits, the chorus runs faster. Song title and artist only over the intro, before the first sung word. The song alone: no sound effects, no ambience.`,
  },
  "hf-data": {
    fields: { length: "0:40", aspect: "16:9" },
    vi: `Chủ đề: một thư viện khu phố cho mượn hạt giống thay vì sách, và năm đầu tiên của nó qua những con số.
Người xem: người sống trong khu phố, chưa từng nghe về thư viện hạt giống.
Thông điệp: một ngăn kéo hạt giống nhỏ đã thành một mùa vụ chung của cả phố.

Từng con số một, mỗi số một cảnh: 1 tủ ngăn kéo cũ ở góc thư viện; 214 gói hạt được mượn; 68 gói được trả lại sau mùa, đầy hạt để dành từ vụ thu hoạch; 31 loại rau; 1 bữa cơm chung cuối năm.
Mỗi con số là thứ lớn nhất trên màn hình và biến thành vật thật: 214 gói hạt xếp thành một luống, 31 loại rau mọc thành một vườn nhỏ.

Phong cách: giấy kraft, mực xanh lá đậm, chữ số to và rõ. Không giọng đọc; chữ ngắn đi kèm từng con số. Thư viện và các con số là tự đặt ra cho phim này, nên có một dòng nhỏ trên màn hình ghi "Example".`,
    en: `Topic: a neighbourhood library that lends seeds instead of books, and its first year in numbers.
Audience: people living nearby who have never heard of a seed library.
Message: one small drawer of seeds became a harvest the whole street shares.

One number at a time, one scene each: 1 old card-catalogue drawer in the corner of the library; 214 seed packets borrowed; 68 packets came back after the season, filled with seed saved from the harvest; 31 kinds of vegetable; 1 shared dinner at the end of the year.
Each number is the biggest thing on screen and becomes a real thing: 214 packets lined up into a garden bed, 31 kinds sprouting into a small garden.

Style: kraft paper, deep green ink, large clear figures. No voice-over; a short line of text with each number. The library and its numbers are made up for this film, so a small line on screen says "Example".`,
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
    vi: `Chủ đề: câu chuyện ảnh về một món ăn gia truyền: nồi canh cá của bà tôi, trong sáu tấm hình.
Gồm 6 slide, mỗi slide một hình và một dòng ngắn:
1. Tiêu đề: "Một nồi canh, ba thế hệ".
2. Căn bếp của bà, nơi mọi chuyện bắt đầu.
3. Trang công thức viết tay, có vết ố ở góc.
4. Mẹ tôi đổi một nguyên liệu.
5. Tôi nấu hỏng lần đầu.
6. Cả nhà bên bàn ăn, và dòng cuối: "Vẫn chưa ngon bằng của bà."

Hình: sáu tấm ảnh của tôi, thêm vào ở phần Tư liệu. Chưa có ảnh thì vẽ sáu cảnh đơn giản và ghi nhãn "Example" trên mỗi cảnh.
Phong cách: ấm áp, chữ to, tối đa hai dòng mỗi slide. Hình nào cũng luôn chuyển động (đẩy chậm, trôi nhẹ, hình và chữ lệch lớp), và mỗi lần đổi slide đi ra từ chính hình trước: lật trang, làn hơi quét qua khung, chiếc thìa băng ngang màn hình. Nhạc ấm, không giọng đọc.`,
    en: `Topic: a photo story of one family recipe: my grandmother's fish soup, in six pictures.
Six slides, one picture and one short line each:
1. Title: "One pot, three generations".
2. Her kitchen, where it began.
3. The handwritten page, with a stain on the corner.
4. My mother changing one ingredient.
5. Me getting it wrong the first time.
6. All of us at the table, and the last line: "Still not as good as hers."

Pictures: my own six photos, added in Assets. No photos yet: draw six simple scenes and label each "Example".
Style: warm, big type, two lines at most per slide. Every picture keeps moving (a slow push, a drift, parallax between picture and words), and each slide change comes out of the picture before it: a page turn, steam wiping the frame, a spoon crossing the screen. Warm music, no voice-over.`,
  },
  // the What If film style's own (it draws the author's stick figures in a lit room, 1920 x 1080); our own premise, no channel's episode
  "what-if": {
    fields: { length: "0:20", aspect: "16:9", fps: 30 }, credit: WI_CREDIT,
    vi: `Chủ đề: Nếu bạn tàng hình được, nhưng chỉ khi đang nín thở thì sao?
Mở đầu bằng ba cảnh thử nhanh, mỗi lần đều nói từ của năng lực ("Nín."): bạn vượt hàng dài nhất phố, bạn lấy miếng bánh cuối ngay trước mũi em trai, bạn đứng ngay sau lưng bạn thân khi họ đang nói về bạn.
Thẻ tiêu đề: NẾU BẠN CÓ THỂ / BIẾN MẤT TRONG MỘT HƠI?
Cú ngoặt: một sự thật có con số về việc mắt tàng hình thật ra thấy được gì, vì mắt chỉ nhìn thấy nhờ giữ lại ánh sáng (tìm và ghi nguồn; không có nguồn thì không dùng số), rồi: "Đó là thật." và "Vậy giờ bạn đang thấy gì?"
Ngôi thứ hai, mỗi câu 3 đến 8 chữ, mỗi câu một hình, khoảng 20 giây.`,
    en: `Topic: What if you could turn invisible, but only while you hold your breath?
Cold open, three quick demos, the power's word every time ("Hold."): you skip the longest queue in town, you take the last slice of cake from under your brother's nose, you stand right behind your best friend while they talk about you.
Title card: WHAT IF YOU COULD / VANISH ON ONE BREATH?
The turn: one true fact with a number about what an invisible eye could really see, since an eye only sees by catching light (find it and cite the source; no source, no number), then: "That's real." and "So what do you see right now?"
Second person, lines of 3 to 8 words, each line one picture, about 20 seconds.`,
  },
  "map-explainer": {
    fields: { length: "0:40", aspect: "16:9", fps: 30 },
    vi: `Một câu chuyện bản đồ về hai hòn đảo Diomede ở eo biển Bering. Hai đảo cách nhau chưa tới 4 km, nhưng đường đổi ngày đi qua giữa: đảo này thuộc Nga, đảo kia thuộc Mỹ, và đứng ở đảo này nhìn được sang ngày mai.

Mở bằng câu: "From this island, you can see tomorrow." Kể ngắn, dí dỏm, tiếng Anh. Kiểm mọi dữ kiện trước khi viết lời, và cho tôi đọc lời trước khi làm giọng.`,
    en: `A map story about the two Diomede islands in the Bering Strait. They sit less than 4 km apart, but the date line runs between them: one is Russian, one is American, and from one you can look across at tomorrow.

Open on the line: "From this island, you can see tomorrow." Short, dry and funny, in English. Check every fact before you write the script, and show me the script before you make the voice.`,
  },
};

export const BRIEF_SAMPLES = { ...OWN_SAMPLES, ...LEMO_BRIEF_SAMPLES, ...MG_BRIEF_SAMPLES, ...ANIDOODLE_BRIEF_SAMPLES, ...BRUSH_BRIEF_SAMPLES };

// The What If film kind's two samples, any style: one for a style that draws characters, one for the others.
// Our own premises, written from the seven-beat formula of What If animation (FreshStack, MIT; kelano86/what-if-animation at 3725a22);
// no channel's episode. The twist's fact is left for Claude to find and cite (rules/what-if §3).
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
