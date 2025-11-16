import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart3, MoreHorizontal, FileText, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI } from '../../services/api';

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const data = await analyticsAPI.listReports(user.user_id);
        setReports(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <p className="text-slate-300">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="flex h-[calc(100vh)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button onClick={() => navigate('/professor/dashboard')} className="nav-item w-full">
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button onClick={() => navigate('/professor/analytics')} className="nav-item w-full">
              <BarChart3 size={20} />
              <span>ANALYTICS</span>
            </button>
            <button onClick={() => navigate('/professor/students')} className="nav-item w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
            <button onClick={() => navigate('/professor/more')} className="nav-item w-full">
              <MoreHorizontal size={20} />
              <span>MORE</span>
            </button>
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Lecture Reports</h2>
            </div>

            <div className="glass-card p-4">
              {reports.length === 0 ? (
                <p className="text-slate-400">No saved reports yet. End a lecture to generate its report.</p>
              ) : (
                <div className="divide-y divide-slate-700">
                  {reports.map((r) => (
                    <div key={r.lecture_id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-4">
                        <FileText size={20} className="text-cyan-400" />
                        <div>
                          <p className="font-semibold">{r.topic || 'Lecture'}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Clock size={14} /> {r.duration_minutes} min</span>
                            <span className="flex items-center gap-1"><TrendingUp size={14} /> {Math.round(r.headline_engagement || 0)}%</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/professor/analytics/${r.lecture_id}`)}
                        className="btn-primary"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

