// The sample brief of each Lemo-Opuscar style: written for this app from the style's DEMO.md (its demo film's
// story and structure) and lightly reworded, so it reads as a brief and not as a copy of the demo: subject, the story in a few sentences,
// the style's own native powers, length, mood. The lemo workflow still makes the film differ from the demo (DIRECTOR §11: at least four
// of structure, opening, signature shot, camera path, score shape and ending). Real brands and marks in a demo (a fan film, a club, a
// games) are made fictional here (DIRECTOR §12). Credit: adapted from Lemomo (LemoLab) DEMO.md, MIT, at the pinned commit ea34ff9.
// Same shape as BRIEF_SAMPLES (briefSample.js): { fields, vi, en } plus credit; the dialog's length, aspect ratio and frame rate come from
// fields (Lemo-Opuscar's default 24 fps, or the style's own rate).

const AT = "https://github.com/lemomo-ai/lemo-opuscar/blob/ea34ff9546f675f9fd65a3c84e869a1da7471ad7/styles";
const credit = (slug) => ({ text: "Adapted from Lemomo (LemoLab) DEMO.md, MIT", link: `${AT}/${slug}/DEMO.md` });
const S = (slug, length, fps, en, vi) => [`lemo-${slug}`, { fields: { length, aspect: "16:9", fps }, vi, en, credit: credit(slug) }];

