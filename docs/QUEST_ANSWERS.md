# MORIZO — Quest Checkpoint Answers Reference

> Use this file during demos and testing to look up correct answers for each seeded quest.  
> Source of truth: `artifacts/api-server/src/seed.ts`  
> All quests are set in **Нижний Новгород (Nizhny Novgorod)**.

---

## Demo accounts (all passwords: `demo123`)

| Email | Nickname | Role |
|-------|----------|------|
| moderator@morizo.app | Модератор | moderator |
| alex@morizo.app | Алекс | player |
| kira@morizo.app | Кира | player |
| max@morizo.app | Макс | player |
| sonya@morizo.app | Соня | player |
| demid@morizo.app | Демид | player |
| polina@morizo.app | Полина | player |

---

## Answer type key

- **code_word** — player types a text answer; server matching is case-insensitive and trims whitespace.
- **choice** — player picks one option from a list; index A=0, B=1, C=2, D=3 maps to `choiceAnswerIndex` in seed data.

---

## Quest 1 — Тайны нижегородского Кремля

**Status:** published · **District:** Нижегородский · **Difficulty:** 2/5 · **Duration:** 90 min  
**Author:** alex@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Дмитриевская башня | Главные ворота Кремля. Сколько колец на гербе над входом? Введи число словом. | code_word | `три` |
| 2 | Памятник Минину и Пожарскому | Какой век указан на постаменте? | choice | **XVII** (index 1, option B) |
| 3 | Михайло-Архангельский собор | Найди табличку с именем зодчего. Введи фамилию. | code_word | `Возоулин` |
| 4 | Чкаловская лестница | Сколько маршей у лестницы? | choice | **442** (index 1, option B) |

---

## Quest 2 — Стрит-арт Покровки

**Status:** published · **District:** Нижегородский · **Difficulty:** 1/5 · **Duration:** 60 min  
**Author:** kira@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Скульптура «Весёлая коза» | Что держит коза? Одно слово. | code_word | `афиша` |
| 2 | Дом с атлантами | Сколько атлантов держат балкон? | choice | **2** (index 0, option A) |
| 3 | Памятник почтальону | Какое животное рядом с почтальоном? | code_word | `собака` |

---

## Quest 3 — Закаты Верхне-Волжской набережной

**Status:** published · **District:** Нижегородский · **Difficulty:** 2/5 · **Duration:** 75 min  
**Author:** max@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Памятник Чкалову | В каком году совершён беспосадочный перелёт через Северный полюс? | choice | **1937** (index 1, option B) |
| 2 | Усадьба Рукавишниковых | Стиль фасада в одном слове. | code_word | `эклектика` |
| 3 | Смотровая на Стрелку | Слияние каких рек видно? | choice | **Волга и Ока** (index 1, option B) |

---

## Quest 4 — Канатная дорога: маршрут над Волгой

**Status:** published · **District:** Нижегородский · **Difficulty:** 1/5 · **Duration:** 45 min  
**Author:** sonya@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Станция «Нижний» | Город-побратим на другом конце канатки? | code_word | `Бор` |
| 2 | Смотровая на опору канатки | Сколько примерно метров высота над водой? | choice | **82** (index 2, option C) |
| 3 | Станция «Бор» | Год открытия канатки? | choice | **2012** (index 1, option B) |

---

## Quest 5 — Литературный квест: Горький в городе

**Status:** published · **District:** Нижегородский · **Difficulty:** 3/5 · **Duration:** 120 min  
**Author:** alex@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Домик Каширина | Настоящая фамилия Горького? | code_word | `Пешков` |
| 2 | Музей-квартира Горького | В каком году писатель уехал из города? | choice | **1904** (index 1, option B) |
| 3 | Памятник Горькому на площади | Площадь названа в честь писателя — введи слово, которое стоит после «площадь». | code_word | `Горького` |
| 4 | Театр драмы | По какой пьесе Горького гремел театр? | choice | **На дне** (index 1, option B) |

---

## Quest 6 — Сормово индустриальное

**Status:** published · **District:** Сормовский · **Difficulty:** 2/5 · **Duration:** 90 min  
**Author:** demid@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Дворец культуры «Красное Сормово» | Стиль здания одним словом. | code_word | `конструктивизм` |
| 2 | Спасо-Преображенский собор | Сколько куполов у собора? | choice | **5** (index 2, option C) |
| 3 | Музей истории завода «Красное Сормово» | Год основания завода? | choice | **1849** (index 0, option A) |

---

## Quest 7 — Автозавод: история и настоящее

**Status:** published · **District:** Автозаводский · **Difficulty:** 2/5 · **Duration:** 80 min  
**Author:** polina@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Площадь Киселёва | Какая модель автомобиля стоит на постаменте? | code_word | `ГАЗ-АА` |
| 2 | Дворец культуры ГАЗ | Архитектор здания? | choice | **Веснин** (index 0, option A) |
| 3 | Парк культуры Автозавода | Что в центре парка? | choice | **Фонтан** (index 2, option C) |

---

## Quest 8 — Печёрский монастырь и набережная

**Status:** published · **District:** Нижегородский · **Difficulty:** 2/5 · **Duration:** 70 min  
**Author:** kira@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Святые ворота | Век основания монастыря? | choice | **XIV** (index 1, option B) |
| 2 | Колокольня | Введи слово: что висит на верхнем ярусе. | code_word | `колокола` |
| 3 | Смотровая на Печёрском съезде | Через какую реку открывается вид? | code_word | `Волга` |

---

## Quest 9 — Экспресс-квест по Большой Покровской

**Status:** published · **District:** Нижегородский · **Difficulty:** 1/5 · **Duration:** 30 min  
**Author:** sonya@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Скульптура чистильщика обуви | Что у чистильщика на голове? | code_word | `кепка` |
| 2 | Памятник городовому | В какой руке свисток? | choice | **Правой** (index 1, option B) |
| 3 | Театральная площадь | Кому памятник перед театром? | code_word | `Добролюбов` |

---

## Quest 10 — Загадки Щёлковского хутора

**Status:** published · **District:** Советский · **Difficulty:** 2/5 · **Duration:** 90 min  
**Author:** demid@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Изба Павловой | Из какого дерева сруб? | code_word | `сосна` |
| 2 | Ветряная мельница | Сколько лопастей? | choice | **4** (index 2, option C) |
| 3 | Часовня | Материал крыши одним словом. | code_word | `лемех` |

---

## Quest 11 — Ночной квест «Огни Нижнего»

**Status:** moderation (pending review) · **District:** Нижегородский · **Difficulty:** 3/5 · **Duration:** 100 min  
**Author:** polina@morizo.app

| # | Checkpoint | Task | Type | Correct Answer |
|---|------------|------|------|----------------|
| 1 | Канавинский мост | Сколько арок у моста? | choice | **6** (index 2, option C) |
| 2 | Стрелка ночью | Что подсвечивают рядом со стадионом? | code_word | `собор` |
| 3 | Метромост | По мосту ходит метро и ещё что? | choice | **Автомобили** (index 1, option B) |
