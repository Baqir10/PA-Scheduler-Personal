-- Allow anyone to look up organizations by email for worker signup
CREATE POLICY "Anyone can read organization emails for signup"
ON public.organizations
FOR SELECT
USING (true);