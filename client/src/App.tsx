import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import VerificationPage from './pages/VerificationPage'
import { api } from './lib/api';
import { Loader2 } from 'lucide-react';

function App() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isPublicRoute = window.location.pathname.startsWith('/verify');

  useEffect(() => {
    const checkAuth = async () => {
      if (isPublicRoute) {
          setIsCheckingAuth(false);
          return;
      }
      try {
        const res = await api.get('/auth/me');
        setCurrentUser(res.data.user);
      } catch (err) {
        // Not logged in, that's fine
        console.log(err);
        console.log("No active session");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [setCurrentUser, isPublicRoute]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (isPublicRoute) {
    return <VerificationPage />;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return <Dashboard />;
}

export default App;