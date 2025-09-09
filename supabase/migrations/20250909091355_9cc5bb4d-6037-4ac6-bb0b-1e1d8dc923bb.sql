-- Add new columns to survey_responses table
ALTER TABLE public.survey_responses 
ADD COLUMN how_did_you_know_us TEXT,
ADD COLUMN referral_details TEXT;