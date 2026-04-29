import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  db,
  usersTable,
  questsTable,
  checkpointsTable,
  teamsTable,
  teamMembersTable,
  achievementsTable,
  chatChannelsTable,
  chatMembersTable,
  chatMessagesTable,
  playSessionsTable,
} from "@workspace/db";

type SeedQuest = {
  title: string;
  description: string;
  district: string;
  difficulty: number;
  durationMin: number;
  rules: string;
  coverUrl: string;
  status: "published" | "moderation" | "draft";
  authorEmail: string;
  checkpoints: Array<{
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
  }>;
};

const SEED_USERS = [
  {
    email: "moderator@morizo.app",
    password: "demo123",
    nickname: "Модератор",
    ageGroup: "age_16_17" as const,
    role: "moderator" as const,
  },
  {
    email: "alex@morizo.app",
    password: "demo123",
    nickname: "Алекс",
    ageGroup: "age_16_17" as const,
    role: "player" as const,
  },
  {
    email: "kira@morizo.app",
    password: "demo123",
    nickname: "Кира",
    ageGroup: "age_14_15" as const,
    role: "player" as const,
  },
  {
    email: "max@morizo.app",
    password: "demo123",
    nickname: "Макс",
    ageGroup: "age_16_17" as const,
    role: "player" as const,
  },
  {
    email: "sonya@morizo.app",
    password: "demo123",
    nickname: "Соня",
    ageGroup: "age_14_15" as const,
    role: "player" as const,
  },
  {
    email: "demid@morizo.app",
    password: "demo123",
    nickname: "Демид",
    ageGroup: "age_16_17" as const,
    role: "player" as const,
  },
  {
    email: "polina@morizo.app",
    password: "demo123",
    nickname: "Полина",
    ageGroup: "age_14_15" as const,
    role: "player" as const,
  },
];

