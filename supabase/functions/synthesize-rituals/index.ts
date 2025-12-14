import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Location context utilities
type City = 'London' | 'Sydney' | 'Melbourne' | 'New York';

const CITY_DATA: Record<City, { timezone: string; country: string; emoji: string }> = {
  'London': { timezone: 'Europe/London', country: 'United Kingdom', emoji: '🇬🇧' },
  'Sydney': { timezone: 'Australia/Sydney', country: 'Australia', emoji: '🦘' },
  'Melbourne': { timezone: 'Australia/Melbourne', country: 'Australia', emoji: '☕' },
  'New York': { timezone: 'America/New_York', country: 'United States', emoji: '🗽' },
};

const getCityTime = (city: City): Date => {
  const timezone = CITY_DATA[city].timezone;
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
};

const getTimeOfDay = (city: City): string => {
  const hour = getCityTime(city).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

const getSeason = (city: City): string => {
  const now = getCityTime(city);
  const month = now.getMonth();
  const isSouthern = city === 'Sydney' || city === 'Melbourne';
  
  if (isSouthern) {
    if (month >= 9 && month <= 11) return 'spring';
    if (month >= 0 && month <= 2) return 'summer';
    if (month >= 3 && month <= 5) return 'autumn';
    return 'winter';
  }
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const getSeasonalGuidance = (season: string, city: City): string => {
  const seasonal = {
    spring: 'Outdoor activities emerging, mild weather, blooming nature',
    summer: 'Peak outdoor season, long daylight, beach/park activities',
    autumn: 'Cozy indoor-outdoor mix, changing foliage, harvest themes',
    winter: 'Indoor-focused with occasional outdoor adventures, warm experiences',
  };
  
  if (city === 'Sydney' || city === 'Melbourne') {
    return seasonal[season as keyof typeof seasonal] + ' (Southern Hemisphere)';
  }
  return seasonal[season as keyof typeof seasonal];
};

const getLocationContext = (city: City) => {
  const season = getSeason(city);
  const timeOfDay = getTimeOfDay(city);
  const cityData = CITY_DATA[city];
  const localTime = getCityTime(city).toLocaleString('en-US', {
    timeZone: cityData.timezone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  
  return {
    city,
    timezone: cityData.timezone,
    country: cityData.country,
    season,
    timeOfDay,
    localTime,
  };
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: 'synthesize-rituals',
    message,
    ...data,
  }));
};

// Intimacy Training Dataset - Core Framework for AI to anchor from
const INTIMACY_TRAINING_CONTEXT = `
## CORE INTIMACY DIMENSIONS FRAMEWORK

These are the fundamental building blocks for creating connection:

### Emotional Vulnerability
- Description: Sharing feelings, fears, dreams without judgment
- Ritual Markers: Question prompts, reflection time, no distractions, safe space creation

### Physical Touch
- Description: Non-sexual and sexual physical connection
- Ritual Markers: Touch-based activities, proximity required, slow pacing, sensory focus

### Shared Experience
- Description: Creating memories together through novel activities
- Ritual Markers: Collaborative tasks, mutual participation, shared decision making, joint discovery

### Quality Attention
- Description: Undivided focus on each other
- Ritual Markers: No multitasking, dedicated time block, minimal external stimuli, intentional focus

### Playfulness
- Description: Joy, laughter, and lightheartedness together
- Ritual Markers: Low stakes, competitive elements, humor encouraged, spontaneity allowed

### Appreciation
- Description: Expressing gratitude and recognition
- Ritual Markers: Reflection prompts, gratitude exercises, praise opportunities, acknowledgment moments

---

## MOOD CARD TO INTIMACY DIMENSION MAPPING

| Card | Primary Dimensions | Ritual Bias | Avoid |
|------|-------------------|-------------|-------|
| Deep Talk | Emotional Vulnerability, Quality Attention | Conversation-based, slower paced, question prompts | Loud environments, time pressure, distractions |
| Romantic | Physical Touch, Appreciation, Quality Attention | Sensory experiences, touch-based, intimate settings | Public spaces, high energy, group activities |
| Playful | Playfulness, Shared Experience | Games, competitions, laughter, lighthearted | Serious topics, heavy emotions, formal settings |
| Adventure | Shared Experience, Playfulness | Novel activities, physical engagement, exploration | Routine locations, passive consumption |
| Cozy | Physical Touch, Quality Attention | Home-based, comfort, warmth, close proximity | Outdoor cold, crowded spaces, high energy |
| Creative | Shared Experience, Playfulness | Making together, artistic expression, joint projects | Consumption only, spectating |
| Outdoors | Shared Experience, Quality Attention | Nature, fresh air, movement, scenic | Indoor only, sedentary |
| Foodie | Shared Experience, Playfulness | Culinary exploration, taste together, cooking or dining | Fast food, eating separately |
| Tired | Physical Touch, Appreciation | Low energy, restorative, gentle, minimal planning | High stimulation, long duration, complexity |
| Spontaneous | Playfulness, Shared Experience | Improvisation, surprise elements, flexibility | Rigid structure, heavy planning, reservations required |

---

## MANDATORY RITUAL QUALITY ELEMENTS

Every ritual MUST include:

1. **Phone-free time**: Explicitly state "phones away" or "airplane mode"
2. **Mutual participation**: Both partners actively engaged, not one watching the other
3. **Reflection moment**: Include "at the end, share..." or "afterwards, talk about..."
4. **Clear start and end**: Specific trigger to begin, clear closing ritual

### Bonus Elements to Include:
- Sensory detail: Light candles, play this music, wear comfy clothes
- Permission to be silly: Laugh at yourselves, no judgment, embrace the awkward
- Physical proximity: Sit close, hold hands during, face each other
- Surprise element: One partner picks the playlist, other picks the snack

---

## RITUAL ARCHETYPES

### Deep Conversation Archetype
- Primary: Emotional Vulnerability, Quality Attention
- Structure: Create distraction-free environment → Structured conversation with prompts → Reflection on what was shared
- Duration: 60-90 minutes
- Environment: Quiet, comfortable, minimal lighting

### Touch & Presence Archetype
- Primary: Physical Touch, Quality Attention
- Structure: Create comfortable, private space → Physical connection without agenda → Rest together in silence
- Duration: 30-60 minutes
- Environment: Private, warm, sensory-rich

### Shared Challenge Archetype
- Primary: Shared Experience, Playfulness
- Structure: Choose activity neither has mastered → Learn/attempt together → Celebrate attempt regardless of outcome
- Success Metrics: Laughter during activity, helping each other, shared pride

### Appreciation Ritual Archetype
- Primary: Appreciation, Emotional Vulnerability
- Structure: Set timer for equal time each → Express specific appreciation → Physical embrace
- Formats: 3 things ritual, love letter exchange, compliment overload, gratitude walk

### Novel Experience Archetype
- Primary: Shared Experience, Playfulness
- Structure: Choose something neither has done → Experience with curiosity → Debrief what surprised you
- Benefit: Novelty releases dopamine, creating positive association with partner

---

## ANTI-PATTERNS: WHAT NOT TO GENERATE

| Bad Ritual | Why It's Bad | How to Fix |
|------------|--------------|------------|
| Watch a movie | Passive consumption, no interaction, no intimacy mechanism | Watch movie THEN discuss using prompts: What character did you relate to? What scene made you think of us? |
| Go out to dinner | Too vague, no structure, default option | Try new cuisine, each order something never had, feed each other bites, rate dishes together |
| Have a deep conversation | No prompts, too broad | Use specific questions: What's something you need more of from me? What are you worried about? |
| Be romantic | Vague action, no clear activity | Dance slowly to three songs with candles lit, maintaining eye contact during slowest parts |
| Cuddle on the couch | Too passive, no novelty | Each reads aloud one paragraph from a book, switching back and forth, discussing |

---

## EXAMPLE PERFECT RITUALS TO EMULATE

### Sunset Gratitude Walk
Walk to a scenic viewpoint together as the sun sets. No phones, just holding hands. Take turns sharing three specific things you're grateful for about each other this week. When you reach the viewpoint, watch the sunset in silence for 60 seconds, then share one hope for next week. Walk home still holding hands.
- Time: 1 hour | Budget: Free | Category: Appreciation
- Why: Combines movement (endorphins), nature (cortisol reduction), physical touch (oxytocin), specific gratitude (bond strengthening), silence (presence), future hope (shared vision)

### Cook in the Dark
Cook dinner together with just candles for light. No overhead lights. Pick a simple recipe you both know by heart. As you cook, take turns sharing childhood food memories. Play music from when you first met. Taste test everything together before serving.
- Time: 2 hours | Budget: $ | Category: Food
- Why: Novelty (dark cooking), teamwork (coordination), nostalgia (childhood + first-met music), sensory (candlelight, taste testing), playfulness

### Question Card Roulette
Each write 5 questions on separate cards: 3 deep (fears, dreams, needs), 2 playful (silly hypotheticals, favorites). Shuffle together. Take turns pulling a card and both answering. No skipping. After each question, high-five or hug before pulling the next. End by each sharing which answer surprised them most.
- Time: 1 hour | Budget: Free | Category: Conversation
- Why: Balance of depth and playfulness, both contribute (equal effort), physical touch built in, surprise element, reflection at end

### Massage Trade with Soundtrack
One person picks a 30-minute playlist. The other gives a slow massage for the duration. No talking, just presence. When the playlist ends, switch. After both massages, lie together for 5 minutes in silence, then share one thing your body needed that you didn't realize.
- Time: 90 minutes | Budget: Free | Category: Touch
- Why: Pure touch focus, music adds sensory layer, equal time (fairness), silence builds presence, body awareness reflection

### Neighborhood Scavenger Hunt
Create a list together: find something beautiful, something funny, something that reminds you of your partner, something you've never noticed. Walk around neighborhood for 45 minutes collecting these. Race back home. Over tea, share what you found for each category and why. Award silly prizes.
- Time: 90 minutes | Budget: Free | Category: Adventure
- Why: Reframes familiar as novel, teamwork and competition, laughter, appreciation, low effort high creativity
`;

// Context-aware ritual modifiers based on relationship state
const getRelationshipContextModifiers = () => `
## CONTEXT-AWARE RITUAL MODIFIERS

### High Stress Period (work pressure, external stress)
- Intimacy Need: Appreciation + Quality Attention
- Increase: Low effort, home-based, restorative, affirming
- Decrease: Planning complexity, travel time, decision fatigue
- Tone: Supportive, gentle, nurturing

### Relationship Tension (recent conflict, distance)
- Intimacy Need: Emotional Vulnerability + Playfulness
- Increase: Lighthearted activities, teamwork required, laughter opportunities
- Decrease: Serious conversations, competition, criticism potential
- Tone: Reconnecting, low pressure, cooperative

### Routine/Boredom (feeling stale, predictable)
- Intimacy Need: Shared Experience + Playfulness
- Increase: Novelty, adventure, surprise, trying new
- Decrease: Familiar activities, home-based, passive
- Tone: Exploratory, exciting, unpredictable

### High Connection Period (already feeling close)
- Intimacy Need: Appreciation + Emotional Vulnerability
- Increase: Depth, vulnerability, future planning, celebration
- Decrease: Surface level, distraction
- Tone: Deepening, grateful, visionary
`;

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', 'Function invoked', { requestId, method: req.method });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      log('error', 'LOVABLE_API_KEY not configured', { requestId });
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client for historical data
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, currentRitual, coupleId, partnerOneInput, partnerTwoInput, userCity } = await req.json();

    // FIX #6: Sanitize user input to prevent prompt injection
    const sanitizeInput = (input: any): any => {
      if (!input) return input;
      
      if (typeof input === 'string') {
        // Remove potential prompt injection patterns
        // Remove common injection patterns like "Ignore previous instructions", "System:", etc.
        return input
          .replace(/ignore\s+previous\s+instructions/gi, '')
          .replace(/system\s*:/gi, '')
          .replace(/assistant\s*:/gi, '')
          .replace(/user\s*:/gi, '')
          .replace(/\[INST\]/gi, '')
          .replace(/\[\/INST\]/gi, '')
          .replace(/<\|im_start\|>/gi, '')
          .replace(/<\|im_end\|>/gi, '')
          .trim();
      }
      
      if (typeof input === 'object' && input !== null) {
        const sanitized: any = Array.isArray(input) ? [] : {};
        for (const key in input) {
          sanitized[key] = sanitizeInput(input[key]);
        }
        return sanitized;
      }
      
      return input;
    };

    const sanitizedPartnerOneInput = sanitizeInput(partnerOneInput);
    const sanitizedPartnerTwoInput = sanitizeInput(partnerTwoInput);

    // Get location context - use userCity parameter that's actually sent from the client
    const preferredCity = (userCity || 'New York') as City;
    const locationContext = getLocationContext(preferredCity);
    
    log('info', 'Location context resolved', { requestId, city: locationContext.city, season: locationContext.season });

    // Fetch historical data for context
    let historicalContext = '';
    if (coupleId) {
      // Get all weekly cycles for this couple
      const { data: cycles } = await supabaseClient
        .from('weekly_cycles')
        .select('id')
        .eq('couple_id', coupleId);

      const cycleIds = cycles?.map(c => c.id) || [];

      // Get completed rituals
      const { data: completions } = await supabaseClient
        .from('completions')
        .select('ritual_title, completed_at')
        .in('weekly_cycle_id', cycleIds)
        .order('completed_at', { ascending: false })
        .limit(20);

      // Get rated memories
      const { data: memories } = await supabaseClient
        .from('ritual_memories')
        .select('ritual_title, rating, notes')
        .eq('couple_id', coupleId)
        .order('rating', { ascending: false })
        .limit(10);

      const completedTitles = completions?.map(c => c.ritual_title) || [];
      const uniqueCompleted = [...new Set(completedTitles)];
      
      const highlyRated = memories?.filter(m => m.rating && m.rating >= 4) || [];
      const notesWithContent = memories?.filter(m => m.notes && m.notes.trim()) || [];

      // Get bucket list items
      const { data: bucketList } = await supabaseClient
        .from('bucket_list_items')
        .select('title')
        .eq('couple_id', coupleId)
        .eq('completed', false)
        .limit(20);

      const bucketListItems = bucketList?.map(b => b.title) || [];

      historicalContext = `
HISTORICAL CONTEXT - What They've Experienced:
${uniqueCompleted.length > 0 ? `
✅ Rituals they've already completed (DO NOT REPEAT THESE):
${uniqueCompleted.slice(0, 15).map(title => `- "${title}"`).join('\n')}
${uniqueCompleted.length > 15 ? `... and ${uniqueCompleted.length - 15} more` : ''}
` : '- No rituals completed yet - this is their first week!'}

${highlyRated.length > 0 ? `
⭐ Highly Rated Experiences (4-5 stars) - LEAN INTO THESE THEMES:
${highlyRated.map(m => `- "${m.ritual_title}" (${m.rating}★)`).join('\n')}
` : ''}

${notesWithContent.length > 0 ? `
💭 Their Reflections - USE THESE INSIGHTS:
${notesWithContent.slice(0, 5).map(m => `- "${m.ritual_title}": ${m.notes}`).join('\n')}
` : ''}

${bucketListItems.length > 0 ? `
🎯 THEIR BUCKET LIST - Consider incorporating these dreams:
${bucketListItems.slice(0, 10).map(item => `- "${item}"`).join('\n')}
` : ''}
`;
    }

    if (action === 'swap') {
      const swapPrompt = `You are an expert relationship ritual designer trained on intimacy psychology. Create ONE alternative ritual to replace the current one.

${INTIMACY_TRAINING_CONTEXT}

${getRelationshipContextModifiers()}

---

## CURRENT SWAP REQUEST

Current ritual to replace: "${currentRitual.title}"
Why they want to swap: They want something different but similarly matched to their needs.

LOCATION CONTEXT:
- City: ${locationContext.city}, ${locationContext.country}
- Local time: ${locationContext.localTime}
- Season: ${locationContext.season}
- Time of day: ${locationContext.timeOfDay}
- Seasonal guidance: ${getSeasonalGuidance(locationContext.season, preferredCity)}

${historicalContext}

THEIR CURRENT INPUTS:
Partner 1: Energy ${sanitizedPartnerOneInput?.energy}, Time ${sanitizedPartnerOneInput?.availability}, Budget ${sanitizedPartnerOneInput?.budget}
Partner 2: Energy ${sanitizedPartnerTwoInput?.energy}, Time ${sanitizedPartnerTwoInput?.availability}, Budget ${sanitizedPartnerTwoInput?.budget}

## GENERATION INSTRUCTIONS

1. Map their inputs to intimacy dimensions from the framework above
2. Select an appropriate archetype that matches their needs
3. Use the quality signals checklist - every ritual MUST have phone-free time, mutual participation, reflection moment, and clear boundaries
4. Reference the example rituals for tone and structure
5. AVOID all anti-patterns listed above
6. Include at least 2 sensory details
7. Write a "why" that explains the intimacy mechanism (which dimensions it targets)

CRITICAL CONSTRAINTS:
1. DO NOT repeat "${currentRitual.title}" or any completed ritual
2. Match their energy/time/budget constraints closely
3. SURPRISE FACTOR: Make this something they'd never think of themselves (rate your own surprise 1-10, must be 7+)
4. Must feel "worth the swap" - more interesting than what they're replacing
5. LOCATION-AWARE: Must be authentic to ${locationContext.city} in ${locationContext.season}

Return ONE ritual as JSON:
{
  "title": "Short, evocative title",
  "description": "3-4 sentences with specific, sensory instructions. Include phone-free reminder. Include reflection prompt at end.",
  "time_estimate": "30min" | "1-2hrs" | "3+ hrs",
  "budget_band": "free" | "$" | "$$" | "$$$",
  "category": "conversation" | "touch" | "adventure" | "appreciation" | "creative" | "food" | "outdoors",
  "why": "One sentence explaining which intimacy dimensions this targets and why it's perfect for them"
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: swapPrompt }],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        log('error', 'AI API error on swap', { requestId, status: response.status, error: errorText });
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const ritual = JSON.parse(content);

      return new Response(JSON.stringify({ ritual }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper to format card-based or legacy input
    const formatInput = (input: Record<string, unknown>) => {
      if (input?.inputType === 'cards' && Array.isArray(input.cards)) {
        const cardLabels = (input.cards as string[]).map(id => {
          const cardMap: Record<string, string> = {
            'adventure': 'Craving adventure',
            'cozy': 'Need cozy time',
            'deep-talk': 'Want deep conversations',
            'playful': 'Feeling playful',
            'romantic': 'Craving romance',
            'tired': 'Exhausted',
            'spontaneous': 'Ready for anything',
            'outdoors': 'Want fresh air',
            'creative': 'Feeling creative',
            'foodie': 'Food-focused',
            'budget': 'Keeping it free',
            'splurge': 'Ready to splurge',
          };
          return cardMap[id] || id;
        });
        return `Selected moods: ${cardLabels.join(', ')}${input.desire ? `\nHeart's Desire: ${input.desire}` : ''}`;
      }
      // Legacy format
      return `Energy: ${input?.energy}, Time: ${input?.availability}, Budget: ${input?.budget}, Craving: ${input?.craving}${input?.desire ? `, Desire: ${input.desire}` : ''}`;
    };

    // Main synthesis with intimacy training context
    const fullPrompt = `You are an expert relationship ritual designer trained on intimacy psychology and evidence-based bonding techniques. Create a WEEK of personalized rituals for a couple.

${INTIMACY_TRAINING_CONTEXT}

${getRelationshipContextModifiers()}

---

## THIS COUPLE'S CONTEXT

${historicalContext}

THEIR THIS WEEK'S INPUTS:
Partner 1: ${formatInput(sanitizedPartnerOneInput)}
Partner 2: ${formatInput(sanitizedPartnerTwoInput)}

LOCATION CONTEXT (CRITICAL - All rituals must fit this):
- City: ${locationContext.city}, ${locationContext.country}
- Local time: ${locationContext.localTime}
- Season: ${locationContext.season}
- Seasonal guidance: ${getSeasonalGuidance(locationContext.season, preferredCity)}

---

## GENERATION INSTRUCTIONS

### Step 1: Identify Intimacy Needs
- Map their selected cards to primary intimacy dimensions using the mapping table above
- If cards overlap: lean into that dimension strongly
- If cards diverge: find rituals that satisfy both (e.g., one "Adventure", one "Cozy" = cozy adventure like stargazing with blankets)

### Step 2: Select Archetypes
- Choose from: Deep Conversation, Touch & Presence, Shared Challenge, Appreciation Ritual, Novel Experience
- Bias toward archetypes that match identified dimensions
- Ensure variety across the week

### Step 3: Build Each Ritual
MANDATORY elements (every ritual MUST have):
- Phone-free instruction (explicitly stated)
- Mutual participation (both actively engaged)
- Reflection moment (share/discuss prompt at end)
- Clear start and end (specific trigger and closing)

BONUS elements to include:
- Sensory details (lighting, music, textures, tastes)
- Permission to be silly
- Physical proximity built in
- Surprise element

### Step 4: Quality Checks
- Does it require BOTH partners to participate actively? (not one watching the other)
- Is there a clear intimacy mechanism? (what specifically creates connection)
- Could they realistically complete it in the time estimate?
- Is it appropriate for ${locationContext.city} in ${locationContext.season}?
- Does it AVOID all anti-patterns? (no passive consumption, no vague instructions)
- Does it avoid past completed rituals?
- Does it lean into themes from highly-rated rituals?

### Step 5: Write the "Why"
2-3 sentences explaining:
- Which intimacy dimensions this targets
- Why it's suited to their card selections
- What specifically creates the connection (the mechanism)

---

## OUTPUT REQUIREMENTS

Generate 4-5 rituals spanning different archetypes:
- At least ONE micro-ritual (15-30 min) for busy moments
- At least ONE deeper ritual (1-2 hours)
- Mix of home-based and outside activities (weather-appropriate)
- Each must score 7+ on surprise factor (1-10 scale)

Return JSON array:
[
  {
    "title": "Short, evocative title",
    "description": "3-4 sentences with specific, sensory instructions. Include phone-free reminder. Include reflection prompt at end.",
    "time_estimate": "15min" | "30min" | "1hr" | "1-2hrs" | "2-3hrs",
    "budget_band": "free" | "$" | "$$" | "$$$",
    "category": "conversation" | "touch" | "adventure" | "appreciation" | "creative" | "food" | "outdoors",
    "why": "2-3 sentences explaining intimacy dimensions targeted and why it's perfect for them"
  }
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
        const errorText = await response.text();
        log('error', 'AI API error on synthesis', { requestId, status: response.status, error: errorText });
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const rituals = JSON.parse(content);

      const executionTime = Date.now() - startTime;
      log('info', 'Synthesis completed', { requestId, ritualsCount: rituals.length, executionTimeMs: executionTime });

      return new Response(JSON.stringify({ rituals }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      log('error', 'Function failed', { requestId, error: errorMessage, executionTimeMs: executionTime });
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
});