-- Allow agents to delete bookings for their properties
CREATE POLICY "Agents can delete bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'::user_role));