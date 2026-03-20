import { useState } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  useLocation 
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Home } from '@/pages/Home';
import { Adventure } from '@/modes/Adventure';
import { SpeedRun } from '@/modes/SpeedRun';
import { ChallengeMode } from '@/modes/Challenge';
import NotFound from '@/pages/NotFound';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// 包装 Home 组件，注入导航功能
const HomePage = () => {
  const navigate = useNavigate();
  return (
    <Home 
      onNavigate={(page) => {
        const routeMap: Record<string, string> = {
          'adventure': '/adventure',
          'speedrun': '/speedrun',
          'challenge': '/challenge'
        };
        navigate(routeMap[page] || '/');
      }} 
    />
  );
};

// 包装各个模式组件，注入返回功能
const AdventurePage = () => {
  const navigate = useNavigate();
  return <Adventure onBack={() => navigate('/')} />;
};

const SpeedRunPage = () => {
  const navigate = useNavigate();
  return <SpeedRun onBack={() => navigate('/')} />;
};

const ChallengePage = () => {
  const navigate = useNavigate();
  return <ChallengeMode onBack={() => navigate('/')} />;
};

// 主应用组件
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/adventure" element={<AdventurePage />} />
            <Route path="/speedrun" element={<SpeedRunPage />} />
            <Route path="/challenge" element={<ChallengePage />} />
            {/* 兜底路由 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;