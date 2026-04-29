import { eq, sql, count, and, inArray } from "drizzle-orm";
import {
  db,
  questsTable,
  checkpointsTable,
  usersTable,
  playSessionsTable,
} from "@workspace/db";
import type { Quest, Checkpoint, User } from "@workspace/db";

export type QuestDTO = {
  id: number;
  title: string;
  description: string;
  city: string;
  district: string;
  coverUrl?: string;
  difficulty: number;
  durationMin: number;
  rules?: string;
  status: Quest["status"];
  rejectionReason?: string;
  authorId: number;
  authorNickname?: string;
  checkpointCount?: number;
  completionCount?: number;
  avgRating?: number;
  bestTravelMode?: Quest["bestTravelMode"];
  createdAt: Date;
  publishedAt?: Date;
};

export function questDto(
  quest: Quest,
  extras?: {
    authorNickname?: string;
    checkpointCount?: number;
  },
): QuestDTO {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    city: quest.city,
    district: quest.district,
    coverUrl: quest.coverUrl ?? undefined,
    difficulty: quest.difficulty,
    durationMin: quest.durationMin,
    rules: quest.rules ?? undefined,
    status: quest.status,
    rejectionReason: quest.rejectionReason ?? undefined,
    authorId: quest.authorId,
    authorNickname: extras?.authorNickname,
    checkpointCount: extras?.checkpointCount,
    completionCount: quest.completionCount,
    avgRating: quest.avgRating ?? undefined,
    bestTravelMode: quest.bestTravelMode ?? undefined,
    createdAt: quest.createdAt,
    publishedAt: quest.publishedAt ?? undefined,
  };
}

export function checkpointDto(c: Checkpoint, hideAnswer = false) {
  return {
    id: c.id,
    questId: c.questId,
    orderIndex: c.orderIndex,
    name: c.name,
    task: c.task,
    taskType: c.taskType,
    codeAnswer: hideAnswer ? undefined : c.codeAnswer ?? undefined,
    choiceOptions: c.choiceOptions ?? undefined,
    choiceAnswerIndex: hideAnswer ? undefined : c.choiceAnswerIndex ?? undefined,
    hint: c.hint ?? undefined,
    rules: c.rules ?? undefined,
    lat: c.lat,
    lng: c.lng,
  };
}

export function userDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    ageGroup: user.ageGroup,
    role: user.role,
    points: user.points,
    completedCount: user.completedCount,
    bio: user.bio ?? undefined,
    bannerUrl: user.bannerUrl ?? undefined,
    city: user.city ?? undefined,
    theme: user.theme,
    avatarSlots: user.avatarSlots ?? [],
    activeAvatarSlot: user.activeAvatarSlot,
    createdAt: user.createdAt,
  };
}

export async function attachQuestExtras(quests: Quest[]): Promise<QuestDTO[]> {
  if (quests.length === 0) return [];
  const ids = quests.map((q) => q.id);
  const authorIds = Array.from(new Set(quests.map((q) => q.authorId)));

  const [authors, cps] = await Promise.all([
    db
      .select({ id: usersTable.id, nickname: usersTable.nickname })
      .from(usersTable)
      .where(inArray(usersTable.id, authorIds)),
    db
      .select({
        questId: checkpointsTable.questId,
        n: count(checkpointsTable.id),
      })
      .from(checkpointsTable)
      .where(inArray(checkpointsTable.questId, ids))
      .groupBy(checkpointsTable.questId),
  ]);

  const authorMap = new Map(authors.map((a) => [a.id, a.nickname]));
  const cpMap = new Map(cps.map((c) => [c.questId, Number(c.n)]));

  return quests.map((q) =>
    questDto(q, {
      authorNickname: authorMap.get(q.authorId),
      checkpointCount: cpMap.get(q.id) ?? 0,
    }),
  );
}
