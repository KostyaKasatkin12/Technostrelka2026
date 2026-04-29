import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Trophy, Clock, Zap, ArrowLeft, CheckCircle, XCircle, Star, Medal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";
import { UserAvatar } from "@/components/avatar";
import { toast } from "sonner";

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
};

const ALL_QUESTIONS: Question[] = [
  { question: "Какой город называют «культурной столицей» России?", options: ["Москва", "Санкт-Петербург", "Казань", "Нижний Новгород"], correct: 1 },
  { question: "На берегу какой реки стоит Нижний Новгород?", options: ["Волга", "Ока", "Обе (слияние Волги и Оки)", "Дон"], correct: 2 },
  { question: "Как называется главная пешеходная улица Москвы?", options: ["Невский проспект", "Арбат", "Тверская", "Кузнецкий мост"], correct: 1 },
  { question: "Какой российский город известен своим Кремлём на Волге и Нижегородской ярмаркой?", options: ["Тверь", "Ярославль", "Нижний Новгород", "Саратов"], correct: 2 },
  { question: "Что такое «стрит-арт»?", options: ["Ночная гонка по улицам", "Уличное искусство на стенах и поверхностях", "Уличная еда", "Городской маршрут"], correct: 1 },
  { question: "Как называется набережная Санкт-Петербурга, где стоит Зимний дворец?", options: ["Дворцовая набережная", "Английская набережная", "Университетская набережная", "Набережная Мойки"], correct: 0 },
  { question: "Какой город носит прозвище «третья столица» России?", options: ["Новосибирск", "Екатеринбург", "Казань", "Сочи"], correct: 2 },
  { question: "Что означает термин «паркур» в городской культуре?", options: ["Городской арт-фестиваль", "Преодоление городских препятствий с помощью акробатики", "Карта городских маршрутов", "Уличная музыка"], correct: 1 },
  { question: "Какой российский город является самым восточным миллионником?", options: ["Иркутск", "Красноярск", "Новосибирск", "Хабаровск"], correct: 3 },
  { question: "Где находится знаменитая улица Баумана — пешеходная зона со скульптурами?", options: ["Нижний Новгород", "Казань", "Ярославль", "Самара"], correct: 1 },
  { question: "Что такое «флэшмоб»?", options: ["Граффити на всей улице", "Заранее спланированная массовая акция в публичном месте", "Ночная пробежка по городу", "Кража уличных знаков"], correct: 1 },
  { question: "Какой город называют «воротами в Сибирь»?", options: ["Пермь", "Тюмень", "Екатеринбург", "Омск"], correct: 2 },
  { question: "Как называется культурный феномен уличного исследования заброшенных зданий?", options: ["Граффити-тур", "Сталкинг / Урбанизм", "Юрбекс (Urban Exploration)", "Стрит-арт ивент"], correct: 2 },
  { question: "На каком острове расположен Петропавловский собор Петербурга?", options: ["Декабристов", "Заячий", "Крестовский", "Васильевский"], correct: 1 },
  { question: "Что такое «муралы»?", options: ["Городские квесты", "Крупноформатные уличные росписи на фасадах зданий", "Маршруты экскурсионных туров", "Маленькие граффити-наклейки"], correct: 1 },
];

type GamePhase = "intro" | "playing" | "result";
type AnswerState = "idle" | "correct" | "wrong";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TIME_PER_Q = 12;
const QUESTIONS_PER_GAME = 10;

