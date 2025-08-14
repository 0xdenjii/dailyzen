import { EarnedBadge, UIBadge } from "@/types";

export function mapBackendBadgeToUIBadge(badge: EarnedBadge): UIBadge {
  const uiBadge: Partial<UIBadge> = {
    id: badge.id,
    unlockedAt: badge.unlockedAt,
  };

  switch (badge.materialTier) {
    case "Bronze":
    case "Iron":
      uiBadge.rarity = "Bronze";
      break;
    case "Silver":
      uiBadge.rarity = "Silver";
      break;
    case "Gold":
    case "Platinum":
      uiBadge.rarity = "Gold";
      break;
    case "Diamond":
      uiBadge.rarity = "Legendary";
      break;
    default:
      uiBadge.rarity = "Bronze";
  }

  switch (badge.focusFactor) {
    case "Consistency":
      uiBadge.icon = "🔥";
      uiBadge.name = `${badge.threshold}-Day Streak`;
      uiBadge.description = `Maintain a consistent streak for ${badge.threshold} days.`;
      break;
    case "Volume":
      uiBadge.icon = "🏆";
      uiBadge.name = `Point Collector`;
      uiBadge.description = `Achieve a total of ${badge.threshold} points.`;
      break;
    case "Mental":
      uiBadge.icon = "🧠";
      uiBadge.name = "Mental Giant";
      uiBadge.description = `Earn ${badge.threshold} points in Mental tasks.`;
      break;
    case "Physical":
      uiBadge.icon = "💪";
      uiBadge.name = "Physical Powerhouse";
      uiBadge.description = `Earn ${badge.threshold} points in Physical tasks.`;
      break;
    case "Dedication":
        uiBadge.icon = "✍️";
        uiBadge.name = "Daily Scribe";
        uiBadge.description = `Write ${badge.threshold} daily notes.`;
        break;
    case "Ambition":
        uiBadge.icon = "🎯";
        uiBadge.name = "Goal Getter";
        uiBadge.description = `Successfully complete ${badge.threshold} goals.`;
        break;
    default:
      uiBadge.icon = "⭐";
      uiBadge.name = "Special Achievement";
      uiBadge.description = "A unique accomplishment.";
  }

  return uiBadge as UIBadge;
}