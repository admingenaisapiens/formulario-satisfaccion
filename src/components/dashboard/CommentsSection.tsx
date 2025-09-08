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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comentarios</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">
              Respuestas con feedback adicional
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotores</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoters}</div>
            <p className="text-xs text-muted-foreground">
              Comentarios con NPS 9-10
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detractores</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{detractors}</div>
            <p className="text-xs text-muted-foreground">
              Comentarios con NPS 0-6
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Comentarios</CardTitle>
          <CardDescription>
            Filtra y ordena los comentarios de los pacientes
          </CardDescription>
        </CardHeader>
        <CardContent>
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

      {/* Comments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSurveys.map((survey) => {
          const avgSatisfaction = calculateAverageSatisfaction(survey);
          const satisfactionLevel = getSatisfactionLevel(avgSatisfaction);

          return (
            <Card key={survey.id} className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {format(new Date(survey.created_at), 'dd MMM yyyy', { locale: es })}
                    </CardTitle>
                    <CardDescription>
                      {getTreatmentLabel(survey.treatment_type || '')} - {getBodyAreaLabel(survey.body_area || '')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getNPSBadge(survey.nps_score)}
                    <span className="text-sm text-muted-foreground">
                      NPS: {survey.nps_score}/10
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Satisfacción General:</span>
                    <span className={`text-sm font-medium ${satisfactionLevel.color}`}>
                      {satisfactionLevel.label} ({avgSatisfaction.toFixed(1)}/5)
                    </span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground mb-2">Comentario:</p>
                    <p className="text-sm leading-relaxed">
                      "{survey.additional_comments}"
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div className="grid grid-cols-2 gap-1">
                      <span>Tipo: {survey.appointment_type === 'presencial' ? 'Presencial' : 'Telemática'}</span>
                      <span>ID: {survey.id.slice(0, 8)}...</span>
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