const SEED_QUESTS: SeedQuest[] = [
  {
    title: "Тайны нижегородского Кремля",
    description:
      "Прогулка по самой древней крепости города. Раскрой загадки башен и найди артефакты, спрятанные между стенами.",
    district: "Нижегородский",
    difficulty: 2,
    durationMin: 90,
    rules:
      "Не заходи за ограждения. Веди себя спокойно у мемориала. Береги исторические объекты.",
    coverUrl:
      "https://visaliv.s3.ap-south-1.amazonaws.com/Nizhny-Novgorod-Kremlin-Russia.jpg",
    status: "published",
    authorEmail: "alex@morizo.app",
    checkpoints: [
      {
        name: "Дмитриевская башня",
        task: "Главные ворота Кремля. Сколько колец на гербе над входом? Введи число словом.",
        taskType: "code_word",
        codeAnswer: "три",
        hint: "Три кольца — древний символ единства.",
        lat: 56.3286,
        lng: 44.0028,
      },
      {
        name: "Памятник Минину и Пожарскому",
        task: "Какой век указан на постаменте?",
        taskType: "choice",
        choiceOptions: ["XV", "XVII", "XIX", "XX"],
        choiceAnswerIndex: 1,
        lat: 56.3278,
        lng: 44.0027,
        rules: "Не залезай на постамент.",
      },
      {
        name: "Михайло-Архангельский собор",
        task: "Найди табличку с именем зодчего. Введи фамилию.",
        taskType: "code_word",
        codeAnswer: "Возоулин",
        hint: "Имя начинается на В, заканчивается на н.",
        lat: 56.3290,
        lng: 44.0047,
      },
      {
        name: "Чкаловская лестница",
        task: "Сколько маршей у лестницы?",
        taskType: "choice",
        choiceOptions: ["280", "442", "560", "700"],
        choiceAnswerIndex: 1,
        lat: 56.3288,
        lng: 44.0060,
      },
    ],
  },
  {
    title: "Стрит-арт Покровки",
    description:
      "Современная пешеходная улица с граффити, муралами и арт-объектами. Найди скрытые работы уличных художников.",
    district: "Нижегородский",
    difficulty: 1,
    durationMin: 60,
    rules: "Не порти стены, не клей наклейки.",
    coverUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
    status: "published",
    authorEmail: "kira@morizo.app",
    checkpoints: [
      {
        name: "Скульптура «Весёлая коза»",
        task: "Что держит коза? Одно слово.",
        taskType: "code_word",
        codeAnswer: "афиша",
        lat: 56.3219,
        lng: 44.0012,
      },
      {
        name: "Дом с атлантами",
        task: "Сколько атлантов держат балкон?",
        taskType: "choice",
        choiceOptions: ["2", "4", "6", "8"],
        choiceAnswerIndex: 0,
        lat: 56.3171,
        lng: 43.9948,
      },
      {
        name: "Памятник почтальону",
        task: "Какое животное рядом с почтальоном?",
        taskType: "code_word",
        codeAnswer: "собака",
        hint: "Лучший друг человека.",
        lat: 56.3201,
        lng: 44.0003,
      },
    ],
  },
  {
    title: "Закаты Верхне-Волжской набережной",
    description:
      "Маршрут по знаменитой набережной с видом на Стрелку. Идеален для тёплых вечеров.",
    district: "Нижегородский",
    difficulty: 2,
    durationMin: 75,
    rules: "Не подходи близко к обрывам.",
    coverUrl:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200",
    status: "published",
    authorEmail: "max@morizo.app",
    checkpoints: [
      {
        name: "Памятник Чкалову",
        task: "В каком году совершён беспосадочный перелёт через Северный полюс?",
        taskType: "choice",
        choiceOptions: ["1934", "1937", "1941", "1945"],
        choiceAnswerIndex: 1,
        lat: 56.3287,
        lng: 44.0056,
      },
      {
        name: "Усадьба Рукавишниковых",
        task: "Стиль фасада в одном слове.",
        taskType: "code_word",
        codeAnswer: "эклектика",
        hint: "Смешение разных архитектурных стилей.",
        lat: 56.3294,
        lng: 44.0128,
      },
      {
        name: "Смотровая на Стрелку",
        task: "Слияние каких рек видно?",
        taskType: "choice",
        choiceOptions: ["Волга и Кама", "Волга и Ока", "Ока и Кама", "Волга и Дон"],
        choiceAnswerIndex: 1,
        lat: 56.3293,
        lng: 44.0161,
      },
    ],
  },
  {
    title: "Канатная дорога: маршрут над Волгой",
    description:
      "Прокатись над великой рекой и узнай, как устроена самая длинная пассажирская канатка в Европе.",
    district: "Нижегородский",
    difficulty: 1,
    durationMin: 45,
    rules: "Не вставай в кабинке, держись за поручни.",
    coverUrl:
      "https://cdn-imgix.headout.com/media/images/c95e8c9e07c4a822f676e05358254fd3-Telecabine%20Lisbon%20Experience.jpg?auto=compress&w=1200",
    status: "published",
    authorEmail: "sonya@morizo.app",
    checkpoints: [
      {
        name: "Станция «Нижний»",
        task: "Город-побратим на другом конце канатки?",
        taskType: "code_word",
        codeAnswer: "Бор",
        lat: 56.3263,
        lng: 44.0260,
      },
      {
        name: "Смотровая на опору канатки",
        task: "Сколько примерно метров высота над водой?",
        taskType: "choice",
        choiceOptions: ["20", "50", "82", "120"],
        choiceAnswerIndex: 2,
        lat: 56.3268,
        lng: 44.0272,
      },
      {
        name: "Станция «Бор»",
        task: "Год открытия канатки?",
        taskType: "choice",
        choiceOptions: ["2010", "2012", "2014", "2018"],
        choiceAnswerIndex: 1,
        lat: 56.3590,
        lng: 44.0680,
      },
    ],
  },
  {
    title: "Литературный квест: Горький в городе",
    description:
      "Маршрут по местам, связанным с жизнью Максима Горького. Откроешь город глазами писателя.",
    district: "Нижегородский",
    difficulty: 3,
    durationMin: 120,
    rules: "Уважай экспозиции в музеях, не используй вспышку.",
    coverUrl:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200",
    status: "published",
    authorEmail: "alex@morizo.app",
    checkpoints: [
      {
        name: "Домик Каширина",
        task: "Настоящая фамилия Горького?",
        taskType: "code_word",
        codeAnswer: "Пешков",
        hint: "Первая буква П.",
        lat: 56.3238,
        lng: 44.0052,
      },
      {
        name: "Музей-квартира Горького",
        task: "В каком году писатель уехал из города?",
        taskType: "choice",
        choiceOptions: ["1898", "1904", "1910", "1917"],
        choiceAnswerIndex: 1,
        lat: 56.3247,
        lng: 43.9963,
      },
      {
        name: "Памятник Горькому на площади",
        task: "Площадь названа в честь писателя — введи слово, которое стоит после «площадь».",
        taskType: "code_word",
        codeAnswer: "Горького",
        lat: 56.3141,
        lng: 43.9915,
      },
      {
        name: "Театр драмы",
        task: "По какой пьесе Горького гремел театр?",
        taskType: "choice",
        choiceOptions: ["Мещане", "На дне", "Дачники", "Васса Железнова"],
        choiceAnswerIndex: 1,
        lat: 56.3207,
        lng: 44.0010,
      },
    ],
  },
  {
    title: "Сормово индустриальное",
    description:
      "Промышленный север города. Заводская архитектура, музей истории и легенды о судостроителях.",
    district: "Сормовский",
    difficulty: 2,
    durationMin: 90,
    rules: "Не заходи на территорию действующих предприятий.",
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
    status: "published",
    authorEmail: "demid@morizo.app",
    checkpoints: [
      {
        name: "Дворец культуры «Красное Сормово»",
        task: "Стиль здания одним словом.",
        taskType: "code_word",
        codeAnswer: "конструктивизм",
        lat: 56.3866,
        lng: 43.8698,
      },
      {
        name: "Спасо-Преображенский собор",
        task: "Сколько куполов у собора?",
        taskType: "choice",
        choiceOptions: ["1", "3", "5", "7"],
        choiceAnswerIndex: 2,
        lat: 56.3871,
        lng: 43.8742,
      },
      {
        name: "Музей истории завода «Красное Сормово»",
        task: "Год основания завода?",
        taskType: "choice",
        choiceOptions: ["1849", "1881", "1905", "1922"],
        choiceAnswerIndex: 0,
        lat: 56.3892,
        lng: 43.8678,
      },
    ],
  },
  {
    title: "Автозавод: история и настоящее",
    description:
      "Маршрут по соцгороду: культовые жилые дома, парк культуры и техника на постаментах.",
    district: "Автозаводский",
    difficulty: 2,
    durationMin: 80,
    rules: "Не лезь на технику-памятник.",
    coverUrl:
      "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200",
    status: "published",
    authorEmail: "polina@morizo.app",
    checkpoints: [
      {
        name: "Площадь Киселёва",
        task: "Какая модель автомобиля стоит на постаменте?",
        taskType: "code_word",
        codeAnswer: "ГАЗ-АА",
        hint: "Полуторка.",
        lat: 56.2411,
        lng: 43.8620,
      },
      {
        name: "Дворец культуры ГАЗ",
        task: "Архитектор здания?",
        taskType: "choice",
        choiceOptions: ["Веснин", "Гольц", "Иофан", "Жолтовский"],
        choiceAnswerIndex: 0,
        lat: 56.2445,
        lng: 43.8580,
      },
      {
        name: "Парк культуры Автозавода",
        task: "Что в центре парка?",
        taskType: "choice",
        choiceOptions: ["Колесо обозрения", "Памятник", "Фонтан", "Эстрада"],
        choiceAnswerIndex: 2,
        lat: 56.2416,
        lng: 43.8400,
      },
    ],
  },
  {
    title: "Печёрский монастырь и набережная",
    description:
      "Тихий восточный край Нижнего: древний монастырь и виды на Волгу, которых не покажут туристам.",
    district: "Нижегородский",
    difficulty: 2,
    durationMin: 70,
    rules:
      "На территории монастыря — тихо, головной убор по правилам места.",
    coverUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5b/Nizhny_Novgorod_Pechersky_Monastery.JPG",
    status: "published",
    authorEmail: "kira@morizo.app",
    checkpoints: [
      {
        name: "Святые ворота",
        task: "Век основания монастыря?",
        taskType: "choice",
        choiceOptions: ["XII", "XIV", "XVI", "XVIII"],
        choiceAnswerIndex: 1,
        lat: 56.3231,
        lng: 44.0447,
      },
      {
        name: "Колокольня",
        task: "Введи слово: что висит на верхнем ярусе.",
        taskType: "code_word",
        codeAnswer: "колокола",
        lat: 56.3233,
        lng: 44.0452,
      },
      {
        name: "Смотровая на Печёрском съезде",
        task: "Через какую реку открывается вид?",
        taskType: "code_word",
        codeAnswer: "Волга",
        lat: 56.3237,
        lng: 44.0458,
      },
    ],
  },
  {
    title: "Экспресс-квест по Большой Покровской",
    description:
      "Быстрый маршрут на 30 минут — идеален, если есть свободный час между занятиями.",
    district: "Нижегородский",
    difficulty: 1,
    durationMin: 30,
    rules: "Береги вещи на людной улице.",
    coverUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200",
    status: "published",
    authorEmail: "sonya@morizo.app",
    checkpoints: [
      {
        name: "Скульптура чистильщика обуви",
        task: "Что у чистильщика на голове?",
        taskType: "code_word",
        codeAnswer: "кепка",
        lat: 56.3220,
        lng: 44.0030,
      },
      {
        name: "Памятник городовому",
        task: "В какой руке свисток?",
        taskType: "choice",
        choiceOptions: ["Левой", "Правой", "Без свистка", "На груди"],
        choiceAnswerIndex: 1,
        lat: 56.3209,
        lng: 44.0020,
      },
      {
        name: "Театральная площадь",
        task: "Кому памятник перед театром?",
        taskType: "code_word",
        codeAnswer: "Добролюбов",
        lat: 56.3220,
        lng: 44.0009,
      },
    ],
  },
  {
    title: "Загадки Щёлковского хутора",
    description:
      "Музей деревянного зодчества под открытым небом. Походи между настоящими избами XIX века.",
    district: "Советский",
    difficulty: 2,
    durationMin: 90,
    rules: "Не входи в избы без разрешения смотрителя.",
    coverUrl:
      "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=1200",
    status: "published",
    authorEmail: "demid@morizo.app",
    checkpoints: [
      {
        name: "Изба Павловой",
        task: "Из какого дерева сруб?",
        taskType: "code_word",
        codeAnswer: "сосна",
        lat: 56.2760,
        lng: 44.0130,
      },
      {
        name: "Ветряная мельница",
        task: "Сколько лопастей?",
        taskType: "choice",
        choiceOptions: ["2", "3", "4", "6"],
        choiceAnswerIndex: 2,
        lat: 56.2764,
        lng: 44.0148,
      },
      {
        name: "Часовня",
        task: "Материал крыши одним словом.",
        taskType: "code_word",
        codeAnswer: "лемех",
        hint: "Деревянная чешуя.",
        lat: 56.2768,
        lng: 44.0162,
      },
    ],
  },
  {
    title: "Стрелка: слияние истории и спорта",
    description:
      "Маршрут по Канавинскому берегу: ярмарка, речной вокзал, стадион и место, где сливаются Волга с Окой.",
    district: "Канавинский",
    difficulty: 2,
    durationMin: 80,
    rules: "Соблюдай правила движения. На территории стадиона — без матча не заходить.",
    coverUrl:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200",
    status: "published",
    authorEmail: "max@morizo.app",
    checkpoints: [
      {
        name: "Нижегородская ярмарка",
        task: "В каком году прошла первая Нижегородская ярмарка?",
        taskType: "choice",
        choiceOptions: ["1817", "1861", "1896", "1913"],
        choiceAnswerIndex: 0,
        lat: 56.3373,
        lng: 43.9638,
      },
      {
        name: "Речной вокзал",
        task: "Введи название реки, по которой ходят суда прямо у вокзала.",
        taskType: "code_word",
        codeAnswer: "Волга",
        hint: "Великая русская река.",
        lat: 56.3418,
        lng: 43.9543,
      },
      {
        name: "Стадион «Нижний Новгород»",
        task: "В каком году стадион принял матчи Чемпионата мира по футболу?",
        taskType: "choice",
        choiceOptions: ["2014", "2016", "2018", "2022"],
        choiceAnswerIndex: 2,
        lat: 56.3418,
        lng: 43.9557,
      },
      {
        name: "Смотровая Стрелки",
        task: "Слияние каких двух рек видно со смотровой?",
        taskType: "code_word",
        codeAnswer: "Волга и Ока",
        hint: "Обе реки — великие водные артерии России.",
        lat: 56.3430,
        lng: 43.9540,
      },
    ],
  },
  {
    title: "Парк Швейцария и Приокский берег",
    description:
      "Один из крупнейших городских парков страны. Горнолыжные трассы, смотровые и лесные тропинки над Окой.",
    district: "Приокский",
    difficulty: 1,
    durationMin: 75,
    rules: "Не сходи с размеченных дорожек. Не оставляй мусор.",
    coverUrl:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200",
    status: "published",
    authorEmail: "sonya@morizo.app",
    checkpoints: [
      {
        name: "Главный вход парка «Швейцария»",
        task: "Какой город стоит на противоположном берегу Оки?",
        taskType: "code_word",
        codeAnswer: "Бор",
        hint: "Туда ведёт известная канатная дорога.",
        lat: 56.2648,
        lng: 43.9262,
      },
      {
        name: "Смотровая на обрыве",
        task: "Через какую реку открывается вид со смотровой?",
        taskType: "choice",
        choiceOptions: ["Волга", "Ока", "Сура", "Линда"],
        choiceAnswerIndex: 1,
        lat: 56.2640,
        lng: 43.9220,
      },
      {
        name: "Горнолыжный спуск",
        task: "В какое время года здесь работает горнолыжный склон?",
        taskType: "choice",
        choiceOptions: ["Весна", "Лето", "Осень", "Зима"],
        choiceAnswerIndex: 3,
        lat: 56.2590,
        lng: 43.9180,
      },
    ],
  },
  {
    title: "Ночной квест «Огни Нижнего»",
    description:
      "Подсветка набережных и мостов. Маршрут лучше проходить после заката с компанией.",
    district: "Нижегородский",
    difficulty: 3,
    durationMin: 100,
    rules: "Иди только освещёнными улицами, держись группы.",
    coverUrl:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200",
    status: "moderation",
    authorEmail: "polina@morizo.app",
    checkpoints: [
      {
        name: "Канавинский мост",
        task: "Сколько арок у моста?",
        taskType: "choice",
        choiceOptions: ["3", "5", "6", "8"],
        choiceAnswerIndex: 2,
        lat: 56.3280,
        lng: 43.9725,
      },
      {
        name: "Стрелка ночью",
        task: "Что подсвечивают рядом со стадионом?",
        taskType: "code_word",
        codeAnswer: "собор",
        lat: 56.3418,
        lng: 43.9557,
      },
      {
        name: "Метромост",
        task: "По мосту ходит метро и ещё что?",
        taskType: "choice",
        choiceOptions: ["Трамвай", "Автомобили", "Только пешеходы", "Поезд"],
        choiceAnswerIndex: 1,
        lat: 56.3194,
        lng: 43.9645,
      },
    ],
  },
];

