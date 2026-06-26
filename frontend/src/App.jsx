import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import TaskPrompter from './pages/TaskPrompter'; // Renamed component
import WorkStation from './pages/WorkStation';
import AssistantWidget from './components/AssistantWidget';
import GlobalVoiceAssistant from './components/GlobalVoiceAssistant';
import DummyRegistration from './pages/DummyRegistration';
import Settings from './pages/Settings';

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return children;
};

export default function App() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
          setUserData(data.user);
          toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`, { 
            icon: '👋',
            id: 'welcome-toast' // Prevents duplicate toasts in React StrictMode
          });
        }
      } catch (error) {
        toast.error("Could not connect to the server.", { icon: '🔌', id: 'server-error-toast' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, []);

  if (isLoading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Initializing System...</div>;

  const isAuthenticated = !!userData;

  return (
    <Router>
      <Toaster 
        position="bottom-left" 
        containerStyle={{ zIndex: 9999999 }}
        toastOptions={{
          className: 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 shadow-xl',
          style: {
            borderRadius: '16px',
            padding: '12px 16px',
          },
        }} 
      />
      <AssistantWidget user={userData} />
      <GlobalVoiceAssistant isAuthenticated={isAuthenticated} />
      <div className="min-h-screen bg-neutral-50 dark:bg-[#131314] text-neutral-900 dark:text-neutral-200 font-sans transition-colors duration-500">
        <Navbar userData={userData} setUserData={setUserData} />
        <Routes>
          <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
          <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/task-prompter" replace />} />
          <Route 
            path="/task-prompter" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <TaskPrompter userData={userData} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/work-station" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <WorkStation userData={userData} />
              </ProtectedRoute>
            } 
          />
          <Route path="/dummy-registration" element={<DummyRegistration />} />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Settings userData={userData} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}