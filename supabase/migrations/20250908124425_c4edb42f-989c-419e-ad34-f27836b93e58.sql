-- Actualizar la tabla survey_responses para coincidir con el formulario actual

-- Primero, hacer que los campos requeridos del formulario no sean nullable
ALTER TABLE public.survey_responses 
ALTER COLUMN website_design_rating SET NOT NULL,
ALTER COLUMN appointment_type SET NOT NULL,
ALTER COLUMN treatment_type SET NOT NULL,
ALTER COLUMN body_area SET NOT NULL;

-- Eliminar campos obsoletos que ya no están en el formulario
ALTER TABLE public.survey_responses 
DROP COLUMN IF EXISTS booking_ease,
DROP COLUMN IF EXISTS wait_time_satisfaction,
DROP COLUMN IF EXISTS treatment_trust;

-- Comentario: Los siguientes campos ya existen y están configurados correctamente:
-- website_design_rating (NOT NULL) - "¿Te resultó fácil usar nuestra página web?"
-- communication_clarity (NOT NULL) - "¿Fue clara y útil la comunicación previa a tu cita?"
-- appointment_type (NOT NULL) - Tipo de cita (presencial/telematica)
-- treatment_type (NOT NULL) - Tipo de tratamiento
-- other_treatment (NULLABLE) - Especificar otro tratamiento
-- body_area (NOT NULL) - Zona del cuerpo tratada
-- other_body_area (NULLABLE) - Especificar otra zona del cuerpo
-- reception_friendliness (NOT NULL) - Amabilidad del personal de recepción
-- waiting_time (NOT NULL) - Tiempo de espera
-- clinic_environment (NOT NULL) - Ambiente de la consulta
-- doctor_listening (NOT NULL) - Comunicación con el doctor
-- explanation_clarity (NOT NULL) - Claridad de las explicaciones
-- consultation_time (NOT NULL) - Tiempo suficiente de consulta
-- nps_score (NOT NULL) - Puntuación NPS
-- additional_comments (NULLABLE) - Comentarios adicionales