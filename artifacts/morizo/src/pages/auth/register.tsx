import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  nickname: z.string().min(2, "Никнейм от 2 символов").max(32, "Никнейм до 32 символов"),
  ageGroup: z.enum(["age_14_15", "age_16_17"], { required_error: "Выберите возраст" })
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      nickname: "",
      ageGroup: undefined as any
    },
  });

  const onSubmit = (data: RegisterForm) => {
    form.clearErrors("root");
    registerMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || "Ошибка регистрации";
        form.setError("root", { message: msg });
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md p-8 border-2 border-border bg-card">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">Регистрация</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">Твой пропуск в город.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Никнейм</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="GhostFace_99"
                      {...field}
                      className="h-12 border-2 focus-visible:ring-primary focus-visible:border-primary rounded-none bg-background font-mono"
                      data-testid="input-nickname"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="твой@email.ru"
                      {...field}
                      className="h-12 border-2 focus-visible:ring-primary focus-visible:border-primary rounded-none bg-background font-mono"
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Минимум 6 символов"
                        {...field}
                        className="h-12 border-2 focus-visible:ring-primary focus-visible:border-primary rounded-none bg-background font-mono pr-12"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ageGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-muted-foreground">Возраст</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 border-2 focus:ring-primary focus:border-primary rounded-none bg-background font-mono" data-testid="select-age">
                        <SelectValue placeholder="Выбери возраст" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-2 border-border">
                      <SelectItem value="age_14_15" className="font-mono focus:bg-primary/20">14-15 лет</SelectItem>
                      <SelectItem value="age_16_17" className="font-mono focus:bg-primary/20">16-17 лет</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="flex items-start gap-2 p-3 border-2 border-destructive bg-destructive/10 text-destructive text-sm font-mono">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {form.formState.errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-bold uppercase tracking-wider text-lg"
              disabled={registerMutation.isPending}
              data-testid="button-register"
            >
              {registerMutation.isPending ? "Создание..." : "Погнали"}
            </Button>
          </form>
        </Form>

        <div className="mt-6">
          <div className="relative flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-mono text-muted-foreground uppercase">или</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full h-12 border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors font-bold text-sm uppercase font-mono"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Зарегистрироваться через Google
          </a>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline font-bold uppercase">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
