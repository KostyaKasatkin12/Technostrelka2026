# Premium Animations & Transitions

## What & Why
Переработать анимации и переходы на уровне топовых лендингов (Nike, Google, Apple): плавные переходы между страницами, scroll-triggered reveal-анимации, продуманные micro-interactions. Сейчас переходы резкие, элементы появляются без плавности.

## Done looks like
- Переход между страницами — плавный с затуханием и мягким сдвигом (не резкий pop), без белых вспышек
- При прокрутке карточки квестов, достижения, блоки статистики «въезжают» с небольшим fade+translateY — как reveal на больших сайтах
- Кнопки, карточки, интерактивные элементы имеют тонкие hover и press-состояния (scale, shadow, color shift) вместо резких CSS-переключений
- Числа (очки, количество) анимируются count-up при появлении на экране
- Модальные окна и bottom-sheet'ы появляются/закрываются с spring-анимацией, а не линейной
- Навигационные элементы имеют indicator с плавным sliding underline / pill
- Анимация загрузки страниц — skeleton с shimmer, а не просто spinner
- Общее ощущение: всё течёт, нет ни одного резкого "прыжка" интерфейса

## Out of scope
- Изменение дизайн-системы (цвета, шрифты, компоненты)
- 3D-эффекты (Three.js уже настроен)
- Изменение бизнес-логики

## Steps
1. **Page transition system** — Обернуть роутер в компонент `AnimatePresence` (Framer Motion). Каждая страница оборачивается в `motion.div` с `initial`, `animate`, `exit` пресетами: мягкий fade (opacity 0→1) + translateY (16px→0) за 400ms с ease-out кривой. Убрать текущий `page-fade` CSS в пользу единой системы.

2. **Scroll-triggered reveals** — Создать reusable хук `useReveal` / компонент `<Reveal>`, использующий `IntersectionObserver`. При попадании в viewport — проигрывает Framer Motion анимацию (fade+translateY). Применить на карточках каталога, блоках профиля, секции достижений и статистики.

3. **Micro-interactions** — Обновить все кнопки, карточки, иконки: hover — scale(1.02) + box-shadow усиление за 200ms; press — scale(0.97); focus — outline с анимацией. Карточки квестов при hover поднимаются на 4px с усилением тени — плавно через cubic-bezier.

4. **Spring-модалки и bottom-sheet** — Переключить все диалоги и шторки на spring-анимацию Framer Motion (`type: "spring", stiffness: 300, damping: 30`). Backdrop появляется отдельно с затуханием.

5. **Count-up числа** — Добавить анимацию счётчика для числовых значений (очки, прогресс, количество пройденных квестов) — число «накручивается» от 0 до целевого при первом появлении на экране.

6. **Skeleton loaders** — Заменить спиннеры на skeleton-карточки с shimmer-анимацией для списка квестов, профиля и лидерборда. Шиммер использует существующий CSS-класс `shimmer` из index.css, унифицированный компонент.

7. **Навигация** — Active-индикатор в нижней навигации и sidebar анимируется через `layoutId` Framer Motion (плавно перемещается между пунктами вместо мгновенного переключения).

## Relevant files
- `artifacts/morizo/src/App.tsx`
- `artifacts/morizo/src/components/animated-bg.tsx`
- `artifacts/morizo/src/components/loading-screen.tsx`
- `artifacts/morizo/src/index.css`
- `artifacts/morizo/src/pages/`