const SEED_TEAMS = [
  { name: "Городские лисы", description: "Команда друзей с района" },
  { name: "Сормовские чемпионы", description: "Объединяем север города" },
  { name: "Покровка Crew", description: "Любим стрит-арт и ночные прогулки" },
];

async function seedDemoChats(userMap: Map<string, number>, teamIds: number[]): Promise<void> {
  const existing = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chatChannelsTable);
  if (Number(existing[0]?.n ?? 0) > 0) return;

  const [firstPublished] = await db
    .select({ id: questsTable.id, title: questsTable.title, authorId: questsTable.authorId })
    .from(questsTable)
    .where(sql`${questsTable.status} = 'published'`)
    .limit(1);

  const alexId = userMap.get("alex@morizo.app");
  const sonyaId = userMap.get("sonya@morizo.app");
  const demidId = userMap.get("demid@morizo.app");
  if (!alexId || !sonyaId || !demidId) return;

  if (firstPublished) {
    const [questCh] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "quest",
        questId: firstPublished.id,
        title: `Сбор · ${firstPublished.title}`,
        createdById: firstPublished.authorId,
      })
      .returning({ id: chatChannelsTable.id });
    await db
      .insert(chatMembersTable)
      .values([
        { channelId: questCh.id, userId: firstPublished.authorId },
        { channelId: questCh.id, userId: alexId },
        { channelId: questCh.id, userId: sonyaId },
      ])
      .onConflictDoNothing();
    await db.insert(chatMessagesTable).values([
      {
        channelId: questCh.id,
        userId: firstPublished.authorId,
        body: "Привет! Собираю команду на этот квест в субботу. Кто с нами?",
        attachment: { kind: "quest_link", questId: firstPublished.id },
      },
      { channelId: questCh.id, userId: alexId, body: "Я в деле! Встречаемся на старте?" },
      { channelId: questCh.id, userId: sonyaId, body: "+1, можно взять с собой подругу?" },
    ]);
  }

  if (teamIds[0]) {
    const [teamCh] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "team",
        teamId: teamIds[0],
        title: `Команда · ${SEED_TEAMS[0].name}`,
        createdById: alexId,
      })
      .returning({ id: chatChannelsTable.id });
    const teamMembers = await db
      .select({ userId: teamMembersTable.userId })
      .from(teamMembersTable)
      .where(sql`${teamMembersTable.teamId} = ${teamIds[0]}`);
    if (teamMembers.length > 0) {
      await db
        .insert(chatMembersTable)
        .values(teamMembers.map((m) => ({ channelId: teamCh.id, userId: m.userId })))
        .onConflictDoNothing();
    }
    await db.insert(chatMessagesTable).values([
      { channelId: teamCh.id, userId: alexId, body: "Команда, кто что хочет на следующих выходных пройти?" },
      { channelId: teamCh.id, userId: sonyaId, body: "Я голосую за прогулочный, у меня ноги болят 😅" },
    ]);
  }

  const [directCh] = await db
    .insert(chatChannelsTable)
    .values({ kind: "direct", createdById: alexId })
    .returning({ id: chatChannelsTable.id });
  await db
    .insert(chatMembersTable)
    .values([
      { channelId: directCh.id, userId: alexId },
      { channelId: directCh.id, userId: demidId },
    ])
    .onConflictDoNothing();
  await db.insert(chatMessagesTable).values([
    { channelId: directCh.id, userId: alexId, body: "Здаров! Готов к сезону 3?" },
    { channelId: directCh.id, userId: demidId, body: "Ещё бы. Жду новые квесты." },
  ]);

  console.log("[seed] Демо-чаты добавлены");
}

