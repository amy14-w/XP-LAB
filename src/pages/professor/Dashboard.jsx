import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart3, Settings, Plus, Play, Clock, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { classesAPI, lecturesAPI } from '../../services/api';

const ProfessorDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [recentLectures, setRecentLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.user_id) return;
      
      try {
        setLoading(true);
        const professorClasses = await classesAPI.getAll(user.user_id);
        setClasses(professorClasses || []);
        
        // For now, recent lectures are empty - would need to fetch from backend
        // This could be enhanced with a lectures endpoint that filters by professor
        setRecentLectures([]);
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !user?.user_id) return;
    
    try {
      const newClass = await classesAPI.create(newClassName.trim(), user.user_id);
      setClasses([...classes, newClass]);
      setShowNewClassModal(false);
      setNewClassName('');
    } catch (error) {
      console.error('Failed to create class:', error);
      alert('Failed to create class. Please try again.');
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="text-slate-300">XP</span>
            <span className="text-cyan-400">LAB</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{user?.email?.split('@')[0] || 'Professor'}</span>
            <Settings className="text-slate-400 cursor-pointer hover:text-white transition-colors" />
            <button
              onClick={logout}
              className="text-slate-400 hover:text-white transition-colors p-2"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button className="nav-item nav-item-active w-full">
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button
              onClick={() => navigate('/professor/analytics')}
              className="nav-item w-full"
            >
              <BarChart3 size={20} />
              <span>ANALYTICS</span>
            </button>
            <button className="nav-item w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">My Classes</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNewClassModal(true)}
                className="btn-accent flex items-center gap-2"
              >
                <Plus size={20} />
                New Class
              </motion.button>
            </div>

            {/* Classes Grid */}
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading classes...</div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-4">No classes yet. Create your first class to get started!</p>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-6 mb-12">
              {classes.map((cls) => (
                <motion.div
                  key={cls.class_id}
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-6 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
                      <p className="text-sm text-slate-400">Class ID: {cls.class_id?.substring(0, 8)}...</p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-600/30 text-slate-300">
                      Active
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 mb-4">
                    <Clock size={16} />
                    <span className="text-sm">Created: {new Date(cls.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/professor/lecture/${cls.class_id}`)}
                      className="flex-1 btn-accent flex items-center justify-center gap-2 py-2"
                    >
                      <Play size={18} />
                      Start Lecture
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/professor/analytics/${cls.class_id}`)}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-2"
                    >
                      <BarChart3 size={18} />
                      Analytics
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
            )}

            {/* Recent Lectures */}
            {recentLectures.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-2xl font-bold mb-6">Recent Lectures</h3>
                <div className="space-y-3">
                  {recentLectures.map((lecture) => (
                    <div
                      key={lecture.id}
                      className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-700/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/professor/analytics/${lecture.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-bold">{lecture.topic}</h4>
                        <p className="text-sm text-slate-400">{lecture.class} • {lecture.date}</p>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Duration</p>
                          <p className="font-semibold">{lecture.duration}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Engagement</p>
                          <p className="font-semibold text-cyan-400">{lecture.engagement}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-400">Participants</p>
                          <p className="font-semibold text-green-400">{lecture.participation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Class Modal */}
      {showNewClassModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowNewClassModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass-card p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Create New Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Class Name</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                  placeholder="e.g., CSC2720 - Data Structures"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowNewClassModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-accent"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ProfessorDashboard;
