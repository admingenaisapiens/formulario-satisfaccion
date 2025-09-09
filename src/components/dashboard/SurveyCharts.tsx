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
import { CalendarIcon, MessageSquare, Users, TrendingUp, Star, BarChart3 } from 'lucide-react';
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
  how_did_you_know_us?: string | null;
  referral_details?: string | null;
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
      website_design_rating: surveys.reduce((sum, survey) => sum + (survey.website_design_rating || 0), 0) / surveys.length,
      communication_clarity: surveys.reduce((sum, survey) => sum + (survey.communication_clarity || 0), 0) / surveys.length,
      reception_friendliness: surveys.reduce((sum, survey) => sum + (survey.reception_friendliness || 0), 0) / surveys.length,
      clinic_environment: surveys.reduce((sum, survey) => sum + (survey.clinic_environment || 0), 0) / surveys.length,
      doctor_listening: surveys.reduce((sum, survey) => sum + (survey.doctor_listening || 0), 0) / surveys.length,
      explanation_clarity: surveys.reduce((sum, survey) => sum + (survey.explanation_clarity || 0), 0) / surveys.length,
      consultation_time: surveys.reduce((sum, survey) => sum + (survey.consultation_time || 0), 0) / surveys.length,
    };
  };

  const calculateNPS = (surveys: SurveyResponse[]) => {
    if (surveys.length === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0 };
    
    const promoters = surveys.filter(survey => survey.nps_score >= 9).length;
    const passives = surveys.filter(survey => survey.nps_score >= 7 && survey.nps_score <= 8).length;
    const detractors = surveys.filter(survey => survey.nps_score <= 6).length;
    
    const nps = Math.round(((promoters - detractors) / surveys.length) * 100);
    
    return { nps, promoters, passives, detractors };
  };

  const averages = calculateAverages(filteredSurveys);
  const npsData = calculateNPS(filteredSurveys);

  const barChartData = [
    {
      category: 'Web',
      fullName: 'Facilidad Web',
      promedio: Math.round(((Math.max(1, Math.min(3, averages.website_design_rating || 1)) - 1) / 2 * 9 + 1) * 100) / 100, // Convertir 1-3 a 1-10 con límites
      fill: 'var(--color-website)',
      escala: '1-3'
    },
    {
      category: 'Comunicación',
      fullName: 'Comunicación Previa',
      promedio: Math.round(((Math.max(1, Math.min(3, averages.communication_clarity || 1)) - 1) / 2 * 9 + 1) * 100) / 100, // Convertir 1-3 a 1-10 con límites
      fill: 'var(--color-communication)',
      escala: '1-3'
    },
    {
      category: 'Recepción',
      fullName: 'Recepción',
      promedio: Math.round(((Math.max(1, Math.min(5, averages.reception_friendliness || 1)) - 1) / 4 * 9 + 1) * 100) / 100, // Convertir 1-5 a 1-10 con límites
      fill: 'var(--color-reception)',
      escala: '1-5'
    },
    {
      category: 'Ambiente',
      fullName: 'Ambiente Clínica',
      promedio: Math.round(((Math.max(1, Math.min(5, averages.clinic_environment || 1)) - 1) / 4 * 9 + 1) * 100) / 100, // Convertir 1-5 a 1-10 con límites
      fill: 'var(--color-environment)',
      escala: '1-5'
    },
    {
      category: 'Doctor',
      fullName: 'Comunicación Doctor',
      promedio: Math.round(((Math.max(1, Math.min(5, averages.doctor_listening || 1)) - 1) / 4 * 9 + 1) * 100) / 100, // Convertir 1-5 a 1-10 con límites
      fill: 'var(--color-doctor)',
      escala: '1-5'
    },
    {
      category: 'Explicación',
      fullName: 'Claridad Explicación',
      promedio: Math.round(((Math.max(1, Math.min(5, averages.explanation_clarity || 1)) - 1) / 4 * 9 + 1) * 100) / 100, // Convertir 1-5 a 1-10 con límites
      fill: 'var(--color-explanation)',
      escala: '1-5'
    },
    {
      category: 'Tiempo',
      fullName: 'Tiempo Consulta',
      promedio: Math.round(((Math.max(1, Math.min(5, averages.consultation_time || 1)) - 1) / 4 * 9 + 1) * 100) / 100, // Convertir 1-5 a 1-10 con límites
      fill: 'var(--color-time)',
      escala: '1-5'
    }
  ];

  // Calculate referral source data
  const referralSourceData = useMemo(() => {
    if (filteredSurveys.length === 0) return [];

    const sourceCount = filteredSurveys.reduce((acc, survey) => {
      const source = survey.how_did_you_know_us;
      if (source) {
        const sourceLabel = getSourceLabel(source);
        acc[sourceLabel] = (acc[sourceLabel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sourceCount).map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / filteredSurveys.length) * 100)
    }));
  }, [filteredSurveys]);

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'redes_sociales': return 'Redes sociales';
      case 'clinica_fisioterapia': return 'Clínica de fisioterapia';
      case 'un_amigo': return 'Un amigo';
      case 'un_conocido': return 'Un conocido';
      default: return source;
    }
  };

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

  // Calculate overall satisfaction average with normalized scores
  const normalizeWebsiteRating = (rating: number) => ((Math.max(1, Math.min(3, rating)) - 1) / 2 * 9 + 1);
  const normalizeCommunicationRating = (rating: number) => ((Math.max(1, Math.min(3, rating)) - 1) / 2 * 9 + 1);
  const normalizeOtherRatings = (rating: number) => ((Math.max(1, Math.min(5, rating)) - 1) / 4 * 9 + 1);

  const averageSatisfaction = (
    normalizeWebsiteRating(averages.website_design_rating || 1) +
    normalizeCommunicationRating(averages.communication_clarity || 1) +
    normalizeOtherRatings(averages.reception_friendliness || 1) +
    normalizeOtherRatings(averages.clinic_environment || 1) +
    normalizeOtherRatings(averages.doctor_listening || 1) +
    normalizeOtherRatings(averages.explanation_clarity || 1) +
    normalizeOtherRatings(averages.consultation_time || 1)
  ) / 7;

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
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Análisis de Resultados</h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg hidden sm:block">
                Visualización gráfica de las respuestas de satisfacción de pacientes
              </p>
              <p className="text-blue-100 text-xs sm:hidden">
                Gráficos de satisfacción
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
        </div>
      </div>
      {/* Date Filter - Enhanced */}
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-1">
          <CardHeader className="bg-white m-1 rounded-lg">
            <CardTitle className="flex items-center gap-3 text-gray-800">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold">Filtro de Fecha</span>
                <p className="text-xs sm:text-sm font-normal text-gray-600 mt-1">Selecciona el período de tiempo</p>
              </div>
            </CardTitle>
          </CardHeader>
        </div>
        <CardContent className="p-8 bg-gradient-to-b from-white to-emerald-50/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[200px] border-2 border-emerald-100 hover:border-emerald-300 transition-colors">
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
                    <Button variant="outline" className="w-[150px] justify-start text-left font-normal border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50">
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
                    <Button variant="outline" className="w-[150px] justify-start text-left font-normal border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50">
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

      {/* Enhanced Summary Cards - Improved Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500/90 to-indigo-600/90 text-white hover:scale-105 transition-all duration-300 h-32">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-100">Total Respuestas</CardTitle>
              <div className="text-2xl sm:text-3xl font-bold mb-1 mt-2">{filteredSurveys.length}</div>
              <p className="text-blue-100 text-xs">Encuestas completadas</p>
            </div>
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
              <Users className="h-7 w-7" />
            </div>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500/90 to-teal-600/90 text-white hover:scale-105 transition-all duration-300 h-32">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs sm:text-sm font-medium text-emerald-100">Puntuación NPS</CardTitle>
              <div className="text-2xl sm:text-3xl font-bold mb-1 mt-2">{npsData.nps}</div>
              <p className="text-emerald-100 text-xs">Net Promoter Score</p>
            </div>
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
              <TrendingUp className="h-7 w-7" />
            </div>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500/90 to-purple-600/90 text-white hover:scale-105 transition-all duration-300 h-32">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs sm:text-sm font-medium text-violet-100">Satisfacción Promedio</CardTitle>
              <div className="text-2xl sm:text-3xl font-bold mb-1 mt-2">{Math.round(averageSatisfaction * 100) / 100}/10</div>
              <p className="text-violet-100 text-xs">Promedio general</p>
            </div>
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
              <Star className="h-7 w-7" />
            </div>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500/90 to-red-600/90 text-white hover:scale-105 transition-all duration-300 h-32">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-100">Con Comentarios</CardTitle>
              <div className="text-2xl sm:text-3xl font-bold mb-1 mt-2">
                {filteredSurveys.filter(s => s.additional_comments && s.additional_comments.trim() !== '').length}
              </div>
              <p className="text-orange-100 text-xs">Con feedback</p>
            </div>
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
              <MessageSquare className="h-7 w-7" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Enhanced Modern Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
        {/* Bar Chart - Optimized */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-purple-500/80 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-3 bg-gradient-to-br from-blue-500/90 to-indigo-600/90 rounded-xl shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">Puntuaciones Promedio</span>
                  <p className="text-sm font-normal text-gray-600 mt-1">Puntuaciones normalizadas a escala 1-10 para comparación</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white to-blue-50/30">
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
              className="h-96 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={barChartData} 
                  margin={{ top: 30, right: 30, left: 30, bottom: 70 }}
                  barCategoryGap="12%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: window.innerWidth < 640 ? 10 : 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    angle={window.innerWidth < 640 ? -90 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 640 ? 100 : 80}
                    interval={0}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    tick={{ fontSize: window.innerWidth < 640 ? 10 : 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    label={window.innerWidth >= 640 ? { value: "Puntuación", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontWeight: 600 } } : undefined}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name, props) => [
                      `${Number(value).toFixed(1)}/10`,
                      props.payload?.fullName || name
                    ]}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                  />
                  <Bar 
                    dataKey="promedio" 
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 15}, 70%, ${60 - index * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            {/* Enhanced Summary */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-2xl border border-blue-100/50">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Promedio General:</span>
                <span className="text-base sm:text-lg font-bold text-blue-600">
                  {averageSatisfaction.toFixed(1)}/10
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Enhanced NPS Distribution */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/80 via-teal-500/80 to-cyan-500/80 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-3 bg-gradient-to-br from-emerald-500/90 to-teal-600/90 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold">Distribución NPS</span>
                  <p className="text-xs sm:text-sm font-normal text-gray-600 mt-1">Clasificación según probabilidad de recomendación</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="relative flex items-center justify-center">
              <ChartContainer
                config={{
                  promotores: { label: "Promotores", color: "#10b981" },
                  pasivos: { label: "Pasivos", color: "#f59e0b" },
                  detractores: { label: "Detractores", color: "#ef4444" }
                }}
                className="h-96 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => {
                        if (value > 0) {
                          const percentage = (percent * 100).toFixed(0);
                          return window.innerWidth < 640 ? `${percentage}%` : `${name}\n${value} (${percentage}%)`;
                        }
                        return "";
                      }}
                      outerRadius={130}
                      innerRadius={45}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              
              {/* Central NPS Score */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-800">{npsData.nps}</div>
                  <div className="text-sm text-gray-600 font-medium">NPS Score</div>
                </div>
              </div>
            </div>
            
            {/* Enhanced NPS Summary */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: "Promotores", value: npsData.promoters, color: "#10b981", desc: "9-10 puntos" },
                { label: "Pasivos", value: npsData.passives, color: "#f59e0b", desc: "7-8 puntos" },
                { label: "Detractores", value: npsData.detractors, color: "#ef4444", desc: "0-6 puntos" }
              ].map((item, index) => (
                <div key={item.label} className="text-center p-4 bg-white/70 rounded-xl shadow-md border border-gray-100/50">
                  <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }}></div>
                  <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New How Did You Know Us Analysis */}
      {referralSourceData.length > 0 && (
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500/80 via-pink-500/80 to-rose-500/80 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-3 bg-gradient-to-br from-orange-500/90 to-pink-600/90 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold">¿Cómo nos conocieron?</span>
                  <p className="text-xs sm:text-sm font-normal text-gray-600 mt-1">Fuentes de referencia de nuestros pacientes</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white to-orange-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <ChartContainer
                  config={{
                    count: { label: "Cantidad", color: "hsl(var(--primary))" }
                  }}
                  className="h-80 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={referralSourceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="source" 
                        tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        stroke="hsl(var(--primary))"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                {referralSourceData.map((item, index) => (
                  <div key={item.source} className="flex items-center justify-between p-4 bg-white/70 rounded-xl shadow-md border border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-primary"></div>
                      <span className="font-medium text-gray-800">{item.source}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{item.count}</div>
                      <div className="text-sm text-gray-500">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Time Series Chart */}
      {npsTimeData.length > 1 && (
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500/80 via-purple-500/80 to-indigo-500/80 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-3 bg-gradient-to-br from-violet-500/90 to-purple-600/90 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">Tendencia NPS Mensual</span>
                  <p className="text-sm font-normal text-gray-600 mt-1">Evolución de la puntuación NPS a lo largo del tiempo</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white to-violet-50/30">
            <ChartContainer
              config={{
                nps: { label: "NPS", color: "hsl(var(--primary))" },
                respuestas: { label: "Respuestas", color: "hsl(var(--chart-2))" }
              }}
              className="h-80 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={npsTimeData} margin={{ top: 30, right: 30, left: 30, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="mes" 
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    label={{ value: "Puntuación NPS", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontWeight: 600 } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="nps" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, strokeWidth: 2 }}
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