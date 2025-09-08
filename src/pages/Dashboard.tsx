import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { LogOut, BarChart3, Table, MessageSquare, Activity } from 'lucide-react';
import { SurveyTable } from '@/components/dashboard/SurveyTable';
import { SurveyCharts } from '@/components/dashboard/SurveyCharts';
import { CommentsSection } from '@/components/dashboard/CommentsSection';
import { TreatmentAnalytics } from '@/components/dashboard/TreatmentAnalytics';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user && !isLoading) {
          navigate('/login');
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/login');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, isLoading]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar sesión.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dashboard Médico</h1>
              <p className="text-sm text-muted-foreground">
                Encuestas de Satisfacción de Pacientes
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">Doctor</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="charts" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Tratamientos
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center">
              <Table className="w-4 h-4 mr-2" />
              Tabla
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Comentarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Resultados</CardTitle>
                <CardDescription>
                  Visualización gráfica de las respuestas de satisfacción de pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SurveyCharts />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-6">
            <TreatmentAnalytics />
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tabla de Respuestas</CardTitle>
                <CardDescription>
                  Vista detallada de todas las encuestas de satisfacción
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SurveyTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comentarios de Pacientes</CardTitle>
                <CardDescription>
                  Feedback adicional y sugerencias de los pacientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommentsSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}