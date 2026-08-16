import { Service } from "@deepseek-ai/cordis";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
//#region src/spec.ts
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const skinSchema = z.enum([
	"ocean",
	"coral",
	"midnight",
	"aurora",
	"sunset",
	"nebula"
]);
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
const whaleStateSchema = z.object({
	version: z.literal(1),
	xp: count,
	level: count,
	turns: count,
	sessions: count,
	tools: count,
	streak: count,
	longestStreak: count,
	lastActiveDay: day.optional(),
	checkpoints: z.array(z.string().min(1)).max(4096),
	achievements: z.array(achievementIdSchema),
	skin: skinSchema,
	position: whalePositionSchema,
	updatedAt: count
}).superRefine((state, ctx) => {
	if (state.level !== levelForXp(state.xp)) ctx.addIssue({
		code: "custom",
		path: ["level"],
		message: "level must match xp"
	});
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
});
const whaleDomainSpec = defineDomain({
	name: "whale_companion",
	version: 1,
	tables: { state: domainTable(whaleStateSchema) }
});
const initialWhaleState = () => ({
	version: 1,
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
	position: {
		x: .03,
		y: .08
	},
	updatedAt: 0
});
function levelForXp(xp) {
	return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}
//#endregion
//#region src/reducer.ts
const XP = {
	turn: 10,
	tool: 5,
	session: 20
};
const ACHIEVEMENTS = achievementIdSchema.options;
function reduceWhale(state, event) {
	if (state.checkpoints.includes(event.checkpoint)) return state;
	const xp = state.xp + XP[event.kind];
	const active = state.lastActiveDay === event.day;
	const previous = state.lastActiveDay;
	const adjacent = previous !== void 0 && utcDayOffset(previous, event.day) === 1;
	const streak = event.kind === "session" && !active ? adjacent ? state.streak + 1 : 1 : state.streak;
	const next = {
		...state,
		xp,
		level: levelForXp(xp),
		turns: state.turns + Number(event.kind === "turn"),
		tools: state.tools + Number(event.kind === "tool"),
		sessions: state.sessions + Number(event.kind === "session"),
		streak,
		longestStreak: Math.max(state.longestStreak, streak),
		lastActiveDay: event.kind === "session" ? event.day : state.lastActiveDay,
		checkpoints: [...state.checkpoints, event.checkpoint].slice(-4096),
		updatedAt: Math.max(state.updatedAt, event.at)
	};
	return {
		...next,
		achievements: unlock(next, event)
	};
}
function resetWhale() {
	return initialWhaleState();
}
function exportWhale(state) {
	return JSON.stringify({
		format: "dsh-whale-companion",
		version: 1,
		state
	});
}
function importWhale(raw) {
	const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
	if (typeof parsed !== "object" || parsed === null || parsed.format !== "dsh-whale-companion" || parsed.version !== 1) throw new Error("Invalid or unsupported whale export");
	return whaleStateSchema.parse(parsed.state);
}
function unlock(state, event) {
	const earned = new Set(state.achievements);
	const add = (id, yes) => {
		if (yes) earned.add(id);
	};
	add("first-swim", state.sessions >= 1);
	add("ten-turns", state.turns >= 10);
	add("century", state.turns >= 100);
	add("week-current", state.streak >= 7);
	add("month-tide", state.streak >= 30);
	add("level-five", state.level >= 5);
	add("level-ten", state.level >= 10);
	const utcHour = new Date(event.at).getUTCHours();
	add("tool-diver", state.tools >= 25);
	add("early-bird", utcHour < 6);
	add("night-owl", utcHour >= 20);
	add("steady-fin", state.longestStreak >= 3);
	add("collector", earned.size >= 8);
	return ACHIEVEMENTS.filter((id) => earned.has(id));
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
/** Local progress derived only from event type, sequence, timestamp, and Session id. */
let WhaleCompanionService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _get_decorators;
	let _setSkin_decorators;
	let _setPosition_decorators;
	let _export_decorators;
	let _import_decorators;
	let _reset_decorators;
	return class WhaleCompanionService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_get_decorators = [Remote("get")];
			_setSkin_decorators = [Remote("setSkin")];
			_setPosition_decorators = [Remote("setPosition")];
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
		constructor(ctx) {
			super(ctx, "whaleCompanion");
		}
		async [Service.init]() {
			const domain = await this.ctx.storageDomain.open(whaleDomainSpec);
			this.table = domain.table("state");
			this.ctx.on("session/created", (session) => {
				const at = Date.now();
				this.record(session, {
					checkpoint: `session:${session.id}:${session.header.createdAt}`,
					kind: "session",
					day: dayOf(at),
					at
				});
			});
			this.ctx.on("session/event", (session, event) => {
				this.recordEvent(session, event);
			});
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
		async setSkin(skin) {
			const parsed = skinSchema.parse(skin);
			return this.enqueue(() => this.commit({
				...this.state(),
				skin: parsed,
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
		async export() {
			await this.tail;
			return exportWhale(this.state());
		}
		async import(payload) {
			const imported = importWhale(payload);
			return this.enqueue(() => this.commit(imported));
		}
		async reset() {
			return this.enqueue(() => this.commit(resetWhale()));
		}
		recordEvent(session, event) {
			const kind = event.type === "tool/result" ? "tool" : event.type === "user/message" ? "turn" : void 0;
			if (kind === void 0) return Promise.resolve();
			return this.record(session, {
				checkpoint: `${session.id}:${event.seq}`,
				kind,
				day: dayOf(event.time),
				at: event.time
			});
		}
		record(_session, observation) {
			if (!this.accepting) return Promise.resolve();
			return this.enqueue(async () => {
				await this.commit(reduceWhale(this.state(), observation));
			});
		}
		enqueue(work) {
			const result = this.tail.then(work);
			this.tail = result.then(() => void 0, () => void 0);
			return result;
		}
		state() {
			return this.table?.get("global") ?? initialWhaleState();
		}
		async commit(state) {
			const next = Object.freeze({ ...state });
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
export { ACHIEVEMENTS, WhaleCompanionService, WhaleCompanionService as default, XP, achievementIdSchema, exportWhale, importWhale, initialWhaleState, levelForXp, reduceWhale, resetWhale, skinSchema, whaleDomainSpec, whalePositionSchema, whaleStateSchema };

//# sourceMappingURL=index.js.map