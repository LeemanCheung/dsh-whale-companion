import { Context, Service } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { z } from "zod";
//#region src/spec.d.ts
declare const skinSchema: z.ZodEnum<{
  ocean: "ocean";
  coral: "coral";
  midnight: "midnight";
  aurora: "aurora";
  sunset: "sunset";
  nebula: "nebula";
}>;
declare const whalePositionSchema: z.ZodObject<{
  x: z.ZodNumber;
  y: z.ZodNumber;
}, z.core.$strict>;
type WhalePosition = z.infer<typeof whalePositionSchema>;
declare const achievementIdSchema: z.ZodEnum<{
  "first-swim": "first-swim";
  "ten-turns": "ten-turns";
  century: "century";
  "week-current": "week-current";
  "month-tide": "month-tide";
  "level-five": "level-five";
  "level-ten": "level-ten";
  "tool-diver": "tool-diver";
  "early-bird": "early-bird";
  "night-owl": "night-owl";
  "steady-fin": "steady-fin";
  collector: "collector";
}>;
declare const whaleStateSchema: z.ZodObject<{
  version: z.ZodLiteral<1>;
  xp: z.ZodNumber;
  level: z.ZodNumber;
  turns: z.ZodNumber;
  sessions: z.ZodNumber;
  tools: z.ZodNumber;
  streak: z.ZodNumber;
  longestStreak: z.ZodNumber;
  lastActiveDay: z.ZodOptional<z.ZodString>;
  checkpoints: z.ZodArray<z.ZodString>;
  achievements: z.ZodArray<z.ZodEnum<{
    "first-swim": "first-swim";
    "ten-turns": "ten-turns";
    century: "century";
    "week-current": "week-current";
    "month-tide": "month-tide";
    "level-five": "level-five";
    "level-ten": "level-ten";
    "tool-diver": "tool-diver";
    "early-bird": "early-bird";
    "night-owl": "night-owl";
    "steady-fin": "steady-fin";
    collector: "collector";
  }>>;
  skin: z.ZodEnum<{
    ocean: "ocean";
    coral: "coral";
    midnight: "midnight";
    aurora: "aurora";
    sunset: "sunset";
    nebula: "nebula";
  }>;
  position: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strict>;
  updatedAt: z.ZodNumber;
}, z.core.$strip>;
type WhaleState = z.infer<typeof whaleStateSchema>;
declare const whaleDomainSpec: {
  name: string;
  version: number;
  tables: {
    state: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
      version: 1;
      xp: number;
      level: number;
      turns: number;
      sessions: number;
      tools: number;
      streak: number;
      longestStreak: number;
      checkpoints: string[];
      achievements: ("first-swim" | "ten-turns" | "century" | "week-current" | "month-tide" | "level-five" | "level-ten" | "tool-diver" | "early-bird" | "night-owl" | "steady-fin" | "collector")[];
      skin: "ocean" | "coral" | "midnight" | "aurora" | "sunset" | "nebula";
      position: {
        x: number;
        y: number;
      };
      updatedAt: number;
      lastActiveDay?: string | undefined;
    }>;
  };
};
declare const initialWhaleState: () => WhaleState;
declare function levelForXp(xp: number): number;
//#endregion
//#region src/reducer.d.ts
type WhaleObservation = Readonly<{
  checkpoint: string;
  kind: 'turn' | 'tool' | 'session';
  day: string;
  at: number;
}>;
declare const XP: {
  readonly turn: 10;
  readonly tool: 5;
  readonly session: 20;
};
declare const ACHIEVEMENTS: ("first-swim" | "ten-turns" | "century" | "week-current" | "month-tide" | "level-five" | "level-ten" | "tool-diver" | "early-bird" | "night-owl" | "steady-fin" | "collector")[];
declare function reduceWhale(state: WhaleState, event: WhaleObservation): WhaleState;
declare function resetWhale(): WhaleState;
declare function exportWhale(state: WhaleState): string;
declare function importWhale(raw: unknown): WhaleState;
//#endregion
//#region src/types.d.ts
type WhaleSkin = z.infer<typeof skinSchema>;
type WhaleAchievementId = z.infer<typeof achievementIdSchema>;
type WhaleImport = Readonly<{
  payload: string;
}>;
//#endregion
//#region src/index.d.ts
declare module '@deepseek-ai/cordis' {
  interface Context {
    whaleCompanion: WhaleCompanionService;
  }
}
/** Local progress derived only from event type, sequence, timestamp, and Session id. */
declare class WhaleCompanionService extends TypertRemoteService {
  static inject: string[];
  private table?;
  private tail;
  private accepting;
  constructor(ctx: Context);
  protected [Service.init](): Promise<void>;
  get(): Promise<WhaleState>;
  setSkin(skin: WhaleState['skin']): Promise<WhaleState>;
  setPosition(position: WhalePosition): Promise<WhaleState>;
  export(): Promise<string>;
  import(payload: string): Promise<WhaleState>;
  reset(): Promise<WhaleState>;
  private recordEvent;
  private record;
  private enqueue;
  private state;
  private commit;
  private requireTable;
}
//#endregion
export { ACHIEVEMENTS, type WhaleAchievementId, WhaleCompanionService, WhaleCompanionService as default, type WhaleImport, WhaleObservation, WhalePosition, type WhaleSkin, WhaleState, XP, achievementIdSchema, exportWhale, importWhale, initialWhaleState, levelForXp, reduceWhale, resetWhale, skinSchema, whaleDomainSpec, whalePositionSchema, whaleStateSchema };
//# sourceMappingURL=index.d.ts.map