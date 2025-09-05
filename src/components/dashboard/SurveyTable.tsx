import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Download, Search, Filter } from 'lucide-react';

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

export const SurveyTable = () => {
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [npsFilter, setNpsFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    filterSurveys();
  }, [surveys, searchTerm, npsFilter, dateFrom, dateTo]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

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

  const filterSurveys = () => {
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

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(survey => new Date(survey.created_at) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(survey => new Date(survey.created_at) <= dateTo);
    }

    setFilteredSurveys(filtered);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Fecha', 'Facilidad Reserva', 'Satisfacción Espera', 'Claridad Comunicación',
      'Amabilidad Recepción', 'Tiempo Espera', 'Ambiente Clínica', 'Escucha Doctor',
      'Claridad Explicaciones', 'Tiempo Consulta', 'Confianza Tratamiento',
      'NPS Score', 'Comentarios'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredSurveys.map(survey => [
        survey.id,
        format(new Date(survey.created_at), 'dd/MM/yyyy HH:mm'),
        survey.booking_ease,
        survey.wait_time_satisfaction,
        survey.communication_clarity,
        survey.reception_friendliness,
        getWaitingTimeLabel(survey.waiting_time),
        survey.clinic_environment,
        survey.doctor_listening,
        survey.explanation_clarity,
        survey.consultation_time,
        survey.treatment_trust,
        survey.nps_score,
        `"${survey.additional_comments || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `encuestas_satisfaccion_${format(new Date(), 'yyyy_MM_dd')}.csv`;
    link.click();

    toast({
      title: "Exportación exitosa",
      description: "Los datos se han exportado correctamente",
    });
  };

  const getWaitingTimeLabel = (value: string) => {
    const labels: { [key: string]: string } = {
      'less_than_5': '< 5 min',
      '5_to_15': '5-15 min',
      '15_to_30': '15-30 min',
      'more_than_30': '> 30 min'
    };
    return labels[value] || value;
  };

  const getNPSBadge = (score: number) => {
    if (score >= 9) return <Badge className="bg-green-100 text-green-800">Promotor</Badge>;
    if (score >= 7) return <Badge variant="secondary">Pasivo</Badge>;
    return <Badge variant="destructive">Detractor</Badge>;
  };

  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSurveys = filteredSurveys.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando encuestas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID o comentarios..."
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

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Desde'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Hasta'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={exportToCSV} className="w-full lg:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Mostrando {paginatedSurveys.length} de {filteredSurveys.length} resultados
        </p>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Reserva</TableHead>
              <TableHead>Espera Cita</TableHead>
              <TableHead>Comunicación</TableHead>
              <TableHead>Recepción</TableHead>
              <TableHead>T. Espera</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Escucha</TableHead>
              <TableHead>Explicación</TableHead>
              <TableHead>T. Consulta</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead>NPS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSurveys.map((survey) => (
              <TableRow key={survey.id}>
                <TableCell className="font-medium">
                  {format(new Date(survey.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>{survey.booking_ease}/5</TableCell>
                <TableCell>{survey.wait_time_satisfaction}/5</TableCell>
                <TableCell>{survey.communication_clarity}/5</TableCell>
                <TableCell>{survey.reception_friendliness}/5</TableCell>
                <TableCell>{getWaitingTimeLabel(survey.waiting_time)}</TableCell>
                <TableCell>{survey.clinic_environment}/5</TableCell>
                <TableCell>{survey.doctor_listening}/5</TableCell>
                <TableCell>{survey.explanation_clarity}/5</TableCell>
                <TableCell>{survey.consultation_time}/5</TableCell>
                <TableCell>{survey.treatment_trust}/5</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{survey.nps_score}/10</span>
                    {getNPSBadge(survey.nps_score)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    </div>
  );
};