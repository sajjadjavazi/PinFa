type ProfileAvatarProps = {
  avatarUrl: string | null;
  displayName: string;
  size?: "sm" | "lg";
};

export function ProfileAvatar({
  avatarUrl,
  displayName,
  size = "lg",
}: ProfileAvatarProps) {
  const dimensions = size === "lg" ? "h-24 w-24 text-3xl" : "h-12 w-12 text-lg";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        loading="lazy"
        decoding="async"
        className={`${dimensions} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} grid place-items-center rounded-full bg-neutral-950 font-semibold text-white`}
      aria-hidden="true"
    >
      {getInitial(displayName)}
    </div>
  );
}

function getInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "P";
}
