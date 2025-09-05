-- Create survey responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Experiencia General y Reserva
  booking_ease INTEGER NOT NULL CHECK (booking_ease >= 1 AND booking_ease <= 5),
  wait_time_satisfaction INTEGER NOT NULL CHECK (wait_time_satisfaction >= 1 AND wait_time_satisfaction <= 5),
  communication_clarity INTEGER NOT NULL CHECK (communication_clarity >= 1 AND communication_clarity <= 5),
  -- Experiencia en la Consulta
  reception_friendliness INTEGER NOT NULL CHECK (reception_friendliness >= 1 AND reception_friendliness <= 5),
  waiting_time TEXT NOT NULL CHECK (waiting_time IN ('less_than_5', '5_to_15', '15_to_30', 'more_than_30')),
  clinic_environment INTEGER NOT NULL CHECK (clinic_environment >= 1 AND clinic_environment <= 5),
  -- Experiencia con el Doctor
  doctor_listening INTEGER NOT NULL CHECK (doctor_listening >= 1 AND doctor_listening <= 5),
  explanation_clarity INTEGER NOT NULL CHECK (explanation_clarity >= 1 AND explanation_clarity <= 5),
  consultation_time INTEGER NOT NULL CHECK (consultation_time >= 1 AND consultation_time <= 5),
  treatment_trust INTEGER NOT NULL CHECK (treatment_trust >= 1 AND treatment_trust <= 5),
  -- Valoración Global
  nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  additional_comments TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctors/users table for authentication
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_responses
-- Anyone can insert survey responses (public form)
CREATE POLICY "Anyone can insert survey responses" 
ON public.survey_responses 
FOR INSERT 
WITH CHECK (true);

-- Only authenticated doctors can view survey responses
CREATE POLICY "Doctors can view all survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE doctors.user_id = auth.uid()
  )
);

-- RLS Policies for doctors
-- Doctors can view their own profile
CREATE POLICY "Doctors can view their own profile" 
ON public.doctors 
FOR SELECT 
USING (user_id = auth.uid());

-- Doctors can update their own profile
CREATE POLICY "Doctors can update their own profile" 
ON public.doctors 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_survey_responses_updated_at
BEFORE UPDATE ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration (doctors)
CREATE OR REPLACE FUNCTION public.handle_new_doctor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.doctors (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create doctor profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_doctor();