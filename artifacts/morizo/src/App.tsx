import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Unauthorized from "@/pages/unauthorized";
import Forbidden from "@/pages/forbidden";

import Layout from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Catalog from "@/pages/quests/catalog";
import QuestDetail from "@/pages/quests/detail";
import QuestNew from "@/pages/quests/new";
import QuestEdit from "@/pages/quests/edit";
import PlaySession from "@/pages/play/session";
import Lobby from "@/pages/play/lobby";
import Shop from "@/pages/shop";
import Profile from "@/pages/profile";
import PublicProfile from "@/pages/profile/public";
import MyQuests from "@/pages/me/quests";
import Sessions from "@/pages/sessions";
import Teams from "@/pages/teams";
import TeamDetail from "@/pages/teams/detail";
import Leaderboard from "@/pages/leaderboard";
import Achievements from "@/pages/achievements";
import Moderation from "@/pages/moderation";
import AdminPanel from "@/pages/admin";
import ChatPage from "@/pages/chat";
import GamesPage from "@/pages/games/index";
import CityQuiz from "@/pages/games/quiz";
import FeedPage from "@/pages/wall/feed";
import UserSearchPage from "@/pages/users/search";

function describeError(err: unknown): string {
  if (!err) return "Неизвестная ошибка";
  const anyErr = err as any;
  const status: number | undefined = anyErr?.status ?? anyErr?.response?.status;
  const data = anyErr?.data ?? anyErr?.response?.data;
  const detail =
    (typeof data === "object" && data !== null && (data.message || data.error || data.detail || data.title)) ||
    anyErr?.message;

  if (status === 401) return "Требуется вход. Авторизуйтесь, чтобы продолжить.";
  if (status === 403) return "Нет доступа: операция запрещена для вашей роли.";
  if (status === 404) return "Не найдено: ресурс отсутствует или удалён.";
  if (status === 409) return detail ? String(detail) : "Конфликт данных.";
  if (status === 422) return detail ? `Неверные данные: ${detail}` : "Сервер отклонил данные формы.";
  if (status === 429) return "Слишком много запросов. Подождите немного.";
  if (status && status >= 500) return `Ошибка сервера (${status}). ${detail ?? "Попробуйте позже."}`;
  if (anyErr?.name === "ResponseParseError") return "Сервер вернул некорректный ответ.";
  if (anyErr?.message?.includes?.("Failed to fetch") || anyErr?.message?.includes?.("NetworkError")) {
    return "Нет связи с сервером. Проверьте интернет.";
  }
  return String(detail ?? anyErr?.message ?? "Что-то пошло не так");
}

const SILENCED_QUERY_KEYS = new Set([
  "/auth/me",
  "getMe",
]);

function shouldSilenceQuery(query: { queryKey: readonly unknown[] }): boolean {
  const key = query.queryKey?.[0];
  if (typeof key !== "string") return false;
  return SILENCED_QUERY_KEYS.has(key) || key.endsWith("/auth/me");
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (shouldSilenceQuery(query)) return;
      const status = (err as any)?.status;
      if (status === 401 || status === 403) return;
      toast.error(describeError(err), {
        description: "Запрос данных не удался. Попробуйте обновить страницу.",
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (err, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return;
      const status = (err as any)?.status;
      if (status === 401 || status === 403) return;
      toast.error(describeError(err));
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, err) => {
        const status = (err as any)?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function ApiErrorRedirect() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    function handleStatus(status: number | undefined) {
      if (status === 401 && location !== "/login" && location !== "/register" && location !== "/401") {
        navigate("/401");
      } else if (status === 403 && location !== "/403") {
        navigate("/403");
      }
    }

    const unsubscribeQueries = qc.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      if (shouldSilenceQuery(event.query)) return;
      const status = (event.query.state.error as any)?.status;
      handleStatus(status);
    });

    const unsubscribeMutations = qc.getMutationCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const status = (event.mutation?.state.error as any)?.status;
      handleStatus(status);
    });

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [qc, navigate, location]);

  return null;
}

function Router() {
  return (
    <Layout>
      <ApiErrorRedirect />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/quests" component={Catalog} />
        <Route path="/quests/new" component={QuestNew} />
        <Route path="/quests/:id" component={QuestDetail} />
        <Route path="/quests/:id/edit" component={QuestEdit} />
        <Route path="/play/lobby/:code" component={Lobby} />
        <Route path="/play/:sessionId" component={PlaySession} />
        <Route path="/shop" component={Shop} />
        <Route path="/profile" component={Profile} />
        <Route path="/u/:userId" component={PublicProfile} />
        <Route path="/me/quests" component={MyQuests} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/teams" component={Teams} />
        <Route path="/teams/:id" component={TeamDetail} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/chat/:id" component={ChatPage} />
        <Route path="/moderation" component={Moderation} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/games" component={GamesPage} />
        <Route path="/games/city-quiz" component={CityQuiz} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/search" component={UserSearchPage} />
        <Route path="/401" component={Unauthorized} />
        <Route path="/403" component={Forbidden} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
