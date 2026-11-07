// Places: a scene's ambience bed and the ground its footsteps fall on, from its `- ambience:` line, else the place or time words of its shot.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)


// ---- Places: a scene's ambience bed and the ground its footsteps fall on, from `- ambience:`, else the place or time words of its
// `- location:`, its `- sound:` line, its title or its scene
const L = (w) => `(?<!\\p{L})(?:${w})(?!\\p{L})`;

const PLACES = [
  [new RegExp(L("storm|thunderstorm|downpour|heavy rain|mưa (?:to|lớn|bão)|bão"), "iu"), "heavy rain", "wet"],
  [new RegExp(L("rain|rainy|raining|drizzle|mưa"), "iu"), "steady rain", "wet"],
  [new RegExp(L("blizzard|snowstorm|howling wind|bão tuyết"), "iu"), "howling wind", "snow"],
  [new RegExp(L("cafe|café|coffee shop|restaurant|diner|bar|pub|quán|nhà hàng"), "iu"), "restaurant", "wood"],
  [new RegExp(L("classroom|school|lecture hall|lớp học|trường"), "iu"), "classroom", "wood"],
  [new RegExp(L("mall|shopping|supermarket|bazaar|chợ|siêu thị"), "iu"), "mall", "concrete"],
  [new RegExp(L("crowd|audience|party|festival|stadium|đám đông|lễ hội"), "iu"), "crowd murmur", "concrete"],
  [new RegExp(L("traffic|highway|freeway|motorway|giao thông|xa lộ"), "iu"), "traffic", "concrete"],
  [new RegExp(L("street|streets|city|town|downtown|urban|alley|sidewalk|road|phố|đường phố|thành phố"), "iu"), "city street", "concrete"],
  [new RegExp(L("sea|ocean|beach|shore|coast|harbou?r|island|seaside|waves|biển|bãi biển|bến cảng|đảo"), "iu"), "sea waves", "gravel"],
  [new RegExp(L("river|stream|creek|brook|waterfall|sông|suối|thác"), "iu"), "river", "grass"],
  [new RegExp(L("cave|cavern|basement|dungeon|tunnel|hang|hầm"), "iu"), "cave drip", "concrete"],
  [new RegExp(L("pond|marsh|swamp|lake|ao|đầm|hồ"), "iu"), "night frogs", "grass"],
  [new RegExp(L("forest|woods|jungle|rừng"), "iu"), "forest", "grass"],
  [new RegExp(L("campfire|fireplace|hearth|bonfire|lửa trại|lò sưởi"), "iu"), "fireplace", "wood"],
  [new RegExp(L("park|garden|meadow|countryside|farm|village|lawn|morning|dawn|sunrise|vườn|công viên|làng|bình minh|buổi sáng"), "iu"), "morning birds", "grass"],
  [new RegExp(L("summer|tropical|cicadas?|mùa hè|ve sầu"), "iu"), "cicadas", "grass"],
  [new RegExp(L("night|nighttime|midnight|evening|dusk|đêm|ban đêm|buổi tối"), "iu"), "night crickets", "grass"],
  [new RegExp(L("desert|mountain|cliff|hilltop|prairie|windy|wind|sa mạc|núi|gió"), "iu"), "mild wind", "gravel"],
  [new RegExp(L("snow|snowy|winter|tuyết|mùa đông"), "iu"), "mild wind", "snow"],
  [new RegExp(L("room|kitchen|office|bedroom|living room|house|apartment|indoors?|interior|hallway|corridor|workshop|attic|loft|staircase|stairs|cellar|phòng|căn bếp|nhà bếp|văn phòng|căn nhà|gác mái"), "iu"), "room tone", "wood"],
];

// Indoors the time of day is no place (Test 28: "quiet house evening" was crickets and grass underfoot, "quiet house dawn" morning birds). Not
// when the words stand outside the house (a rooftop at dawn) or name what is heard from inside it ("attic morning birds").
const INDOOR = new RegExp(L("room|kitchen|office|bedroom|living room|house|home|apartment|indoors?|interior|hallway|corridor|workshop|attic|loft|staircase|stairs|cellar|garage|bathroom|phòng|căn bếp|nhà bếp|văn phòng|căn nhà|trong nhà|gác mái"), "iu");

const OUTSIDE = new RegExp(L("rooftop|roof|terrace|balcony|yard|courtyard|porch|garden|outside|outdoors?|mái nhà|sân|vườn|ngoài trời"), "iu");

const TIME_OF_DAY = new RegExp(L("morning|dawn|sunrise|noon|afternoon|evening|dusk|sunset|night|nighttime|midnight|buổi sáng|bình minh|buổi chiều|buổi tối|ban đêm|đêm"), "giu");

const HEARD = new RegExp(L("birds?|birdsong|crickets?|cicadas?|insects?|frogs?|chim|dế|ve sầu|ếch"), "iu");

/** A place's words without the time of day when they say indoors and name no outdoor sound; else as they are. */
const indoorText = (text) => (INDOOR.test(text) && !OUTSIDE.test(text) && !HEARD.test(text) ? text.replace(TIME_OF_DAY, " ").replace(/\s+/g, " ").trim() : text);

export const SURFACES = [[/\b(wood|wooden|floorboards?|plank)\b/, "wood"], [/\b(street|road|pavement|concrete|stone|sidewalk|asphalt|tiles?)\b/, "concrete"],
  [/\b(grass|lawn|meadow|field)\b/, "grass"], [/\b(gravel|path|sand|dirt)\b/, "gravel"], [/\b(snow|snowy)\b/, "snow"], [/\b(carpet|rug)\b/, "carpet soft"],
  [/\b(wet|puddles?|rain)\b/, "wet"]];

/** A shot's place: { query, surface, from } (query: the ambience loop to look up), { none: true } when its `- ambience:` says none, or
 *  null when nothing in it names a place (a motion-graphics shot keeps no bed). */
export function placeOf(shot) {
  const own = String(shot?.ambience ?? "").trim();
  if (/^(none|no|off|silence|-)$/i.test(own)) return { none: true };
  if (own) {
    const text = indoorText(own), bare = HEARD.test(own) && INDOOR.test(own) ? own.replace(TIME_OF_DAY, " ") : text;
    const p = PLACES.find(([re]) => re.test(bare));
    // the house itself is its room tone (no loop is tagged "house"); what is named from inside it keeps its own words, on the room's floor
    return { query: text !== own && p?.[1] === "room tone" ? "room tone" : own.toLowerCase(), surface: p?.[2] ?? null, from: "ambience" };
  }
  for (const from of ["location", "sound", "title", "scene"]) {
    const text = indoorText(String(shot?.[from] ?? ""));
    const p = text && PLACES.find(([re]) => re.test(text));
    if (p) return { query: p[1], surface: p[2], from };
  }
  return null;
}
