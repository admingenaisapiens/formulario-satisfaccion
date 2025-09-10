-- Update the waiting_time check constraint to match the new 3-option format
ALTER TABLE public.survey_responses 
DROP CONSTRAINT survey_responses_waiting_time_check;

ALTER TABLE public.survey_responses 
ADD CONSTRAINT survey_responses_waiting_time_check 
CHECK (waiting_time = ANY (ARRAY['malo'::text, 'normal'::text, 'bueno'::text]));