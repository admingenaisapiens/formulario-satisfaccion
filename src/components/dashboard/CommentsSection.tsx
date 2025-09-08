import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, MessageSquare, TrendingUp, TrendingDown, Users } from 'lucide-react';

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

export const CommentsSection = () => {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [npsFilter, setNpsFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const { toast } = useToast();

  useEffect(() => {
    fetchSurveys();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('survey_responses_changes_comments')
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
    filterAndSortSurveys();
  }, [surveys, searchTerm, npsFilter, sortBy]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .not('additional_comments', 'is', null)
        .neq('additional_comments', '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los comentarios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortSurveys = () => {
    let filtered = surveys;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(survey =>
        survey.additional_comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by NPS score
    if (npsFilter !== 'all') {
      if (npsFilter === 'promoters') {
        filtered = filtered.filter(survey => survey.nps_score >= 9);
      } else if (npsFilter === 'passives') {
        filtered = filtered.filter(survey => survey.nps_score >= 7 && survey.nps_score <= 8);
      } else if (npsFilter === 'detractors') {
        filtered = filtered.filter(survey => survey.nps_score <= 6);
      }
    }

    // Sort surveys
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest_nps':
          return b.nps_score - a.nps_score;
        case 'lowest_nps':
          return a.nps_score - b.nps_score;
        case 'highest_satisfaction':
          return calculateAverageSatisfaction(b) - calculateAverageSatisfaction(a);
        case 'lowest_satisfaction':
          return calculateAverageSatisfaction(a) - calculateAverageSatisfaction(b);
        default: // 'newest'
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredSurveys(filtered);
    setCurrentPage(1);
  };

  const calculateAverageSatisfaction = (survey: SurveyResponse): number => {
    const ratings = [
      survey.website_design_rating,
      survey.communication_clarity,
      survey.reception_friendliness,
      survey.clinic_environment,
      survey.doctor_listening,
      survey.explanation_clarity,
      survey.consultation_time
    ].filter(rating => rating !== null && rating !== undefined);
    
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  };

  const getNPSBadge = (score: number) => {
    if (score >= 9) {
      return <Badge className="bg-accent/20 text-accent border-accent">Promotor</Badge>;
    } else if (score >= 7) {
      return <Badge variant="secondary">Pasivo</Badge>;
    } else {
      return <Badge variant="destructive">Detractor</Badge>;
    }
  };

  const getSatisfactionLevel = (avgSatisfaction: number) => {
    if (avgSatisfaction >= 4.5) return { label: 'Excelente', color: 'text-green-600' };
    if (avgSatisfaction >= 4) return { label: 'Muy Bueno', color: 'text-blue-600' };
    if (avgSatisfaction >= 3.5) return { label: 'Bueno', color: 'text-yellow-600' };
    if (avgSatisfaction >= 3) return { label: 'Regular', color: 'text-orange-600' };
    return { label: 'Malo', color: 'text-red-600' };
  };

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
      case 'otra': return 'Otra';
      default: return bodyArea;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSurveys = filteredSurveys.slice(startIndex, startIndex + itemsPerPage);

  // Summary stats
  const promoters = surveys.filter(s => s.nps_score >= 9).length;
  const detractors = surveys.filter(s => s.nps_score <= 6).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando comentarios...</p>
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
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Comentarios de Pacientes</h1>
              <p className="text-blue-100 text-lg">
                Feedback adicional y sugerencias de los pacientes
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
        </div>
      </div>
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:scale-105 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-100">Total Comentarios</CardTitle>
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{surveys.length}</div>
            <p className="text-blue-100 text-sm">
              Respuestas con feedback adicional
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-100">Promotores</CardTitle>
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{promoters}</div>
            <p className="text-emerald-100 text-sm">
              Comentarios con NPS 9-10
            </p>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 text-white hover:scale-105 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-100">Detractores</CardTitle>
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{detractors}</div>
            <p className="text-orange-100 text-sm">
              Comentarios con NPS 0-6
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-1">
          <CardHeader className="bg-white m-1 rounded-lg">
            <CardTitle className="flex items-center gap-3 text-gray-800">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold">Filtros de Comentarios</span>
                <p className="text-sm font-normal text-gray-600 mt-1">Filtra y ordena los comentarios de los pacientes</p>
              </div>
            </CardTitle>
          </CardHeader>
        </div>
        <CardContent className="p-8 bg-gradient-to-b from-white to-violet-50/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en comentarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={npsFilter} onValueChange={setNpsFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por NPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="promoters">Promotores (9-10)</SelectItem>
                <SelectItem value="passives">Pasivos (7-8)</SelectItem>
                <SelectItem value="detractors">Detractores (0-6)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="highest_nps">NPS más alto</SelectItem>
                <SelectItem value="lowest_nps">NPS más bajo</SelectItem>
                <SelectItem value="highest_satisfaction">Satisfacción más alta</SelectItem>
                <SelectItem value="lowest_satisfaction">Satisfacción más baja</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              <Users className="w-4 h-4 mr-2" />
              {filteredSurveys.length} comentarios
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Comments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedSurveys.map((survey) => {
          const avgSatisfaction = calculateAverageSatisfaction(survey);
          const satisfactionLevel = getSatisfactionLevel(avgSatisfaction);

          return (
            <Card key={survey.id} className="group relative overflow-hidden border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-gray-800 group-hover:text-blue-700 transition-colors">
                      {format(new Date(survey.created_at), 'dd MMM yyyy', { locale: es })}
                    </CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                      {getTreatmentLabel(survey.treatment_type || '')} - {getBodyAreaLabel(survey.body_area || '')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getNPSBadge(survey.nps_score)}
                    <span className="text-sm text-gray-500 font-medium">
                      NPS: {survey.nps_score}/10
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <span className="text-sm font-semibold text-gray-700">Satisfacción General:</span>
                    <span className={`text-sm font-bold ${satisfactionLevel.color}`}>
                      {satisfactionLevel.label} ({avgSatisfaction.toFixed(1)}/5)
                    </span>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4 py-3 bg-gradient-to-r from-blue-50/50 to-transparent rounded-r-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Comentario del Paciente:</p>
                    <p className="text-sm leading-relaxed text-gray-800 italic">
                      "{survey.additional_comments}"
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Tipo: {survey.appointment_type === 'presencial' ? 'Presencial' : 'Telemática'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span>ID: {survey.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* No results message */}
      {filteredSurveys.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No se encontraron comentarios</h3>
          <p className="text-muted-foreground">
            {searchTerm || npsFilter !== 'all' 
              ? 'No hay comentarios que coincidan con los filtros aplicados.' 
              : 'Aún no hay encuestas con comentarios adicionales.'}
          </p>
        </div>
      )}
    </div>
  );
};