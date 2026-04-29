import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useGetMe, useUpdateProfile } from "@workspace/api-client-react";
import { applyTheme, loadStoredTheme, storeTheme, THEMES, type ThemeId } from "@/lib/themes";

type Ctx = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeCtx = createContext<Ctx>({ theme: "neon", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => loadStoredTheme());
  const { data: me } = useGetMe();
  const update = useUpdateProfile();

  // Sync to user's saved theme on first load
  useEffect(() => {
    const userTheme = me?.user?.theme as ThemeId | undefined;
    if (userTheme && userTheme !== theme) {
      setThemeState(userTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user?.id]);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (id: ThemeId) => {
      setThemeState(id);
      if (me?.user) {
        update.mutate({ data: { theme: id } });
      }
    },
    [me?.user, update],
  );

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  return useContext(ThemeCtx);
}

export { THEMES };
