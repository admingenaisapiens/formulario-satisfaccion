import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, MessageSquare, Star, Calendar } from 'lucide-react';

interface SurveyResponse {
  id: string;
  nps_score: number;
  additional_comments: string | null;
  created_at: string;
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
        survey.additional_comments?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by NPS category
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
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest_nps':
        filtered.sort((a, b) => b.nps_score - a.nps_score);
        break;
      case 'lowest_nps':
        filtered.sort((a, b) => a.nps_score - b.nps_score);
        break;
      case 'highest_satisfaction':
        filtered.sort((a, b) => {
          const avgA = calculateAverageSatisfaction(a);
          const avgB = calculateAverageSatisfaction(b);
          return avgB - avgA;
        });
        break;
      case 'lowest_satisfaction':
        filtered.sort((a, b) => {
          const avgA = calculateAverageSatisfaction(a);
          const avgB = calculateAverageSatisfaction(b);
          return avgA - avgB;
        });
        break;
    }

    setFilteredSurveys(filtered);
    setCurrentPage(1);
  };

  const calculateAverageSatisfaction = (survey: SurveyResponse) => {
    const scores = [
      survey.booking_ease,
      survey.wait_time_satisfaction,
      survey.communication_clarity,
      survey.reception_friendliness,
      survey.clinic_environment,
      survey.doctor_listening,
      survey.explanation_clarity,
      survey.consultation_time,
      survey.treatment_trust
    ];
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const getNPSBadge = (score: number) => {
    if (score >= 9) return <Badge className="bg-green-100 text-green-800 border-green-300">Promotor</Badge>;
    if (score >= 7) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pasivo</Badge>;
    return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">Detractor</Badge>;
  };

  const getSatisfactionLevel = (avgScore: number) => {
    if (avgScore >= 4) return { label: 'Muy Satisfecho', color: 'text-green-600' };
    if (avgScore >= 3.5) return { label: 'Satisfecho', color: 'text-blue-600' };
    if (avgScore >= 2.5) return { label: 'Neutral', color: 'text-yellow-600' };
    return { label: 'Insatisfecho', color: 'text-red-600' };
  };

  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSurveys = filteredSurveys.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando comentarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comentarios</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">
              Con feedback adicional
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotores</CardTitle>
            <Star className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {surveys.filter(s => s.nps_score >= 9).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Con comentarios positivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas de Mejora</CardTitle>
            <Star className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {surveys.filter(s => s.nps_score <= 6).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Comentarios constructivos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en comentarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={npsFilter} onValueChange={setNpsFilter}>
              <SelectTrigger className="w-full lg:w-48">
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
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="highest_nps">Mayor NPS</SelectItem>
                <SelectItem value="lowest_nps">Menor NPS</SelectItem>
                <SelectItem value="highest_satisfaction">Más satisfechos</SelectItem>
                <SelectItem value="lowest_satisfaction">Menos satisfechos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Mostrando {paginatedSurveys.length} de {filteredSurveys.length} comentarios
        </p>
      </div>

      {/* Comments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedSurveys.map((survey) => {
          const avgSatisfaction = calculateAverageSatisfaction(survey);
          const satisfactionLevel = getSatisfactionLevel(avgSatisfaction);
          
          return (
            <Card key={survey.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(survey.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getNPSBadge(survey.nps_score)}
                      <span className="text-sm font-medium">NPS: {survey.nps_score}/10</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Satisfacción General</div>
                    <div className={`text-sm ${satisfactionLevel.color}`}>
                      {satisfactionLevel.label} ({avgSatisfaction.toFixed(1)}/5)
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed">
                      "{survey.additional_comments}"
                    </p>
                  </div>
                  
                  {/* Quick satisfaction metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">Doctor</div>
                      <div className="text-muted-foreground">
                        {((survey.doctor_listening + survey.explanation_clarity + survey.consultation_time + survey.treatment_trust) / 4).toFixed(1)}/5
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Servicio</div>
                      <div className="text-muted-foreground">
                        {((survey.reception_friendliness + survey.clinic_environment) / 2).toFixed(1)}/5
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Proceso</div>
                      <div className="text-muted-foreground">
                        {((survey.booking_ease + survey.wait_time_satisfaction + survey.communication_clarity) / 3).toFixed(1)}/5
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

      {filteredSurveys.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No se encontraron comentarios</p>
          <p className="text-muted-foreground">
            {searchTerm || npsFilter !== 'all' 
              ? "Intenta ajustar los filtros de búsqueda"
              : "Aún no hay comentarios de pacientes"
            }
          </p>
        </div>
      )}
    </div>
  );
};