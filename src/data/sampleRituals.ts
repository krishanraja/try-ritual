export interface SampleRitual {
  id: string;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category: string;
  is_sample: true;
}

export const SAMPLE_RITUALS: SampleRitual[] = [
  {
    id: 'sample-1',
    title: '🌆 Rooftop Hunt in Williamsburg',
    description: 'Find 3 public rooftops with skyline views. Bring a thermos of something warm and play "guess that building". No reservations, just exploration.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Exploration',
    is_sample: true,
  },
  {
    id: 'sample-2',
    title: '🥟 Dumpling Roulette in Flushing',
    description: 'Take the 7 train to the end. Order whatever looks good at 3 different spots. Rate them on a napkin. Loser buys next week.',
    time_estimate: '2 hours',
    budget_band: '$',
    category: 'Adventure',
    is_sample: true,
  },
  {
    id: 'sample-3',
    title: '📚 Secret Library Picnic',
    description: 'Meet at the Rose Reading Room in NYPL. Slip each other notes between the stacks. Then grab takeout and eat in Bryant Park.',
    time_estimate: '1 hour',
    budget_band: '$',
    category: 'Connection',
    is_sample: true,
  },
  {
    id: 'sample-4',
    title: '🎨 Chelsea Gallery Sprint',
    description: 'Hit 5 galleries in 45 minutes. Pick your favorite piece in each. Last stop: coffee at High Line and compare notes.',
    time_estimate: '1.5 hours',
    budget_band: 'Free',
    category: 'Fun',
    is_sample: true,
  },
  {
    id: 'sample-5',
    title: '🌃 Brooklyn Bridge at Midnight',
    description: 'Walk from Manhattan to Brooklyn after dark. Barely anyone around. Bring hot chocolate in a thermos. Watch the city breathe.',
    time_estimate: '1 hour',
    budget_band: 'Free',
    category: 'Intimacy',
    is_sample: true,
  },
  {
    id: 'sample-6',
    title: '🍜 Noodle Quest in Chinatown',
    description: 'Start at Nom Wah for dim sum, then hit three different noodle shops. Compare hand-pulled vs knife-cut. Waddle home happy.',
    time_estimate: '2 hours',
    budget_band: '$$',
    category: 'Adventure',
    is_sample: true,
  },
];
