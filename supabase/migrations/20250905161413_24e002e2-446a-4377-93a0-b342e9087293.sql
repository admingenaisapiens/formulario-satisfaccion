-- Harden RLS on doctors table to ensure no public reads
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors FORCE ROW LEVEL SECURITY;

-- Recreate tightly scoped policies to authenticated users only
DROP POLICY IF EXISTS "Doctors can view their own profile" ON public.doctors;
CREATE POLICY "Doctors can view their own profile"
ON public.doctors
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can update their own profile" ON public.doctors;
CREATE POLICY "Doctors can update their own profile"
ON public.doctors
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
