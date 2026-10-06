import { avatarColor, initials, readableTextColor } from "@/lib/avatar";
import { cx } from "@/lib/cx";
import styles from "./Avatar.module.css";

export interface AvatarProps {
  name: string;
  color?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, color, src, size = 32, className }: AvatarProps) {
  const background = color ?? avatarColor(name);
  return (
    <span
      className={cx(styles.avatar, className)}
      style={{ width: size, height: size, background, color: readableTextColor(background), fontSize: size * 0.4 }}
      role="img"
      aria-label={name}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={styles.image} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: Array<{ name: string; avatar_color?: string | null }>;
  max?: number;
  size?: number;
}

export function AvatarStack({ people, max = 4, size = 28 }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const hidden = people.length - visible.length;
  return (
    <span className={styles.stack}>
      {visible.map((p) => (
        <Avatar key={p.name} name={p.name} color={p.avatar_color} size={size} />
      ))}
      {hidden > 0 ? (
        <span className={cx(styles.avatar, styles.more)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
