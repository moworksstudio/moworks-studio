// The sample brief of each anidoodle medium: written for this app from the
// medium's reference (its medium, marks, order and motion grammar), with a subject of its own (not the author's hero film), so it reads
// as a brief: subject, the story in a few beats, how the medium makes its marks, length, mood. Credit: written from the reference by Alex
// Greenshpun (10x Company), anidoodle, Apache-2.0, at the pinned commit f746cbd (written at 4db6964; the references are the same). Same shape as BRIEF_SAMPLES (briefSample.js):
// { fields, vi, en } plus credit.

const AT = "https://github.com/alexgreensh/anidoodle/blob/f746cbd8a7032463bd0bc88ee8ff852599193b8c/skills/anidoodle";
// the reference each medium ships (balloon and mellan have none: their code is the reference)
const DOC = { balloon: "engine/src/canvas-core/balloon.ts", mellan: "engine/src/canvas-core/mellan.ts", fox: "references/styles/foxDraw.md",
  koi: "references/styles/koiDraw.md", lighthouse: "references/styles/lighthouseDraw.md", moonPhases: "references/styles/moonPhasesDraw.md",
  pocketWatch: "references/styles/pocketWatchDraw.md", ranunculus: "references/styles/ranunculusDraw.md", storybook: "references/styles/storybookDraw.md",
  wren: "references/styles/wrenDraw.md",
  // the author's three house styles: their recipe
  adaptAlmond: "styles/house/almond-blossom.json", adaptAquarelle: "styles/house/pastel-blotch.json", adaptScrapbook: "styles/house/quiet-scrapbook.json" };
const credit = (id) => ({ text: `Written from the anidoodle ${DOC[id]?.startsWith("styles/house/") ? "house style recipe" : "medium reference"} by Alex Greenshpun (10x Company), Apache-2.0`, link: `${AT}/${DOC[id] ?? `references/styles/${id}.md`}` });
// The frame rate is the medium's own (30: every anidoodle reference film, as New project starts it), never the 24 this file had
const S = (id, en, vi) => [`anidoodle-${id}`, { fields: { length: "0:12", aspect: "16:9", fps: 30 }, vi, en, credit: credit(id) }];

