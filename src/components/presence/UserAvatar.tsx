"use client";

import Avatar from "boring-avatars";

// On-brand palette for generated avatars (teal / blue / indigo / lavender family).
const COLORS = ["#2E8B82", "#386AF6", "#4F46C4", "#6BBFB8", "#C5C5E8"];

// Circular user avatar content: the real profile photo when one exists, otherwise
// a deterministic geometric avatar seeded per user (distinct + stable per person).
// Renders inner content only — the parent element provides the circular clip.
export default function UserAvatar({
  seed,
  avatar,
  size = 32,
}: {
  seed: string;
  avatar?: string;
  size?: number;
}) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt="" />;
  }
  return <Avatar name={seed || "user"} variant="beam" size={size} colors={COLORS} />;
}
