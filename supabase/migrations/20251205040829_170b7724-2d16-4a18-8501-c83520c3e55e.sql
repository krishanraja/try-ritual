-- Push subscriptions table for web push notifications
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Surprise rituals table for premium feature
CREATE TABLE public.surprise_rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL,
  ritual_data JSONB NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(couple_id, month)
);

-- Enable RLS
ALTER TABLE public.surprise_rituals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for surprise_rituals
CREATE POLICY "Users can view their couple's surprise rituals"
ON public.surprise_rituals FOR SELECT
USING (EXISTS (
  SELECT 1 FROM couples
  WHERE couples.id = surprise_rituals.couple_id
  AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
));

CREATE POLICY "Users can update their couple's surprise rituals"
ON public.surprise_rituals FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM couples
  WHERE couples.id = surprise_rituals.couple_id
  AND (couples.partner_one = auth.uid() OR couples.partner_two = auth.uid())
));

-- Add promo_code column to couples table to track applied promos
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS applied_promo_code TEXT;