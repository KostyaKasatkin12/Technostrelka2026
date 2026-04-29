import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth.js";

export type ShopItem = {
  id: string;
  slot: "hat" | "shirt" | "pants" | "glasses" | "jacket";
  name: string;
  price: number;
  color?: string;
  description: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "hat_cap_neon", slot: "hat", name: "Неоновая кепка", price: 100, color: "#a3e635", description: "Светится в темноте даже без батарейки" },
  { id: "hat_beanie", slot: "hat", name: "Чёрная шапка", price: 80, color: "#0a0a0a", description: "Согреет на ночных квестах" },
  { id: "hat_helmet", slot: "hat", name: "Каска исследователя", price: 250, color: "#facc15", description: "Для самых рискованных маршрутов" },
  { id: "hat_crown", slot: "hat", name: "Корона чемпиона", price: 1000, color: "#fbbf24", description: "Только для тех, кто на вершине рейтинга" },
  // Glasses
  { id: "glasses_round", slot: "glasses", name: "Круглые очки", price: 60, color: "#0a0a0a", description: "Для умников и интеллектуалов" },
  { id: "glasses_vr", slot: "glasses", name: "VR-визор", price: 350, color: "#22d3ee", description: "Дополненная реальность для каждого" },
  { id: "glasses_sun", slot: "glasses", name: "Солнечные очки", price: 90, color: "#1e293b", description: "Стиль на любую погоду" },
  // Shirts
  { id: "shirt_white", slot: "shirt", name: "Белая футболка", price: 0, color: "#f8fafc", description: "Базовый комплект" },
  { id: "shirt_red", slot: "shirt", name: "Красная футболка", price: 50, color: "#ef4444", description: "Заметно издалека" },
  { id: "shirt_neon", slot: "shirt", name: "Неоновая футболка", price: 120, color: "#a3e635", description: "Фирменный цвет MORIZO" },
  { id: "shirt_pink", slot: "shirt", name: "Розовая футболка", price: 80, color: "#ec4899", description: "Для смелых решений" },
  // Pants
  { id: "pants_jeans", slot: "pants", name: "Джинсы", price: 0, color: "#3b82f6", description: "Удобно и практично" },
  { id: "pants_cargo", slot: "pants", name: "Карго", price: 100, color: "#65a30d", description: "Много карманов для квестов" },
  { id: "pants_sweat", slot: "pants", name: "Спортивки", price: 70, color: "#475569", description: "Бегать так бегать" },
  // Jackets
  { id: "jacket_hoodie", slot: "jacket", name: "Худи", price: 180, color: "#1f2937", description: "Капюшон спасёт от дождя" },
  { id: "jacket_bomber", slot: "jacket", name: "Бомбер", price: 220, color: "#0f766e", description: "Классика уличной моды" },
  { id: "jacket_neon", slot: "jacket", name: "Светоотражающая куртка", price: 400, color: "#a3e635", description: "Тебя видно из космоса" },
];

const router: Router = Router();

router.get("/shop/items", (_req: Request, res: Response): void => {
  res.json({ items: SHOP_ITEMS });
});

router.get("/shop/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const [u] = await db
    .select({
      points: usersTable.points,
      equipped: usersTable.equippedItems,
      purchased: usersTable.purchasedItems,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  res.json({
    points: u?.points ?? 0,
    equipped: u?.equipped ?? {},
    purchased: u?.purchased ?? [],
    items: SHOP_ITEMS,
  });
});

router.post("/shop/buy", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const itemId = String(req.body?.itemId ?? "");
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: "not_found", message: "Предмет не найден" });
    return;
  }
  const [u] = await db
    .select({
      points: usersTable.points,
      purchased: usersTable.purchasedItems,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "user_not_found", message: "Пользователь не найден" });
    return;
  }
  const purchased = u.purchased ?? [];
  if (purchased.includes(item.id)) {
    res.status(400).json({ error: "already_owned", message: "Этот предмет уже куплен" });
    return;
  }
  if ((u.points ?? 0) < item.price) {
    res.status(400).json({
      error: "insufficient_points",
      message: `Не хватает очков. Нужно ${item.price}, у вас ${u.points}.`,
    });
    return;
  }
  await db
    .update(usersTable)
    .set({
      points: (u.points ?? 0) - item.price,
      purchasedItems: [...purchased, item.id],
    })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true, item, remainingPoints: (u.points ?? 0) - item.price });
});

router.post("/shop/equip", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const itemId: string | null = req.body?.itemId ?? null;
  const slot: string = String(req.body?.slot ?? "");

  const validSlots = new Set(["hat", "shirt", "pants", "glasses", "jacket"]);
  if (!validSlots.has(slot)) {
    res.status(400).json({ error: "invalid_slot", message: "Неверный слот" });
    return;
  }

  const [u] = await db
    .select({
      equipped: usersTable.equippedItems,
      purchased: usersTable.purchasedItems,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "user_not_found", message: "Пользователь не найден" });
    return;
  }
  const equipped = { ...(u.equipped ?? {}) } as Record<string, string | undefined>;
  if (itemId === null || itemId === "") {
    delete equipped[slot];
  } else {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: "not_found", message: "Предмет не найден" });
      return;
    }
    if (item.slot !== slot) {
      res.status(400).json({ error: "wrong_slot", message: "Этот предмет в другом слоте" });
      return;
    }
    if (item.price > 0 && !(u.purchased ?? []).includes(itemId)) {
      res.status(403).json({ error: "not_owned", message: "Сначала купите этот предмет" });
      return;
    }
    equipped[slot] = itemId;
  }
  await db
    .update(usersTable)
    .set({ equippedItems: equipped as any })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true, equipped });
});

export default router;
