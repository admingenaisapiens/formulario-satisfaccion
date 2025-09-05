import { SurveyForm } from '@/components/SurveyForm';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <SurveyForm />
      
      {/* Floating Doctor Login Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => navigate('/login')}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow rounded-full"
        >
          <UserCheck className="w-5 h-5 mr-2" />
          Portal Médico
        </Button>
      </div>
    </div>
  );
};

export default Index;
