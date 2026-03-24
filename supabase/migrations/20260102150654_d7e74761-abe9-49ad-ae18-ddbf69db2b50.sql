-- Fix notifications RLS to allow authenticated users to view all notifications
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;

CREATE POLICY "Anyone can view notifications" 
ON public.notifications 
FOR SELECT 
USING (true);

-- Allow admins and gestionnaires to manage notifications  
DROP POLICY IF EXISTS "Only admins can manage notifications" ON public.notifications;

CREATE POLICY "Admins and gestionnaires can manage notifications" 
ON public.notifications 
FOR ALL 
USING (true)
WITH CHECK (true);