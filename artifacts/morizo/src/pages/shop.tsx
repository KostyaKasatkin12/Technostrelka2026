import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Coins, Check, Lock, Loader2, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { ShopSkeleton } from "@/components/skeleton-cards";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AvatarHuman, type ShopItem, type EquippedItems } from "@/components/avatar-human";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

type ShopMe = {
  points: number;
  equipped: EquippedItems;
  purchased: string[];
  items: ShopItem[];
};

const SLOTS: { id: keyof EquippedItems; label: string }[] = [
  { id: "hat", label: "Головной убор" },
  { id: "glasses", label: "Очки" },
  { id: "shirt", label: "Футболка" },
  { id: "jacket", label: "Куртка" },
  { id: "pants", label: "Штаны" },
];

export default function Shop() {
  const { data: me } = useGetMe();
  const qc = useQueryClient();
  const [data, setData] = useState<ShopMe | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await fetch("/api/shop/me", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Не удалось загрузить магазин");
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки магазина");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function buy(item: ShopItem) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId: item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Покупка не удалась");
      toast.success(`«${item.name}» куплен`, {
        description: `Осталось ${json.remainingPoints} очков`,
      });
      await reload();
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка покупки");
    } finally {
      setBusy(null);
    }
  }

  async function equip(slot: keyof EquippedItems, itemId: string | null) {
    setBusy(`equip-${slot}-${itemId ?? "off"}`);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slot, itemId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Не удалось надеть");
      setData((d) => (d ? { ...d, equipped: json.equipped } : d));
      toast.success(itemId ? "Надето" : "Снято");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  if (!me?.user) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4">
        <div className="border-2 border-border bg-card p-6 text-center font-mono text-sm">
          Войдите в аккаунт, чтобы открыть магазин.
        </div>
      </div>
    );
  }

  if (!data) {
    return <ShopSkeleton />;
  }

  const itemsBySlot = (slot: string) =>
    data.items.filter((i) => i.slot === slot);

  return (
    <div className="page-fade container max-w-5xl mx-auto px-4 py-8 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            shop · одевалка
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase flex items-center gap-2">
            <Shirt className="h-7 w-7 text-primary" />
            Гардероб
          </h1>
        </div>
        <div className="flex items-center gap-2 border-2 border-border bg-card px-4 py-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm uppercase text-muted-foreground">
            Баланс
          </span>
          <span className="font-black text-xl">{data.points}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="border-2 border-border bg-card p-4 h-fit md:sticky md:top-20"
        >
          <div className="aspect-square bg-gradient-to-b from-background via-card to-background border-2 border-border mb-3 overflow-hidden">
            <AvatarHuman
              equipped={data.equipped}
              items={data.items}
              size={280}
            />
          </div>
          <div className="text-xs font-mono uppercase text-muted-foreground text-center">
            твой человечек · покрутить мышкой
          </div>
        </motion.div>

        <Tabs defaultValue="hat">
          <TabsList className="rounded-none border-2 border-border bg-card p-1 h-auto flex-wrap">
            {SLOTS.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="rounded-none font-bold uppercase font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SLOTS.map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {itemsBySlot(s.id).map((item, idx) => {
                  const owned = data.purchased.includes(item.id) || item.price === 0;
                  const equipped = data.equipped[s.id] === item.id;
                  return (
                    <Reveal key={item.id} delay={idx * 0.07}>
                    <div
                      className={`border-2 ${
                        equipped ? "border-primary" : "border-border"
                      } bg-card p-4 flex flex-col gap-3 hover-lift`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 border-2 border-border shrink-0"
                          style={{ background: item.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-black uppercase truncate">
                            {item.name}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground line-clamp-2">
                            {item.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1 font-mono font-bold">
                          {item.price === 0 ? (
                            <span className="text-xs uppercase text-muted-foreground">
                              базовый
                            </span>
                          ) : (
                            <>
                              <Coins className="h-4 w-4 text-primary" />
                              {item.price}
                            </>
                          )}
                        </div>
                        {owned ? (
                          equipped ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-none font-bold uppercase"
                              onClick={() => equip(s.id, null)}
                              disabled={busy?.startsWith(`equip-${s.id}`)}
                            >
                              Снять
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-none font-bold uppercase"
                              onClick={() => equip(s.id, item.id)}
                              disabled={busy?.startsWith(`equip-${s.id}`)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Надеть
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-none font-bold uppercase"
                            onClick={() => buy(item)}
                            disabled={busy === item.id || data.points < item.price}
                          >
                            {busy === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : data.points < item.price ? (
                              <Lock className="h-3.5 w-3.5 mr-1" />
                            ) : (
                              <Coins className="h-3.5 w-3.5 mr-1" />
                            )}
                            {data.points < item.price ? "Нет очков" : "Купить"}
                          </Button>
                        )}
                      </div>
                    </div>
                    </Reveal>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
