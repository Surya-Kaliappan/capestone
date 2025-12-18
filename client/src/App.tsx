import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import { api } from './lib/api';
import { Loader2 } from 'lucide-react';

function App() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
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
  }, [setCurrentUser]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] text-white">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }

  return <Dashboard />;
}

export default App;