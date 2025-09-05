-- 1) Create ENUM app_role safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'patient');
  END IF;
END$$;

-- 2) Create user_roles table to manage roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable and force RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- 3) Security definer function to check roles (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- 4) Tight policies for user_roles (only admins can manage)
DROP POLICY IF EXISTS "Admins can select roles" ON public.user_roles;
CREATE POLICY "Admins can select roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) Update survey_responses SELECT policy to RBAC
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses FORCE ROW LEVEL SECURITY;

-- Remove legacy broad doctor-based policy if it exists
DROP POLICY IF EXISTS "Doctors can view all survey responses" ON public.survey_responses;

-- Allow only verified medical staff (doctor/admin) to view
CREATE POLICY "Only authorized medical staff can view survey responses"
ON public.survey_responses
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')
);

-- Keep existing public INSERT (patients can submit)
DROP POLICY IF EXISTS "Anyone can insert survey responses" ON public.survey_responses;
CREATE POLICY "Anyone can insert survey responses"
ON public.survey_responses
FOR INSERT
WITH CHECK (true);
