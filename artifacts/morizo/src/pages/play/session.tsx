import { useParams, Link, useLocation } from "wouter";
import {
  useGetSession,
  useSubmitAnswer,
  useAbandonSession,
  getGetSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lightbulb, Trophy, MapPin, Flag } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { QuestMap } from "@/components/quest-map";
import { motion, AnimatePresence } from "framer-motion";
import { CountUp } from "@/components/count-up";
import { CheckpointSuccess } from "@/components/checkpoint-success";

export default function PlaySession() {
  const params = useParams();
  const sessionId = Number(params.sessionId);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data, isLoading } = useGetSession(sessionId, {
    query: { refetchInterval: 6000 },
  });
  const submit = useSubmitAnswer();
  const abandon = useAbandonSession();

  const [code, setCode] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [completionBreakdown, setCompletionBreakdown] = useState<{
    checkpointPoints: number;
    completionBonus: number;
    speedBonus: number;
    elapsedSeconds: number;
    difficultyMultiplier: number;
    travelMultiplier: number;
    subtotal: number;
  } | null>(null);

  const [successOverlay, setSuccessOverlay] = useState<{
    checkpointName: string;
    pointsEarned: number;
  } | null>(null);

  const preSubmitScoreRef = useRef<number>(0);
  const pendingSuccessCheckpointRef = useRef<string | null>(null);
  const prevScoreRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSuccess = useCallback(() => setSuccessOverlay(null), []);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const triggerSuccess = useCallback(
    (checkpointName: string, pointsEarned: number) => {
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      pendingSuccessCheckpointRef.current = null;
      prevScoreRef.current = null;
      setSuccessOverlay({ checkpointName, pointsEarned });
    },
    [],
  );

  const currentScore = (data as any)?.session?.score;

  useEffect(() => {
    if (
      pendingSuccessCheckpointRef.current === null ||
      currentScore === undefined
    )
      return;
    if (prevScoreRef.current === null) return;

    const earned = currentScore - prevScoreRef.current;
    triggerSuccess(
      pendingSuccessCheckpointRef.current,
      earned > 0 ? earned : 0,
    );
  }, [currentScore, triggerSuccess]);

  if (isLoading || !data) {
    return (
      <div className="container max-w-screen-xl mx-auto py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { session, quest, checkpoints, answers } = data as any;
  const correctAnswers: any[] = (answers ?? []).filter((a: any) => a.correct);
  const completedSet = new Set<number>(
    correctAnswers.map((a) => a.checkpointId),
  );
  const currentCheckpoint =
    session.status === "in_progress" || session.status === "started"
      ? checkpoints[session.currentIndex]
      : null;
  const total = checkpoints.length;
  const doneCount = Math.min(session.currentIndex, total);

  const TRAVEL_MODE_LABEL: Record<string, string> = {
    foot: "Пешком ×1.2",
    public_transport: "Общ. транспорт ×1.0",
    transport: "Транспорт ×0.8",
    dirt_road: "Грунтовки ×1.3",
    off_road: "Без дорог ×1.5",
  };

  if (session.status === "completed") {
    const bd = completionBreakdown ?? session.scoreBreakdown ?? null;
    const formatElapsed = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
    };

    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        >
          <Trophy className="h-24 w-24 text-primary mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-5xl font-black uppercase"
        >
          Квест пройден!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45 }}
          className="text-xl text-muted-foreground"
        >
          Итоговый счёт:{" "}
          <span className="text-primary font-mono font-black text-2xl">
            <CountUp value={session.score} duration={1.4} />
          </span>
        </motion.p>

        {bd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.5 }}
            className="border-2 border-primary bg-card text-left p-5 space-y-3"
          >
            <h2 className="text-xs font-black uppercase text-primary tracking-widest mb-3">
              Детализация очков
            </h2>
            <div className="space-y-2 font-mono text-sm">
              {[
                {
                  label: "Очки за точки",
                  value: `+${bd.checkpointPoints}`,
                  delay: 0.5,
                },
                {
                  label: "Бонус завершения",
                  value: `+${bd.completionBonus}`,
                  delay: 0.58,
                },
                {
                  label: `Бонус скорости`,
                  value: `+${bd.speedBonus}`,
                  sub: `(${formatElapsed(bd.elapsedSeconds)})`,
                  delay: 0.66,
                },
              ].map((row) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: row.delay, duration: 0.35 }}
                  className="flex justify-between"
                >
                  <span className="text-muted-foreground">
                    {row.label}
                    {row.sub && (
                      <span className="text-xs text-muted-foreground/70 ml-2">
                        {row.sub}
                      </span>
                    )}
                  </span>
                  <span className="font-black">{row.value}</span>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.74, duration: 0.3 }}
                className="border-t border-border pt-2 flex justify-between text-muted-foreground"
              >
                <span>Промежуточная сумма</span>
                <span>{bd.subtotal}</span>
              </motion.div>

              {[
                {
                  label: "Множитель сложности",
                  value: `×${bd.difficultyMultiplier}`,
                  delay: 0.8,
                },
                {
                  label: "Множитель передвижения",
                  value: `×${bd.travelMultiplier}`,
                  sub:
                    session.travelMode
                      ? `(${TRAVEL_MODE_LABEL[session.travelMode]?.split(" ")[0] ?? session.travelMode})`
                      : undefined,
                  delay: 0.88,
                },
              ].map((row) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: row.delay, duration: 0.35 }}
                  className="flex justify-between"
                >
                  <span className="text-muted-foreground">
                    {row.label}
                    {row.sub && (
                      <span className="text-xs text-muted-foreground/70 ml-2">
                        {row.sub}
                      </span>
                    )}
                  </span>
                  <span className="font-black">{row.value}</span>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.96,
                  type: "spring",
                  stiffness: 280,
                  damping: 18,
                }}
                className="border-t-2 border-primary pt-2 flex justify-between text-primary text-base"
              >
                <span className="font-black uppercase">Итого</span>
                <span className="font-black">{session.score}</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: bd ? 1.1 : 0.45, duration: 0.4 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <Link href="/quests">
            <Button className="rounded-none h-12">К каталогу</Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" className="rounded-none h-12">
              Рейтинг
            </Button>
          </Link>
          <Link href="/achievements">
            <Button variant="outline" className="rounded-none h-12">
              Мои ачивки
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (session.status === "abandoned") {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-3xl font-black uppercase">Сессия завершена</h1>
        <p className="text-muted-foreground">Вы отказались от прохождения.</p>
        <Link href="/quests">
          <Button className="rounded-none h-12">К каталогу</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCheckpoint) return;
    const payload: any = { checkpointId: currentCheckpoint.id };
    if (currentCheckpoint.taskType === "code_word") {
      if (!code.trim()) return;
      payload.codeAnswer = code.trim();
    } else {
      if (choice === null) return;
      payload.choiceIndex = choice;
    }

    preSubmitScoreRef.current = session.score ?? 0;

    submit.mutate(
      { id: sessionId, data: payload },
      {
        onSuccess: (res: any) => {
          if (res.correct) {
            toast.success(res.message ?? "Точка взята!");
            setCode("");
            setChoice(null);
            setShowHint(false);
            if (res.completed && res.scoreBreakdown) {
              setCompletionBreakdown(res.scoreBreakdown);
            } else {
              prevScoreRef.current = preSubmitScoreRef.current;
              pendingSuccessCheckpointRef.current = currentCheckpoint.name;
              fallbackTimerRef.current = setTimeout(() => {
                if (pendingSuccessCheckpointRef.current !== null) {
                  triggerSuccess(pendingSuccessCheckpointRef.current, 0);
                }
              }, 800);
            }
          } else {
            toast.error(res.message ?? "Не верно, попробуй ещё раз");
          }
          qc.invalidateQueries({
            queryKey: getGetSessionQueryKey(sessionId),
          });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleAbandon = () => {
    if (!confirm("Точно отказаться от прохождения?")) return;
    abandon.mutate(
      { id: sessionId },
      {
        onSuccess: () => {
          toast("Сессия завершена");
          qc.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        },
      },
    );
  };

  return (
    <>
      <CheckpointSuccess
        visible={!!successOverlay}
        checkpointName={successOverlay?.checkpointName ?? ""}
        pointsEarned={successOverlay?.pointsEarned ?? 0}
        onDismiss={dismissSuccess}
      />

      <div className="container max-w-screen-xl mx-auto py-6 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Link href={`/quests/${quest?.id}`}>
            <Button variant="ghost" className="-ml-3">
              <MapPin className="h-4 w-4 mr-2" /> {quest?.title}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {session.travelMode && (
              <span className="hidden sm:inline text-xs font-mono text-muted-foreground border border-border px-2 py-0.5">
                {TRAVEL_MODE_LABEL[session.travelMode] ?? session.travelMode}
              </span>
            )}
            <span className="text-sm font-mono text-muted-foreground">
              Очков:{" "}
              <span className="text-primary font-black">{session.score}</span>
            </span>
            <Button
              onClick={handleAbandon}
              variant="ghost"
              size="sm"
              className="text-destructive"
            >
              <Flag className="h-4 w-4 mr-2" /> Сдаться
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span>
              Точка {Math.min(doneCount + 1, total)} / {total}
            </span>
            <span>
              {total > 0 ? Math.round((doneCount / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 border border-border bg-card">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{
                width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <QuestMap
              points={checkpoints.map((c: any, i: number) => ({
                lat: c.lat,
                lng: c.lng,
                name: c.name,
                index: i,
                done: completedSet.has(c.id),
                active: currentCheckpoint?.id === c.id,
              }))}
              height={420}
              travelMode={session.travelMode}
            />
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {currentCheckpoint && (
                <motion.div
                  key={currentCheckpoint.id}
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.96 }}
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 24,
                  }}
                  className="border-2 border-primary bg-card p-5 space-y-4"
                >
                  <div className="text-xs font-mono uppercase text-primary">
                    Текущая точка
                  </div>
                  <h2 className="text-2xl font-black uppercase">
                    {currentCheckpoint.name}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    {currentCheckpoint.lat.toFixed(4)},{" "}
                    {currentCheckpoint.lng.toFixed(4)}
                  </p>
                  <p className="text-foreground/90 whitespace-pre-line">
                    {currentCheckpoint.task}
                  </p>

                  {currentCheckpoint.rules && (
                    <div className="border border-secondary/40 bg-secondary/5 p-3 text-xs">
                      <span className="font-bold uppercase text-secondary">
                        Безопасность:{" "}
                      </span>
                      {currentCheckpoint.rules}
                    </div>
                  )}

                  {currentCheckpoint.hint && (
                    <div>
                      {showHint ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="border border-accent/40 bg-accent/5 p-3 text-sm"
                        >
                          <span className="font-bold uppercase text-accent">
                            Подсказка:{" "}
                          </span>
                          {currentCheckpoint.hint}
                        </motion.div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowHint(true)}
                          className="rounded-none"
                        >
                          <Lightbulb className="h-4 w-4 mr-2" /> Показать
                          подсказку
                        </Button>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    {currentCheckpoint.taskType === "code_word" ? (
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Введи кодовое слово"
                        className="rounded-none border-2 h-12 font-mono"
                        autoFocus
                      />
                    ) : (
                      <div className="space-y-2">
                        {currentCheckpoint.choiceOptions?.map(
                          (opt: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setChoice(i)}
                              className={`w-full text-left p-3 border-2 transition-colors ${
                                choice === i
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-card hover:border-primary/40"
                              }`}
                            >
                              <span className="font-mono font-black mr-3">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {opt}
                            </button>
                          ),
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submit.isPending}
                      className="w-full h-12 rounded-none font-black uppercase"
                    >
                      {submit.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Ответить"
                      )}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {correctAnswers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="border-2 border-border bg-card p-4"
                >
                  <h3 className="text-sm font-black uppercase text-muted-foreground mb-2">
                    Пройдено
                  </h3>
                  <ul className="space-y-1">
                    <AnimatePresence initial={false}>
                      {correctAnswers.map((a: any) => {
                        const cp = checkpoints.find(
                          (c: any) => c.id === a.checkpointId,
                        );
                        return (
                          <motion.li
                            key={a.checkpointId}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 320,
                              damping: 22,
                            }}
                            className="flex items-center gap-2 font-mono text-sm"
                          >
                            <span className="w-6 h-6 border-2 border-primary text-primary text-xs flex items-center justify-center">
                              ✓
                            </span>
                            <span className="truncate">{cp?.name}</span>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
