import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Shuffle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { avatarUrl, AVATAR_STYLES, type AvatarSlot } from "@/lib/avatars";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Props = {
  slots: AvatarSlot[];
  active: number;
  onChange: (slots: AvatarSlot[], active: number) => void;
  trigger?: React.ReactNode;
};

function randSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function AvatarPicker({ slots, active, onChange, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AvatarSlot[]>(slots);
  const [draftActive, setDraftActive] = useState(active);
  const [editingSlot, setEditingSlot] = useState(active);

  const updateDraftSlot = (idx: number, patch: Partial<AvatarSlot>) => {
    setDraft((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const save = () => {
    onChange(draft, draftActive);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setDraft(slots);
          setDraftActive(active);
          setEditingSlot(active);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="rounded-none border-2 font-bold uppercase">
            <Sparkles className="h-4 w-4 mr-2" />
            Сменить аватар
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-none border-2" open={open}>
        <DialogHeader>
          <DialogTitle className="font-black uppercase">Аватары — 3 слота</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-2">
          {draft.map((slot, idx) => (
            <motion.button
              key={idx}
              type="button"
              onClick={() => {
                setDraftActive(idx);
                setEditingSlot(idx);
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative border-2 p-3 flex flex-col items-center gap-2 transition-colors ${
                draftActive === idx
                  ? "border-primary bg-primary/10"
                  : editingSlot === idx
                  ? "border-secondary"
                  : "border-border bg-card"
              }`}
            >
              <img
                src={avatarUrl(slot, 96)}
                alt={`slot-${idx + 1}`}
                width={96}
                height={96}
                className="bg-muted"
              />
              <span className="font-mono text-xs uppercase">Слот {idx + 1}</span>
              {draftActive === idx && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground p-0.5">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <div className="border-2 border-border p-4 mt-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold uppercase text-sm">
              Редактировать слот {editingSlot + 1}
            </h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-none"
              onClick={() =>
                updateDraftSlot(editingSlot, { seed: randSeed() })
              }
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Случайный
            </Button>
          </div>

          <Tabs
            value={draft[editingSlot].style}
            onValueChange={(v) => updateDraftSlot(editingSlot, { style: v })}
          >
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 rounded-none bg-transparent">
              {AVATAR_STYLES.map((s) => (
                <TabsTrigger
                  key={s.id}
                  value={s.id}
                  className="rounded-none border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {AVATAR_STYLES.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const seed = `${draft[editingSlot].seed.split("-")[0] || "morizo"}-${s.id}-${i}`;
                    const isActive = draft[editingSlot].seed === seed;
                    return (
                      <motion.button
                        key={i}
                        type="button"
                        whileHover={{ y: -2 }}
                        onClick={() =>
                          updateDraftSlot(editingSlot, { seed, style: s.id })
                        }
                        className={`border-2 ${
                          isActive ? "border-primary" : "border-border"
                        } p-1 bg-background hover:border-primary`}
                      >
                        <img
                          src={avatarUrl({ style: s.id, seed }, 64)}
                          alt={seed}
                          width={64}
                          height={64}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-none"
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={save}
            className="rounded-none font-black uppercase"
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