export default function CityQuiz() {
  const { data: me } = useGetMe();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startGame = useCallback(() => {
    const qs = shuffle(ALL_QUESTIONS).slice(0, QUESTIONS_PER_GAME);
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setTimeLeft(TIME_PER_Q);
    setAnswerState("idle");
    setSelectedOption(null);
    setResults([]);
    setPhase("playing");
  }, []);

  const nextQuestion = useCallback(() => {
    setCurrent((c) => c + 1);
    setTimeLeft(TIME_PER_Q);
    setAnswerState("idle");
    setSelectedOption(null);
  }, []);

  const handleAnswer = useCallback((optionIdx: number) => {
    if (answerState !== "idle") return;
    stopTimer();
    const q = questions[current];
    const isCorrect = optionIdx === q.correct;
    const speedBonus = Math.round((timeLeft / TIME_PER_Q) * 50);
    const pts = isCorrect ? 100 + speedBonus : 0;
    setScore((s) => s + pts);
    setResults((r) => [...r, isCorrect]);
    setSelectedOption(optionIdx);
    setAnswerState(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setPhase("result");
      } else {
        nextQuestion();
      }
    }, 1200);
  }, [answerState, current, questions, timeLeft, stopTimer, nextQuestion]);

  useEffect(() => {
    if (phase !== "playing" || answerState !== "idle") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, current, answerState, handleAnswer]);

  useEffect(() => {
    if (phase !== "result") return;
    const submit = async () => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/minigames/city_quiz/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ score }),
        });
        if (res.ok) {
          const data = await res.json();
          setBestScore(data.bestScore);
          if (data.pointsEarned > 0) {
            toast.success(`+${data.pointsEarned} очков в профиль!`);
          }
        }
      } catch {}
      try {
        const lb = await fetch("/api/minigames/city_quiz/leaderboard", { credentials: "include" });
        if (lb.ok) setLeaderboard(await lb.json());
      } catch {}
      setSubmitting(false);
    };
    if (me?.user) submit();
    else {
      fetch("/api/minigames/city_quiz/leaderboard", { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(setLeaderboard).catch(() => {});
    }
  }, [phase, score, me?.user]);

  const correctCount = results.filter(Boolean).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  if (phase === "intro") {
    return (
      <div className="container max-w-screen-sm mx-auto px-4 py-16 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="text-7xl mb-6">🏙️</div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-3">Городской Квиз</h1>
          <p className="text-muted-foreground font-mono text-sm mb-2">
            {QUESTIONS_PER_GAME} вопросов · {TIME_PER_Q} сек на вопрос · Реальная конкуренция
          </p>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm">
            Проверь свои знания о городах, уличной культуре и городской жизни России. Быстрый ответ — больше очков!
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button onClick={startGame} size="lg" className="rounded-none font-black uppercase text-lg bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--secondary))] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_hsl(var(--secondary))] transition-all">
              <Zap className="mr-2 h-5 w-5" /> Начать игру
            </Button>
            <Link href="/games">
              <Button variant="outline" className="w-full rounded-none font-bold uppercase">
                <ArrowLeft className="mr-2 h-4 w-4" /> Все игры
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "playing") {
    const q = questions[current];
    const timerPct = (timeLeft / TIME_PER_Q) * 100;
    return (
      <div className="container max-w-screen-sm mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-mono text-muted-foreground uppercase">
            Вопрос {current + 1}/{questions.length}
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-black text-primary text-lg">{score}</span>
          </div>
        </div>

        <div className="h-2 w-full bg-muted mb-6 relative overflow-hidden">
          <motion.div
            className={`h-full transition-colors ${timeLeft <= 3 ? "bg-destructive" : "bg-primary"}`}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm font-mono">
          <Clock className={`h-4 w-4 ${timeLeft <= 3 ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
          <span className={timeLeft <= 3 ? "text-destructive font-black" : "text-muted-foreground"}>{timeLeft}с</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <div className="border-2 border-border bg-card p-6 mb-6">
              <p className="text-xl font-bold leading-snug">{q.question}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, i) => {
                let btnClass = "border-2 border-border bg-card hover:border-primary text-left font-mono text-sm transition-colors";
                if (answerState !== "idle") {
                  if (i === q.correct) btnClass = "border-2 border-green-500 bg-green-500/15 text-left font-mono text-sm";
                  else if (i === selectedOption) btnClass = "border-2 border-destructive bg-destructive/15 text-left font-mono text-sm";
                  else btnClass = "border-2 border-border bg-card/50 text-left font-mono text-sm opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answerState !== "idle"}
                    className={`${btnClass} p-4 rounded-none flex items-center gap-3`}
                  >
                    <span className="w-6 h-6 border border-current flex items-center justify-center text-xs font-black shrink-0">
                      {["А", "Б", "В", "Г"][i]}
                    </span>
                    {opt}
                    {answerState !== "idle" && i === q.correct && <CheckCircle className="ml-auto h-4 w-4 text-green-500 shrink-0" />}
                    {answerState !== "idle" && i === selectedOption && i !== q.correct && <XCircle className="ml-auto h-4 w-4 text-destructive shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="border-2 border-border bg-card p-8 text-center mb-4">
            <div className="text-5xl mb-3">
              {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "⭐" : accuracy >= 40 ? "🎯" : "💪"}
            </div>
            <h2 className="text-3xl font-black uppercase mb-1">Игра завершена!</h2>
            <div className="text-6xl font-black text-primary my-4">{score}</div>
            <div className="text-sm font-mono text-muted-foreground">очков</div>

            <div className="grid grid-cols-3 gap-3 mt-6 text-center">
              <div className="border border-border p-3">
                <div className="text-2xl font-black text-green-500">{correctCount}</div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Верно</div>
              </div>
              <div className="border border-border p-3">
                <div className="text-2xl font-black text-destructive">{questions.length - correctCount}</div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Неверно</div>
              </div>
              <div className="border border-border p-3">
                <div className="text-2xl font-black text-primary">{accuracy}%</div>
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Точность</div>
              </div>
            </div>

            {bestScore !== null && (
              <div className="mt-4 text-xs font-mono text-muted-foreground">
                Твой рекорд: <span className="text-primary font-black">{bestScore}</span>
              </div>
            )}

            {!me?.user && (
              <div className="mt-4 p-3 border border-primary bg-primary/10 text-xs font-mono text-primary">
                Войди, чтобы очки сохранялись в профиле
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={startGame} className="flex-1 rounded-none font-bold uppercase">
              <RotateCcw className="mr-2 h-4 w-4" /> Ещё раз
            </Button>
            <Link href="/games">
              <Button variant="outline" className="rounded-none font-bold uppercase">
                <ArrowLeft className="mr-2 h-4 w-4" /> Меню
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="border-2 border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-black uppercase">Таблица лидеров</h3>
            </div>

            {submitting && (
              <div className="text-xs font-mono text-muted-foreground text-center py-4">
                Сохраняем результат…
              </div>
            )}

            {leaderboard.length === 0 && !submitting && (
              <div className="text-xs font-mono text-muted-foreground text-center py-4">
                Будь первым!
              </div>
            )}

            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((row, i) => {
                const isMe = me?.user && row.userId === me.user.id;
                return (
                  <div key={row.userId} className={`flex items-center gap-3 p-2 ${isMe ? "border border-primary bg-primary/10" : "border border-border"}`}>
                    <div className="w-6 text-center font-black text-sm font-mono text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </div>
                    <UserAvatar slots={row.avatarSlots} active={row.activeAvatarSlot} nickname={row.nickname} size={28} />
                    <span className={`flex-1 text-sm font-mono font-bold truncate ${isMe ? "text-primary" : ""}`}>
                      {isMe ? "Ты" : `@${row.nickname}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Medal className="h-3 w-3 text-primary" />
                      <span className="text-sm font-black font-mono">{row.bestScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
