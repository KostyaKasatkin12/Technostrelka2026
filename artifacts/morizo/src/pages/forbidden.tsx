import { Link } from "wouter";
import { ShieldOff } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <ShieldOff className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="text-6xl font-black font-mono tracking-tight">403</h1>
        <p className="text-xl font-bold">Доступ запрещён</p>
        <p className="text-muted-foreground max-w-sm">
          У вашего аккаунта нет прав для просмотра этой страницы. Если считаешь, что это ошибка — обратись к модератору.
        </p>
      </div>
      <Link href="/">
        <button className="bg-primary text-primary-foreground font-mono font-black px-6 py-2 uppercase tracking-wider hover:opacity-90 transition-opacity">
          На главную
        </button>
      </Link>
    </div>
  );
}
