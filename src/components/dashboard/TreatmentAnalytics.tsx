import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Users, Stethoscope, MapPin, CalendarIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface SurveyResponse {
  id: string;
  appointment_type: string;
  treatment_type: string;
  body_area: string;
  other_body_area: string | null;
  created_at: string;
}

interface BodyZoneData {
  zone: string;
  count: number;
  label: string;
  percentage: number;
}

export const TreatmentAnalytics = () => {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const { toast } = useToast();

  const filterSurveysByDate = useCallback(() => {
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
          const fromDate = new Date(customDateFrom);
          fromDate.setHours(0, 0, 0, 0); // Start of day
          filtered = filtered.filter(survey => new Date(survey.created_at) >= fromDate);
        }
        if (customDateTo) {
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          filtered = filtered.filter(survey => new Date(survey.created_at) <= toDate);
        }
        break;
      default:
        // 'all' - no filtering
        break;
    }

    setFilteredSurveys(filtered);
  }, [surveys, dateFilter, customDateFrom, customDateTo]);

  // Helper functions - defined before useMemo hooks
  const getTreatmentLabel = (treatmentType: string) => {
    switch (treatmentType) {
      case 'fisioterapia': return 'Fisioterapia';
      case 'osteopatia': return 'Osteopatía';
      case 'readaptacion': return 'Readaptación';
      case 'puncion_seca': return 'Punción Seca';
      case 'electrolisis': return 'Electrólisis';
      case 'terapia_manual': return 'Terapia Manual';
      case 'otro': return 'Otro';
      default: return treatmentType;
    }
  };

  const getBodyAreaLabel = (bodyArea: string) => {
    switch (bodyArea) {
      case 'rodilla': return 'Rodilla';
      case 'hombro': return 'Hombro';
      case 'pie': return 'Pie';
      case 'mano': return 'Mano';
      case 'codo': return 'Codo';
      case 'columna_cervical': return 'Columna Cervical';
      case 'columna_dorsal': return 'Columna Dorsal';
      case 'columna_lumbar': return 'Columna Lumbar';
      case 'otra': return 'Otra zona';
      default: return bodyArea;
    }
  };

  useEffect(() => {
    fetchSurveys();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('survey_responses_changes_treatment')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'survey_responses'
        },
        () => {
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
  }, [filterSurveysByDate]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, appointment_type, treatment_type, body_area, other_body_area, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de tratamiento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Process appointment types
  const appointmentTypeData = useMemo(() => {
    const counts = filteredSurveys.reduce((acc, survey) => {
      const type = survey.appointment_type === 'presencial' ? 'Presencial' : 'Telemática';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Presencial' ? '#10b981' : '#3b82f6' // Verde para presencial, azul para telemática
    }));
  }, [filteredSurveys]);

  // Process treatment types for pie chart
  const treatmentTypeData = useMemo(() => {
    // Define all possible treatment types to ensure they all appear
    const allTreatmentTypes = [
      'fisioterapia',
      'osteopatia', 
      'readaptacion',
      'puncion_seca',
      'electrolisis',
      'terapia_manual',
      'otro'
    ];

    // Initialize counts with 0 for all treatment types
    const counts = allTreatmentTypes.reduce((acc, type) => {
      acc[getTreatmentLabel(type)] = 0;
      return acc;
    }, {} as Record<string, number>);

    // Count actual occurrences
    filteredSurveys.forEach(survey => {
      const treatment = getTreatmentLabel(survey.treatment_type);
      counts[treatment] = (counts[treatment] || 0) + 1;
    });

    // Define colors for each treatment type
    const colors = [
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#f59e0b', // amber
      '#ef4444', // red
      '#10b981', // emerald
      '#f97316', // orange
      '#6b7280'  // gray
    ];

    return Object.entries(counts)
      .map(([treatment, count], index) => ({ 
        treatment, 
        count,
        name: treatment,
        value: count,
        fill: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSurveys]);

  // Process body zones
  const bodyZoneData = useMemo(() => {
    const counts = filteredSurveys.reduce((acc, survey) => {
      const zone = survey.body_area === 'otra' && survey.other_body_area 
        ? survey.other_body_area 
        : survey.body_area;
      const label = getBodyAreaLabel(zone);
      acc[zone] = { count: (acc[zone]?.count || 0) + 1, label };
      return acc;
    }, {} as Record<string, { count: number; label: string }>);

    const total = Object.values(counts).reduce((sum, { count }) => sum + count, 0);

    return Object.entries(counts).map(([zone, { count, label }]) => ({
      zone,
      count,
      label,
      percentage: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [filteredSurveys]);

  const HumanBodyDiagram = ({ bodyZoneData }: { bodyZoneData: BodyZoneData[] }) => {
    const getZoneCount = (zone: string) => {
      return bodyZoneData.find(item => item.zone === zone)?.count || 0;
    };

    const getZoneColor = (count: number, alpha: number = 1) => {
      if (count === 0) return `rgba(148, 163, 184, ${alpha * 0.3})`; // gray-400
      if (count <= 2) return `rgba(253, 224, 71, ${alpha * 0.7})`; // yellow-300
      if (count <= 5) return `rgba(251, 146, 60, ${alpha * 0.8})`; // orange-400
      if (count <= 10) return `rgba(248, 113, 113, ${alpha * 0.9})`; // red-400
      return `rgba(239, 68, 68, ${alpha})`; // red-500
    };

    return (
      <div className="flex flex-col items-center space-y-6 p-4">
        <div className="relative inline-block">
          <img 
            src="/lovable-uploads/548b9017-01e8-4778-9318-9440f04bca5b.png"
            alt="Human Body Diagram"
            className="w-80 h-auto border-2 border-gray-200 rounded-2xl shadow-lg bg-white"
          />
          
          {/* Interactive overlay zones */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Head/Cervical area */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '8%',
                left: '42%',
                width: '16%',
                height: '12%',
                backgroundColor: getZoneColor(getZoneCount('columna_cervical')),
              }}
              title={`Columna Cervical: ${getZoneCount('columna_cervical')} visitas`}
            >
              {getZoneCount('columna_cervical') > 0 && getZoneCount('columna_cervical')}
            </div>

            {/* Shoulders */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '22%',
                left: '20%',
                width: '12%',
                height: '8%',
                backgroundColor: getZoneColor(getZoneCount('hombro')),
              }}
              title={`Hombro: ${getZoneCount('hombro')} visitas`}
            >
              {getZoneCount('hombro') > 0 && getZoneCount('hombro')}
            </div>
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '22%',
                right: '20%',
                width: '12%',
                height: '8%',
                backgroundColor: getZoneColor(getZoneCount('hombro')),
              }}
              title={`Hombro: ${getZoneCount('hombro')} visitas`}
            >
              {getZoneCount('hombro') > 0 && getZoneCount('hombro')}
            </div>

            {/* Dorsal Spine */}
            <div 
              className="absolute hover:scale-105 transition-all duration-300 cursor-pointer pointer-events-auto rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '28%',
                left: '45%',
                width: '10%',
                height: '20%',
                backgroundColor: getZoneColor(getZoneCount('columna_dorsal')),
              }}
              title={`Columna Dorsal: ${getZoneCount('columna_dorsal')} visitas`}
            >
              {getZoneCount('columna_dorsal') > 0 && getZoneCount('columna_dorsal')}
            </div>

            {/* Elbows */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '40%',
                left: '12%',
                width: '8%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('codo')),
              }}
              title={`Codo: ${getZoneCount('codo')} visitas`}
            >
              {getZoneCount('codo') > 0 && getZoneCount('codo')}
            </div>
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '40%',
                right: '12%',
                width: '8%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('codo')),
              }}
              title={`Codo: ${getZoneCount('codo')} visitas`}
            >
              {getZoneCount('codo') > 0 && getZoneCount('codo')}
            </div>

            {/* Lumbar Spine */}
            <div 
              className="absolute hover:scale-105 transition-all duration-300 cursor-pointer pointer-events-auto rounded-lg flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '48%',
                left: '45%',
                width: '10%',
                height: '15%',
                backgroundColor: getZoneColor(getZoneCount('columna_lumbar')),
              }}
              title={`Columna Lumbar: ${getZoneCount('columna_lumbar')} visitas`}
            >
              {getZoneCount('columna_lumbar') > 0 && getZoneCount('columna_lumbar')}
            </div>

            {/* Hands */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '58%',
                left: '8%',
                width: '10%',
                height: '8%',
                backgroundColor: getZoneColor(getZoneCount('mano')),
              }}
              title={`Mano: ${getZoneCount('mano')} visitas`}
            >
              {getZoneCount('mano') > 0 && getZoneCount('mano')}
            </div>
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '58%',
                right: '8%',
                width: '10%',
                height: '8%',
                backgroundColor: getZoneColor(getZoneCount('mano')),
              }}
              title={`Mano: ${getZoneCount('mano')} visitas`}
            >
              {getZoneCount('mano') > 0 && getZoneCount('mano')}
            </div>

            {/* Knees */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '70%',
                left: '38%',
                width: '8%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('rodilla')),
              }}
              title={`Rodilla: ${getZoneCount('rodilla')} visitas`}
            >
              {getZoneCount('rodilla') > 0 && getZoneCount('rodilla')}
            </div>
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                top: '70%',
                right: '38%',
                width: '8%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('rodilla')),
              }}
              title={`Rodilla: ${getZoneCount('rodilla')} visitas`}
            >
              {getZoneCount('rodilla') > 0 && getZoneCount('rodilla')}
            </div>

            {/* Feet */}
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                bottom: '8%',
                left: '37%',
                width: '10%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('pie')),
              }}
              title={`Pie: ${getZoneCount('pie')} visitas`}
            >
              {getZoneCount('pie') > 0 && getZoneCount('pie')}
            </div>
            <div 
              className="absolute hover:scale-110 transition-all duration-300 cursor-pointer pointer-events-auto rounded-full flex items-center justify-center font-bold text-white shadow-lg"
              style={{
                bottom: '8%',
                right: '37%',
                width: '10%',
                height: '6%',
                backgroundColor: getZoneColor(getZoneCount('pie')),
              }}
              title={`Pie: ${getZoneCount('pie')} visitas`}
            >
              {getZoneCount('pie') > 0 && getZoneCount('pie')}
            </div>
          </div>
        </div>
        
        {/* Enhanced Legend with better styling */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border-2 border-gray-100 shadow-sm">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 text-center">Intensidad de Tratamientos</h4>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded border"></div>
              <span className="font-medium text-xs">0 casos</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-yellow-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-200 rounded border"></div>
              <span className="font-medium text-xs">1-2</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-orange-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-300 rounded border"></div>
              <span className="font-medium text-xs">3-5</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-300 rounded border"></div>
              <span className="font-medium text-xs">6-10</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-red-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded border"></div>
              <span className="font-medium text-xs">10+</span>
            </div>
          </div>
        </div>
        
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando análisis de tratamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Activity className="w-8 h-8" />
              </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Análisis de Tratamientos</h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg hidden sm:block">
                Dashboard completo de métricas y estadísticas médicas
              </p>
              <p className="text-blue-100 text-xs sm:hidden">
                Métricas médicas
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

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-emerald-100">Total Tratamientos</CardTitle>
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl sm:text-3xl font-bold mb-1">{filteredSurveys.length}</div>
              <p className="text-emerald-100 text-xs">
                Consultas registradas
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-violet-100">Cita Más Frecuente</CardTitle>
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                {appointmentTypeData.length > 0 ? 
                  appointmentTypeData.reduce((prev, current) => (prev.value > current.value) ? prev : current).name 
                  : 'N/A'
                }
              </div>
              <p className="text-violet-100 text-xs">
                Tipo predominante
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 text-white hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-orange-100">Zona Más Tratada</CardTitle>
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                {bodyZoneData.length > 0 ? bodyZoneData[0].label : 'N/A'}
              </div>
              <p className="text-orange-100 text-xs">
                {bodyZoneData.length > 0 ? `${bodyZoneData[0].count} casos` : 'Sin datos'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Layout Analytics Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Appointment Types - Responsive Height */}
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 overflow-hidden h-auto lg:h-[640px] xl:h-[740px] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-1">
              <CardHeader className="bg-white m-1 rounded-lg">
                <CardTitle className="flex items-center gap-3 text-gray-800">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-lg sm:text-xl font-bold">Tipos de Cita</span>
                    <p className="text-xs sm:text-sm font-normal text-gray-600 mt-1">Modalidad de consulta</p>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
            <CardContent className="p-8 bg-gradient-to-b from-white to-emerald-50/50 flex-1 flex flex-col">
              <div className="relative flex items-center justify-center flex-shrink-0 p-4">
                <ChartContainer
                  config={{
                    presencial: { label: "Presencial", color: "#10b981" },
                    telematica: { label: "Telemática", color: "#3b82f6" }
                  }}
                  className="h-64 sm:h-80 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={appointmentTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => {
                          const percentage = (percent * 100).toFixed(0);
                          // Only show labels for larger segments and adjust text size for mobile
                          if (percent > 0.1) {
                            return window.innerWidth < 640 ? `${percentage}%` : `${name}\n${percentage}%`;
                          }
                          return '';
                        }}
                        outerRadius={window.innerWidth < 640 ? 90 : 120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={3}
                      >
                        {appointmentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const total = appointmentTypeData.reduce((sum, item) => sum + item.value, 0);
                            return (
                              <div className="bg-white p-4 rounded-xl shadow-lg border-0 ring-1 ring-gray-200">
                                <p className="font-semibold text-gray-800">{data.name}</p>
                                 <p className="text-sm text-gray-600">
                                   {data.value} citas ({total > 0 ? (((data.payload?.value || 0) / total) * 100).toFixed(1) : 0}%)
                                 </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* Estadísticas centrales */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-gray-800">
                      {appointmentTypeData.reduce((sum, item) => sum + item.value, 0)}
                    </div>
                    <div className="text-xs font-medium text-gray-600">Total Citas</div>
                  </div>
                </div>
              </div>
              
              {/* Resumen visual mejorado */}
              <div className="mt-6 space-y-3 flex-1">
                {appointmentTypeData.map((item, index) => {
                  const total = appointmentTypeData.reduce((sum, data) => sum + data.value, 0);
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                     <div key={item.name} className="flex items-center justify-between bg-white/70 p-3 sm:p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
                       <div className="flex items-center gap-3 sm:gap-4">
                         <div 
                           className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-lg border-2 border-white"
                           style={{ backgroundColor: item.fill }}
                         />
                         <div>
                           <span className="font-bold text-gray-800 text-base sm:text-lg">{item.name}</span>
                           <div className="text-xs sm:text-sm text-gray-600">{item.value} consultas</div>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-xl sm:text-2xl font-bold" style={{ color: item.fill }}>
                           {percentage}%
                         </div>
                       </div>
                     </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Types - Responsive Height */}
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 overflow-hidden h-auto lg:h-[640px] xl:h-[740px] flex flex-col">
            <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-1">
              <CardHeader className="bg-white m-1 rounded-lg">
                <CardTitle className="flex items-center gap-3 text-gray-800">
                  <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-lg sm:text-xl font-bold">Tipos de Tratamiento</span>
                    <p className="text-xs sm:text-sm font-normal text-gray-600 mt-1">Terapias más utilizadas</p>
                  </div>
                </CardTitle>
              </CardHeader>
            </div>
            <CardContent className="p-8 bg-gradient-to-b from-white to-violet-50/50 flex-1 flex flex-col">
              <div className="relative flex items-center justify-center mb-6 flex-shrink-0">
                <ChartContainer
                  config={{
                    fisioterapia: { label: "Fisioterapia", color: "#8b5cf6" },
                    osteopatia: { label: "Osteopatía", color: "#06b6d4" },
                    readaptacion: { label: "Readaptación", color: "#f59e0b" },
                    puncion_seca: { label: "Punción Seca", color: "#ef4444" },
                    electrolisis: { label: "Electrólisis", color: "#10b981" },
                    terapia_manual: { label: "Terapia Manual", color: "#f97316" },
                    otro: { label: "Otro", color: "#6b7280" }
                  }}
                  className="h-64 sm:h-80 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={treatmentTypeData.filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          const percentage = (percent * 100).toFixed(0);
                          // Only show labels for segments > 5% and adjust for mobile
                          if (percent > 0.05) {
                            return window.innerWidth < 640 ? `${percentage}%` : `${name}\n${percentage}%`;
                          }
                          return '';
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={3}
                      >
                        {treatmentTypeData.filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const total = treatmentTypeData.reduce((sum, item) => sum + item.value, 0);
                            return (
                              <div className="bg-white p-4 rounded-xl shadow-lg border-0 ring-1 ring-gray-200">
                                <p className="font-semibold text-gray-800">{data.name}</p>
                                <p className="text-sm text-gray-600">
                                  {data.value} tratamientos ({total > 0 ? (((data.payload?.value || 0) / total) * 100).toFixed(1) : 0}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                {/* Estadísticas centrales */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-gray-800">
                      {treatmentTypeData.reduce((sum, item) => sum + item.value, 0)}
                    </div>
                    <div className="text-xs font-medium text-gray-600">Tratamientos</div>
                  </div>
                </div>
              </div>
              
              {/* Scrollable content area for treatment breakdown */}
              <div className="flex-1 overflow-y-auto">
                {/* Resumen compacto con porcentajes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  {treatmentTypeData
                    .filter(item => item.value > 0)
                    .slice(0, 6)
                    .map((item, index) => {
                      const total = treatmentTypeData.reduce((sum, data) => sum + data.value, 0);
                      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                      return (
                         <div key={item.treatment} className="flex items-center justify-between bg-white/70 p-2 sm:p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 min-w-0">
                           <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                             <div 
                               className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-lg border-2 border-white flex-shrink-0"
                               style={{ backgroundColor: item.fill }}
                             />
                             <div className="min-w-0 flex-1">
                               <span className="font-semibold text-gray-800 text-xs sm:text-sm block truncate">{item.treatment}</span>
                               <div className="text-xs text-gray-600">{item.value} casos</div>
                             </div>
                           </div>
                           <div className="text-right flex-shrink-0 ml-2">
                             <div className="text-xs sm:text-base font-bold whitespace-nowrap" style={{ color: item.fill }}>
                               {percentage}%
                             </div>
                           </div>
                         </div>
                      );
                    })}
                </div>
                
                {/* Leyenda compacta para tratamientos con 0 casos */}
                {treatmentTypeData.some(item => item.value === 0) && (
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <h5 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2">Sin casos registrados:</h5>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {treatmentTypeData
                        .filter(item => item.value === 0)
                        .map((item) => (
                          <div key={item.treatment} className="flex items-center gap-1 sm:gap-2 bg-white px-2 sm:px-3 py-1 rounded-lg shadow-sm">
                            <div 
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full opacity-50"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-xs text-gray-500">{item.treatment}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Body Zones - Ultra Modern Design */}
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold">Mapa Corporal de Tratamientos</span>
                  <p className="text-gray-600 mt-1 text-xs sm:text-sm">Diagrama anatómico con zonas del cuerpo más tratadas</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/50">
            <HumanBodyDiagram bodyZoneData={bodyZoneData} />
          </CardContent>
        </Card>

        {/* Enhanced Statistics */}
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-1">
            <CardHeader className="bg-white m-1 rounded-lg">
              <CardTitle className="flex items-center gap-3 text-gray-800">
                <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">Estadísticas Detalladas por Zona</span>
                  <p className="text-gray-600 mt-1">Análisis completo de frecuencia de tratamientos</p>
                </div>
              </CardTitle>
            </CardHeader>
          </div>
          <CardContent className="p-8 bg-gradient-to-b from-white to-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {bodyZoneData.map((zone, index) => (
                <div 
                  key={zone.zone} 
                  className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border-0 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-6 h-6 rounded-full shadow-lg ring-2 ring-white"
                          style={{ 
                            backgroundColor: zone.count === 0 ? '#f8fafc' : 
                                           zone.count <= 2 ? '#fef3c7' : 
                                           zone.count <= 5 ? '#fed7aa' : 
                                           zone.count <= 10 ? '#fca5a5' : '#dc2626'
                          }}
                        ></div>
                        <div>
                          <h4 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors text-lg">
                            {zone.label}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {zone.percentage}% del total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 px-4 py-2 text-lg font-bold shadow-lg">
                          {zone.count}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">casos</p>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${zone.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Ultra Modern Summary */}
            <div className="mt-10 relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative p-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold mb-2">Resumen Total</h4>
                    <p className="text-blue-100">Casos registrados en el sistema</p>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold mb-2">
                      {bodyZoneData.reduce((sum, zone) => sum + zone.count, 0)}
                    </div>
                    <p className="text-blue-100">casos totales</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
            </div>
          </CardContent>
        </Card>

        {surveys.length === 0 && (
          <Card className="border-0 shadow-xl bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No hay datos disponibles</h3>
              <p className="text-gray-600">Comienza agregando tratamientos para ver las estadísticas aquí.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};