import { Link } from "wouter";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <MapPinOff className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="text-6xl font-black font-mono tracking-tight">404</h1>
        <p className="text-xl font-bold">Страница не найдена</p>
        <p className="text-muted-foreground max-w-sm">
          Такой страницы не существует или она была перемещена. Проверь адрес или вернись на главную.
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
