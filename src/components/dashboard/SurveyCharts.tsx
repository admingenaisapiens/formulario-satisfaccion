import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, Users, Star, MessageCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface SurveyResponse {
  id: string;
  booking_ease: number;
  wait_time_satisfaction: number;
  communication_clarity: number;
  reception_friendliness: number;
  waiting_time: string;
  clinic_environment: number;
  doctor_listening: number;
  explanation_clarity: number;
  consultation_time: number;
  treatment_trust: number;
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
      case 'last7days':
        filtered = surveys.filter(s => new Date(s.created_at) >= subDays(now, 7));
        break;
      case 'last30days':
        filtered = surveys.filter(s => new Date(s.created_at) >= subDays(now, 30));
        break;
      case 'last3months':
        filtered = surveys.filter(s => new Date(s.created_at) >= subMonths(now, 3));
        break;
      case 'custom':
        if (customDateFrom) {
          filtered = filtered.filter(s => new Date(s.created_at) >= customDateFrom);
        }
        if (customDateTo) {
          filtered = filtered.filter(s => new Date(s.created_at) <= customDateTo);
        }
        break;
    }

    setFilteredSurveys(filtered);
  };

  // Calculate metrics
  const calculateAverages = () => {
    if (filteredSurveys.length === 0) return {};

    const fields = [
      'booking_ease', 'wait_time_satisfaction', 'communication_clarity',
      'reception_friendliness', 'clinic_environment', 'doctor_listening',
      'explanation_clarity', 'consultation_time', 'treatment_trust'
    ];

    const averages: { [key: string]: number } = {};
    fields.forEach(field => {
      const sum = filteredSurveys.reduce((acc, survey) => acc + (survey as any)[field], 0);
      averages[field] = Math.round((sum / filteredSurveys.length) * 10) / 10;
    });

    return averages;
  };

  const calculateNPS = () => {
    if (filteredSurveys.length === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0 };

    const promoters = filteredSurveys.filter(s => s.nps_score >= 9).length;
    const passives = filteredSurveys.filter(s => s.nps_score >= 7 && s.nps_score <= 8).length;
    const detractors = filteredSurveys.filter(s => s.nps_score <= 6).length;
    const total = filteredSurveys.length;

    const nps = Math.round(((promoters - detractors) / total) * 100);

    return { nps, promoters, passives, detractors };
  };

  const averages = calculateAverages();
  const npsData = calculateNPS();

  // Prepare chart data
  const barChartData = [
    { name: 'Facilidad\nReserva', value: averages.booking_ease || 0 },
    { name: 'Satisfacción\nEspera', value: averages.wait_time_satisfaction || 0 },
    { name: 'Claridad\nComunicación', value: averages.communication_clarity || 0 },
    { name: 'Amabilidad\nRecepción', value: averages.reception_friendliness || 0 },
    { name: 'Ambiente\nClínica', value: averages.clinic_environment || 0 },
    { name: 'Escucha\nDoctor', value: averages.doctor_listening || 0 },
    { name: 'Claridad\nExplicación', value: averages.explanation_clarity || 0 },
    { name: 'Tiempo\nConsulta', value: averages.consultation_time || 0 },
    { name: 'Confianza\nTratamiento', value: averages.treatment_trust || 0 },
  ];

  const pieChartData = [
    { name: 'Promotores', value: npsData.promoters, fill: '#22c55e' },
    { name: 'Pasivos', value: npsData.passives, fill: '#f59e0b' },
    { name: 'Detractores', value: npsData.detractors, fill: '#ef4444' },
  ];

  // NPS trend over time
  const npsTimeData = React.useMemo(() => {
    const groupedByMonth: { [key: string]: SurveyResponse[] } = {};
    
    filteredSurveys.forEach(survey => {
      const month = format(new Date(survey.created_at), 'yyyy-MM');
      if (!groupedByMonth[month]) {
        groupedByMonth[month] = [];
      }
      groupedByMonth[month].push(survey);
    });

    return Object.entries(groupedByMonth).map(([month, surveys]) => {
      const promoters = surveys.filter(s => s.nps_score >= 9).length;
      const detractors = surveys.filter(s => s.nps_score <= 6).length;
      const nps = Math.round(((promoters - detractors) / surveys.length) * 100);
      
      return {
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: es }),
        nps,
        responses: surveys.length
      };
    });
  }, [filteredSurveys]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por fecha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los datos</SelectItem>
            <SelectItem value="last7days">Últimos 7 días</SelectItem>
            <SelectItem value="last30days">Últimos 30 días</SelectItem>
            <SelectItem value="last3months">Últimos 3 meses</SelectItem>
            <SelectItem value="custom">Rango personalizado</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'custom' && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Desde'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customDateFrom}
                  onSelect={setCustomDateFrom}
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Hasta'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customDateTo}
                  onSelect={setCustomDateTo}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Respuestas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSurveys.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{npsData.nps}</div>
            <p className="text-xs text-muted-foreground">
              {npsData.nps >= 0 ? '+' : ''}{npsData.nps} puntos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacción Promedio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(averages).length > 0 
                ? (Object.values(averages).reduce((a, b) => a + b, 0) / Object.values(averages).length).toFixed(1)
                : '0.0'
              }/5
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Comentarios</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSurveys.filter(s => s.additional_comments?.trim()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSurveys.length > 0 
                ? Math.round((filteredSurveys.filter(s => s.additional_comments?.trim()).length / filteredSurveys.length) * 100)
                : 0
              }% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Ratings Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Puntuaciones Promedio por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  height={60}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* NPS Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* NPS Trend Over Time */}
      {npsTimeData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución del NPS en el Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={npsTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'nps' ? `${value} puntos` : value,
                    name === 'nps' ? 'NPS Score' : 'Respuestas'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="nps" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};