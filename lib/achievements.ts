export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  memoriesCount: number;
  countriesCount: number;
  totalKm: number;
  favoritesCount: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_memory',
    title: 'Prva uspomena',
    description: 'Dodao si svoju prvu uspomenu!',
    icon: '🌟',
    condition: (s) => s.memoriesCount >= 1,
  },
  {
    id: 'five_memories',
    title: 'Kolekcionar',
    description: 'Imaš 5 uspomena!',
    icon: '📸',
    condition: (s) => s.memoriesCount >= 5,
  },
  {
    id: 'ten_memories',
    title: 'Putnik',
    description: 'Imaš 10 uspomena!',
    icon: '🎒',
    condition: (s) => s.memoriesCount >= 10,
  },
  {
    id: 'twenty_five_memories',
    title: 'Avanturist',
    description: 'Imaš 25 uspomena!',
    icon: '🗺️',
    condition: (s) => s.memoriesCount >= 25,
  },
  {
    id: 'first_favorite',
    title: 'Omiljena uspomena',
    description: 'Označio si prvu omiljenu uspomenu!',
    icon: '❤️',
    condition: (s) => s.favoritesCount >= 1,
  },
  {
    id: 'five_favorites',
    title: 'Ljubitelj uspomena',
    description: 'Imaš 5 omiljenih uspomena!',
    icon: '💖',
    condition: (s) => s.favoritesCount >= 5,
  },
  {
    id: 'first_country',
    title: 'Domoljub',
    description: 'Imaš uspomenu iz jedne države!',
    icon: '🏠',
    condition: (s) => s.countriesCount >= 1,
  },
  {
    id: 'three_countries',
    title: 'Istraživač',
    description: 'Posjetio si 3 države!',
    icon: '✈️',
    condition: (s) => s.countriesCount >= 3,
  },
  {
    id: 'five_countries',
    title: 'Svjetski putnik',
    description: 'Posjetio si 5 država!',
    icon: '🌍',
    condition: (s) => s.countriesCount >= 5,
  },
  {
    id: 'hundred_km',
    title: 'Maratonac',
    description: 'Prešao si 100 km!',
    icon: '🏃',
    condition: (s) => s.totalKm >= 100,
  },
  {
    id: 'five_hundred_km',
    title: 'Vozač',
    description: 'Prešao si 500 km!',
    icon: '🚗',
    condition: (s) => s.totalKm >= 500,
  },
  {
    id: 'thousand_km',
    title: 'Globetrotter',
    description: 'Prešao si 1000 km!',
    icon: '🚀',
    condition: (s) => s.totalKm >= 1000,
  },
];

export function getUnlockedAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.condition(stats));
}

export function getLockedAchievements(stats: AchievementStats): Achievement[] {
  return ACHIEVEMENTS.filter(a => !a.condition(stats));
}