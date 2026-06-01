export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  type: 'memories' | 'favorites' | 'countries' | 'km';
  period: 'weekly' | 'monthly';
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'weekly_memories',
    title: 'Fotograf tjedna',
    description: 'Dodaj 3 uspomene ovaj tjedan',
    icon: '📸',
    target: 3,
    type: 'memories',
    period: 'weekly',
  },
  {
    id: 'monthly_memories',
    title: 'Kolekcionar mjeseca',
    description: 'Dodaj 10 uspomena ovaj mjesec',
    icon: '🗂️',
    target: 10,
    type: 'memories',
    period: 'monthly',
  },
  {
    id: 'weekly_favorites',
    title: 'Ljubitelj uspomena',
    description: 'Označi 2 omiljene uspomene ovaj tjedan',
    icon: '❤️',
    target: 2,
    type: 'favorites',
    period: 'weekly',
  },
  {
    id: 'monthly_favorites',
    title: 'Sakupljač favorita',
    description: 'Označi 5 omiljenih uspomena ovaj mjesec',
    icon: '💖',
    target: 5,
    type: 'favorites',
    period: 'monthly',
  },
  {
    id: 'monthly_countries',
    title: 'Istraživač',
    description: 'Posjeti 2 različite države ovaj mjesec',
    icon: '✈️',
    target: 2,
    type: 'countries',
    period: 'monthly',
  },
];

export function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

export function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}