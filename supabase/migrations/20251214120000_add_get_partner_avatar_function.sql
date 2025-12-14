-- Migration: Add get_partner_avatar function
-- Purpose: Allow fetching partner's avatar_id securely
-- Date: 2025-12-14

-- Create function to get partner's avatar_id
-- Uses SECURITY DEFINER to bypass RLS, but checks partnership first
CREATE OR REPLACE FUNCTION public.get_partner_avatar(partner_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT avatar_id FROM profiles WHERE id = partner_id AND is_partner(partner_id)
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_partner_avatar(uuid) TO authenticated;