export const ANIDOODLE_BRIEF_SAMPLES = Object.fromEntries([
  S("balloon",
    `Topic: a child's drawing of a rocket trip to the moon, for a fictional crayon brand, "Waxy".
Story: a scribbled rocket fills in, lifts off in two crayon puffs, loops past a fat yellow moon and lands with a bump; the last frame writes "Draw it. Fly it."
Medium: wax crayon on toothed paper: back-and-forth scribble fills that skip the paper's valleys, a darker crayon on the shade side, a white one for highlights, contours gone over twice.
Mood: playful, warm, homemade. About 12 seconds.`,
    `Chủ đề: bức vẽ của một em bé về chuyến bay tên lửa lên mặt trăng, cho thương hiệu sáp màu hư cấu "Waxy".
Câu chuyện: tên lửa nguệch ngoạc được tô kín, cất cánh trong hai làn khói sáp, lượn qua mặt trăng vàng to và hạ cánh cái bịch; khung cuối viết "Draw it. Fly it."
Chất liệu: bút sáp trên giấy có vân: tô qua lại bỏ sót các rãnh giấy, sáp đậm hơn ở mặt tối, sáp trắng cho chỗ sáng, đường viền tô lại hai lần.
Cảm giác: vui, ấm, tự làm. Khoảng 12 giây.`),
  S("blueprint",
    `Topic: how a bicycle's gears work, for a fictional bike workshop, "Spoke & Co".
Story: on blue stock the frame is ruled in white, then the chainring and sprocket are drawn with the compass; the chain links on, the pedal turns once and dimension lines show the ratio; a title block fills in with the shop's name.
Medium: ruling pen and compass in white ink on Prussian-blue cyanotype: hairline construction lines first, then the weighted outline, hatched sections, lettered callouts.
Mood: precise, calm, engineered. About 12 seconds.`,
    `Chủ đề: bộ líp xe đạp hoạt động thế nào, cho xưởng xe đạp hư cấu "Spoke & Co".
Câu chuyện: trên nền giấy xanh, khung xe được kẻ bằng mực trắng, rồi đĩa và líp được vẽ bằng compa; xích nối từng mắt, bàn đạp quay một vòng và đường kích thước chỉ ra tỉ số; khung tên điền tên xưởng.
Chất liệu: bút kẻ và compa mực trắng trên giấy cyanotype xanh Phổ: nét dựng mảnh trước, rồi nét viền đậm, mặt cắt gạch chéo, chú thích viết tay kiểu kỹ thuật.
Cảm giác: chính xác, điềm tĩnh, kỹ thuật. Khoảng 12 giây.`),
  S("brokenColour",
    `Topic: a morning at a riverside flower market, for a fictional florist, "Bloomside".
Story: dabs of unmixed colour build the river and the stalls; buckets of tulips and sunflowers appear stroke by stroke, a boat slides by and the light warms as the sun rises; the shop's name is painted in dabs on an awning.
Medium: opaque oil dabs from a loaded flat hog brush on primed linen, pure colours set side by side for the eye to mix, no blending.
Mood: fresh, luminous, unhurried. About 12 seconds.`,
    `Chủ đề: một buổi sáng ở chợ hoa ven sông, cho cửa hàng hoa hư cấu "Bloomside".
Câu chuyện: những chấm màu không pha dựng nên dòng sông và các sạp hàng; xô tulip và hướng dương hiện ra từng nét, một con thuyền lướt qua và ánh sáng ấm dần khi mặt trời lên; tên cửa hàng được chấm bằng màu trên mái bạt.
Chất liệu: chấm sơn dầu đặc từ cọ dẹt lông heo trên vải lanh lót nền, màu nguyên đặt cạnh nhau để mắt tự pha, không hoà trộn.
Cảm giác: tươi, sáng, thong thả. Khoảng 12 giây.`),
  S("charcoalErasure",
    `Topic: a city street from dawn to night on one sheet, for a fictional documentary series, "One Corner".
Story: a street corner is drawn in charcoal; the light shifts, so parts are wiped and lifted with the eraser and redrawn, leaving ghosts of morning under the evening; street lamps are lifted out last as white.
Medium: vine and compressed charcoal on heavy rag paper, smudged with a stump, lifted with a kneaded eraser, redrawn over its own residue.
Mood: thoughtful, quiet, the passing of time. About 12 seconds.`,
    `Chủ đề: một góc phố từ bình minh đến đêm trên cùng một tờ giấy, cho loạt phim tài liệu hư cấu "One Corner".
Câu chuyện: góc phố được vẽ bằng than; ánh sáng đổi, nên từng phần bị xoá, nhấc bằng gôm rồi vẽ lại, để bóng ma buổi sáng nằm dưới buổi tối; đèn đường được nhấc ra cuối cùng thành mảng trắng.
Chất liệu: than chì mềm và than nén trên giấy cotton dày, xoa bằng bút xoa, nhấc bằng gôm non, vẽ lại đè lên vết cũ.
Cảm giác: trầm tư, yên lặng, thời gian trôi. Khoảng 12 giây.`),
  S("colouredPencil",
    `Topic: a hedgehog baking a cake, for a fictional children's bakery, "Prickle Bakes".
Story: the hedgehog cracks an egg, stirs, and slides a tin into a small oven; the cake rises and the hedgehog tops it with one strawberry; the name is hatched in on the cake board.
Medium: wax coloured pencils hatched in one diagonal on toothy cream paper, hues layered over each other, darks cross-hatched.
Mood: cosy, gentle, a little funny. About 12 seconds.`,
    `Chủ đề: chú nhím làm bánh, cho tiệm bánh trẻ em hư cấu "Prickle Bakes".
Câu chuyện: nhím đập trứng, khuấy bột rồi đẩy khuôn vào cái lò nhỏ; bánh nở lên và nhím đặt một quả dâu lên trên; tên tiệm được tô bằng nét chì trên đế bánh.
Chất liệu: chì màu sáp tô một hướng chéo trên giấy kem có vân, các màu chồng lên nhau, chỗ tối đan nét.
Cảm giác: ấm cúng, nhẹ nhàng, hơi hài hước. Khoảng 12 giây.`),
  S("dreamGlaze",
    `Topic: a teaser for a fictional sleep podcast, "Half Awake".
Story: in an empty plain at dusk a door stands alone; it opens onto a night sky, a staircase of clouds unrolls out of it and a single paper boat sails up the stairs; the title appears in a calm serif.
Medium: thin oil glazes laid with a very small soft brush on a smooth white ground: no visible stroke, every form turned smoothly under one low light, surreal but exact.
Mood: dreamlike, still, uncanny. About 12 seconds.`,
    `Chủ đề: teaser cho podcast giấc ngủ hư cấu "Half Awake".
Câu chuyện: giữa đồng trống lúc chạng vạng, một cánh cửa đứng một mình; nó mở ra bầu trời đêm, một cầu thang mây trải ra và một chiếc thuyền giấy đi ngược lên cầu thang; tên chương trình hiện lên bằng chữ có chân điềm tĩnh.
Chất liệu: lớp sơn dầu láng mỏng bằng cọ mềm rất nhỏ trên nền trắng mịn: không thấy nét cọ, mọi khối được tô mịn dưới một nguồn sáng thấp, siêu thực nhưng chính xác.
Cảm giác: như mơ, tĩnh, lạ lùng. Khoảng 12 giây.`),
  S("embroidery",
    `Topic: the logo reveal of a fictional tea house, "Linen Leaf".
Story: in a wooden hoop, a needle stitches a teapot outline, then satin-stitch leaves fill in around it and French knots dot the steam; the name is back-stitched underneath and the thread is tied off.
Medium: stranded cotton floss stitched through natural plain-weave linen in a beech hoop: running, back, satin and stem stitch, knots; each stitch goes in where the last came out.
Mood: handmade, calm, warm. About 12 seconds.`,
    `Chủ đề: hiện logo cho quán trà hư cấu "Linen Leaf".
Câu chuyện: trong khung thêu gỗ, mũi kim thêu viền một ấm trà, rồi những chiếc lá thêu sa-tanh lấp đầy quanh đó và mũi nút Pháp chấm thành hơi nước; tên quán được thêu đột bên dưới và sợi chỉ được thắt nút.
Chất liệu: chỉ cotton nhiều sợi thêu trên vải lanh mộc trong khung gỗ dẻ gai: mũi chạy, mũi đột, sa-tanh, mũi thân, nút; mỗi mũi đâm vào nơi mũi trước vừa ra.
Cảm giác: thủ công, điềm tĩnh, ấm. Khoảng 12 giây.`),
  S("flatVector",
    `Topic: an app explainer for a fictional bike-sharing service, "Pedl".
Story: a city map draws itself path by path; docking stations pop in, a rider unlocks a bike with a phone and rides the route as the line fills behind them; the logo closes out in flat colour.
Medium: pen-tool paths in a vector app, flat fills that land when a path closes, long-shadow shapes with a transparency ramp, a fine grain brush over the shading.
Mood: clean, upbeat, modern. About 12 seconds.`,
    `Chủ đề: phim giải thích ứng dụng cho dịch vụ xe đạp công cộng hư cấu "Pedl".
Câu chuyện: bản đồ thành phố tự vẽ từng đường; các trạm xe bật lên, một người dùng mở khoá xe bằng điện thoại và đạp theo tuyến trong khi đường đi được tô dần phía sau; logo kết thúc bằng màu phẳng.
Chất liệu: đường pen-tool trong phần mềm vector, mảng màu phẳng hiện ra khi đường khép lại, bóng đổ dài có độ trong suốt giảm dần, một lớp hạt mịn trên vùng bóng.
Cảm giác: gọn gàng, tươi vui, hiện đại. Khoảng 12 giây.`),
  S("folkTale",
    `Topic: the opening of a fictional bedtime-story app, "Once, Long Ago".
Story: a girl with a lantern walks a path from a cottage into a dark pine wood; an owl watches, the lantern lights a ring of mushrooms and the title floats in over the trees.
Medium: gouache and watercolour over an HB pencil drawing on cream paper: opaque, dry-brushed paint in the foreground thinning to a pale wash and then to bare pencil at the edges.
Mood: storybook, tender, a little mysterious. About 12 seconds.`,
    `Chủ đề: phần mở đầu của ứng dụng kể chuyện trước giờ ngủ hư cấu "Once, Long Ago".
Câu chuyện: một cô bé cầm đèn lồng đi trên lối mòn từ căn nhà nhỏ vào rừng thông tối; một con cú dõi theo, đèn lồng soi sáng một vòng nấm và tên ứng dụng trôi vào phía trên ngọn cây.
Chất liệu: màu gouache và màu nước trên nét chì HB, giấy kem: tiền cảnh sơn đặc, cọ khô, nhạt dần thành lớp màu loãng rồi chỉ còn nét chì ở rìa.
Cảm giác: như truyện cổ tích, dịu dàng, hơi bí ẩn. Khoảng 12 giây.`),
  S("fox",
    `Topic: an autumn campaign for a fictional outdoor shop, "Trailfold".
Story: torn-paper hills stack up, a cut-paper deer steps out from the trees, leaves of torn orange and red drift down and pile into the shop's name.
Medium: cut-paper collage with no drawn lines: torn pieces with a white fibrous edge, scissor-cut pieces crisp, each lifting a soft shadow off the piece below.
Mood: crisp, earthy, crafted. About 12 seconds.`,
    `Chủ đề: chiến dịch mùa thu cho cửa hàng đồ dã ngoại hư cấu "Trailfold".
Câu chuyện: những ngọn đồi giấy xé chồng lên nhau, một con nai giấy cắt bước ra từ hàng cây, lá giấy xé cam và đỏ rơi xuống và gom lại thành tên cửa hàng.
Chất liệu: cắt dán giấy không có nét vẽ nào: mảnh xé có rìa xơ trắng, mảnh cắt kéo sắc gọn, mỗi mảnh đổ một bóng mềm lên mảnh bên dưới.
Cảm giác: rõ nét, mộc, thủ công. Khoảng 12 giây.`),
  S("halftone",
    `Topic: a "breaking news" opener for a fictional city newspaper, "The Morning Wire".
Story: the press rolls; a front page prints in black dots, then an orange spot colour lands on a headline photo of a crowd under umbrellas; the masthead slams in.
Medium: web-offset newspaper print: black on a 45 degree halftone screen plus one orange spot colour at 15 degrees, ink gaining into unbleached newsprint.
Mood: urgent, retro, punchy. About 12 seconds.`,
    `Chủ đề: phần mở đầu "tin nóng" cho tờ báo thành phố hư cấu "The Morning Wire".
Câu chuyện: máy in chạy; trang nhất được in bằng chấm đen, rồi một màu cam pha sẵn đổ lên ảnh tít chính: đám đông dưới những chiếc ô; tên báo đập vào khung.
Chất liệu: in báo offset cuộn: mực đen trên lưới tram 45 độ cộng một màu cam pha sẵn ở 15 độ, mực loang vào giấy báo chưa tẩy.
Cảm giác: gấp gáp, hoài cổ, mạnh. Khoảng 12 giây.`),
  S("isometric",
    `Topic: how a fictional coworking space, "Stackhouse", works, floor by floor.
Story: a three-floor building is cut away in isometric: a café at the bottom lights up, desks fill on the middle floor, a meeting room on top switches its screen on; a lift travels up through all three and the name lands on the roof.
Medium: flat vector planes on a true 2:1 isometric grid, three tones per material, crisp edges, drawn in pen-tool order.
Mood: tidy, clever, inviting. About 12 seconds.`,
    `Chủ đề: không gian làm việc chung hư cấu "Stackhouse" hoạt động thế nào, từng tầng một.
Câu chuyện: một toà nhà ba tầng được cắt lớp kiểu isometric: quán cà phê dưới cùng sáng đèn, bàn làm việc tầng giữa có người, phòng họp tầng trên bật màn hình; thang máy chạy xuyên ba tầng và tên toà nhà đặt lên mái.
Chất liệu: mặt phẳng vector trên lưới isometric 2:1 chuẩn, ba tông cho mỗi chất liệu, cạnh sắc, vẽ theo thứ tự pen-tool.
Cảm giác: gọn, thông minh, mời gọi. Khoảng 12 giây.`),
  S("koi",
    `Topic: a short comic for a fictional ramen shop, "Kaze Noodle".
Story: a chef tosses noodles high, they spin into a dragon shape in the air and drop into a steaming bowl; a big comic sound word splashes out and the shop's name is lettered in.
Medium: marker comic: alcohol-marker cel fills with a hard shadow edge under one heavy contour that thickens away from the light.
Mood: energetic, bold, fun. About 12 seconds.`,
    `Chủ đề: một mẩu truyện tranh ngắn cho quán mì hư cấu "Kaze Noodle".
Câu chuyện: đầu bếp tung sợi mì lên cao, chúng xoáy thành hình con rồng trên không rồi rơi vào bát mì bốc khói; một chữ tượng thanh to bắn ra và tên quán được viết vào.
Chất liệu: truyện tranh bút marker: mảng màu marker cồn với mép bóng sắc, dưới một nét viền đậm dày dần về phía khuất sáng.
Cảm giác: sôi nổi, đậm, vui. Khoảng 12 giây.`),
  S("lighthouse",
    `Topic: a poster that comes alive for a fictional music festival, "Tidefest".
Story: layer by layer the inks print: the sea in blue, the hills in pink, overprints making purple where they meet; a stage glows, the crowd waves and the festival name prints last in fluorescent pink.
Medium: risograph: one soy-ink layer per drum, multiplied through its own small registration offset; every other colour is an overprint, tone a halftone screen per ink angle.
Mood: indie, cheerful, summery. About 12 seconds.`,
    `Chủ đề: tấm poster sống động cho lễ hội âm nhạc hư cấu "Tidefest".
Câu chuyện: từng lớp mực được in lên: biển màu xanh, đồi màu hồng, chỗ chồng nhau thành tím; sân khấu sáng lên, đám đông vẫy tay và tên lễ hội in cuối cùng bằng hồng huỳnh quang.
Chất liệu: in risograph: mỗi lớp mực đậu nành một trống in, chồng nhân lên nhau với độ lệch chồng màu nhỏ; mọi màu khác là màu in chồng, sắc độ là lưới tram theo góc của từng mực.
Cảm giác: indie, vui tươi, mùa hè. Khoảng 12 giây.`),
  S("lowPoly",
    `Topic: a travel teaser for a fictional island resort, "Cay Verde".
Story: the camera glides over a low-poly sea toward an island; palms rise facet by facet, a small seaplane lands and the sun sets, flipping every facet's shade; the name appears over the water.
Medium: triangle meshes projected through a simple pinhole camera, each facet flat-shaded by its angle to one low sun, sorted far to near.
Mood: bright, escapist, smooth. About 12 seconds.`,
    `Chủ đề: teaser du lịch cho khu nghỉ dưỡng đảo hư cấu "Cay Verde".
Câu chuyện: máy quay lướt trên mặt biển low-poly về phía hòn đảo; hàng dừa mọc lên từng mặt, một thuỷ phi cơ nhỏ đáp xuống và mặt trời lặn làm đổi bóng mọi mặt tam giác; tên khu nghỉ hiện lên trên mặt nước.
Chất liệu: lưới tam giác chiếu qua một máy ảnh lỗ kim đơn giản, mỗi mặt tô phẳng theo góc với một mặt trời thấp, sắp xếp từ xa đến gần.
Cảm giác: tươi sáng, thoát ly, mượt mà. Khoảng 12 giây.`),
  S("mellan",
    `Topic: the title of a fictional jewellery brand, "Unbroken".
Story: one line starts at the centre and spirals out, thickening and thinning, until a ring with a single stone appears out of the line; the line runs on to write the brand's name and ends.
Medium: single-line engraving: one unbroken engraved line whose width follows the tone of the picture: the whole image is one stroke.
Mood: elegant, precise, quiet luxury. About 12 seconds.`,
    `Chủ đề: tiêu đề cho thương hiệu trang sức hư cấu "Unbroken".
Câu chuyện: một đường nét bắt đầu từ tâm và xoắn ra, dày lên mỏng đi, cho đến khi một chiếc nhẫn đính một viên đá hiện ra từ chính đường nét ấy; đường nét chạy tiếp để viết tên thương hiệu rồi dừng.
Chất liệu: khắc một nét: một đường khắc liền không đứt, độ dày theo sắc độ của hình: cả bức tranh là một nét duy nhất.
Cảm giác: thanh lịch, chính xác, sang trọng kín đáo. Khoảng 12 giây.`),
  S("midCentury",
    `Topic: an ad for a fictional old-style toy shop, "Tick-Tock Toys".
Story: a boy winds up a toy train; it chugs around the shop past a rocking horse and a spinning top, the shelves sway to the rhythm and the train stops at a sign with the shop's name.
Medium: 1950s-60s storybook: opaque matte gouache on warm board, a dry brush dragged over the flats, a loose brush-and-ink line printed slightly off register.
Mood: nostalgic, sunny, charming. About 12 seconds.`,
    `Chủ đề: quảng cáo cho tiệm đồ chơi kiểu xưa hư cấu "Tick-Tock Toys".
Câu chuyện: cậu bé lên dây cót một đoàn tàu đồ chơi; tàu chạy vòng quanh tiệm qua con ngựa bập bênh và con quay, các kệ đung đưa theo nhịp và đoàn tàu dừng ở tấm biển ghi tên tiệm.
Chất liệu: sách tranh thập niên 50-60: gouache mờ đặc trên bìa ấm, cọ khô kéo qua các mảng phẳng, nét cọ mực lỏng in hơi lệch chồng màu.
Cảm giác: hoài niệm, nắng, duyên dáng. Khoảng 12 giây.`),
  S("moonPhases",
    `Topic: a science lesson opener: why we have seasons, for a fictional school channel, "Chalk Talk".
Story: on a slate board the sun is chalked, the Earth orbits it with a tilted axis; summer and winter are labelled with arrows, older lessons show faintly behind and the channel name is written at the top.
Medium: chalkboard: side-of-the-chalk scumble on slate, lit sides worked twice, every stroke broken by the board's tooth, dust either side, ghosts of old lessons.
Mood: curious, clear, classroom. About 12 seconds.`,
    `Chủ đề: phần mở đầu bài học khoa học: vì sao có các mùa, cho kênh trường học hư cấu "Chalk Talk".
Câu chuyện: trên bảng đá, mặt trời được vẽ bằng phấn, Trái Đất quay quanh với trục nghiêng; mùa hè và mùa đông được ghi chú bằng mũi tên, dấu bài cũ mờ phía sau và tên kênh được viết ở trên cùng.
Chất liệu: bảng phấn: miết cạnh phấn trên bảng đá, mặt sáng tô hai lần, mỗi nét bị vân bảng làm đứt, bụi phấn hai bên, bóng ma của bài cũ.
Cảm giác: tò mò, rõ ràng, lớp học. Khoảng 12 giây.`),
  S("paintedOil",
    `Topic: a menu reveal for a fictional wine bar, "Cellar Nine".
Story: a still life builds on the canvas: a bottle, a glass, a wedge of cheese and grapes; the paint goes from a lean block-in to thick highlights, the glass is filled with red and the name is painted on the bottle's label.
Medium: opaque oil paint with hog-bristle brushes on a toned linen canvas, lean block-in first, then fat impasto.
Mood: rich, warm, classic. About 12 seconds.`,
    `Chủ đề: giới thiệu thực đơn cho quán rượu vang hư cấu "Cellar Nine".
Câu chuyện: một bức tĩnh vật dựng dần trên toan: chai rượu, ly, miếng phô mai và chùm nho; sơn đi từ lớp lót mỏng đến những điểm sáng dày, ly được rót đầy màu đỏ và tên quán được vẽ trên nhãn chai.
Chất liệu: sơn dầu đặc với cọ lông heo trên toan lanh đã lót màu, lớp lót mỏng trước, rồi lớp đắp dày.
Cảm giác: đậm đà, ấm, cổ điển. Khoảng 12 giây.`),
  S("paperCraft",
    `Topic: the trailer for a fictional puppet theatre, "Little Curtain".
Story: on a cardboard stage, rows of paper waves slide side to side, a paper whale rises on a stick, a moon is lowered on a string and the curtain closes on the theatre's name.
Medium: toy-theatre paper collage: patterned papers cut and torn, gouache-painted cut-outs with a white sticker margin, every piece with a card edge and a shadow.
Mood: whimsical, theatrical, handmade. About 12 seconds.`,
    `Chủ đề: trailer cho nhà hát rối hư cấu "Little Curtain".
Câu chuyện: trên sân khấu bìa cứng, những hàng sóng giấy trượt qua lại, một con cá voi giấy nhô lên trên que, mặt trăng được thả xuống bằng sợi dây và tấm màn khép lại trên tên nhà hát.
Chất liệu: cắt dán sân khấu đồ chơi: giấy hoa văn cắt và xé, hình cắt tô gouache có viền trắng như sticker, mỗi mảnh có cạnh bìa và bóng đổ.
Cảm giác: kỳ thú, sân khấu, thủ công. Khoảng 12 giây.`),
  S("pixelArt",
    `Topic: a game trailer for a fictional indie game, "Mossy Knight".
Story: a tiny knight runs through a pixel forest, jumps over a stump, swings a sword at a slime that pops into coins; the title drops in, pixel by pixel.
Medium: pixel art: a small grid of cells, each one of 16 declared colours, laid one cell at a time and scaled up by a whole number, no smoothing.
Mood: retro, lively, game-like. About 12 seconds.`,
    `Chủ đề: trailer cho trò chơi indie hư cấu "Mossy Knight".
Câu chuyện: một hiệp sĩ tí hon chạy qua khu rừng pixel, nhảy qua gốc cây, vung kiếm vào con slime vỡ ra thành xu; tên trò chơi rơi vào từng điểm ảnh.
Chất liệu: pixel art: một lưới ô nhỏ, mỗi ô là một trong 16 màu đã khai báo, đặt từng ô một và phóng to theo số nguyên, không làm mịn.
Cảm giác: hoài cổ, sinh động, như game. Khoảng 12 giây.`),
  S("pocketWatch",
    `Topic: a notebook-style explainer for a fictional design studio, "Margin Notes".
Story: a ballpoint sketches an idea: a lightbulb, then a chair taking shape from it with arrows and notes; it's crossed out, redrawn better, circled, and the studio's name is underlined twice.
Medium: one blue ballpoint on cream paper, near-constant weight; tone only from where the hatching sits, plus the small blob where a firm stroke stops.
Mood: candid, thoughtful, creative. About 12 seconds.`,
    `Chủ đề: phim giải thích kiểu sổ tay cho studio thiết kế hư cấu "Margin Notes".
Câu chuyện: bút bi phác một ý tưởng: bóng đèn, rồi một chiếc ghế thành hình từ đó với mũi tên và ghi chú; nó bị gạch đi, vẽ lại đẹp hơn, khoanh tròn, và tên studio được gạch chân hai lần.
Chất liệu: một cây bút bi xanh trên giấy kem, độ đậm gần như không đổi; sắc độ chỉ đến từ chỗ đặt nét đan, cộng chấm mực nhỏ nơi nét mạnh dừng lại.
Cảm giác: chân thật, suy tư, sáng tạo. Khoảng 12 giây.`),
  S("ranunculus",
    `Topic: a spring collection teaser for a fictional stationery shop, "Petal Post".
Story: a pencil outlines an envelope and a sprig of sweet peas; washes of pink and green float in, never quite filling the lines; the envelope opens and the shop's name is written in pencil over the paint.
Medium: graphite and pan watercolour on cold-press paper: washes that never quite fill their outline, form shaded toward one light, graphite drawn over the paint.
Mood: delicate, fresh, feminine. About 12 seconds.`,
    `Chủ đề: teaser bộ sưu tập mùa xuân cho cửa hàng văn phòng phẩm hư cấu "Petal Post".
Câu chuyện: bút chì viền một phong bì và một nhành đậu hoa; những lớp màu nước hồng và xanh lá loang vào, không bao giờ lấp kín nét; phong bì mở ra và tên cửa hàng được viết bằng bút chì đè lên màu.
Chất liệu: chì than và màu nước dạng bánh trên giấy vân nguội: lớp màu không lấp kín đường viền, khối đổ bóng về một phía sáng, nét chì vẽ đè lên màu.
Cảm giác: tinh tế, tươi, nữ tính. Khoảng 12 giây.`),
  S("rubberHose",
    `Topic: a 1930s-style cartoon ad for a fictional soda, "Fizzy Pop".
Story: a bottle with noodle arms pops its cap, does a little dance on a diner counter, bubbles bounce out in rhythm and spell the brand's name; it tips its cap at the camera.
Medium: India ink at one pressure on a clear cel over a blue-pencil rough, flat grey paint on the back, photographed on black-and-white film.
Mood: bouncy, cheeky, vintage. About 12 seconds.`,
    `Chủ đề: quảng cáo hoạt hình kiểu thập niên 1930 cho nước ngọt hư cấu "Fizzy Pop".
Câu chuyện: một chai nước có tay như sợi mì bật nắp, nhảy một điệu nhỏ trên quầy quán ăn, bong bóng nảy ra theo nhịp và ghép thành tên thương hiệu; chai nghiêng nắp chào máy quay.
Chất liệu: mực tàu một lực nét trên tấm cel trong suốt đặt trên bản phác chì xanh, sơn xám phẳng ở mặt sau, chụp trên phim đen trắng.
Cảm giác: nhún nhảy, tinh nghịch, cổ điển. Khoảng 12 giây.`),
  S("scrapbook",
    `Topic: a museum explainer: how a letter crossed the ocean in 1890, for a fictional postal museum, "Stamp Hall".
Story: on an old album page a stamped envelope is taped in; a tinted engraving of a steamship sails across, a map is clipped on with a clothespin, a typed label explains each step, and cut-out letters spell the museum's name.
Medium: archival scrapbook: foxed rag-paper album page; torn cards, tape, a clothespin on twine; hand-tinted copperplate engravings, typewriter and ransom-note cut letters.
Mood: curious, nostalgic, layered. About 12 seconds.`,
    `Chủ đề: phim giải thích của bảo tàng: một lá thư vượt đại dương năm 1890 thế nào, cho bảo tàng bưu chính hư cấu "Stamp Hall".
Câu chuyện: trên trang album cũ, một phong bì dán tem được dán băng dính vào; tranh khắc tô màu tay của một con tàu hơi nước đi ngang qua, tấm bản đồ được kẹp bằng kẹp phơi đồ, nhãn đánh máy giải thích từng bước, và chữ cắt dán ghép tên bảo tàng.
Chất liệu: sổ lưu niệm lưu trữ: trang album giấy cotton ố vàng; thẻ xé, băng dính, kẹp phơi trên sợi dây; tranh khắc đồng tô màu tay, chữ đánh máy và chữ cắt từ báo.
Cảm giác: tò mò, hoài niệm, nhiều lớp. Khoảng 12 giây.`),
  S("scratchboard",
    `Topic: the title of a fictional true-crime podcast, "Night Ledger".
Story: from solid black, a knife scratches a street lamp into light, then a rain-wet alley, a figure in a long coat and the lit window of an office; the title is scratched out in thin white lines.
Medium: scratchboard: white clay under black ink; every mark is ink scraped away with a knife or scratch nib, light built out of darkness.
Mood: noir, tense, dramatic. About 12 seconds.`,
    `Chủ đề: tiêu đề cho podcast án có thật hư cấu "Night Ledger".
Câu chuyện: từ một mảng đen kín, lưỡi dao cào ra ánh sáng một cột đèn đường, rồi con hẻm ướt mưa, một bóng người mặc áo khoác dài và ô cửa sổ sáng đèn của một văn phòng; tên chương trình được cào bằng nét trắng mảnh.
Chất liệu: tranh cào: lớp đất sét trắng dưới mực đen; mọi nét là mực bị cào đi bằng dao hoặc ngòi cào, ánh sáng dựng ra từ bóng tối.
Cảm giác: noir, căng, kịch tính. Khoảng 12 giây.`),
  S("stipple",
    `Topic: a product reveal for a fictional skincare line, "Pure Botanica", built around one ingredient.
Story: dots build a sprig of lavender, then a glass dropper bottle beside it, shadows growing denser as the light settles; the name is set below in a fine serif.
Medium: pen-and-ink stipple: one fine technical pen dotted straight down onto smooth bristol; tone is dot density only.
Mood: clean, scientific, refined. About 12 seconds.`,
    `Chủ đề: giới thiệu sản phẩm cho dòng chăm sóc da hư cấu "Pure Botanica", xoay quanh một thành phần.
Câu chuyện: những chấm mực dựng nên một nhành oải hương, rồi một lọ thuỷ tinh có ống nhỏ giọt bên cạnh, bóng dày dần khi ánh sáng ổn định; tên sản phẩm đặt bên dưới bằng chữ có chân mảnh.
Chất liệu: chấm mực bằng bút kỹ thuật: một cây bút kim mảnh chấm thẳng xuống giấy bristol láng; sắc độ chỉ là mật độ chấm.
Cảm giác: sạch, khoa học, tinh tế. Khoảng 12 giây.`),
  S("storybook",
    `Topic: the mascot intro for a fictional reading app for kids, "Page Pals", with one recurring character.
Story: a small rabbit in a scarf is drawn in pencil, washes of colour fill her in; she opens a big book, the pages flutter and letters float up into the app's name; she waves.
Medium: storybook graphite and gentle pan watercolour, drawn so the same character can come back film after film (keep her proportions, colours and scarf the same).
Mood: friendly, soft, encouraging. About 12 seconds.`,
    `Chủ đề: giới thiệu linh vật cho ứng dụng đọc sách trẻ em hư cấu "Page Pals", với một nhân vật lặp lại.
Câu chuyện: một chú thỏ nhỏ quàng khăn được vẽ bằng bút chì, các lớp màu nước tô vào; thỏ mở một cuốn sách lớn, trang sách lật phấp phới và chữ cái bay lên thành tên ứng dụng; thỏ vẫy tay.
Chất liệu: bút chì và màu nước nhẹ kiểu sách tranh, vẽ để cùng một nhân vật có thể quay lại phim sau phim (giữ nguyên tỉ lệ, màu và chiếc khăn).
Cảm giác: thân thiện, mềm mại, khích lệ. Khoảng 12 giây.`),
  S("sumiE",
    `Topic: the opening of a fictional tea ceremony documentary, "One Bowl".
Story: one loaded brush sweeps a mountain ridge in pale ink, a darker stroke for a pine, then a single bowl of tea in a few strokes; a red seal is stamped beside the title.
Medium: sumi-e: one soft brush of sumi ink in five dilutions on absorbent unsized paper, each stroke placed once, never retouched, with a cinnabar seal.
Mood: calm, spare, meditative. About 12 seconds.`,
    `Chủ đề: phần mở đầu cho phim tài liệu trà đạo hư cấu "One Bowl".
Câu chuyện: một cây cọ đẫm mực quét một dãy núi bằng mực nhạt, một nét đậm hơn cho cây thông, rồi một bát trà chỉ trong vài nét; con dấu đỏ được đóng cạnh tên phim.
Chất liệu: thuỷ mặc: một cây cọ mềm với mực tàu năm độ loãng trên giấy xuyến chỉ thấm, mỗi nét đặt một lần, không sửa, với con dấu son.
Cảm giác: tĩnh, tối giản, thiền định. Khoảng 12 giây.`),
  S("toyBrick",
    `Topic: a construction-themed opener for a fictional kids' science fair, "Build Day".
Story: on a baseplate, bricks snap in one by one to build a small rocket on a launch pad; a crane brick swings away, the rocket's engine bricks light and the fair's name is built from bricks below.
Medium: moulded plastic toy bricks rendered flat in orthographic view: face tones by the cube rule, bevel highlights, seam hairlines, real studs, a soft contact shadow.
Mood: playful, constructive, bright. About 12 seconds.`,
    `Chủ đề: phần mở đầu chủ đề xây dựng cho hội chợ khoa học thiếu nhi hư cấu "Build Day".
Câu chuyện: trên tấm đế, từng viên gạch lắp vào để dựng một tên lửa nhỏ trên bệ phóng; viên gạch cần cẩu quay đi, gạch động cơ sáng lên và tên hội chợ được xếp bằng gạch bên dưới.
Chất liệu: gạch đồ chơi nhựa đúc, dựng hình phẳng góc nhìn trực giao: tông mặt theo quy tắc hình hộp, điểm sáng ở cạnh vát, nét mảnh ở khe ghép, núm thật, bóng tiếp xúc mềm.
Cảm giác: vui, xây dựng, tươi sáng. Khoảng 12 giây.`),
  S("woodcut",
    `Topic: an opener for a fictional night market, "Lantern Row".
Story: the keyblock prints black lines of a street, then colour blocks print one by one: red lanterns, a blue sky wiped with a soft gradient, a vendor's cart; a gust sways the lanterns and the market's name is printed in a cartouche.
Medium: ukiyo-e colour woodblock: water-based pigment printed by baren from carved cherry blocks onto damp washi: a black keyblock, flat colour blocks, bokashi gradient wipes.
Mood: festive, graceful, traditional. About 12 seconds.`,
    `Chủ đề: phần mở đầu cho chợ đêm hư cấu "Lantern Row".
Câu chuyện: bản khắc nét in những đường đen của con phố, rồi các bản màu in lần lượt: đèn lồng đỏ, bầu trời xanh chuyển màu mềm, xe hàng rong; một cơn gió làm đèn lồng đung đưa và tên chợ được in trong một khung tên.
Chất liệu: mộc bản màu ukiyo-e: màu gốc nước in bằng baren từ các bản khắc gỗ anh đào lên giấy washi ẩm: bản nét đen, bản màu phẳng, quét chuyển màu bokashi.
Cảm giác: rộn ràng, uyển chuyển, truyền thống. Khoảng 12 giây.`),
  S("wren",
    `Topic: a nature trail guide opener for a fictional park, "Willow Marsh".
Story: wet washes flood in first for water and reeds and settle along their edges; then a flexible nib draws a heron standing in the shallows, thick on the press, hair-thin on the lift; the park's name is lettered in ink.
Medium: ink and line-wash: wet washes first that flood past the line and settle along each shape's bottom edge, backruns, then a flexible nib line over them.
Mood: airy, natural, observant. About 12 seconds.`,
    `Chủ đề: phần mở đầu hướng dẫn đường mòn thiên nhiên cho công viên hư cấu "Willow Marsh".
Câu chuyện: các lớp màu nước loang vào trước cho mặt nước và lau sậy, rồi lắng ở mép; sau đó ngòi bút mềm vẽ một con diệc đứng ở chỗ nước nông, dày khi nhấn, mảnh như tóc khi nhấc; tên công viên được viết bằng mực.
Chất liệu: mực và màu loang: lớp màu ướt trước, tràn qua nét và lắng ở mép dưới mỗi hình, vệt loang ngược, rồi nét ngòi mềm vẽ đè lên.
Cảm giác: thoáng, tự nhiên, tinh ý. Khoảng 12 giây.`),
  S("adaptAlmond",
    `Topic: a spring menu opener for a fictional tea house, "Blossom Hour".
Story: the pale blue ground is laid in patches of short strokes that turn against each other; a branch is painted along its length, white blossoms go on thick and ridged, one cup of tea sits below; the blue-green contour is drawn last and the tea house's name appears as a quiet title.
Medium: opaque oil with a loaded bristle brush, short finger-long strokes, a flat decorative high-key ground, one step of shadow on the forms, a broken dark blue-green contour laid last; no black anywhere.
Mood: fresh, calm, hopeful. About 12 seconds.`,
    `Chủ đề: phần mở đầu thực đơn mùa xuân cho quán trà hư cấu "Blossom Hour".
Câu chuyện: nền xanh nhạt được phủ bằng từng mảng nét ngắn xoay ngược nhau; một cành cây được vẽ dọc theo thân, hoa trắng đắp dày và gồ, bên dưới là một chén trà; đường viền xanh lục đậm vẽ sau cùng và tên quán hiện ra như một tiêu đề nhẹ.
Chất liệu: sơn dầu đặc, cọ lông đầy sơn, nét ngắn cỡ một đốt ngón tay, nền phẳng trang trí sáng, mỗi khối chỉ một bậc tối, đường viền xanh lục đậm đứt quãng vẽ cuối cùng; không có màu đen.
Cảm giác: tươi, êm, đầy hy vọng. Khoảng 12 giây.`),
  S("adaptAquarelle",
    `Topic: a calm background for a fictional meditation app, "Tidepool".
Story: the palest big puddles of watercolour spread on cream paper and dry with crisp rims; smaller, stronger puddles glaze over them and mix where they overlap; a jellyfish is painted in the same puddles a full step darker, with bare paper around it, and drifts slowly; white sparkles go on last.
Medium: pastel blotches: one loaded round brush set down and pushed about, flat puddles with jagged edges that dry hard with a darker rim and a paler bloom, no drawn line, bare paper between the islands.
Mood: soft, dreamy, slow. About 12 seconds.`,
    `Chủ đề: hình nền tĩnh lặng cho ứng dụng thiền hư cấu "Tidepool".
Câu chuyện: những vũng màu nước nhạt nhất loang rộng trên giấy kem và khô lại với mép sắc; các vũng nhỏ hơn, đậm hơn phủ lên và hòa màu ở chỗ chồng nhau; một con sứa được vẽ bằng chính những vũng màu ấy nhưng tối hơn một bậc, quanh nó chừa giấy trắng, rồi trôi chậm; chấm sáng trắng điểm sau cùng.
Chất liệu: màu nước loang pastel: một cọ tròn đầy màu đặt xuống rồi đẩy đi, vũng màu phẳng mép răng cưa khô cứng với viền đậm hơn và lòng nhạt hơn, không có nét vẽ, giấy trắng giữa các đảo màu.
Cảm giác: mềm, mơ màng, chậm. Khoảng 12 giây.`),
  S("adaptScrapbook",
    `Topic: an explainer opener about how a seed becomes a tree, for a fictional school science channel, "Field Notes".
Story: on a pale warm page, a big card is laid down, then small coloured label chips; a clean pen diagram of a seed, a sprout and a sapling is inked on the card; typed labels strike on one letter at a time; one small vintage engraving of a leaf sits in the corner; a red pen circles the sprout and a blue pencil adds one arrow.
Medium: a quiet archival scrapbook: flat pieces of coloured stock with a fine even deckle, each throwing the same soft shadow down-right, thin unhatched technical-pen diagrams, typewriter labels, one engraving as ornament, red and blue notes used once or twice; a mostly empty page.
Mood: curious, tidy, thoughtful. About 12 seconds.`,
    `Chủ đề: phần mở đầu phim giải thích hạt giống thành cây, cho kênh khoa học học đường hư cấu "Field Notes".
Câu chuyện: trên trang giấy ấm màu nhạt, một tấm thẻ lớn đặt xuống, rồi những mẩu nhãn màu nhỏ; sơ đồ nét bút sạch của hạt, mầm và cây non được vẽ trên thẻ; nhãn đánh máy hiện từng chữ; một bản khắc cổ nhỏ hình chiếc lá nằm ở góc; bút đỏ khoanh tròn cái mầm và bút chì xanh thêm một mũi tên.
Chất liệu: sổ lưu trữ tĩnh lặng: các mảnh giấy màu phẳng mép xé đều và mảnh, mỗi mảnh đổ cùng một bóng mềm xuống phải, sơ đồ bút kỹ thuật mảnh không gạch bóng, nhãn đánh máy, một bản khắc làm điểm nhấn, bút đỏ và chì xanh chỉ dùng một hai lần; trang phần lớn để trống.
Cảm giác: tò mò, gọn gàng, chín chắn. Khoảng 12 giây.`),
]);

