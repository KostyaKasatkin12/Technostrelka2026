import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  varchar,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ageGroupEnum = pgEnum("age_group", ["age_14_15", "age_16_17"]);
export const userRoleEnum = pgEnum("user_role", ["player", "moderator"]);
export const questStatusEnum = pgEnum("quest_status", [
  "draft",
  "moderation",
  "published",
  "archived",
  "rejected",
]);
export const taskTypeEnum = pgEnum("task_type", ["code_word", "choice"]);
export const sessionModeEnum = pgEnum("session_mode", ["solo", "team"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "started",
  "in_progress",
  "completed",
  "abandoned",
]);
export const travelModeEnum = pgEnum("travel_mode", [
  "foot",
  "transport",
  "public_transport",
  "dirt_road",
  "off_road",
]);
export const teamRoleEnum = pgEnum("team_role", ["captain", "member"]);
export const themeEnum = pgEnum("theme", ["neon", "sunset", "mono"]);

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    nickname: varchar("nickname", { length: 32 }).notNull(),
    ageGroup: ageGroupEnum("age_group").notNull(),
    role: userRoleEnum("role").notNull().default("player"),
    points: integer("points").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    bio: text("bio"),
    bannerUrl: text("banner_url"),
    city: varchar("city", { length: 64 }),
    theme: themeEnum("theme").notNull().default("neon"),
    avatarSlots: jsonb("avatar_slots")
      .$type<Array<{ style: string; seed: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    activeAvatarSlot: integer("active_avatar_slot").notNull().default(0),
    customAvatarUrl: text("custom_avatar_url"),
    customBannerUrl: text("custom_banner_url"),
    equippedItems: jsonb("equipped_items")
      .$type<{ hat?: string; shirt?: string; pants?: string; glasses?: string; jacket?: string }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    purchasedItems: jsonb("purchased_items")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    googleId: varchar("google_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    nicknameIdx: uniqueIndex("users_nickname_idx").on(t.nickname),
    googleIdx: index("users_google_idx").on(t.googleId),
  }),
);

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questsTable = pgTable(
  "quests",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    coverUrl: text("cover_url"),
    difficulty: integer("difficulty").notNull(),
    durationMin: integer("duration_min").notNull(),
    rules: text("rules"),
    status: questStatusEnum("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),
    authorId: integer("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    completionCount: integer("completion_count").notNull().default(0),
    avgRating: doublePrecision("avg_rating"),
    bestTravelMode: travelModeEnum("best_travel_mode"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index("quests_status_idx").on(t.status),
    cityIdx: index("quests_city_idx").on(t.city),
    difficultyIdx: index("quests_difficulty_idx").on(t.difficulty),
    createdIdx: index("quests_created_idx").on(t.createdAt),
  }),
);

export const checkpointsTable = pgTable(
  "checkpoints",
  {
    id: serial("id").primaryKey(),
    questId: integer("quest_id")
      .notNull()
      .references(() => questsTable.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    name: text("name").notNull(),
    task: text("task").notNull(),
    taskType: taskTypeEnum("task_type").notNull(),
    codeAnswer: text("code_answer"),
    choiceOptions: jsonb("choice_options").$type<string[]>(),
    choiceAnswerIndex: integer("choice_answer_index"),
    hint: text("hint"),
    rules: text("rules"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
  },
  (t) => ({
    questIdx: index("checkpoints_quest_idx").on(t.questId),
    questOrderIdx: uniqueIndex("checkpoints_quest_order_idx").on(
      t.questId,
      t.orderIndex,
    ),
  }),
);

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  joinCode: varchar("join_code", { length: 16 }).notNull().unique(),
  captainId: integer("captain_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembersTable = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqMember: uniqueIndex("team_members_unique").on(t.teamId, t.userId),
    teamIdx: index("team_members_team_idx").on(t.teamId),
    userIdx: index("team_members_user_idx").on(t.userId),
  }),
);

export const playSessionsTable = pgTable(
  "play_sessions",
  {
    id: serial("id").primaryKey(),
    questId: integer("quest_id")
      .notNull()
      .references(() => questsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    teamId: integer("team_id").references(() => teamsTable.id, {
      onDelete: "set null",
    }),
    mode: sessionModeEnum("mode").notNull(),
    status: sessionStatusEnum("status").notNull().default("started"),
    travelMode: travelModeEnum("travel_mode").notNull().default("foot"),
    currentIndex: integer("current_index").notNull().default(0),
    score: integer("score").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    lobbyCode: varchar("lobby_code", { length: 16 }),
    scoreBreakdown: jsonb("score_breakdown").$type<{
      checkpointPoints: number;
      completionBonus: number;
      speedBonus: number;
      elapsedSeconds: number;
      difficultyMultiplier: number;
      travelMultiplier: number;
      subtotal: number;
    }>(),
  },
  (t) => ({
    userIdx: index("play_sessions_user_idx").on(t.userId),
    questIdx: index("play_sessions_quest_idx").on(t.questId),
    statusIdx: index("play_sessions_status_idx").on(t.status),
    lobbyIdx: index("play_sessions_lobby_idx").on(t.lobbyCode),
  }),
);

export const reportsTable = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    questId: integer("quest_id").references(() => questsTable.id, {
      onDelete: "cascade",
    }),
    checkpointId: integer("checkpoint_id").references(() => checkpointsTable.id, {
      onDelete: "cascade",
    }),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    moderatorId: integer("moderator_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    moderatorNote: text("moderator_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => ({
    questIdx: index("reports_quest_idx").on(t.questId),
    statusIdx: index("reports_status_idx").on(t.status),
  }),
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId, t.createdAt),
  }),
);

