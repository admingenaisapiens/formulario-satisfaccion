import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, CalendarIcon, Search, Table as TableIcon } from 'lucide-react';

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
    
    // Set up real-time subscription
    const channel = supabase
      .channel('survey_responses_changes')
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

  const getWaitingTimeLabel = (waitingTime: string) => {
    switch (waitingTime) {
      case 'less_than_5': return 'Menos de 5 minutos';
      case '5_to_15': return 'Entre 5 y 15 minutos';
      case '15_to_30': return 'Entre 15 y 30 minutos';
      case 'more_than_30': return 'Más de 30 minutos';
      default: return waitingTime;
    }
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

  const getAppointmentTypeLabel = (appointmentType: string) => {
    switch (appointmentType) {
      case 'presencial': return 'Presencial';
      case 'telematica': return 'Telemática';
      default: return appointmentType;
    }
  };

  const getRatingLabel = (rating: number, fieldType: string) => {
    switch (fieldType) {
      case 'website_design_rating':
        const websiteLabels = ['', 'Tuve dificultades, no fue fácil de usar', 'Pude usarla, pero con alguna complicación', 'Fue muy fácil e intuitiva de navegar'];
        return websiteLabels[rating] || rating.toString();
      case 'communication_clarity':
        const communicationLabels = ['', 'No fue clara ni me ayudó mucho', 'Fue adecuada, cumplió su propósito', 'Muy clara y útil, me sentí bien informado/a'];
        return communicationLabels[rating] || rating.toString();
      case 'reception_friendliness':
        const receptionLabels = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
        return receptionLabels[rating] || rating.toString();
      case 'clinic_environment':
        const environmentLabels = ['', 'Desagradable', 'No muy agradable', 'Normal', 'Agradable', 'Sí, muy agradable'];
        return environmentLabels[rating] || rating.toString();
      case 'doctor_listening':
        const listeningLabels = ['', 'No, nada fluida ni escuchado/a', 'No muy fluida', 'Normal', 'Sí, fluida', 'Sí, muy fluida y escuchado/a'];
        return listeningLabels[rating] || rating.toString();
      case 'explanation_clarity':
        const clarityLabels = ['', 'No, nada claras', 'No muy claras', 'Normal', 'Sí, claras', 'Sí, muy claras'];
        return clarityLabels[rating] || rating.toString();
      case 'consultation_time':
        const timeLabels = ['', 'No, en absoluto', 'No', 'Normal', 'Sí', 'Sí, totalmente'];
        return timeLabels[rating] || rating.toString();
      default:
        return rating.toString();
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'redes_sociales': return 'Redes sociales';
      case 'clinica_fisioterapia': return 'Clínica de fisioterapia';
      case 'un_amigo': return 'Un amigo';
      case 'un_conocido': return 'Un conocido';
      default: return source;
    }
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

  const exportToCSV = () => {
    const headers = [
      'ID', 'Fecha', 'Tipo Cita', 'Tratamiento', 'Zona Cuerpo', 'Facilidad Web', 
      'Comunicación Previa', 'Recepción', 'Tiempo Espera', 'Ambiente', 
      'Comunicación Doctor', 'Explicación', 'Tiempo Consulta', 'NPS', 'Cómo nos conoció', 'Comentarios'
    ];

    const csvData = filteredSurveys.map(survey => [
      survey.id,
      format(new Date(survey.created_at), 'dd/MM/yyyy HH:mm'),
      getAppointmentTypeLabel(survey.appointment_type || ''),
      getTreatmentLabel(survey.treatment_type || ''),
      getBodyAreaLabel(survey.body_area || ''),
      getRatingLabel(survey.website_design_rating || 0, 'website_design_rating'),
      getRatingLabel(survey.communication_clarity || 0, 'communication_clarity'),
      getRatingLabel(survey.reception_friendliness || 0, 'reception_friendliness'),
      getWaitingTimeLabel(survey.waiting_time),
      getRatingLabel(survey.clinic_environment || 0, 'clinic_environment'),
      getRatingLabel(survey.doctor_listening || 0, 'doctor_listening'),
      getRatingLabel(survey.explanation_clarity || 0, 'explanation_clarity'),
      getRatingLabel(survey.consultation_time || 0, 'consultation_time'),
      survey.nps_score,
      getSourceLabel(survey.how_did_you_know_us || ''),
      survey.additional_comments || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `encuestas_satisfaccion_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV exportado",
      description: "El archivo se ha descargado correctamente.",
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSurveys = filteredSurveys.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando encuestas...</p>
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
              <TableIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Tabla de Respuestas</h1>
              <p className="text-blue-100 text-lg">
                Vista detallada de todas las encuestas de satisfacción
              </p>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
        </div>
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
                <span className="text-xl font-bold">Filtros de Búsqueda</span>
                <p className="text-sm font-normal text-gray-600 mt-1">Filtra las encuestas por términos de búsqueda, puntuación NPS o rango de fechas</p>
              </div>
            </CardTitle>
          </CardHeader>
        </div>
        <CardContent className="p-8 bg-gradient-to-b from-white to-violet-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID o comentarios..."
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

            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Desde'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Hasta'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
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
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo Cita</TableHead>
              <TableHead>Tratamiento</TableHead>
              <TableHead>Zona Cuerpo</TableHead>
              <TableHead>Facilidad Web</TableHead>
              <TableHead>Comunicación</TableHead>
              <TableHead>Recepción</TableHead>
              <TableHead>T. Espera</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Explicación</TableHead>
              <TableHead>T. Consulta</TableHead>
              <TableHead>NPS</TableHead>
              <TableHead>Cómo nos conoció</TableHead>
              <TableHead>Comentarios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSurveys.map((survey) => (
              <TableRow key={survey.id}>
                <TableCell className="font-medium">
                  {format(new Date(survey.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>{getAppointmentTypeLabel(survey.appointment_type || '')}</TableCell>
                <TableCell>{getTreatmentLabel(survey.treatment_type || '')}</TableCell>
                <TableCell>{getBodyAreaLabel(survey.body_area || '')}</TableCell>
                <TableCell>{getRatingLabel(survey.website_design_rating || 0, 'website_design_rating')}</TableCell>
                <TableCell>{getRatingLabel(survey.communication_clarity || 0, 'communication_clarity')}</TableCell>
                <TableCell>{getRatingLabel(survey.reception_friendliness || 0, 'reception_friendliness')}</TableCell>
                <TableCell>{getWaitingTimeLabel(survey.waiting_time)}</TableCell>
                <TableCell>{getRatingLabel(survey.clinic_environment || 0, 'clinic_environment')}</TableCell>
                <TableCell className="max-w-32">
                  <div className="truncate" title={getRatingLabel(survey.doctor_listening || 0, 'doctor_listening')}>
                    {getRatingLabel(survey.doctor_listening || 0, 'doctor_listening')}
                  </div>
                </TableCell>
                <TableCell>{getRatingLabel(survey.explanation_clarity || 0, 'explanation_clarity')}</TableCell>
                <TableCell>{getRatingLabel(survey.consultation_time || 0, 'consultation_time')}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{survey.nps_score}/10</span>
                    {getNPSBadge(survey.nps_score)}
                  </div>
                </TableCell>
                <TableCell>{getSourceLabel(survey.how_did_you_know_us || '')}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={survey.additional_comments || 'Sin comentarios'}>
                    {survey.additional_comments || 'Sin comentarios'}
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

      {filteredSurveys.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No se encontraron encuestas que coincidan con los filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};