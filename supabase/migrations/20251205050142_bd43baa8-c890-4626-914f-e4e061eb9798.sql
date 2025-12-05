-- Analytics events table for tracking user behavior
CREATE TABLE public.user_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert their own analytics"
ON public.user_analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can view their own analytics
CREATE POLICY "Users can view their own analytics"
ON public.user_analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_analytics_user_id ON public.user_analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON public.user_analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON public.user_analytics_events(created_at);

-- User feedback table with rich context
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('quick_reaction', 'feature_request', 'bug_report', 'general', 'nps_score')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL)),
  message TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  page_context TEXT,
  user_journey_stage TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert feedback
CREATE POLICY "Users can insert feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Index for feedback
CREATE INDEX idx_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_feedback_type ON public.user_feedback(feedback_type);

-- Contact submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert contact submissions (for non-logged-in users too)
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.contact_submissions
FOR SELECT
USING (auth.uid() = user_id);