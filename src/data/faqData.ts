/**
 * FAQ Data
 * 
 * SEO-optimized frequently asked questions targeting high-volume search queries.
 * Each question is designed to capture long-tail keywords and provide genuine value.
 * 
 * @created 2025-12-13
 */

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'getting-started' | 'features' | 'relationship-tips' | 'technical' | 'pricing';
  keywords: string[];
}

export const FAQ_CATEGORIES = {
  'getting-started': { label: 'Getting Started', icon: '🚀' },
  'features': { label: 'Features', icon: '✨' },
  'relationship-tips': { label: 'Relationship Tips', icon: '💕' },
  'technical': { label: 'Technical', icon: '⚙️' },
  'pricing': { label: 'Pricing', icon: '💎' },
} as const;

export const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-ritual',
    question: 'What is Ritual and how does it help couples?',
    answer: 'Ritual is an AI-powered app that helps couples build meaningful weekly rituals together. Both partners share their mood, preferences, and desires, and our AI synthesizes personalized activity suggestions that you\'ll both love. It\'s designed to keep relationships fresh, intentional, and connected through shared experiences.',
    category: 'getting-started',
    keywords: ['relationship app', 'couples app', 'date planning app'],
  },
  {
    id: 'how-to-start',
    question: 'How do I get started with Ritual?',
    answer: 'Getting started is easy: 1) Create an account and start a Ritual Space, 2) Share your unique couple code with your partner, 3) Both of you complete a quick 2-minute input about your mood and preferences, 4) Our AI generates personalized ritual suggestions, and 5) Together, you pick your favorite and schedule it. The whole process takes less than 5 minutes!',
    category: 'getting-started',
    keywords: ['how to use ritual', 'setup couples app'],
  },
  {
    id: 'invite-partner',
    question: 'How do I invite my partner to join?',
    answer: 'When you create a Ritual Space, you\'ll receive a unique 6-character couple code. Simply share this code with your partner via text, WhatsApp, or any messaging app. They can then sign up and enter the code to join your space. You\'ll both be notified once connected!',
    category: 'getting-started',
    keywords: ['invite partner', 'couple code', 'join partner'],
  },
  
  // Features
  {
    id: 'how-ai-works',
    question: 'How does the AI generate ritual suggestions?',
    answer: 'Our AI analyzes both partners\' mood cards, preferences, and optional text input to find common ground and exciting opportunities. It considers factors like your preferred city, budget preferences, time availability, and relationship goals to generate 5-7 personalized ritual suggestions. Each suggestion includes a description, time estimate, and budget range.',
    category: 'features',
    keywords: ['AI date ideas', 'personalized activities', 'smart suggestions'],
  },
  {
    id: 'weekly-rituals',
    question: 'What are weekly rituals and why do they matter?',
    answer: 'Weekly rituals are intentional, shared activities that couples commit to doing together regularly. Research shows that couples who maintain consistent rituals report higher relationship satisfaction, better communication, and stronger emotional bonds. Ritual helps you build and maintain these healthy habits without the mental load of constantly planning.',
    category: 'features',
    keywords: ['weekly date night', 'couple rituals', 'relationship habits'],
  },
  {
    id: 'streak-tracking',
    question: 'How does streak tracking work?',
    answer: 'Every time you complete a ritual together, your streak grows! Streaks evolve through tiers: Seedling (1 week), Growing (2-3 weeks), On Fire (4-7 weeks), Blazing (8-15 weeks), and Legendary (16+ weeks). Maintaining your streak gamifies consistency and gives you both something to protect and celebrate together.',
    category: 'features',
    keywords: ['relationship streak', 'couple goals', 'gamified relationships'],
  },
  {
    id: 'location-features',
    question: 'What cities does Ritual support?',
    answer: 'Ritual currently generates location-aware suggestions for London, Sydney, Melbourne, and New York. Our AI knows local venues, parks, restaurants, and activities in these cities. We\'re actively expanding to more cities based on user demand. Activities are also suggested that work anywhere!',
    category: 'features',
    keywords: ['date ideas london', 'date ideas sydney', 'date ideas melbourne', 'date ideas new york'],
  },
  {
    id: 'memories-photos',
    question: 'Can I save photos and memories of our rituals?',
    answer: 'Yes! After completing a ritual, you can add a photo, rate the experience, leave notes, and even mark it as a "tradition" if you want to do it again. Your memories are saved in a beautiful gallery that you can look back on together. It\'s like a scrapbook of your relationship journey.',
    category: 'features',
    keywords: ['couple memories', 'relationship journal', 'date photos'],
  },
  
  // Relationship Tips
  {
    id: 'keep-relationship-fresh',
    question: 'How do I keep my relationship fresh and exciting?',
    answer: 'The key is intentionality and novelty. Research shows that trying new activities together releases dopamine and strengthens bonds. Ritual helps by: 1) Removing decision fatigue with AI suggestions, 2) Ensuring both partners contribute to planning, 3) Introducing variety through personalized recommendations, and 4) Building anticipation through scheduled rituals.',
    category: 'relationship-tips',
    keywords: ['keep relationship exciting', 'relationship advice', 'couple activities'],
  },
  {
    id: 'busy-schedules',
    question: 'We\'re both very busy. How do we find time for rituals?',
    answer: 'That\'s exactly why Ritual exists! The weekly input takes just 2 minutes each. Rituals range from 15 minutes to half a day, so you can choose what fits your schedule. Even micro-rituals like a 20-minute coffee walk create connection. The key is consistency over duration—a short weekly ritual beats an elaborate monthly date.',
    category: 'relationship-tips',
    keywords: ['busy couples', 'quick date ideas', 'time for relationship'],
  },
  {
    id: 'long-distance',
    question: 'Does Ritual work for long-distance relationships?',
    answer: 'Absolutely! Many of our ritual suggestions work virtually: cooking the same meal together over video call, watching a movie simultaneously, playing online games, or doing a virtual museum tour. The sync feature ensures you\'re both engaged and planning together, regardless of physical distance.',
    category: 'relationship-tips',
    keywords: ['long distance relationship', 'virtual date ideas', 'LDR activities'],
  },
  {
    id: 'different-interests',
    question: 'What if my partner and I have very different interests?',
    answer: 'That\'s where Ritual shines! Our AI specifically looks for the overlap in your preferences and suggests activities that honor both perspectives. It might find that you both enjoy being outdoors even if one prefers hiking and the other prefers photography. The mood cards help surface deeper desires that often align more than surface-level interests.',
    category: 'relationship-tips',
    keywords: ['different interests couple', 'compromise in relationship', 'couple activities different hobbies'],
  },
  {
    id: 'reconnect-partner',
    question: 'How can I reconnect with my partner after a rough patch?',
    answer: 'Start small and be consistent. Ritual helps by providing a neutral, structured way to plan time together without the pressure of "fixing" things. Choose low-pressure rituals like walks or cooking at home. The act of both contributing ideas shows mutual investment. Over time, shared positive experiences rebuild connection and trust.',
    category: 'relationship-tips',
    keywords: ['reconnect with partner', 'relationship rough patch', 'rebuild relationship'],
  },
  
  // Technical
  {
    id: 'data-privacy',
    question: 'Is my data private and secure?',
    answer: 'Absolutely. Your data is encrypted in transit and at rest. We use Supabase with Row-Level Security, meaning even our database queries can only access data you\'re authorized to see. We never sell your data or share it with third parties. Your relationship is private, and so is your Ritual data.',
    category: 'technical',
    keywords: ['data privacy', 'secure couples app', 'relationship app privacy'],
  },
  {
    id: 'notifications',
    question: 'How do notifications work?',
    answer: 'You can enable push notifications to get reminded when your partner has completed their input, when rituals are generated, and when your scheduled ritual is approaching. All notifications are optional and can be customized in your profile settings.',
    category: 'technical',
    keywords: ['app notifications', 'partner reminders'],
  },
  {
    id: 'devices',
    question: 'What devices can I use Ritual on?',
    answer: 'Ritual is a progressive web app (PWA) that works on any device with a modern browser. It\'s optimized for mobile but works great on tablets and desktops too. You can even add it to your home screen for an app-like experience without downloading from an app store.',
    category: 'technical',
    keywords: ['web app', 'mobile app', 'pwa'],
  },
  
  // Pricing
  {
    id: 'free-features',
    question: 'What can I do with the free version?',
    answer: 'The free tier includes: weekly ritual input for both partners, AI-generated ritual suggestions (5 per week), ritual scheduling and completion tracking, basic streak tracking, and photo memories. It\'s fully functional for building your ritual habit!',
    category: 'pricing',
    keywords: ['free couples app', 'ritual free tier'],
  },
  {
    id: 'premium-features',
    question: 'What does Ritual Premium include?',
    answer: 'Premium unlocks: unlimited ritual suggestions (7+ per week), surprise rituals delivered throughout the week, advanced streak insights and patterns, partner reactions on memories, unlimited photo storage, bucket list feature, and priority support. It\'s designed for couples who want to go deeper.',
    category: 'pricing',
    keywords: ['ritual premium', 'paid couples app features'],
  },
  {
    id: 'cancel-subscription',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel anytime from your profile settings. You\'ll continue to have Premium access until the end of your billing period. After that, you\'ll revert to the free tier but keep all your memories and history.',
    category: 'pricing',
    keywords: ['cancel subscription', 'subscription policy'],
  },
];

// Helper to get FAQs by category
export const getFAQsByCategory = (category: FAQItem['category']): FAQItem[] => {
  return FAQ_DATA.filter(faq => faq.category === category);
};

// Generate FAQ Schema for SEO
export const generateFAQSchema = (faqs: FAQItem[] = FAQ_DATA) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};
