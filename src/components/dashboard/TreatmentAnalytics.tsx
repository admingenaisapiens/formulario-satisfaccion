import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Users, Stethoscope, MapPin } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
    const counts = surveys.reduce((acc, survey) => {
      const type = survey.appointment_type === 'presencial' ? 'Presencial' : 'Telemática';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Presencial' ? '#10b981' : '#3b82f6' // Verde para presencial, azul para telemática
    }));
  }, [surveys]);

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
    surveys.forEach(survey => {
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
  }, [surveys]);

  // Process body zones
  const bodyZoneData = useMemo(() => {
    const counts = surveys.reduce((acc, survey) => {
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
  }, [surveys]);

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
        <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Intensidad de Tratamientos</h4>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-gray-200 rounded border"></div>
              <span className="font-medium">0 casos</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-yellow-200 rounded border"></div>
              <span className="font-medium">1-2 casos</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-orange-300 rounded border"></div>
              <span className="font-medium">3-5 casos</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-red-300 rounded border"></div>
              <span className="font-medium">6-10 casos</span>
            </div>
            <div className="flex items-center gap-2 bg-red-100 px-3 py-2 rounded-lg">
              <div className="w-4 h-4 bg-red-600 rounded border"></div>
              <span className="font-medium">10+ casos</span>
            </div>
          </div>
        </div>
        
        {/* Body zone quick stats */}
        <div className="grid grid-cols-2 gap-2 text-xs w-full max-w-xs">
          {bodyZoneData.slice(0, 4).map((zone, index) => (
            <div key={zone.zone} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <span className="font-medium text-gray-700">{zone.label}</span>
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full border"
                  style={{ 
                    backgroundColor: getZoneColor(zone.count, 0.8)
                  }}
                ></div>
                <span className="font-bold text-gray-800">{zone.count}</span>
              </div>
            </div>
          ))}
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Análisis de Tratamientos</CardTitle>
              <CardDescription>
                Información detallada sobre tipos de cita, tratamientos y zonas del cuerpo más tratadas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tratamientos</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">
              Consultas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cita Más Frecuente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointmentTypeData.length > 0 ? 
                appointmentTypeData.reduce((prev, current) => (prev.value > current.value) ? prev : current).name 
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Tipo de consulta predominante
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zona Más Tratada</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bodyZoneData.length > 0 ? bodyZoneData[0].label : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {bodyZoneData.length > 0 ? `${bodyZoneData[0].count} casos (${bodyZoneData[0].percentage}%)` : 'Sin datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards - Improved Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Appointment Types - Enhanced */}
        <Card className="border-2 border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="flex items-center gap-3 text-emerald-900">
              <div className="p-2 bg-emerald-100 rounded-full">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-lg font-bold">Tipos de Cita</span>
                <p className="text-sm font-normal text-emerald-700 mt-1">Modalidad de consulta médica</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-white to-emerald-50 flex flex-col h-full">
            <div className="flex items-center justify-center mb-4 flex-1">
              <ChartContainer
                config={{
                  presencial: { label: "Presencial", color: "hsl(var(--chart-1))" },
                  telematica: { label: "Telemática", color: "hsl(var(--chart-2))" }
                }}
                className="h-40 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appointmentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
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
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-semibold text-gray-800">{data.name}</p>
                               <p className="text-sm text-gray-600">
                                 {data.value} citas ({(((data.payload?.value || 0) / appointmentTypeData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
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
            </div>
            {/* Quick stats for appointment types */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
              {appointmentTypeData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="font-medium text-gray-700 text-sm">{item.name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Treatment Types - Enhanced */}
        <Card className="border-2 border-violet-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
            <CardTitle className="flex items-center gap-3 text-violet-900">
              <div className="p-2 bg-violet-100 rounded-full">
                <Stethoscope className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <span className="text-lg font-bold">Tipos de Tratamiento</span>
                <p className="text-sm font-normal text-violet-700 mt-1">Terapias más utilizadas</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-white to-violet-50">
            <div className="flex items-center justify-center mb-6">
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
                className="h-48 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={treatmentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={3}
                    >
                      {treatmentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const total = treatmentTypeData.reduce((sum, item) => sum + item.value, 0);
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
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
            </div>
            
            {/* Leyenda de Tratamientos */}
            <div className="bg-white p-4 rounded-xl border border-violet-100 shadow-sm">
              <h4 className="text-sm font-semibold text-violet-800 mb-3 text-center">Leyenda de Tratamientos</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-violet-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span className="font-medium text-gray-700">Fisioterapia</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-cyan-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#06b6d4' }}></div>
                  <span className="font-medium text-gray-700">Osteopatía</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="font-medium text-gray-700">Readaptación</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="font-medium text-gray-700">Punción Seca</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="font-medium text-gray-700">Electrólisis</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-orange-50">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#f97316' }}></div>
                  <span className="font-medium text-gray-700">Terapia Manual</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 col-span-2">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: '#6b7280' }}></div>
                  <span className="font-medium text-gray-700">Otro</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Body Zones - Full Width Card */}
      <Card className="border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            Mapa Corporal de Tratamientos
          </CardTitle>
          <CardDescription className="text-blue-700">
            Diagrama anatómico con zonas del cuerpo más tratadas (intensidad por color y opacidad)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 bg-gradient-to-b from-white to-blue-50">
          <HumanBodyDiagram bodyZoneData={bodyZoneData} />
        </CardContent>
      </Card>

      {/* Detailed Body Zone Statistics */}
      <Card className="border-2 border-slate-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-slate-100 rounded-full">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            Estadísticas Detalladas por Zona
          </CardTitle>
          <CardDescription className="text-slate-600">
            Frecuencia de tratamientos por zona del cuerpo con análisis visual
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bodyZoneData.map((zone, index) => (
              <div 
                key={zone.zone} 
                className="group flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-gray-300 shadow-sm"
                    style={{ 
                      backgroundColor: zone.count === 0 ? '#f8fafc' : 
                                     zone.count <= 2 ? '#fef3c7' : 
                                     zone.count <= 5 ? '#fed7aa' : 
                                     zone.count <= 10 ? '#fca5a5' : '#dc2626',
                      opacity: zone.count === 0 ? 0.3 :
                               zone.count <= 2 ? 0.6 :
                               zone.count <= 5 ? 0.75 :
                               zone.count <= 10 ? 0.85 : 1
                    }}
                  ></div>
                  <div>
                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                      {zone.label}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {zone.percentage}% del total
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-100 text-blue-800 border border-blue-200 font-bold group-hover:bg-blue-200 transition-colors"
                  >
                    {zone.count}
                  </Badge>
                  <span className="text-xs text-gray-400 mt-1">casos</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary bar */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900">Resumen Total</h4>
                <p className="text-sm text-blue-700">Tratamientos registrados por zona</p>
              </div>
              <div className="text-2xl font-bold text-blue-800">
                {bodyZoneData.reduce((sum, zone) => sum + zone.count, 0)} casos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {surveys.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay datos de tratamiento disponibles.</p>
        </div>
      )}
    </div>
  );
};