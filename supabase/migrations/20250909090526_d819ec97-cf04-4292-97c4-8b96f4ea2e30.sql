-- Agregar nuevos campos para fuente de conocimiento
ALTER TABLE public.survey_responses 
ADD COLUMN how_did_you_know_us TEXT,
ADD COLUMN referral_details TEXT;