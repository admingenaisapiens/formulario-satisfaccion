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
      fill: name === 'Presencial' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'
    }));
  }, [surveys]);

  // Process treatment types
  const treatmentTypeData = useMemo(() => {
    const counts = surveys.reduce((acc, survey) => {
      const treatment = getTreatmentLabel(survey.treatment_type);
      acc[treatment] = (acc[treatment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([treatment, count]) => ({ treatment, count }))
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

    const getZoneColor = (count: number) => {
      if (count === 0) return '#e5e7eb';
      if (count <= 2) return '#fef3c7';
      if (count <= 5) return '#fed7aa';
      if (count <= 10) return '#fca5a5';
      return '#ef4444';
    };

    return (
      <div className="flex flex-col items-center space-y-4">
        <svg width="200" height="400" viewBox="0 0 200 400" className="border rounded-lg bg-gray-50">
          {/* Head */}
          <circle 
            cx="100" 
            cy="40" 
            r="25" 
            fill="#e5e7eb" 
            stroke="#6b7280" 
            strokeWidth="2"
          />
          
          {/* Neck */}
          <rect x="90" y="65" width="20" height="15" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
          
          {/* Cervical Spine */}
          <rect 
            x="85" 
            y="80" 
            width="30" 
            height="20" 
            fill={getZoneColor(getZoneCount('columna_cervical'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="100" y="92" textAnchor="middle" fontSize="10" fill="#374151">
            C: {getZoneCount('columna_cervical')}
          </text>
          
          {/* Shoulders */}
          <circle 
            cx="65" 
            cy="110" 
            r="15" 
            fill={getZoneColor(getZoneCount('hombro'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="65" y="115" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('hombro')}
          </text>
          
          <circle 
            cx="135" 
            cy="110" 
            r="15" 
            fill={getZoneColor(getZoneCount('hombro'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="135" y="115" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('hombro')}
          </text>
          
          {/* Dorsal Spine */}
          <rect 
            x="85" 
            y="100" 
            width="30" 
            height="60" 
            fill={getZoneColor(getZoneCount('columna_dorsal'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="100" y="135" textAnchor="middle" fontSize="10" fill="#374151">
            D: {getZoneCount('columna_dorsal')}
          </text>
          
          {/* Arms */}
          <rect x="40" y="120" width="20" height="80" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
          <rect x="140" y="120" width="20" height="80" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
          
          {/* Elbows */}
          <circle 
            cx="50" 
            cy="160" 
            r="8" 
            fill={getZoneColor(getZoneCount('codo'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="50" y="165" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('codo')}
          </text>
          
          <circle 
            cx="150" 
            cy="160" 
            r="8" 
            fill={getZoneColor(getZoneCount('codo'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="150" y="165" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('codo')}
          </text>
          
          {/* Hands */}
          <circle 
            cx="50" 
            cy="210" 
            r="12" 
            fill={getZoneColor(getZoneCount('mano'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="50" y="215" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('mano')}
          </text>
          
          <circle 
            cx="150" 
            cy="210" 
            r="12" 
            fill={getZoneColor(getZoneCount('mano'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="150" y="215" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('mano')}
          </text>
          
          {/* Lumbar Spine */}
          <rect 
            x="85" 
            y="160" 
            width="30" 
            height="40" 
            fill={getZoneColor(getZoneCount('columna_lumbar'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="100" y="185" textAnchor="middle" fontSize="10" fill="#374151">
            L: {getZoneCount('columna_lumbar')}
          </text>
          
          {/* Legs */}
          <rect x="80" y="200" width="18" height="120" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
          <rect x="102" y="200" width="18" height="120" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
          
          {/* Knees */}
          <circle 
            cx="89" 
            cy="260" 
            r="12" 
            fill={getZoneColor(getZoneCount('rodilla'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="89" y="265" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('rodilla')}
          </text>
          
          <circle 
            cx="111" 
            cy="260" 
            r="12" 
            fill={getZoneColor(getZoneCount('rodilla'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="111" y="265" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('rodilla')}
          </text>
          
          {/* Feet */}
          <ellipse 
            cx="89" 
            cy="340" 
            rx="15" 
            ry="25" 
            fill={getZoneColor(getZoneCount('pie'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="89" y="345" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('pie')}
          </text>
          
          <ellipse 
            cx="111" 
            cy="340" 
            rx="15" 
            ry="25" 
            fill={getZoneColor(getZoneCount('pie'))} 
            stroke="#6b7280" 
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text x="111" y="345" textAnchor="middle" fontSize="8" fill="#374151">
            {getZoneCount('pie')}
          </text>
        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-300 rounded"></div>
            <span>3-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-300 rounded"></div>
            <span>6-10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>10+</span>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Appointment Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Cita</CardTitle>
            <CardDescription>
              Distribución entre citas presenciales y telemáticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                presencial: { label: "Presencial", color: "hsl(var(--chart-1))" },
                telematica: { label: "Telemática", color: "hsl(var(--chart-2))" }
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Treatment Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Tratamiento</CardTitle>
            <CardDescription>
              Tratamientos más realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Cantidad", color: "hsl(var(--primary))" }
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={treatmentTypeData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="treatment" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                    interval={0}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Body Zones */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa Corporal de Tratamientos</CardTitle>
            <CardDescription>
              Zonas del cuerpo más tratadas (intensidad por color)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HumanBodyDiagram bodyZoneData={bodyZoneData} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Body Zone Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas Detalladas por Zona</CardTitle>
          <CardDescription>
            Frecuencia de tratamientos por zona del cuerpo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bodyZoneData.map((zone, index) => (
              <div key={zone.zone} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{zone.label}</h4>
                  <p className="text-sm text-muted-foreground">{zone.percentage}% del total</p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {zone.count}
                </Badge>
              </div>
            ))}
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