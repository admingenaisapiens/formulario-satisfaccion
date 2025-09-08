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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">Dashboard Médico</h1>
                <p className="text-blue-100 text-lg">
                  Sistema de Análisis de Encuestas de Satisfacción
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-sm font-medium text-white">{user.email}</p>
                <p className="text-xs text-blue-100">Doctor Especialista</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="charts" className="space-y-8">
          {/* Enhanced Tab Navigation */}
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-2 max-w-2xl">
              <TabsTrigger 
                value="charts" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4" />
                Gráficos
              </TabsTrigger>
              <TabsTrigger 
                value="treatments"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Activity className="w-4 h-4" />
                Tratamientos
              </TabsTrigger>
              <TabsTrigger 
                value="table"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Table className="w-4 h-4" />
                Tabla
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <MessageSquare className="w-4 h-4" />
                Comentarios
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="charts">
            <SurveyCharts />
          </TabsContent>

          <TabsContent value="treatments">
            <TreatmentAnalytics />
          </TabsContent>

          <TabsContent value="table">
            <SurveyTable />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}