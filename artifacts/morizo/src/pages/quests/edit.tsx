import { useParams, useLocation, Link } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  useGetMe,
  useGetQuest,
  useUpdateQuest,
  useCreateCheckpoint,
  useUpdateCheckpoint,
  useDeleteCheckpoint,
  useSubmitQuest,
  getGetQuestQueryKey,
  getListCheckpointsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Send,
  MapPin,
  Upload,
  ImageIcon,
  Footprints,
  Bus,
  Car,
  Bike,
  Mountain,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { QuestStatusBadge } from "@/components/quest-status-badge";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { QuestMap } from "@/components/quest-map";

type TravelMode = "foot" | "transport" | "public_transport" | "dirt_road" | "off_road";

const TRAVEL_MODES: { value: TravelMode; label: string; icon: LucideIcon }[] = [
  { value: "foot", label: "Пешком", icon: Footprints },
  { value: "public_transport", label: "Общественный транспорт", icon: Bus },
  { value: "transport", label: "Личный транспорт", icon: Car },
  { value: "dirt_road", label: "По грунтовкам", icon: Bike },
  { value: "off_road", label: "Без дорог", icon: Mountain },
];

export default function QuestEdit() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetQuest(id);
  const update = useUpdateQuest();
  const submitQuest = useSubmitQuest();
  const createCp = useCreateCheckpoint();
  const updateCp = useUpdateCheckpoint();
  const deleteCp = useDeleteCheckpoint();

  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [meta, setMeta] = useState<{
    title: string;
    description: string;
    district: string;
    difficulty: number;
    durationMin: number;
    rules: string;
    coverUrl: string;
    bestTravelMode: TravelMode | null;
  } | null>(null);

  useEffect(() => {
    if (data?.quest && !meta) {
      setMeta({
        title: data.quest.title,
        description: data.quest.description,
        district: data.quest.district,
        difficulty: data.quest.difficulty,
        durationMin: data.quest.durationMin,
        rules: data.quest.rules ?? "",
        coverUrl: data.quest.coverUrl ?? "",
        bestTravelMode: (data.quest.bestTravelMode as TravelMode) ?? null,
      });
    }
  }, [data, meta]);

  const uploadCover = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Файл слишком большой (максимум 5 МБ)");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      setCoverUploading(true);
      try {
        const res = await fetch("/api/uploads/image", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? "Не удалось загрузить");
        setMeta((prev) => prev ? { ...prev, coverUrl: json.url } : prev);
        toast.success("Обложка загружена");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setCoverUploading(false);
        if (coverFileRef.current) coverFileRef.current.value = "";
      }
    },
    [],
  );

  if (isLoading || !data || !meta) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { quest, checkpoints } = data;
  const isOwner = me?.user?.id === quest.authorId;
  const isModerator = me?.user?.role === "moderator";
  if (!isOwner && !isModerator) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <p>У вас нет прав на редактирование этого квеста.</p>
      </div>
    );
  }

  const saveMeta = () => {
    update.mutate(
      {
        id,
        data: {
          title: meta.title,
          description: meta.description,
          district: meta.district,
          difficulty: meta.difficulty,
          durationMin: meta.durationMin,
          rules: meta.rules || undefined,
          coverUrl: meta.coverUrl || undefined,
          bestTravelMode: meta.bestTravelMode,
        },
      },
      {
        onSuccess: () => {
          toast.success("Изменения сохранены");
          qc.invalidateQueries({ queryKey: getGetQuestQueryKey(id) });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleSubmit = () => {
    submitQuest.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Отправлено модератору");
          qc.invalidateQueries({ queryKey: getGetQuestQueryKey(id) });
          setLocation(`/quests/${id}`);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const routePoints = checkpoints.map((c, i) => ({
    lat: c.lat,
    lng: c.lng,
    name: c.name,
    index: i,
  }));

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Link href={`/quests/${id}`}>
        <Button variant="ghost" className="mb-4 -ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> К квесту
        </Button>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase">
            Редактирование квеста
          </h1>
          <div className="mt-2">
            <QuestStatusBadge status={quest.status} />
          </div>
        </div>
        {(quest.status === "draft" || quest.status === "rejected") && (
          <Button
            onClick={handleSubmit}
            disabled={submitQuest.isPending}
            className="rounded-none h-12 font-black uppercase"
          >
            <Send className="h-4 w-4 mr-2" /> Отправить на модерацию
          </Button>
        )}
      </div>

      <section className="border-2 border-border bg-card p-5 space-y-4">
        <h2 className="text-xl font-black uppercase">Основные данные</h2>
        <div>
          <Label className="text-xs font-bold uppercase">Название</Label>
          <Input
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            className="rounded-none border-2 h-12 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase">Описание</Label>
          <Textarea
            value={meta.description}
            onChange={(e) =>
              setMeta({ ...meta, description: e.target.value })
            }
            rows={4}
            className="rounded-none border-2 mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold uppercase">Район</Label>
            <Input
              value={meta.district}
              onChange={(e) => setMeta({ ...meta, district: e.target.value })}
              className="rounded-none border-2 h-12 mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-bold uppercase">Обложка</Label>
            <div className="mt-1 flex flex-col gap-2">
              {meta.coverUrl ? (
                <div className="relative border-2 border-border bg-muted overflow-hidden h-36 w-full">
                  <img
                    src={meta.coverUrl}
                    alt="Обложка"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMeta({ ...meta, coverUrl: "" })}
                    className="absolute top-2 right-2 bg-background/80 border border-border px-2 py-0.5 text-xs font-mono hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Убрать
                  </button>
                </div>
              ) : (
                <div className="h-36 border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <input
                ref={coverFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={coverUploading}
                onClick={() => coverFileRef.current?.click()}
                className="rounded-none border-2 h-10 font-bold uppercase text-sm w-full"
              >
                {coverUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {coverUploading ? "Загрузка…" : "Загрузить обложку с компьютера"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">Сложность</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={meta.difficulty}
              onChange={(e) =>
                setMeta({ ...meta, difficulty: Number(e.target.value) })
              }
              className="rounded-none border-2 h-12 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">
              Длительность, мин
            </Label>
            <Input
              type="number"
              min={10}
              max={480}
              value={meta.durationMin}
              onChange={(e) =>
                setMeta({ ...meta, durationMin: Number(e.target.value) })
              }
              className="rounded-none border-2 h-12 mt-1"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase">Правила</Label>
          <Textarea
            value={meta.rules}
            onChange={(e) => setMeta({ ...meta, rules: e.target.value })}
            rows={3}
            className="rounded-none border-2 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase">Рекомендованный способ передвижения</Label>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 mb-2">
            Выбери способ передвижения, для которого лучше всего подходит этот маршрут. Игроки смогут фильтровать каталог по этому признаку.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {TRAVEL_MODES.map((m) => {
              const Icon = m.icon;
              const isActive = meta.bestTravelMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMeta({ ...meta, bestTravelMode: isActive ? null : m.value })}
                  className={`flex items-center gap-2 px-3 py-2 border-2 font-mono text-sm transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/60 text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <Button
          onClick={saveMeta}
          disabled={update.isPending}
          className="rounded-none h-12"
        >
          Сохранить
        </Button>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase">Точки маршрута</h2>
        </div>

        <div className="space-y-3">
          {checkpoints.map((c, i) => (
            <CheckpointCard
              key={c.id}
              index={i}
              cp={c}
              onUpdate={(patch) =>
                updateCp.mutate(
                  { checkpointId: c.id, data: patch },
                  {
                    onSuccess: () => {
                      toast.success("Точка обновлена");
                      qc.invalidateQueries({
                        queryKey: getGetQuestQueryKey(id),
                      });
                      qc.invalidateQueries({
                        queryKey: getListCheckpointsQueryKey(id),
                      });
                    },
                    onError: (err: Error) => toast.error(err.message),
                  },
                )
              }
              onDelete={() =>
                deleteCp.mutate(
                  { checkpointId: c.id },
                  {
                    onSuccess: () => {
                      toast.success("Точка удалена");
                      qc.invalidateQueries({
                        queryKey: getGetQuestQueryKey(id),
                      });
                    },
                    onError: (err: Error) => toast.error(err.message),
                  },
                )
              }
            />
          ))}
        </div>

        {checkpoints.length < 3 && (
          <div className="mt-3 border-2 border-secondary/60 bg-secondary/10 px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-bold font-mono text-secondary">
              Нужно ещё{" "}
              {3 - checkpoints.length === 1
                ? "1 точку"
                : `${3 - checkpoints.length} точки`}{" "}
              перед отправкой на модерацию
            </span>
          </div>
        )}

        <NewCheckpoint
          onCreate={(payload) =>
            createCp.mutate(
              { id, data: payload },
              {
                onSuccess: () => {
                  toast.success("Точка добавлена");
                  qc.invalidateQueries({ queryKey: getGetQuestQueryKey(id) });
                  qc.invalidateQueries({
                    queryKey: getListCheckpointsQueryKey(id),
                  });
                },
                onError: (err: Error) => toast.error(err.message),
              },
            )
          }
        />

        {routePoints.length > 0 && (
          <div className="mt-6 border-2 border-border bg-card p-4">
            <div className="text-xs font-mono uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Маршрут · {routePoints.length}{" "}
              {routePoints.length === 1
                ? "точка"
                : routePoints.length < 5
                ? "точки"
                : "точек"}
            </div>
            <QuestMap points={routePoints} height={340} travelMode="foot" />
          </div>
        )}
      </section>
    </div>
  );
}

type CpInput = {
  name: string;
  task: string;
  taskType: "code_word" | "choice";
  codeAnswer?: string;
  choiceOptions?: string[];
  choiceAnswerIndex?: number;
  hint?: string;
  rules?: string;
  lat: number;
  lng: number;
};

function CheckpointCard({
  index,
  cp,
  onUpdate,
  onDelete,
}: {
  index: number;
  cp: any;
  onUpdate: (patch: Partial<CpInput>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30"
      >
        <div className="shrink-0 w-10 h-10 border-2 border-primary text-primary font-black font-mono flex items-center justify-center">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold uppercase truncate">{cp.name}</div>
          <div className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
          </div>
        </div>
      </button>
      {open && (
        <CheckpointForm
          initial={cp}
          submitLabel="Сохранить точку"
          onSubmit={onUpdate}
          extraActions={
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="rounded-none"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Удалить
            </Button>
          }
        />
      )}
    </div>
  );
}

function NewCheckpoint({ onCreate }: { onCreate: (data: CpInput) => void }) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <Button
        onClick={() => setShow(true)}
        variant="outline"
        className="mt-4 rounded-none w-full h-12 border-2 border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" /> Добавить точку
      </Button>
    );
  }
  return (
    <div className="border-2 border-primary bg-card mt-4">
      <CheckpointForm
        submitLabel="Создать точку"
        onSubmit={(data) => {
          onCreate(data as CpInput);
          setShow(false);
        }}
        extraActions={
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShow(false)}
            className="rounded-none"
          >
            Отмена
          </Button>
        }
      />
    </div>
  );
}

const CP_NAME_MIN = 3;
const CP_TASK_MIN = 20;

function CheckpointForm({
  initial,
  submitLabel,
  onSubmit,
  extraActions,
}: {
  initial?: any;
  submitLabel: string;
  onSubmit: (data: any) => void;
  extraActions?: React.ReactNode;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [task, setTask] = useState(initial?.task ?? "");
  const [taskType, setTaskType] = useState<"code_word" | "choice">(
    initial?.taskType ?? "code_word",
  );
  const [codeAnswer, setCodeAnswer] = useState(initial?.codeAnswer ?? "");
  const [choiceOptions, setChoiceOptions] = useState<string>(
    (initial?.choiceOptions ?? ["Вариант 1", "Вариант 2"]).join("\n"),
  );
  const [choiceAnswerIndex, setChoiceAnswerIndex] = useState(
    initial?.choiceAnswerIndex ?? 0,
  );
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [rules, setRules] = useState(initial?.rules ?? "");
  const [lat, setLat] = useState<number>(initial?.lat ?? 56.3287);
  const [lng, setLng] = useState<number>(initial?.lng ?? 44.002);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const opts = choiceOptions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: any = {
      name,
      task,
      taskType,
      hint: hint || undefined,
      rules: rules || undefined,
      lat,
      lng,
    };
    if (taskType === "code_word") {
      payload.codeAnswer = codeAnswer;
    } else {
      payload.choiceOptions = opts;
      payload.choiceAnswerIndex = choiceAnswerIndex;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-3 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-bold uppercase">Название точки</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={CP_NAME_MIN}
            className="rounded-none border-2 mt-1"
          />
          <span className="text-[11px] font-mono tabular-nums mt-1 block text-muted-foreground">
            {name.length} симв.
          </span>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase">Тип задания</Label>
          <Select
            value={taskType}
            onValueChange={(v) => setTaskType(v as "code_word" | "choice")}
          >
            <SelectTrigger className="rounded-none border-2 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code_word">Кодовое слово</SelectItem>
              <SelectItem value="choice">Выбор ответа</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs font-bold uppercase">Задание</Label>
        <Textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          required
          minLength={CP_TASK_MIN}
          rows={3}
          className="rounded-none border-2 mt-1"
        />
        <span
          className={`text-[11px] font-mono tabular-nums mt-1 block ${
            task.length < CP_TASK_MIN ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {task.length < CP_TASK_MIN
            ? `Нужно ещё ${CP_TASK_MIN - task.length} симв. (${task.length} / ${CP_TASK_MIN})`
            : `${task.length} симв.`}
        </span>
      </div>
      {taskType === "code_word" ? (
        <div>
          <Label className="text-xs font-bold uppercase">
            Ответ (кодовое слово)
          </Label>
          <Input
            value={codeAnswer}
            onChange={(e) => setCodeAnswer(e.target.value)}
            required
            className="rounded-none border-2 mt-1"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold uppercase">
              Варианты (по одному в строке)
            </Label>
            <Textarea
              value={choiceOptions}
              onChange={(e) => setChoiceOptions(e.target.value)}
              rows={4}
              className="rounded-none border-2 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase">
              Номер правильного ответа (с 1)
            </Label>
            <Input
              type="number"
              min={1}
              value={choiceAnswerIndex + 1}
              onChange={(e) =>
                setChoiceAnswerIndex(Math.max(0, Number(e.target.value) - 1))
              }
              className="rounded-none border-2 mt-1"
            />
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs font-bold uppercase">Подсказка</Label>
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          className="rounded-none border-2 mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-bold uppercase">
          Правила безопасности на точке
        </Label>
        <Input
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          className="rounded-none border-2 mt-1"
        />
      </div>

      <div>
        <Label className="text-xs font-bold uppercase mb-2 block">
          Местоположение точки
        </Label>
        <CheckpointPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="rounded-none">
          {submitLabel}
        </Button>
        {extraActions}
      </div>
    </form>
  );
}

type AddressSuggestion = {
  displayName: string;
  value: string;
  lat: number;
  lng: number;
};

function CheckpointPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const initialCoordsRef = useRef<[number, number]>([lat, lng]);
  const debounceRef = useRef<number | null>(null);

  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;
    const [initLat, initLng] = initialCoordsRef.current;

    loadYandexMaps()
      .then((ymaps) => {
        if (cancelled || !mapContainerRef.current) return;
        ymapsRef.current = ymaps;

        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: [initLat, initLng], zoom: 15, controls: ["zoomControl"] },
          { suppressMapOpenBlock: true },
        );
        mapRef.current = map;

        const pm = new ymaps.Placemark(
          [initLat, initLng],
          { iconCaption: "Точка" },
          { preset: "islands#redCircleIcon", draggable: true },
        );
        placemarkRef.current = pm;
        map.geoObjects.add(pm);

        pm.events.add("dragend", () => {
          const coords = pm.geometry.getCoordinates();
          onChangeRef.current(coords[0], coords[1]);
        });

        map.events.add("click", (e: any) => {
          const coords = e.get("coords") as [number, number];
          pm.geometry.setCoordinates(coords);
          onChangeRef.current(coords[0], coords[1]);
        });
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        suggestContainerRef.current &&
        !suggestContainerRef.current.contains(e.target as Node)
      ) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function fetchSuggestions(query: string) {
    if (!ymapsRef.current?.geocode || !query.trim()) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setLoadingSuggest(true);
    ymapsRef.current
      .geocode(query, {
        results: 6,
        boundedBy: [
          [56.1, 43.7],
          [56.5, 44.3],
        ],
        strictBounds: false,
      })
      .then((result: any) => {
        const count: number = result.geoObjects.getLength();
        const items: AddressSuggestion[] = [];
        for (let i = 0; i < count; i++) {
          const obj = result.geoObjects.get(i);
          const coords = obj.geometry.getCoordinates() as [number, number];
          const text: string =
            obj.properties.get("text") ||
            obj.properties.get("name") ||
            query;
          items.push({ displayName: text, value: text, lat: coords[0], lng: coords[1] });
        }
        setSuggestions(items);
        setSuggestOpen(items.length > 0);
        setLoadingSuggest(false);
      })
      .catch(() => {
        setSuggestions([]);
        setLoadingSuggest(false);
      });
  }

  function handleAddressChange(v: string) {
    setAddress(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 400);
  }

  function pickSuggestion(s: AddressSuggestion) {
    setSuggestOpen(false);
    setAddress(s.value);
    const coords: [number, number] = [s.lat, s.lng];
    placemarkRef.current?.geometry.setCoordinates(coords);
    mapRef.current?.setCenter(coords, 16);
    onChangeRef.current(s.lat, s.lng);
  }

  return (
    <div className="space-y-2">
      <div ref={suggestContainerRef} className="relative">
        <div className="relative">
          <Input
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setSuggestOpen(true);
            }}
            placeholder="Начни вводить адрес или место…"
            className="rounded-none border-2 pr-8"
          />
          {loadingSuggest && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {suggestOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 border-2 border-border bg-popover shadow-[4px_4px_0px_0px_hsl(var(--primary))] max-h-52 overflow-auto">
            {suggestions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => pickSuggestion(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-2 border-b border-border/50 last:border-b-0"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span
                  dangerouslySetInnerHTML={{ __html: s.displayName }}
                  className="font-mono text-xs"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {mapError ? (
        <div className="h-52 border-2 border-destructive bg-destructive/5 flex items-center justify-center text-destructive text-xs font-mono">
          Карта недоступна
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="h-52 border-2 border-border w-full"
          style={{ position: "relative" }}
        />
      )}

      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3 text-primary" />
        {lat.toFixed(5)}, {lng.toFixed(5)} · кликни на карту или перетащи метку
      </div>
    </div>
  );
}
