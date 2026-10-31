// The sample brief of each mg-styles-15 style: written for this app from the
// style's prompt (its Signature features and Sound line), with a story of its own: the prompt's Creative seed is one example, never to copy
// (audit 91, owner 01/11): subject, the story in a few beats, the style's signature techniques, length, mood. The author's films are 10 s; the samples keep that
// length. A style named after a real creator's look keeps the grammar only (19-paperclip). Credit: written from Vincentwei1021's
// prompt, MIT, at the pinned commit 49052d8. Same shape as BRIEF_SAMPLES (briefSample.js): { fields, vi, en } plus credit.

const AT = "https://github.com/Vincentwei1021/mg-styles-15/blob/49052d80bfaf9fa8412cc9710530e5e95a3b8d8c/prompts";
const credit = (id) => ({ text: "Written from Vincentwei1021 (mg-styles-15) prompt, MIT", link: `${AT}/${id}.md` });
const S = (id, aspect, fps, en, vi) => [`mg-${id}`, { fields: { length: "0:10", aspect, fps }, vi, en, credit: credit(id) }];

export const MG_BRIEF_SAMPLES = Object.fromEntries([
  S("01-flat-vector", "16:9", 30,
    `Topic: a one-shot brand explainer for a fictional grocery app, "Pantry Run", tagline "Dinner, sorted."
Story: on a bold colour field a lemon drops in, squashes and bounces; it rolls through a flat kitchen that unfolds room by room. The camera pushes into an open, empty fridge; a phone pops up, a basket fills with icons on the beat, a scooter bursts through the back wall in a shape wipe, and everything flies into the logo.
Style: flat vector, solid colour blocks, geometric characters, no outlines, high-saturation brand palette; elastic overshoot on every entrance; one continuous camera.
Mood: bright, friendly, confident. About 10 seconds, no narration.`,
    `Chủ đề: phim giới thiệu thương hiệu một cảnh liền cho ứng dụng đi chợ hư cấu "Pantry Run", khẩu hiệu "Dinner, sorted."
Câu chuyện: trên một mảng màu đậm, một quả chanh rơi xuống, ép dẹt rồi nảy lên; nó lăn qua một căn bếp phẳng mở ra từng phòng. Máy quay tiến vào tủ lạnh mở toang, trống trơn; một chiếc điện thoại bật lên, chiếc giỏ đầy dần biểu tượng theo nhịp, một xe máy phóng xuyên bức tường sau thành một cú chuyển cảnh bằng hình khối, rồi mọi thứ bay vào logo.
Phong cách: vector phẳng, mảng màu đặc, nhân vật hình học, không viền, bảng màu thương hiệu đậm; mọi lần xuất hiện đều có độ nảy quá đà; một máy quay liền mạch.
Cảm giác: tươi, thân thiện, tự tin. Khoảng 10 giây, không giọng đọc.`),
  S("02-line-art", "16:9", 30,
    `Topic: a brand film for a fictional perfume house, "Maison Aster", told as one continuous line.
Story: a single gold line draws a stem; it opens into a flower whose petals become the shoulders of a bottle; the bottle's neck rises into a star, the line loops back into a monogram, the monogram fills with gold and the name fades up beneath it.
Style: line art: one constant thin gold line on a deep navy ground, a glowing pen tip leading the draw, slower at corners, the camera drifting to keep the tip in frame, then pulling back to show the whole drawing as a poster.
Mood: calm, elegant, premium. About 10 seconds, no narration.`,
    `Chủ đề: phim thương hiệu cho một hãng nước hoa hư cấu, "Maison Aster", kể bằng một nét liền duy nhất.
Câu chuyện: một nét vàng vẽ một cành hoa; cành nở thành bông hoa, cánh hoa thành vai một chiếc lọ; cổ lọ vươn lên thành một ngôi sao, nét vẽ vòng lại thành một monogram, monogram được tô vàng và tên hãng hiện lên bên dưới.
Phong cách: nét vẽ đơn: một nét vàng mảnh đều trên nền xanh đen đậm, đầu bút sáng dẫn đường, chậm lại ở góc, máy quay trôi theo đầu bút, rồi lùi ra cho thấy cả bức vẽ như một tấm poster.
Cảm giác: điềm tĩnh, thanh lịch, cao cấp. Khoảng 10 giây, không giọng đọc.`),
  S("03-isometric", "16:9", 30,
    `Topic: a rooftop farm that builds itself, for a fictional food company, "Upstairs Greens".
Story: roof tiles drop in as a wave from the centre; planter beds grow with a little overshoot, glass lids land a beat later, sprouts pop and grow lights come on in sequence. Then life: water runs along the pipes, bees cross the beds, a small lift carries crates, a wind turbine spins. The camera pulls back to show the whole roof floating in a pastel sky with the logo.
Style: true isometric 2.5D, no perspective, pastel studio palette with soft shadows, parallel camera slides with parallax clouds.
Mood: clever, cute, tidy. About 10 seconds, no narration.`,
    `Chủ đề: một nông trại sân thượng tự dựng lên, cho một công ty thực phẩm hư cấu, "Upstairs Greens".
Câu chuyện: các tấm mái rơi xuống như một làn sóng từ giữa ra; các luống cây mọc lên có độ nảy nhẹ, nắp kính đặt xuống sau một nhịp, mầm bật lên và đèn trồng cây sáng dần. Rồi sự sống: nước chạy dọc đường ống, ong bay qua các luống, một thang nhỏ chở thùng hàng, một tua-bin gió quay. Máy quay lùi ra cho thấy cả sân thượng trôi giữa bầu trời pastel cùng logo.
Phong cách: isometric 2.5D đúng chuẩn, không phối cảnh, bảng màu pastel như phòng chụp với bóng mềm, máy quay trượt song song, mây tiền cảnh chuyển động lệch.
Cảm giác: thông minh, dễ thương, gọn gàng. Khoảng 10 giây, không giọng đọc.`),
  S("04-3d-render", "16:9", 24,
    `Topic: a soft, satisfying ident for a fictional pillow brand, "Mellow".
Story: in a pastel studio a field of soft cubes breathes like a slow wave. The brand's inflated 3D wordmark drops in, sinks deep into the field, jiggles with a damped spring while the cubes rebound around it, then settles into a clean hero frame that breathes faintly.
Style: 3D render look: candy gummy, soft fabric and frosted glass materials, big soft lights, shallow depth of field, a cloner array, long-tail easing. (The author rendered this style in Blender; here it is built in three.js.)
Mood: soft, tactile, premium. About 10 seconds, no narration.`,
    `Chủ đề: một đoạn nhận diện mềm mại, dễ chịu cho một thương hiệu gối hư cấu, "Mellow".
Câu chuyện: trong một phòng chụp màu pastel, một cánh đồng khối mềm thở như một làn sóng chậm. Chữ thương hiệu 3D phồng như bóng hơi rơi xuống, lún sâu vào cánh đồng, rung rinh như lò xo tắt dần trong lúc các khối nảy lại quanh nó, rồi lắng thành một khung hình đẹp, chỉ còn thở nhẹ.
Phong cách: kiểu render 3D: chất liệu kẹo dẻo, vải mềm và kính mờ, đèn mềm lớn, độ sâu trường ảnh nông, mảng vật thể nhân bản, chuyển động có đuôi dài. (Tác giả render style này bằng Blender; trong app nó được dựng bằng three.js.)
Cảm giác: mềm, chạm được, cao cấp. Khoảng 10 giây, không giọng đọc.`),
  S("05-cel-boil", "16:9", 24,
    `Topic: a hand-made opening for a fictional street-food festival, "Hot Plate".
Story: a drop of chilli oil hits a hot pan with a single smear frame; a little chilli spirit jumps out, squashes and dances. It bursts into hand-drawn effects, puffs of steam, sparks, star bursts and speed lines, which re-form into the hand-lettered festival title that keeps breathing on the hold.
Style: frame-by-frame cel animation on warm paper: ink lines that boil every two frames, animation on twos, smears on the fast moves, slightly off-register colour, three or four colours only.
Mood: playful, warm, crafty. About 10 seconds, no narration.`,
    `Chủ đề: đoạn mở đầu làm tay cho một lễ hội ẩm thực đường phố hư cấu, "Hot Plate".
Câu chuyện: một giọt dầu ớt rơi vào chảo nóng với đúng một khung kéo nhoè; một tinh linh ớt nhỏ nhảy ra, ép người rồi nhảy múa. Nó vỡ thành các hiệu ứng vẽ tay, những cụm hơi nóng, tia lửa, ngôi sao bùng nổ và đường tốc độ, rồi những hiệu ứng ấy tụ lại thành tên lễ hội viết tay vẫn tiếp tục "thở" khi đứng yên.
Phong cách: hoạt hình vẽ tay từng khung trên giấy ấm: nét mực rung nhẹ mỗi hai khung, chuyển động một-hình-hai-khung, khung kéo nhoè ở động tác nhanh, màu hơi lệch nét, chỉ ba bốn màu.
Cảm giác: tinh nghịch, ấm áp, thủ công. Khoảng 10 giây, không giọng đọc.`),
  S("06-collage", "16:9", 30,
    `Topic: a surreal opener for a fictional ideas magazine, "Odd Hat".
Story: on kraft paper a Victorian engraving of a whale stares at us; its mouth drops open on a flap like a door, and top hats, clocks, pointing hands and a steam train march out. Hands slap new pieces onto the page, torn strips fly across, and bold red-and-black diagonal type lands: "think sideways".
Style: Dada cut-out collage: public-domain pictures (fetched and credited, or my own in Assets) with rough white scissor edges and halftone, a mouth on its own flap, movement on 12 fps with small hand-placed jitter, a torn-paper transition to the end card.
Mood: witty, surprising, editorial. About 10 seconds, no narration.`,
    `Chủ đề: đoạn mở đầu siêu thực cho một tạp chí ý tưởng hư cấu, "Odd Hat".
Câu chuyện: trên giấy kraft, một bức khắc cá voi thời Victoria nhìn thẳng vào ta; miệng nó bật mở trên một mảnh rời như cánh cửa, và mũ chóp, đồng hồ, bàn tay chỉ trỏ cùng một đoàn tàu hơi nước diễu ra. Những bàn tay đập các mảnh mới lên trang giấy, các dải giấy xé bay ngang, và dòng chữ chéo đỏ đen đậm đáp xuống: "think sideways".
Phong cách: cắt dán Dada: hình thuộc phạm vi công cộng (tải về và ghi nguồn, hoặc hình của tôi ở phần Tư liệu) có mép cắt kéo trắng thô và lưới điểm halftone, cái miệng là một mảnh riêng mở đóng, chuyển động 12 hình/giây có rung tay nhẹ, chuyển sang khung kết bằng giấy xé.
Cảm giác: dí dỏm, bất ngờ, kiểu tạp chí. Khoảng 10 giây, không giọng đọc.`),
  S("07-liquid", "16:9", 30,
    `Topic: a liquid logo reveal for a fictional paint brand, "Fathom Paints".
Story: one thick pour falls from the top of the frame and coils on a deep plum ground; it splits into blobs that merge again with stretched necks that snap and rebound, smaller drops trailing behind. A big wave of paint floods across the frame as a transition, then the liquid gathers into the wordmark; a last drip falls from the logo and ripples.
Style: liquid motion: thick glossy paint from orange to pink to violet, specular highlights and a rim light so it reads as 3D, metaball fusion, flung organic easing, never a straight line.
Mood: juicy, high-energy, satisfying. About 10 seconds, no narration.`,
    `Chủ đề: màn hiện logo dạng lỏng cho một hãng sơn hư cấu, "Fathom Paints".
Câu chuyện: một dòng đặc đổ xuống từ đỉnh khung hình và cuộn lại trên nền tím mận; nó tách thành các khối rồi nhập lại với những cái cổ kéo dài, đứt ra rồi nảy lại, những giọt nhỏ theo sau. Một con sóng sơn lớn tràn qua khung hình làm chuyển cảnh, rồi chất lỏng tụ lại thành chữ thương hiệu; một giọt cuối rơi khỏi logo và lan gợn.
Phong cách: chuyển động chất lỏng: sơn đặc bóng từ cam sang hồng sang tím, điểm sáng phản chiếu và viền sáng để trông như 3D, các khối hoà vào nhau, nhịp văng hữu cơ, không bao giờ có đường thẳng.
Cảm giác: mọng, tràn năng lượng, đã mắt. Khoảng 10 giây, không giọng đọc.`),
  S("08-morph", "16:9", 30,
    `Topic: one shape tells the story of a day, for a fictional travel app, "Longway".
Story: a suitcase morphs into a circle, then into the moon, a tide on the sand, a sail, a compass, a door, a key, and finally the app's logo with its name, each change landing on the beat while the background colour wipes to a new block.
Style: shape morph: every change passes through a simple in-between shape with a little rotation and squash and stretch, parts morph in sync, clean colour-block wipes, never a tangle mid-morph.
Mood: smooth, clever, uplifting. About 10 seconds, no narration.`,
    `Chủ đề: một hình khối kể chuyện một ngày, cho một ứng dụng du lịch hư cấu, "Longway".
Câu chuyện: một chiếc vali biến thành hình tròn, rồi thành mặt trăng, con sóng trên cát, cánh buồm, la bàn, cánh cửa, chiếc chìa khoá, và cuối cùng là logo ứng dụng cùng tên của nó, mỗi lần biến đúng một nhịp trong lúc màu nền lau sang một mảng màu mới.
Phong cách: biến hình: mỗi lần đổi đều đi qua một hình trung gian đơn giản với chút xoay và ép giãn, các phần nhỏ biến cùng lúc, chuyển nền bằng mảng màu sạch, không bao giờ rối nét ở giữa lúc biến.
Cảm giác: mượt, thông minh, hứng khởi. Khoảng 10 giây, không giọng đọc.`),
  S("09-bauhaus", "16:9", 30,
    `Topic: a kinetic poster for a fictional percussion festival, "Four Four".
Story: a black square lands in the middle of cream paper and splits on the first kick; grid lines draw out from the split. On each beat one module acts: semicircles slide one module, triangles flip about a corner, squares divide, a row of circles marches one module at a time. A wave cascades across the grid on the drop, and everything settles into the final poster, which breathes faintly, with the event title set vertically.
Style: geometric Bauhaus: red, yellow, blue and black on cream, a strict modular grid, every move an exact number of modules, no overshoot, beat-driven.
Mood: rational, rhythmic, bold. About 10 seconds, a minimal techno beat.`,
    `Chủ đề: một tấm poster động cho một lễ hội bộ gõ hư cấu, "Four Four".
Câu chuyện: một hình vuông đen đáp xuống giữa tờ giấy kem và tách đôi đúng nhịp trống đầu; các đường lưới vẽ ra từ chỗ tách. Mỗi nhịp một mô-đun hoạt động: nửa hình tròn trượt một mô-đun, tam giác lật quanh một góc, hình vuông chia đôi, một hàng hình tròn diễu từng mô-đun. Một làn sóng lan khắp lưới đúng lúc nhạc dồn, rồi mọi thứ lắng lại thành tấm poster cuối, chỉ còn thở rất nhẹ, với tên sự kiện xếp dọc.
Phong cách: hình học Bauhaus: đỏ, vàng, xanh và đen trên nền kem, lưới mô-đun chặt chẽ, mọi chuyển động đúng số nguyên mô-đun, không nảy quá đà, chạy theo nhịp.
Cảm giác: lý tính, nhịp nhàng, mạnh mẽ. Khoảng 10 giây, nhạc techno tối giản.`),
  S("10-synthwave", "16:9", 30,
    `Topic: a retro title sequence for a fictional late-night radio show, "Midnight Dial".
Story: a cassette clunks into a deck with VHS tracking noise; a tuning dial sweeps through static, and when it locks the camera flies low over a neon grid toward a striped sun between wireframe mountains. A chrome title slams in with a lens flare and a glint sweeps across it; a pink neon script word writes itself on with a flicker, and the ride goes on to the hero frame.
Style: 80s synthwave and VHS: magenta and cyan perspective grid, striped retro sun, chrome lettering, double glow, scanlines and colour bleed.
Mood: nostalgic, fast, cool. About 10 seconds, a synthwave track.`,
    `Chủ đề: đoạn tựa kiểu retro cho một chương trình radio đêm khuya hư cấu, "Midnight Dial".
Câu chuyện: một cuộn băng cạch vào đầu máy cùng nhiễu băng VHS; núm dò đài quét qua tiếng rè, và khi bắt được sóng, máy quay bay thấp trên một lưới neon về phía mặt trời kẻ sọc giữa những ngọn núi khung dây. Tựa chữ mạ crôm đập xuống cùng vệt loé ống kính, một tia sáng lướt qua chữ; một chữ viết tay neon hồng tự hiện ra kèm nhấp nháy, và chuyến đi tiếp tục tới khung hình chính.
Phong cách: synthwave và VHS thập niên 80: lưới phối cảnh hồng tím và xanh lơ, mặt trời kẻ sọc, chữ mạ crôm, ánh sáng hai lớp, vạch quét và lem màu.
Cảm giác: hoài niệm, nhanh, ngầu. Khoảng 10 giây, nhạc synthwave.`),
  S("12-aurora-glass", "16:9", 30,
    `Topic: a launch film for a fictional weather app, "Halo Sky: see the day ahead".
Story: slow aurora colours drift on a deep indigo ground. Frosted glass cards float in with depth and a slight tilt; inside them a rain curve, a temperature line and a small sun toggle come alive. A liquid-glass lens glides across and magnifies the cards and the light, then the product name settles in a light, elegant sans.
Style: aurora gradients and glassmorphism: blurred colour blobs in adjacent hues, frosted cards with a 1 px highlight, true refraction on the lens, breathing sine easing, nothing fast.
Mood: calm, translucent, expensive. About 10 seconds, an ambient pad.`,
    `Chủ đề: phim ra mắt cho một ứng dụng thời tiết hư cấu, "Halo Sky: see the day ahead".
Câu chuyện: những mảng màu cực quang trôi chậm trên nền chàm sẫm. Các thẻ kính mờ trôi vào có chiều sâu và hơi nghiêng; bên trong, một đường cong mưa, một đường nhiệt độ và một công tắc mặt trời nhỏ sống dậy. Một thấu kính kính lỏng lướt qua phóng to các thẻ và ánh sáng, rồi tên sản phẩm hiện ra bằng một kiểu chữ không chân mảnh, thanh lịch.
Phong cách: dải màu cực quang và kính mờ: các đốm màu nhoè cùng gam lân cận, thẻ kính mờ có viền sáng 1 px, khúc xạ thật trên thấu kính, nhịp "thở" hình sin, không có gì nhanh.
Cảm giác: điềm tĩnh, trong trẻo, đắt tiền. Khoảng 10 giây, nhạc nền ambient.`),
  S("18-hanazi", "9:16", 30,
    `Topic: a vertical pet vlog moment with variety-show captions: "bath time, my dog's greatest betrayal".
Story: my own dog photos in Assets, or a drawn dog scene if I have none, with slow pans and quick punch-in zooms on the funny moments. On each beat a caption pops: a big rounded title, bouncing question marks, a "betrayed!!" burst with speed lines, a tiny whispered aside, sparkles, sweat drops, and a "clean again" stamp to end.
Style: variety-show kinetic captions: rounded heavy type with fill, thick white stroke, coloured outer stroke and shadow; pop from 0 to 1.15 to 1 in about eight frames, per-letter bounce, high-saturation pink, yellow and cyan.
Mood: silly, warm, loud. About 10 seconds, vertical 9:16, bouncy sound effects.`,
    `Chủ đề: một khoảnh khắc vlog thú cưng khung dọc với chữ kiểu gameshow: "giờ tắm, cú phản bội lớn nhất đời con chó nhà tôi".
Câu chuyện: ảnh chó của tôi ở phần Tư liệu, chưa có thì vẽ một cảnh chó, lia chậm và phóng nhanh vào các khoảnh khắc buồn cười. Mỗi nhịp một dòng chữ bật lên: một tựa lớn tròn trịa, những dấu hỏi nảy tưng tưng, khung nổ "bị phản bội!!" kèm đường tốc độ, một lời thì thầm nhỏ xíu, lấp lánh, giọt mồ hôi, và con dấu "sạch rồi" để kết.
Phong cách: chữ động kiểu gameshow: chữ tròn đậm có màu tô, viền trắng dày, viền màu ngoài và bóng đổ; bật từ 0 lên 1,15 rồi về 1 trong khoảng tám khung, từng chữ nảy, hồng vàng xanh lơ thật đậm.
Cảm giác: ngớ ngẩn, ấm áp, rộn ràng. Khoảng 10 giây, khung dọc 9:16, hiệu ứng âm thanh nảy.`),
  S("19-paperclip", "16:9", 30,
    `Topic: a hard-science explainer: "how far has your morning coffee travelled?"
Story: one continuous camera move over a giant calm canvas: a drawn sticker of a coffee cup, then its parts pulled apart with labelled leader lines (beans, water, cup, lid), a world map where the routes draw themselves, a bar chart growing with a count-up, and a pull-back to a bold title card with one huge number.
Style: sticker explainer: cut-out pictures with a thick white outline and soft shadow, flat icons and exact charts on a blue-grey canvas, two or three colours plus one accent, strict alignment; every beat adds one new element. Every figure comes from a public source; no source, no number.
Mood: clear, curious, precise. About 10 seconds, short narration.`,
    `Chủ đề: phim giải thích khoa học: "ly cà phê sáng của bạn đã đi bao xa?"
Câu chuyện: một đường máy liền mạch trên một tấm canvas khổng lồ, tông màu dịu: một hình dán vẽ ly cà phê, rồi các phần tách rời có đường dẫn ghi nhãn (hạt, nước, cốc, nắp), một bản đồ thế giới nơi các tuyến đường tự vẽ ra, một biểu đồ cột mọc lên kèm số đếm tăng dần, và máy quay lùi ra tới một khung tiêu đề đậm với một con số thật lớn.
Phong cách: giải thích kiểu ảnh dán: hình cắt có viền trắng dày và bóng mềm, biểu tượng phẳng và biểu đồ chính xác trên nền xanh xám, hai ba màu cộng một màu nhấn, căn hàng chặt; mỗi nhịp thêm một thứ mới. Mọi con số lấy từ nguồn công khai; không có nguồn thì không dùng số.
Cảm giác: rõ ràng, tò mò, chính xác. Khoảng 10 giây, giọng đọc ngắn.`),
  S("20-pixel", "16:9", 30,
    `Topic: an attract screen for a fictional retro game, "Ember Run".
Story: a little postman sprite runs across side-scrolling rooftops with layered parallax, jumps a gap, grabs a flying letter with a sparkle and ducks under a swooping crow while the palette shifts from day to sunset. A mailbox bursts open with a flash of light, a dialog box types a thank-you line, and the chunky pixel logo drops in with a shine sweep.
Style: pixel art at a low internal resolution scaled up with nearest-neighbour, a limited palette with dithered gradients, whole-pixel movement, stepped sprite animation, an optional gentle CRT pass.
Mood: nostalgic, cheerful, adventurous. About 10 seconds, chiptune music.`,
    `Chủ đề: màn hình chờ cho một trò chơi retro hư cấu, "Ember Run".
Câu chuyện: một anh đưa thư pixel nhỏ chạy trên các mái nhà cuộn ngang có nhiều lớp cảnh chuyển động lệch nhau, nhảy qua khoảng trống, chộp một lá thư đang bay kèm lấp lánh và cúi né một con quạ lao xuống trong lúc bảng màu chuyển từ ban ngày sang hoàng hôn. Một hộp thư bật tung với một luồng sáng, một hộp thoại gõ ra lời cảm ơn, và logo pixel to bản rơi xuống kèm vệt sáng lướt qua.
Phong cách: pixel art ở độ phân giải gốc thấp phóng to kiểu điểm gần nhất, bảng màu giới hạn với chuyển màu dither, di chuyển đúng từng pixel, hoạt hình nhân vật theo bước, có thể thêm lớp CRT nhẹ.
Cảm giác: hoài niệm, vui tươi, phiêu lưu. Khoảng 10 giây, nhạc chiptune.`),
  S("22-hud", "16:9", 30,
    `Topic: a sci-fi interface sequence for a fictional deep-sea research submarine, "Marlin Deep".
Story: cyan lines draw on in layers on a dark teal ground: a hex grid, rotating rings with ticks, a sonar sweep with blips, columns of depth numbers rolling and settling, typed status lines. A wireframe hologram of the submarine turns at the centre. An unknown echo answers, lock brackets snap in, and everything flips to alert orange with "contact" and its depth.
Style: cyberpunk HUD / FUI: cyan and orange neon linework, monospace data, glow, slight chromatic aberration, scanlines and restrained micro-glitches; film-UI density with restraint.
Mood: tense, precise, high-tech. About 10 seconds, darksynth pulse and HUD beeps.`,
    `Chủ đề: chuỗi giao diện khoa học viễn tưởng cho một tàu ngầm nghiên cứu biển sâu hư cấu, "Marlin Deep".
Câu chuyện: các đường xanh lơ vẽ ra từng lớp trên nền xanh mòng két sẫm: lưới lục giác, các vòng xoay có vạch chia, một vệt quét sonar với các chấm tín hiệu, những cột số độ sâu chạy rồi dừng, các dòng trạng thái được gõ ra. Một hologram khung dây của tàu ngầm xoay ở giữa. Một tiếng dội lạ đáp lại, khung khoá mục tiêu bật vào, và mọi thứ chuyển sang màu cam báo động với dòng "contact" và độ sâu.
Phong cách: giao diện HUD / FUI cyberpunk: nét neon xanh lơ và cam, dữ liệu chữ đều khoảng, ánh sáng loé, lệch màu nhẹ, vạch quét và những nhiễu nhỏ có tiết chế; dày thông tin như giao diện phim nhưng vẫn kiềm chế.
Cảm giác: căng thẳng, chính xác, công nghệ cao. Khoảng 10 giây, nhạc darksynth và tiếng bíp giao diện.`),
]);
