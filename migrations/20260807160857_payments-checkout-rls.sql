ALTER TABLE payments.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.stripe_customer_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professionals create their stripe checkout sessions"
ON payments.stripe_checkout_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  subject_type = 'professional'
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id::text = subject_id
      AND p.auth_id = auth.uid()::text
  )
);

CREATE POLICY "professionals read their stripe checkout sessions"
ON payments.stripe_checkout_sessions
FOR SELECT
TO authenticated
USING (
  subject_type = 'professional'
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id::text = subject_id
      AND p.auth_id = auth.uid()::text
  )
);

CREATE POLICY "professionals create their stripe portal sessions"
ON payments.stripe_customer_portal_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  subject_type = 'professional'
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id::text = subject_id
      AND p.auth_id = auth.uid()::text
  )
);

CREATE POLICY "professionals read their stripe portal sessions"
ON payments.stripe_customer_portal_sessions
FOR SELECT
TO authenticated
USING (
  subject_type = 'professional'
  AND EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id::text = subject_id
      AND p.auth_id = auth.uid()::text
  )
);
