import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import TaskPrompter from './pages/TaskPrompter'; // Renamed component

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
        const response = await fetch('http://localhost:5050/api/auth/me');
        const data = await response.json();
        if (data.authenticated) setUserData(data.user);
      } catch (error) {
        console.error("Session fetch failed.");
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
        </Routes>
      </div>
    </Router>
  );
}