export async function runSeed(): Promise<void> {
  const before = await db.select({ n: sql<number>`count(*)::int` }).from(usersTable);
  if (Number(before[0]?.n ?? 0) > 0) {
    // top-up: ensure demo chats exist even when users were already seeded
    const userRows = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable);
    const teamRows = await db.select({ id: teamsTable.id }).from(teamsTable);
    const userMap = new Map<string, number>();
    for (const u of userRows) userMap.set(u.email, u.id);
    await seedDemoChats(userMap, teamRows.map((t) => t.id));
    console.log("[seed] Уже есть пользователи — пропускаем сидирование");
    return;
  }
  console.log("[seed] Заполняем демо-данные...");

  const AVATAR_STYLES = ["pixel-art", "bottts-neutral", "lorelei"];
  const THEMES: Array<"neon" | "sunset" | "mono"> = ["neon", "sunset", "mono"];
  const BANNER_POOL = [
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600",
    "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=1600",
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
  ];
  const BIO_POOL = [
    "Изучаю город по дворам и крышам.",
    "Люблю стрит-арт и истории старых домов.",
    "Командный игрок, фанат рейтингов.",
    "Делаю карты и придумываю загадки.",
    "Гуляю в любую погоду.",
  ];

  const userMap = new Map<string, number>();
  for (let idx = 0; idx < SEED_USERS.length; idx++) {
    const u = SEED_USERS[idx];
    const passwordHash = await bcrypt.hash(u.password, 10);
    const seedBase = u.nickname.toLowerCase();
    const [row] = await db
      .insert(usersTable)
      .values({
        email: u.email,
        passwordHash,
        nickname: u.nickname,
        ageGroup: u.ageGroup,
        role: u.role,
        bio: BIO_POOL[idx % BIO_POOL.length],
        bannerUrl: BANNER_POOL[idx % BANNER_POOL.length],
        city: "Нижний Новгород",
        theme: THEMES[idx % THEMES.length],
        avatarSlots: [
          { style: AVATAR_STYLES[0], seed: `${seedBase}-1` },
          { style: AVATAR_STYLES[1], seed: `${seedBase}-2` },
          { style: AVATAR_STYLES[2], seed: `${seedBase}-3` },
        ],
        activeAvatarSlot: idx % 3,
      })
      .returning({ id: usersTable.id });
    userMap.set(u.email, row.id);
  }
  console.log(`[seed] Пользователей: ${userMap.size}`);

  for (const q of SEED_QUESTS) {
    const authorId = userMap.get(q.authorEmail)!;
    const [row] = await db
      .insert(questsTable)
      .values({
        title: q.title,
        description: q.description,
        city: "Нижний Новгород",
        district: q.district,
        coverUrl: q.coverUrl,
        difficulty: q.difficulty,
        durationMin: q.durationMin,
        rules: q.rules,
        status: q.status,
        authorId,
        publishedAt: q.status === "published" ? new Date() : null,
      })
      .returning({ id: questsTable.id });

    for (let i = 0; i < q.checkpoints.length; i++) {
      const c = q.checkpoints[i];
      await db.insert(checkpointsTable).values({
        questId: row.id,
        orderIndex: i,
        name: c.name,
        task: c.task,
        taskType: c.taskType,
        codeAnswer: c.codeAnswer ?? null,
        choiceOptions: c.choiceOptions ?? null,
        choiceAnswerIndex: c.choiceAnswerIndex ?? null,
        hint: c.hint ?? null,
        rules: c.rules ?? null,
        lat: c.lat,
        lng: c.lng,
      });
    }
  }
  console.log(`[seed] Квестов: ${SEED_QUESTS.length}`);

  const teamCaptains = ["alex@morizo.app", "max@morizo.app", "kira@morizo.app"];
  const teamIds: number[] = [];
  for (let i = 0; i < SEED_TEAMS.length; i++) {
    const captainId = userMap.get(teamCaptains[i])!;
    const [team] = await db
      .insert(teamsTable)
      .values({
        name: SEED_TEAMS[i].name,
        description: SEED_TEAMS[i].description,
        joinCode: `MORIZO${i + 1}`,
        captainId,
      })
      .returning({ id: teamsTable.id });
    teamIds.push(team.id);
    await db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: captainId,
      role: "captain",
    });
  }

  // add some additional members
  const extras: Array<[number, string]> = [
    [0, "sonya@morizo.app"],
    [0, "demid@morizo.app"],
    [1, "polina@morizo.app"],
    [2, "demid@morizo.app"],
    [2, "sonya@morizo.app"],
  ];
  for (const [teamIdx, email] of extras) {
    await db.insert(teamMembersTable).values({
      teamId: teamIds[teamIdx],
      userId: userMap.get(email)!,
      role: "member",
    });
  }

  // give achievements — 5 distinct badge types distributed across players
  const achievementDefs: Array<{
    emails: string[];
    code: string;
    name: string;
    description: string;
    icon: string;
    daysAgoEarned: number;
  }> = [
    {
      emails: ["alex@morizo.app", "kira@morizo.app", "max@morizo.app", "sonya@morizo.app", "demid@morizo.app", "polina@morizo.app"],
      code: "first_quest",
      name: "Первый квест",
      description: "Завершил своё первое приключение в городе",
      icon: "star",
      daysAgoEarned: 29,
    },
    {
      emails: ["alex@morizo.app", "kira@morizo.app", "max@morizo.app", "sonya@morizo.app"],
      code: "urbanite",
      name: "Горожанин",
      description: "Прошёл три и более квестов",
      icon: "building",
      daysAgoEarned: 14,
    },
    {
      emails: ["demid@morizo.app", "polina@morizo.app", "max@morizo.app"],
      code: "explorer",
      name: "Исследователь",
      description: "Побывал в трёх и более районах города",
      icon: "map",
      daysAgoEarned: 10,
    },
    {
      emails: ["alex@morizo.app", "kira@morizo.app", "polina@morizo.app"],
      code: "team_player",
      name: "Командный игрок",
      description: "Прошёл квест в составе команды",
      icon: "users",
      daysAgoEarned: 6,
    },
    {
      emails: ["alex@morizo.app"],
      code: "record_holder",
      name: "Рекордсмен",
      description: "Набрал наивысший результат среди всех игроков",
      icon: "trophy",
      daysAgoEarned: 3,
    },
  ];
  const nowTs = new Date();
  for (const def of achievementDefs) {
    for (const email of def.emails) {
      const uid = userMap.get(email);
      if (!uid) continue;
      await db
        .insert(achievementsTable)
        .values({
          userId: uid,
          code: def.code,
          name: def.name,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(nowTs.getTime() - def.daysAgoEarned * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing();
    }
  }

  // ---------- PLAY SESSIONS ----------
  const publishedQuests = await db
    .select({ id: questsTable.id, durationMin: questsTable.durationMin, difficulty: questsTable.difficulty })
    .from(questsTable)
    .where(sql`${questsTable.status} = 'published'`);

  type PlaySessionInsert = {
    questId: number;
    userId: number;
    teamId?: number | null;
    mode: "solo" | "team";
    status: "completed" | "abandoned" | "in_progress";
    travelMode: "foot" | "transport" | "public_transport" | "dirt_road" | "off_road";
    currentIndex: number;
    score: number;
    startedAt: Date;
    finishedAt?: Date | null;
  };

  const sessionInserts: PlaySessionInsert[] = [];
  const now = new Date();

  const SESSIONS_PLAN: Array<{
    playerEmail: string;
    questIdx: number;
    teamIdx?: number;
    daysAgo: number;
    scoreMultiplier: number;
    mode: "solo" | "team";
    travel: "foot" | "transport" | "public_transport";
  }> = [
    { playerEmail: "alex@morizo.app", questIdx: 0, daysAgo: 30, scoreMultiplier: 1.0, mode: "solo", travel: "foot" },
    { playerEmail: "kira@morizo.app", questIdx: 1, daysAgo: 25, scoreMultiplier: 0.9, mode: "solo", travel: "foot" },
    { playerEmail: "max@morizo.app", questIdx: 2, daysAgo: 22, scoreMultiplier: 1.1, mode: "solo", travel: "transport" },
    { playerEmail: "sonya@morizo.app", questIdx: 3, daysAgo: 20, scoreMultiplier: 0.85, mode: "solo", travel: "foot" },
    { playerEmail: "demid@morizo.app", questIdx: 5, daysAgo: 18, scoreMultiplier: 1.0, mode: "solo", travel: "public_transport" },
    { playerEmail: "polina@morizo.app", questIdx: 6, daysAgo: 16, scoreMultiplier: 0.95, mode: "solo", travel: "transport" },
    { playerEmail: "alex@morizo.app", questIdx: 4, teamIdx: 0, daysAgo: 14, scoreMultiplier: 1.2, mode: "team", travel: "foot" },
    { playerEmail: "kira@morizo.app", questIdx: 7, daysAgo: 12, scoreMultiplier: 1.0, mode: "solo", travel: "foot" },
    { playerEmail: "max@morizo.app", questIdx: 8, daysAgo: 10, scoreMultiplier: 0.8, mode: "solo", travel: "foot" },
    { playerEmail: "sonya@morizo.app", questIdx: 0, daysAgo: 9, scoreMultiplier: 1.1, mode: "solo", travel: "foot" },
    { playerEmail: "demid@morizo.app", questIdx: 9, daysAgo: 8, scoreMultiplier: 0.9, mode: "solo", travel: "public_transport" },
    { playerEmail: "polina@morizo.app", questIdx: 1, teamIdx: 2, daysAgo: 6, scoreMultiplier: 1.15, mode: "team", travel: "foot" },
    { playerEmail: "alex@morizo.app", questIdx: 2, daysAgo: 5, scoreMultiplier: 1.3, mode: "solo", travel: "foot" },
    { playerEmail: "kira@morizo.app", questIdx: 4, teamIdx: 1, daysAgo: 4, scoreMultiplier: 1.0, mode: "team", travel: "transport" },
    { playerEmail: "max@morizo.app", questIdx: 5, daysAgo: 3, scoreMultiplier: 0.95, mode: "solo", travel: "foot" },
    { playerEmail: "sonya@morizo.app", questIdx: 6, daysAgo: 2, scoreMultiplier: 1.05, mode: "solo", travel: "transport" },
  ];

  for (const plan of SESSIONS_PLAN) {
    const quest = publishedQuests[plan.questIdx % publishedQuests.length];
    if (!quest) continue;
    const userId = userMap.get(plan.playerEmail);
    if (!userId) continue;

    const baseScore = 100 + quest.difficulty * 50;
    const score = Math.round(baseScore * plan.scoreMultiplier);
    const durationMs = quest.durationMin * 60 * 1000 * (0.8 + Math.random() * 0.4);
    const startedAt = new Date(now.getTime() - plan.daysAgo * 24 * 60 * 60 * 1000);
    const finishedAt = new Date(startedAt.getTime() + durationMs);

    const teamId = plan.teamIdx !== undefined ? teamIds[plan.teamIdx] : null;

    sessionInserts.push({
      questId: quest.id,
      userId,
      teamId: teamId ?? null,
      mode: plan.mode,
      status: "completed",
      travelMode: plan.travel,
      currentIndex: 999,
      score,
      startedAt,
      finishedAt,
    });
  }

  if (sessionInserts.length > 0) {
    await db.insert(playSessionsTable).values(sessionInserts);
  }

  // add abandoned and in-progress sessions for richer demo history
  const nonCompletedPlan: Array<{
    playerEmail: string;
    questIdx: number;
    status: "abandoned" | "in_progress";
    travel: "foot" | "transport" | "public_transport";
    currentIndex: number;
    scorePartial: number;
    daysAgo: number;
  }> = [
    { playerEmail: "alex@morizo.app",   questIdx: 7,  status: "abandoned",    travel: "foot",             currentIndex: 1, scorePartial: 60,  daysAgo: 27 },
    { playerEmail: "sonya@morizo.app",  questIdx: 10, status: "abandoned",    travel: "public_transport", currentIndex: 2, scorePartial: 90,  daysAgo: 21 },
    { playerEmail: "demid@morizo.app",  questIdx: 11, status: "in_progress",  travel: "foot",             currentIndex: 1, scorePartial: 100, daysAgo: 1  },
    { playerEmail: "polina@morizo.app", questIdx: 3,  status: "in_progress",  travel: "transport",        currentIndex: 2, scorePartial: 140, daysAgo: 0  },
  ];
  for (const plan of nonCompletedPlan) {
    const quest = publishedQuests[plan.questIdx % publishedQuests.length];
    if (!quest) continue;
    const userId = userMap.get(plan.playerEmail);
    if (!userId) continue;
    const startedAt = new Date(now.getTime() - plan.daysAgo * 24 * 60 * 60 * 1000);
    await db.insert(playSessionsTable).values({
      questId: quest.id,
      userId,
      mode: "solo",
      status: plan.status,
      travelMode: plan.travel,
      currentIndex: plan.currentIndex,
      score: plan.scorePartial,
      startedAt,
      finishedAt: null,
    });
  }

  // update user stats
  const scoreByUser = new Map<number, { pts: number; cnt: number }>();
  for (const s of sessionInserts) {
    const prev = scoreByUser.get(s.userId) ?? { pts: 0, cnt: 0 };
    scoreByUser.set(s.userId, { pts: prev.pts + s.score, cnt: prev.cnt + 1 });
  }
  for (const [uid, stats] of scoreByUser) {
    await db
      .update(usersTable)
      .set({ points: stats.pts, completedCount: stats.cnt })
      .where(sql`${usersTable.id} = ${uid}`);
  }

  // update quest completion counts
  const countByQuest = new Map<number, number>();
  for (const s of sessionInserts) {
    countByQuest.set(s.questId, (countByQuest.get(s.questId) ?? 0) + 1);
  }
  for (const [qid, cnt] of countByQuest) {
    await db
      .update(questsTable)
      .set({ completionCount: cnt })
      .where(sql`${questsTable.id} = ${qid}`);
  }

  console.log(`[seed] Прохождений: ${sessionInserts.length}`);

  // ---------- DEMO CHATS ----------
  // Quest gathering chat for the first published quest
  const [firstPublished] = await db
    .select({ id: questsTable.id, title: questsTable.title, authorId: questsTable.authorId })
    .from(questsTable)
    .where(sql`${questsTable.status} = 'published'`)
    .limit(1);

  const alexId = userMap.get("alex@morizo.app")!;
  const sonyaId = userMap.get("sonya@morizo.app")!;
  const demidId = userMap.get("demid@morizo.app")!;

  if (firstPublished) {
    const [questCh] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "quest",
        questId: firstPublished.id,
        title: `Сбор · ${firstPublished.title}`,
        createdById: firstPublished.authorId,
      })
      .returning({ id: chatChannelsTable.id });
    await db
      .insert(chatMembersTable)
      .values([
        { channelId: questCh.id, userId: firstPublished.authorId },
        { channelId: questCh.id, userId: alexId },
        { channelId: questCh.id, userId: sonyaId },
      ])
      .onConflictDoNothing();
    await db.insert(chatMessagesTable).values([
      {
        channelId: questCh.id,
        userId: firstPublished.authorId,
        body: "Привет! Собираю команду на этот квест в субботу. Кто с нами?",
        attachment: { kind: "quest_link", questId: firstPublished.id },
      },
      {
        channelId: questCh.id,
        userId: alexId,
        body: "Я в деле! Встречаемся на старте?",
      },
      {
        channelId: questCh.id,
        userId: sonyaId,
        body: "+1, можно взять с собой подругу?",
      },
    ]);
  }

  // Team chat for first team
  if (teamIds[0]) {
    const [teamCh] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "team",
        teamId: teamIds[0],
        title: `Команда · ${SEED_TEAMS[0].name}`,
        createdById: alexId,
      })
      .returning({ id: chatChannelsTable.id });
    const teamMembers = await db
      .select({ userId: teamMembersTable.userId })
      .from(teamMembersTable)
      .where(sql`${teamMembersTable.teamId} = ${teamIds[0]}`);
    await db
      .insert(chatMembersTable)
      .values(
        teamMembers.map((m) => ({ channelId: teamCh.id, userId: m.userId })),
      )
      .onConflictDoNothing();
    await db.insert(chatMessagesTable).values([
      {
        channelId: teamCh.id,
        userId: alexId,
        body: "Команда, кто что хочет на следующих выходных пройти?",
      },
      {
        channelId: teamCh.id,
        userId: sonyaId ?? alexId,
        body: "Я голосую за прогулочный, у меня ноги болят 😅",
      },
    ]);
  }

  // Direct chat
  const [directCh] = await db
    .insert(chatChannelsTable)
    .values({ kind: "direct", createdById: alexId })
    .returning({ id: chatChannelsTable.id });
  await db
    .insert(chatMembersTable)
    .values([
      { channelId: directCh.id, userId: alexId },
      { channelId: directCh.id, userId: demidId },
    ])
    .onConflictDoNothing();
  await db.insert(chatMessagesTable).values([
    { channelId: directCh.id, userId: alexId, body: "Здаров! Готов к сезону 3?" },
    { channelId: directCh.id, userId: demidId, body: "Ещё бы. Жду новые квесты." },
  ]);

  console.log("[seed] Готово.");
}
