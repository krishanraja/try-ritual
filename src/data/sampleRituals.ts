export interface SampleRitual {
  id: string;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category: string;
  city: 'London' | 'Sydney' | 'Melbourne' | 'New York';
  is_sample: true;
}

export const SAMPLE_RITUALS: SampleRitual[] = [
  // NEW YORK
  {
    id: 'nyc-1',
    title: '🌉 Brooklyn Bridge at Midnight',
    description: 'Walk from Manhattan to Brooklyn after dark. Barely anyone around. Bring hot chocolate in a thermos. Watch the city breathe together.',
    time_estimate: '1 hour',
    budget_band: 'Free',
    category: 'Intimacy',
    city: 'New York',
    is_sample: true,
  },
  {
    id: 'nyc-2',
    title: '🥟 Dumpling Roulette',
    description: 'Pick three dumpling spots you\'ve never tried. Order one dish at each. Rate them on a napkin. Loser buys dessert.',
    time_estimate: '2 hours',
    budget_band: '$',
    category: 'Adventure',
    city: 'New York',
    is_sample: true,
  },
  {
    id: 'nyc-3',
    title: '🌆 Rooftop Hunt in Williamsburg',
    description: 'Find 3 public rooftops with skyline views. Bring a thermos of something warm and play "guess that building". No reservations, just exploration.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Exploration',
    city: 'New York',
    is_sample: true,
  },
  {
    id: 'nyc-4',
    title: '🎨 Chelsea Gallery Sprint',
    description: 'Hit 5 galleries in 45 minutes. Pick your favorite piece in each. Last stop: coffee and compare notes.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Fun',
    city: 'New York',
    is_sample: true,
  },

  // LONDON
  {
    id: 'ldn-1',
    title: '🌆 Sunrise on Primrose Hill',
    description: 'Set an early alarm. Walk to the top before the city wakes up. Bring coffee in a flask. Watch London emerge from the dark.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Intimacy',
    city: 'London',
    is_sample: true,
  },
  {
    id: 'ldn-2',
    title: '🍛 Market Breakfast Crawl',
    description: 'Hit a morning market early. Sample three things you\'ve never tried. Share everything. Walk it off along the canal.',
    time_estimate: '2 hours',
    budget_band: '$$',
    category: 'Exploration',
    city: 'London',
    is_sample: true,
  },
  {
    id: 'ldn-3',
    title: '🚶 Secret South Bank Stroll',
    description: 'Start at a lesser-known bridge. Walk the whole river path until you find a quiet bench. Bring snacks and people-watch.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Connection',
    city: 'London',
    is_sample: true,
  },
  {
    id: 'ldn-4',
    title: '☕ Independent Cafe Challenge',
    description: 'Find three independent cafes in neighborhoods you don\'t know. Order the weirdest thing on each menu. Rate them together.',
    time_estimate: '2 hours',
    budget_band: '$$',
    category: 'Adventure',
    city: 'London',
    is_sample: true,
  },

  // SYDNEY
  {
    id: 'syd-1',
    title: '🌊 Bondi to Coogee at Dawn',
    description: 'Start before sunrise. Take the coastal walk slow. Stop at every beach. End with ocean swimming and coffee.',
    time_estimate: '2.5 hours',
    budget_band: 'Free',
    category: 'Adventure',
    city: 'Sydney',
    is_sample: true,
  },
  {
    id: 'syd-2',
    title: '🏖️ Secret Beach Picnic',
    description: 'Find a small beach neither of you has been to. Bring simple food. No phone allowed for one hour. Just waves and conversation.',
    time_estimate: '1.5 hours',
    budget_band: '$',
    category: 'Connection',
    city: 'Sydney',
    is_sample: true,
  },
  {
    id: 'syd-3',
    title: '🌅 Sunset Harbour Watch',
    description: 'Pick a quiet harbour spot away from the tourist zones. Bring a blanket and something to share. Watch the ferry lights come on.',
    time_estimate: '1 hour',
    budget_band: 'Free',
    category: 'Intimacy',
    city: 'Sydney',
    is_sample: true,
  },
  {
    id: 'syd-4',
    title: '🍜 Noodle Neighborhood Tour',
    description: 'Pick three different suburbs. Try one noodle dish in each. Compare notes on the train home. Simplest wins.',
    time_estimate: '2.5 hours',
    budget_band: '$$',
    category: 'Exploration',
    city: 'Sydney',
    is_sample: true,
  },

  // MELBOURNE
  {
    id: 'mel-1',
    title: '☕ Laneway Discovery',
    description: 'Pick three laneways you haven\'t explored. Find hidden cafes. Order the strangest menu item. Rate the vibes, not just the coffee.',
    time_estimate: '2 hours',
    budget_band: '$$',
    category: 'Exploration',
    city: 'Melbourne',
    is_sample: true,
  },
  {
    id: 'mel-2',
    title: '🌳 Yarra Twilight Walk',
    description: 'Start at sunset along the river. Walk until the city lights come on. Bring one question each to discuss properly. No rushing.',
    time_estimate: '1 hour',
    budget_band: 'Free',
    category: 'Connection',
    city: 'Melbourne',
    is_sample: true,
  },
  {
    id: 'mel-3',
    title: '🎨 Gallery Hopping Challenge',
    description: 'Hit three small galleries in different neighborhoods. Pick your favorite piece in each. End with a drink and debate your choices.',
    time_estimate: '2 hours',
    budget_band: 'Free',
    category: 'Fun',
    city: 'Melbourne',
    is_sample: true,
  },
  {
    id: 'mel-4',
    title: '🌃 Rooftop Bar Quest',
    description: 'Find three rooftop spots with different vibes. One drink at each. Compare the views. No fancy places—hidden gems only.',
    time_estimate: '2.5 hours',
    budget_band: '$$',
    category: 'Adventure',
    city: 'Melbourne',
    is_sample: true,
  },
];

// Filter by city
export function getRitualsByCity(city: string): SampleRitual[] {
  return SAMPLE_RITUALS.filter(r => r.city === city);
}
