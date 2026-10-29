// The sample brief of each mg-styles-15 style: written for this app from the
// style's prompt (its Creative seed and Signature features) and lightly reworded, so it reads as a brief and not as a copy of the demo:
// subject, the story in a few beats, the style's signature techniques, length, mood. The author's films are 10 s; the samples keep that
// length. A style named after a real creator's look keeps the grammar only (19-paperclip). Credit: adapted from Vincentwei1021's
// prompt, MIT, at the pinned commit 49052d8. Same shape as BRIEF_SAMPLES (briefSample.js): { fields, vi, en } plus credit.

const AT = "https://github.com/Vincentwei1021/mg-styles-15/blob/49052d80bfaf9fa8412cc9710530e5e95a3b8d8c/prompts";
const credit = (id) => ({ text: "Adapted from Vincentwei1021 (mg-styles-15) prompt, MIT", link: `${AT}/${id}.md` });
const S = (id, aspect, fps, en, vi) => [`mg-${id}`, { fields: { length: "0:10", aspect, fps }, vi, en, credit: credit(id) }];

export const MG_BRIEF_SAMPLES = Object.fromEntries([
  S("01-flat-vector", "16:9", 30,
    `Topic: a one-shot brand explainer for a fictional banking app, "Pocketly", tagline "Money, made simple."
Story: on a bold colour field a single coin drops in and settles; it becomes the sun over a flat city that pops up building by building. The camera pushes into one window where a character checks the app and smiles; the notification bubble grows into a shape wipe, icons burst in on the beat, and everything flies into the logo.
Style: flat vector, solid colour blocks, geometric characters, no outlines, high-saturation brand palette; elastic overshoot on every entrance; one continuous camera.
Mood: bright, friendly, confident. About 10 seconds, no narration.`,
    `Chủ đề: phim giới thiệu thương hiệu một cảnh liền cho ứng dụng ngân hàng hư cấu "Pocketly", khẩu hiệu "Money, made simple."
Câu chuyện: trên một mảng màu đậm, một đồng xu rơi xuống và đứng lại; nó thành mặt trời trên một thành phố phẳng mọc lên từng toà nhà. Máy quay tiến vào một ô cửa sổ, nơi một nhân vật xem ứng dụng và mỉm cười; bong bóng thông báo phóng to thành một cú chuyển cảnh bằng hình khối, các biểu tượng bật ra theo nhịp, rồi mọi thứ bay vào logo.
Phong cách: vector phẳng, mảng màu đặc, nhân vật hình học, không viền, bảng màu thương hiệu đậm; mọi lần xuất hiện đều có độ nảy quá đà; một máy quay liền mạch.
Cảm giác: tươi, thân thiện, tự tin. Khoảng 10 giây, không giọng đọc.`),
  S("02-line-art", "16:9", 30,
    `Topic: a brand film for a fictional architecture studio, "Arcline", told as one continuous line.
Story: a single gold line draws a seed; the seed sprouts into a tree whose branches become the frame of a house; the house extends into a skyline, the horizon lifts and loops into a monogram, the monogram fills with gold and the studio's name fades up beneath it.
Style: line art: one constant thin gold line on a deep navy ground, a glowing pen tip leading the draw, slower at corners, the camera drifting to keep the tip in frame, then pulling back to show the whole drawing as a poster.
Mood: calm, elegant, premium. About 10 seconds, no narration.`,
    `Chủ đề: phim thương hiệu cho một văn phòng kiến trúc hư cấu, "Arcline", kể bằng một nét liền duy nhất.
Câu chuyện: một nét vàng vẽ ra một hạt giống; hạt nảy mầm thành cái cây, cành cây thành khung một ngôi nhà; ngôi nhà kéo dài thành đường chân trời thành phố, đường chân trời nhấc lên và cuộn thành một monogram, monogram được tô vàng và tên văn phòng hiện lên bên dưới.
Phong cách: nét vẽ đơn: một nét vàng mảnh đều trên nền xanh đen đậm, đầu bút sáng dẫn đường, chậm lại ở góc, máy quay trôi theo đầu bút, rồi lùi ra cho thấy cả bức vẽ như một tấm poster.
Cảm giác: điềm tĩnh, thanh lịch, cao cấp. Khoảng 10 giây, không giọng đọc.`),
  S("03-isometric", "16:9", 30,
    `Topic: a smart campus that builds itself, for a fictional cloud company, "Nimbus".
Story: ground tiles drop in as a wave from the centre; buildings grow with a little overshoot, roofs land a beat later, trees pop and windows light up in sequence. Then life: cars loop the roads, drones carry parcels, data streams pulse between buildings, a wind turbine spins. The camera pulls back to show the whole island floating in a pastel sky with the logo.
Style: true isometric 2.5D, no perspective, pastel studio palette with soft shadows, parallel camera slides with parallax clouds.
Mood: clever, cute, tidy. About 10 seconds, no narration.`,
    `Chủ đề: một khu công nghệ tự dựng lên, cho một công ty điện toán đám mây hư cấu, "Nimbus".
Câu chuyện: các ô đất rơi xuống như một làn sóng từ giữa ra; các toà nhà mọc lên có độ nảy nhẹ, mái nhà đặt xuống sau một nhịp, cây bật lên và cửa sổ sáng dần. Rồi sự sống: xe chạy vòng quanh các con đường, drone chở bưu kiện, luồng dữ liệu nhấp nháy giữa các toà nhà, một tua-bin gió quay. Máy quay lùi ra cho thấy cả hòn đảo trôi giữa bầu trời pastel cùng logo.
Phong cách: isometric 2.5D đúng chuẩn, không phối cảnh, bảng màu pastel như phòng chụp với bóng mềm, máy quay trượt song song, mây tiền cảnh chuyển động lệch.
Cảm giác: thông minh, dễ thương, gọn gàng. Khoảng 10 giây, không giọng đọc.`),
  S("04-3d-render", "16:9", 24,
    `Topic: a soft, satisfying ident for a fictional skincare brand, "Plush".
Story: in a pastel studio a field of glossy pills ripples like a wave. The brand's inflated 3D wordmark drops in, jiggles with a damped spring, collides with the field and pushes it aside, then settles into a clean hero frame held for a breath.
Style: 3D render look: candy gummy, glossy plastic and frosted glass materials, big soft lights, shallow depth of field, a cloner array, long-tail easing. (The author rendered this style in Blender; here it is built in three.js.)
Mood: soft, tactile, premium. About 10 seconds, no narration.`,
    `Chủ đề: một đoạn nhận diện mềm mại, dễ chịu cho một thương hiệu dưỡng da hư cấu, "Plush".
Câu chuyện: trong một phòng chụp màu pastel, một cánh đồng những viên con nhộng bóng bẩy gợn lên như sóng. Chữ thương hiệu 3D phồng như bóng hơi rơi xuống, rung rinh như lò xo tắt dần, va vào cánh đồng và đẩy nó dạt ra, rồi đứng yên thành một khung hình đẹp trong một nhịp thở.
Phong cách: kiểu render 3D: chất liệu kẹo dẻo, nhựa bóng và kính mờ, đèn mềm lớn, độ sâu trường ảnh nông, mảng vật thể nhân bản, chuyển động có đuôi dài. (Tác giả render style này bằng Blender; trong app nó được dựng bằng three.js.)
Cảm giác: mềm, chạm được, cao cấp. Khoảng 10 giây, không giọng đọc.`),
  S("05-cel-boil", "16:9", 24,
    `Topic: a hand-made opening for a fictional craft festival, "Hand Made".
Story: a matchstick strikes with a single smear frame; a little flame spirit jumps out, squashes, and dances. It bursts into hand-drawn effects, puffs of smoke, sparks, star bursts and speed lines, which re-form into the hand-lettered festival title that keeps breathing on the hold.
Style: frame-by-frame cel animation on warm paper: ink lines that boil every two frames, animation on twos, smears on the fast moves, slightly off-register colour, three or four colours only.
Mood: playful, warm, crafty. About 10 seconds, no narration.`,
    `Chủ đề: đoạn mở đầu làm tay cho một lễ hội thủ công hư cấu, "Hand Made".
Câu chuyện: một que diêm bật lửa với đúng một khung kéo nhoè; một tinh linh lửa nhỏ nhảy ra, ép người rồi nhảy múa. Nó vỡ thành các hiệu ứng vẽ tay, những cụm khói, tia lửa, ngôi sao bùng nổ và đường tốc độ, rồi những hiệu ứng ấy tụ lại thành tên lễ hội viết tay vẫn tiếp tục "thở" khi đứng yên.
Phong cách: hoạt hình vẽ tay từng khung trên giấy ấm: nét mực rung nhẹ mỗi hai khung, chuyển động một-hình-hai-khung, khung kéo nhoè ở động tác nhanh, màu hơi lệch nét, chỉ ba bốn màu.
Cảm giác: tinh nghịch, ấm áp, thủ công. Khoảng 10 giây, không giọng đọc.`),
  S("06-collage", "16:9", 30,
    `Topic: a surreal opener for a fictional ideas magazine, "Noggin".
Story: on kraft paper a Victorian portrait cut-out stares at us; the top of its head flips open like a lid to reveal deep space, and flowers, birds, planets, pointing hands and a vintage rocket spill out. Hands slap new pieces onto the page, torn strips fly across, and bold red-and-black diagonal type lands: "the mind is a collage".
Style: Dada cut-out collage: public-domain photos with rough white scissor edges and halftone, a mouth on its own flap, movement on 12 fps with small hand-placed jitter, a torn-paper transition to the end card.
Mood: witty, surprising, editorial. About 10 seconds, no narration.`,
    `Chủ đề: đoạn mở đầu siêu thực cho một tạp chí ý tưởng hư cấu, "Noggin".
Câu chuyện: trên giấy kraft, một chân dung cắt dán thời Victoria nhìn thẳng vào ta; đỉnh đầu bật mở như nắp hộp để lộ vũ trụ sâu thẳm, và hoa, chim, hành tinh, bàn tay chỉ trỏ cùng một tên lửa cổ tràn ra. Những bàn tay đập các mảnh mới lên trang giấy, các dải giấy xé bay ngang, và dòng chữ chéo đỏ đen đậm đáp xuống: "the mind is a collage".
Phong cách: cắt dán Dada: ảnh thuộc phạm vi công cộng có mép cắt kéo trắng thô và lưới điểm halftone, cái miệng là một mảnh riêng mở đóng, chuyển động 12 hình/giây có rung tay nhẹ, chuyển sang khung kết bằng giấy xé.
Cảm giác: dí dỏm, bất ngờ, kiểu tạp chí. Khoảng 10 giây, không giọng đọc.`),
  S("07-liquid", "16:9", 30,
    `Topic: a liquid logo reveal for a fictional energy drink, "Flux".
Story: glossy droplets fall and splash on a deep plum ground; blobs merge with stretched necks that snap and rebound, smaller drops trailing behind. A big wave of liquid floods across the frame as a transition, then the liquid gathers into the wordmark; a last drip falls from the logo and ripples.
Style: liquid motion: thick candy liquid from orange to pink to violet, specular highlights and a rim light so it reads as 3D, metaball fusion, flung organic easing, never a straight line.
Mood: juicy, high-energy, satisfying. About 10 seconds, no narration.`,
    `Chủ đề: màn hiện logo dạng lỏng cho một loại nước tăng lực hư cấu, "Flux".
Câu chuyện: những giọt chất lỏng bóng bẩy rơi xuống và bắn tung trên nền tím mận; các khối nhập vào nhau với những cái cổ kéo dài, đứt ra rồi nảy lại, những giọt nhỏ theo sau. Một con sóng chất lỏng lớn tràn qua khung hình làm chuyển cảnh, rồi chất lỏng tụ lại thành chữ thương hiệu; một giọt cuối rơi khỏi logo và lan gợn.
Phong cách: chuyển động chất lỏng: chất lỏng đặc như kẹo từ cam sang hồng sang tím, điểm sáng phản chiếu và viền sáng để trông như 3D, các khối hoà vào nhau, nhịp văng hữu cơ, không bao giờ có đường thẳng.
Cảm giác: mọng, tràn năng lượng, đã mắt. Khoảng 10 giây, không giọng đọc.`),
  S("08-morph", "16:9", 30,
    `Topic: one shape tells the story of a day, for a fictional travel app, "Wayfare".
Story: a coffee cup morphs into a circle, then into the sun, a sunset over the sea, a gull, a paper plane, a location pin, a heart, and finally the app's logo with its name, each change landing on the beat while the background colour wipes to a new block.
Style: shape morph: every change passes through a simple in-between shape with a little rotation and squash and stretch, parts morph in sync, clean colour-block wipes, never a tangle mid-morph.
Mood: smooth, clever, uplifting. About 10 seconds, no narration.`,
    `Chủ đề: một hình khối kể chuyện một ngày, cho một ứng dụng du lịch hư cấu, "Wayfare".
Câu chuyện: một tách cà phê biến thành hình tròn, rồi thành mặt trời, hoàng hôn trên biển, một con mòng biển, một chiếc máy bay giấy, một ghim định vị, một trái tim, và cuối cùng là logo ứng dụng cùng tên của nó, mỗi lần biến đúng một nhịp trong lúc màu nền lau sang một mảng màu mới.
Phong cách: biến hình: mỗi lần đổi đều đi qua một hình trung gian đơn giản với chút xoay và ép giãn, các phần nhỏ biến cùng lúc, chuyển nền bằng mảng màu sạch, không bao giờ rối nét ở giữa lúc biến.
Cảm giác: mượt, thông minh, hứng khởi. Khoảng 10 giây, không giọng đọc.`),
  S("09-bauhaus", "16:9", 30,
    `Topic: a kinetic poster for a fictional design week, "Form Week".
Story: grid lines draw on cream paper and a red circle lands. On each beat one module acts: quarter circles turn about a corner, semicircles slide one module, triangles flip, squares split, until the composition becomes a poster. A wave cascades across the grid on the drop, and everything freezes into the final poster with the event title set vertically.
Style: geometric Bauhaus: red, yellow, blue and black on cream, a strict modular grid, every move an exact number of modules, no overshoot, beat-driven.
Mood: rational, rhythmic, bold. About 10 seconds, a minimal techno beat.`,
    `Chủ đề: một tấm poster động cho một tuần lễ thiết kế hư cấu, "Form Week".
Câu chuyện: các đường lưới được vẽ trên giấy kem và một hình tròn đỏ đáp xuống. Mỗi nhịp một mô-đun hoạt động: phần tư hình tròn xoay quanh một góc, nửa hình tròn trượt một mô-đun, tam giác lật, hình vuông tách đôi, cho tới khi bố cục thành một tấm poster. Một làn sóng lan khắp lưới đúng lúc nhạc dồn, rồi mọi thứ đứng yên thành tấm poster cuối với tên sự kiện xếp dọc.
Phong cách: hình học Bauhaus: đỏ, vàng, xanh và đen trên nền kem, lưới mô-đun chặt chẽ, mọi chuyển động đúng số nguyên mô-đun, không nảy quá đà, chạy theo nhịp.
Cảm giác: lý tính, nhịp nhàng, mạnh mẽ. Khoảng 10 giây, nhạc techno tối giản.`),
  S("10-synthwave", "16:9", 30,
    `Topic: a retro title sequence for a fictional racing game, "Night Circuit".
Story: VHS tracking noise and a PLAY sign, then the camera flies low over a neon grid toward a striped sunset sun between wireframe mountains and palms. A chrome title slams in with a lens flare and a glint sweeps across it; a pink neon script word writes itself on with a flicker, and the ride continues to the hero frame.
Style: 80s synthwave and VHS: magenta and cyan perspective grid, striped retro sun, chrome lettering, double glow, scanlines and colour bleed.
Mood: nostalgic, fast, cool. About 10 seconds, a synthwave track.`,
    `Chủ đề: đoạn tựa kiểu retro cho một trò chơi đua xe hư cấu, "Night Circuit".
Câu chuyện: nhiễu băng VHS và chữ PLAY, rồi máy quay bay thấp trên một lưới neon về phía mặt trời hoàng hôn kẻ sọc giữa những ngọn núi khung dây và hàng cọ. Tựa chữ mạ crôm đập xuống cùng vệt loé ống kính, một tia sáng lướt qua chữ; một chữ viết tay neon hồng tự hiện ra kèm nhấp nháy, và chuyến đi tiếp tục tới khung hình chính.
Phong cách: synthwave và VHS thập niên 80: lưới phối cảnh hồng tím và xanh lơ, mặt trời kẻ sọc, chữ mạ crôm, ánh sáng hai lớp, vạch quét và lem màu.
Cảm giác: hoài niệm, nhanh, ngầu. Khoảng 10 giây, nhạc synthwave.`),
  S("12-aurora-glass", "16:9", 30,
    `Topic: a launch film for a fictional AI notes product, "Lumen — think in light".
Story: slow aurora colours drift on a deep indigo ground. Frosted glass cards float in with depth and a slight tilt; inside them a chat bubble, a voice waveform and a toggle come alive. A liquid-glass lens glides across and magnifies the cards and the light, then the product name settles in a light, elegant sans.
Style: aurora gradients and glassmorphism: blurred colour blobs in adjacent hues, frosted cards with a 1 px highlight, true refraction on the lens, breathing sine easing, nothing fast.
Mood: calm, translucent, expensive. About 10 seconds, an ambient pad.`,
    `Chủ đề: phim ra mắt cho một sản phẩm ghi chú AI hư cấu, "Lumen — think in light".
Câu chuyện: những mảng màu cực quang trôi chậm trên nền chàm sẫm. Các thẻ kính mờ trôi vào có chiều sâu và hơi nghiêng; bên trong, một bong bóng chat, một sóng âm giọng nói và một công tắc sống dậy. Một thấu kính kính lỏng lướt qua phóng to các thẻ và ánh sáng, rồi tên sản phẩm hiện ra bằng một kiểu chữ không chân mảnh, thanh lịch.
Phong cách: dải màu cực quang và kính mờ: các đốm màu nhoè cùng gam lân cận, thẻ kính mờ có viền sáng 1 px, khúc xạ thật trên thấu kính, nhịp "thở" hình sin, không có gì nhanh.
Cảm giác: điềm tĩnh, trong trẻo, đắt tiền. Khoảng 10 giây, nhạc nền ambient.`),
  S("18-hanazi", "9:16", 30,
    `Topic: a vertical pet vlog moment with variety-show captions: "my cat's happiest minute".
Story: footage-style photos of a cat with slow pans and quick punch-in zooms on the funny moments. On each beat a caption pops: a big rounded title, bouncing question marks, a "shocked!!" burst with speed lines, a tiny whispered aside, sparkles, sweat drops, and a "cat approved" stamp to end.
Style: variety-show kinetic captions: rounded heavy type with fill, thick white stroke, coloured outer stroke and shadow; pop from 0 to 1.15 to 1 in about eight frames, per-letter bounce, high-saturation pink, yellow and cyan.
Mood: silly, warm, loud. About 10 seconds, vertical 9:16, bouncy sound effects.`,
    `Chủ đề: một khoảnh khắc vlog thú cưng khung dọc với chữ kiểu gameshow: "phút vui nhất của con mèo nhà tôi".
Câu chuyện: những bức ảnh như cảnh quay về một chú mèo, lia chậm và phóng nhanh vào các khoảnh khắc buồn cười. Mỗi nhịp một dòng chữ bật lên: một tựa lớn tròn trịa, những dấu hỏi nảy tưng tưng, khung nổ "sốc!!" kèm đường tốc độ, một lời thì thầm nhỏ xíu, lấp lánh, giọt mồ hôi, và con dấu "mèo đã duyệt" để kết.
Phong cách: chữ động kiểu gameshow: chữ tròn đậm có màu tô, viền trắng dày, viền màu ngoài và bóng đổ; bật từ 0 lên 1,15 rồi về 1 trong khoảng tám khung, từng chữ nảy, hồng vàng xanh lơ thật đậm.
Cảm giác: ngớ ngẩn, ấm áp, rộn ràng. Khoảng 10 giây, khung dọc 9:16, hiệu ứng âm thanh nảy.`),
  S("19-paperclip", "16:9", 30,
    `Topic: a hard-science explainer: "how many metals are inside a laptop?"
Story: one continuous camera move over a giant calm canvas: a sticker photo of a laptop, then its exploded parts with labelled leader lines, then a periodic table where the metals light up, a bar chart growing with a count-up, a world map where supply routes draw themselves, and a pull-back to a bold title card with one huge number.
Style: sticker explainer: cut-out photos with a thick white outline and soft shadow, flat icons and exact charts on a blue-grey canvas, two or three colours plus one accent, strict alignment; every beat adds one new element.
Mood: clear, curious, precise. About 10 seconds, short narration.`,
    `Chủ đề: phim giải thích khoa học: "trong một chiếc laptop có bao nhiêu kim loại?"
Câu chuyện: một đường máy liền mạch trên một tấm canvas khổng lồ, tông màu dịu: một ảnh dán hình chiếc laptop, rồi các bộ phận tách rời có đường dẫn ghi nhãn, rồi một bảng tuần hoàn nơi các kim loại sáng lên, một biểu đồ cột mọc lên kèm số đếm tăng dần, một bản đồ thế giới nơi các tuyến cung ứng tự vẽ ra, và máy quay lùi ra tới một khung tiêu đề đậm với một con số thật lớn.
Phong cách: giải thích kiểu ảnh dán: ảnh cắt có viền trắng dày và bóng mềm, biểu tượng phẳng và biểu đồ chính xác trên nền xanh xám, hai ba màu cộng một màu nhấn, căn hàng chặt; mỗi nhịp thêm một thứ mới.
Cảm giác: rõ ràng, tò mò, chính xác. Khoảng 10 giây, giọng đọc ngắn.`),
  S("20-pixel", "16:9", 30,
    `Topic: an attract screen for a fictional retro game, "Pixel Quest".
Story: a little hero sprite runs through a side-scrolling world with layered parallax, jumps, collects coins with a sparkle and bops a slime while the palette shifts from day to sunset. A treasure chest opens with a burst of light, a dialogue box types a welcome line, and the chunky pixel logo drops in with a shine sweep.
Style: pixel art at a low internal resolution scaled up with nearest-neighbour, a limited palette with dithered gradients, whole-pixel movement, stepped sprite animation, an optional gentle CRT pass.
Mood: nostalgic, cheerful, adventurous. About 10 seconds, chiptune music.`,
    `Chủ đề: màn hình chờ cho một trò chơi retro hư cấu, "Pixel Quest".
Câu chuyện: một nhân vật pixel nhỏ chạy qua thế giới cuộn ngang có nhiều lớp cảnh chuyển động lệch nhau, nhảy lên, nhặt xu kèm lấp lánh và dẫm bẹp một con slime trong lúc bảng màu chuyển từ ban ngày sang hoàng hôn. Một rương báu mở ra với một luồng sáng, một hộp thoại gõ ra lời chào, và logo pixel to bản rơi xuống kèm vệt sáng lướt qua.
Phong cách: pixel art ở độ phân giải gốc thấp phóng to kiểu điểm gần nhất, bảng màu giới hạn với chuyển màu dither, di chuyển đúng từng pixel, hoạt hình nhân vật theo bước, có thể thêm lớp CRT nhẹ.
Cảm giác: hoài niệm, vui tươi, phiêu lưu. Khoảng 10 giây, nhạc chiptune.`),
  S("22-hud", "16:9", 30,
    `Topic: a sci-fi interface sequence for a fictional drone search-and-rescue system, "Kestrel".
Story: cyan lines draw on in layers on a dark teal ground: a hex grid, rotating rings with ticks, a radar sweep with blips, columns of numbers rolling and settling, typed status lines. A wireframe hologram of the drone turns at the centre. A target is found, lock brackets snap in, and everything flips to alert orange with "target locked" and its coordinates.
Style: cyberpunk HUD / FUI: cyan and orange neon linework, monospace data, glow, slight chromatic aberration, scanlines and restrained micro-glitches; film-UI density with restraint.
Mood: tense, precise, high-tech. About 10 seconds, darksynth pulse and HUD beeps.`,
    `Chủ đề: chuỗi giao diện khoa học viễn tưởng cho một hệ thống drone cứu hộ hư cấu, "Kestrel".
Câu chuyện: các đường xanh lơ vẽ ra từng lớp trên nền xanh mòng két sẫm: lưới lục giác, các vòng xoay có vạch chia, một vệt quét radar với các chấm tín hiệu, những cột số chạy rồi dừng, các dòng trạng thái được gõ ra. Một hologram khung dây của chiếc drone xoay ở giữa. Mục tiêu được tìm thấy, khung khoá mục tiêu bật vào, và mọi thứ chuyển sang màu cam báo động với dòng "target locked" và toạ độ.
Phong cách: giao diện HUD / FUI cyberpunk: nét neon xanh lơ và cam, dữ liệu chữ đều khoảng, ánh sáng loé, lệch màu nhẹ, vạch quét và những nhiễu nhỏ có tiết chế; dày thông tin như giao diện phim nhưng vẫn kiềm chế.
Cảm giác: căng thẳng, chính xác, công nghệ cao. Khoảng 10 giây, nhạc darksynth và tiếng bíp giao diện.`),
]);
