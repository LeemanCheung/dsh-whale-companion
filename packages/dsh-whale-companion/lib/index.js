import { createHmac, randomBytes } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
//#region src/catalog.ts
const whaleCollectibleId = [
	"first-wake",
	"blue-current-lamp",
	"warm-coral",
	"echo-shell",
	"tide-map",
	"song-chime",
	"moon-pearl",
	"dawn-reed",
	"night-reef",
	"sunken-compass",
	"glow-algae",
	"kelp-cushion",
	"ice-fragment",
	"star-lantern",
	"deep-bell",
	"migration-banner",
	"quiet-cove",
	"memory-orb",
	"aurora-arch",
	"ancient-anchor",
	"horizon-window",
	"tidal-garden",
	"whale-stone",
	"unknown-spire"
];
const whaleRoomSlotId = [
	"backdrop",
	"seafloor",
	"lighting",
	"hanging",
	"habitatLeft",
	"habitatRight",
	"foreground",
	"soundscape"
];
const whaleAliasId = [
	"blue-current",
	"sea-salt",
	"north-wind",
	"moon-reef",
	"quiet-kelp",
	"warm-sand",
	"far-song",
	"ice-lantern",
	"tide-glass",
	"coral-dawn",
	"deep-star",
	"open-horizon"
];
const WHALE_COLLECTIBLES = whaleCollectibleId.map((id, index) => ({
	id,
	name: [
		"初醒尾流",
		"蓝潮灯",
		"暖流珊瑚",
		"回声贝",
		"迁徙海图",
		"鲸歌风铃",
		"月光珍珠",
		"晨潮芦苇",
		"夜航礁",
		"沉没罗盘",
		"荧光藻",
		"海带软垫",
		"破冰碎片",
		"星海灯笼",
		"深潜铜铃",
		"迁徙旗",
		"静湾石",
		"记忆珠",
		"极光拱门",
		"远古锚",
		"地平窗",
		"潮汐花园",
		"鲸石",
		"未知尖塔"
	][index],
	slot: [
		"foreground",
		"lighting",
		"habitatLeft",
		"hanging",
		"backdrop",
		"soundscape",
		"foreground",
		"habitatRight",
		"seafloor",
		"hanging",
		"lighting",
		"seafloor",
		"foreground",
		"lighting",
		"soundscape",
		"backdrop",
		"habitatLeft",
		"hanging",
		"backdrop",
		"seafloor",
		"backdrop",
		"habitatRight",
		"foreground",
		"backdrop"
	][index],
	description: "由一段真实且不含工作内容的航行痕迹留下。"
}));
const WHALE_COLLECTIBLE_BY_ID = Object.fromEntries(WHALE_COLLECTIBLES.map((item) => [item.id, item]));
const WHALE_SLOT_LABELS = {
	backdrop: "背景",
	seafloor: "海床",
	lighting: "灯光",
	hanging: "悬挂",
	habitatLeft: "左栖息",
	habitatRight: "右栖息",
	foreground: "前景",
	soundscape: "声景"
};
const WHALE_ALIAS_LABELS = {
	"blue-current": "蓝潮",
	"sea-salt": "海盐",
	"north-wind": "北风",
	"moon-reef": "月礁",
	"quiet-kelp": "静海带",
	"warm-sand": "暖沙",
	"far-song": "远歌",
	"ice-lantern": "冰灯",
	"tide-glass": "潮玻璃",
	"coral-dawn": "珊瑚黎明",
	"deep-star": "深海星",
	"open-horizon": "开阔地平线"
};
//#endregion
//#region src/species.ts
const whaleSpeciesId = [
	"common-minke",
	"brydes",
	"humpback",
	"gray",
	"beluga",
	"orca",
	"sperm",
	"pilot",
	"narwhal",
	"bowhead",
	"fin",
	"sei",
	"blue",
	"southern-right",
	"omura",
	"cuviers-beaked",
	"north-atlantic-right",
	"north-pacific-right",
	"rices",
	"spade-toothed"
];
const WHALE_SPECIES = [
	{
		id: "common-minke",
		nameZh: "小须鲸",
		nameEn: "Common Minke Whale",
		scientific: "Balaenoptera acutorostrata",
		rarity: "N",
		unlockLevel: 1,
		affinities: ["启航"],
		ability: "迅游",
		story: "灵活、好奇，陪你完成第一次航行。",
		palette: "#70c5ff"
	},
	{
		id: "brydes",
		nameZh: "布氏鲸",
		nameEn: "Bryde’s Whale",
		scientific: "Balaenoptera brydei",
		rarity: "N",
		unlockLevel: 5,
		affinities: ["探索", "启航"],
		ability: "暖流觅食",
		story: "沿温暖海流寻找新的工具与路线。",
		palette: "#89d7c0"
	},
	{
		id: "humpback",
		nameZh: "座头鲸",
		nameEn: "Humpback Whale",
		scientific: "Megaptera novaeangliae",
		rarity: "N",
		unlockLevel: 10,
		affinities: ["群游", "恢复"],
		ability: "鲸歌连奏",
		story: "长鳍与鲸歌记录每一次稳定协作。",
		palette: "#c7a7ff"
	},
	{
		id: "gray",
		nameZh: "灰鲸",
		nameEn: "Gray Whale",
		scientific: "Eschrichtius robustus",
		rarity: "N",
		unlockLevel: 15,
		affinities: ["探索", "恢复"],
		ability: "迁徙航线",
		story: "斑驳皮肤承载漫长而可靠的迁徙记忆。",
		palette: "#b4bbc8"
	},
	{
		id: "beluga",
		nameZh: "白鲸",
		nameEn: "Beluga Whale",
		scientific: "Delphinapterus leucas",
		rarity: "R",
		unlockLevel: 20,
		affinities: ["回声"],
		ability: "回声校准",
		story: "用丰富回声定位问题，再把航线校准。",
		palette: "#aeeef0"
	},
	{
		id: "orca",
		nameZh: "虎鲸",
		nameEn: "Orca",
		scientific: "Orcinus orca",
		rarity: "R",
		unlockLevel: 25,
		affinities: ["群游"],
		ability: "群猎阵型",
		story: "黑白剪影代表默契、策略与协同。",
		palette: "#6170c7"
	},
	{
		id: "sperm",
		nameZh: "抹香鲸",
		nameEn: "Sperm Whale",
		scientific: "Physeter macrocephalus",
		rarity: "R",
		unlockLevel: 30,
		affinities: ["专注", "回声"],
		ability: "深潜作业",
		story: "方形巨头把复杂工作带入更深的海层。",
		palette: "#a18c78"
	},
	{
		id: "pilot",
		nameZh: "长肢领航鲸",
		nameEn: "Long-finned Pilot Whale",
		scientific: "Globicephala melas",
		rarity: "R",
		unlockLevel: 35,
		affinities: ["群游", "恢复"],
		ability: "领航节奏",
		story: "圆润额部与长鳍引导鲸群保持节奏。",
		palette: "#667699"
	},
	{
		id: "narwhal",
		nameZh: "一角鲸",
		nameEn: "Narwhal",
		scientific: "Monodon monoceros",
		rarity: "SR",
		unlockLevel: 40,
		affinities: ["回声"],
		ability: "破冰之角",
		story: "独特长牙把一次恢复变成清晰的突破。",
		palette: "#91dce6"
	},
	{
		id: "bowhead",
		nameZh: "弓头鲸",
		nameEn: "Bowhead Whale",
		scientific: "Balaena mysticetus",
		rarity: "SR",
		unlockLevel: 45,
		affinities: ["恢复", "专注"],
		ability: "古海长忆",
		story: "厚重弓形头部守护跨越时间的记录。",
		palette: "#7b88a8"
	},
	{
		id: "fin",
		nameZh: "长须鲸",
		nameEn: "Fin Whale",
		scientific: "Balaenoptera physalus",
		rarity: "SR",
		unlockLevel: 50,
		affinities: ["启航"],
		ability: "极速巡航",
		story: "修长轮廓把稳定效率化作开阔航迹。",
		palette: "#6387d4"
	},
	{
		id: "sei",
		nameZh: "塞鲸",
		nameEn: "Sei Whale",
		scientific: "Balaenoptera borealis",
		rarity: "SR",
		unlockLevel: 55,
		affinities: ["启航", "专注"],
		ability: "精准滤流",
		story: "克制而高效，奖励清晰完成而非工具堆叠。",
		palette: "#799abb"
	},
	{
		id: "blue",
		nameZh: "蓝鲸",
		nameEn: "Blue Whale",
		scientific: "Balaenoptera musculus",
		rarity: "SSR",
		unlockLevel: 60,
		affinities: ["专注"],
		ability: "巨鲸领域",
		story: "地球最大动物代表任务规模，而不是更强数值。",
		palette: "#5b87e4"
	},
	{
		id: "southern-right",
		nameZh: "南露脊鲸",
		nameEn: "Southern Right Whale",
		scientific: "Eubalaena australis",
		rarity: "SSR",
		unlockLevel: 65,
		affinities: ["恢复"],
		ability: "温海庇护",
		story: "宽阔背影象征温和守护。",
		palette: "#d58b97"
	},
	{
		id: "omura",
		nameZh: "大村鲸",
		nameEn: "Omura’s Whale",
		scientific: "Balaenoptera omurai",
		rarity: "SSR",
		unlockLevel: 70,
		affinities: ["探索"],
		ability: "幻纹发现",
		story: "不对称纹路记录每一次新发现。",
		palette: "#e1a573"
	},
	{
		id: "cuviers-beaked",
		nameZh: "柯维氏喙鲸",
		nameEn: "Cuvier’s Beaked Whale",
		scientific: "Ziphius cavirostris",
		rarity: "SSR",
		unlockLevel: 75,
		affinities: ["专注", "探索"],
		ability: "静默深渊",
		story: "短喙与深潜本领适合安静、持续的复杂任务。",
		palette: "#8295a4"
	},
	{
		id: "north-atlantic-right",
		nameZh: "北大西洋露脊鲸",
		nameEn: "North Atlantic Right Whale",
		scientific: "Eubalaena glacialis",
		rarity: "UR",
		unlockLevel: 82,
		affinities: ["回声", "恢复"],
		ability: "幸存者航路",
		story: "遗世级强调保护与韧性，不把濒危包装成力量。",
		palette: "#d29d82"
	},
	{
		id: "north-pacific-right",
		nameZh: "北太平洋露脊鲸",
		nameEn: "North Pacific Right Whale",
		scientific: "Eubalaena japonica",
		rarity: "UR",
		unlockLevel: 88,
		affinities: ["恢复"],
		ability: "孤星守望",
		story: "低频但长期的陪伴最终连接成星图。",
		palette: "#b99bdb"
	},
	{
		id: "rices",
		nameZh: "莱斯鲸",
		nameEn: "Rice’s Whale",
		scientific: "Balaenoptera ricei",
		rarity: "UR",
		unlockLevel: 94,
		affinities: ["专注", "恢复"],
		ability: "秘湾驻守",
		story: "有限栖息范围被转译为专注与守护。",
		palette: "#87b67c"
	},
	{
		id: "spade-toothed",
		nameZh: "铲齿中喙鲸",
		nameEn: "Spade-toothed Whale",
		scientific: "Mesoplodon traversii",
		rarity: "UR",
		unlockLevel: 100,
		affinities: ["探索", "专注"],
		ability: "未知共鸣",
		story: "未知之鲸代表长期观测、收藏与身份表达。",
		palette: "#d4b268"
	}
];
const WHALE_SPECIES_BY_ID = Object.fromEntries(WHALE_SPECIES.map((species) => [species.id, species]));
const RESONANCE_THRESHOLDS = [
	0,
	60,
	180,
	420,
	800
];
const reactionEffectByAffinity = {
	"启航": "wake",
	"回声": "song",
	"探索": "glow",
	"专注": "bubble",
	"恢复": "ripple",
	"群游": "current"
};
const reactionTemplateByAffinity = {
	"启航": "launch-tide",
	"回声": "echo-tide",
	"探索": "explore-tide",
	"专注": "focus-tide",
	"恢复": "restore-tide",
	"群游": "group-tide"
};
const reactionSlugByAffinity = {
	"启航": "launch",
	"回声": "echo",
	"探索": "explore",
	"专注": "focus",
	"恢复": "restore",
	"群游": "group"
};
const WHALE_REACTION_MANIFEST = WHALE_SPECIES.map((species) => ({
	speciesId: species.id,
	families: species.affinities,
	storyOnlyAbility: false,
	reactions: species.affinities.map((affinity, index) => ({
		reactionId: `${species.id}-${index === 0 ? "tide" : reactionSlugByAffinity[affinity]}`,
		allowedEventIds: index === 0 ? [
			"session-start",
			"user-turn",
			"tool-result",
			"level-up",
			"resonance-star",
			"species-unlock",
			"return"
		] : [
			"session-start",
			"user-turn",
			"level-up"
		],
		templateId: reactionTemplateByAffinity[affinity],
		visualEffectId: reactionEffectByAffinity[affinity],
		reducedMotionEffectId: index === 0 ? "mark" : "label"
	}))
}));
function resonanceStars(points) {
	let stars = 1;
	for (let index = 1; index < RESONANCE_THRESHOLDS.length; index += 1) if (points >= RESONANCE_THRESHOLDS[index]) stars = index + 1;
	return stars;
}
function isSpeciesUnlocked(species, level) {
	return level >= species.unlockLevel;
}
function levelForXp(xp) {
	let level = 1;
	while (level < 100 && xp >= xpFloorForLevel(level + 1)) level += 1;
	return level;
}
function xpFloorForLevel(level) {
	const completed = Math.max(0, Math.min(99, Math.floor(level) - 1));
	return 40 * completed + 3 * completed * (completed - 1) / 2;
}
function xpToNextLevel(level) {
	return level >= 100 ? 0 : 40 + 3 * Math.max(0, level - 1);
}
//#endregion
//#region src/spec.ts
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const smallCount = z.number().int().nonnegative().max(1e6);
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);
const id = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
const skinSchema = z.enum([
	"ocean",
	"coral",
	"midnight",
	"aurora",
	"sunset",
	"nebula"
]);
const companionNameSchema = z.string().trim().min(1, "伙伴名字不能为空").max(20, "伙伴名字最多 20 个字符");
const whaleSpeciesIdSchema = z.enum(whaleSpeciesId);
const whalePositionSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1)
}).strict();
const achievementIdSchema = z.enum([
	"first-swim",
	"ten-turns",
	"century",
	"week-current",
	"month-tide",
	"level-five",
	"level-ten",
	"tool-diver",
	"early-bird",
	"night-owl",
	"steady-fin",
	"collector"
]);
const whaleEventIdSchema = z.enum([
	"session-start",
	"utc-day-session",
	"utc-night-session",
	"user-turn",
	"tool-result",
	"level-up",
	"resonance-star",
	"species-unlock",
	"return"
]);
const whaleCollectibleIdSchema = z.enum(whaleCollectibleId);
const whaleRoomSlotIdSchema = z.enum(whaleRoomSlotId);
const whaleAliasIdSchema = z.enum(whaleAliasId);
const roomSlotsSchema = z.object({
	backdrop: whaleCollectibleIdSchema.nullable(),
	seafloor: whaleCollectibleIdSchema.nullable(),
	lighting: whaleCollectibleIdSchema.nullable(),
	hanging: whaleCollectibleIdSchema.nullable(),
	habitatLeft: whaleCollectibleIdSchema.nullable(),
	habitatRight: whaleCollectibleIdSchema.nullable(),
	foreground: whaleCollectibleIdSchema.nullable(),
	soundscape: whaleCollectibleIdSchema.nullable()
}).strict();
const roomSchema = z.object({
	slots: roomSlotsSchema,
	presets: z.array(roomSlotsSchema).max(3)
}).strict();
const momentSchema = z.object({
	id,
	progressDay: day,
	at: timestamp,
	category: whaleEventIdSchema,
	species: whaleSpeciesIdSchema,
	reactionId: id,
	templateId: id,
	visualSeed: z.number().int().nonnegative().max(4294967295)
}).strict();
const monthlyTideSchema = z.object({
	month,
	categoryCounts: z.partialRecord(whaleEventIdSchema, smallCount),
	speciesSeen: z.array(whaleSpeciesIdSchema).max(20)
}).strict();
const cooldownSchema = z.object({
	reactionId: id,
	lastAt: timestamp
}).strict();
const collectibleSchema = z.object({
	collectibleId: whaleCollectibleIdSchema,
	variant: z.number().int().min(0).max(9),
	earnedProgressDay: day
}).strict();
const expeditionSchema = z.object({
	expeditionId: id,
	species: whaleSpeciesIdSchema,
	startedProgressDay: day,
	lastAdvancedProgressDay: day.optional(),
	progress: z.number().int().nonnegative().max(30),
	goal: z.number().int().min(1).max(30),
	rewardClaimed: z.boolean()
}).strict().superRefine((value, ctx) => {
	if (value.progress > value.goal) ctx.addIssue({
		code: "custom",
		path: ["progress"],
		message: "progress must not exceed goal"
	});
});
const communityPeerSchema = z.object({
	aliasId: whaleAliasIdSchema,
	species: whaleSpeciesIdSchema,
	skin: skinSchema,
	activityBucket: z.enum([
		"0",
		"1",
		"2-4",
		"5+"
	]),
	observedBucket: z.enum([
		"1-4",
		"5-9",
		"10-14",
		"15-20"
	]),
	resonanceStars: z.number().int().min(1).max(5),
	seed: z.number().int().nonnegative().max(4294967295),
	importedAt: timestamp
}).strict();
const communitySchema = z.object({
	enabled: z.boolean(),
	aliasId: whaleAliasIdSchema,
	peers: z.array(communityPeerSchema).max(7)
}).strict();
const sharedState = {
	xp: count,
	level: count,
	turns: count,
	sessions: count,
	tools: count,
	streak: count,
	longestStreak: count,
	lastActiveDay: day.optional(),
	checkpoints: z.array(z.string().min(1).max(64)).max(4096),
	achievements: z.array(achievementIdSchema),
	skin: skinSchema,
	position: whalePositionSchema,
	name: companionNameSchema.optional(),
	updatedAt: timestamp
};
const legacyWhaleStateSchema = z.object({
	version: z.literal(1),
	...sharedState
}).strict().superRefine((state, ctx) => {
	if (state.level !== legacyLevelForXp(state.xp)) ctx.addIssue({
		code: "custom",
		path: ["level"],
		message: "level must match legacy xp"
	});
	validateCollections(state, ctx);
});
const v2WhaleStateSchema = z.object({
	version: z.literal(2),
	...sharedState,
	species: whaleSpeciesIdSchema,
	resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800))
}).strict().superRefine((state, ctx) => validateV2(state, ctx));
const v3WhaleStateSchema = z.object({
	version: z.literal(3),
	...sharedState,
	species: whaleSpeciesIdSchema,
	resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
	moments: z.array(momentSchema).max(150),
	monthlyTides: z.array(monthlyTideSchema).max(24),
	reactionCooldowns: z.array(cooldownSchema).max(256)
}).strict().superRefine((state, ctx) => validateV3(state, ctx));
const v4WhaleStateSchema = z.object({
	version: z.literal(4),
	...sharedState,
	species: whaleSpeciesIdSchema,
	resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
	moments: z.array(momentSchema).max(150),
	monthlyTides: z.array(monthlyTideSchema).max(24),
	reactionCooldowns: z.array(cooldownSchema).max(256),
	collectibles: z.array(collectibleSchema).max(128),
	room: roomSchema
}).strict().superRefine((state, ctx) => validateV4(state, ctx));
const currentWhaleStateSchema = z.object({
	version: z.literal(5),
	...sharedState,
	species: whaleSpeciesIdSchema,
	resonance: z.partialRecord(whaleSpeciesIdSchema, z.number().int().nonnegative().max(800)),
	moments: z.array(momentSchema).max(150),
	monthlyTides: z.array(monthlyTideSchema).max(24),
	reactionCooldowns: z.array(cooldownSchema).max(256),
	collectibles: z.array(collectibleSchema).max(128),
	room: roomSchema,
	expedition: expeditionSchema.nullable(),
	storyFragments: z.array(id).max(64),
	community: communitySchema
}).strict().superRefine((state, ctx) => validateV5(state, ctx));
const whaleStateSchema = z.union([
	currentWhaleStateSchema,
	v4WhaleStateSchema.transform(migrateV4),
	v3WhaleStateSchema.transform(migrateV3),
	v2WhaleStateSchema.transform(migrateV2),
	legacyWhaleStateSchema.transform(migrateLegacyWhaleState)
]);
const whaleDomainSpec = defineDomain({
	name: "whale_companion",
	version: 1,
	tables: { state: domainTable(whaleStateSchema) }
});
const emptyRoomSlots = () => ({
	backdrop: null,
	seafloor: null,
	lighting: null,
	hanging: null,
	habitatLeft: null,
	habitatRight: null,
	foreground: null,
	soundscape: null
});
const initialWhaleState = () => ({
	version: 5,
	xp: 0,
	level: 1,
	turns: 0,
	sessions: 0,
	tools: 0,
	streak: 0,
	longestStreak: 0,
	checkpoints: [],
	achievements: [],
	skin: "ocean",
	species: "common-minke",
	resonance: {},
	position: {
		x: .03,
		y: .08
	},
	name: "小蓝",
	updatedAt: 0,
	moments: [],
	monthlyTides: [],
	reactionCooldowns: [],
	collectibles: [],
	room: {
		slots: emptyRoomSlots(),
		presets: []
	},
	expedition: null,
	storyFragments: [],
	community: {
		enabled: false,
		aliasId: "blue-current",
		peers: []
	}
});
function legacyLevelForXp(xp) {
	return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
function migrateLegacyWhaleState(state) {
	return canonicalV5({
		...state,
		level: levelForXp(state.xp),
		checkpoints: state.checkpoints.map(legacyCheckpoint),
		species: "common-minke",
		resonance: {}
	});
}
function migrateV2(state) {
	return canonicalV5({
		...state,
		checkpoints: state.checkpoints.map(legacyCheckpoint)
	});
}
function migrateV3(state) {
	return canonicalV5({
		...state,
		checkpoints: state.checkpoints.map(legacyCheckpoint)
	});
}
function migrateV4(state) {
	return canonicalV5({
		...state,
		checkpoints: state.checkpoints.map(legacyCheckpoint)
	});
}
function canonicalV5(state) {
	const legacy = {
		...initialWhaleState(),
		...state
	};
	const level = levelForXp(legacy.xp);
	const gained = new Set(legacy.achievements);
	if (level >= 5) gained.add("level-five");
	if (level >= 10) gained.add("level-ten");
	if (gained.size >= 8) gained.add("collector");
	const unlockedResonance = Object.fromEntries(Object.entries(legacy.resonance).filter(([species]) => level >= WHALE_SPECIES_BY_ID[species].unlockLevel));
	const species = level >= WHALE_SPECIES_BY_ID[legacy.species].unlockLevel ? legacy.species : "common-minke";
	return {
		...legacy,
		version: 5,
		level,
		species,
		resonance: unlockedResonance,
		checkpoints: unique$1(legacy.checkpoints).slice(-4096),
		achievements: achievementIdSchema.options.filter((achievement) => gained.has(achievement)),
		moments: canonicalMoments(legacy.moments),
		monthlyTides: canonicalMonthlyTides(legacy.monthlyTides),
		reactionCooldowns: canonicalCooldowns(legacy.reactionCooldowns),
		collectibles: canonicalCollectibles(legacy.collectibles ?? []),
		room: canonicalRoom(legacy.room),
		expedition: legacy.expedition ?? null,
		storyFragments: unique$1(legacy.storyFragments ?? []).slice(-64),
		community: canonicalCommunity(legacy.community)
	};
}
function validateV2(state, ctx) {
	if (state.level !== levelForXp(state.xp)) ctx.addIssue({
		code: "custom",
		path: ["level"],
		message: "level must match xp"
	});
	if (state.level < WHALE_SPECIES_BY_ID[state.species].unlockLevel) ctx.addIssue({
		code: "custom",
		path: ["species"],
		message: "equipped species must be unlocked"
	});
	for (const species of Object.keys(state.resonance)) if (state.level < WHALE_SPECIES_BY_ID[species].unlockLevel) ctx.addIssue({
		code: "custom",
		path: ["resonance", species],
		message: "resonance species must be unlocked"
	});
	validateCollections(state, ctx);
}
function validateV3(state, ctx) {
	validateV2(state, ctx);
	validateMomentCollections(state, ctx);
}
function validateV4(state, ctx) {
	validateV3(state, ctx);
	validateRoom(state, ctx);
}
function validateV5(state, ctx) {
	validateV4(state, ctx);
	if (new Set(state.storyFragments).size !== state.storyFragments.length) ctx.addIssue({
		code: "custom",
		path: ["storyFragments"],
		message: "story fragments must be unique"
	});
	if (new Set(state.community.peers.map((peer) => peer.aliasId)).size !== state.community.peers.length) ctx.addIssue({
		code: "custom",
		path: ["community", "peers"],
		message: "peer aliases must be unique"
	});
	if (state.community.peers.some((peer) => peer.aliasId === state.community.aliasId)) ctx.addIssue({
		code: "custom",
		path: ["community", "peers"],
		message: "peer alias cannot match self"
	});
}
function validateCollections(state, ctx) {
	if (new Set(state.checkpoints).size !== state.checkpoints.length) ctx.addIssue({
		code: "custom",
		path: ["checkpoints"],
		message: "checkpoints must be unique"
	});
	if (new Set(state.achievements).size !== state.achievements.length) ctx.addIssue({
		code: "custom",
		path: ["achievements"],
		message: "achievements must be unique"
	});
}
function validateMomentCollections(state, ctx) {
	if (new Set(state.moments.map((moment) => moment.id)).size !== state.moments.length) ctx.addIssue({
		code: "custom",
		path: ["moments"],
		message: "moments must be unique"
	});
	if (new Set(state.monthlyTides.map((tide) => tide.month)).size !== state.monthlyTides.length) ctx.addIssue({
		code: "custom",
		path: ["monthlyTides"],
		message: "months must be unique"
	});
	if (new Set(state.reactionCooldowns.map((cooldown) => cooldown.reactionId)).size !== state.reactionCooldowns.length) ctx.addIssue({
		code: "custom",
		path: ["reactionCooldowns"],
		message: "reaction cooldowns must be unique"
	});
}
function validateRoom(state, ctx) {
	const collected = new Set(state.collectibles.map((item) => item.collectibleId));
	const placed = Object.values(state.room.slots).filter((item) => item !== null);
	if (new Set(placed).size !== placed.length) ctx.addIssue({
		code: "custom",
		path: ["room", "slots"],
		message: "a collectible can occupy only one slot"
	});
	if (placed.some((item) => !collected.has(item))) ctx.addIssue({
		code: "custom",
		path: ["room", "slots"],
		message: "room item must be collected"
	});
}
function canonicalMoments(moments) {
	return uniqueBy(moments, (moment) => moment.id).sort((left, right) => left.at - right.at || left.id.localeCompare(right.id)).slice(-150);
}
function canonicalMonthlyTides(tides) {
	return uniqueBy(tides, (tide) => tide.month).sort((left, right) => left.month.localeCompare(right.month)).slice(-24);
}
function canonicalCooldowns(cooldowns) {
	return uniqueBy(cooldowns, (cooldown) => cooldown.reactionId).sort((left, right) => left.lastAt - right.lastAt || left.reactionId.localeCompare(right.reactionId)).slice(-256);
}
function canonicalCollectibles(items) {
	return uniqueBy(items, (item) => item.collectibleId).slice(-128);
}
function canonicalRoom(room) {
	return room === void 0 ? {
		slots: emptyRoomSlots(),
		presets: []
	} : {
		slots: {
			...emptyRoomSlots(),
			...room.slots
		},
		presets: room.presets.slice(0, 3).map((slots) => ({
			...emptyRoomSlots(),
			...slots
		}))
	};
}
function canonicalCommunity(community) {
	return community === void 0 ? initialWhaleState().community : {
		...community,
		peers: uniqueBy(community.peers, (peer) => peer.aliasId).filter((peer) => peer.aliasId !== community.aliasId).slice(-7)
	};
}
function unique$1(items) {
	return [...new Set(items)];
}
function uniqueBy(items, key) {
	const seen = /* @__PURE__ */ new Set();
	return items.filter((item) => {
		const next = key(item);
		if (seen.has(next)) return false;
		seen.add(next);
		return true;
	});
}
function legacyCheckpoint(value) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return `legacy-${(hash >>> 0).toString(36)}`;
}
//#endregion
//#region src/reducer.ts
const XP = {
	turn: 10,
	tool: 5,
	session: 20
};
const RESONANCE = {
	turn: 2,
	tool: 0,
	session: 2
};
const ACHIEVEMENTS = achievementIdSchema.options;
const MAX_IMPORT_BYTES = 524288;
const COLLECTIBLES = WHALE_COLLECTIBLES;
const COLLECTIBLE_BY_ID = WHALE_COLLECTIBLE_BY_ID;
const reactionText = {
	"launch-tide": "鲸尾划开一条新的航线。",
	"echo-tide": "一圈回声从深海回到海面。",
	"explore-tide": "远处浮起一束陌生的光。",
	"focus-tide": "鲸鱼安静下潜，海面只留微光。",
	"restore-tide": "柔和的潮水托住了这次回归。",
	"group-tide": "几道海流靠近，形成短暂的编队。"
};
const communitySongSchema = z.object({
	format: z.literal("dsh-whale-song"),
	version: z.literal(1),
	member: z.object({
		aliasId: whaleAliasIdSchema,
		species: z.enum(WHALE_SPECIES.map((species) => species.id)),
		skin: z.enum([
			"ocean",
			"coral",
			"midnight",
			"aurora",
			"sunset",
			"nebula"
		]),
		activityBucket: z.enum([
			"0",
			"1",
			"2-4",
			"5+"
		]),
		observedBucket: z.enum([
			"1-4",
			"5-9",
			"10-14",
			"15-20"
		]),
		resonanceStars: z.number().int().min(1).max(5),
		seed: z.number().int().nonnegative().max(4294967295)
	}).strict()
}).strict();
const visitorBottleSchema = z.object({
	format: z.literal("dsh-whale-visitor-bottle"),
	version: z.literal(1),
	room: z.object({
		skin: z.enum([
			"ocean",
			"coral",
			"midnight",
			"aurora",
			"sunset",
			"nebula"
		]),
		species: z.enum(WHALE_SPECIES.map((species) => species.id)),
		slots: z.object({
			backdrop: whaleCollectibleIdSchema.nullable(),
			seafloor: whaleCollectibleIdSchema.nullable(),
			lighting: whaleCollectibleIdSchema.nullable(),
			hanging: whaleCollectibleIdSchema.nullable(),
			habitatLeft: whaleCollectibleIdSchema.nullable(),
			habitatRight: whaleCollectibleIdSchema.nullable(),
			foreground: whaleCollectibleIdSchema.nullable(),
			soundscape: whaleCollectibleIdSchema.nullable()
		}).strict()
	}).strict()
}).strict();
/** Reduces one allowlisted, HMAC-normalized live session observation. */
function reduceWhale(state, event) {
	if (state.checkpoints.includes(event.checkpoint)) return state;
	const beforeLevel = state.level;
	const beforeStars = resonanceStars(state.resonance[state.species] ?? 0);
	const xp = state.xp + XP[event.kind];
	const previous = state.lastActiveDay;
	let streak = state.streak;
	let lastActiveDay = state.lastActiveDay;
	if (event.kind === "session") {
		const offset = previous === void 0 ? void 0 : utcDayOffset(previous, event.day);
		if (offset === void 0) {
			streak = 1;
			lastActiveDay = event.day;
		} else if (offset > 0) {
			streak = offset === 1 ? state.streak + 1 : 1;
			lastActiveDay = event.day;
		}
	}
	const resonanceGain = RESONANCE[event.kind];
	const resonance = resonanceGain === 0 ? state.resonance : {
		...state.resonance,
		[state.species]: Math.min(800, (state.resonance[state.species] ?? 0) + resonanceGain)
	};
	const base = {
		...state,
		xp,
		level: levelForXp(xp),
		turns: state.turns + Number(event.kind === "turn"),
		tools: state.tools + Number(event.kind === "tool"),
		sessions: state.sessions + Number(event.kind === "session"),
		streak,
		longestStreak: Math.max(state.longestStreak, streak),
		lastActiveDay,
		checkpoints: [...state.checkpoints, event.checkpoint].slice(-4096),
		resonance,
		updatedAt: Math.max(state.updatedAt, event.at)
	};
	const withAchievements = {
		...base,
		achievements: unlock(base, event)
	};
	return advanceExpedition(refreshCollectibles(recordReaction(withAchievements, reactionEvents(state, withAchievements, event, beforeLevel, beforeStars, previous), event), event.day), event);
}
/** Equips an already unlocked whale species. */
function equipSpecies(state, species, at = Date.now()) {
	const definition = WHALE_SPECIES_BY_ID[species];
	if (state.level < definition.unlockLevel) throw new Error(`${definition.nameZh}将在海洋等级 ${definition.unlockLevel} 解锁`);
	return state.species === species ? state : {
		...state,
		species,
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Saves one collectible into a compatible fixed room slot. */
function placeCollectible(state, slot, collectible, at = Date.now()) {
	if (collectible !== null) {
		if (!state.collectibles.some((item) => item.collectibleId === collectible)) throw new Error("该纪念物尚未获得");
		if (COLLECTIBLE_BY_ID[collectible].slot !== slot) throw new Error("该纪念物不适合这个位置");
	}
	const slots = { ...state.room.slots };
	for (const key of Object.keys(slots)) if (slots[key] === collectible && key !== slot) slots[key] = null;
	slots[slot] = collectible;
	return {
		...state,
		room: {
			...state.room,
			slots
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Stores up to three local room configurations. */
function saveRoomPreset(state, at = Date.now()) {
	const next = [...state.room.presets, { ...state.room.slots }].slice(-3);
	return {
		...state,
		room: {
			...state.room,
			presets: next
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Restores a previously saved local room configuration. */
function loadRoomPreset(state, index, at = Date.now()) {
	const slots = state.room.presets[index];
	if (slots === void 0) throw new Error("找不到这个小屋方案");
	return {
		...state,
		room: {
			...state.room,
			slots: { ...slots }
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Starts an optional, non-punitive local expedition. */
function startExpedition(state, expeditionId, species, goal = 7, at = Date.now()) {
	if (!isSpeciesUnlocked(WHALE_SPECIES_BY_ID[species], state.level)) throw new Error("这位鲸灵尚未解锁");
	if (state.expedition !== null && !state.expedition.rewardClaimed) throw new Error("先完成当前远征");
	const day = dayOf$1(at);
	return {
		...state,
		expedition: {
			expeditionId: normalizeId(expeditionId),
			species,
			startedProgressDay: day,
			progress: 0,
			goal: Math.max(1, Math.min(30, Math.floor(goal))),
			rewardClaimed: false
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Claims the completed expedition story without consuming any progress. */
function claimExpedition(state, at = Date.now()) {
	const expedition = state.expedition;
	if (expedition === null || expedition.progress < expedition.goal || expedition.rewardClaimed) throw new Error("远征尚未完成");
	const fragment = `story-${expedition.expeditionId}`;
	return {
		...state,
		expedition: {
			...expedition,
			rewardClaimed: true
		},
		storyFragments: unique([...state.storyFragments, fragment]).slice(-64),
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Enables local-only community sharing and chooses a preset alias. */
function setCommunity(state, enabled, aliasId, at = Date.now()) {
	return {
		...state,
		community: {
			...state.community,
			enabled,
			aliasId,
			peers: state.community.peers.filter((peer) => peer.aliasId !== aliasId)
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Imports a safe community summary into the local trusted-peers list. */
function importCommunitySong(state, raw, at = Date.now()) {
	if (!state.community.enabled) throw new Error("请先主动开启鲸群分享");
	const song = communitySongSchema.parse(parseBoundedJson(raw, "鲸歌"));
	if (song.member.aliasId === state.community.aliasId) throw new Error("不能导入自己的鲸歌");
	const peer = {
		...song.member,
		importedAt: at
	};
	return {
		...state,
		community: {
			...state.community,
			peers: [...state.community.peers.filter((candidate) => candidate.aliasId !== peer.aliasId), peer].slice(-7)
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Removes one local trusted peer without contacting any service. */
function removeCommunityPeer(state, aliasId, at = Date.now()) {
	return {
		...state,
		community: {
			...state.community,
			peers: state.community.peers.filter((peer) => peer.aliasId !== aliasId)
		},
		updatedAt: Math.max(state.updatedAt, at)
	};
}
/** Produces the smallest opt-in community payload without session, tool, or text data. */
function exportCommunitySong(state) {
	if (!state.community.enabled) throw new Error("请先主动开启鲸群分享");
	const activeDays = new Set(state.moments.map((moment) => moment.progressDay)).size;
	const observed = WHALE_SPECIES.filter((species) => isSpeciesUnlocked(species, state.level)).length;
	const seed = stableSeed(`${state.community.aliasId}:${state.species}:${state.level}:${state.updatedAt}`);
	return JSON.stringify({
		format: "dsh-whale-song",
		version: 1,
		member: {
			aliasId: state.community.aliasId,
			species: state.species,
			skin: state.skin,
			activityBucket: bucket(activeDays, [
				0,
				1,
				4
			]),
			observedBucket: observed <= 4 ? "1-4" : observed <= 9 ? "5-9" : observed <= 14 ? "10-14" : "15-20",
			resonanceStars: resonanceStars(state.resonance[state.species] ?? 0),
			seed
		}
	});
}
/** Exports a read-only visitor bottle that cannot alter a receiving user's progress. */
function exportVisitorBottle(state) {
	return JSON.stringify({
		format: "dsh-whale-visitor-bottle",
		version: 1,
		room: {
			skin: state.skin,
			species: state.species,
			slots: state.room.slots
		}
	});
}
/** Validates a visitor bottle for isolated preview. */
function importVisitorBottle(raw) {
	return visitorBottleSchema.parse(parseBoundedJson(raw, "访客瓶"));
}
/** Resets all local whale data. */
function resetWhale() {
	return initialWhaleState();
}
/** Exports a portable backup without Session-derived checkpoint data. */
function exportWhale(state) {
	const { lastActiveDay: _lastActiveDay, updatedAt: _updatedAt, checkpoints: _checkpoints, moments: _moments, monthlyTides: _monthlyTides, reactionCooldowns: _reactionCooldowns, ...stable } = state;
	const backup = {
		...stable,
		checkpoints: [],
		moments: [],
		monthlyTides: [],
		reactionCooldowns: [],
		updatedAt: 0,
		collectibles: state.collectibles.map((item) => ({
			...item,
			earnedProgressDay: "1970-01-01"
		})),
		expedition: state.expedition === null ? null : {
			...state.expedition,
			startedProgressDay: "1970-01-01",
			lastAdvancedProgressDay: void 0
		},
		community: {
			...state.community,
			peers: state.community.peers.map((peer) => ({
				...peer,
				importedAt: 0
			}))
		}
	};
	const payload = JSON.stringify({
		format: "dsh-whale-companion",
		version: 5,
		state: backup
	});
	if (new TextEncoder().encode(payload).byteLength > 524288) throw new Error("备份超出 512 KiB 限制");
	return payload;
}
/** Imports and migrates every supported whale backup version. */
function importWhale(raw) {
	const parsed = parseBoundedJson(raw, "鲸鱼备份");
	if (typeof parsed !== "object" || parsed === null || parsed.format !== "dsh-whale-companion") throw new Error("Invalid whale export");
	const version = parsed.version;
	if (![
		1,
		2,
		3,
		4,
		5
	].includes(version)) throw new Error("Invalid or unsupported whale export");
	const state = parsed.state;
	if (typeof state !== "object" || state === null || state.version !== version) throw new Error("Whale export versions do not match");
	return whaleStateSchema.parse(state);
}
/** Projects the current local state into a non-sensitive raster postcard view model. */
function postcardView(state) {
	const latest = state.moments.slice(-3);
	return {
		day: latest.at(-1)?.progressDay ?? dayOf$1(state.updatedAt),
		species: state.species,
		skin: state.skin,
		level: state.level,
		moments: latest,
		message: latest.at(-1) === void 0 ? "海面平静，下一次航行正在等待。" : reactionMessage(latest.at(-1).templateId)
	};
}
function reactionEvents(before, after, observation, beforeLevel, beforeStars, previousDay) {
	const events = [];
	if (after.level > beforeLevel) events.push("level-up");
	if (resonanceStars(after.resonance[after.species] ?? 0) > beforeStars) events.push("resonance-star");
	if (WHALE_SPECIES.some((species) => species.unlockLevel > beforeLevel && species.unlockLevel <= after.level)) events.push("species-unlock");
	if (observation.kind === "session" && previousDay !== void 0 && utcDayOffset(previousDay, observation.day) >= 3) events.push("return");
	if (observation.kind === "session") {
		events.push("session-start");
		events.push(new Date(observation.at).getUTCHours() >= 18 || new Date(observation.at).getUTCHours() < 6 ? "utc-night-session" : "utc-day-session");
	}
	if (observation.kind === "turn") events.push("user-turn");
	if (observation.kind === "tool") events.push("tool-result");
	return events;
}
function recordReaction(state, events, observation) {
	const primary = [
		"species-unlock",
		"resonance-star",
		"level-up",
		"return",
		"session-start",
		"tool-result",
		"user-turn"
	].find((event) => events.includes(event));
	if (primary === void 0) return state;
	const reaction = WHALE_REACTION_MANIFEST.find((item) => item.speciesId === state.species)?.reactions.filter((item) => item.allowedEventIds.includes(primary)).sort((left, right) => left.reactionId.localeCompare(right.reactionId))[0];
	if (reaction === void 0) return state;
	const cooldown = state.reactionCooldowns.find((item) => item.reactionId === reaction.reactionId);
	if (!(primary === "species-unlock" || primary === "resonance-star" || primary === "level-up" || primary === "return") && cooldown !== void 0 && observation.at - cooldown.lastAt < 18e5) return state;
	if (state.moments.filter((moment) => moment.progressDay === observation.day).length >= 5) return state;
	const moment = {
		id: `moment-${stableSeed(observation.checkpoint).toString(36)}-${reaction.reactionId}`,
		progressDay: observation.day,
		at: observation.at,
		category: primary,
		species: state.species,
		reactionId: reaction.reactionId,
		templateId: reaction.templateId,
		visualSeed: stableSeed(`${observation.checkpoint}:${reaction.reactionId}`)
	};
	const { kept, removed } = compactMoments([...state.moments.filter((item) => item.id !== moment.id), moment]);
	const monthlyTides = mergeMonthly(state.monthlyTides, removed);
	const reactionCooldowns = [...state.reactionCooldowns.filter((item) => item.reactionId !== reaction.reactionId), {
		reactionId: reaction.reactionId,
		lastAt: observation.at
	}].sort((left, right) => left.lastAt - right.lastAt || left.reactionId.localeCompare(right.reactionId)).slice(-256);
	return {
		...state,
		moments: kept,
		monthlyTides,
		reactionCooldowns
	};
}
function refreshCollectibles(state, day) {
	const thresholds = [
		1,
		5,
		10,
		15,
		20,
		25,
		30,
		35,
		40,
		45,
		50,
		55,
		60,
		65,
		70,
		75,
		82,
		88,
		94,
		100
	];
	const earned = new Set(state.collectibles.map((item) => item.collectibleId));
	for (const [index, threshold] of thresholds.entries()) if (state.level >= threshold) earned.add(whaleCollectibleId[index]);
	if (state.achievements.includes("week-current")) earned.add("tidal-garden");
	if (state.achievements.includes("month-tide")) earned.add("whale-stone");
	if (resonanceStars(state.resonance[state.species] ?? 0) >= 5) earned.add("unknown-spire");
	const collectibles = whaleCollectibleId.filter((collectibleId) => earned.has(collectibleId)).map((collectibleId) => ({
		collectibleId,
		variant: 0,
		earnedProgressDay: day
	}));
	return {
		...state,
		collectibles
	};
}
function advanceExpedition(state, observation) {
	const expedition = state.expedition;
	if (expedition === null || expedition.rewardClaimed || observation.kind !== "turn" || state.lastActiveDay !== observation.day || expedition.lastAdvancedProgressDay === observation.day) return state;
	return {
		...state,
		expedition: {
			...expedition,
			progress: Math.min(expedition.goal, expedition.progress + 1),
			lastAdvancedProgressDay: observation.day
		}
	};
}
function unlock(state, event) {
	const earned = new Set(state.achievements);
	const add = (achievement, yes) => {
		if (yes) earned.add(achievement);
	};
	add("first-swim", state.sessions >= 1);
	add("ten-turns", state.turns >= 10);
	add("century", state.turns >= 100);
	add("week-current", state.streak >= 7);
	add("month-tide", state.streak >= 30);
	add("level-five", state.level >= 5);
	add("level-ten", state.level >= 10);
	const hour = new Date(event.at).getUTCHours();
	add("tool-diver", state.tools >= 25);
	add("early-bird", hour < 6);
	add("night-owl", hour >= 20);
	add("steady-fin", state.longestStreak >= 3);
	if (earned.size >= 8) earned.add("collector");
	return ACHIEVEMENTS.filter((achievement) => earned.has(achievement));
}
function compactMoments(moments) {
	const ordered = [...moments].sort((left, right) => left.at - right.at || left.id.localeCompare(right.id));
	const dayLimit = new Set([...new Set(ordered.map((moment) => moment.progressDay))].slice(-30));
	const kept = ordered.filter((moment) => dayLimit.has(moment.progressDay)).slice(-150);
	return {
		kept,
		removed: ordered.filter((moment) => !kept.some((current) => current.id === moment.id))
	};
}
function mergeMonthly(current, moments) {
	const byMonth = new Map(current.map((tide) => [tide.month, {
		month: tide.month,
		categoryCounts: { ...tide.categoryCounts },
		speciesSeen: [...tide.speciesSeen]
	}]));
	for (const moment of moments) {
		const value = byMonth.get(moment.progressDay.slice(0, 7)) ?? {
			month: moment.progressDay.slice(0, 7),
			categoryCounts: {},
			speciesSeen: []
		};
		value.categoryCounts[moment.category] = Math.min(1e6, (value.categoryCounts[moment.category] ?? 0) + 1);
		if (!value.speciesSeen.includes(moment.species)) value.speciesSeen.push(moment.species);
		byMonth.set(value.month, value);
	}
	return [...byMonth.values()].map((tide) => ({
		...tide,
		speciesSeen: tide.speciesSeen.sort()
	})).sort((left, right) => left.month.localeCompare(right.month)).slice(-24);
}
function parseBoundedJson(raw, label) {
	if (typeof raw !== "string") return raw;
	if (new TextEncoder().encode(raw).byteLength > 524288) throw new Error(`${label}过大，最大允许 512 KiB`);
	try {
		return JSON.parse(raw);
	} catch {
		throw new Error(`${label}不是有效 JSON`);
	}
}
function reactionMessage(templateId) {
	return reactionText[templateId] ?? "鲸鱼在海面留下了一段轻柔的潮汐。";
}
function bucket(value, boundaries) {
	return value <= boundaries[0] ? "0" : value <= boundaries[1] ? "1" : value <= boundaries[2] ? "2-4" : "5+";
}
function normalizeId(value) {
	const next = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
	return next === "" ? "open-sea" : next.slice(0, 80);
}
function stableSeed(value) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
	return hash >>> 0;
}
function unique(values) {
	return [...new Set(values)];
}
function dayOf$1(time) {
	return new Date(time).toISOString().slice(0, 10);
}
function utcDayOffset(before, after) {
	return Math.round((Date.parse(`${after}T00:00:00Z`) - Date.parse(`${before}T00:00:00Z`)) / 864e5);
}
//#endregion
//#region src/index.ts
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Local whale progression derived from event type, sequence, timestamp, and Session id only.
* Event contents never enter this service; recent receipt digests are intentionally bounded.
*/
let WhaleCompanionService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _get_decorators;
	let _getV5_decorators;
	let _setSkin_decorators;
	let _setName_decorators;
	let _setPosition_decorators;
	let _setSpecies_decorators;
	let _placeCollectible_decorators;
	let _saveRoomPreset_decorators;
	let _loadRoomPreset_decorators;
	let _startExpedition_decorators;
	let _claimExpedition_decorators;
	let _exportVisitorBottle_decorators;
	let _importVisitorBottle_decorators;
	let _setCommunity_decorators;
	let _exportCommunitySong_decorators;
	let _importCommunitySong_decorators;
	let _removeCommunityPeer_decorators;
	let _postcard_decorators;
	let _export_decorators;
	let _import_decorators;
	let _reset_decorators;
	return class WhaleCompanionService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_get_decorators = [Remote("get")];
			_getV5_decorators = [Remote("getV5")];
			_setSkin_decorators = [Remote("setSkin")];
			_setName_decorators = [Remote("setName")];
			_setPosition_decorators = [Remote("setPosition")];
			_setSpecies_decorators = [Remote("setSpeciesV5")];
			_placeCollectible_decorators = [Remote("placeCollectibleV5")];
			_saveRoomPreset_decorators = [Remote("saveRoomPresetV5")];
			_loadRoomPreset_decorators = [Remote("loadRoomPresetV5")];
			_startExpedition_decorators = [Remote("startExpeditionV5")];
			_claimExpedition_decorators = [Remote("claimExpeditionV5")];
			_exportVisitorBottle_decorators = [Remote("exportVisitorBottleV5")];
			_importVisitorBottle_decorators = [Remote("importVisitorBottleV5")];
			_setCommunity_decorators = [Remote("setCommunityV5")];
			_exportCommunitySong_decorators = [Remote("exportCommunitySongV5")];
			_importCommunitySong_decorators = [Remote("importCommunitySongV5")];
			_removeCommunityPeer_decorators = [Remote("removeCommunityPeerV5")];
			_postcard_decorators = [Remote("postcardV5")];
			_export_decorators = [Remote("export")];
			_import_decorators = [Remote("import")];
			_reset_decorators = [Remote("reset")];
			__esDecorate(this, null, _get_decorators, {
				kind: "method",
				name: "get",
				static: false,
				private: false,
				access: {
					has: (obj) => "get" in obj,
					get: (obj) => obj.get
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _getV5_decorators, {
				kind: "method",
				name: "getV5",
				static: false,
				private: false,
				access: {
					has: (obj) => "getV5" in obj,
					get: (obj) => obj.getV5
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setSkin_decorators, {
				kind: "method",
				name: "setSkin",
				static: false,
				private: false,
				access: {
					has: (obj) => "setSkin" in obj,
					get: (obj) => obj.setSkin
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setName_decorators, {
				kind: "method",
				name: "setName",
				static: false,
				private: false,
				access: {
					has: (obj) => "setName" in obj,
					get: (obj) => obj.setName
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setPosition_decorators, {
				kind: "method",
				name: "setPosition",
				static: false,
				private: false,
				access: {
					has: (obj) => "setPosition" in obj,
					get: (obj) => obj.setPosition
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setSpecies_decorators, {
				kind: "method",
				name: "setSpecies",
				static: false,
				private: false,
				access: {
					has: (obj) => "setSpecies" in obj,
					get: (obj) => obj.setSpecies
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _placeCollectible_decorators, {
				kind: "method",
				name: "placeCollectible",
				static: false,
				private: false,
				access: {
					has: (obj) => "placeCollectible" in obj,
					get: (obj) => obj.placeCollectible
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _saveRoomPreset_decorators, {
				kind: "method",
				name: "saveRoomPreset",
				static: false,
				private: false,
				access: {
					has: (obj) => "saveRoomPreset" in obj,
					get: (obj) => obj.saveRoomPreset
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _loadRoomPreset_decorators, {
				kind: "method",
				name: "loadRoomPreset",
				static: false,
				private: false,
				access: {
					has: (obj) => "loadRoomPreset" in obj,
					get: (obj) => obj.loadRoomPreset
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _startExpedition_decorators, {
				kind: "method",
				name: "startExpedition",
				static: false,
				private: false,
				access: {
					has: (obj) => "startExpedition" in obj,
					get: (obj) => obj.startExpedition
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _claimExpedition_decorators, {
				kind: "method",
				name: "claimExpedition",
				static: false,
				private: false,
				access: {
					has: (obj) => "claimExpedition" in obj,
					get: (obj) => obj.claimExpedition
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _exportVisitorBottle_decorators, {
				kind: "method",
				name: "exportVisitorBottle",
				static: false,
				private: false,
				access: {
					has: (obj) => "exportVisitorBottle" in obj,
					get: (obj) => obj.exportVisitorBottle
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _importVisitorBottle_decorators, {
				kind: "method",
				name: "importVisitorBottle",
				static: false,
				private: false,
				access: {
					has: (obj) => "importVisitorBottle" in obj,
					get: (obj) => obj.importVisitorBottle
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setCommunity_decorators, {
				kind: "method",
				name: "setCommunity",
				static: false,
				private: false,
				access: {
					has: (obj) => "setCommunity" in obj,
					get: (obj) => obj.setCommunity
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _exportCommunitySong_decorators, {
				kind: "method",
				name: "exportCommunitySong",
				static: false,
				private: false,
				access: {
					has: (obj) => "exportCommunitySong" in obj,
					get: (obj) => obj.exportCommunitySong
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _importCommunitySong_decorators, {
				kind: "method",
				name: "importCommunitySong",
				static: false,
				private: false,
				access: {
					has: (obj) => "importCommunitySong" in obj,
					get: (obj) => obj.importCommunitySong
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _removeCommunityPeer_decorators, {
				kind: "method",
				name: "removeCommunityPeer",
				static: false,
				private: false,
				access: {
					has: (obj) => "removeCommunityPeer" in obj,
					get: (obj) => obj.removeCommunityPeer
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _postcard_decorators, {
				kind: "method",
				name: "postcard",
				static: false,
				private: false,
				access: {
					has: (obj) => "postcard" in obj,
					get: (obj) => obj.postcard
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _export_decorators, {
				kind: "method",
				name: "export",
				static: false,
				private: false,
				access: {
					has: (obj) => "export" in obj,
					get: (obj) => obj.export
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _import_decorators, {
				kind: "method",
				name: "import",
				static: false,
				private: false,
				access: {
					has: (obj) => "import" in obj,
					get: (obj) => obj.import
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _reset_decorators, {
				kind: "method",
				name: "reset",
				static: false,
				private: false,
				access: {
					has: (obj) => "reset" in obj,
					get: (obj) => obj.reset
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["storageDomain", "sessions"];
		table = __runInitializers(this, _instanceExtraInitializers);
		tail = Promise.resolve();
		accepting = true;
		receiptKey = randomBytes(32);
		constructor(ctx) {
			super(ctx, "whaleCompanion");
		}
		async [Service.init]() {
			const domain = await this.ctx.storageDomain.open(whaleDomainSpec);
			this.table = domain.table("state");
			this.ctx.on("session/created", (session) => this.observe(async () => {
				const createdAt = session.header.createdAt;
				const at = typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : Date.now();
				await this.record({
					checkpoint: this.receipt("session-created", session.id, String(createdAt)),
					kind: "session",
					day: dayOf(at),
					at
				});
			}));
			this.ctx.on("session/event", (session, event) => this.observe(() => this.recordEvent(session, event)));
			this.ctx.on("session/flush", () => this.tail);
			this.ctx.effect(() => async () => {
				this.accepting = false;
				await this.tail;
				await domain.close();
			}, "whale-companion: drain and close durable domain");
		}
		async get() {
			await this.tail;
			return this.state();
		}
		async getV5() {
			return this.get();
		}
		async setSkin(skin) {
			const parsed = skinSchema.parse(skin);
			return this.enqueue(() => this.commit({
				...this.state(),
				skin: parsed,
				updatedAt: Date.now()
			}));
		}
		async setName(name) {
			const parsed = companionNameSchema.parse(name);
			return this.enqueue(() => this.commit({
				...this.state(),
				name: parsed,
				updatedAt: Date.now()
			}));
		}
		async setPosition(position) {
			const parsed = whalePositionSchema.parse(position);
			return this.enqueue(() => this.commit({
				...this.state(),
				position: parsed,
				updatedAt: Date.now()
			}));
		}
		async setSpecies(species) {
			const parsed = whaleSpeciesIdSchema.parse(species);
			return this.enqueue(() => this.commit(equipSpecies(this.state(), parsed)));
		}
		async placeCollectible(slot, collectible) {
			const parsedSlot = whaleRoomSlotIdSchema.parse(slot);
			const parsedCollectible = collectible === null ? null : whaleCollectibleIdSchema.parse(collectible);
			return this.enqueue(() => this.commit(placeCollectible(this.state(), parsedSlot, parsedCollectible)));
		}
		async saveRoomPreset() {
			return this.enqueue(() => this.commit(saveRoomPreset(this.state())));
		}
		async loadRoomPreset(index) {
			return this.enqueue(() => this.commit(loadRoomPreset(this.state(), index)));
		}
		async startExpedition(expeditionId, species, goal) {
			const parsedSpecies = whaleSpeciesIdSchema.parse(species);
			if (!Number.isSafeInteger(goal)) throw new Error("远征目标必须是安全整数");
			return this.enqueue(() => this.commit(startExpedition(this.state(), expeditionId, parsedSpecies, goal)));
		}
		async claimExpedition() {
			return this.enqueue(() => this.commit(claimExpedition(this.state())));
		}
		async exportVisitorBottle() {
			await this.tail;
			return exportVisitorBottle(this.state());
		}
		async importVisitorBottle(payload) {
			return importVisitorBottle(payload);
		}
		async setCommunity(enabled, aliasId) {
			return this.enqueue(() => this.commit(setCommunity(this.state(), enabled, whaleAliasIdSchema.parse(aliasId))));
		}
		async exportCommunitySong() {
			await this.tail;
			return exportCommunitySong(this.state());
		}
		async importCommunitySong(payload) {
			return this.enqueue(() => this.commit(importCommunitySong(this.state(), payload)));
		}
		async removeCommunityPeer(aliasId) {
			return this.enqueue(() => this.commit(removeCommunityPeer(this.state(), whaleAliasIdSchema.parse(aliasId))));
		}
		async postcard() {
			await this.tail;
			return postcardView(this.state());
		}
		async export() {
			await this.tail;
			return exportWhale(this.state());
		}
		async import(payload) {
			return this.enqueue(() => this.commit(importWhale(payload)));
		}
		async reset() {
			return this.enqueue(() => this.commit(resetWhale()));
		}
		recordEvent(session, event) {
			const kind = event.type === "tool/result" ? "tool" : event.type === "user/message" ? "turn" : void 0;
			if (kind === void 0) return Promise.resolve();
			return this.record({
				checkpoint: this.receipt("session-event", session.id, String(event.seq), event.type),
				kind,
				day: dayOf(event.time),
				at: event.time
			});
		}
		record(observation) {
			if (!this.accepting) return Promise.resolve();
			return this.enqueue(async () => {
				await this.commit(reduceWhale(this.state(), observation));
			});
		}
		receipt(scope, ...parts) {
			return `v5:${createHmac("sha256", this.receiptKey).update(`${scope}\0${parts.join("\0")}`, "utf8").digest("base64url")}`;
		}
		async observe(work) {
			if (!this.accepting) return;
			try {
				await work();
			} catch {
				this.ctx.logger.warn("Whale Companion could not save this progress update; later updates will still be accepted.");
			}
		}
		enqueue(work) {
			if (!this.accepting) return Promise.reject(/* @__PURE__ */ new Error("whale companion is closing"));
			const result = this.tail.then(work);
			this.tail = result.then(() => void 0, () => void 0);
			return result;
		}
		state() {
			return this.table?.get("global") ?? initialWhaleState();
		}
		async commit(state) {
			const next = Object.freeze(whaleStateSchema.parse(state));
			await this.requireTable().put("global", next);
			return next;
		}
		requireTable() {
			if (this.table === void 0) throw new Error("whale companion is not initialized");
			return this.table;
		}
	};
})();
function dayOf(time) {
	return new Date(time).toISOString().slice(0, 10);
}
//#endregion
export { ACHIEVEMENTS, COLLECTIBLES, COLLECTIBLE_BY_ID, MAX_IMPORT_BYTES, RESONANCE, RESONANCE_THRESHOLDS, WHALE_ALIAS_LABELS, WHALE_COLLECTIBLES, WHALE_COLLECTIBLE_BY_ID, WHALE_REACTION_MANIFEST, WHALE_SLOT_LABELS, WHALE_SPECIES, WHALE_SPECIES_BY_ID, WhaleCompanionService, WhaleCompanionService as default, XP, achievementIdSchema, claimExpedition, companionNameSchema, emptyRoomSlots, equipSpecies, exportCommunitySong, exportVisitorBottle, exportWhale, importCommunitySong, importVisitorBottle, importWhale, initialWhaleState, isSpeciesUnlocked, legacyLevelForXp, legacyWhaleStateSchema, levelForXp, loadRoomPreset, placeCollectible, postcardView, reduceWhale, removeCommunityPeer, resetWhale, resonanceStars, saveRoomPreset, setCommunity, skinSchema, startExpedition, whaleAliasId, whaleAliasIdSchema, whaleCollectibleId, whaleCollectibleIdSchema, whaleDomainSpec, whaleEventIdSchema, whalePositionSchema, whaleRoomSlotId, whaleRoomSlotIdSchema, whaleSpeciesId, whaleSpeciesIdSchema, whaleStateSchema, xpFloorForLevel, xpToNextLevel };

//# sourceMappingURL=index.js.map