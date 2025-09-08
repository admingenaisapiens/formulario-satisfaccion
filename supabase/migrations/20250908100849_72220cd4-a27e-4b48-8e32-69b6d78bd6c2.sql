-- Add new fields to survey_responses table
ALTER TABLE survey_responses ADD COLUMN website_design_rating integer;
ALTER TABLE survey_responses ADD COLUMN appointment_type text;
ALTER TABLE survey_responses ADD COLUMN treatment_type text;
ALTER TABLE survey_responses ADD COLUMN body_area text;
ALTER TABLE survey_responses ADD COLUMN other_treatment text;
ALTER TABLE survey_responses ADD COLUMN other_body_area text;