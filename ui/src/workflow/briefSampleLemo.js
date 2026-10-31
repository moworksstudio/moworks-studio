// The sample brief of each Lemo-Opuscar style: written for this app from the style's STYLE.md (its medium, sound, native moves and the
// variation space of its last section), with a subject and a story of its own, never the demo film's: the workflow holds a film to at
// least four differences from the demo (DIRECTOR §11), so a sample that retold the demo fought its own style (audit 91, owner 01/11,
// replacing #200). A style cut from real material names its real subject, so there is something to fetch. Existing works and brands are
// left out (DIRECTOR §12). Credit: written from Lemomo (LemoLab) STYLE.md, MIT, at the pinned commit ea34ff9.
// Same shape as BRIEF_SAMPLES (briefSample.js): { fields, vi, en } plus credit; the dialog's length, aspect ratio and frame rate come from
// fields (Lemo-Opuscar's default 24 fps, or the style's own rate).

const AT = "https://github.com/lemomo-ai/lemo-opuscar/blob/ea34ff9546f675f9fd65a3c84e869a1da7471ad7/styles";
const credit = (slug) => ({ text: "Written from Lemomo (LemoLab) STYLE.md, MIT", link: `${AT}/${slug}/STYLE.md` });
const S = (slug, length, fps, en, vi) => [`lemo-${slug}`, { fields: { length, aspect: "16:9", fps }, vi, en, credit: credit(slug) }];

