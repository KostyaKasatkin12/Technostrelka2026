import { Link } from "wouter";
import { LockKeyhole } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <LockKeyhole className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="text-6xl font-black font-mono tracking-tight">401</h1>
        <p className="text-xl font-bold">Требуется авторизация</p>
        <p className="text-muted-foreground max-w-sm">
          Для доступа к этой странице необходимо войти в аккаунт.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login">
          <button className="bg-primary text-primary-foreground font-mono font-black px-6 py-2 uppercase tracking-wider hover:opacity-90 transition-opacity">
            Войти
          </button>
        </Link>
        <Link href="/">
          <button className="border border-border font-mono font-black px-6 py-2 uppercase tracking-wider hover:bg-muted transition-colors">
            На главную
          </button>
        </Link>
      </div>
    </div>
  );
}