export const sessionAnswersTable = pgTable(
  "session_answers",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => playSessionsTable.id, { onDelete: "cascade" }),
    checkpointId: integer("checkpoint_id")
      .notNull()
      .references(() => checkpointsTable.id, { onDelete: "cascade" }),
    answer: text("answer"),
    correct: boolean("correct").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: index("session_answers_session_idx").on(t.sessionId),
  }),
);

export const achievementsTable = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: varchar("icon", { length: 64 }),
    earnedAt: timestamp("earned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("achievements_user_idx").on(t.userId),
    uniqCode: uniqueIndex("achievements_user_code_idx").on(t.userId, t.code),
  }),
);

export const chatChannelKindEnum = pgEnum("chat_channel_kind", [
  "direct",
  "group",
  "quest",
  "team",
]);

export const chatChannelsTable = pgTable(
  "chat_channels",
  {
    id: serial("id").primaryKey(),
    kind: chatChannelKindEnum("kind").notNull(),
    title: text("title"),
    questId: integer("quest_id").references(() => questsTable.id, {
      onDelete: "cascade",
    }),
    teamId: integer("team_id").references(() => teamsTable.id, {
      onDelete: "cascade",
    }),
    createdById: integer("created_by_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    questIdx: uniqueIndex("chat_channels_quest_idx").on(t.questId),
    teamIdx: uniqueIndex("chat_channels_team_idx").on(t.teamId),
  }),
);

export const chatMembersTable = pgTable(
  "chat_members",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => chatChannelsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqMember: uniqueIndex("chat_members_unique").on(t.channelId, t.userId),
    channelIdx: index("chat_members_channel_idx").on(t.channelId),
    userIdx: index("chat_members_user_idx").on(t.userId),
  }),
);

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => chatChannelsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachment: jsonb("attachment").$type<
      | { kind: "quest_link"; questId: number }
      | { kind: "team_invite"; teamId: number; joinCode: string }
      | null
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    channelTimeIdx: index("chat_messages_channel_time_idx").on(
      t.channelId,
      t.createdAt,
    ),
  }),
);

export const wallPostsTable = pgTable(
  "wall_posts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("wall_posts_user_idx").on(t.userId),
    timeIdx: index("wall_posts_time_idx").on(t.createdAt),
  }),
);

export const wallReactionsTable = pgTable(
  "wall_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => wallPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 8 }).notNull(),
  },
  (t) => ({
    uniqReaction: uniqueIndex("wall_reactions_unique").on(t.postId, t.userId, t.emoji),
    postIdx: index("wall_reactions_post_idx").on(t.postId),
  }),
);

export const wallCommentsTable = pgTable(
  "wall_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => wallPostsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    postIdx: index("wall_comments_post_idx").on(t.postId),
  }),
);

export const miniGameScoresTable = pgTable(
  "mini_game_scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    gameId: varchar("game_id", { length: 32 }).notNull(),
    score: integer("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userGameIdx: index("mini_game_scores_user_game_idx").on(t.userId, t.gameId),
    gameScoreIdx: index("mini_game_scores_game_score_idx").on(t.gameId, t.score),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type Quest = typeof questsTable.$inferSelect;
export type Checkpoint = typeof checkpointsTable.$inferSelect;
export type Team = typeof teamsTable.$inferSelect;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type PlaySession = typeof playSessionsTable.$inferSelect;
export type SessionAnswer = typeof sessionAnswersTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
export type ChatChannel = typeof chatChannelsTable.$inferSelect;
export type ChatMember = typeof chatMembersTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type WallPost = typeof wallPostsTable.$inferSelect;
export type WallReaction = typeof wallReactionsTable.$inferSelect;
export type WallComment = typeof wallCommentsTable.$inferSelect;
export type MiniGameScore = typeof miniGameScoresTable.$inferSelect;