export const LEMO_BRIEF_SAMPLES = Object.fromEntries([
  S("archive-lighttable", "0:40", 24,
    `Topic: one of the earliest photographs of a person, and he never knew. Daguerre's 1838 view of the Boulevard du Temple in Paris shows a busy street looking empty, because the long exposure lost everyone who kept moving.
Story: a light table switches on over the plate. The street looks deserted. A loupe travels down the pavement, stops on a dark shape at the corner, and the image turns positive inside the lens: a man having his boots polished, standing still just long enough. We fall into the picture and the film ends on him.
Style: real archive scans only, every fact sourced. Loupes, negative-to-positive turns and catalogue cards carry the story.
Mood: patient, precise, quietly astonished. About 40 seconds, calm narration.`,
    `Chủ đề: một trong những bức ảnh đầu tiên có người, và người ấy không hề biết. Bức ảnh năm 1838 của Daguerre chụp đại lộ Boulevard du Temple ở Paris: phố đông mà trông trống trơn, vì phơi sáng lâu đã xoá mọi người đang đi.
Câu chuyện: bàn soi sáng lên dưới tấm ảnh. Con phố trông vắng lặng. Một chiếc kính lúp đi dọc vỉa hè, dừng ở một bóng tối nơi góc phố, và hình chuyển thành dương bản ngay trong thấu kính: một người đang được đánh giày, đứng yên vừa đủ lâu. Ta rơi vào bức ảnh và phim kết ở người ấy.
Phong cách: chỉ dùng bản quét lưu trữ thật, mọi dữ kiện có nguồn. Kính lúp, âm bản hoá dương bản và thẻ thư mục kể chuyện.
Cảm giác: kiên nhẫn, chính xác, kinh ngạc lặng lẽ. Khoảng 40 giây, giọng đọc điềm tĩnh.`),
  S("art-deco", "0:55", 24,
    `Topic: the maiden voyage of a great ocean liner, 1930, on the night the lights go out in the middle of the gala.
Story: a stoker's apprentice carries one spare fuse from the engine room up through three decks, a horn for each, past the pistons, the dining saloon and the grand staircase, while the band plays on in the dark. On the top deck the fuse goes in, the lights rise on the band's last chord, and black lacquer warms to a pale dawn over the sea.
Style: gold on black, fans and sunbursts, stepped geometry, type that is part of the architecture. The music carries the plot.
Mood: glamorous, urgent, joyful. About 55 seconds, no narration.`,
    `Chủ đề: chuyến đi đầu tiên của một con tàu biển lớn năm 1930, đúng đêm đèn tắt giữa buổi dạ tiệc.
Câu chuyện: một cậu học việc đốt lò mang một cầu chì dự phòng từ buồng máy đi lên qua ba tầng tàu, mỗi tầng một hồi còi, qua các pít-tông, phòng ăn và cầu thang lớn, trong lúc ban nhạc vẫn chơi trong bóng tối. Ở boong trên cùng, cầu chì được lắp vào, đèn sáng lên đúng hợp âm cuối của ban nhạc, và nền sơn mài đen ấm dần thành bình minh nhạt trên biển.
Phong cách: vàng trên nền đen, hình quạt và tia nắng, khối bậc thang, chữ là một phần của kiến trúc. Âm nhạc dẫn câu chuyện.
Cảm giác: lộng lẫy, gấp gáp, vui. Khoảng 55 giây, không giọng đọc.`),
  S("ascii-crt", "1:00", 24,
    `Topic: two night operators on an old computer network, in two cities, on its last night before it is switched off.
Story: a chat log, one night long, with timestamps as scene headers. They have typed to each other for years and never met. Between the last jobs each one draws the other the view from their window, in characters. At midnight one types a real name for the first time, the screen's one colour change; the other's reply never finishes, and the cursor stops blinking.
Style: the whole picture is made of text characters on a green CRT, with scanlines, glow and bloom. Font size works as the camera, typing rhythm sets the cut, and one single colour change is the peak.
Mood: lonely, tender, bittersweet. About 60 seconds, no voice; room hum, keys and a sparse analog-synth drone that opens one chord on the colour change.`,
    `Chủ đề: hai người trực đêm trên một mạng máy tính cũ, ở hai thành phố, vào đêm cuối trước khi mạng bị tắt.
Câu chuyện: một nhật ký chat dài một đêm, mốc giờ là tiêu đề cảnh. Họ gõ cho nhau nhiều năm mà chưa từng gặp. Giữa những việc cuối cùng, mỗi người vẽ cho người kia cảnh ngoài cửa sổ bằng ký tự. Nửa đêm, một người lần đầu gõ tên thật, lần đổi màu duy nhất của màn hình; câu trả lời của người kia không bao giờ gõ xong, và con trỏ ngừng nhấp nháy.
Phong cách: cả khung hình làm bằng ký tự chữ trên màn CRT xanh lá, có vạch quét, ánh sáng loé và nhoè. Cỡ chữ là máy quay, nhịp gõ là nhịp cắt, và một lần đổi màu duy nhất là đỉnh cảm xúc.
Cảm giác: cô đơn, dịu dàng, buồn vui lẫn lộn. Khoảng 60 giây, không giọng đọc; tiếng ù phòng, tiếng phím và một dải synth analog thưa, mở đúng một hợp âm khi đổi màu.`),
  S("backrooms", "1:00", 30,
    `Topic: a real-estate walkthrough of a house that keeps adding rooms.
Story: a cheerful agent films the tour on an old camcorder and sells every room as a feature: a second pantry, a spare corridor, "and here's a bonus room". The floor plan on her clipboard stops matching. The rooms get plainer and the same wallpaper comes back. Near the end the autofocus starts hunting, the tape tracking breaks up, and she reads out a room that is not on her list, still smiling in her voice.
Style: first-person VHS, 4:3, faded wallpaper, beige carpet, humming ceiling lights. Nothing chases anyone; the dread comes from emptiness, repetition and the camera's own failures.
Mood: uneasy, quiet, a chill on the neck. About 60 seconds, the operator's own voice.`,
    `Chủ đề: một buổi dẫn xem nhà của một căn nhà cứ tự mọc thêm phòng.
Câu chuyện: một nhân viên bất động sản vui vẻ quay buổi xem nhà bằng một chiếc máy quay cũ và giới thiệu phòng nào cũng như một điểm cộng: thêm một phòng chứa đồ, một hành lang dự phòng, "và đây là phòng tặng thêm". Sơ đồ trên bìa kẹp của chị bắt đầu không khớp. Các phòng trống dần và cùng một loại giấy dán tường quay lại. Gần cuối, máy quay lấy nét lung tung, băng từ bị nhiễu, và chị đọc tên một căn phòng không có trong danh sách, giọng vẫn tươi.
Phong cách: góc nhìn thứ nhất, băng VHS 4:3, giấy dán tường phai, thảm màu be, đèn trần kêu rè rè. Không có gì đuổi theo ai; nỗi sợ đến từ sự trống trải, lặp lại và chính chiếc máy quay trục trặc.
Cảm giác: bất an, lặng, lạnh gáy. Khoảng 60 giây, chính giọng người cầm máy.`),
  S("blueprint", "0:45", 24,
    `Topic: two rival engineers on opposite banks of a river, each drawing half a bridge.
Story: two sheets lie on one table, drawn in parallel, each sure the other is wrong. Lines, dimensions and numbered call-outs race each other, and each half ends in mid-air. A hand slides the sheets together and the two halves fit to the millimetre. A coffee ring lands on the title block, and its tide line becomes the last circle of the design.
Style: white line work on Prussian blue, drafting order, dimension lines, numbered call-outs and figure numbers as transitions. The camera reads the sheets like an eye.
Mood: clever, warm, a little whimsical. About 45 seconds, light narration.`,
    `Chủ đề: hai kỹ sư đối thủ ở hai bờ sông, mỗi người vẽ một nửa cây cầu.
Câu chuyện: hai tờ bản vẽ nằm trên một chiếc bàn, vẽ song song, bên nào cũng chắc bên kia sai. Nét vẽ, kích thước và chú thích đánh số đua nhau, và mỗi nửa cầu dừng giữa không trung. Một bàn tay đẩy hai tờ lại gần và hai nửa khớp nhau tới từng milimét. Một vòng cà phê rơi lên khung tên, và mép vòng ấy thành đường tròn cuối cùng của thiết kế.
Phong cách: nét trắng trên nền xanh Phổ, vẽ theo trình tự kỹ thuật, đường kích thước, chú thích đánh số, số hình làm chuyển cảnh. Máy quay đọc các tờ bản vẽ như một con mắt.
Cảm giác: thông minh, ấm áp, hơi tinh nghịch. Khoảng 45 giây, giọng đọc nhẹ.`),
  S("brick-toy", "0:55", 24,
    `Topic: two small builders and one gap.
Story: a hand pours a bin of bricks onto a real table and the pile settles. Two brick figures on either side of the gap between two stacks of books start building, each ignoring the other: one a crooked tower, one a long crane arm. Their builds grow toward each other, collide and fall. They sort the fallen pieces together and finish one bridge from both. One piece is left over, held up in close-up, and neither knows where it goes.
Style: plastic bricks that snap together, stop-motion poses at 12 a second with a smooth 24 fps camera, a toy world on a real table; even dust and sparks are bricks.
Mood: playful, stubborn, proud. About 55 seconds, no narration.`,
    `Chủ đề: hai người thợ nhỏ và một khoảng trống.
Câu chuyện: một bàn tay đổ cả thùng gạch lên chiếc bàn thật và đống gạch lắng xuống. Hai hình người gạch ở hai bên khoảng trống giữa hai chồng sách bắt đầu xây, chẳng ai để ý ai: một người dựng tháp xiêu vẹo, một người dựng cánh tay cần cẩu dài. Hai công trình mọc về phía nhau, va vào nhau và đổ. Họ cùng nhặt các mảnh rơi và làm xong một cây cầu chung. Còn thừa một viên, giơ lên trong cận cảnh, và không ai biết nó thuộc về đâu.
Phong cách: gạch nhựa lắp ráp, tư thế stop-motion 12 hình/giây với máy quay mượt 24 hình/giây, thế giới đồ chơi trên bàn thật; cả bụi và tia lửa cũng là gạch.
Cảm giác: vui, bướng bỉnh, tự hào. Khoảng 55 giây, không giọng đọc.`),
  S("briefing-board", "0:40", 24,
    `Topic: how wide can a ship get? For most of a century the answer was set by one canal's locks.
Story: one number is written large on the briefing wall: the width of the lock. A steel ruler lays each decade's biggest ship against it on the same elevation, and the ship grows until it touches the wall; a red stamp lands. The rule is written up. Then new, wider locks open, the old number is struck through, and the last tag flips from a question to an answer.
Style: an engineering briefing wall with real photographs, dimension lines, a steel ruler, stamps and comparison frames. Every number is sourced.
Mood: clear, decisive, satisfying. About 40 seconds, crisp narration.`,
    `Chủ đề: một con tàu rộng được tới đâu? Suốt gần một thế kỷ, câu trả lời nằm ở các âu tàu của một con kênh.
Câu chuyện: một con số được viết lớn trên bức tường thuyết trình: bề rộng âu tàu. Một cây thước thép đặt con tàu lớn nhất của từng thập kỷ cạnh con số ấy trên cùng một mặt đứng, tàu lớn dần cho tới khi chạm thành âu; một con dấu đỏ đóng xuống. Quy tắc được viết ra. Rồi các âu mới rộng hơn mở cửa, con số cũ bị gạch đi, và nhãn cuối cùng lật từ câu hỏi thành câu trả lời.
Phong cách: bức tường thuyết trình kỹ thuật với ảnh thật, đường kích thước, thước thép, con dấu và các khung so sánh. Mọi con số đều có nguồn.
Cảm giác: rõ ràng, dứt khoát, thoả mãn. Khoảng 40 giây, giọng đọc gọn.`),
  S("caption-news", "1:00", 30,
    `Topic: the ozone hole, the one global environmental alarm that is actually closing.
Story: the biggest number lands in the first seconds over NASA's satellite picture: the size of the hole at its worst. A freeze frame asks the viewer's question in silence: didn't we fix this? Then the UN-backed scientific assessment of 2023 turns it around, and a two-column ledger of what was banned and what recovered explains how. It ends on the year the assessment expects the hole over Antarctica to close.
Style: a social news short that works with the sound off: bold captions on real footage and photos, highlighted quotes, counters and a short verdict frame. Every claim is sourced.
Mood: urgent, then surprising, then clear. About 60 seconds, captions first, light narration.`,
    `Chủ đề: lỗ thủng tầng ôzôn, lời báo động môi trường toàn cầu duy nhất đang thực sự khép lại.
Câu chuyện: con số lớn nhất hiện ra ngay trong mấy giây đầu trên ảnh vệ tinh NASA: kích thước lỗ thủng lúc tệ nhất. Một khung hình đứng lại đặt câu hỏi của người xem trong im lặng: chẳng phải đã xử lý rồi sao? Rồi bản đánh giá khoa học năm 2023 do Liên Hợp Quốc bảo trợ lật ngược vấn đề, và một bảng hai cột (những gì bị cấm, những gì hồi phục) giải thích vì sao. Phim kết ở năm mà bản đánh giá dự kiến lỗ thủng trên Nam Cực khép lại.
Phong cách: tin ngắn cho mạng xã hội, xem không cần bật tiếng: phụ đề đậm trên cảnh quay và ảnh thật, trích dẫn được tô sáng, bộ đếm số và một khung kết luận ngắn. Mọi dữ kiện có nguồn.
Cảm giác: gấp, rồi bất ngờ, rồi sáng tỏ. Khoảng 60 giây, chữ là chính, giọng đọc nhẹ.`),
  S("cel-anime-80s", "1:00", 24,
    `Topic: one rooftop, four seasons, and a girl learning the trumpet.
Story: in spring she squeaks through one scale and the pigeons leave. In summer a boy across the street leans out and laughs. In autumn he starts answering on a harmonica. On a snowy winter night the whole block opens its windows, the two of them play the song through, and the camera pans slowly up from the quiet roof to a starry sky.
Style: hand-painted cels, flat shadows, a new colour model for each season, warm evening light on wet roofs, a short held key frame at the climax, soft VHS colour.
Mood: nostalgic, hopeful, gentle. About 60 seconds, music-led, no narration.`,
    `Chủ đề: một sân thượng, bốn mùa, và cô gái tập thổi kèn trumpet.
Câu chuyện: mùa xuân, cô thổi rít qua một gam và đàn bồ câu bay mất. Mùa hè, một chàng trai bên kia phố thò đầu ra cười. Mùa thu, anh bắt đầu đáp lại bằng kèn harmonica. Một đêm tuyết mùa đông, cả dãy phố mở cửa sổ, hai người chơi trọn bài hát, và máy quay lia chậm từ sân thượng yên tĩnh lên bầu trời đầy sao.
Phong cách: tranh cel vẽ tay, bóng phẳng, mỗi mùa một bộ màu mới, ánh chiều ấm trên mái nhà ướt, một khung giữ ngắn ở cao trào, màu VHS mềm.
Cảm giác: hoài niệm, hy vọng, dịu dàng. Khoảng 60 giây, dẫn bằng nhạc, không giọng đọc.`),
  S("chalkboard", "0:50", 30,
    `Topic: 危机, the Chinese word for crisis, which everyone "knows" means danger plus opportunity.
Story: a freshly wiped classroom board; a pupil has left the question in the corner in yellow chalk: does it really? The board writes the popular explanation, part by part, and it sounds convincing. Then one wipe takes it away, and the same spot is written again: 机 from its oldest form to today, the one component the answer turns on tracked in orange. After a short beat the answer goes under the pupil's question: here 机 means a crucial point, not a chance.
Style: chalk on a dark green board: strokes that dry, a second hand for the pupil, write, wipe and rewrite in the same place, a sliding panel that reveals the back board, chalk used as a ruler. Every fact sourced.
Mood: curious, patient, a small "aha". About 50 seconds, a teacher's calm narration with subtitles.`,
    `Chủ đề: 危机, từ tiếng Trung nghĩa là khủng hoảng, mà ai cũng "biết" là nguy hiểm cộng cơ hội.
Câu chuyện: một tấm bảng lớp học vừa lau; một học trò để lại câu hỏi ở góc bảng bằng phấn vàng: có thật vậy không? Bảng viết ra lời giải thích phổ biến, từng phần một, nghe rất thuyết phục. Rồi một lần lau xoá sạch, và đúng chỗ ấy được viết lại: chữ 机 từ dạng cổ nhất tới hôm nay, bộ phận quyết định câu trả lời được tô cam. Sau một nhịp ngắn, câu trả lời được viết dưới câu hỏi của học trò: ở đây 机 nghĩa là điểm then chốt, không phải cơ hội.
Phong cách: phấn trên bảng xanh thẫm: nét phấn khô dần, nét chữ thứ hai cho học trò, viết, lau rồi viết lại đúng chỗ cũ, một tấm bảng trượt mở ra bảng phía sau, phấn dùng như cây thước. Mọi dữ kiện có nguồn.
Cảm giác: tò mò, kiên nhẫn, một khoảnh khắc "à ra thế". Khoảng 50 giây, giọng thầy cô điềm tĩnh, có phụ đề.`),
  S("circuit-board", "1:00", 30,
    `Topic: your voice on a phone call, raced down three routes at once: copper, glass fibre and a satellite.
Story: a single word leaves a handset as a pulse of light on the board. Three parallel buses carry it: along a copper line, through fibre under the sea, and up to a satellite and back. A counter runs beside each. The first two arrive almost together; the satellite route comes last by a clear fraction of a second, and we hear why long-distance calls once had that pause. The camera pulls out to many identical boards in a rack.
Style: the story drawn as a printed circuit board seen from above: signals running along the traces, the map as a board, each route told by the shape of its light, real figures with their sources.
Mood: clear, fast, quietly amazed. About 60 seconds, friendly narration with subtitles.`,
    `Chủ đề: giọng nói của bạn trên một cuộc gọi, chạy đua cùng lúc trên ba đường: dây đồng, cáp quang và vệ tinh.
Câu chuyện: một tiếng nói rời ống nghe thành một xung sáng trên bảng mạch. Ba đường song song mang nó đi: dọc dây đồng, qua cáp quang dưới biển, và lên vệ tinh rồi xuống. Một bộ đếm chạy cạnh mỗi đường. Hai đường đầu tới gần như cùng lúc; đường vệ tinh tới sau một phần giây rõ rệt, và ta nghe ra vì sao các cuộc gọi đường dài ngày trước có khoảng ngừng ấy. Máy quay kéo lùi ra nhiều bảng mạch giống hệt nhau trong một tủ.
Phong cách: câu chuyện vẽ thành một bảng mạch in nhìn từ trên xuống: tín hiệu chạy dọc các đường mạch, bản đồ là một bảng mạch, mỗi đường kể bằng hình dạng ánh sáng của nó, số liệu thật có nguồn.
Cảm giác: rõ ràng, nhanh, ngạc nhiên lặng lẽ. Khoảng 60 giây, giọng đọc thân thiện, có phụ đề.`),
  S("city-symphony", "0:50", 30,
    `Topic: one day in London, from orbit to night.
Story: from space the city is a web of orange light; the film falls into it and watches it wake. One window turns night to dawn in two seconds, a station clock cuts to a bigger clock, a crowd becomes trails of light. At noon the screen splits into a grid that fills on the beat, then everything stops for one slow moment, and an old film of Tower Bridge plays beside today (no free old film of it: tell me and we pick another bridge).
Style: time-lapse and archive footage cut to a strict musical grid, split screens, light trails, old and new side by side. Real material, credited.
Mood: rhythmic, grand, a little nostalgic. About 50 seconds, music only.`,
    `Chủ đề: một ngày của London, từ quỹ đạo tới đêm.
Câu chuyện: từ không gian, thành phố là một mạng ánh sáng cam; phim rơi xuống và nhìn nó thức dậy. Một ô cửa sổ chuyển từ đêm sang bình minh trong hai giây, một chiếc đồng hồ nhà ga cắt sang một chiếc đồng hồ lớn hơn, một đám đông biến thành những vệt sáng. Giữa trưa màn hình chia thành lưới, lấp đầy theo nhịp, rồi mọi thứ dừng lại một khoảnh khắc chậm, và một thước phim cũ về cầu Tháp chiếu cạnh hình ảnh hôm nay (không có phim cũ miễn phí thì báo tôi để chọn cây cầu khác).
Phong cách: tua nhanh thời gian và tư liệu cũ cắt theo một lưới nhịp nhạc chặt chẽ, chia màn hình, vệt sáng, xưa và nay cạnh nhau. Tư liệu thật, ghi nguồn.
Cảm giác: nhịp nhàng, hoành tráng, hơi hoài niệm. Khoảng 50 giây, chỉ có nhạc.`),
  S("countdown", "1:00", 30,
    `Topic: the last minute before Apollo 11 left the ground, told in real time.
Story: the count passes from the ground to the rocket, which counts itself down; a single cell of the pad opens into a grid of nine views (control room, gantry, engines, crowd). At ignition every cell merges into one, then opens again for what follows. Each hand-over of control is heard in the original audio.
Style: a live split-screen countdown with a big clock header, a control strip that tracks who is in charge, and NASA's own public-domain footage and audio.
Mood: tense, precise, then elated. About 60 seconds, the mission's own voices.`,
    `Chủ đề: phút cuối cùng trước khi Apollo 11 rời mặt đất, kể đúng thời gian thực.
Câu chuyện: việc đếm ngược được chuyển từ mặt đất sang tên lửa, rồi tên lửa tự đếm; một ô hình bệ phóng mở ra thành lưới chín góc nhìn (phòng điều khiển, giàn phóng, động cơ, đám đông). Lúc đánh lửa mọi ô gộp lại thành một, rồi lại mở ra cho những gì tiếp theo. Mỗi lần trao quyền điều khiển đều nghe bằng âm thanh gốc.
Phong cách: màn hình chia ô đếm ngược trực tiếp với đồng hồ lớn ở đầu khung, một dải cho biết ai đang điều khiển, và cảnh quay, âm thanh của NASA thuộc phạm vi công cộng.
Cảm giác: căng, chính xác, rồi vỡ oà. Khoảng 60 giây, dùng chính giọng của nhiệm vụ.`),
  S("crayon-book", "0:50", 24,
    `Topic: a brother, a sister, two crayons and only one page.
Story: red draws a dragon; blue draws a knight to fight it. Each scribbles over the other, and the page fills up with an argument in wax. The knight's sword turns into a flower by accident, the dragon takes it, and red and blue go over each other into one purple. A stray splash of water runs across the page and finds a message drawn in white crayon all along: "your turn". The page is taped to a fridge among the others.
Style: crayon and wax on paper, drawn live as we watch, child logic, colouring as an action; the wax-resist reveal is the peak.
Mood: soft, funny, warm. About 50 seconds, gentle narration.`,
    `Chủ đề: anh trai, em gái, hai cây bút sáp và chỉ một trang giấy.
Câu chuyện: màu đỏ vẽ con rồng; màu xanh vẽ hiệp sĩ để đánh nó. Bên này tô đè lên bên kia, và trang giấy đầy lên một cuộc cãi nhau bằng sáp. Thanh kiếm của hiệp sĩ vô tình thành bông hoa, con rồng nhận lấy, và đỏ với xanh tô chồng thành một màu tím. Một giọt nước tình cờ chảy qua trang giấy và làm hiện dòng chữ viết bằng sáp trắng từ đầu: "tới lượt em". Trang giấy được dán lên tủ lạnh cùng những trang khác.
Phong cách: bút sáp màu trên giấy, vẽ ngay trước mắt người xem, logic của trẻ con, tô màu là một hành động; lớp sáp đẩy màu nước là cao trào.
Cảm giác: mềm, buồn cười, ấm. Khoảng 50 giây, giọng kể nhẹ nhàng.`),
  S("dark-keynote", "0:40", 24,
    `Topic: a launch film for a fictional calendar app that finds the one hour a whole team is free.
Story: the number first: a huge example figure rolls out of glyph noise on black, the messages it took to book one meeting. Then a split screen: on the left the old way drowns in invitations; on the right one small cursor drags one block and the whole week snaps into a grid. Three short feature beats follow in words only, and the film ends on a single confirmation toast, then darkness and the name.
Style: a dark keynote stage with soft light, UI generated without limit, a snap grid, screens that pause, one number that rolls out of glyph noise.
Mood: calm, premium, confident. About 40 seconds, a few big words, no narration.`,
    `Chủ đề: phim ra mắt cho một ứng dụng lịch hư cấu, tìm ra đúng một giờ cả nhóm cùng rảnh.
Câu chuyện: con số đến trước: một con số ví dụ rất lớn hiện ra từ nhiễu ký tự trên nền đen, số tin nhắn phải gửi để hẹn một cuộc họp. Rồi màn hình chia đôi: bên trái, cách cũ ngập trong lời mời; bên phải, một con trỏ nhỏ kéo một ô và cả tuần bật về một lưới gọn. Tiếp theo là ba nhịp tính năng ngắn, chỉ bằng chữ, và phim kết ở một thông báo xác nhận, rồi bóng tối và tên sản phẩm.
Phong cách: sân khấu keynote tối với ánh sáng mềm, giao diện sinh ra không giới hạn, lưới hút, màn hình có thể dừng lại, một con số hiện ra từ nhiễu ký tự.
Cảm giác: điềm tĩnh, cao cấp, tự tin. Khoảng 40 giây, vài chữ lớn, không giọng đọc.`),
  S("data-physical", "0:40", 24,
    `Topic: the height of the world's tallest building, decade by decade, told as objects you could hold.
Story: an empty walnut dial waits with its inlay. Each decade's record is a stack of real brass plates, one plate per ten storeys. The stacks rise as the camera tracks along a spiral, slowly for most of a century, then the last decades jump. The camera slows to a crawl as the last plates are fed in one by one while a counter rolls, and a single plate is lifted off to show what one unit is.
Style: data made physical: plates, brass, wood, macro detail, every number from a public dataset.
Mood: measured, tactile, quietly dramatic. About 40 seconds, short narration.`,
    `Chủ đề: chiều cao toà nhà cao nhất thế giới qua từng thập kỷ, kể bằng những vật có thể cầm trên tay.
Câu chuyện: một mặt số gỗ óc chó trống chờ sẵn với đường khảm. Kỷ lục của mỗi thập kỷ là một chồng đĩa đồng thau thật, mỗi đĩa là mười tầng. Các chồng cao dần trong lúc máy quay đi theo một vòng xoắn, chậm rãi gần suốt thế kỷ, rồi những thập kỷ cuối vọt lên. Máy quay chậm lại gần như bò khi những đĩa cuối được đưa vào từng chiếc trong lúc bộ đếm chạy, và một chiếc đĩa được nhấc ra để thấy một đơn vị là bao nhiêu.
Phong cách: dữ liệu thành vật thể: đĩa, đồng thau, gỗ, cận cảnh, mọi con số từ bộ dữ liệu công khai.
Cảm giác: chừng mực, chạm được, kịch tính lặng lẽ. Khoảng 40 giây, giọng đọc ngắn.`),
  S("dataviz", "0:50", 24,
    `Topic: a hundred summers in central England, from the Met Office's long temperature record.
Story: the film opens cold on a single data point. Early years arrive slowly, then steadily; then the points come faster and the pencil hurries. Just before the last value everything stops: the only cut in the film, into silence. The last point lands alone, then the whole series in one view, and it morphs into warming stripes, ending on an empty cell: next summer?
Style: the chart tells the story: dots, a line, a red-and-blue pencil drawing every mark, stripes. One cut, one colour flip at the peak, numbers that are true.
Mood: calm, then alarming, then reflective. About 50 seconds, sparse narration.`,
    `Chủ đề: một trăm mùa hè ở miền trung nước Anh, từ chuỗi nhiệt độ dài của Cục Khí tượng Anh.
Câu chuyện: phim mở đầu lạnh với một điểm dữ liệu duy nhất. Những năm đầu đến chậm, rồi đều đặn; rồi các điểm đến nhanh hơn và cây bút chì vội vã. Ngay trước giá trị cuối mọi thứ dừng lại: cú cắt duy nhất của phim, vào im lặng. Điểm cuối cùng hiện một mình, rồi cả chuỗi trong một khung, và chuyển thành những sọc màu nóng dần, kết ở một ô trống: mùa hè tới?
Phong cách: biểu đồ tự kể chuyện: chấm, đường, một cây bút chì đỏ xanh vẽ mọi nét, sọc màu. Một cú cắt, một lần đổi màu ở cao trào, con số đúng sự thật.
Cảm giác: bình thản, rồi báo động, rồi suy ngẫm. Khoảng 50 giây, giọng đọc thưa.`),
  S("desktop-flythrough", "1:00", 30,
    `Topic: what really happens when you press undo.
Story: you delete a whole paragraph by mistake, press undo, and it is simply back. The film rewinds that instant and follows it: every change you made has been waiting on a stack of small cards; undo lifts the top card, hands it to the document, and the words climb back into place. The ending: undo does not bring back the past, it replays a list, and closing the app throws the list away.
Style: app cards standing on a sunlit desk, one camera flying after what moves between them; the hero is the deleted paragraph as a small voxel toy that hops the whole route; titles are objects on the desk.
Mood: playful, curious, clear. About 60 seconds, narration with subtitles.`,
    `Chủ đề: điều gì thật sự xảy ra khi bạn bấm hoàn tác.
Câu chuyện: bạn lỡ xoá cả một đoạn văn, bấm hoàn tác, và nó trở lại như chưa có gì. Phim tua lại khoảnh khắc ấy và đi theo nó: mọi thay đổi của bạn đang chờ trên một chồng thẻ nhỏ; lệnh hoàn tác nhấc thẻ trên cùng, đưa cho tài liệu, và các chữ trèo về chỗ cũ. Kết phim: hoàn tác không mang quá khứ trở lại, nó chỉ chạy lại một danh sách, và đóng ứng dụng là danh sách ấy bị vứt đi.
Phong cách: các thẻ ứng dụng đứng trên một mặt bàn đầy nắng, một máy quay bay theo thứ di chuyển giữa chúng; nhân vật chính là đoạn văn bị xoá, thành một món đồ chơi khối voxel nhỏ nhảy suốt chặng đường; tiêu đề là đồ vật trên bàn.
Cảm giác: vui, tò mò, rõ ràng. Khoảng 60 giây, có giọng đọc và phụ đề.`),
  S("engraving", "0:40", 24,
    `Topic: a museum label for the screen beside a case: the Rosetta Stone, and three things you did not know about it.
Story: the first frame is a burin cutting copper, a curl of metal rising ahead of the point. The plate is proofed and the whole engraving of the stone appears; three magnified details fly out to their slots, each with one sourced fact. After a breath of silence, hand colouring washes in, and the label ends with where to see the real thing: the British Museum.
Style: copperplate engraving: cross-hatching, burin lines, the press, plate marks and a tissue guard. Information arrives in museum-label order.
Mood: scholarly, precise, gently wondrous. About 40 seconds, short captions.`,
    `Chủ đề: một tấm nhãn bảo tàng cho màn hình đặt cạnh tủ trưng bày: phiến đá Rosetta, và ba điều bạn chưa biết về nó.
Câu chuyện: khung hình đầu tiên là mũi khắc cắt vào tấm đồng, một sợi kim loại cuộn lên phía trước. Tấm bản được in thử và cả bức khắc phiến đá hiện ra; ba chi tiết phóng to bay về chỗ của mình, mỗi chi tiết một dữ kiện có nguồn. Sau một nhịp im lặng, màu tô tay loang vào, và tấm nhãn kết bằng nơi xem hiện vật thật: Bảo tàng Anh.
Phong cách: tranh khắc bản đồng: nét đan chéo, nét mũi khắc, máy in, vết mép bản và tờ giấy lụa che. Thông tin đến theo thứ tự của một tấm nhãn bảo tàng.
Cảm giác: uyên bác, chính xác, nhẹ nhàng kỳ thú. Khoảng 40 giây, chú thích ngắn.`),
  S("game-show", "1:30", 30,
    `Topic: the thirty years that made the modern bicycle, from the 1860s boneshaker to the air-filled tyre, staged as a rhythm game show.
Story: the cast drops onto the set on the beat and counts in. Then comes a run of levels: each level is a title card with a machine's name and years, then eight bars of play where a pattern is set up, answered and judged with a slam and "Perfect!". Near the end a remix level piles every machine onto one stage, and a report card closes the show.
Style: flat game-show graphics, call-and-response, judgement words, stats as game UI, thumbnails of finished levels. Fictional host and cast; the machines and dates are real and sourced.
Mood: loud, fun, fast. About 90 seconds, a show host's shouts.`,
    `Chủ đề: ba mươi năm làm nên chiếc xe đạp hiện đại, từ chiếc boneshaker thập niên 1860 tới lốp bơm hơi, dựng thành một gameshow theo nhịp.
Câu chuyện: dàn nhân vật rơi xuống sân khấu đúng nhịp và đếm vào. Rồi tới một chuỗi màn chơi: mỗi màn là một thẻ tiêu đề có tên cỗ xe và năm, rồi tám ô nhịp chơi, trong đó một mẫu nhịp được đặt ra, được đáp lại và được chấm bằng một cú đập kèm chữ "Perfect!". Gần cuối, một màn remix dồn mọi cỗ xe lên một sân khấu, và một bảng điểm khép lại chương trình.
Phong cách: đồ hoạ gameshow phẳng, hỏi đáp theo nhịp, chữ chấm điểm, số liệu như giao diện trò chơi, ảnh thu nhỏ các màn đã qua. Người dẫn và nhân vật hư cấu; cỗ xe và năm tháng là thật, có nguồn.
Cảm giác: ồn, vui, nhanh. Khoảng 90 giây, tiếng hô của người dẫn chương trình.`),
  S("glass-product", "0:30", 24,
    `Topic: a fictional glass kettle whose water shows its own heat.
Story: light on a dark floor first, a caustic trembling; we follow it up to the object. Strip lights sweep and the shell lifts off layer by layer until only the coil and the water stand. On the bass drop the coil lights up from inside and the glow climbs through the water as it warms. The kettle leaves the frame; its caustic keeps pulsing on the floor, with the name and one line.
Style: a glass product render: caustics, refraction, strip lights, slow macro moves, one inner glow. The invisible thing made visible.
Mood: pure, premium, intimate. About 30 seconds, no narration.`,
    `Chủ đề: một chiếc ấm thuỷ tinh hư cấu, nước trong ấm tự cho thấy độ nóng của nó.
Câu chuyện: trước hết là ánh sáng trên nền tối, một vệt hội tụ run rẩy; ta đi theo nó lên tới vật thể. Đèn dải quét qua và lớp vỏ nhấc ra từng lớp, chỉ còn cuộn nhiệt và nước. Đúng lúc tiếng bass dội xuống, cuộn nhiệt sáng lên từ bên trong và ánh sáng leo dần trong nước khi nước ấm lên. Chiếc ấm rời khung hình; vệt sáng vẫn đập trên nền, cùng tên sản phẩm và một câu.
Phong cách: render sản phẩm thuỷ tinh: vệt sáng hội tụ, khúc xạ, đèn dải, cận cảnh chậm, một nguồn sáng bên trong. Thứ vô hình được nhìn thấy.
Cảm giác: tinh khiết, cao cấp, gần gũi. Khoảng 30 giây, không giọng đọc.`),
  S("halftone-dossier", "0:30", 30,
    `Topic: a missing-person file for a garden gnome.
Story: the file opens on the last sighting and works backwards: a postcard from a beach, signed with one small footprint; Exhibit B, a ticket stub for two; Exhibit C, a neighbour's statement that he "seemed restless". "In summary", the photo at the top of the file shows him back on his own lawn, looking perfectly innocent. The stamp comes down and misses; it lands on the table, and the gnome walks free out of frame.
Style: a retro halftone dossier: case numbers, exhibit cards, red stamps; dot density shows emotion. One idea and one gag per card.
Mood: deadpan, silly, affectionate. About 30 seconds, captions and a stern narrator.`,
    `Chủ đề: hồ sơ người mất tích của một chú lùn làm vườn.
Câu chuyện: hồ sơ mở ra ở lần thấy cuối cùng rồi đi ngược lại: một tấm bưu thiếp từ bãi biển, ký bằng một dấu chân nhỏ; tang vật B, cuống vé cho hai người; tang vật C, lời khai của hàng xóm rằng ông "có vẻ bồn chồn". "Tóm lại", tấm ảnh đầu hồ sơ cho thấy ông đã về lại bãi cỏ nhà mình, trông vô tội hết sức. Con dấu đóng xuống và trượt; nó rơi xuống bàn, và chú lùn thong thả đi khỏi khung hình.
Phong cách: hồ sơ điểm lưới kiểu cũ: số hồ sơ, thẻ tang vật, con dấu đỏ; mật độ chấm thể hiện cảm xúc. Mỗi thẻ một ý và một câu đùa.
Cảm giác: tỉnh bơ, ngớ ngẩn, trìu mến. Khoảng 30 giây, chữ và một giọng đọc nghiêm.`),
  S("hd-2d", "1:15", 60,
    `Topic: a small market town where the clock has stopped and nobody knows the hour.
Story: at bright noon, with no lamps at all, an apprentice is sent to mend the clock and has to ask around. She goes from place to place as the sun falls, the bakery's oven, the forge at dusk, the tavern at night, each lit by its own fire, and each person gives her one part. At night she climbs the tower with a lantern and sets the hands; the bell rings and window after window answers. She rests at a small save point at the top.
Style: pixel sprites in a small 3D tabletop world, with depth of field, bloom and tilt-shift. Every light comes from something you can see, and at night the light she carries is the main one. RPG grammar: map moves, a dialog box, a save point.
Mood: brave, cosy, epic in miniature. About 75 seconds, short dialog boxes, no voice.`,
    `Chủ đề: một thị trấn chợ nhỏ nơi chiếc đồng hồ đã dừng và không ai biết mấy giờ.
Câu chuyện: giữa trưa sáng rực, chưa có ngọn đèn nào, một cô học việc được cử đi sửa đồng hồ và phải hỏi khắp nơi. Cô đi từ chỗ này sang chỗ khác khi mặt trời xuống dần, lò bánh, lò rèn lúc chiều tà, quán rượu lúc đêm, mỗi nơi sáng bằng ngọn lửa của riêng nó, và mỗi người cho cô một bộ phận. Đêm xuống, cô mang đèn lồng trèo lên tháp và chỉnh kim; chuông vang lên và từng ô cửa sổ đáp lại. Cô nghỉ ở một điểm lưu nhỏ trên đỉnh.
Phong cách: nhân vật pixel trong một thế giới 3D nhỏ như trên mặt bàn, có độ sâu trường ảnh, ánh sáng loé và hiệu ứng tilt-shift. Ánh sáng nào cũng đến từ một vật nhìn thấy được, và về đêm ngọn đèn cô mang là nguồn sáng chính. Ngữ pháp game RPG: đi trên bản đồ, hộp thoại, điểm lưu game.
Cảm giác: dũng cảm, ấm cúng, sử thi thu nhỏ. Khoảng 75 giây, hộp thoại ngắn, không giọng đọc.`),
  S("hologram-hud", "0:40", 24,
    `Topic: an upgrade: this year's fictional mountain-rescue sled against last year's. The numbers are examples.
Story: two versions share one pad. A part is locked in close-up and the rest scans out from it. Three parts in turn, the runners, the brake and the harness: each old part goes dim and is scan-erased, the new one scans in, and its number rolls from old to new and docks in a side rail. At the end the edges cool and the panels switch off until one value at eye level remains: the one that matters.
Style: a sci-fi hologram HUD: target boxes, leaders, scan lines, cyan glow, values held long enough to read.
Mood: precise, futuristic, confident. About 40 seconds, no narration, a pulsing score.`,
    `Chủ đề: một bản nâng cấp: chiếc xe trượt cứu hộ núi hư cấu năm nay so với năm ngoái. Các con số là ví dụ.
Câu chuyện: hai phiên bản cùng đứng trên một bệ. Một bộ phận được khoá mục tiêu trong cận cảnh và phần còn lại quét ra từ đó. Lần lượt ba bộ phận, thanh trượt, phanh và dây đai: mỗi bộ phận cũ mờ đi và bị quét xoá, bộ phận mới quét vào, con số chạy từ cũ sang mới rồi bay vào một cột bên cạnh. Cuối cùng các cạnh nguội dần và bảng tắt hết, chỉ còn một giá trị ngang tầm mắt: con số quan trọng nhất.
Phong cách: giao diện hologram khoa học viễn tưởng: khung ngắm, đường dẫn, vạch quét, ánh xanh lơ, giá trị đứng đủ lâu để đọc.
Cảm giác: chính xác, tương lai, tự tin. Khoảng 40 giây, không giọng đọc, nhạc nhịp đập.`),
  S("impasto", "0:40", 24,
    `Topic: one bowl, many hands.
Story: a wet knife stroke on bare canvas is the first event: a potter's thumb opens a lump of clay. The bowl passes from hand to hand, one painted plate each: the kiln, a market stall, a wedding table, a child who drops it, a grandmother who glues it. The music grows from one solo string to an ensemble, each hand a new instrument. At the end we pull back: the painting hangs over a kitchen table, and the mended bowl sits under it.
Style: thick oil paint, palette-knife strokes, visible texture, light that rakes across the ridges of the paint.
Mood: tender, warm, then overflowing. About 40 seconds, music and the sounds of knife, clay and table, no narration.`,
    `Chủ đề: một chiếc bát, nhiều bàn tay.
Câu chuyện: một nét dao ướt trên toan trống là sự kiện đầu tiên: ngón tay người thợ gốm mở một khối đất sét. Chiếc bát đi từ tay này sang tay khác, mỗi tay một bức vẽ: lò nung, sạp chợ, bàn tiệc cưới, em bé làm rơi, người bà dán lại. Nhạc lớn dần từ một dây đàn đơn độc thành cả dàn, mỗi bàn tay thêm một nhạc cụ. Cuối phim máy quay lùi ra: bức tranh treo trên bàn bếp, và chiếc bát đã dán nằm ngay bên dưới.
Phong cách: sơn dầu dày, nét dao vẽ, chất liệu thấy rõ, ánh sáng rọi xiên qua các gờ sơn.
Cảm giác: dịu dàng, ấm, rồi tràn đầy. Khoảng 40 giây, nhạc và tiếng dao, đất sét, mặt bàn, không giọng đọc.`),
  S("ink-wash", "0:50", 24,
    `Topic: the character 永, "forever", and a river from its spring to the sea.
Story: the film is one large character written stroke by stroke. Each of its five strokes opens into a small scene of the same river: a drop under a stone, a stream past a pine, a ferry in a flood, a quiet bend in mist, the open sea. Between strokes there is silence. There is no pull-back: the film closes on the last stroke drying beside a red seal.
Style: Chinese ink wash: wet and dry brush, empty paper, one stroke as the event, a red seal at the end.
Mood: still, flowing, serene. About 50 seconds, a closing line of poetry.`,
    `Chủ đề: chữ 永, "vĩnh", và một dòng sông từ nguồn ra biển.
Câu chuyện: cả phim là một chữ lớn viết từng nét. Mỗi trong năm nét mở ra một cảnh nhỏ của cùng một dòng sông: giọt nước dưới hòn đá, con suối qua cây thông, chuyến đò giữa mùa lũ, khúc quanh trong sương, biển khơi. Giữa các nét là im lặng. Không có cú lùi máy: phim khép lại ở nét cuối đang khô cạnh con dấu đỏ.
Phong cách: tranh thuỷ mặc Trung Hoa: bút ướt và bút khô, giấy trống, một nét là sự kiện, con dấu đỏ ở cuối.
Cảm giác: tĩnh, trôi chảy, thanh thản. Khoảng 50 giây, một câu thơ ở cuối.`),
  S("iso-infographic", "1:00", 24,
    `Topic: the round trip of one glass of water, from the reservoir to your tap and back to the river.
Story: the whole film is one isometric map, a diorama board; each step is a station on a closed loop, joined by a dashed route line. The camera rides the route without a single cut: reservoir, filter beds, pump tower, kitchen tap, drain, treatment works, river. Each station gets one action, one label and one number built from small icons, sourced from a public water utility. The route comes back to its start with one number changed: how much was lost on the way. It ends on a close-up of a single drop icon.
Style: flat true isometric, no outlines, three tones per face, cutaways, isotype numbers, focus plus context.
Mood: clear, friendly, satisfying. About 60 seconds, warm narration.`,
    `Chủ đề: vòng đi của một ly nước, từ hồ chứa tới vòi nhà bạn rồi về lại dòng sông.
Câu chuyện: cả phim là một bản đồ isometric, một sa bàn; mỗi bước là một trạm trên một vòng khép kín, nối với nhau bằng một đường đứt nét. Máy quay đi theo đường ấy không một lần cắt: hồ chứa, bể lọc, tháp bơm, vòi bếp, cống, nhà máy xử lý, dòng sông. Mỗi trạm có một hành động, một nhãn và một con số dựng bằng biểu tượng nhỏ, lấy từ nguồn công khai của một công ty nước. Đường đi trở về điểm đầu với một con số đã đổi: bao nhiêu nước đã mất dọc đường. Phim kết ở cận cảnh một biểu tượng giọt nước.
Phong cách: isometric phẳng đúng chuẩn, không viền, mỗi mặt ba sắc độ, hình cắt, con số bằng biểu tượng, cận cảnh trong bối cảnh.
Cảm giác: rõ ràng, thân thiện, thoả mãn. Khoảng 60 giây, giọng đọc ấm.`),
  S("isometric-picture-book", "1:00", 30,
    `Topic: why one long queue at the post office beats four short ones.
Story: four counters, four short lines, and you always pick the slow one. The film shows why: one customer with a tricky parcel stops a whole line while the others run on. Rewind. The same people, the same counters, one shared queue: the next person goes to the next free counter, and nobody gets stuck behind the parcel. The longest waits of each way stand side by side on the floor at the end.
Style: a clean isometric world where the order things move in explains the idea: words and numbers printed on the floor, people standing up like dominoes, lids lifted off rooms, arrows and lights that show the order, bars on the ground.
Mood: tidy, clever, satisfying. About 60 seconds, calm narration with subtitles.`,
    `Chủ đề: vì sao một hàng dài ở bưu điện lại hơn bốn hàng ngắn.
Câu chuyện: bốn quầy, bốn hàng ngắn, và bạn luôn chọn trúng hàng chậm. Phim cho thấy lý do: một khách với gói hàng rắc rối làm cả hàng đứng lại trong khi các hàng khác vẫn chạy. Tua lại. Cùng những người ấy, cùng các quầy ấy, một hàng chung: người kế tiếp tới quầy trống kế tiếp, và không ai kẹt sau gói hàng. Cuối phim thời gian chờ lâu nhất của mỗi cách đứng cạnh nhau trên sàn.
Phong cách: một thế giới isometric gọn gàng, nơi thứ tự mọi thứ chuyển động giải thích ý tưởng: chữ và số in trên sàn, người đứng dậy như quân domino, nắp phòng được nhấc lên, mũi tên và đèn chỉ thứ tự, cột số dựng trên mặt đất.
Cảm giác: ngăn nắp, thông minh, thoả mãn. Khoảng 60 giây, giọng đọc điềm tĩnh, có phụ đề.`),
  S("kino-montage", "1:00", 24,
    `Topic: who really dug the Panama Canal. The official histories name the engineers; the site photographs and films answer.
Story: a title on a red crane jib over a worker riding a steam shovel. The official map, the cut circled in red, opens onto the excavation. The machine: shovels fill a grid, the cut deepens in split strips, trainloads of spoil a day, hours from blast to bucket. The turn: the pay rolls, gold for some and silver for the rest, circled. Faces, then tens of thousands, and the first ship goes through.
Style: constructivist montage: red and black, diagonals, rhythmic cuts, typography that shouts, real archive footage and photos, credited.
Mood: heroic, rhythmic, proud. About 60 seconds, captions over a driving score.`,
    `Chủ đề: ai thực sự đã đào kênh đào Panama. Lịch sử chính thức nêu tên các kỹ sư; ảnh và phim công trường trả lời.
Câu chuyện: tựa phim trên một cần cẩu đỏ, phía trên một người thợ đứng trên máy xúc hơi nước. Bản đồ chính thức, đoạn kênh khoanh đỏ, mở ra công trường đào. Cỗ máy: những máy xúc lấp đầy một lưới, lòng kênh sâu dần trong các dải chia màn hình, số chuyến tàu đất mỗi ngày, số giờ từ phát mìn tới gàu xúc. Bước ngoặt: bảng lương, vàng cho một số người và bạc cho phần còn lại, được khoanh lại. Những gương mặt, rồi hàng chục nghìn người, và con tàu đầu tiên đi qua.
Phong cách: dựng phim kiểu kiến tạo: đỏ và đen, đường chéo, cắt theo nhịp, chữ hô to, tư liệu phim và ảnh thật, ghi nguồn.
Cảm giác: anh hùng, nhịp nhàng, tự hào. Khoảng 60 giây, chữ trên nền nhạc thúc giục.`),
  S("lidar-survey", "0:40", 24,
    `Topic: from the air it is only fields in northern England; under them the ground still remembers a lost Roman road.
Story: an aerial photo of nothing but pasture and hedges. A scan line turns it into a laser point cloud. A horizontal plane steps down through the trees on the beat, and every return above it lifts away and glows. Near-silence over the bare ground, then a second scan turns it into a raking-lit surface, and a straight line nobody had mapped lights up, mile after mile.
Style: a LiDAR survey: point clouds, scan lines, height rulers, raking light, England's open Environment Agency survey data (or my own scan in Assets), every figure sourced.
Mood: quiet, revealing, a little haunting. About 40 seconds, short narration.`,
    `Chủ đề: nhìn từ trên không chỉ thấy đồng cỏ ở miền bắc nước Anh; dưới đó, mặt đất vẫn còn nhớ một con đường La Mã đã mất.
Câu chuyện: một bức ảnh chụp từ trên không, chỉ toàn đồng cỏ và hàng rào cây. Một vạch quét biến nó thành một đám mây điểm laser. Một mặt phẳng nằm ngang hạ dần xuyên qua cây theo nhịp, mọi điểm phía trên nó nhấc lên và phát sáng. Gần như im lặng trên nền đất trống, rồi lần quét thứ hai biến nó thành một bề mặt được chiếu sáng xiên, và một đường thẳng chưa ai vẽ trên bản đồ sáng lên, dặm này qua dặm khác.
Phong cách: khảo sát LiDAR: đám mây điểm, vạch quét, thước đo độ cao, ánh sáng xiên, dữ liệu mở của Cơ quan Môi trường Anh (hoặc bản quét của tôi ở phần Tư liệu), mọi con số có nguồn.
Cảm giác: lặng, hé lộ, hơi ám ảnh. Khoảng 40 giây, giọng đọc ngắn.`),
  S("living-screencast", "1:00", 30,
    `Topic: one day with a fictional shared shopping-list app, led by its little pixel mascot.
Story: morning: a half-written list, the mascot already pushing the cursor's selection. Noon: a friend adds something and the mascot catches the notification as it lands. Afternoon: someone ticks an item in the shop and it strikes through in both windows. Evening: the theme and the music turn warm, the list is done, and the mascot goes to sleep on the last item as the window dims.
Style: a living screencast: the app's own UI drawn crisply, a recording-software camera that zooms and pans, a sacred pixel grid, the mascot walking on the top edges of windows, information in layers.
Mood: friendly, clear, a little cheeky. About 60 seconds, short captions.`,
    `Chủ đề: một ngày với ứng dụng danh sách đi chợ dùng chung hư cấu, do linh vật pixel nhỏ của nó dẫn đường.
Câu chuyện: buổi sáng: một danh sách viết dở, linh vật đã đẩy vùng chọn của con trỏ. Buổi trưa: một người bạn thêm món và linh vật đón lấy thông báo vừa đáp xuống. Buổi chiều: ai đó đánh dấu một món trong cửa hàng và nó bị gạch ở cả hai cửa sổ. Buổi tối: giao diện và nhạc ấm lại, danh sách xong, và linh vật ngủ trên món cuối cùng khi cửa sổ mờ dần.
Phong cách: quay màn hình sống động: giao diện ứng dụng vẽ sắc nét, máy quay kiểu phần mềm quay màn hình phóng to và lia, lưới pixel bất khả xâm phạm, linh vật đi trên mép trên của các cửa sổ, thông tin theo từng lớp.
Cảm giác: thân thiện, rõ ràng, hơi tinh nghịch. Khoảng 60 giây, chú thích ngắn.`),
  S("lowpoly-island", "0:55", 24,
    `Topic: two small islands that trade until they are one place.
Story: two islands, one with trees and no people, one with people and no trees, an empty channel between them. A boat carries a sapling across; a house comes back the other way. Each piece that lands is a note, each island has its own tune, and as they trade the tunes start to answer each other. At dawn the last piece is a bridge, and the two tunes resolve on the first sunlit facet.
Style: low-poly isometric 3D, soft pastel light, each piece a musical note.
Mood: calm, gentle, then quietly moving. About 55 seconds, music and the small sounds of each piece landing, no narration.`,
    `Chủ đề: hai hòn đảo nhỏ trao đổi với nhau cho tới khi thành một nơi.
Câu chuyện: hai hòn đảo, một đảo có cây mà không có người, một đảo có người mà không có cây, giữa là một eo nước trống. Một con thuyền chở cây non sang; một ngôi nhà đi theo chiều ngược lại. Mỗi vật đặt xuống là một nốt nhạc, mỗi đảo có giai điệu riêng, và càng trao đổi hai giai điệu càng đáp lại nhau. Lúc bình minh, vật cuối cùng là một cây cầu, và hai giai điệu hoà lại trên mặt đa giác đầu tiên đón nắng.
Phong cách: 3D low-poly isometric, ánh sáng pastel mềm, mỗi vật là một nốt nhạc.
Cảm giác: êm, dịu dàng, rồi lặng lẽ xúc động. Khoảng 55 giây, nhạc và tiếng nhỏ của mỗi vật đặt xuống, không giọng đọc.`),
  S("memphis-diorama", "0:45", 60,
    `Topic: one market square at dawn, noon, dusk and night, in a single take.
Story: no hero; the place is the subject. Stalls, awnings, a fountain, a striped clock tower and a tram stop pass through four hours, about ten seconds each. Every change of hour is the same gesture: the clock tower squashes down for half a second, springs back, and a wave of the next hour's colours spreads out from it while small things act as the ring passes. The lights go out one by one until only the clock is lit.
Style: a Memphis-style miniature diorama: bold pastel blocks, dots and squiggles, toy-like shapes, one slow camera; time told only by colour and small motions.
Mood: cheerful, cosy, looping. About 45 seconds, warm music and the small sounds of the square, no narration, with short type in two languages at the bottom.`,
    `Chủ đề: một quảng trường chợ lúc bình minh, trưa, chiều tà và đêm, trong một cú máy duy nhất.
Câu chuyện: không có nhân vật chính; nơi chốn là chủ thể. Các sạp hàng, mái bạt, đài phun nước, một tháp đồng hồ kẻ sọc và một trạm xe điện đi qua bốn thời khắc, mỗi lúc khoảng mười giây. Mỗi lần đổi giờ là cùng một động tác: tháp đồng hồ nhún xuống nửa giây, bật lên, và một làn sóng màu của giờ sau lan ra từ đó, những vật nhỏ cử động khi vòng sóng đi qua. Đèn tắt dần từng ngọn cho tới khi chỉ còn chiếc đồng hồ sáng.
Phong cách: sa bàn thu nhỏ kiểu Memphis: khối màu pastel đậm, chấm và nét ngoằn ngoèo, hình như đồ chơi, một máy quay chậm; thời gian được kể chỉ bằng màu và những chuyển động nhỏ.
Cảm giác: vui tươi, ấm cúng, lặp vòng. Khoảng 45 giây, nhạc ấm và tiếng nhỏ của quảng trường, không giọng đọc, có dòng chữ ngắn hai thứ tiếng ở cuối khung.`),
  S("microgame", "1:00", 24,
    `Topic: a clumsy new waiter's first day in a very busy restaurant, hour by hour.
Story: a string of microgames, each one an hour of the day: a shouted command word (POUR! DODGE! SMILE!), three seconds, one action and one result, a success or a funny failure. Between games we cut back to the host, a scoreboard of lives and a clock. The lunch rush and the dinner rush speed everything up. The final boss at closing time mixes all the earlier rules: one last table that wants everything at once.
Style: each microgame in a different visual medium (crayon, ink, terminal, risograph, pixel, blueprint, Swiss type), lives as UI, a SPEED UP sting, a boss that mixes the rules.
Mood: frantic, funny, triumphant. About 60 seconds, a host's shouts.`,
    `Chủ đề: ngày đầu tiên của một anh phục vụ vụng về trong một nhà hàng rất đông, từng giờ một.
Câu chuyện: một chuỗi trò chơi siêu ngắn, mỗi trò là một giờ trong ngày: một lệnh được hô to (RÓT! NÉ! CƯỜI!), ba giây, một hành động và một kết quả, thành công hoặc thất bại buồn cười. Giữa các trò, phim cắt về người dẫn, bảng điểm số mạng và đồng hồ. Giờ cao điểm trưa và tối làm mọi thứ tăng tốc. Màn trùm cuối lúc đóng cửa trộn mọi luật trước đó: bàn khách cuối cùng đòi mọi thứ cùng lúc.
Phong cách: mỗi trò chơi một chất liệu hình ảnh khác nhau (sáp màu, mực, màn hình terminal, risograph, pixel, bản vẽ xanh, chữ kiểu Thuỵ Sĩ), số mạng là giao diện, một đoạn báo SPEED UP, màn trùm trộn luật.
Cảm giác: cuống cuồng, buồn cười, chiến thắng. Khoảng 60 giây, tiếng hô của người dẫn.`),
  S("microscope", "0:40", 24,
    `Topic: one stained onion root tip, thinner than a thread, and two small circles on it that tell different stories.
Story: the slide sits on a bench with its label. One continuous dive brings us down to the root, with a dimension line for scale. Inside the first circle, near the tip, a scan front lights every counted pixel and a share of dark stain appears; the camera trucks to a second circle further up the root and counts again. After a silence both circles are framed side by side, and the film says which holds more and by how much. The last move goes down to a single dividing cell.
Style: microscopy: a real CC0 or public-domain micrograph (or my own in Assets), scan fronts, measured counts, dimension lines, every number computed from the image.
Mood: exact, curious, quietly astonishing. About 40 seconds, short narration.`,
    `Chủ đề: một đầu rễ hành nhuộm màu, mảnh hơn sợi chỉ, và hai vòng tròn nhỏ trên đó kể hai câu chuyện khác nhau.
Câu chuyện: tấm lam kính nằm trên bàn kèm nhãn. Một cú lặn liền mạch đưa ta xuống tới đầu rễ, có đường kích thước để thấy tỷ lệ. Trong vòng tròn thứ nhất, gần chóp rễ, một vệt quét làm sáng từng điểm ảnh được đếm và hiện ra tỷ lệ màu nhuộm sẫm; máy quay trượt sang vòng thứ hai cao hơn trên rễ và đếm lại. Sau một khoảng lặng, cả hai vòng được đặt cạnh nhau, và phim cho biết vòng nào nhiều hơn, nhiều hơn bao nhiêu. Cú máy cuối đi xuống tới một tế bào đang phân chia.
Phong cách: hiển vi: ảnh hiển vi thật CC0 hoặc thuộc phạm vi công cộng (hoặc ảnh của tôi ở phần Tư liệu), vệt quét, số đếm đo được, đường kích thước, mọi con số tính từ chính bức ảnh.
Cảm giác: chính xác, tò mò, kinh ngạc lặng lẽ. Khoảng 40 giây, giọng đọc ngắn.`),
  S("midcentury-toon", "0:40", 24,
    `Topic: a set-up guide for a fictional countertop bread maker, for a product page or a QR code on the box.
Story: "Meet Crumb." The box opens on a mustard background. One scene per step, each a wide shot plus a round detail call-out: stand it on a flat counter with space on each side, pour in water up to the line, tip in the mix and hold the start button for one second. Then the payoff: a cutaway shows the dough rising, the loaf lifts out, and an iris closes on the product.
Style: a 1950s classroom cartoon: flat shapes, limited palette, a cheerful narrator, irises through a medallion, a pull-back with counter-rotation.
Mood: cheerful, tidy, reassuring. About 40 seconds, friendly narration.`,
    `Chủ đề: hướng dẫn cài đặt cho một máy làm bánh mì hư cấu đặt trên bàn bếp, dùng cho trang sản phẩm hoặc mã QR trên hộp.
Câu chuyện: "Meet Crumb." Chiếc hộp mở ra trên nền vàng mù tạt. Mỗi bước một cảnh, gồm một cảnh rộng và một ô tròn phóng to chi tiết: đặt máy trên mặt bàn phẳng, chừa khoảng trống hai bên, đổ nước tới vạch, cho bột vào và giữ nút khởi động một giây. Rồi phần thưởng: hình cắt cho thấy bột nở lên, ổ bánh nhấc ra, và một vòng tròn khép lại quanh sản phẩm.
Phong cách: phim hoạt hình lớp học thập niên 1950: hình khối phẳng, ít màu, người dẫn vui vẻ, vòng tròn mở qua một huy chương, lùi máy kèm xoay ngược.
Cảm giác: vui tươi, gọn gàng, yên tâm. Khoảng 40 giây, giọng đọc thân thiện.`),
  S("news-package", "0:55", 30,
    `Topic: results night for a small town's giant vegetable show, as a full on-air news package (a fictional town and channel).
Story: the sting becomes the channel bug and a countdown of results runs from fifth place to first. Each one is entered with a band wipe and announced by the category tab on the headline strap: the heaviest pumpkin, the longest marrow, a disputed weigh-in, the surprise winner. A results board and a weigh-in card belong to each picture. At the end the last stamp lands and becomes the end card.
Style: broadcast news graphics: a headline strap, a rundown, a results board, a spec card, a source line and a corner tag that belong to each picture.
Mood: brisk, authoritative, quietly funny. About 55 seconds, a news anchor's narration.`,
    `Chủ đề: đêm công bố kết quả hội thi rau khổng lồ của một thị trấn nhỏ, dựng thành một gói bản tin truyền hình đầy đủ (thị trấn và kênh đều hư cấu).
Câu chuyện: đoạn hình hiệu thu lại thành logo kênh ở góc, và kết quả đếm ngược từ hạng năm tới hạng nhất. Mỗi kết quả vào bằng một dải lau hình và được báo bằng nhãn chủ đề trên dải tít: quả bí nặng nhất, quả bầu dài nhất, một lần cân gây tranh cãi, người thắng bất ngờ. Một bảng kết quả và một thẻ cân gắn với từng hình. Cuối cùng con dấu đáp xuống và thành khung kết.
Phong cách: đồ hoạ bản tin truyền hình: dải tít, danh mục, bảng kết quả, thẻ thông số, dòng nguồn và nhãn góc gắn với từng hình.
Cảm giác: nhanh, đáng tin, hài hước ngầm. Khoảng 55 giây, giọng người dẫn bản tin.`),
  S("newsreel", "0:55", 24,
    `Topic: the crossword craze of 1924, which a great American newspaper called a sinful waste of time.
Story: searchlights snap on with a fanfare. The warning spreads: spinning headlines, a grease pencil circling a clue, a map and the months rolling by. Then the other side of the story: the first crossword book selling out, in its publisher's own printed words. A split-screen duel follows, each side with its own band, trading bars faster and faster, and the last caption lands the joke: the paper that scoffed printed a crossword of its own in 1942.
Style: a 1920s newsreel: silver film, place-and-date captions, spinning newspapers, flip-books, real archive footage and print, credited.
Mood: brassy, comic, knowing. About 55 seconds, a period announcer's voice.`,
    `Chủ đề: cơn sốt ô chữ năm 1924, mà một tờ báo lớn của Mỹ gọi là sự lãng phí thời gian đầy tội lỗi.
Câu chuyện: đèn pha bật sáng cùng tiếng kèn. Lời cảnh báo lan đi: những tờ báo xoay tít, bút sáp khoanh quanh một ô gợi ý, một tấm bản đồ và tháng ngày trôi qua. Rồi phía bên kia câu chuyện: cuốn sách ô chữ đầu tiên bán hết, theo chính lời in của nhà xuất bản. Tiếp theo là cuộc đấu chia màn hình, mỗi bên một ban nhạc, đối đáp từng ô nhịp nhanh dần, và dòng chữ cuối tung cú đùa: tờ báo từng chê bai đã in ô chữ của chính mình năm 1942.
Phong cách: phim thời sự thập niên 1920: phim bạc, dòng chữ ghi nơi chốn và ngày tháng, báo xoay, sách lật hình, tư liệu phim và báo in thật, ghi nguồn.
Cảm giác: ồn ào, hài hước, tinh quái. Khoảng 55 giây, giọng phát thanh viên thời ấy.`),
  S("one-line", "0:45", 24,
    `Topic: two strangers crossing one city, each drawn with their own single line.
Story: two pens touch down in opposite corners of warm white paper and never lift, drawn in turn. One line becomes a bed, a bus, an office window; the other a bicycle, a bakery, a rainy street. Twice they pass without knowing. Near the end both slow down at one bus stop and the lines meet; the ink runs out and the last stroke fades into dry scratches.
Style: continuous lines, no fills and no shading, the camera following the nib like a tracking shot, the pen's soft shadow, at most one accent colour used once.
Mood: tender, simple, bittersweet. About 45 seconds, gentle music, no narration.`,
    `Chủ đề: hai người lạ đi qua một thành phố, mỗi người vẽ bằng một nét riêng.
Câu chuyện: hai ngòi bút chạm xuống hai góc đối nhau của tờ giấy trắng ngà và không bao giờ nhấc lên, vẽ lần lượt. Một nét thành chiếc giường, chiếc xe buýt, ô cửa văn phòng; nét kia thành chiếc xe đạp, tiệm bánh, con phố mưa. Hai lần họ đi ngang nhau mà không biết. Gần cuối cả hai chậm lại ở một trạm xe buýt và hai nét gặp nhau; mực cạn và nét cuối mờ thành những vệt khô.
Phong cách: nét liền, không tô, không đổ bóng, máy quay đi theo ngòi bút, bóng mờ của cây bút, nhiều nhất một màu nhấn dùng một lần.
Cảm giác: dịu dàng, giản dị, buồn vui lẫn lộn. Khoảng 45 giây, nhạc nhẹ, không giọng đọc.`),
  S("paper-lantern", "1:30", 30,
    `Topic: one window through one year, told inside a glowing paper-cut lightbox.
Story: darkness and a single pinprick of light that widens until it fills the frame. Inside, layered paper scenes change season by season, with light the only transition: in spring an old tailor sews at the window; in summer a child outside learns to fly a kite; in autumn the child comes in with a torn coat; in winter snow covers the step and one lamp stays on. The lights go out one by one, the last window last.
Style: a paper-cut lightbox: stacked paper layers, depth as distance, silhouettes, windows, light that turns on.
Mood: warm, nostalgic, gentle. About 90 seconds, soft narration.`,
    `Chủ đề: một ô cửa sổ qua một năm, kể bên trong một hộp đèn giấy cắt phát sáng.
Câu chuyện: bóng tối và một điểm sáng nhỏ xíu mở rộng dần tới khi lấp đầy khung hình. Bên trong, những cảnh giấy xếp lớp đổi theo từng mùa, ánh sáng là cách chuyển cảnh duy nhất: mùa xuân, ông thợ may già khâu áo bên cửa sổ; mùa hè, một đứa trẻ ngoài kia tập thả diều; mùa thu, đứa trẻ vào nhà với chiếc áo rách; mùa đông, tuyết phủ bậc thềm và một ngọn đèn vẫn sáng. Đèn tắt dần từng ngọn, ô cửa này tắt sau cùng.
Phong cách: hộp đèn giấy cắt: các lớp giấy chồng lên nhau, chiều sâu là khoảng cách, hình bóng, ô cửa, ánh đèn bật sáng.
Cảm giác: ấm, hoài niệm, nhẹ nhàng. Khoảng 90 giây, giọng kể khẽ.`),
  S("paper-popup", "1:30", 60,
    `Topic: how paper itself is made, told by a pop-up book.
Story: a storybook on a real wooden desk opens to one spread that is pulled again and again, each pull one step: a tree falls on a slide tab, a wheel turns it to chips, a vat stirs, a frame dips and lifts, a wet sheet hangs to dry, and the last pull folds that sheet into this very book. A little paper sprite rides each mechanism. Then the book closes, the pieces folding in reverse, with a puff of air.
Style: a paper pop-up book: folds and mechanisms you can see, paper as the character, the edge of the page, real desk light that was there all along.
Mood: wondrous, playful, curious. About 90 seconds, a storyteller's voice.`,
    `Chủ đề: giấy được làm ra thế nào, do chính một cuốn sách pop-up kể.
Câu chuyện: một cuốn truyện trên chiếc bàn gỗ thật mở ra một trang được kéo đi kéo lại, mỗi lần kéo là một bước: một cái cây đổ theo lẫy trượt, bánh xoay băm nó thành dăm, bể bột khuấy, khung lưới nhúng xuống rồi nhấc lên, tờ giấy ướt treo cho khô, và lần kéo cuối gấp tờ giấy ấy thành chính cuốn sách này. Một tinh linh giấy nhỏ cưỡi trên từng cơ cấu. Rồi cuốn sách khép lại, các mảnh gấp ngược, kèm một làn hơi.
Phong cách: sách pop-up bằng giấy: nếp gấp và cơ cấu nhìn thấy được, giấy là nhân vật, mép trang sách, ánh đèn bàn thật vẫn ở đó từ đầu.
Cảm giác: kỳ diệu, tinh nghịch, tò mò. Khoảng 90 giây, giọng người kể chuyện.`),
  S("papercut-red", "0:50", 24,
    `Topic: a letter cut from red paper, sent home for the New Year.
Story: a small folded square arrives at a door. It unfolds panel by panel, and each panel is a scene cut by the writer's own hand: the long road, the city's crowds, a small room, a lantern bought with the last coin, the train home. A grandfather reads it by candlelight through the paper. The last panel is a door, and there is a knock. The whole world folds back into a small square, handed over at that door.
Style: red paper-cut: folded symmetry, one cut that unfolds, red on light, candlelight through paper. The craft of cutting is the plot.
Mood: festive, tender, warm. About 50 seconds, a storyteller's voice.`,
    `Chủ đề: một lá thư cắt từ giấy đỏ, gửi về nhà dịp năm mới.
Câu chuyện: một ô giấy gấp nhỏ tới trước một cánh cửa. Nó mở ra từng ô, mỗi ô là một cảnh cắt bằng chính tay người viết: con đường dài, đám đông thành phố, một căn phòng nhỏ, chiếc đèn lồng mua bằng đồng xu cuối cùng, chuyến tàu về. Người ông đọc thư dưới ánh nến xuyên qua giấy. Ô cuối cùng là một cánh cửa, và có tiếng gõ. Cả thế giới gấp lại thành một ô giấy nhỏ, được trao ngay tại cánh cửa ấy.
Phong cách: tranh cắt giấy đỏ: đối xứng gấp nếp, một nhát cắt mở ra thành hình, đỏ trên nền sáng, ánh nến xuyên qua giấy. Nghề cắt giấy chính là câu chuyện.
Cảm giác: rộn ràng, dịu dàng, ấm áp. Khoảng 50 giây, giọng người kể chuyện.`),
  S("pictogram-motion", "1:00", 60,
    `Topic: one whole day of one busy person, told in pictograms, every hour on the beat.
Story: one figure, one card per hour: waking, brushing teeth, running for a bus, typing, lifting boxes, eating, napping, cycling, cooking, dancing, reading, sleeping. The palette moves from dawn hues to night hues, and the pace climbs a ladder from one card per bar to one per beat at rush hour. A long take follows the figure through lunchtime; the finale fills the screen with a grid of every hour, and the figure walks off.
Style: pictogram motion: one card = one item, flat geometric figures, strict rhythm, colours as hours, a finale grid. No narration.
Mood: energetic, cheerful, precise. About 60 seconds, a driving 150 BPM track.`,
    `Chủ đề: trọn một ngày của một người bận rộn, kể bằng hình biểu tượng, mỗi giờ đúng một nhịp.
Câu chuyện: một nhân vật, mỗi giờ một thẻ: thức dậy, đánh răng, chạy theo xe buýt, gõ phím, khuân thùng, ăn, ngủ trưa, đạp xe, nấu ăn, nhảy múa, đọc sách, đi ngủ. Bảng màu đi từ sắc bình minh tới sắc đêm, và tốc độ leo dần từ một thẻ mỗi ô nhịp lên một thẻ mỗi phách vào giờ cao điểm. Một cảnh quay dài đi theo nhân vật qua giờ trưa; đoạn kết lấp đầy màn hình bằng một lưới của mọi giờ, và nhân vật bước đi.
Phong cách: đồ hoạ chuyển động bằng hình biểu tượng: một thẻ là một việc, hình người hình học phẳng, nhịp chặt chẽ, màu là giờ, lưới tổng kết. Không giọng đọc.
Cảm giác: sôi nổi, vui tươi, chính xác. Khoảng 60 giây, nhạc 150 BPM thúc giục.`),
  S("pixel-rpg", "0:55", 24,
    `Topic: a hero's whole life, told only through what they bought and sold at one village shop.
Story: the shop screen. A young hero buys a wooden sword and one potion. Years pass in item lists: a better sword, a ring, two tickets, a cradle. On every visit the shopkeeper's dialog box says a little less, and the palette shifts with each age. Then an old hero comes back, sells the great sword, the last item in the inventory, and buys a fishing rod. Credits scroll over the overworld as they walk home.
Style: a 16-bit pixel RPG at low native resolution: an indexed palette, ordered dither, small sprites, dialog boxes with portraits, menus and an inventory that tell the story.
Mood: nostalgic, gentle, moving. About 55 seconds, chip music with echo and text blips, no voice.`,
    `Chủ đề: cả cuộc đời một người hùng, kể chỉ qua những món họ mua và bán ở một cửa hàng trong làng.
Câu chuyện: màn hình cửa hàng. Người hùng trẻ mua một thanh kiếm gỗ và một bình thuốc. Năm tháng trôi qua trong các danh sách đồ: thanh kiếm tốt hơn, chiếc nhẫn, hai tấm vé, một chiếc nôi. Mỗi lần ghé, hộp thoại của chủ quán nói ít đi một chút, và bảng màu đổi theo từng tuổi. Rồi người hùng già quay lại, bán thanh đại kiếm, món cuối cùng trong túi, và mua một chiếc cần câu. Danh sách người làm phim chạy trên bản đồ khi họ đi về nhà.
Phong cách: game RPG pixel 16-bit ở độ phân giải gốc thấp: bảng màu giới hạn, dither có trật tự, nhân vật nhỏ, hộp thoại có chân dung, menu và túi đồ kể chuyện.
Cảm giác: hoài niệm, dịu dàng, xúc động. Khoảng 55 giây, nhạc chip có vang và tiếng chữ gõ, không giọng đọc.`),
  S("printed-long-take", "1:00", 30,
    `Topic: the black robin, a small New Zealand bird that came back from five.
Story: a cold dawn on a rock island in the Chatham Islands; the last birds roost in the scrub at the top of a cliff. They wake one by one and the take follows them down to the shore, where a board records how few were left in 1980. Eggs were moved into foster nests; the same cliff is printed again and again as the numbers grow, until the board is cut with today's count and the old figure is struck out.
Style: a scratchboard print in one unbroken take: knife cuts in black, paper white, one single red, the same place printed again as time passes, words cut into the world, a plate of type in the sky for the title and the end. Every count sourced.
Mood: hushed, windy, hopeful. About 60 seconds, eleven short narrated lines with subtitles.`,
    `Chủ đề: chim black robin, một loài chim nhỏ ở New Zealand được kéo về từ con số năm.
Câu chuyện: một bình minh lạnh trên một đảo đá ở quần đảo Chatham; những con chim cuối cùng ngủ trong bụi cây trên đỉnh vách đá. Chúng thức dậy từng con một và cú máy theo chúng xuống bờ, nơi một tấm bảng ghi số chim ít ỏi còn lại năm 1980. Trứng được chuyển sang tổ nuôi hộ; cùng vách đá ấy được in lại hết lần này tới lần khác khi số chim tăng dần, cho tới khi tấm bảng được khắc con số hôm nay và con số cũ bị gạch đi.
Phong cách: tranh cào một cú máy liền mạch: nhát dao trên nền đen, giấy trắng, chỉ một màu đỏ, cùng một nơi được in lại khi thời gian trôi, chữ khắc vào thế giới, một bản chữ in trên bầu trời cho tiêu đề và đoạn kết. Mọi con số có nguồn.
Cảm giác: lặng, lộng gió, hy vọng. Khoảng 60 giây, mười một câu đọc ngắn, có phụ đề.`),
  S("risograph", "0:40", 24,
    `Topic: two neighbours who have never met, one floor apart, and one song through the ceiling.
Story: blue ink: a man upstairs practises the cello on a Sunday morning. Pink ink: a woman downstairs waters her plants and hums along without noticing. The film cuts between them, one plate a shot, the ceiling between them. In the stairwell they finally cross, and where the two plates meet the third colour appears for the first time. The print turns out to be a concert poster pasted up in that stairwell.
Style: risograph print: two spot inks, misregistration, grain, an overprint colour that only appears where the plates meet.
Mood: relaxed, charming, sunny. About 40 seconds, music and the printing machine's own sounds at each plate, no narration.`,
    `Chủ đề: hai người hàng xóm chưa từng gặp, cách nhau một tầng, và một bài hát xuyên qua trần nhà.
Câu chuyện: mực xanh: một người đàn ông trên lầu tập cello sáng Chủ nhật. Mực hồng: một người phụ nữ dưới lầu tưới cây và ngân nga theo mà không để ý. Phim cắt qua lại giữa hai người, mỗi cảnh một bản in, trần nhà ở giữa. Ở cầu thang họ cuối cùng đi ngang nhau, và chỗ hai bản in gặp nhau, màu thứ ba lần đầu xuất hiện. Hoá ra tờ in là một tấm poster hoà nhạc dán ngay ở cầu thang ấy.
Phong cách: in risograph: hai màu mực pha, lệch bản, hạt giấy, màu in chồng chỉ hiện ở chỗ các bản gặp nhau.
Cảm giác: thư thái, duyên dáng, nắng. Khoảng 40 giây, nhạc và tiếng máy in ở mỗi bản in, không giọng đọc.`),
  S("rubber-hose", "0:50", 24,
    `Topic: a talent show in a 1930s cartoon broom cupboard.
Story: a curtain rises on a band tuning up. A boastful mop, a vain feather duster and a bucket with a tuba voice take turns on stage, and each act goes wrong on the beat. The smallest contestant, a thimble nobody noticed, taps one tiny rhythm; the band picks it up and the whole cupboard dances. The thimble is handed the trophy, which it cannot lift.
Style: 1930s rubber-hose animation: bendy limbs, pie-cut eyes, white gloves, everything bouncing on the beat, a radio announcer calling the show like a horse race.
Mood: zany, warm, joyful. About 50 seconds, jazz band and an announcer.`,
    `Chủ đề: một đêm thi tài trong tủ đựng chổi của phim hoạt hình thập niên 1930.
Câu chuyện: màn kéo lên trên một ban nhạc đang lên dây. Một cây lau nhà khoác lác, một chiếc chổi lông điệu đà và một chiếc xô giọng kèn tuba lần lượt lên sân khấu, tiết mục nào cũng hỏng đúng nhịp. Thí sinh nhỏ nhất, một chiếc đê khâu chẳng ai để ý, gõ một nhịp tí hon; ban nhạc bắt theo và cả tủ nhảy múa. Chiếc đê được trao cúp, nhưng nhấc không nổi.
Phong cách: hoạt hình kiểu ống cao su thập niên 1930: chân tay mềm dẻo, mắt hình bánh khuyết, găng tay trắng, mọi thứ nảy theo nhịp, một bình luận viên radio tường thuật như đua ngựa.
Cảm giác: tưng tửng, ấm áp, vui vẻ. Khoảng 50 giây, ban nhạc jazz và một bình luận viên.`),
  S("satellite-briefing", "0:40", 24,
    `Topic: Lake Chad, which an old atlas still shows as one huge sheet of water, and what orbit shows today.
Story: a printed atlas page with the lake's name in serif type. We dive into the map until it fills the frame, and a scanner bar tears it away to reveal reeds, sand and dry bed, then silence. Time rewinds and plays forward in one locked frame from the first Landsat years, each year leaving its shoreline as a ring. A range line gives the human scale from the old lakeside town of Baga to today's water. Then water is heard before it is seen: the part that still comes back with the rains.
Style: a satellite briefing: real public satellite imagery, map overlays, range lines, year counters, every figure sourced.
Mood: sober, striking, a glimmer of hope. About 40 seconds, short narration.`,
    `Chủ đề: hồ Chad, mà tấm bản đồ cũ vẫn vẽ là một mặt nước mênh mông, và những gì vệ tinh nhìn thấy hôm nay.
Câu chuyện: một trang bản đồ in, tên hồ viết bằng chữ có chân. Ta lặn vào bản đồ tới khi nó lấp đầy khung hình, một vạch quét xé nó ra để lộ lau sậy, cát và lòng hồ khô, rồi im lặng. Thời gian tua ngược và chạy tới trong một khung cố định từ những năm Landsat đầu tiên, mỗi năm để lại đường bờ của nó như một vòng tròn. Một đường đo cho thấy khoảng cách có thật, từ thị trấn ven hồ Baga ngày trước tới mặt nước hôm nay. Rồi tiếng nước vang lên trước khi thấy nước: phần vẫn quay lại theo mùa mưa.
Phong cách: bản tin vệ tinh: ảnh vệ tinh công khai thật, lớp phủ bản đồ, đường đo khoảng cách, bộ đếm năm, mọi con số có nguồn.
Cảm giác: tỉnh táo, ấn tượng, le lói hy vọng. Khoảng 40 giây, giọng đọc ngắn.`),
  S("scifi-toon", "0:55", 24,
    `Topic: a tech-support call between two universes.
Story: a jaded genius, on holiday in another universe, takes a call from a nervous assistant at home: the portal in the lab has started eating the furniture. On a split screen one voice talks the other through the fix, step by step ("have you tried turning it off?"), and every step makes it worse at home while something strange comes through on his side. They finally fix it by swapping places: the genius is home with the mess, the assistant is on a beach.
Style: a sci-fi sitcom cartoon: thick outlines, bright flat colours, portal swirls the only thing that glows, deadpan acting with quick lip sync, one gag per step.
Mood: cynical, absurd, very funny. About 55 seconds, two-character dialogue.`,
    `Chủ đề: một cuộc gọi hỗ trợ kỹ thuật giữa hai vũ trụ.
Câu chuyện: một thiên tài chán đời đang nghỉ mát ở vũ trụ khác thì nhận cuộc gọi từ người trợ lý hay lo ở nhà: cánh cổng trong phòng thí nghiệm bắt đầu ăn đồ đạc. Trên màn hình chia đôi, một giọng hướng dẫn giọng kia sửa từng bước ("thử tắt đi chưa?"), và bước nào cũng làm mọi thứ ở nhà tệ hơn, trong khi có thứ kỳ lạ lọt sang phía ông. Cuối cùng họ sửa được bằng cách đổi chỗ: thiên tài về nhà với đống bừa bộn, trợ lý nằm trên bãi biển.
Phong cách: hoạt hình sitcom khoa học viễn tưởng: viền đậm, màu phẳng tươi, vòng xoáy cổng không gian là thứ duy nhất phát sáng, diễn xuất tỉnh bơ với khẩu hình nhanh, mỗi bước một câu đùa.
Cảm giác: cay độc, phi lý, rất buồn cười. Khoảng 55 giây, lời thoại của hai nhân vật.`),
  S("shadow-puppet", "0:55", 24,
    `Topic: a puppet that performs its own making.
Story: backstage first: rim-lit hands and rods. On the lit cloth a blank sheet of hide is scraped, carved, dyed red and green, and jointed with rivets; each step is one scene of a short play. Finished, the puppet stands up, bows, and acts out being cut, dyed and joined, as the story of how it came to be. The maker's hand reaches in to adjust it, and it pushes the hand away. At the end the puppets rest, laid flat on a dim table, and the lamp is carried away.
Style: shadow puppetry: translucent coloured leather, jointed limbs on rods, a cloth screen, a lamp that is the light of the story itself.
Mood: folk, playful, tender. About 55 seconds, a storyteller's voice and folk percussion.`,
    `Chủ đề: con rối tự diễn lại quá trình làm ra chính nó.
Câu chuyện: trước hết là hậu trường: bàn tay và que rối viền sáng. Trên tấm màn sáng, một tấm da trống được nạo, chạm khắc, nhuộm đỏ và xanh, rồi nối khớp bằng đinh tán; mỗi bước là một cảnh của vở diễn ngắn. Làm xong, con rối đứng dậy, cúi chào, rồi diễn lại cảnh bị cắt, nhuộm và nối, như câu chuyện về nguồn gốc của nó. Bàn tay người thợ thò vào chỉnh, và nó đẩy bàn tay ra. Cuối cùng các con rối nghỉ, nằm phẳng trên chiếc bàn mờ tối, và ngọn đèn được mang đi.
Phong cách: múa rối bóng: da màu trong mờ, tay chân có khớp gắn trên que, màn vải, ngọn đèn chính là ánh sáng của câu chuyện.
Cảm giác: dân gian, tinh nghịch, dịu dàng. Khoảng 55 giây, giọng người kể chuyện và trống dân gian.`),
  S("silent-film", "0:55", 24,
    `Topic: a silent trick film about a stage magician whose rabbit keeps taking his place.
Story: one stage. The magician waves his wand, and by substitution cuts the rabbit becomes a bouquet, a chair, then his own top hat, which hops away. He chases it around a single wide frame; every trick he tries backfires, until he vanishes himself and the rabbit, in his hat, takes the bow. A final card addresses the audience directly.
Style: a 1920s silent film as it looks projected: 4:3 in a gate between theatre curtains, ink drawing with washed greys, flicker, weave, scratches, intertitle cards, an iris, a cinema piano.
Mood: comic, deadpan, sweet. About 55 seconds, piano only.`,
    `Chủ đề: một phim câm kỹ xảo về ông ảo thuật gia sân khấu bị con thỏ cứ chiếm chỗ.
Câu chuyện: một sân khấu. Ông vung đũa, và bằng các cú cắt thay vật, con thỏ thành bó hoa, thành chiếc ghế, rồi thành chính chiếc mũ chóp của ông, nhảy đi mất. Ông đuổi theo nó trong một khung hình rộng; trò nào ông thử cũng phản tác dụng, cho tới khi chính ông biến mất và con thỏ đội mũ của ông bước ra chào. Tấm thẻ chữ cuối nói thẳng với khán giả.
Phong cách: phim câm thập niên 1920 như khi được chiếu: khung 4:3 giữa hai tấm màn rạp, tranh mực với lớp xám loang, nhấp nháy, rung khung, vết xước, thẻ chữ chen giữa, vòng tròn mở đóng, đàn piano rạp chiếu bóng.
Cảm giác: hài, tỉnh bơ, ngọt ngào. Khoảng 55 giây, chỉ có piano.`),
  S("silkscreen-poster", "0:40", 24,
    `Topic: a misprint story: one poster for a fictional open-air cinema, run after run.
Story: light through a blank mesh, a stencil exposed. The poster is pulled one ink at a time, sky, hills, the screen, the crowd, each run faster than the last, and the registration drifts further each time until the date lands in the wrong place. The camera climbs through the layers in one long take. On the last pull the ink lands true on the date, and the prints hang swaying on the drying rack.
Style: silkscreen posters: flat spot colours printed layer by layer, bold lettering, a crane through multi-plane parallax.
Mood: inviting, sunny, a little funny. About 40 seconds, the squeegee's sounds and light music, no narration.`,
    `Chủ đề: chuyện in lỗi: một tấm poster cho rạp phim ngoài trời hư cấu, in hết lượt này tới lượt khác.
Câu chuyện: ánh sáng xuyên qua tấm lưới trống, khuôn được phơi. Tấm poster được in từng màu mực, bầu trời, đồi, màn chiếu, đám đông, lượt sau nhanh hơn lượt trước, và các bản lệch dần mỗi lần cho tới khi ngày chiếu rơi sai chỗ. Máy quay leo qua các lớp trong một cảnh quay dài. Ở lượt cuối mực đáp đúng ngày chiếu, và các tờ in treo đung đưa trên giá phơi.
Phong cách: poster in lụa: màu pha phẳng in từng lớp, chữ đậm, máy quay cẩu lên qua nhiều lớp cảnh chuyển động lệch nhau.
Cảm giác: mời gọi, nắng, hơi hài hước. Khoảng 40 giây, tiếng dao gạt mực và nhạc nhẹ, không giọng đọc.`),
  S("spy-titles", "0:45", 24,
    `Topic: the opening titles of an imaginary 1960s spy film, told as a heist in reverse.
Story: a stolen violin is being returned, location by location, to where it belongs: a night train, a casino, a rooftop, a concert hall, with silhouettes trying to stop it. Each credit lands as part of the picture, a doorway, a staircase, a playing card. In the end the violin is back in its case, and the title never quite assembles: one piece is missing, and the hero walks off with it.
Style: a 1960s title sequence: flat opaque inks on paper, hand-cut edges, silhouettes, a diagonal grid, graphic match cuts, type that is the set. All credits are fictional roles.
Mood: cool, sly, jazzy. About 45 seconds, a big-band score.`,
    `Chủ đề: đoạn tựa mở đầu của một phim điệp viên tưởng tượng thập niên 1960, kể như một vụ trộm chạy ngược.
Câu chuyện: một cây vĩ cầm bị đánh cắp đang được trả về, qua từng địa điểm, đúng nơi của nó: đoàn tàu đêm, sòng bạc, mái nhà, phòng hoà nhạc, với những hình bóng tìm cách ngăn lại. Mỗi dòng tên đáp xuống thành một phần của khung hình: một ô cửa, một cầu thang, một quân bài. Cuối cùng cây đàn về lại hộp, và tựa phim không bao giờ ghép đủ: thiếu một mảnh, và nhân vật chính mang nó đi mất.
Phong cách: đoạn tựa phim thập niên 1960: mực phẳng đục trên giấy, mép cắt tay, hình bóng, lưới chéo, cắt nối khớp hình, chữ là bối cảnh. Mọi tên trong phần giới thiệu là vai hư cấu.
Cảm giác: điềm tĩnh, ranh mãnh, đậm chất jazz. Khoảng 45 giây, nhạc big band.`),
  S("stained-glass", "0:55", 24,
    `Topic: a town's twelve trades, in a rose window that works like a clock.
Story: the sun crosses a rose window in a stone guild hall, and the petals light in turn like hours: the baker at first light, the weaver, the smith, the ferryman, on round the dial. Wherever the light falls, that pane's little scene moves, and each worker hands something to the next. At dusk the light reaches the centre: all twelve at one table. Clouds cover the sun, every pane fades to grey, and one lead line lingers.
Style: stained glass: coloured panes held by lead lines, light passing through, the sun's path as the camera. A town's working life, no religious images.
Mood: legendary, warm, then gentle. About 55 seconds, a narrator and choir-like music.`,
    `Chủ đề: mười hai nghề của một thị trấn, trong một ô cửa hoa hồng chạy như chiếc đồng hồ.
Câu chuyện: mặt trời đi qua ô cửa hoa hồng trong một sảnh đá của phường hội, và các cánh lần lượt sáng như từng giờ: người làm bánh lúc tờ mờ, thợ dệt, thợ rèn, người lái đò, cứ thế quanh mặt số. Ánh nắng rơi vào ô kính nào, cảnh nhỏ ở ô ấy chuyển động, và mỗi người trao một thứ cho người kế tiếp. Lúc hoàng hôn ánh sáng tới tâm: cả mười hai người quanh một bàn. Mây che mặt trời, mọi ô kính phai thành xám, và một đường chì còn đọng lại.
Phong cách: kính màu lắp chì: ô kính màu giữ bằng đường chì, ánh sáng xuyên qua, đường đi của mặt trời là máy quay. Đời sống lao động của thị trấn, không có hình ảnh tôn giáo.
Cảm giác: huyền thoại, ấm áp, rồi dịu dàng. Khoảng 55 giây, người kể chuyện và nhạc như hợp xướng.`),
  S("swiss-motion", "0:45", 24,
    `Topic: one day at a small railway station, as a timetable that sets itself.
Story: a single dot on white paper; the grid grows from it, 24 rows, one hour a row. Each row fills on the beat: the first train, the school run, lunch, the last train, nothing at 3 a.m. Everything snaps to the columns. Then the exception: a night train that is not on the timetable crosses the gutter in signal red, off the grid, and leaves the frame, and the system closes over the space it left.
Style: Swiss motion graphics: a modular grid, black type and bars on white, one signal red, extreme scale contrast, every move snapping on the beat, nothing bouncing.
Mood: rigorous, witty, confident. About 45 seconds, a minimal electronic beat.`,
    `Chủ đề: một ngày ở một nhà ga nhỏ, thành một bảng giờ tàu tự dàn trang.
Câu chuyện: một dấu chấm trên giấy trắng; lưới mọc ra từ đó, 24 hàng, mỗi hàng một giờ. Từng hàng lấp đầy đúng nhịp: chuyến tàu đầu, giờ đưa con đi học, bữa trưa, chuyến tàu cuối, 3 giờ sáng không có gì. Mọi thứ hút về các cột. Rồi ngoại lệ: một chuyến tàu đêm không có trong bảng băng qua khe giữa bằng màu đỏ tín hiệu, ra khỏi lưới, rời khung hình, và hệ thống khép lại trên khoảng trống nó để lại.
Phong cách: đồ hoạ chuyển động kiểu Thuỵ Sĩ: lưới mô-đun, chữ và thanh đen trên nền trắng, một màu đỏ tín hiệu, tương phản cỡ cực lớn, mọi chuyển động hút về đúng nhịp, không nảy.
Cảm giác: chặt chẽ, dí dỏm, tự tin. Khoảng 45 giây, nhạc điện tử tối giản.`),
  S("teardown", "0:40", 24,
    `Topic: a small open-hardware gadget, opened to show what is inside. Find one whose CAD and board files are public under a free licence, and tell me which one before you start.
Story: a grazing macro over its top and one real press. In one orbit the layers lift apart, top first, each layer labelled. The camera dives into the gap between board and case to look up at the chip, then rises through the case to the switch. A fast pull back closes it bottom first, and the closed gadget shows its real dimensions.
Style: an exploded teardown: real published design files, one continuous orbit, layer labels, dimension callouts, every number public.
Mood: precise, satisfying, a little nerdy. About 40 seconds, short narration.`,
    `Chủ đề: một thiết bị phần cứng mở nhỏ, được mở ra để thấy bên trong. Tìm một thiết bị có tệp CAD và bo mạch công khai theo giấy phép tự do, và báo tôi biết trước khi bắt đầu.
Câu chuyện: một cận cảnh lướt sát mặt trên của nó và một lần bấm thật. Trong một vòng quay máy, các lớp tách lên, lớp trên trước, mỗi lớp có nhãn. Máy quay lặn vào khe giữa bảng mạch và vỏ để nhìn lên con chip, rồi đi lên qua vỏ tới công tắc. Một cú lùi nhanh đóng nó lại từ dưới lên, và thiết bị đã đóng hiện kích thước thật của nó.
Phong cách: tháo rời sản phẩm: tệp thiết kế công bố thật, một vòng quay liền mạch, nhãn từng lớp, chú thích kích thước, mọi con số công khai.
Cảm giác: chính xác, thoả mãn, hơi mọt kỹ thuật. Khoảng 40 giây, giọng đọc ngắn.`),
  S("telestrator", "0:55", 30,
    `Topic: how my Sunday-league team came back from 0–3 at half-time, three goals in twelve minutes. The clips are mine, in Assets: the three goals, the last one filmed from two phones.
Story: a show sting and a match-record card set up the score and bracket the three second-half goals. The first two are shown quickly; the third gets the full treatment: freeze in play, lines and arrows drawn on the pitch, a split screen of the two phones, the runs traced. A shot map shows where the three were struck, a data card follows, and the end card closes.
Style: a sports telestrator: short freezes, hand-drawn lines on live play, circles and arrows, a shot map, broadcast cards.
Mood: analytical, building, thrilling. About 55 seconds, a pundit's commentary.`,
    `Chủ đề: đội bóng phong trào của tôi lội ngược dòng từ 0–3 sau hiệp một, ghi ba bàn trong mười hai phút. Clip là của tôi, ở phần Tư liệu: ba bàn thắng, bàn cuối quay từ hai điện thoại.
Câu chuyện: một đoạn hình hiệu và một thẻ tóm tắt trận đặt ra tỷ số và đánh dấu ba bàn của hiệp hai. Hai bàn đầu được chiếu nhanh; bàn thứ ba được phân tích đầy đủ: dừng hình giữa trận, đường kẻ và mũi tên vẽ trên sân, chia màn hình hai điện thoại, các đường chạy được vẽ lại. Một bản đồ dứt điểm cho thấy ba bàn được sút từ đâu, tiếp theo là thẻ số liệu, và khung kết khép lại.
Phong cách: bảng phân tích thể thao: dừng hình ngắn, nét vẽ tay trên cảnh trận đấu, vòng tròn và mũi tên, bản đồ dứt điểm, thẻ đồ hoạ truyền hình.
Cảm giác: phân tích, dồn dần, hồi hộp. Khoảng 55 giây, giọng bình luận viên.`),
  S("tilt-shift", "0:40", 24,
    `Topic: a building site that looks like a model, from an empty lot to opening day.
Story: an empty lot at dawn. In time-lapse, diggers, cranes and tiny workers swarm and a building climbs floor by floor. Once per stage, time crashes to real speed: a worker sharing lunch with a stray dog, a lost balloon drifting past the crane, the first window being washed. On opening day a small crowd gathers, the band of focus widens to full sharpness, and the model becomes a real place.
Style: a tilt-shift miniature: a thin band of focus, saturated toy colours, sped-up motion, a system of many small actors bending around one tiny one.
Mood: cute, busy, then tender. About 40 seconds, music, then the real sounds of the place when time drops to real speed.`,
    `Chủ đề: một công trường trông như mô hình, từ bãi đất trống tới ngày khai trương.
Câu chuyện: một bãi đất trống lúc rạng sáng. Tua nhanh, máy xúc, cần cẩu và những người thợ tí hon kéo đến và toà nhà mọc lên từng tầng. Mỗi giai đoạn một lần, thời gian rơi về tốc độ thật: một người thợ chia bữa trưa với con chó hoang, một quả bóng bay lạc trôi qua cần cẩu, ô cửa kính đầu tiên được lau. Ngày khai trương, một đám đông nhỏ tụ lại, dải nét rộng ra thành nét toàn khung, và mô hình trở thành một nơi có thật.
Phong cách: tilt-shift thu nhỏ: một dải nét mỏng, màu đồ chơi đậm, chuyển động tua nhanh, một hệ thống nhiều nhân vật nhỏ xoay quanh một nhân vật bé xíu.
Cảm giác: dễ thương, bận rộn, rồi dịu dàng. Khoảng 40 giây, nhạc, rồi tiếng thật của nơi ấy khi thời gian rơi về tốc độ thật.`),
  S("transit-map", "0:50", 30,
    `Topic: the rise and fall of the tram network in a fictional river city, and the one line that survived. The city is made up, so its figures are labelled "Example".
Story: a coin in close-up match-cuts to a station dot on a blank sheet. A pen draws the first line, and year by year five more reach the docks, cross the river and climb the hill while a counter ticks up the kilometres. Then the cars come: lines close one by one, struck through on the printed sheet as the counter falls. One line survives; a tram leaves its last station, and the camera rises to the whole network, its closed lines ghosted, with the end title printed in the margin.
Style: a printed map that grows line by line under a moving camera: flat colour lines, interchange rings, water bodies and ferry lines that read at a distance, a paper veil; every word and number printed on the sheet, in two languages.
Mood: steady, wistful, building. About 50 seconds, music and the tuned sounds of lines and stops, no narration.`,
    `Chủ đề: thời thịnh và suy của mạng tàu điện ở một thành phố ven sông hư cấu, và tuyến duy nhất còn lại. Thành phố là tự đặt ra nên số liệu ghi nhãn "Example".
Câu chuyện: một đồng xu trong cận cảnh khớp hình sang một chấm nhà ga trên tờ giấy trống. Một cây bút vẽ tuyến đầu tiên, và năm này qua năm khác thêm năm tuyến tới bến cảng, vượt sông, leo đồi trong lúc bộ đếm tăng số ki-lô-mét. Rồi ô tô tới: các tuyến đóng dần từng tuyến, bị gạch trên tờ bản đồ in khi bộ đếm giảm. Một tuyến còn lại; chuyến tàu rời ga cuối, và máy quay nâng lên tới toàn bộ mạng lưới, các tuyến đã đóng mờ đi, tiêu đề cuối in ở lề giấy.
Phong cách: một bản đồ in lớn dần từng tuyến dưới một máy quay chuyển động: tuyến màu phẳng, vòng nhà ga trung chuyển, mặt nước và tuyến phà đọc rõ từ xa, một lớp giấy mờ phủ; mọi chữ và số in trên tờ bản đồ, hai thứ tiếng.
Cảm giác: vững vàng, bâng khuâng, dồn dần. Khoảng 50 giây, nhạc và tiếng của các tuyến, nhà ga, không giọng đọc.`),
  S("ukiyoe", "0:45", 24,
    `Topic: one street in four impressions: dawn, rain, festival night and snow.
Story: a close crop of a paper lantern fills the sheet; we pull back and find the print. The same key block of one street is reprinted four times with new colours. A noodle seller's cart stands at the same corner in each: opening at dawn, under oiled umbrellas in the rain, in the crowd on festival night, alone in the snow. The last print is left unfinished: key line only, the colour blocks never land, except the seller's lamp.
Style: ukiyo-e woodblock prints: flat colour blocks, bokashi gradients, keyblock lines, cartouches, seals. The story is told by what each impression changes.
Mood: contemplative, festive, serene. About 45 seconds, Japanese instruments and the sounds of paper and wood, no narration.`,
    `Chủ đề: một con phố trong bốn bản in: bình minh, mưa, đêm hội và tuyết.
Câu chuyện: một khung cắt sát chiếc đèn lồng giấy lấp đầy tờ giấy; ta lùi ra và thấy bức tranh. Cùng một bản khắc chính của con phố được in lại bốn lần với màu mới. Xe mì của một người bán đứng ở cùng góc phố trong mỗi bản: dọn hàng lúc bình minh, dưới những chiếc ô giấy dầu trong mưa, giữa đám đông đêm hội, một mình trong tuyết. Bản in cuối bỏ dở: chỉ có nét bản khắc chính, các bản màu không bao giờ đáp xuống, trừ ngọn đèn của người bán.
Phong cách: tranh khắc gỗ ukiyo-e: mảng màu phẳng, chuyển màu bokashi, nét bản khắc chính, ô chữ, con dấu. Câu chuyện được kể bằng những gì mỗi bản in thay đổi.
Cảm giác: trầm tư, rộn ràng, thanh thản. Khoảng 45 giây, nhạc cụ Nhật và tiếng giấy, tiếng gỗ, không giọng đọc.`),
  S("urban-sketch", "0:30", 24,
    `Topic: a recipe drawn from life at a morning market.
Story: a blank page with a handwritten date. One thin ink line finds the first stall: tomatoes, a fishmonger's scale, herbs in a basket, each drawn while the crowd moves around it. Colour arrives only on what goes into the basket. Last of all the finished dish is painted in full in the corner of the page, and the sketchbook closes on it.
Style: urban sketch, pen and wash: one thin wobbly ink line that overshoots corners and breaks mid-stroke, then loose watercolour laid separately on top.
Mood: breezy, light, hungry. About 30 seconds, no narration.`,
    `Chủ đề: một công thức nấu ăn vẽ từ đời thật ở chợ sáng.
Câu chuyện: một trang trắng có ngày tháng viết tay. Một nét mực mảnh tìm tới sạp đầu tiên: cà chua, chiếc cân của người bán cá, rau thơm trong giỏ, mỗi thứ được vẽ trong lúc đám đông di chuyển quanh nó. Màu chỉ đến với những gì được bỏ vào giỏ. Sau cùng món ăn hoàn chỉnh được tô đầy đủ ở góc trang, và cuốn sổ khép lại trên đó.
Phong cách: ký hoạ đường phố, bút mực và màu nước: một nét mực mảnh hơi run, chạy lố góc và đứt giữa chừng, rồi lớp màu nước phóng khoáng đặt riêng lên trên.
Cảm giác: lộng gió, nhẹ nhàng, thấy đói. Khoảng 30 giây, không giọng đọc.`),
  S("visual-investigation", "1:00", 30,
    `Topic: the fall of the Tacoma Narrows Bridge on 7 November 1940, rebuilt minute by minute from every kind of surviving evidence.
Story: it opens on the decisive frame and rewinds. Film, photographs, witness accounts and the official inquiry are laid on one clock; the clock narrows through three scales, the hours of that morning, then the seconds of the fall, then the months of the inquiry, each carried by a readout inside the picture. The independent sources point to the same spot: the middle of the main span.
Style: a visual investigation: synced archive footage, a red sync line, 2×2 evidence grids, timestamps, annotations, every source cited.
Mood: forensic, gripping, respectful. About 60 seconds, a measured narrator.`,
    `Chủ đề: cú sập của cầu Tacoma Narrows ngày 7 tháng 11 năm 1940, dựng lại từng phút từ mọi loại bằng chứng còn sót lại.
Câu chuyện: phim mở bằng khung hình quyết định rồi tua ngược. Phim, ảnh chụp, lời kể nhân chứng và kết luận điều tra chính thức được đặt lên cùng một chiếc đồng hồ; đồng hồ thu hẹp qua ba thang thời gian, những giờ của buổi sáng ấy, rồi những giây của cú sập, rồi những tháng điều tra, mỗi thang có một dòng số hiện ngay trong hình. Các nguồn độc lập cùng chỉ về một điểm: giữa nhịp chính.
Phong cách: điều tra bằng hình ảnh: tư liệu phim đồng bộ, đường đồng bộ đỏ, lưới bằng chứng 2×2, mốc thời gian, chú thích, mọi nguồn được trích dẫn.
Cảm giác: như pháp y, cuốn hút, tôn trọng. Khoảng 60 giây, giọng đọc chừng mực.`),
  S("watercolor", "1:30", 60,
    `Topic: a garden journal kept for one year on a single sheet.
Story: one sheet of warm paper, locked, a month's date in the corner. A pear tree is painted into bare winter branches, and each month paints over the last: buds, blossom, a blackbird's nest, small green fruit, the first ripe pear with a hand-lettered note of the day, falling leaves, frost. Each month has one specimen labelled by hand and one small event. In the last month the page is left unfinished, the brush lifted mid-stroke.
Style: watercolour brush: translucent strokes with dry-brush flying white, a field-journal annotation layer, colour that carries the seasons.
Mood: calm, curious, precise. About 90 seconds, warm documentary narration.`,
    `Chủ đề: một cuốn nhật ký vườn ghi suốt một năm trên cùng một tờ giấy.
Câu chuyện: một tờ giấy màu ấm, khung cố định, tên tháng ở góc. Cây lê được vẽ thành những cành trơ mùa đông, và mỗi tháng vẽ đè lên tháng trước: chồi, hoa, tổ chim sáo đen, quả xanh nhỏ, quả lê chín đầu tiên kèm dòng ghi tay về ngày ấy, lá rụng, sương giá. Mỗi tháng có một mẫu vật ghi chú tay và một sự kiện nhỏ. Tháng cuối trang giấy bỏ dở, cây cọ nhấc lên giữa nét.
Phong cách: cọ màu nước: nét trong suốt với vệt khô "phi bạch", một lớp ghi chú như sổ tay thực địa, màu sắc mang theo các mùa.
Cảm giác: bình thản, tò mò, chính xác. Khoảng 90 giây, giọng đọc tài liệu ấm áp.`),
  S("white-model", "0:40", 24,
    `Topic: how Arnhem, left in ruins by the battle of 1944, grew back decade by decade, told from the open Dutch building data.
Story: a white architectural model under gallery light. The lights go out and a projector picks out every building still standing from before the war: there is a hole in the middle. Layer by layer, faster each time, the post-war decades pop on while a year counter rolls to today, and the city crosses the Rhine. Then a level of light climbs every facade, and the tallest new tower's winter shadow runs across the old roofs.
Style: projection on a white model: projector light on plain white blocks, layers by era, year counters, real city data, every figure sourced.
Mood: sober, hopeful, impressive. About 40 seconds, short narration.`,
    `Chủ đề: Arnhem, thành phố hoang tàn sau trận đánh năm 1944, đã mọc lại từng thập kỷ thế nào, kể từ dữ liệu toà nhà mở của Hà Lan.
Câu chuyện: một mô hình kiến trúc trắng dưới ánh đèn phòng trưng bày. Đèn tắt và máy chiếu rọi lên mọi toà nhà còn đứng từ trước chiến tranh: ở giữa là một khoảng trống. Từng lớp một, mỗi lần nhanh hơn, các thập kỷ sau chiến tranh bật lên trong lúc bộ đếm năm chạy tới hôm nay, và thành phố vượt qua sông Rhine. Rồi một mức ánh sáng leo lên mọi mặt tiền, và bóng mùa đông của toà tháp mới cao nhất trải qua những mái nhà cũ.
Phong cách: chiếu hình lên mô hình trắng: ánh máy chiếu trên những khối trắng trơn, các lớp theo thời kỳ, bộ đếm năm, dữ liệu thành phố thật, mọi con số có nguồn.
Cảm giác: tỉnh táo, hy vọng, ấn tượng. Khoảng 40 giây, giọng đọc ngắn.`),
  S("whiteboard", "1:30", 24,
    `Topic: why the sky is blue and the sunset is red, and why it is the same reason.
Story: a lesson on one physical whiteboard, built as a proof. The claim is written at the top and the board fills downward step by step, each step boxed when proven: sunlight holds every colour, air scatters blue far more than red, and at sunset the long path through the air has already lost its blue. The eraser rewinds one idea to show the sky with no air: black, as on the Moon. The answer is circled twice and the pen is capped.
Style: a whiteboard explainer: dry-erase marker in real stroke order, one board and one camera, the pen leading the camera, magnets, an eraser that rewinds.
Mood: curious, clear, delightful. About 90 seconds, friendly teacher's narration.`,
    `Chủ đề: vì sao bầu trời xanh và hoàng hôn đỏ, và vì sao đó là cùng một lý do.
Câu chuyện: một bài học trên một tấm bảng trắng thật, dựng như một phép chứng minh. Mệnh đề viết ở trên cùng và bảng lấp dần xuống từng bước, mỗi bước được đóng khung khi chứng minh xong: ánh nắng chứa mọi màu, không khí tán xạ màu xanh mạnh hơn màu đỏ rất nhiều, và lúc hoàng hôn đường đi dài qua không khí đã mất hết màu xanh. Cục tẩy tua lại một ý để cho thấy bầu trời không có không khí: màu đen, như trên Mặt Trăng. Câu trả lời được khoanh hai lần và cây bút được đậy nắp.
Phong cách: giải thích trên bảng trắng: bút lông viết đúng thứ tự nét, một tấm bảng và một máy quay, cây bút dẫn máy quay, nam châm, cục tẩy để tua lại.
Cảm giác: tò mò, rõ ràng, thú vị. Khoảng 90 giây, giọng thầy cô thân thiện.`),
  S("woodcut", "1:00", 24,
    `Topic: a miner underground and his daughter at the pit-top, two blocks printed in turn.
Story: two places alternate impressions: the dark seam and the pit-head in snow. He swings the pick; she walks the road with his meal. A roof fall is one huge black print. Men dig, and their lamps carve light out of the black, cut by cut. On the last impression both blocks print on one sheet, and she finds him at the cage. The film holds on a corner of black wood the knife never reached.
Style: woodcut print: light that is carved out of black, carving as the passing of time, the mirrored block turning into the true print, snow as stab cuts, one colour plate for the lamps, told like a wordless novel.
Mood: stark, devoted, triumphant. About 60 seconds, no narration.`,
    `Chủ đề: người thợ mỏ dưới lòng đất và cô con gái trên miệng hầm, hai bản khắc in lần lượt.
Câu chuyện: hai nơi luân phiên từng bản in: vỉa than tối và miệng hầm trong tuyết. Ông vung cuốc; cô đi trên đường mang bữa ăn. Một vụ sập nóc là một bản in đen khổng lồ. Những người thợ đào, và đèn của họ khoét ánh sáng ra khỏi bóng đen, từng nhát một. Ở bản in cuối, cả hai bản khắc in trên một tờ, và cô tìm thấy ông ở thang lồng. Phim dừng ở một góc gỗ đen mà lưỡi dao chưa từng chạm tới.
Phong cách: tranh khắc gỗ: ánh sáng được khoét ra từ màu đen, nét khắc là thời gian trôi, bản khắc ngược chiều thành bản in đúng chiều, tuyết là những nhát đục, một bản màu duy nhất cho ngọn đèn, kể như một tiểu thuyết không lời.
Cảm giác: khắc khổ, tận tâm, chiến thắng. Khoảng 60 giây, không giọng đọc.`),
]);