export const LEMO_BRIEF_SAMPLES = Object.fromEntries([
  S("archive-lighttable", "0:40", 24,
    `Topic: a record that was wrong by two seconds. A famous first flight was reported as 57 seconds long; the glass negatives and the archive's own catalogue say 59.
Story: a light table switches on and a loupe lands on the telegram that gave the first number; the same number turns up again in the next day's newspaper. Then the loupe finds the negative, the image turns positive inside the lens and we fall into the photograph. The film ends on the corrected number.
Style: real archive scans only, every fact sourced. Loupes, negative-to-positive turns and catalogue cards carry the story.
Mood: patient, precise, quietly triumphant. About 40 seconds, calm narration.`,
    `Chủ đề: một kỷ lục bị ghi sai hai giây. Chuyến bay đầu tiên nổi tiếng được báo là dài 57 giây; phim kính âm bản và hồ sơ của thư viện lưu trữ ghi 59.
Câu chuyện: bàn soi sáng lên, một chiếc kính lúp đặt lên bức điện tín ghi con số đầu tiên; con số ấy lặp lại trên tờ báo hôm sau. Rồi kính lúp tìm tới tấm âm bản, ảnh chuyển thành dương bản ngay trong thấu kính và ta rơi vào bức ảnh. Phim kết ở con số đã sửa.
Phong cách: chỉ dùng bản quét lưu trữ thật, mọi dữ kiện có nguồn. Kính lúp, âm bản hoá dương bản và thẻ thư mục kể chuyện.
Cảm giác: kiên nhẫn, chính xác, chiến thắng lặng lẽ. Khoảng 40 giây, giọng đọc điềm tĩnh.`),
  S("art-deco", "0:55", 24,
    `Topic: a grand hotel on New Year's Eve, 1930. A young bellboy must carry a sealed letter to the rooftop ballroom before midnight.
Story: the lift is out of order, so he races up the stairs while the band swings into a Charleston. At the stroke of twelve the music stops and the letter tumbles; when the bandleader opens it, it is the new song the whole night was waiting for. The hotel's name lights up one letter per chime.
Style: gold on black, fans and sunbursts, stepped geometry, type that is part of the architecture. The music carries the plot.
Mood: glamorous, urgent, joyful. About 55 seconds, no narration.`,
    `Chủ đề: một khách sạn sang trọng đêm giao thừa năm 1930. Một cậu bé khuân vác phải mang một lá thư niêm phong lên phòng khiêu vũ trên sân thượng trước nửa đêm.
Câu chuyện: thang máy hỏng, cậu chạy lên cầu thang trong lúc ban nhạc chuyển sang điệu Charleston. Đúng mười hai giờ nhạc dừng và lá thư rơi xuống; khi trưởng ban nhạc mở ra, đó chính là bài hát mới mà cả đêm đang chờ. Tên khách sạn sáng lên từng chữ theo mỗi tiếng chuông.
Phong cách: vàng trên nền đen, hình quạt và tia nắng, khối bậc thang, chữ là một phần của kiến trúc. Âm nhạc dẫn câu chuyện.
Cảm giác: lộng lẫy, gấp gáp, vui. Khoảng 55 giây, không giọng đọc.`),
  S("ascii-crt", "1:00", 24,
    `Topic: a machine left alone far from home, which has printed NO SIGNAL every night for decades.
Story: one night a message arrives on its old terminal. Slowly, letter by letter, it types its answer: I AM STILL HERE. The characters of that reply gather into a picture of home rising over the horizon.
Style: the whole picture is made of text characters on a green CRT, with scanlines, glow and bloom. Font size works as the camera, typing rhythm sets the cut, and one single colour change is the peak.
Mood: lonely, tender, hopeful. About 60 seconds, no voice, only the hum and the keys.`,
    `Chủ đề: một cỗ máy bị bỏ lại một mình xa nhà, đêm nào cũng in dòng NO SIGNAL suốt mấy chục năm.
Câu chuyện: một đêm, một tin nhắn tới trên chiếc màn hình cũ. Chậm rãi, từng chữ một, nó gõ câu trả lời: I AM STILL HERE. Các ký tự của câu trả lời ấy tụ lại thành hình ngôi nhà đang mọc lên trên đường chân trời.
Phong cách: cả khung hình làm bằng ký tự chữ trên màn CRT xanh lá, có vạch quét, ánh sáng loé và nhoè. Cỡ chữ là máy quay, nhịp gõ là nhịp cắt, và một lần đổi màu duy nhất là đỉnh cảm xúc.
Cảm giác: cô đơn, dịu dàng, hy vọng. Khoảng 60 giây, không giọng đọc, chỉ có tiếng ù và tiếng phím.`),
  S("backrooms", "1:00", 24,
    `Topic: the first night of a new night-shift job in an office floor that never ends.
Story: the new hire films the orientation walk on an old camcorder, following the printed rules taped to the walls and the voice on the PA. Every corridor looks like the last one. Near the end the camera's autofocus starts hunting, the tape tracking breaks up, and a rule on the wall is one he has not been told yet.
Style: first-person VHS, 4:3, mustard wallpaper, damp carpet, humming fluorescent panels. Nothing chases anyone; the dread comes from emptiness, repetition and the camera's own failures.
Mood: uneasy, quiet, a chill on the neck. About 60 seconds.`,
    `Chủ đề: đêm đầu tiên của một công việc ca đêm trong một tầng văn phòng không có điểm kết thúc.
Câu chuyện: người mới quay buổi đi làm quen bằng một chiếc máy quay cũ, làm theo các nội quy in dán trên tường và giọng nói trên loa. Hành lang nào cũng giống hành lang trước. Gần cuối, máy quay bắt đầu lấy nét lung tung, băng từ bị nhiễu, và trên tường có một nội quy anh chưa từng được dặn.
Phong cách: góc nhìn thứ nhất, băng VHS 4:3, giấy dán tường vàng mù tạt, thảm ẩm, đèn huỳnh quang kêu rè rè. Không có gì đuổi theo ai; nỗi sợ đến từ sự trống trải, lặp lại và chính chiếc máy quay trục trặc.
Cảm giác: bất an, lặng, lạnh gáy. Khoảng 60 giây.`),
  S("blueprint", "0:45", 24,
    `Topic: an inventor's patent drawing for a machine that catches clouds.
Story: the machine is drawn line by line on one blueprint sheet, exploded into its parts, then shown running perfectly, except that there are no clouds to catch. A hand revises the drawing; the revision cloud turns into a real rain cloud, it rains on the drawn garden and a flower grows.
Style: white line work on Prussian blue, drafting order, dimension lines, numbered call-outs and figure numbers as transitions. The camera reads the sheet like an eye.
Mood: clever, warm, a little whimsical. About 45 seconds, light narration.`,
    `Chủ đề: bản vẽ sáng chế của một nhà phát minh cho một cỗ máy bắt mây.
Câu chuyện: cỗ máy được vẽ từng nét trên một tờ bản vẽ xanh, tách rời thành từng bộ phận, rồi chạy hoàn hảo, chỉ có điều không có đám mây nào để bắt. Một bàn tay sửa bản vẽ; đám mây đánh dấu chỗ sửa biến thành một đám mây mưa thật, mưa rơi xuống khu vườn được vẽ và một bông hoa mọc lên.
Phong cách: nét trắng trên nền xanh Phổ, vẽ theo trình tự kỹ thuật, đường kích thước, chú thích đánh số, số hình làm chuyển cảnh. Máy quay đọc tờ bản vẽ như một con mắt.
Cảm giác: thông minh, ấm áp, hơi tinh nghịch. Khoảng 45 giây, giọng đọc nhẹ.`),
  S("brick-toy", "0:55", 24,
    `Topic: failure is only spare parts.
Story: a little brick astronaut builds a rocket on a real desk. On the first try it collapses; he sorts through the fallen pieces and rebuilds it better from the same bricks. He launches past a teapot mountain and lands on a moon made of a stack of books, with the desk lamp as the sun.
Style: plastic bricks that snap together, 12 fps stop-motion, a toy world on a real table; even flames and smoke are bricks. Open on one brick, end on one brick.
Mood: playful, determined, proud. About 55 seconds, no narration.`,
    `Chủ đề: thất bại chỉ là phụ tùng thừa.
Câu chuyện: một phi hành gia bằng gạch đồ chơi nhỏ xíu lắp một tên lửa trên một chiếc bàn thật. Lần đầu nó đổ sập; cậu nhặt lại các mảnh rơi và lắp lại tốt hơn từ chính những viên gạch ấy. Tên lửa bay qua ngọn núi là chiếc ấm trà và đáp xuống mặt trăng là một chồng sách, chiếc đèn bàn là mặt trời.
Phong cách: gạch nhựa lắp ráp, stop-motion 12 hình/giây, thế giới đồ chơi trên bàn thật; cả lửa và khói cũng là gạch. Mở đầu bằng một viên gạch, kết thúc bằng một viên gạch.
Cảm giác: vui, bền bỉ, tự hào. Khoảng 55 giây, không giọng đọc.`),
  S("briefing-board", "0:40", 24,
    `Topic: choosing a bridge for a wide river where big ships must pass underneath.
Story: the river's width snaps across the briefing wall. A simple beam bridge on many piers fails at once when the ship meets the centre pier, and a red stamp lands. The rule is written up, then four real bridge types are tested one by one on the same elevation, held still and judged; the ship itself picks the winner.
Style: an engineering briefing wall with real photographs, dimension lines, a steel ruler, stamps and held comparison frames. Every number is sourced.
Mood: clear, decisive, satisfying. About 40 seconds, crisp narration.`,
    `Chủ đề: chọn một cây cầu cho con sông rộng mà tàu lớn phải đi qua bên dưới.
Câu chuyện: bề rộng con sông bật ngang trên bức tường thuyết trình. Một cây cầu dầm đơn giản với nhiều trụ hỏng ngay khi con tàu chạm trụ giữa, một con dấu đỏ đóng xuống. Quy tắc được viết ra, rồi bốn kiểu cầu thật lần lượt được thử trên cùng một mặt đứng, dừng lại cho người xem nhìn rõ rồi mới chấm; chính con tàu chọn ra cây cầu thắng.
Phong cách: bức tường thuyết trình kỹ thuật với ảnh thật, đường kích thước, thước thép, con dấu và các khung so sánh đứng yên. Mọi con số đều có nguồn.
Cảm giác: rõ ràng, dứt khoát, thoả mãn. Khoảng 40 giây, giọng đọc gọn.`),
  S("caption-news", "1:00", 24,
    `Topic: a year when beekeepers lost over a million colonies, yet the total number of colonies went up.
Story: the biggest number lands in the first seconds over rows of hives. A freeze frame asks the viewer's question in silence. Then the report's own headline turns it around, and a two-column ledger of lost and rebuilt hives explains how. It ends on what is driving the losses.
Style: a social news short that works with the sound off: bold captions on real footage and photos, highlighted quotes, counters and a held verdict frame. Every claim is sourced.
Mood: urgent, then surprising, then clear. About 60 seconds, captions first, light narration.`,
    `Chủ đề: một năm người nuôi ong mất hơn một triệu đàn, vậy mà tổng số đàn lại tăng.
Câu chuyện: con số lớn nhất hiện ra ngay trong mấy giây đầu trên những dãy tổ ong. Một khung hình đứng yên đặt câu hỏi của người xem trong im lặng. Rồi chính tiêu đề của bản báo cáo lật ngược vấn đề, và một bảng hai cột (đàn mất và đàn gây lại) giải thích vì sao. Phim kết ở nguyên nhân gây ra những mất mát.
Phong cách: tin ngắn cho mạng xã hội, xem không cần bật tiếng: phụ đề đậm trên cảnh quay và ảnh thật, trích dẫn được tô sáng, bộ đếm số và một khung kết luận đứng yên. Mọi dữ kiện có nguồn.
Cảm giác: gấp, rồi bất ngờ, rồi sáng tỏ. Khoảng 60 giây, chữ là chính, giọng đọc nhẹ.`),
  S("cel-anime-80s", "1:00", 24,
    `Topic: a delivery against the sunrise.
Story: after the rain, a young courier on a white motorbike must cross a neon city to bring a forgotten cassette to the launch pad before a dawn rocket launch. A joyful montage of speed, then a drawbridge starts to rise; she jumps it, and the frame freezes at the peak. The tape plays on board, the song becomes the score, and night turns into dawn.
Style: hand-painted cels, flat shadows, neon reflections on wet streets, speed lines, a held key frame at the climax, soft VHS colour.
Mood: nostalgic, hopeful, rushing. About 60 seconds, music-led, no narration.`,
    `Chủ đề: một chuyến giao hàng chạy đua với bình minh.
Câu chuyện: sau cơn mưa, một cô gái giao hàng đi xe máy trắng phải băng qua thành phố đèn neon để mang một cuộn băng cassette bị bỏ quên tới bệ phóng trước khi tên lửa phóng lúc rạng sáng. Một đoạn tốc độ đầy hứng khởi, rồi cây cầu cất bắt đầu nâng lên; cô phóng qua, và khung hình đứng lại ở đỉnh cú nhảy. Cuộn băng được bật trên tàu, bài hát trở thành nhạc nền, và đêm chuyển sang bình minh.
Phong cách: tranh cel vẽ tay, bóng phẳng, ánh neon phản chiếu trên đường ướt, đường tốc độ, một khung giữ ở cao trào, màu VHS mềm.
Cảm giác: hoài niệm, hy vọng, hối hả. Khoảng 60 giây, dẫn bằng nhạc, không giọng đọc.`),
  S("chalkboard", "0:50", 30,
    `Topic: a word everyone "knows" the meaning of, and the real story of where it came from.
Story: a freshly wiped classroom board; a pupil has left a question in the corner in yellow chalk. The board writes the popular explanation, part by part, and it sounds convincing. Then one wipe takes it away, and the same spot is written again from the oldest form of the word to today, one stroke tracked in orange. After a held beat the answer goes under the pupil's question.
Style: chalk on a dark green board: strokes that dry, a second hand for the pupil, write, wipe and rewrite in the same place, a sliding panel that reveals the back board, chalk used as a ruler.
Mood: curious, patient, a small "aha". About 50 seconds, a teacher's calm narration with subtitles.`,
    `Chủ đề: một từ ai cũng tưởng biết nghĩa, và câu chuyện thật về nguồn gốc của nó.
Câu chuyện: một tấm bảng lớp học vừa lau; một học trò để lại câu hỏi ở góc bảng bằng phấn vàng. Bảng viết ra lời giải thích phổ biến, từng phần một, nghe rất thuyết phục. Rồi một lần lau xoá sạch, và đúng chỗ ấy được viết lại từ dạng cổ nhất của chữ cho tới hôm nay, một nét được tô cam để theo dõi. Sau một nhịp dừng, câu trả lời được viết dưới câu hỏi của học trò.
Phong cách: phấn trên bảng xanh thẫm: nét phấn khô dần, nét chữ thứ hai cho học trò, viết, lau rồi viết lại đúng chỗ cũ, một tấm bảng trượt mở ra bảng phía sau, phấn dùng như cây thước.
Cảm giác: tò mò, kiên nhẫn, một khoảnh khắc "à ra thế". Khoảng 50 giây, giọng thầy cô điềm tĩnh, có phụ đề.`),
  S("circuit-board", "1:00", 30,
    `Topic: how electricity made at a dam far away reaches a phone charger in a city in a few thousandths of a second.
Story: water turns the turbines and the flow becomes current. Ordinary power swings back and forth, and sent that far it would leak away, so a station turns it into one-way current; it races across the country in milliseconds, is turned back, stepped down level by level and reaches a wall socket. The camera plunges through the socket into a charger, where a tiny part does the same job as the giant station.
Style: the story drawn as a printed circuit board seen from above: current running along the traces, the map as a board, alternating and direct current told by the shape of the light, a closing pull-out that shows boards inside boards.
Mood: clear, fast, quietly amazed. About 60 seconds, friendly narration with subtitles.`,
    `Chủ đề: điện làm ra ở một con đập rất xa tới cục sạc điện thoại trong thành phố chỉ trong vài phần nghìn giây.
Câu chuyện: nước quay tua-bin và dòng chảy thành dòng điện. Điện thường đổi chiều qua lại, đi xa như thế sẽ hao hụt dọc đường, nên một trạm biến nó thành dòng một chiều; nó lao qua cả đất nước trong vài mili giây, được đổi lại, hạ áp từng cấp và tới ổ cắm trên tường. Máy quay lao qua ổ cắm vào trong cục sạc, nơi một linh kiện tí hon làm đúng việc của trạm khổng lồ.
Phong cách: câu chuyện vẽ thành một bảng mạch in nhìn từ trên xuống: dòng điện chạy dọc các đường mạch, bản đồ là một bảng mạch, xoay chiều và một chiều kể bằng hình dạng của ánh sáng, cú kéo lùi cuối phim cho thấy bảng mạch nằm trong bảng mạch.
Cảm giác: rõ ràng, nhanh, ngạc nhiên lặng lẽ. Khoảng 60 giây, giọng đọc thân thiện, có phụ đề.`),
  S("city-symphony", "0:50", 24,
    `Topic: one day in a big city, from orbit to night.
Story: from space the city is a grid of orange light; the film falls into it and watches it wake. One window turns night to dawn in two seconds, a station clock cuts to a bigger clock, a crowd becomes trails of light. At noon the screen splits into a grid that fills on the beat, then everything stops for one slow moment, and an old film of the same bridge plays beside today.
Style: time-lapse and archive footage cut to a strict musical grid, split screens, light trails, old and new side by side. Real material, credited.
Mood: rhythmic, grand, a little nostalgic. About 50 seconds, music only.`,
    `Chủ đề: một ngày của một thành phố lớn, từ quỹ đạo tới đêm.
Câu chuyện: từ không gian, thành phố là một lưới ánh sáng cam; phim rơi xuống và nhìn nó thức dậy. Một ô cửa sổ chuyển từ đêm sang bình minh trong hai giây, một chiếc đồng hồ nhà ga cắt sang một chiếc đồng hồ lớn hơn, một đám đông biến thành những vệt sáng. Giữa trưa màn hình chia thành lưới, lấp đầy theo nhịp, rồi mọi thứ dừng lại một khoảnh khắc chậm, và một thước phim cũ về cùng cây cầu chiếu cạnh hình ảnh hôm nay.
Phong cách: tua nhanh thời gian và tư liệu cũ cắt theo một lưới nhịp nhạc chặt chẽ, chia màn hình, vệt sáng, xưa và nay cạnh nhau. Tư liệu thật, ghi nguồn.
Cảm giác: nhịp nhàng, hoành tráng, hơi hoài niệm. Khoảng 50 giây, chỉ có nhạc.`),
  S("countdown", "1:00", 24,
    `Topic: the last minute before a crewed rocket launch, told in real time.
Story: the count passes from the ground to the rocket, which counts itself down; a single cell of the pad opens into a grid of nine views (control room, crew, engines, crowd). At ignition every cell merges into one, then opens again for what follows. Control is handed over three times, each heard in the original audio.
Style: a live split-screen countdown with a big clock header, a control strip that tracks who is in charge, and real public-domain footage and audio.
Mood: tense, precise, then elated. About 60 seconds, the mission's own voices.`,
    `Chủ đề: phút cuối cùng trước một lần phóng tên lửa có người lái, kể đúng thời gian thực.
Câu chuyện: việc đếm ngược được chuyển từ mặt đất sang tên lửa, rồi tên lửa tự đếm; một ô hình bệ phóng mở ra thành lưới chín góc nhìn (phòng điều khiển, phi hành đoàn, động cơ, đám đông). Lúc đánh lửa mọi ô gộp lại thành một, rồi lại mở ra cho những gì tiếp theo. Quyền điều khiển được trao ba lần, lần nào cũng nghe bằng âm thanh gốc.
Phong cách: màn hình chia ô đếm ngược trực tiếp với đồng hồ lớn ở đầu khung, một dải cho biết ai đang điều khiển, và cảnh quay, âm thanh thật thuộc phạm vi công cộng.
Cảm giác: căng, chính xác, rồi vỡ oà. Khoảng 60 giây, dùng chính giọng của nhiệm vụ.`),
  S("crayon-book", "0:50", 24,
    `Topic: a bedtime story about the moon, who cannot fall asleep.
Story: the moon tries counting sheep and fails. A little girl at a lit window sees her, climbs a ladder that draws itself rung by rung, and sings to her. A sweep of watercolour reveals stars that were drawn in white crayon on the page all along. The moon is tucked in under a quilt, and the page turns to "The End".
Style: crayon and wax on paper, drawn live as we watch, child logic, colouring as an action; the wax-resist reveal is the peak. It is a book on a table.
Mood: soft, sleepy, warm. About 50 seconds, gentle narration.`,
    `Chủ đề: chuyện kể trước giờ ngủ về mặt trăng không ngủ được.
Câu chuyện: mặt trăng thử đếm cừu mà không được. Một cô bé ở ô cửa sổ sáng đèn nhìn thấy, trèo lên một chiếc thang tự vẽ ra từng bậc, và hát ru cho mặt trăng. Một vệt màu nước quét qua làm hiện ra những ngôi sao vẫn được vẽ bằng sáp trắng trên trang giấy từ đầu. Mặt trăng được đắp chăn, và trang sách lật tới chữ "The End".
Phong cách: bút sáp màu trên giấy, vẽ ngay trước mắt người xem, logic của trẻ con, tô màu là một hành động; lớp sáp đẩy màu nước là cao trào. Đó là một cuốn sách đặt trên bàn.
Cảm giác: mềm, buồn ngủ, ấm. Khoảng 50 giây, giọng kể nhẹ nhàng.`),
  S("dark-keynote", "0:40", 24,
    `Topic: a launch film for a fictional app that tidies your desktop, photos and inbox in one press.
Story: a screen drowning in hundreds of windows; one small cursor is the only thing alive. It finds the button, presses once, and everything snaps back into a clean grid. Three short feature beats follow, each with one rolling number, then the product name on a dark stage.
Style: a dark keynote stage with soft light, UI generated without limit, a snap grid, screens that pause, numbers that roll out of glyph noise.
Mood: calm, premium, confident. About 40 seconds, a few big words, no narration.`,
    `Chủ đề: phim ra mắt cho một ứng dụng hư cấu dọn gọn màn hình, ảnh và hộp thư chỉ với một lần bấm.
Câu chuyện: một màn hình ngập trong hàng trăm cửa sổ; một con trỏ nhỏ là thứ duy nhất còn sống. Nó tìm tới nút bấm, nhấn một lần, và mọi thứ bật về một lưới gọn gàng. Tiếp theo là ba nhịp tính năng ngắn, mỗi nhịp một con số chạy, rồi tên sản phẩm trên sân khấu tối.
Phong cách: sân khấu keynote tối với ánh sáng mềm, giao diện sinh ra không giới hạn, lưới hút, màn hình có thể dừng lại, con số hiện ra từ nhiễu ký tự.
Cảm giác: điềm tĩnh, cao cấp, tự tin. Khoảng 40 giây, vài chữ lớn, không giọng đọc.`),
  S("data-physical", "0:40", 24,
    `Topic: the year solar power overtook wind, told as objects you could hold.
Story: each year's wind and solar capacity is a stack of real plates on a walnut dial, side by side. Year after year the pairs grow as the camera tracks along a spiral; the turn comes when solar's stack passes wind's and the frame holds still. In the last year new plates are fed in one by one while a counter rolls, and the crane pulls back to show both spirals whole.
Style: data made physical: plates, brass, wood, macro detail, a held judgement frame, every number from a public dataset.
Mood: measured, tactile, quietly dramatic. About 40 seconds, short narration.`,
    `Chủ đề: năm điện mặt trời vượt điện gió, kể bằng những vật có thể cầm trên tay.
Câu chuyện: công suất gió và mặt trời của mỗi năm là một chồng đĩa thật trên một mặt số bằng gỗ óc chó, đặt cạnh nhau. Năm này qua năm khác các cặp chồng đĩa cao dần trong lúc máy quay đi theo một vòng xoắn; bước ngoặt đến khi chồng của mặt trời vượt chồng của gió và khung hình đứng yên. Ở năm cuối, các đĩa mới được đưa vào từng chiếc trong lúc bộ đếm chạy, rồi máy quay cẩu kéo lùi cho thấy trọn hai vòng xoắn.
Phong cách: dữ liệu thành vật thể: đĩa, đồng thau, gỗ, cận cảnh, một khung kết luận đứng yên, mọi con số từ bộ dữ liệu công khai.
Cảm giác: chừng mực, chạm được, kịch tính lặng lẽ. Khoảng 40 giây, giọng đọc ngắn.`),
  S("dataviz", "0:50", 24,
    `Topic: a hundred years of summer temperatures in one place.
Story: the film opens cold on a single data point. Early years arrive slowly, then steadily; then the points come faster and the pencil hurries. Just before the last value everything stops: the only cut in the film, into silence. The last point lands alone, then the whole series in one view, and it morphs into warming stripes, ending on an empty cell: next summer?
Style: the chart tells the story: dots, a line, a hand-held pencil, stripes. One cut, one colour flip at the peak, numbers that are true.
Mood: calm, then alarming, then reflective. About 50 seconds, sparse narration.`,
    `Chủ đề: một trăm năm nhiệt độ mùa hè ở một nơi.
Câu chuyện: phim mở đầu lạnh với một điểm dữ liệu duy nhất. Những năm đầu đến chậm, rồi đều đặn; rồi các điểm đến nhanh hơn và cây bút chì vội vã. Ngay trước giá trị cuối mọi thứ dừng lại: cú cắt duy nhất của phim, vào im lặng. Điểm cuối cùng hiện một mình, rồi cả chuỗi trong một khung, và chuyển thành những sọc màu nóng dần, kết ở một ô trống: mùa hè tới?
Phong cách: biểu đồ tự kể chuyện: chấm, đường, một cây bút chì cầm tay, sọc màu. Một cú cắt, một lần đổi màu ở cao trào, con số đúng sự thật.
Cảm giác: bình thản, rồi báo động, rồi suy ngẫm. Khoảng 50 giây, giọng đọc thưa.`),
  S("desktop-flythrough", "1:00", 30,
    `Topic: what happens to a photo between "send" and the friend's phone chiming.
Story: you send a friend a photo of your dog and their phone chimes at once, but the photo did not fly straight there. The film rewinds that instant and follows it: the app shrinks it, it waits on a server, the server sends a notification, and the friend's phone fetches it, blurry first on a slow connection, then sharp. The ending: unless you chose to send the original, your friend has a smaller copy; the original never left your phone.
Style: app cards standing on a sunlit desk, one camera flying after what moves between them; the hero is the photo itself as a small voxel toy that hops the whole route; titles are objects on the desk.
Mood: playful, curious, clear. About 60 seconds, narration with subtitles.`,
    `Chủ đề: điều gì xảy ra với một tấm ảnh từ lúc bấm "gửi" tới khi điện thoại người bạn kêu "ting".
Câu chuyện: bạn gửi cho một người bạn ảnh chú chó của mình và điện thoại của họ kêu ngay lập tức, nhưng tấm ảnh không bay thẳng tới đó. Phim tua lại khoảnh khắc ấy và đi theo nó: ứng dụng thu nhỏ ảnh, ảnh chờ trên một máy chủ, máy chủ gửi thông báo, và điện thoại người bạn tải ảnh về, trên mạng chậm thì mờ trước rồi mới nét. Kết phim: trừ khi bạn chọn gửi ảnh gốc, bạn bè chỉ nhận một bản nhỏ hơn; ảnh gốc chưa bao giờ rời điện thoại của bạn.
Phong cách: các thẻ ứng dụng đứng trên một mặt bàn đầy nắng, một máy quay bay theo thứ di chuyển giữa chúng; nhân vật chính là chính tấm ảnh, thành một món đồ chơi khối voxel nhỏ nhảy suốt chặng đường; tiêu đề là đồ vật trên bàn.
Cảm giác: vui, tò mò, rõ ràng. Khoảng 60 giây, có giọng đọc và phụ đề.`),
  S("engraving", "0:40", 24,
    `Topic: a museum label for the screen beside a case: one object and three things you did not know about it.
Story: the first frame is a burin cutting copper, a curl of metal rising ahead of the point. The plate is proofed and the whole engraving appears; three magnified details fly out to their slots, each with one fact. After a breath of silence, hand colouring washes in, and the label ends with where to see the real thing in the museum.
Style: copperplate engraving: cross-hatching, burin lines, the press, plate marks and a tissue guard. Information arrives in museum-label order.
Mood: scholarly, precise, gently wondrous. About 40 seconds, short captions.`,
    `Chủ đề: một tấm nhãn bảo tàng cho màn hình đặt cạnh tủ trưng bày: một hiện vật và ba điều bạn chưa biết về nó.
Câu chuyện: khung hình đầu tiên là mũi khắc cắt vào tấm đồng, một sợi kim loại cuộn lên phía trước. Tấm bản được in thử và cả bức khắc hiện ra; ba chi tiết phóng to bay về chỗ của mình, mỗi chi tiết một dữ kiện. Sau một nhịp im lặng, màu tô tay loang vào, và tấm nhãn kết bằng nơi xem hiện vật thật trong bảo tàng.
Phong cách: tranh khắc bản đồng: nét đan chéo, nét mũi khắc, máy in, vết mép bản và tờ giấy lụa che. Thông tin đến theo thứ tự của một tấm nhãn bảo tàng.
Cảm giác: uyên bác, chính xác, nhẹ nhàng kỳ thú. Khoảng 40 giây, chú thích ngắn.`),
  S("game-show", "1:30", 30,
    `Topic: thirty years of a technology's history, staged as a rhythm game show.
Story: the cast drops onto the set on the beat and counts in. Then comes a run of levels: each level is a title card with a name and years, then eight bars of play where a pattern is set up, answered and judged with a slam and "Perfect!". Near the end a remix level piles every recent event onto one stage, and a report card closes the show.
Style: flat game-show graphics, call-and-response, judgement words, stats as game UI, thumbnails of finished levels. Fictional host and cast.
Mood: loud, fun, fast. About 90 seconds, a show host's shouts.`,
    `Chủ đề: ba mươi năm lịch sử của một công nghệ, dựng thành một gameshow theo nhịp.
Câu chuyện: dàn nhân vật rơi xuống sân khấu đúng nhịp và đếm vào. Rồi tới một chuỗi màn chơi: mỗi màn là một thẻ tiêu đề có tên và năm, rồi tám ô nhịp chơi, trong đó một mẫu nhịp được đặt ra, được đáp lại và được chấm bằng một cú đập kèm chữ "Perfect!". Gần cuối, một màn remix dồn mọi sự kiện gần đây lên một sân khấu, và một bảng điểm khép lại chương trình.
Phong cách: đồ hoạ gameshow phẳng, hỏi đáp theo nhịp, chữ chấm điểm, số liệu như giao diện trò chơi, ảnh thu nhỏ các màn đã qua. Người dẫn và nhân vật hư cấu.
Cảm giác: ồn, vui, nhanh. Khoảng 90 giây, tiếng hô của người dẫn chương trình.`),
  S("glass-product", "0:30", 24,
    `Topic: a fictional pair of glass earbuds in a pebble-shaped glass case.
Story: in the dark the product only reflects other light: a mystery. The case opens, the buds lift out and turn in strip-light sweeps. On the bass drop they snap back together and light up from inside: sound becomes light running through the glass. The name and one line close it.
Style: a glass product render: caustics, refraction, strip lights, slow macro moves, one inner glow. The invisible thing made visible.
Mood: pure, premium, intimate. About 30 seconds, no narration.`,
    `Chủ đề: một đôi tai nghe bằng thuỷ tinh hư cấu trong hộp kính hình viên sỏi.
Câu chuyện: trong bóng tối sản phẩm chỉ phản chiếu ánh sáng khác: một điều bí ẩn. Hộp mở, hai chiếc tai nghe nhấc lên và xoay trong những vệt đèn dài quét qua. Đúng lúc tiếng bass dội xuống, chúng gắn lại với nhau và sáng lên từ bên trong: âm thanh thành ánh sáng chạy trong lớp kính. Tên sản phẩm và một câu khép lại.
Phong cách: render sản phẩm thuỷ tinh: vệt sáng hội tụ, khúc xạ, đèn dải, cận cảnh chậm, một nguồn sáng bên trong. Thứ vô hình được nhìn thấy.
Cảm giác: tinh khiết, cao cấp, gần gũi. Khoảng 30 giây, không giọng đọc.`),
  S("halftone-dossier", "0:30", 24,
    `Topic: a mock investigation into a very round orange cat.
Story: a case file opens with the accusation, then the suspect's mugshot against a height chart. Count one: testing gravity with a cup. Count two: parkour at four in the morning. Count three: a sandwich that disappeared. "In summary", the verdict stamp comes down: not guilty, because he is adorable. Case closed.
Style: a retro halftone dossier: case numbers, stamps, exhibit cards, red marker; dot density shows emotion. One idea and one gag per card.
Mood: deadpan, silly, affectionate. About 30 seconds, captions and a stern narrator.`,
    `Chủ đề: một cuộc điều tra giả về một chú mèo cam rất tròn.
Câu chuyện: một hồ sơ vụ án mở ra với lời buộc tội, rồi ảnh nghi phạm đứng cạnh thước đo chiều cao. Tội danh một: thử trọng lực bằng một chiếc cốc. Tội danh hai: chạy nhảy lúc bốn giờ sáng. Tội danh ba: một chiếc bánh mì biến mất. "Tóm lại", con dấu phán quyết đóng xuống: vô tội, vì quá đáng yêu. Đóng hồ sơ.
Phong cách: hồ sơ điểm lưới kiểu cũ: số hồ sơ, con dấu, thẻ tang vật, bút đỏ; mật độ chấm thể hiện cảm xúc. Mỗi thẻ một ý và một câu đùa.
Cảm giác: tỉnh bơ, ngớ ngẩn, trìu mến. Khoảng 30 giây, chữ và một giọng đọc nghiêm.`),
  S("hd-2d", "1:15", 60,
    `Topic: the last light of a lighthouse.
Story: a harbour town's lighthouse goes dark. The old keeper hands the last flame to his granddaughter, who carries her lantern through a night forest and up a storm-beaten cliff stair. She relights the lamp at the top, and out at sea the ships find their way home. Tagline: every path begins with a single light.
Style: pixel sprites in a small 3D tabletop world, with depth of field, bloom and tilt-shift. The light the hero carries is the main light source. RPG grammar: map moves, a dialog box, a save point.
Mood: brave, cosy, epic in miniature. About 75 seconds, short dialog boxes, no voice.`,
    `Chủ đề: ánh sáng cuối cùng của một ngọn hải đăng.
Câu chuyện: ngọn hải đăng của một thị trấn cảng tắt. Người gác già trao ngọn lửa cuối cùng cho cô cháu gái, cô mang chiếc đèn lồng qua khu rừng đêm và lên những bậc đá trên vách núi giữa bão. Cô thắp lại đèn trên đỉnh, và ngoài khơi những con tàu tìm được đường về. Khẩu hiệu: mọi con đường bắt đầu từ một ngọn đèn.
Phong cách: nhân vật pixel trong một thế giới 3D nhỏ như trên mặt bàn, có độ sâu trường ảnh, ánh sáng loé và hiệu ứng tilt-shift. Ánh sáng nhân vật mang theo là nguồn sáng chính. Ngữ pháp game RPG: đi trên bản đồ, hộp thoại, điểm lưu game.
Cảm giác: dũng cảm, ấm cúng, sử thi thu nhỏ. Khoảng 75 giây, hộp thoại ngắn, không giọng đọc.`),
  S("hologram-hud", "0:40", 24,
    `Topic: the spec walkthrough of a fictional city e-bike.
Story: the bike is scanned into a glowing wireframe. Three parts are locked one at a time: the battery, the motor and the brakes. Each one is explored with a camera move and a small exploded view, then given its value, which docks in a side rail. At the end the wireframe lights up into a solid hologram and settles into a spec sheet you could print as a poster.
Style: a sci-fi hologram HUD: target boxes, leaders, scan lines, cyan glow, values held long enough to read.
Mood: precise, futuristic, confident. About 40 seconds, no narration, a pulsing score.`,
    `Chủ đề: phần giới thiệu thông số của một chiếc xe đạp điện thành phố hư cấu.
Câu chuyện: chiếc xe được quét thành một khung dây phát sáng. Ba bộ phận lần lượt được khoá mục tiêu: pin, động cơ và phanh. Mỗi bộ phận được xem kỹ bằng một chuyển động máy quay và một hình tách rời nhỏ, rồi hiện giá trị của nó, giá trị ấy bay vào một cột bên cạnh. Cuối cùng khung dây sáng lên thành một hologram đặc và đứng lại thành một bảng thông số in làm poster được.
Phong cách: giao diện hologram khoa học viễn tưởng: khung ngắm, đường dẫn, vạch quét, ánh xanh lơ, giá trị đứng đủ lâu để đọc.
Cảm giác: chính xác, tương lai, tự tin. Khoảng 40 giây, không giọng đọc, nhạc nhịp đập.`),
  S("impasto", "0:40", 24,
    `Topic: one touch of colour in a grey city.
Story: a square in the rain, all grey. A street violinist plays and nobody stops; halfway through, he gives up. A small boy opens a red umbrella in front of him: the film's first colour. The music starts again as a waltz, and umbrella after umbrella turns to colour on the beat; from above, the crowd paints a mandala on the cobbles. The rain stops and colour fills the square.
Style: thick oil paint, palette-knife strokes, visible texture, light that is painted rather than lit. The overhead shot is the peak.
Mood: lonely, then tender, then overflowing. About 40 seconds, music only.`,
    `Chủ đề: một chạm màu giữa thành phố xám.
Câu chuyện: một quảng trường trong mưa, toàn màu xám. Một nghệ sĩ violin đường phố chơi đàn mà không ai dừng lại; được nửa bài, anh bỏ cuộc. Một cậu bé mở chiếc ô đỏ trước mặt anh: màu đầu tiên của phim. Tiếng đàn vang lên lại thành một điệu valse, và từng chiếc ô một hoá màu theo nhịp; nhìn từ trên cao, đám đông vẽ một hình mandala trên nền đá. Mưa tạnh và màu lấp đầy quảng trường.
Phong cách: sơn dầu dày, nét dao vẽ, chất liệu thấy rõ, ánh sáng được vẽ chứ không được chiếu. Cảnh nhìn từ trên cao là cao trào.
Cảm giác: cô đơn, rồi dịu dàng, rồi tràn đầy. Khoảng 40 giây, chỉ có nhạc.`),
  S("ink-wash", "0:50", 24,
    `Topic: a swordsman and a river.
Story: from emptiness a drop of ink becomes a small figure in a vast landscape. He runs lightly across the water. A towering wave rises, drawn as a mass of wet ink; there is silence, then one decisive stroke splits it, and the stroke is also a character written in the air. The camera pulls back: the figure is a tiny mark in a whole painting, and a red seal lands.
Style: Chinese ink wash: wet and dry brush, empty space, one stroke as the event, a red seal at the end.
Mood: still, then sudden, then serene. About 50 seconds, a closing line of poetry.`,
    `Chủ đề: một kiếm khách và một dòng sông.
Câu chuyện: từ khoảng trống, một giọt mực thành một bóng người nhỏ giữa cảnh núi sông bao la. Anh chạy nhẹ tênh trên mặt nước. Một con sóng cao ngất dâng lên, vẽ bằng một khối mực ướt; im lặng, rồi một nét dứt khoát chẻ đôi con sóng, và nét ấy cũng là một chữ viết vào không trung. Máy quay lùi ra: bóng người chỉ là một chấm nhỏ trong cả bức tranh, và một con dấu đỏ đóng xuống.
Phong cách: tranh thuỷ mặc Trung Hoa: bút ướt và bút khô, khoảng trống, một nét là sự kiện, con dấu đỏ ở cuối.
Cảm giác: tĩnh, rồi đột ngột, rồi thanh thản. Khoảng 50 giây, một câu thơ ở cuối.`),
  S("iso-infographic", "1:00", 24,
    `Topic: the journey of a bar of chocolate, from the cocoa farm to your hands.
Story: the whole film is one isometric map, a diorama board; each step of the process is a station on it, joined by a dashed route line. The camera rides the route without a single cut: picking, fermenting, drying, shipping, roasting, wrapping. Each station gets one action, one label and one number built from small icons. At the end the camera pulls back to show the whole board.
Style: flat true isometric, no outlines, three tones per face, cutaways, isotype numbers, focus plus context.
Mood: clear, friendly, satisfying. About 60 seconds, warm narration.`,
    `Chủ đề: hành trình của một thanh sô-cô-la, từ trang trại ca cao tới tay bạn.
Câu chuyện: cả phim là một bản đồ isometric, một sa bàn; mỗi bước của quy trình là một trạm trên đó, nối với nhau bằng một đường đứt nét. Máy quay đi theo đường ấy không một lần cắt: hái, ủ, phơi, vận chuyển, rang, đóng gói. Mỗi trạm có một hành động, một nhãn và một con số dựng bằng biểu tượng nhỏ. Cuối phim máy quay lùi ra cho thấy cả sa bàn.
Phong cách: isometric phẳng đúng chuẩn, không viền, mỗi mặt ba sắc độ, hình cắt, con số bằng biểu tượng, cận cảnh trong bối cảnh.
Cảm giác: rõ ràng, thân thiện, thoả mãn. Khoảng 60 giây, giọng đọc ấm.`),
  S("isometric-picture-book", "1:00", 30,
    `Topic: why the queue at a museum cloakroom takes so long, and an order that halves it.
Story: visitors are called in by ticket number, yet the line barely moves. The film shows why: there is one narrow counter, one person searching for a coat token stops everyone behind, and everyone called wants the same few hooks. Then a different order: coats on the far rails first, each person one rail apart from the next, and six people are served at once. The two times stand side by side at the end.
Style: a clean isometric world where the order things move in explains the idea: words and numbers printed on the floor, people standing up like dominoes, lids lifted off rooms, arrows and lights that show the order, bars on the ground.
Mood: tidy, clever, satisfying. About 60 seconds, calm narration with subtitles.`,
    `Chủ đề: vì sao hàng chờ ở quầy gửi áo khoác bảo tàng lâu đến vậy, và một thứ tự giúp rút ngắn một nửa.
Câu chuyện: khách được gọi theo số vé, vậy mà hàng gần như đứng yên. Phim cho thấy lý do: chỉ có một quầy hẹp, một người loay hoay tìm thẻ gửi đồ làm cả hàng phía sau phải chờ, và ai được gọi cũng cần đúng mấy cái móc ấy. Rồi một thứ tự khác: áo ở các giá xa treo trước, mỗi người cách người kế tiếp một giá, và sáu người được phục vụ cùng lúc. Cuối phim hai thời gian đứng cạnh nhau.
Phong cách: một thế giới isometric gọn gàng, nơi thứ tự mọi thứ chuyển động giải thích ý tưởng: chữ và số in trên sàn, người đứng dậy như quân domino, nắp phòng được nhấc lên, mũi tên và đèn chỉ thứ tự, cột số dựng trên mặt đất.
Cảm giác: ngăn nắp, thông minh, thoả mãn. Khoảng 60 giây, giọng đọc điềm tĩnh, có phụ đề.`),
  S("kino-montage", "1:00", 24,
    `Topic: who really built a famous skyscraper. The company's own brochure credits the builders in one line; the site footage and the photographs answer.
Story: a title on a red girder over a worker riding a beam into the sky. The brochure's map, the site circled in red, opens onto the excavation. The machine: derricks fill a grid, the frame rises in split strips, floors a week, hours from mill to rivet. The turn: "the men who did the job", circled. Faces, then thousands a day, and the tower is finished.
Style: constructivist montage: red and black, diagonals, rhythmic cuts, typography that shouts, real archive footage and photos, credited.
Mood: heroic, rhythmic, proud. About 60 seconds, captions over a driving score.`,
    `Chủ đề: ai thực sự đã xây một toà nhà chọc trời nổi tiếng. Tập quảng cáo của chính công ty chỉ nhắc người thợ trong một dòng; thước phim công trường và những bức ảnh trả lời.
Câu chuyện: tựa phim trên một thanh dầm đỏ, phía trên một người thợ đu theo thanh dầm lên trời. Bản đồ trong tập quảng cáo, khu đất khoanh đỏ, mở ra hố móng. Cỗ máy: những cần cẩu lấp đầy một lưới, khung thép mọc lên trong các dải chia màn hình, số tầng mỗi tuần, số giờ từ nhà máy tới đinh tán. Bước ngoặt: dòng chữ "những người đã làm nên việc này", được khoanh lại. Những gương mặt, rồi hàng nghìn người mỗi ngày, và toà tháp hoàn thành.
Phong cách: dựng phim kiểu kiến tạo: đỏ và đen, đường chéo, cắt theo nhịp, chữ hô to, tư liệu phim và ảnh thật, ghi nguồn.
Cảm giác: anh hùng, nhịp nhàng, tự hào. Khoảng 60 giây, chữ trên nền nhạc thúc giục.`),
  S("lidar-survey", "0:40", 24,
    `Topic: from the air it is only forest; under the trees the ground still remembers old fields.
Story: an aerial photo of nothing but canopy. A scan line turns it into a laser point cloud. A horizontal plane steps down through the trees on the beat, and every return above it lifts away and glows. Near-silence over the bare ground, then a second scan turns it into a raking-lit surface, and long-lost stone walls light up one after another.
Style: a LiDAR survey: point clouds, scan lines, height rulers, raking light, real public survey data, every figure sourced.
Mood: quiet, revealing, a little haunting. About 40 seconds, short narration.`,
    `Chủ đề: nhìn từ trên không chỉ thấy rừng; dưới tán cây, mặt đất vẫn còn nhớ những cánh đồng xưa.
Câu chuyện: một bức ảnh chụp từ trên không, chỉ toàn tán lá. Một vạch quét biến nó thành một đám mây điểm laser. Một mặt phẳng nằm ngang hạ dần xuyên qua cây theo nhịp, mọi điểm phía trên nó nhấc lên và phát sáng. Gần như im lặng trên nền đất trống, rồi lần quét thứ hai biến nó thành một bề mặt được chiếu sáng xiên, và những bức tường đá bị lãng quên lần lượt sáng lên.
Phong cách: khảo sát LiDAR: đám mây điểm, vạch quét, thước đo độ cao, ánh sáng xiên, dữ liệu khảo sát công khai thật, mọi con số có nguồn.
Cảm giác: lặng, hé lộ, hơi ám ảnh. Khoảng 40 giây, giọng đọc ngắn.`),
  S("living-screencast", "1:00", 24,
    `Topic: a feature tour of a fictional writing app, led by its little pixel mascot.
Story: the mascot climbs out of the app icon and moves into the app window, then acts out four features in four chapters: just say what you want, plan before changing anything, review the changes line by line, check its own work. Each chapter shows cause and effect on the real interface. A slogan closes it.
Style: a living screencast: the real UI redrawn crisply, a recording-software camera that zooms and pans, a sacred pixel grid, the mascot walking on the top edges of windows, information in layers.
Mood: friendly, clear, a little cheeky. About 60 seconds, short captions.`,
    `Chủ đề: chuyến tham quan tính năng của một ứng dụng viết hư cấu, do linh vật pixel nhỏ của nó dẫn đường.
Câu chuyện: linh vật trèo ra khỏi biểu tượng ứng dụng và dọn vào cửa sổ ứng dụng, rồi diễn bốn tính năng trong bốn chương: cứ nói điều bạn muốn, lên kế hoạch trước khi đổi gì, xem lại thay đổi từng dòng, tự kiểm tra việc mình làm. Mỗi chương cho thấy nguyên nhân và kết quả trên giao diện thật. Một khẩu hiệu khép lại.
Phong cách: quay màn hình sống động: giao diện thật vẽ lại sắc nét, máy quay kiểu phần mềm quay màn hình phóng to và lia, lưới pixel bất khả xâm phạm, linh vật đi trên mép trên của các cửa sổ, thông tin theo từng lớp.
Cảm giác: thân thiện, rõ ràng, hơi tinh nghịch. Khoảng 60 giây, chú thích ngắn.`),
  S("lowpoly-island", "0:55", 24,
    `Topic: a small world that grows into a home.
Story: an empty sea with only a buoy that knows one note. Tiles, trees and houses rise from the water one by one, each landing on a note, so the island and its song are written together. A day passes; at night a fishing boat that went out cannot find its way back, and the island's last note is a lighthouse.
Style: low-poly isometric 3D, soft pastel light, each tile a musical note, a full day-night cycle on one island.
Mood: calm, gentle, then quietly moving. About 55 seconds, music only.`,
    `Chủ đề: một thế giới nhỏ lớn dần thành một mái nhà.
Câu chuyện: một vùng biển trống chỉ có chiếc phao biết đúng một nốt nhạc. Những ô đất, cây và nhà lần lượt nhô lên từ mặt nước, mỗi lần đặt xuống là một nốt, nên hòn đảo và bài hát của nó được viết cùng lúc. Một ngày trôi qua; đêm xuống, một chiếc thuyền đánh cá ra khơi không tìm được đường về, và nốt nhạc cuối cùng của hòn đảo là một ngọn hải đăng.
Phong cách: 3D low-poly isometric, ánh sáng pastel mềm, mỗi ô đất là một nốt nhạc, trọn một vòng ngày đêm trên một hòn đảo.
Cảm giác: êm, dịu dàng, rồi lặng lẽ xúc động. Khoảng 55 giây, chỉ có nhạc.`),
  S("memphis-diorama", "0:45", 60,
    `Topic: one small harbour village through the four seasons, in a single take.
Story: no hero; the place is the subject. A harbour, a pier, a row of colourful houses, a square with one big lighthouse, a beach and a few gardens go through spring, summer, autumn and winter, about ten seconds each. Every change of season is the same gesture: the lighthouse squashes down for half a second, springs back, and a wave of the next season's colours spreads out from it while small things act as the ring passes. The film ends on the village lit up on a winter evening.
Style: a Memphis-style miniature diorama: bold pastel blocks, dots and squiggles, toy-like shapes, one slow camera; seasons told only by colour and small motions.
Mood: cheerful, cosy, looping. About 45 seconds, music only, with short type in two languages at the bottom.`,
    `Chủ đề: một làng cảng nhỏ qua bốn mùa, trong một cú máy duy nhất.
Câu chuyện: không có nhân vật chính; nơi chốn là chủ thể. Một bến cảng, một cầu tàu, một dãy nhà sặc sỡ, một quảng trường có ngọn hải đăng lớn, một bãi biển và vài khu vườn đi qua xuân, hạ, thu, đông, mỗi mùa khoảng mười giây. Mỗi lần đổi mùa là cùng một động tác: ngọn hải đăng nhún xuống nửa giây, bật lên, và một làn sóng màu của mùa sau lan ra từ đó, những vật nhỏ cử động khi vòng sóng đi qua. Phim kết ở ngôi làng lên đèn trong một tối mùa đông.
Phong cách: sa bàn thu nhỏ kiểu Memphis: khối màu pastel đậm, chấm và nét ngoằn ngoèo, hình như đồ chơi, một máy quay chậm; mùa được kể chỉ bằng màu và những chuyển động nhỏ.
Cảm giác: vui tươi, ấm cúng, lặp vòng. Khoảng 45 giây, chỉ có nhạc, có dòng chữ ngắn hai thứ tiếng ở cuối khung.`),
  S("microgame", "1:00", 24,
    `Topic: a clumsy cadet tries to pass space school on a game show.
Story: a string of microgames, each a shouted command word, three seconds, one action and one result (a success or a funny failure). Between games we cut back to the host, a scoreboard of lives and a stage number. Every few games everything speeds up. A final boss stage mixes all the earlier rules: landing back home.
Style: each microgame in a different visual medium (crayon, ink, terminal, risograph, pixel, blueprint, Swiss type), lives as UI, a SPEED UP sting, a boss that mixes the rules.
Mood: frantic, funny, triumphant. About 60 seconds, a host's shouts.`,
    `Chủ đề: một học viên vụng về cố qua trường không gian trong một gameshow.
Câu chuyện: một chuỗi trò chơi siêu ngắn, mỗi trò là một lệnh được hô to, ba giây, một hành động và một kết quả (thành công hoặc thất bại buồn cười). Giữa các trò, phim cắt về người dẫn, bảng điểm số mạng và số màn. Cứ vài trò mọi thứ lại tăng tốc. Màn trùm cuối trộn mọi luật trước đó: hạ cánh trở về nhà.
Phong cách: mỗi trò chơi một chất liệu hình ảnh khác nhau (sáp màu, mực, màn hình terminal, risograph, pixel, bản vẽ xanh, chữ kiểu Thuỵ Sĩ), số mạng là giao diện, một đoạn báo SPEED UP, màn trùm trộn luật.
Cảm giác: cuống cuồng, buồn cười, chiến thắng. Khoảng 60 giây, tiếng hô của người dẫn.`),
  S("microscope", "0:40", 24,
    `Topic: one stained slice of tissue the size of a fingernail, and two small circles on it that tell different stories.
Story: the slide sits on a bench with its label. One continuous dive brings us down to the tissue, with a dimension line for scale. Inside the first circle a scan front lights every counted pixel and a share of blue appears; the camera trucks to a second circle a millimetre away and counts again. After a silence both circles are framed side by side: one is more than twice as blue. The last move goes down to a single nucleus.
Style: microscopy: real slide scans, scan fronts, measured counts, dimension lines, every number computed from the image.
Mood: exact, curious, quietly astonishing. About 40 seconds, short narration.`,
    `Chủ đề: một lát mô nhuộm màu cỡ móng tay, và hai vòng tròn nhỏ trên đó kể hai câu chuyện khác nhau.
Câu chuyện: tấm lam kính nằm trên bàn kèm nhãn. Một cú lặn liền mạch đưa ta xuống tới lớp mô, có đường kích thước để thấy tỷ lệ. Trong vòng tròn thứ nhất, một vệt quét làm sáng từng điểm ảnh được đếm và hiện ra tỷ lệ màu xanh; máy quay trượt sang vòng thứ hai cách đó một milimét và đếm lại. Sau một khoảng lặng, cả hai vòng được đặt cạnh nhau: một vòng xanh gấp hơn hai lần. Cú máy cuối đi xuống tới một nhân tế bào.
Phong cách: hiển vi: ảnh quét lam kính thật, vệt quét, số đếm đo được, đường kích thước, mọi con số tính từ chính bức ảnh.
Cảm giác: chính xác, tò mò, kinh ngạc lặng lẽ. Khoảng 40 giây, giọng đọc ngắn.`),
  S("midcentury-toon", "0:40", 24,
    `Topic: a set-up guide for a fictional robot vacuum, for a product page or a QR code on the box.
Story: "Meet Pip." The box opens on a mustard background. One scene per step, each a wide shot plus a round detail call-out: put the dock against a wall with space on each side, pair the phone, hold the start button for one second. Then the payoff: Pip's cleaning route draws itself across the floor plan, and an iris closes on the product.
Style: a 1950s classroom cartoon: flat shapes, limited palette, a cheerful narrator, irises through a medallion, a pull-back with counter-rotation.
Mood: cheerful, tidy, reassuring. About 40 seconds, friendly narration.`,
    `Chủ đề: hướng dẫn cài đặt cho một robot hút bụi hư cấu, dùng cho trang sản phẩm hoặc mã QR trên hộp.
Câu chuyện: "Meet Pip." Chiếc hộp mở ra trên nền vàng mù tạt. Mỗi bước một cảnh, gồm một cảnh rộng và một ô tròn phóng to chi tiết: đặt đế sạc sát tường, chừa khoảng trống hai bên, ghép đôi với điện thoại, giữ nút khởi động một giây. Rồi phần thưởng: đường đi dọn dẹp của Pip tự vẽ ra trên sơ đồ sàn nhà, và một vòng tròn khép lại quanh sản phẩm.
Phong cách: phim hoạt hình lớp học thập niên 1950: hình khối phẳng, ít màu, người dẫn vui vẻ, vòng tròn mở qua một huy chương, lùi máy kèm xoay ngược.
Cảm giác: vui tươi, gọn gàng, yên tâm. Khoảng 40 giây, giọng đọc thân thiện.`),
  S("news-package", "0:55", 24,
    `Topic: four stories from one week in technology, as a full on-air news package (fictional companies).
Story: the sting becomes the channel bug and a rundown lists the four stories. Each story is entered with a band wipe and announced by the category tab on the headline strap: a launch, a price change, a new spec, a deal. At the end the rundown returns and each story is ticked off, then the end card.
Style: broadcast news graphics: a headline strap, a rundown, a price board, a spec card, a source line and a corner tag that belong to each picture.
Mood: brisk, authoritative, informative. About 55 seconds, a news anchor's narration.`,
    `Chủ đề: bốn tin công nghệ trong một tuần, dựng thành một gói bản tin truyền hình đầy đủ (các công ty hư cấu).
Câu chuyện: đoạn hình hiệu thu lại thành logo kênh ở góc, và một danh mục liệt kê bốn tin. Mỗi tin vào bằng một dải lau hình và được báo bằng nhãn chủ đề trên dải tít: một lần ra mắt, một lần đổi giá, một thông số mới, một thương vụ. Cuối bản tin danh mục quay lại và từng tin được đánh dấu xong, rồi tới khung kết.
Phong cách: đồ hoạ bản tin truyền hình: dải tít, danh mục, bảng giá, thẻ thông số, dòng nguồn và nhãn góc gắn với từng hình.
Cảm giác: nhanh, đáng tin, nhiều thông tin. Khoảng 55 giây, giọng người dẫn bản tin.`),
  S("newsreel", "0:55", 24,
    `Topic: a 1920s dance craze the newspapers said would ruin young people's knees.
Story: searchlights snap on with a fanfare. The warning spreads: spinning headlines, a grease pencil circling a dancer's knees, a map and the years rolling by. Then the other side of the story, an industrialist's own printed words. A split-screen duel follows, each side with its own band, trading bars faster and faster, and at his own company picnic the children dance it anyway.
Style: a 1920s newsreel: silver film, intertitle cards, spinning newspapers, flip-books, real archive footage and print, credited.
Mood: brassy, comic, knowing. About 55 seconds, a period announcer's voice.`,
    `Chủ đề: một cơn sốt điệu nhảy thập niên 1920 mà báo chí bảo sẽ làm hỏng đầu gối giới trẻ.
Câu chuyện: đèn pha bật sáng cùng tiếng kèn. Lời cảnh báo lan đi: những tờ báo xoay tít, bút sáp khoanh quanh đầu gối một vũ công, một tấm bản đồ và năm tháng trôi qua. Rồi phía bên kia câu chuyện, những lời in ra của chính một nhà tư bản công nghiệp. Tiếp theo là cuộc đấu chia màn hình, mỗi bên một ban nhạc, đối đáp từng ô nhịp nhanh dần, và ngay tại buổi dã ngoại của chính công ty ông, bọn trẻ vẫn nhảy.
Phong cách: phim thời sự thập niên 1920: phim bạc, thẻ chữ chen giữa, báo xoay, sách lật hình, tư liệu phim và báo in thật, ghi nguồn.
Cảm giác: ồn ào, hài hước, tinh quái. Khoảng 55 giây, giọng phát thanh viên thời ấy.`),
  S("one-line", "0:45", 24,
    `Topic: one whole life, drawn with a single line.
Story: on warm white paper the pen touches down and never lifts. The line becomes a child, a bicycle, a school, a love, a home, a long road; places turn into people and objects turn into years. Near the end the line slows and stops for a moment, then the pen is passed to a small hand and a new line begins.
Style: one continuous line, no fills and no shading, the camera following the nib like a tracking shot, the pen's soft shadow, at most one accent colour used once.
Mood: tender, simple, bittersweet. About 45 seconds, sparse narration or none.`,
    `Chủ đề: cả một đời người, vẽ bằng một nét duy nhất.
Câu chuyện: trên tờ giấy trắng ngà, ngòi bút chạm xuống và không bao giờ nhấc lên. Nét bút thành một đứa trẻ, một chiếc xe đạp, một mái trường, một tình yêu, một mái nhà, một con đường dài; nơi chốn hoá thành con người và đồ vật hoá thành năm tháng. Gần cuối, nét bút chậm lại và dừng một khoảnh khắc, rồi cây bút được trao cho một bàn tay nhỏ và một nét mới bắt đầu.
Phong cách: một nét liền duy nhất, không tô, không đổ bóng, máy quay đi theo ngòi bút, bóng mờ của cây bút, nhiều nhất một màu nhấn dùng một lần.
Cảm giác: dịu dàng, giản dị, buồn vui lẫn lộn. Khoảng 45 giây, giọng đọc thưa hoặc không có.`),
  S("paper-lantern", "1:30", 24,
    `Topic: a festival story about reunion and longing, told inside a glowing paper-cut lightbox.
Story: on a dark wooden table a lit lightbox stands beside a tea set; the camera pushes from the room into the box. Inside, layered paper scenes light up one by one: a traveller far from home, a window, a full moon, the road back. At the end the camera pulls back out to the real table, where a plate of real festival cakes waits in the box's warm spill light.
Style: a paper-cut lightbox: stacked paper layers, depth as distance, silhouettes, windows, light that turns on, the real box framing the film.
Mood: warm, nostalgic, gentle. About 90 seconds, soft narration.`,
    `Chủ đề: một câu chuyện ngày lễ về đoàn tụ và nỗi nhớ, kể bên trong một hộp đèn giấy cắt phát sáng.
Câu chuyện: trên chiếc bàn gỗ tối, một hộp đèn đang sáng đứng cạnh bộ ấm trà; máy quay tiến từ căn phòng vào trong hộp. Bên trong, những cảnh giấy xếp lớp lần lượt sáng lên: một người lữ khách xa nhà, một ô cửa sổ, một vầng trăng tròn, con đường trở về. Cuối phim máy quay lùi ra tới chiếc bàn thật, nơi một đĩa bánh ngày lễ thật đang chờ trong ánh sáng ấm hắt ra từ hộp đèn.
Phong cách: hộp đèn giấy cắt: các lớp giấy chồng lên nhau, chiều sâu là khoảng cách, hình bóng, ô cửa, ánh đèn bật sáng, chiếc hộp thật đóng khung cả phim.
Cảm giác: ấm, hoài niệm, nhẹ nhàng. Khoảng 90 giây, giọng kể khẽ.`),
  S("paper-popup", "1:30", 60,
    `Topic: a little paper sprite's adventure through a pop-up book.
Story: a storybook opens on a real wooden desk and unfolds into a stage. The sprite travels through paper worlds, a forest, a sea and a castle, each page turn a scene change, each one built from folds, pull-tabs and wheels. At the end the hero leaps off the edge of the page into the real room.
Style: a paper pop-up book: folds and mechanisms you can see, paper as the character, the edge of the page, real desk light that was there all along.
Mood: wondrous, playful, adventurous. About 90 seconds, a storyteller's voice.`,
    `Chủ đề: cuộc phiêu lưu của một tinh linh giấy nhỏ qua một cuốn sách pop-up.
Câu chuyện: một cuốn truyện mở ra trên chiếc bàn gỗ thật và bung thành một sân khấu. Tinh linh đi qua những thế giới bằng giấy, một khu rừng, một vùng biển và một toà lâu đài, mỗi lần lật trang là một lần chuyển cảnh, mỗi cảnh dựng bằng nếp gấp, lẫy kéo và bánh xoay. Cuối phim nhân vật nhảy khỏi mép trang ra căn phòng thật.
Phong cách: sách pop-up bằng giấy: nếp gấp và cơ cấu nhìn thấy được, giấy là nhân vật, mép trang sách, ánh đèn bàn thật vẫn ở đó từ đầu.
Cảm giác: kỳ diệu, tinh nghịch, phiêu lưu. Khoảng 90 giây, giọng người kể chuyện.`),
  S("papercut-red", "0:50", 24,
    `Topic: a folk tale for the New Year about a monster that is afraid of red and noise.
Story: on New Year's Eve the monster comes into the village and every house puts out its lights. A little girl folds a sheet of red paper three times and makes one cut; the unfolded flower goes on her window and a candle is lit. Cut lanterns fly to every dark window, the scraps become firecrackers, and the monster runs. At dawn we see the whole film was one paper flower on a real window.
Style: red paper-cut: folded symmetry, one cut that unfolds, red on light, candlelight through paper. The craft of cutting is the plot.
Mood: festive, brave, warm. About 50 seconds, a storyteller's voice.`,
    `Chủ đề: một truyện dân gian ngày Tết về con quái vật sợ màu đỏ và tiếng ồn.
Câu chuyện: đêm giao thừa con quái vật vào làng, nhà nào cũng tắt đèn. Một cô bé gấp tờ giấy đỏ ba lần và cắt một nhát; bông hoa giấy mở ra được dán lên cửa sổ, một ngọn nến được thắp. Những chiếc đèn lồng giấy cắt bay tới từng ô cửa tối, những mẩu giấy vụn thành pháo, và con quái vật bỏ chạy. Lúc bình minh ta thấy cả bộ phim là một bông hoa giấy dán trên một ô cửa thật.
Phong cách: tranh cắt giấy đỏ: đối xứng gấp nếp, một nhát cắt mở ra thành hình, đỏ trên nền sáng, ánh nến xuyên qua giấy. Nghề cắt giấy chính là câu chuyện.
Cảm giác: rộn ràng, dũng cảm, ấm áp. Khoảng 50 giây, giọng người kể chuyện.`),
  S("pictogram-motion", "1:00", 60,
    `Topic: an opener for a fictional multi-sport games, every sport on the beat.
Story: one card per sport, each a geometric pictogram doing its action on the beat: a sprinter, a diver, a fencer, an archer and many more. The sports are grouped into chapters, each chapter its own colour, and the pace climbs a ladder from one card per bar to one per beat. A long take follows one athlete through several sports, and the finale fills the screen with a grid of every pictogram.
Style: pictogram motion: one card = one item, flat geometric figures, strict rhythm, chapters as colours, a grand finale grid. No narration.
Mood: energetic, celebratory, precise. About 60 seconds, a driving 150 BPM track.`,
    `Chủ đề: đoạn mở màn cho một đại hội thể thao đa môn hư cấu, mọi môn đều đúng nhịp.
Câu chuyện: mỗi môn một thẻ, mỗi thẻ là một hình biểu tượng hình học đang làm động tác của môn ấy theo nhịp: chạy nước rút, nhảy cầu, đấu kiếm, bắn cung và nhiều môn nữa. Các môn chia thành từng chương, mỗi chương một màu, và tốc độ leo dần từ một thẻ mỗi ô nhịp lên một thẻ mỗi phách. Một cảnh quay dài đi theo một vận động viên qua nhiều môn, và đoạn kết lấp đầy màn hình bằng một lưới của mọi hình biểu tượng.
Phong cách: đồ hoạ chuyển động bằng hình biểu tượng: một thẻ là một môn, hình người hình học phẳng, nhịp chặt chẽ, chương là màu, lưới tổng kết hoành tráng. Không giọng đọc.
Cảm giác: sôi nổi, hân hoan, chính xác. Khoảng 60 giây, nhạc 150 BPM thúc giục.`),
  S("pixel-rpg", "0:55", 24,
    `Topic: a hero at the final door, saving the game one last time.
Story: before the boss door the hero stops at a save point. The save screen opens and replays the whole journey as save files: the village where it began, the friends who joined, the battles, the one who stayed behind. The palette shifts with each memory. The hero closes the menu, the door opens, and the screen cuts to white.
Style: a 16-bit pixel RPG at low native resolution: an indexed palette, ordered dither, small sprites, dialog boxes with portraits, menus, status bars and save files that tell the story.
Mood: nostalgic, brave, moving. About 55 seconds, dialog boxes only.`,
    `Chủ đề: một người hùng trước cánh cửa cuối cùng, lưu game một lần cuối.
Câu chuyện: trước cửa phòng trùm, nhân vật dừng ở một điểm lưu. Màn hình lưu game mở ra và chiếu lại cả hành trình dưới dạng các tệp lưu: ngôi làng nơi mọi chuyện bắt đầu, những người bạn đã đồng hành, những trận đánh, người đã ở lại phía sau. Bảng màu đổi theo từng ký ức. Nhân vật đóng menu, cánh cửa mở ra, và màn hình cắt sang trắng.
Phong cách: game RPG pixel 16-bit ở độ phân giải gốc thấp: bảng màu giới hạn, dither có trật tự, nhân vật nhỏ, hộp thoại có chân dung, menu, thanh trạng thái và tệp lưu kể chuyện.
Cảm giác: hoài niệm, dũng cảm, xúc động. Khoảng 55 giây, chỉ có hộp thoại.`),
  S("printed-long-take", "1:00", 30,
    `Topic: a rare bird that came back from the brink, told on one river at dawn.
Story: a winter dawn far below freezing on a river that never freezes; a flock of storks sleeps standing in the water. They wake one by one and lift off over the marsh to a feeding field, where a sign records how few were left decades ago. Feeding began that year; the same field is printed again and again as the numbers grow, until the sign is cut with today's count and the old warning is struck out.
Style: a scratchboard print in one unbroken take: knife cuts in black, paper white, one single red, the same place printed again as time passes, words cut into the world, a plate of type in the sky for the title and the end.
Mood: hushed, cold, hopeful. About 60 seconds, eleven short narrated lines with subtitles.`,
    `Chủ đề: một loài chim quý được kéo về từ bờ tuyệt chủng, kể trên một dòng sông lúc bình minh.
Câu chuyện: một bình minh mùa đông lạnh dưới không độ rất sâu trên một dòng sông không bao giờ đóng băng; một đàn cò đứng ngủ trong nước. Chúng thức dậy từng con một và bay lên qua đầm lầy tới một cánh đồng cho ăn, nơi một tấm biển ghi lại số chim ít ỏi còn lại nhiều thập kỷ trước. Việc cho ăn bắt đầu từ năm ấy; cánh đồng được in lại hết lần này tới lần khác khi số chim tăng dần, cho tới khi tấm biển được khắc con số hôm nay và lời cảnh báo cũ bị gạch đi.
Phong cách: tranh cào một cú máy liền mạch: nhát dao trên nền đen, giấy trắng, chỉ một màu đỏ, cùng một nơi được in lại khi thời gian trôi, chữ khắc vào thế giới, một bản chữ in trên bầu trời cho tiêu đề và đoạn kết.
Cảm giác: lặng, lạnh, hy vọng. Khoảng 60 giây, mười một câu đọc ngắn, có phụ đề.`),
  S("risograph", "0:40", 24,
    `Topic: a Sunday-morning bike ride across town to a breakfast by the river.
Story: the city starts printed in one blue ink only. Each place the rider passes adds a plate: the bakery brings yellow (a loaf handed over without stopping), the park brings pink (a burst of pigeons, one hitching a ride), and by the river all three inks overprint. He shares the bread with the pigeon, and the camera pulls back: the whole film was one sheet sliding out of the printer onto a stack of earlier prints.
Style: risograph print: two or three spot inks, misregistration, grain, overprint colours that only appear where plates meet.
Mood: relaxed, charming, sunny. About 40 seconds, music only.`,
    `Chủ đề: một buổi sáng Chủ nhật đạp xe qua thị trấn tới bữa sáng bên sông.
Câu chuyện: thành phố lúc đầu chỉ in bằng một màu mực xanh. Mỗi nơi người đạp xe đi qua thêm một bản in: tiệm bánh mang tới màu vàng (một ổ bánh được trao mà không cần dừng xe), công viên mang tới màu hồng (một đàn bồ câu bay vụt lên, một con đậu nhờ), và bên bờ sông cả ba màu mực in chồng lên nhau. Anh chia bánh cho chú bồ câu, và máy quay lùi ra: cả bộ phim là một tờ giấy vừa trượt ra khỏi máy in, đặt lên chồng bản in trước đó.
Phong cách: in risograph: hai ba màu mực pha, lệch bản, hạt giấy, màu in chồng chỉ hiện ở chỗ các bản gặp nhau.
Cảm giác: thư thái, duyên dáng, nắng. Khoảng 40 giây, chỉ có nhạc.`),
  S("rubber-hose", "0:50", 24,
    `Topic: a breakfast chase in a 1930s cartoon kitchen.
Story: a just-woken teapot tastes its own tea: bitter! It chases a runaway sugar cube around the kitchen: across the counter, through the china cabinet, into the sink. When the cube is about to go down the drain, the teapot stretches its rubbery arm around the whirlpool and fishes it out, then sadly lets it go; the cube jumps into the pot by itself, and the whole kitchen dances with the band.
Style: 1930s rubber-hose animation: bendy limbs, pie-cut eyes, white gloves, everything bouncing on the beat, a radio announcer calling the chase like a horse race.
Mood: zany, warm, joyful. About 50 seconds, jazz band and an announcer.`,
    `Chủ đề: một cuộc rượt đuổi bữa sáng trong căn bếp hoạt hình thập niên 1930.
Câu chuyện: một chiếc ấm trà vừa thức dậy nếm thử trà của mình: đắng! Nó rượt một viên đường bỏ chạy khắp căn bếp: dọc mặt bàn, qua tủ chén, xuống bồn rửa. Khi viên đường sắp bị cuốn xuống lỗ thoát nước, chiếc ấm vươn cánh tay dẻo như cao su vòng qua xoáy nước vớt nó lên, rồi buồn bã thả ra; viên đường tự nhảy vào ấm, và cả căn bếp nhảy múa theo ban nhạc.
Phong cách: hoạt hình kiểu ống cao su thập niên 1930: chân tay mềm dẻo, mắt hình bánh khuyết, găng tay trắng, mọi thứ nảy theo nhịp, một bình luận viên radio tường thuật cuộc đuổi như đua ngựa.
Cảm giác: tưng tửng, ấm áp, vui vẻ. Khoảng 50 giây, ban nhạc jazz và một bình luận viên.`),
  S("satellite-briefing", "0:40", 24,
    `Topic: a lake that the old atlas still shows full of water, and what orbit shows today.
Story: a printed atlas page with the lake's name in serif type. We dive into the map until it fills the frame, and a scanner bar tears it away to reveal salt and sand, then silence. Time rewinds and plays forward in one locked frame, each year leaving its shoreline as a ring, the rings coming faster. A range line gives the human scale from the old harbour to today's water. Then water is heard before it is seen: the one part that was saved by a dam.
Style: a satellite briefing: real public satellite imagery, map overlays, range lines, year counters, every figure sourced.
Mood: sober, striking, a glimmer of hope. About 40 seconds, short narration.`,
    `Chủ đề: một hồ nước mà tấm bản đồ cũ vẫn vẽ đầy nước, và những gì vệ tinh nhìn thấy hôm nay.
Câu chuyện: một trang bản đồ in, tên hồ viết bằng chữ có chân. Ta lặn vào bản đồ tới khi nó lấp đầy khung hình, một vạch quét xé nó ra để lộ muối và cát, rồi im lặng. Thời gian tua ngược và chạy tới trong một khung đứng yên, mỗi năm để lại đường bờ của nó như một vòng tròn, các vòng đến nhanh dần. Một đường đo cho thấy khoảng cách có thật, từ bến cảng cũ tới mặt nước hôm nay. Rồi tiếng nước vang lên trước khi thấy nước: phần duy nhất được giữ lại nhờ một con đê.
Phong cách: bản tin vệ tinh: ảnh vệ tinh công khai thật, lớp phủ bản đồ, đường đo khoảng cách, bộ đếm năm, mọi con số có nguồn.
Cảm giác: tỉnh táo, ấn tượng, le lói hy vọng. Khoảng 40 giây, giọng đọc ngắn.`),
  S("scifi-toon", "0:55", 24,
    `Topic: a tiny errand with absurdly large science-fiction means.
Story: the lab is out of coffee. A jaded genius in a bathrobe opens a portal and crosses universes for a refill, dragging his nervous assistant along. Every universe has a worse coffee: one made of sand, one that drinks you back, one that is only a hologram. The one they finally bring home turns out to be decaf.
Style: a sci-fi sitcom cartoon: thick outlines, bright flat colours, portal swirls, deadpan acting with quick lip sync, one gag per universe.
Mood: cynical, absurd, very funny. About 55 seconds, two-character dialogue.`,
    `Chủ đề: một việc vặt nhỏ xíu với phương tiện khoa học viễn tưởng to quá cỡ.
Câu chuyện: phòng thí nghiệm hết cà phê. Một thiên tài chán đời mặc áo choàng tắm mở một cánh cổng và băng qua các vũ trụ để đi mua thêm, kéo theo người trợ lý hay lo của mình. Vũ trụ nào cũng có cà phê tệ hơn: một loại làm bằng cát, một loại uống ngược lại người uống, một loại chỉ là hình ảnh ba chiều. Thứ họ cuối cùng mang về hoá ra là cà phê không caffeine.
Phong cách: hoạt hình sitcom khoa học viễn tưởng: viền đậm, màu phẳng tươi, vòng xoáy cổng không gian, diễn xuất tỉnh bơ với khẩu hình nhanh, mỗi vũ trụ một câu đùa.
Cảm giác: cay độc, phi lý, rất buồn cười. Khoảng 55 giây, lời thoại của hai nhân vật.`),
  S("shadow-puppet", "0:55", 24,
    `Topic: the myth of the archer who shot down the extra suns, told with leather puppets on a lit screen.
Story: one lamp lights the screen and the play begins. Then nine more lamps flare behind the cloth as ten suns scorch the land; the screen bleaches white. Each time the archer shoots, one lamp goes out and the colour steps back to warm. The tenth arrow is already nocked when he stops, and leaves the last sun, the very lamp that lights the play.
Style: shadow puppetry: translucent coloured leather, jointed limbs on rods, a cloth screen, lamps that are the light of the story itself.
Mood: mythic, tense, then merciful. About 55 seconds, a storyteller's voice and folk percussion.`,
    `Chủ đề: thần thoại về người cung thủ bắn rơi những mặt trời thừa, kể bằng rối da trên màn sáng.
Câu chuyện: một ngọn đèn chiếu sáng tấm màn và vở diễn bắt đầu. Rồi chín ngọn đèn nữa bùng lên sau tấm vải khi mười mặt trời thiêu đốt mặt đất; tấm màn trắng loá. Mỗi lần cung thủ bắn, một ngọn đèn tắt và màu sắc lùi dần về ấm. Mũi tên thứ mười đã lắp vào cung thì anh dừng lại, để lại mặt trời cuối cùng, chính là ngọn đèn đang chiếu sáng vở diễn.
Phong cách: múa rối bóng: da màu trong mờ, tay chân có khớp gắn trên que, màn vải, những ngọn đèn chính là ánh sáng của câu chuyện.
Cảm giác: huyền thoại, căng thẳng, rồi khoan dung. Khoảng 55 giây, giọng người kể chuyện và trống dân gian.`),
  S("silent-film", "0:55", 24,
    `Topic: a silent one-reel comedy about a runaway loaf of bread.
Story: a baker's boy drops a fresh loaf and it rolls away downhill. He chases it through a market, under a cart and down a flight of steps, setting off a chain of small disasters that we watch happen in one wide frame. He finally catches it at the bottom, and breaks it in half for a hungry girl who was waiting there.
Style: a 1920s silent film as it looks projected: 4:3 in a gate between theatre curtains, ink drawing with washed greys, flicker, weave, scratches, intertitle cards, an iris, a cinema piano.
Mood: comic, deadpan, sweet. About 55 seconds, piano only.`,
    `Chủ đề: một phim hài câm một cuộn về ổ bánh mì bỏ chạy.
Câu chuyện: cậu bé phụ việc tiệm bánh làm rơi một ổ bánh mới ra lò và nó lăn xuống dốc. Cậu đuổi theo qua chợ, chui dưới một chiếc xe đẩy và xuống một dãy bậc thang, gây ra một chuỗi tai nạn nhỏ mà ta thấy diễn ra trong một khung hình rộng. Cuối cùng cậu bắt được nó ở chân dốc, và bẻ đôi chia cho một cô bé đói đang chờ ở đó.
Phong cách: phim câm thập niên 1920 như khi được chiếu: khung 4:3 giữa hai tấm màn rạp, tranh mực với lớp xám loang, nhấp nháy, rung khung, vết xước, thẻ chữ chen giữa, vòng tròn mở đóng, đàn piano rạp chiếu bóng.
Cảm giác: hài, tỉnh bơ, ngọt ngào. Khoảng 55 giây, chỉ có piano.`),
  S("silkscreen-poster", "0:40", 24,
    `Topic: a trail guide for a fictional national park.
Story: three trail posters are screen-printed one ink at a time, each one faster than the last. The third poster is climbed in one long take from the trailhead to the summit, from noon to dusk, with the trail name, difficulty, distance, time and climb arriving in order. At the end all three posters hang on a visitor-centre wall.
Style: silkscreen travel posters: flat spot colours printed layer by layer, bold lettering, a crane up the trail through multi-plane parallax.
Mood: inviting, sunny, outdoorsy. About 40 seconds, no narration.`,
    `Chủ đề: hướng dẫn đường mòn cho một vườn quốc gia hư cấu.
Câu chuyện: ba tấm poster đường mòn được in lụa từng màu mực một, tấm sau nhanh hơn tấm trước. Tấm thứ ba được leo trong một cảnh quay dài từ chân đường mòn lên tới đỉnh, từ trưa tới chiều tà, tên đường mòn, độ khó, quãng đường, thời gian và độ cao lần lượt hiện ra. Cuối phim cả ba tấm treo trên tường một trung tâm du khách.
Phong cách: poster du lịch in lụa: màu pha phẳng in từng lớp, chữ đậm, máy quay cẩu lên dọc đường mòn qua nhiều lớp cảnh chuyển động lệch nhau.
Cảm giác: mời gọi, nắng, ngoài trời. Khoảng 40 giây, không giọng đọc.`),
  S("spy-titles", "0:45", 24,
    `Topic: the opening titles of an imaginary 1960s spy film.
Story: a stolen key passes from hand to hand across a few locations: a train, a casino, a rooftop, chased by silhouettes. Each credit lands as part of the picture, a doorway, a staircase, a playing card. In the end the shapes lock together and the reveal is the film's title.
Style: a 1960s title sequence: flat opaque inks on paper, hand-cut edges, silhouettes, a diagonal grid, graphic match cuts, type that is the set. All credits are fictional roles.
Mood: cool, sly, jazzy. About 45 seconds, a big-band score.`,
    `Chủ đề: đoạn tựa mở đầu của một phim điệp viên tưởng tượng thập niên 1960.
Câu chuyện: một chiếc chìa khoá bị đánh cắp chuyền từ tay này sang tay khác qua vài địa điểm: một đoàn tàu, một sòng bạc, một mái nhà, bị những hình bóng rượt theo. Mỗi dòng tên trong phần giới thiệu đáp xuống thành một phần của khung hình: một ô cửa, một cầu thang, một quân bài. Cuối cùng các hình khối khoá vào nhau và điều được hé lộ là tựa phim.
Phong cách: đoạn tựa phim thập niên 1960: mực phẳng đục trên giấy, mép cắt tay, hình bóng, lưới chéo, cắt nối khớp hình, chữ là bối cảnh. Mọi tên trong phần giới thiệu là vai hư cấu.
Cảm giác: điềm tĩnh, ranh mãnh, đậm chất jazz. Khoảng 45 giây, nhạc big band.`),
  S("stained-glass", "0:55", 24,
    `Topic: a knight, a dragon and a window that tells their story as the sun crosses it.
Story: an east window in a stone hall shows a knight sent to slay the dragon that swallowed the sun. Wherever the sunlight falls, that pane's story moves. At dusk, in the last pane, the knight strikes and the glass cracks; he sees the dragon was keeping the sun's last ember warm until morning. The pieces slide back along the leads into a kneeling knight, and at night only that pane still glows.
Style: stained glass: coloured panes held by lead lines, light passing through, the sun's path as the camera, panes that crack and re-weld.
Mood: legendary, solemn, then gentle. About 55 seconds, a narrator and choir-like music.`,
    `Chủ đề: một hiệp sĩ, một con rồng và một ô cửa kể chuyện của họ khi mặt trời đi qua.
Câu chuyện: một ô cửa phía đông trong sảnh đá vẽ một hiệp sĩ được cử đi giết con rồng đã nuốt mặt trời. Ánh nắng rơi vào ô kính nào, câu chuyện ở ô ấy chuyển động. Lúc hoàng hôn, ở ô kính cuối, hiệp sĩ vung kiếm và kính nứt; anh nhận ra con rồng đang ủ ấm tàn lửa cuối cùng của mặt trời cho tới sáng. Những mảnh kính trượt về theo các đường chì thành một hiệp sĩ đang quỳ, và đêm xuống chỉ còn ô ấy sáng.
Phong cách: kính màu nhà thờ: ô kính màu giữ bằng đường chì, ánh sáng xuyên qua, đường đi của mặt trời là máy quay, kính nứt rồi hàn lại.
Cảm giác: huyền thoại, trang nghiêm, rồi dịu dàng. Khoảng 55 giây, người kể chuyện và nhạc như hợp xướng.`),
  S("swiss-motion", "0:45", 24,
    `Topic: a concert poster that lays itself out by five design rules, and breaks just one.
Story: an empty grid on white paper. Rule one sets the columns, rule two the type scale, rule three the alignment, rule four the single red. Each rule lands on the beat and the poster builds itself with it. The fifth rule is to break one: a single element tilts off the grid, and the poster comes alive.
Style: Swiss motion graphics: a modular grid, black type and bars on white, one signal red, extreme scale contrast, every move snapping on the beat, nothing bouncing.
Mood: rigorous, witty, confident. About 45 seconds, a minimal electronic beat.`,
    `Chủ đề: một tấm poster hoà nhạc tự dàn trang theo năm quy tắc thiết kế, và chỉ phá đúng một.
Câu chuyện: một lưới trống trên giấy trắng. Quy tắc một đặt các cột, quy tắc hai đặt thang cỡ chữ, quy tắc ba đặt căn lề, quy tắc bốn đặt một màu đỏ duy nhất. Mỗi quy tắc đáp xuống đúng nhịp và tấm poster tự dựng lên theo đó. Quy tắc thứ năm là phá một quy tắc: một phần tử duy nhất nghiêng ra khỏi lưới, và tấm poster sống dậy.
Phong cách: đồ hoạ chuyển động kiểu Thuỵ Sĩ: lưới mô-đun, chữ và thanh đen trên nền trắng, một màu đỏ tín hiệu, tương phản cỡ cực lớn, mọi chuyển động hút về đúng nhịp, không nảy.
Cảm giác: chặt chẽ, dí dỏm, tự tin. Khoảng 45 giây, nhạc điện tử tối giản.`),
  S("teardown", "0:40", 24,
    `Topic: a small open-source keyboard, opened to show what is inside.
Story: a grazing macro over the keycaps and one real keystroke. In one orbit the layers lift apart, top first, keys in a wave, each layer labelled. The camera dives into the gap between the board and the case to look up at the chip, the memory and the lights, then rises through the plate to the switch pins. A fast pull back closes it bottom first, and the closed keyboard shows its real dimensions.
Style: an exploded teardown: real published design files, one continuous orbit, layer labels, dimension callouts, every number public.
Mood: precise, satisfying, a little nerdy. About 40 seconds, short narration.`,
    `Chủ đề: một bàn phím mã nguồn mở nhỏ, được mở ra để thấy bên trong.
Câu chuyện: một cận cảnh lướt sát mặt các phím và một lần gõ phím thật. Trong một vòng quay máy, các lớp tách lên, lớp trên trước, các phím nhấc lên như một làn sóng, mỗi lớp có nhãn. Máy quay lặn vào khe giữa bảng mạch và vỏ để nhìn lên con chip, bộ nhớ và đèn, rồi đi lên qua tấm đỡ tới chân công tắc. Một cú lùi nhanh đóng nó lại từ dưới lên, và bàn phím đã đóng hiện kích thước thật của nó.
Phong cách: tháo rời sản phẩm: tệp thiết kế công bố thật, một vòng quay liền mạch, nhãn từng lớp, chú thích kích thước, mọi con số công khai.
Cảm giác: chính xác, thoả mãn, hơi mọt kỹ thuật. Khoảng 40 giây, giọng đọc ngắn.`),
  S("telestrator", "0:55", 24,
    `Topic: a football comeback: down 0–3 at half-time, three goals in twelve minutes.
Story: a show sting and a match-record card set up the score and bracket the three second-half goals. The first two are shown quickly; the third gets the full treatment: freeze in play, lines and arrows drawn on the pitch, a split screen of two angles, the runs traced. A shot map shows where the three were struck, a data card follows, and the end card closes.
Style: a sports telestrator: freeze frames, hand-drawn lines on live play, circles and arrows, a shot map, broadcast cards. Real or licensed footage, credited; club names left out.
Mood: analytical, building, thrilling. About 55 seconds, a pundit's commentary.`,
    `Chủ đề: một cuộc lội ngược dòng bóng đá: thua 0–3 sau hiệp một, ghi ba bàn trong mười hai phút.
Câu chuyện: một đoạn hình hiệu và một thẻ tóm tắt trận đặt ra tỷ số và đánh dấu ba bàn của hiệp hai. Hai bàn đầu được chiếu nhanh; bàn thứ ba được phân tích đầy đủ: dừng hình giữa trận, đường kẻ và mũi tên vẽ trên sân, chia màn hình hai góc máy, các đường chạy được vẽ lại. Một bản đồ dứt điểm cho thấy ba bàn được sút từ đâu, tiếp theo là thẻ số liệu, và khung kết khép lại.
Phong cách: bảng phân tích thể thao: dừng hình, nét vẽ tay trên cảnh trận đấu, vòng tròn và mũi tên, bản đồ dứt điểm, thẻ đồ hoạ truyền hình. Cảnh quay thật hoặc có giấy phép, ghi nguồn; không nêu tên câu lạc bộ.
Cảm giác: phân tích, dồn dần, hồi hộp. Khoảng 55 giây, giọng bình luận viên.`),
  S("tilt-shift", "0:40", 24,
    `Topic: a town that looks like a model, from dawn to rush hour.
Story: one light trail moves through a sleeping town at dawn; then buses, trains and tiny commuters fill the streets until everything is gridlocked. At the peak, time crashes to real speed as a family of ducks crosses the main avenue in front of one waiting car. Then the town speeds up again and the camera rises until the streets look like a circuit board.
Style: a tilt-shift miniature: a thin band of focus, saturated toy colours, sped-up motion, a system of many small actors bending around one tiny one.
Mood: cute, busy, then tender. About 40 seconds, music only.`,
    `Chủ đề: một thị trấn trông như mô hình, từ bình minh tới giờ cao điểm.
Câu chuyện: một vệt sáng chạy qua thị trấn đang ngủ lúc rạng sáng; rồi xe buýt, tàu hoả và những người đi làm tí hon lấp đầy phố xá cho tới khi mọi thứ tắc nghẽn. Ở đỉnh điểm, thời gian rơi về tốc độ thật khi một gia đình vịt băng qua đại lộ chính trước một chiếc xe đang chờ. Rồi thị trấn lại tăng tốc và máy quay bay lên cho tới khi phố xá trông như một bảng mạch.
Phong cách: tilt-shift thu nhỏ: một dải nét mỏng, màu đồ chơi đậm, chuyển động tua nhanh, một hệ thống nhiều nhân vật nhỏ xoay quanh một nhân vật bé xíu.
Cảm giác: dễ thương, bận rộn, rồi dịu dàng. Khoảng 40 giây, chỉ có nhạc.`),
  S("transit-map", "0:50", 30,
    `Topic: how a fictional city's metro grew from one short line into a whole network.
Story: a train's headlights flare in a tunnel and collapse into a dot on the map. A pen draws the first short section with a handful of stops while a counter ticks up the kilometres. Year by year lines reach the station, cross the river, dive underground, then a decade of lines bursts out at once in a long pull-back. Halfway, a printed time-line compares how fast the city grew with an older city. The film ends back at the first section: "you are here".
Style: a printed metro map that grows line by line under a moving camera: flat colour lines, interchange rings, water bodies and ferry lines that read at a distance, a paper veil; every word and number printed on the sheet, in two languages.
Mood: steady, proud, building. About 50 seconds, music only, no narration.`,
    `Chủ đề: tàu điện ngầm của một thành phố hư cấu lớn lên từ một đoạn tuyến ngắn thành cả một mạng lưới.
Câu chuyện: đèn pha của đoàn tàu loé lên trong đường hầm rồi thu lại thành một chấm trên bản đồ. Một cây bút vẽ đoạn tuyến đầu tiên với vài nhà ga trong lúc bộ đếm tăng dần số ki-lô-mét. Năm này qua năm khác các tuyến tới nhà ga, vượt sông, lặn xuống lòng đất, rồi cả một thập kỷ tuyến mới bung ra cùng lúc trong một cú kéo lùi dài. Giữa phim, một trục thời gian in sẵn so sánh tốc độ lớn lên của thành phố với một thành phố lâu đời hơn. Phim kết ở đoạn tuyến đầu tiên: "bạn đang ở đây".
Phong cách: một bản đồ tàu điện in sẵn lớn dần từng tuyến dưới một máy quay chuyển động: tuyến màu phẳng, vòng nhà ga trung chuyển, mặt nước và tuyến phà đọc rõ từ xa, một lớp giấy mờ phủ; mọi chữ và số in trên tờ bản đồ, hai thứ tiếng.
Cảm giác: vững vàng, tự hào, dồn dần. Khoảng 50 giây, chỉ có nhạc, không giọng đọc.`),
  S("ukiyoe", "0:45", 24,
    `Topic: a traveller's walk toward a distant mountain, in five woodblock views.
Story: a traveller in a straw hat leaves the rice fields; the mountain is tiny on the horizon. He crosses a bridge in the rain, rests at a teahouse where the mountain waits in a round window, and reaches a sea that rises into a great wave between them. The wave washes the print back to a blank sheet; the next print is the mountain filling the sheet, and he takes off his hat.
Style: ukiyo-e woodblock prints: flat colour blocks, bokashi gradients, keyblock lines, cartouches, seals. The story is told by where the mountain sits in each frame.
Mood: contemplative, building, serene. About 45 seconds, music only.`,
    `Chủ đề: hành trình của một lữ khách tới ngọn núi xa, trong năm bức tranh khắc gỗ.
Câu chuyện: một lữ khách đội nón rơm rời cánh đồng lúa; ngọn núi nhỏ xíu nơi chân trời. Anh qua một cây cầu trong mưa, nghỉ ở một quán trà nơi ngọn núi chờ trong một ô cửa tròn, và tới một vùng biển dâng lên thành một con sóng lớn giữa anh và ngọn núi. Con sóng rửa bức tranh trở về tờ giấy trắng; bức tiếp theo là ngọn núi lấp đầy tờ giấy, và anh bỏ nón xuống.
Phong cách: tranh khắc gỗ ukiyo-e: mảng màu phẳng, chuyển màu bokashi, nét bản khắc chính, ô chữ, con dấu. Câu chuyện được kể bằng vị trí của ngọn núi trong từng khung.
Cảm giác: trầm tư, dồn dần, thanh thản. Khoảng 45 giây, chỉ có nhạc.`),
  S("urban-sketch", "0:30", 24,
    `Topic: a park that exists only as an ink sketch, and a straw hat that is the only colour on the page.
Story: a gust of wind steals the hat from a woman on a bench. As the wind carries it across the park, past a fountain, a café and a bandstand, the page gets painted with watercolour wherever the hat passes. She catches it at the far side of the page, now fully in colour.
Style: urban sketch, pen and wash: one thin wobbly ink line that overshoots corners and breaks mid-stroke, then loose watercolour laid separately on top.
Mood: breezy, light, charming. About 30 seconds, no narration.`,
    `Chủ đề: một công viên chỉ có trong một bức ký hoạ mực, và chiếc nón rơm là màu duy nhất trên trang giấy.
Câu chuyện: một cơn gió cuốn chiếc nón khỏi tay một người phụ nữ đang ngồi trên ghế đá. Gió mang nón bay qua công viên, qua đài phun nước, quán cà phê và chòi nhạc, và nón bay tới đâu trang giấy được tô màu nước tới đó. Chị bắt được nó ở phía bên kia trang giấy, giờ đã đầy màu.
Phong cách: ký hoạ đường phố, bút mực và màu nước: một nét mực mảnh hơi run, chạy lố góc và đứt giữa chừng, rồi lớp màu nước phóng khoáng đặt riêng lên trên.
Cảm giác: lộng gió, nhẹ nhàng, duyên dáng. Khoảng 30 giây, không giọng đọc.`),
  S("visual-investigation", "1:00", 24,
    `Topic: a famous disaster rebuilt minute by minute from every kind of surviving evidence.
Story: it opens on the decisive frozen frame and rewinds. Newsreel, photographs, witness testimony and the official inquiry are laid on one clock; the clock narrows through three scales, minutes, then seconds, then the days of the investigation, each carried by a readout inside the picture. Five independent sources point to the same spot and the same moment.
Style: a visual investigation: synced archive footage, a red sync line, 2×2 evidence grids, timestamps, annotations, every source cited.
Mood: forensic, gripping, respectful. About 60 seconds, a measured narrator.`,
    `Chủ đề: một thảm hoạ nổi tiếng được dựng lại từng phút từ mọi loại bằng chứng còn sót lại.
Câu chuyện: phim mở bằng khung hình quyết định được dừng lại, rồi tua ngược. Phim thời sự, ảnh chụp, lời khai nhân chứng và kết luận điều tra chính thức được đặt lên cùng một chiếc đồng hồ; đồng hồ thu hẹp qua ba thang thời gian, phút, rồi giây, rồi những ngày điều tra, mỗi thang có một dòng số hiện ngay trong hình. Năm nguồn độc lập cùng chỉ về một điểm và một khoảnh khắc.
Phong cách: điều tra bằng hình ảnh: tư liệu phim đồng bộ, đường đồng bộ đỏ, lưới bằng chứng 2×2, mốc thời gian, chú thích, mọi nguồn được trích dẫn.
Cảm giác: như pháp y, cuốn hút, tôn trọng. Khoảng 60 giây, giọng đọc chừng mực.`),
  S("watercolor", "1:30", 60,
    `Topic: follow the rain across a land, from the dry heart to the green coast.
Story: one sheet of warm paper; a horizon is brushed in and a red sun is stamped like a seal. The camera walks sideways along one long painted world, and as it walks the rainfall rises: desert, scrub, woodland, tall wet forest, rainforest. Each zone paints itself in, with one specimen labelled by hand and one small event. At the end mist washes the landscape back to paper and the whole map is painted, with our walk drawn on it.
Style: watercolour brush: translucent strokes with dry-brush flying white, a field-journal annotation layer, colour that carries the data.
Mood: calm, curious, precise. About 90 seconds, warm documentary narration.`,
    `Chủ đề: đi theo cơn mưa qua một vùng đất, từ vùng lõi khô cằn tới bờ biển xanh.
Câu chuyện: một tờ giấy màu ấm; một đường chân trời được quét bằng cọ và một mặt trời đỏ được đóng như con dấu. Máy quay đi ngang dọc một thế giới vẽ dài liền mạch, và đi tới đâu lượng mưa tăng tới đó: sa mạc, cây bụi, rừng thưa, rừng cao ẩm, rừng mưa. Mỗi vùng tự vẽ ra, có một mẫu vật được ghi chú bằng tay và một sự kiện nhỏ. Cuối phim sương mù rửa cảnh vật về lại tờ giấy và cả tấm bản đồ được vẽ ra, có cả đường ta đã đi.
Phong cách: cọ màu nước: nét trong suốt với vệt khô "phi bạch", một lớp ghi chú như sổ tay thực địa, màu sắc mang theo dữ liệu.
Cảm giác: bình thản, tò mò, chính xác. Khoảng 90 giây, giọng đọc tài liệu ấm áp.`),
  S("white-model", "0:40", 24,
    `Topic: how a city flattened in a war grew back, decade by decade.
Story: a white architectural model under gallery light. The lights go out and a projector picks out every building that stood before the war: there is a hole in the middle. Layer by layer, faster each time, the post-war decades pop on while a year counter rolls to today, and the city crosses the river. Then a level of light climbs every facade, and the tallest new tower's winter shadow runs across the old roofs.
Style: projection on a white model: projector light on plain white blocks, layers by era, year counters, real city data, every figure sourced.
Mood: sober, hopeful, impressive. About 40 seconds, short narration.`,
    `Chủ đề: một thành phố bị san phẳng trong chiến tranh đã mọc lại thế nào, từng thập kỷ một.
Câu chuyện: một mô hình kiến trúc trắng dưới ánh đèn phòng trưng bày. Đèn tắt và máy chiếu rọi lên mọi toà nhà còn đứng trước chiến tranh: ở giữa là một khoảng trống. Từng lớp một, mỗi lần nhanh hơn, các thập kỷ sau chiến tranh bật lên trong lúc bộ đếm năm chạy tới hôm nay, và thành phố vượt qua sông. Rồi một mức ánh sáng leo lên mọi mặt tiền, và bóng mùa đông của toà tháp mới cao nhất trải qua những mái nhà cũ.
Phong cách: chiếu hình lên mô hình trắng: ánh máy chiếu trên những khối trắng trơn, các lớp theo thời kỳ, bộ đếm năm, dữ liệu thành phố thật, mọi con số có nguồn.
Cảm giác: tỉnh táo, hy vọng, ấn tượng. Khoảng 40 giây, giọng đọc ngắn.`),
  S("whiteboard", "1:30", 24,
    `Topic: why the map pin on your phone needs relativity to be right.
Story: a lesson on one physical whiteboard, starting from the blue dot on a phone. The pen draws the satellites, their atomic clocks and the signals, then the two effects that make their clocks run at a different rate from ours. A magnet marks the daily drift, the eraser rewinds one idea to show what would happen without the correction, and the board ends as a full map of the idea.
Style: a whiteboard explainer: dry-erase marker in real stroke order, one board and one camera, the pen leading the camera, magnets, an eraser that rewinds.
Mood: curious, clear, delightful. About 90 seconds, friendly teacher's narration.`,
    `Chủ đề: vì sao chấm định vị trên điện thoại cần đến thuyết tương đối mới chính xác.
Câu chuyện: một bài học trên một tấm bảng trắng thật, bắt đầu từ chấm xanh trên điện thoại. Cây bút vẽ các vệ tinh, đồng hồ nguyên tử của chúng và tín hiệu, rồi hai hiệu ứng khiến đồng hồ trên vệ tinh chạy khác nhịp với đồng hồ của ta. Một nam châm đánh dấu độ lệch mỗi ngày, cục tẩy tua lại một ý để cho thấy điều gì xảy ra nếu không hiệu chỉnh, và tấm bảng kết thúc thành một bản đồ trọn vẹn của ý tưởng.
Phong cách: giải thích trên bảng trắng: bút lông viết đúng thứ tự nét, một tấm bảng và một máy quay, cây bút dẫn máy quay, nam châm, cục tẩy để tua lại.
Cảm giác: tò mò, rõ ràng, thú vị. Khoảng 90 giây, giọng thầy cô thân thiện.`),
  S("woodcut", "1:00", 24,
    `Topic: a village with an empty belfry, and the craftsman who casts its first bell.
Story: the village has a bell tower with nothing in it. A founder spends the winter casting a bell; the first one cracks. He gives up something of his own to the molten metal and casts again. The first time the new bell rings, the falling snow stops and the whole village looks up.
Style: woodcut print: light that is carved out of black, carving as the passing of time, the mirrored block turning into the true print, snow as stab cuts, one colour plate, told like a wordless novel.
Mood: stark, devoted, triumphant. About 60 seconds, no narration, a single bell at the peak.`,
    `Chủ đề: một ngôi làng có tháp chuông trống, và người thợ đúc chiếc chuông đầu tiên cho nó.
Câu chuyện: ngôi làng có một tháp chuông mà bên trong không có gì. Một người thợ đúc dành cả mùa đông đúc một chiếc chuông; chiếc đầu tiên bị nứt. Ông bỏ một thứ của riêng mình vào kim loại nóng chảy và đúc lại. Lần đầu tiên chiếc chuông mới ngân vang, tuyết đang rơi bỗng ngừng và cả làng ngước lên.
Phong cách: tranh khắc gỗ: ánh sáng được khoét ra từ màu đen, nét khắc là thời gian trôi, bản khắc ngược chiều thành bản in đúng chiều, tuyết là những nhát đục, một bản màu duy nhất, kể như một tiểu thuyết không lời.
Cảm giác: khắc khổ, tận tâm, chiến thắng. Khoảng 60 giây, không giọng đọc, một tiếng chuông duy nhất ở cao trào.`),
]);
