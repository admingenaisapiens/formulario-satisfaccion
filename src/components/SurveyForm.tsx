import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, ClipboardCheck } from 'lucide-react';

const surveySchema = z.object({
  // Sección 1: Experiencia General y Reserva (OBLIGATORIAS)
  website_design_rating: z.number().min(1).max(3),
  communication_clarity: z.number().min(1).max(3),
  
  // Sección 2: Tipo de Cita y Tratamiento (OBLIGATORIAS)
  appointment_type: z.enum(['presencial', 'telematica']),
  treatment_type: z.string().min(1),
  other_treatment: z.string().optional(),
  body_area: z.string().min(1),
  other_body_area: z.string().optional(),
  
  // Sección 3: Experiencia en la Consulta (OBLIGATORIAS)
  reception_friendliness: z.number().min(1).max(5),
  waiting_time: z.enum(['less_than_5', '5_to_15', '15_to_30', 'more_than_30']),
  clinic_environment: z.number().min(1).max(5),
  
  // Sección 4: Experiencia con el Doctor/Profesional (OBLIGATORIAS)
  doctor_listening: z.number().min(1).max(5),
  explanation_clarity: z.number().min(1).max(5),
  consultation_time: z.number().min(1).max(5),
  
  // Sección 5: Valoración Global (primera obligatoria, segunda opcional)
  nps_score: z.number().min(0).max(10),
  additional_comments: z.string().optional(),
  
  // Sección 6: Cómo nos conociste (TODA OPCIONAL)
  how_did_you_know_us: z.string().optional(),
  referral_details: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

export const SurveyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      website_design_rating: 2,
      communication_clarity: 2,
      appointment_type: 'presencial',
      treatment_type: '',
      other_treatment: '',
      body_area: '',
      other_body_area: '',
      reception_friendliness: 3,
      waiting_time: 'less_than_5',
      clinic_environment: 3,
      doctor_listening: 3,
      explanation_clarity: 3,
      consultation_time: 3,
      nps_score: 5,
      additional_comments: '',
      how_did_you_know_us: '',
      referral_details: '',
    },
  });

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('survey_responses')
        .insert([{
          website_design_rating: data.website_design_rating,
          communication_clarity: data.communication_clarity,
          appointment_type: data.appointment_type,
          treatment_type: data.treatment_type,
          other_treatment: data.other_treatment || null,
          body_area: data.body_area,
          other_body_area: data.other_body_area || null,
          reception_friendliness: data.reception_friendliness,
          waiting_time: data.waiting_time,
          clinic_environment: data.clinic_environment,
          doctor_listening: data.doctor_listening,
          explanation_clarity: data.explanation_clarity,
          consultation_time: data.consultation_time,
          nps_score: data.nps_score,
          additional_comments: data.additional_comments || null,
          how_did_you_know_us: data.how_did_you_know_us || null,
          referral_details: data.referral_details || null,
        }]);

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "¡Encuesta enviada!",
        description: "Gracias por tu tiempo. Tu opinión es muy importante para nosotros.",
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al enviar la encuesta. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingField = ({ name, label, description }: { name: keyof SurveyFormData, label: string, description?: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel className="text-base font-medium">{label}</FormLabel>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <FormControl>
            <RadioGroup
              onValueChange={(value) => field.onChange(parseInt(value))}
              value={field.value?.toString()}
              className="flex flex-wrap gap-4"
            >
              {[
                { value: 1, label: 'Muy mal' },
                { value: 2, label: 'Normal' },
                { value: 3, label: 'Muy bien' }
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value.toString()} id={`${name}-${option.value}`} />
                  <label htmlFor={`${name}-${option.value}`} className="text-sm font-medium cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-2xl">¡Gracias por tu tiempo!</CardTitle>
            <CardDescription>
              Tu opinión es muy valiosa para nosotros y nos ayuda a mejorar continuamente nuestros servicios.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <ClipboardCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Encuesta de Satisfacción</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tu opinión es muy importante para nosotros. Por favor, tómate unos minutos para evaluar tu experiencia en nuestra consulta.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Sección 1: Experiencia General y Reserva */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 1: Experiencia General y Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="website_design_rating"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Te resultó fácil usar nuestra página web?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-col gap-3"
                        >
                          {[
                            { value: 1, label: 'Tuve dificultades, no fue fácil de usar' },
                            { value: 2, label: 'Pude usarla, pero con alguna complicación' },
                            { value: 3, label: 'Fue muy fácil e intuitiva de navegar' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`website-${option.value}`} />
                              <label htmlFor={`website-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="communication_clarity"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Fue clara y útil la comunicación previa a tu cita (correos, recordatorios, instrucciones)?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-col gap-3"
                        >
                          {[
                            { value: 1, label: 'No fue clara ni me ayudó mucho' },
                            { value: 2, label: 'Fue adecuada, cumplió su propósito' },
                            { value: 3, label: 'Muy clara y útil, me sentí bien informado/a' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`communication-${option.value}`} />
                              <label htmlFor={`communication-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sección 2: Tipo de Cita y Tratamiento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 2: Tipo de Cita y Tratamiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="appointment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">¿Qué tipo de cita tuviste?</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="presencial" id="presencial" />
                            <label htmlFor="presencial" className="text-sm font-medium cursor-pointer">Presencial</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="telematica" id="telematica" />
                            <label htmlFor="telematica" className="text-sm font-medium cursor-pointer">Telemática</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="treatment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">¿Qué tratamiento te realizaste en esta cita?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tratamiento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                          <SelectItem value="osteopatia">Osteopatía</SelectItem>
                          <SelectItem value="readaptacion">Readaptación</SelectItem>
                          <SelectItem value="puncion_seca">Punción Seca</SelectItem>
                          <SelectItem value="electrolisis">Electrólisis</SelectItem>
                          <SelectItem value="terapia_manual">Terapia Manual</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('treatment_type') === 'otro' && (
                  <FormField
                    control={form.control}
                    name="other_treatment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Especifica el tratamiento:</FormLabel>
                        <FormControl>
                          <Input placeholder="Escribe el tratamiento..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="body_area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">¿Qué patología o zona del cuerpo principal fuiste a tratar?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la zona del cuerpo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rodilla">Rodilla</SelectItem>
                          <SelectItem value="hombro">Hombro</SelectItem>
                          <SelectItem value="pie">Pie</SelectItem>
                          <SelectItem value="mano">Mano</SelectItem>
                          <SelectItem value="codo">Codo</SelectItem>
                          <SelectItem value="columna_cervical">Columna Cervical</SelectItem>
                          <SelectItem value="columna_dorsal">Columna Dorsal</SelectItem>
                          <SelectItem value="columna_lumbar">Columna Lumbar</SelectItem>
                          <SelectItem value="otra">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('body_area') === 'otra' && (
                  <FormField
                    control={form.control}
                    name="other_body_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Especifica la zona del cuerpo:</FormLabel>
                        <FormControl>
                          <Input placeholder="Escribe la zona del cuerpo..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Sección 3: Experiencia en la Consulta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 3: Experiencia en la Consulta (Recepción y Ambiente)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="reception_friendliness"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Cómo calificarías la amabilidad y profesionalidad del personal de recepción?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-wrap gap-4"
                        >
                          {[
                            { value: 1, label: 'Malo' },
                            { value: 2, label: 'Regular' },
                            { value: 3, label: 'Bueno' },
                            { value: 4, label: 'Muy bueno' },
                            { value: 5, label: 'Excelente' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`reception-${option.value}`} />
                              <label htmlFor={`reception-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="waiting_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">¿Cuál fue tu tiempo de espera en la consulta el día de tu cita?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tiempo de espera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="less_than_5">Menos de 5 minutos</SelectItem>
                          <SelectItem value="5_to_15">Entre 5 y 15 minutos</SelectItem>
                          <SelectItem value="15_to_30">Entre 15 y 30 minutos</SelectItem>
                          <SelectItem value="more_than_30">Más de 30 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinic_environment"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Consideras que el ambiente de la consulta (limpieza, comodidad) fue agradable?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-wrap gap-4"
                        >
                          {[
                            { value: 1, label: 'Desagradable' },
                            { value: 2, label: 'No muy agradable' },
                            { value: 3, label: 'Normal' },
                            { value: 4, label: 'Agradable' },
                            { value: 5, label: 'Sí, muy agradable' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`environment-${option.value}`} />
                              <label htmlFor={`environment-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sección 4: Experiencia con el Doctor/Profesional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 4: Experiencia con el Doctor/Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="doctor_listening"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿La comunicación con el doctor/profesional fue fluida y te sentiste escuchado/a?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-wrap gap-4"
                        >
                          {[
                            { value: 1, label: 'No, nada fluida ni escuchado/a' },
                            { value: 2, label: 'No muy fluida' },
                            { value: 3, label: 'Normal' },
                            { value: 4, label: 'Sí, fluida' },
                            { value: 5, label: 'Sí, muy fluida y escuchado/a' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`listening-${option.value}`} />
                              <label htmlFor={`listening-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="explanation_clarity"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Recibiste explicaciones claras y comprensibles sobre tu estado de salud/tratamiento?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-wrap gap-4"
                        >
                          {[
                            { value: 1, label: 'No, nada claras' },
                            { value: 2, label: 'No muy claras' },
                            { value: 3, label: 'Normal' },
                            { value: 4, label: 'Sí, claras' },
                            { value: 5, label: 'Sí, muy claras' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`clarity-${option.value}`} />
                              <label htmlFor={`clarity-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="consultation_time"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">¿Sentiste que el doctor/profesional dedicó el tiempo suficiente a tu consulta?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          className="flex flex-wrap gap-4"
                        >
                          {[
                            { value: 1, label: 'No, en absoluto' },
                            { value: 2, label: 'No' },
                            { value: 3, label: 'Normal' },
                            { value: 4, label: 'Sí' },
                            { value: 5, label: 'Sí, totalmente' }
                          ].map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`time-${option.value}`} />
                              <label htmlFor={`time-${option.value}`} className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sección 5: Valoración Global y Comentarios */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 5: Valoración Global y Comentarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="nps_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        En una escala del 0 al 10, ¿qué probabilidad hay de que recomiendes nuestra consulta a un amigo o familiar?
                      </FormLabel>
                      <div className="px-3">
                        <FormControl>
                          <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                          />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0 - Nada probable</span>
                          <span className="font-medium text-lg">{field.value}</span>
                          <span>10 - Muy probable</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additional_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        ¿Hay algo más que te gustaría compartir sobre tu experiencia o alguna sugerencia para mejorar?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Comparte tus comentarios aquí..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sección 6: Cómo nos conociste */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Sección 6: Cómo nos conociste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="how_did_you_know_us"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">¿Cómo nos has conocido?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una opción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                          <SelectItem value="clinica_fisioterapia">Clínica de fisioterapia</SelectItem>
                          <SelectItem value="un_amigo">Un amigo</SelectItem>
                          <SelectItem value="un_conocido">Un conocido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('how_did_you_know_us') === 'clinica_fisioterapia' || 
                  form.watch('how_did_you_know_us') === 'un_amigo' || 
                  form.watch('how_did_you_know_us') === 'un_conocido') && (
                  <FormField
                    control={form.control}
                    name="referral_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          {form.watch('how_did_you_know_us') === 'clinica_fisioterapia' && 'Especifica el nombre de la clínica:'}
                          {form.watch('how_did_you_know_us') === 'un_amigo' && 'Especifica el nombre del amigo:'}
                          {form.watch('how_did_you_know_us') === 'un_conocido' && 'Especifica el nombre del conocido:'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={
                              form.watch('how_did_you_know_us') === 'clinica_fisioterapia' ? 'Nombre de la clínica...' :
                              form.watch('how_did_you_know_us') === 'un_amigo' ? 'Nombre del amigo...' :
                              'Nombre del conocido...'
                            } 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
                className="w-full max-w-md"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Encuesta'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