// Anidoodle's two other kinds of film as sample briefs, written from the
// author's workflows (drawing-process.md, launch-video.md) by Alex Greenshpun (10x Company), Apache-2.0, at f746cbd. The rules read the
// kind from the brief's first line ("Kind: …").
const WF = (file) => ({ text: "Written from the anidoodle workflow by Alex Greenshpun (10x Company), Apache-2.0", link: `${AT}/references/workflows/${file}` });
export const ANIDOODLE_KIND_SAMPLES = {
  drawing: { label: "A picture that draws itself", fields: { length: "0:15", aspect: "16:9", fps: 24 }, credit: WF("drawing-process.md"),
    en: `Kind: a picture that draws itself. Subject: a lotus pond at dawn for a tea brand, "Sen". The film: one picture made mark by mark, in the order an artist in this medium works: the bare paper first, then the first wash of the water, the lotus leaves, the flowers, the shadows and the last highlights; the finished picture holds at the end with the words "Sen. Slow tea." Every stroke grows from where the brush touches, nothing fades in; a slow camera push over the whole drawing. Mood: calm, patient. About 15 seconds.`,
    vi: `Kiểu phim: một bức tranh tự vẽ ra. Chủ đề: hồ sen lúc bình minh cho thương hiệu trà "Sen". Phim là một bức tranh vẽ từng nét theo đúng thứ tự người vẽ chất liệu này: giấy trắng trước, rồi lớp màu nước đầu tiên của mặt hồ, lá sen, hoa, bóng đổ và những điểm sáng cuối cùng; bức tranh hoàn chỉnh dừng ở cuối cùng dòng chữ "Sen. Trà chậm." Mỗi nét mọc ra từ chỗ cọ chạm, không gì hiện mờ dần; máy quay đẩy vào chậm suốt bức vẽ. Cảm giác: tĩnh, kiên nhẫn. Khoảng 15 giây.` },
  launch: { label: "Product launch film", fields: { length: "0:20", aspect: "16:9", fps: 24 }, credit: WF("launch-video.md"),
    en: `Kind: a product launch film. Product: "Lumi", a pocket reading lamp (a made-up product for this sample). The film: the problem in one shot (reading in the dark, squinting), the product revealed, three facts each on its own beat (it clips on any book; 20 hours on one charge; three warm light levels), then the name and "Read anywhere." on the end card. Every claim comes from the brief or a source; nothing invented. Drawn in the medium's own hand. Mood: bright, confident. About 20 seconds.`,
    vi: `Kiểu phim: phim ra mắt sản phẩm. Sản phẩm: "Lumi", đèn đọc sách bỏ túi (sản phẩm giả định cho brief mẫu). Phim: vấn đề trong một cảnh (đọc trong tối, nheo mắt), sản phẩm hiện ra, ba ý mỗi ý một nhịp (kẹp vào mọi cuốn sách; 20 giờ cho một lần sạc; ba mức ánh sáng ấm), rồi tên và "Đọc ở bất cứ đâu." ở khung cuối. Mọi thông tin lấy từ brief hoặc có nguồn; không bịa. Vẽ bằng nét của chính chất liệu. Cảm giác: sáng, tự tin. Khoảng 20 giây.` },
};
