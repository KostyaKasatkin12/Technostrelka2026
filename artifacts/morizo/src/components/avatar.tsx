import { avatarUrl, ensureSlots, type AvatarSlot } from "@/lib/avatars";

type Props = {
  slots?: AvatarSlot[] | null;
  active?: number;
  nickname: string;
  size?: number;
  className?: string;
};

export function UserAvatar({
  slots,
  active = 0,
  nickname,
  size = 96,
  className = "",
}: Props) {
  const ready = ensureSlots(slots ?? undefined, nickname);
  const slot = ready[Math.max(0, Math.min(2, active))];
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden bg-muted ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarUrl(slot, size)}
        alt={nickname}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
