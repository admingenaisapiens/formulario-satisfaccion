-- First update existing data to match new format
UPDATE public.survey_responses 
SET waiting_time = CASE 
  WHEN waiting_time = 'less_than_5' THEN 'bueno'
  WHEN waiting_time = '5_to_15' THEN 'normal' 
  WHEN waiting_time = '15_to_30' THEN 'normal'
  WHEN waiting_time = 'more_than_30' THEN 'malo'
  ELSE waiting_time
END
WHERE waiting_time IN ('less_than_5', '5_to_15', '15_to_30', 'more_than_30');

-- Then update the constraint
ALTER TABLE public.survey_responses 
DROP CONSTRAINT survey_responses_waiting_time_check;

ALTER TABLE public.survey_responses 
ADD CONSTRAINT survey_responses_waiting_time_check 
CHECK (waiting_time = ANY (ARRAY['malo'::text, 'normal'::text, 'bueno'::text]));