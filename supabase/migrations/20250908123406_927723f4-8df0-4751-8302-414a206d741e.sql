-- Assign doctor role to the current user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('2ac72cf4-5ee7-482d-8d84-3dcb0ac2fe49', 'doctor')
ON CONFLICT (user_id, role) DO NOTHING;