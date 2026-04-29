import { QUEST_STATUS_LABEL } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  moderation: "bg-secondary/10 text-secondary border-secondary/40",
  published: "bg-primary/10 text-primary border-primary/40",
  archived: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/40",
};

export function QuestStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {QUEST_STATUS_LABEL[status] ?? status}
    </span>
  );
}
