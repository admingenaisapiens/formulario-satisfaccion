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
        <div className="relative container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-sm shadow-lg">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">Dashboard Médico</h1>
                <p className="text-blue-100 text-sm sm:text-base lg:text-lg hidden sm:block">
                  Sistema de Análisis de Encuestas de Satisfacción
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
              <div className="text-right hidden lg:block bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <p className="text-sm font-medium text-white">{user.email}</p>
                <p className="text-xs text-blue-100">Doctor Especialista</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm text-sm"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs defaultValue="charts" className="space-y-6 sm:space-y-8">
          {/* Enhanced Tab Navigation */}
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-gray-200 shadow-2xl rounded-2xl p-2 sm:p-3 w-full max-w-2xl ring-1 ring-black/5 h-auto sm:h-16 items-center gap-1 sm:gap-0">
              <TabsTrigger 
                value="charts" 
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl h-10 sm:h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-gray-50 text-xs sm:text-sm"
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Gráficos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="treatments"
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl h-10 sm:h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-gray-50 text-xs sm:text-sm"
              >
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Tratamientos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="table"
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl h-10 sm:h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-gray-50 text-xs sm:text-sm"
              >
                <Table className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Tabla</span>
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-xl h-10 sm:h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:bg-gray-50 text-xs sm:text-sm"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Comentarios</span>
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