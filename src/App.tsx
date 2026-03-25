import { useState } from 'react';
import './index.css';
import Landing from './components/Landing';
import Codec from './components/Codec';

export default function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  if (view === 'landing') {
    return <Landing onStart={() => setView('app')} />;
  }

  return <Codec onBack={() => setView('landing')} />;
}
