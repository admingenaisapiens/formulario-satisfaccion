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
  booking_ease: z.number().min(1).max(5),
  wait_time_satisfaction: z.number().min(1).max(5),
  communication_clarity: z.number().min(1).max(5),
  reception_friendliness: z.number().min(1).max(5),
  waiting_time: z.enum(['less_than_5', '5_to_15', '15_to_30', 'more_than_30']),
  clinic_environment: z.number().min(1).max(5),
  doctor_listening: z.number().min(1).max(5),
  explanation_clarity: z.number().min(1).max(5),
  consultation_time: z.number().min(1).max(5),
  treatment_trust: z.number().min(1).max(5),
  nps_score: z.number().min(0).max(10),
  additional_comments: z.string().optional(),
});

type SurveyFormData = z.infer<typeof surveySchema>;

export const SurveyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      booking_ease: 3,
      wait_time_satisfaction: 3,
      communication_clarity: 3,
      reception_friendliness: 3,
      waiting_time: 'less_than_5',
      clinic_environment: 3,
      doctor_listening: 3,
      explanation_clarity: 3,
      consultation_time: 3,
      treatment_trust: 3,
      nps_score: 5,
      additional_comments: '',
    },
  });

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('survey_responses')
        .insert([{
          booking_ease: data.booking_ease,
          wait_time_satisfaction: data.wait_time_satisfaction,
          communication_clarity: data.communication_clarity,
          reception_friendliness: data.reception_friendliness,
          waiting_time: data.waiting_time,
          clinic_environment: data.clinic_environment,
          doctor_listening: data.doctor_listening,
          explanation_clarity: data.explanation_clarity,
          consultation_time: data.consultation_time,
          treatment_trust: data.treatment_trust,
          nps_score: data.nps_score,
          additional_comments: data.additional_comments || null,
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
              className="flex space-x-4"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`${name}-${rating}`} />
                  <label htmlFor={`${name}-${rating}`} className="text-sm font-medium cursor-pointer">
                    {rating}
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
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Experiencia General y Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RatingField
                  name="booking_ease"
                  label="¿Qué tan fácil fue reservar tu cita?"
                  description="1 = Muy Difícil, 5 = Muy Fácil"
                />
                <RatingField
                  name="wait_time_satisfaction"
                  label="¿Estás satisfecho/a con el tiempo de espera para obtener una cita?"
                  description="1 = Muy Insatisfecho/a, 5 = Totalmente Satisfecho/a"
                />
                <RatingField
                  name="communication_clarity"
                  label="¿Fue clara y útil la comunicación previa a tu cita?"
                  description="1 = No, nada clara, 5 = Sí, muy clara y útil"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Experiencia en la Consulta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RatingField
                  name="reception_friendliness"
                  label="¿Cómo calificarías la amabilidad y profesionalidad del personal de recepción?"
                  description="1 = Malo, 5 = Excelente"
                />
                
                <FormField
                  control={form.control}
                  name="waiting_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        ¿Cuál fue tu tiempo de espera en la consulta el día de tu cita?
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tiempo de espera" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="less_than_5">Menos de 5 minutos</SelectItem>
                          <SelectItem value="5_to_15">5-15 minutos</SelectItem>
                          <SelectItem value="15_to_30">15-30 minutos</SelectItem>
                          <SelectItem value="more_than_30">Más de 30 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <RatingField
                  name="clinic_environment"
                  label="¿Consideras que el ambiente de la consulta fue agradable?"
                  description="1 = Desagradable, 5 = Sí, muy agradable"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Experiencia con el Doctor/Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RatingField
                  name="doctor_listening"
                  label="¿Qué tan bien te escuchó el doctor/profesional durante la consulta?"
                  description="1 = Nada bien, 5 = Muy bien"
                />
                <RatingField
                  name="explanation_clarity"
                  label="¿Recibiste explicaciones claras sobre tu estado de salud/tratamiento?"
                  description="1 = No, nada claras, 5 = Sí, muy claras"
                />
                <RatingField
                  name="consultation_time"
                  label="¿Sentiste que el doctor dedicó tiempo suficiente a tu consulta?"
                  description="1 = No, en absoluto, 5 = Sí, totalmente"
                />
                <RatingField
                  name="treatment_trust"
                  label="¿Confías en las recomendaciones del doctor/profesional?"
                  description="1 = Nada, 5 = Totalmente"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Valoración Global</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="nps_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        ¿Qué probabilidad hay de que recomiendes nuestra consulta? (0-10)
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
                        Comentarios adicionales (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="¿Hay algo más que te gustaría compartir sobre tu experiencia o alguna sugerencia para mejorar?"
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