import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, MessageSquare, Users, TrendingUp, Star } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';

interface SurveyResponse {
  id: string;
  website_design_rating: number;
  communication_clarity: number;
  appointment_type: string;
  treatment_type: string;
  other_treatment: string | null;
  body_area: string;
  other_body_area: string | null;
  reception_friendliness: number;
  waiting_time: string;
  clinic_environment: number;
  doctor_listening: number;
  explanation_clarity: number;
  consultation_time: number;
  nps_score: number;
  additional_comments: string | null;
  created_at: string;
}

export const SurveyCharts = () => {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchSurveys();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('survey_responses_changes_charts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'survey_responses'
        },
        () => {
          // Refetch surveys when new survey is inserted
          fetchSurveys();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterSurveysByDate();
  }, [surveys, dateFilter, customDateFrom, customDateTo]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las encuestas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterSurveysByDate = () => {
    let filtered = surveys;
    const now = new Date();

    switch (dateFilter) {
      case 'last_7_days':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = surveys.filter(survey => new Date(survey.created_at) >= sevenDaysAgo);
        break;
      case 'last_30_days':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = surveys.filter(survey => new Date(survey.created_at) >= thirtyDaysAgo);
        break;
      case 'last_3_months':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = surveys.filter(survey => new Date(survey.created_at) >= threeMonthsAgo);
        break;
      case 'custom':
        if (customDateFrom) {
          filtered = filtered.filter(survey => new Date(survey.created_at) >= customDateFrom);
        }
        if (customDateTo) {
          filtered = filtered.filter(survey => new Date(survey.created_at) <= customDateTo);
        }
        break;
      default:
        // 'all' - no filtering
        break;
    }

    setFilteredSurveys(filtered);
  };

  const calculateAverages = (surveys: SurveyResponse[]) => {
    if (surveys.length === 0) return {};
    
    return {
      website_design_rating: surveys.reduce((sum, s) => sum + (s.website_design_rating || 0), 0) / surveys.length,
      communication_clarity: surveys.reduce((sum, s) => sum + (s.communication_clarity || 0), 0) / surveys.length,
      reception_friendliness: surveys.reduce((sum, s) => sum + (s.reception_friendliness || 0), 0) / surveys.length,
      clinic_environment: surveys.reduce((sum, s) => sum + (s.clinic_environment || 0), 0) / surveys.length,
      doctor_listening: surveys.reduce((sum, s) => sum + (s.doctor_listening || 0), 0) / surveys.length,
      explanation_clarity: surveys.reduce((sum, s) => sum + (s.explanation_clarity || 0), 0) / surveys.length,
      consultation_time: surveys.reduce((sum, s) => sum + (s.consultation_time || 0), 0) / surveys.length,
    };
  };

  const calculateNPS = (surveys: SurveyResponse[]) => {
    if (surveys.length === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0 };
    
    const promoters = surveys.filter(s => s.nps_score >= 9).length;
    const passives = surveys.filter(s => s.nps_score >= 7 && s.nps_score <= 8).length;
    const detractors = surveys.filter(s => s.nps_score <= 6).length;
    
    const nps = Math.round(((promoters - detractors) / surveys.length) * 100);
    
    return { nps, promoters, passives, detractors };
  };

  const averages = calculateAverages(filteredSurveys);
  const npsData = calculateNPS(filteredSurveys);

  const barChartData = [
    {
      category: 'Facilidad Web',
      promedio: Math.round((averages.website_design_rating || 0) * 100) / 100,
      fill: 'var(--color-website)'
    },
    {
      category: 'Comunicación Previa',
      promedio: Math.round((averages.communication_clarity || 0) * 100) / 100,
      fill: 'var(--color-communication)'
    },
    {
      category: 'Recepción',
      promedio: Math.round((averages.reception_friendliness || 0) * 100) / 100,
      fill: 'var(--color-reception)'
    },
    {
      category: 'Ambiente Clínica',
      promedio: Math.round((averages.clinic_environment || 0) * 100) / 100,
      fill: 'var(--color-environment)'
    },
    {
      category: 'Comunicación Doctor',
      promedio: Math.round((averages.doctor_listening || 0) * 100) / 100,
      fill: 'var(--color-doctor)'
    },
    {
      category: 'Explicación',
      promedio: Math.round((averages.explanation_clarity || 0) * 100) / 100,
      fill: 'var(--color-explanation)'
    },
    {
      category: 'Tiempo Consulta',
      promedio: Math.round((averages.consultation_time || 0) * 100) / 100,
      fill: 'var(--color-time)'
    }
  ];

  const pieChartData = [
    { name: 'Promotores', value: npsData.promoters, fill: '#22c55e' },
    { name: 'Pasivos', value: npsData.passives, fill: '#f59e0b' },
    { name: 'Detractores', value: npsData.detractors, fill: '#ef4444' }
  ];

  const npsTimeData = useMemo(() => {
    if (filteredSurveys.length === 0) return [];

    // Group surveys by month
    const surveysByMonth = filteredSurveys.reduce((acc, survey) => {
      const monthKey = format(new Date(survey.created_at), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(survey);
      return acc;
    }, {} as Record<string, SurveyResponse[]>);

    // Calculate NPS for each month
    return Object.entries(surveysByMonth)
      .map(([month, surveys]) => {
        const nps = calculateNPS(surveys);
        return {
          mes: format(new Date(month + '-01'), 'MMM yyyy', { locale: es }),
          nps: nps.nps,
          respuestas: surveys.length
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filteredSurveys]);

  // Calculate overall satisfaction average
  const averageSatisfaction = Object.values(averages).reduce((sum, avg) => sum + (avg || 0), 0) / Object.keys(averages).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro de Fecha</CardTitle>
          <CardDescription>
            Selecciona el período de tiempo para analizar los datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los datos</SelectItem>
                <SelectItem value="last_7_days">Últimos 7 días</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 días</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Desde'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Hasta'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Respuestas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSurveys.length}</div>
            <p className="text-xs text-muted-foreground">
              Encuestas completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntuación NPS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{npsData.nps}</div>
            <p className="text-xs text-muted-foreground">
              Net Promoter Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacción Promedio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageSatisfaction * 100) / 100}/5</div>
            <p className="text-xs text-muted-foreground">
              Promedio de puntuaciones (Web, Comunicación, Recepción, Ambiente, Doctor, Explicación, Tiempo)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Comentarios</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSurveys.filter(s => s.additional_comments && s.additional_comments.trim() !== '').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Respuestas con feedback adicional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Average Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Puntuaciones Promedio por Categoría</CardTitle>
            <CardDescription>
              Evaluación promedio de cada aspecto de la experiencia del paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                promedio: { label: "Promedio", color: "hsl(var(--primary))" },
                website: { label: "Facilidad Web", color: "hsl(var(--chart-1))" },
                communication: { label: "Comunicación Previa", color: "hsl(var(--chart-2))" },
                reception: { label: "Recepción", color: "hsl(var(--chart-3))" },
                environment: { label: "Ambiente", color: "hsl(var(--chart-4))" },
                doctor: { label: "Comunicación Doctor", color: "hsl(var(--chart-5))" },
                explanation: { label: "Explicación", color: "hsl(var(--accent))" },
                time: { label: "Tiempo Consulta", color: "hsl(var(--chart-1))" }
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 5]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="promedio" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - NPS Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución NPS</CardTitle>
            <CardDescription>
              Clasificación de clientes según su probabilidad de recomendación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                promotores: { label: "Promotores", color: "#22c55e" },
                pasivos: { label: "Pasivos", color: "#f59e0b" },
                detractores: { label: "Detractores", color: "#ef4444" }
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart - NPS Trend */}
      {npsTimeData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia NPS a lo Largo del Tiempo</CardTitle>
            <CardDescription>
              Evolución de la puntuación NPS mensual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                nps: { label: "NPS", color: "hsl(var(--primary))" },
                respuestas: { label: "Respuestas", color: "hsl(var(--chart-2))" }
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={npsTimeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="nps" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {filteredSurveys.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay datos disponibles para el período seleccionado.</p>
        </div>
      )}
    </div>
  );
};