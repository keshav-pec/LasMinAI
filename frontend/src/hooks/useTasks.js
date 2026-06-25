import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export function useTasks(isAuthenticated = true) {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/prioritized`, { withCredentials: true });
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    const handleUpdate = () => fetchTasks();
    window.addEventListener('lasmin_tasks_updated', handleUpdate);

    if (isAuthenticated) {
      const interval = setInterval(fetchTasks, 60000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('lasmin_tasks_updated', handleUpdate);
      };
    }
    
    return () => window.removeEventListener('lasmin_tasks_updated', handleUpdate);
  }, [isAuthenticated]);

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}/status`, {
        status: newStatus
      }, { withCredentials: true });

      if (response.data.success) {
        if (newStatus === 'completed') toast.success("Task completed! Great job.");
        else toast.success("Task restored.");
      } else {
        toast.error("Failed to update task status");
        fetchTasks();
      }
    } catch (error) {
      toast.error("Failed to update task status");
      fetchTasks();
    }
  };

  return { tasks, fetchTasks, handleToggleComplete };
}
