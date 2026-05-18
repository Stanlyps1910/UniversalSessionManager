import { SessionProvider } from './context/SessionContext';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <SessionProvider>
      <Dashboard />
    </SessionProvider>
  );
}
