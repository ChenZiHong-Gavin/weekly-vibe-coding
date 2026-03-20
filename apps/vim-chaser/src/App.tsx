import { useState } from 'react';
import { Home } from '@/pages/Home';
import { Adventure } from '@/modes/Adventure';
import { SpeedRun } from '@/modes/SpeedRun';
import { ChallengeMode } from '@/modes/Challenge';

type Page = 'home' | 'adventure' | 'speedrun' | 'challenge';

function App() {
  const [page, setPage] = useState<Page>('home');

  switch (page) {
    case 'adventure':
      return <Adventure onBack={() => setPage('home')} />;
    case 'speedrun':
      return <SpeedRun onBack={() => setPage('home')} />;
    case 'challenge':
      return <ChallengeMode onBack={() => setPage('home')} />;
    default:
      return <Home onNavigate={(p) => setPage(p)} />;
  }
}

export default App;
