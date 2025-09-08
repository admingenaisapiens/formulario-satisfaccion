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
      if (count === 0) return '#f8fafc';
      if (count <= 2) return '#fef3c7';
      if (count <= 5) return '#fed7aa';
      if (count <= 10) return '#fca5a5';
      return '#dc2626';
    };

    const getZoneOpacity = (count: number) => {
      if (count === 0) return 0.3;
      if (count <= 2) return 0.6;
      if (count <= 5) return 0.75;
      if (count <= 10) return 0.85;
      return 1;
    };

    return (
      <div className="flex flex-col items-center space-y-6 p-4">
        <div className="relative">
          <svg 
            width="280" 
            height="500" 
            viewBox="0 0 280 500" 
            className="border-2 border-gray-200 rounded-2xl bg-gradient-to-b from-blue-50 to-white shadow-lg"
          >
            {/* Background grid for medical chart feel */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
              
              {/* Gradients for better visual depth */}
              <radialGradient id="bodyGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </radialGradient>
              
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="2" dy="2" result="offset"/>
                <feFlood floodColor="#0000001a"/>
                <feComposite in2="offset" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Head - More detailed and anatomical */}
            <ellipse 
              cx="140" 
              cy="50" 
              rx="32" 
              ry="35" 
              fill="url(#bodyGradient)" 
              stroke="#64748b" 
              strokeWidth="2"
              filter="url(#shadow)"
            />
            <circle cx="132" cy="45" r="2" fill="#374151" />
            <circle cx="148" cy="45" r="2" fill="#374151" />
            <path d="M 135 55 Q 140 58 145 55" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            
            {/* Neck - More realistic proportions */}
            <rect 
              x="125" 
              y="85" 
              width="30" 
              height="20" 
              rx="5" 
              fill="url(#bodyGradient)" 
              stroke="#64748b" 
              strokeWidth="1"
            />
            
            {/* Cervical Spine - Enhanced design */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <rect 
                x="115" 
                y="105" 
                width="50" 
                height="25" 
                rx="8" 
                fill={getZoneColor(getZoneCount('columna_cervical'))} 
                fillOpacity={getZoneOpacity(getZoneCount('columna_cervical'))}
                stroke="#4f46e5" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text x="140" y="120" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e293b">
                C: {getZoneCount('columna_cervical')}
              </text>
              <text x="140" y="132" textAnchor="middle" fontSize="8" fill="#64748b">
                Cervical
              </text>
            </g>
            
            {/* Shoulders - More anatomical shape */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="85" 
                cy="145" 
                rx="22" 
                ry="18" 
                fill={getZoneColor(getZoneCount('hombro'))} 
                fillOpacity={getZoneOpacity(getZoneCount('hombro'))}
                stroke="#059669" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text x="85" y="150" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">
                {getZoneCount('hombro')}
              </text>
            </g>
            
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="195" 
                cy="145" 
                rx="22" 
                ry="18" 
                fill={getZoneColor(getZoneCount('hombro'))} 
                fillOpacity={getZoneOpacity(getZoneCount('hombro'))}
                stroke="#059669" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text x="195" y="150" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">
                {getZoneCount('hombro')}
              </text>
            </g>
            
            {/* Dorsal Spine - Enhanced with vertebrae indication */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <rect 
                x="115" 
                y="130" 
                width="50" 
                height="80" 
                rx="12" 
                fill={getZoneColor(getZoneCount('columna_dorsal'))} 
                fillOpacity={getZoneOpacity(getZoneCount('columna_dorsal'))}
                stroke="#7c3aed" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              {/* Vertebrae lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line 
                  key={i}
                  x1="120" 
                  y1={140 + i * 14} 
                  x2="160" 
                  y2={140 + i * 14} 
                  stroke="#6d28d9" 
                  strokeWidth="1" 
                  opacity="0.6"
                />
              ))}
              <text x="140" y="175" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e293b">
                D: {getZoneCount('columna_dorsal')}
              </text>
              <text x="140" y="187" textAnchor="middle" fontSize="8" fill="#64748b">
                Dorsal
              </text>
            </g>
            
            {/* Arms - More realistic anatomy */}
            <rect x="50" y="160" width="28" height="100" rx="14" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1" />
            <rect x="202" y="160" width="28" height="100" rx="14" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1" />
            
            {/* Elbows - Enhanced design */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <circle 
                cx="64" 
                cy="210" 
                r="14" 
                fill={getZoneColor(getZoneCount('codo'))} 
                fillOpacity={getZoneOpacity(getZoneCount('codo'))}
                stroke="#ea580c" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text x="64" y="215" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('codo')}
              </text>
            </g>
            
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <circle 
                cx="216" 
                cy="210" 
                r="14" 
                fill={getZoneColor(getZoneCount('codo'))} 
                fillOpacity={getZoneOpacity(getZoneCount('codo'))}
                stroke="#ea580c" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text x="216" y="215" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('codo')}
              </text>
            </g>
            
            {/* Hands - More detailed */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="64" 
                cy="275" 
                rx="16" 
                ry="20" 
                fill={getZoneColor(getZoneCount('mano'))} 
                fillOpacity={getZoneOpacity(getZoneCount('mano'))}
                stroke="#0891b2" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              {/* Finger indication lines */}
              <path d="M 56 265 L 58 255 M 60 265 L 62 255 M 64 265 L 66 255 M 68 265 L 70 255 M 72 265 L 74 255" 
                    stroke="#0891b2" strokeWidth="1" opacity="0.6" />
              <text x="64" y="280" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('mano')}
              </text>
            </g>
            
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="216" 
                cy="275" 
                rx="16" 
                ry="20" 
                fill={getZoneColor(getZoneCount('mano'))} 
                fillOpacity={getZoneOpacity(getZoneCount('mano'))}
                stroke="#0891b2" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <path d="M 208 265 L 206 255 M 212 265 L 210 255 M 216 265 L 214 255 M 220 265 L 218 255 M 224 265 L 222 255" 
                    stroke="#0891b2" strokeWidth="1" opacity="0.6" />
              <text x="216" y="280" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('mano')}
              </text>
            </g>
            
            {/* Lumbar Spine - Enhanced */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <rect 
                x="115" 
                y="210" 
                width="50" 
                height="55" 
                rx="12" 
                fill={getZoneColor(getZoneCount('columna_lumbar'))} 
                fillOpacity={getZoneOpacity(getZoneCount('columna_lumbar'))}
                stroke="#dc2626" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              {/* Lumbar vertebrae */}
              {[0, 1, 2, 3].map(i => (
                <line 
                  key={i}
                  x1="120" 
                  y1={220 + i * 11} 
                  x2="160" 
                  y2={220 + i * 11} 
                  stroke="#b91c1c" 
                  strokeWidth="1" 
                  opacity="0.6"
                />
              ))}
              <text x="140" y="242" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e293b">
                L: {getZoneCount('columna_lumbar')}
              </text>
              <text x="140" y="254" textAnchor="middle" fontSize="8" fill="#64748b">
                Lumbar
              </text>
            </g>
            
            {/* Legs - More anatomical */}
            <rect x="110" y="265" width="25" height="140" rx="12" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1" />
            <rect x="145" y="265" width="25" height="140" rx="12" fill="url(#bodyGradient)" stroke="#64748b" strokeWidth="1" />
            
            {/* Knees - Enhanced design */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="122" 
                cy="335" 
                rx="18" 
                ry="15" 
                fill={getZoneColor(getZoneCount('rodilla'))} 
                fillOpacity={getZoneOpacity(getZoneCount('rodilla'))}
                stroke="#16a34a" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <circle cx="122" cy="335" r="3" fill="#15803d" opacity="0.6" />
              <text x="122" y="340" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('rodilla')}
              </text>
            </g>
            
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="158" 
                cy="335" 
                rx="18" 
                ry="15" 
                fill={getZoneColor(getZoneCount('rodilla'))} 
                fillOpacity={getZoneOpacity(getZoneCount('rodilla'))}
                stroke="#16a34a" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <circle cx="158" cy="335" r="3" fill="#15803d" opacity="0.6" />
              <text x="158" y="340" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('rodilla')}
              </text>
            </g>
            
            {/* Feet - More detailed and anatomical */}
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="122" 
                cy="430" 
                rx="20" 
                ry="30" 
                fill={getZoneColor(getZoneCount('pie'))} 
                fillOpacity={getZoneOpacity(getZoneCount('pie'))}
                stroke="#7c2d12" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              {/* Toe indication */}
              <ellipse cx="122" cy="415" rx="12" ry="8" fill="none" stroke="#7c2d12" strokeWidth="1" opacity="0.4" />
              <text x="122" y="435" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('pie')}
              </text>
            </g>
            
            <g className="hover:opacity-80 transition-all duration-300 cursor-pointer">
              <ellipse 
                cx="158" 
                cy="430" 
                rx="20" 
                ry="30" 
                fill={getZoneColor(getZoneCount('pie'))} 
                fillOpacity={getZoneOpacity(getZoneCount('pie'))}
                stroke="#7c2d12" 
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <ellipse cx="158" cy="415" rx="12" ry="8" fill="none" stroke="#7c2d12" strokeWidth="1" opacity="0.4" />
              <text x="158" y="435" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e293b">
                {getZoneCount('pie')}
              </text>
            </g>
            
            {/* Medical cross decoration */}
            <g transform="translate(250, 20)" opacity="0.1">
              <path d="M 0 8 L 8 8 L 8 0 L 16 0 L 16 8 L 24 8 L 24 16 L 16 16 L 16 24 L 8 24 L 8 16 L 0 16 Z" fill="#ef4444" />
            </g>
          </svg>
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
                    backgroundColor: getZoneColor(zone.count),
                    opacity: getZoneOpacity(zone.count)
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

        {/* Body Zones - Enhanced Card */}
        <Card className="border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
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
      </div>

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