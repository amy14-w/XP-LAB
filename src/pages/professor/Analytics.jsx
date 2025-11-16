import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Users, BarChart3, TrendingUp, Clock, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI } from '../../services/api';

const Analytics = () => {
  const navigate = useNavigate();
  const { lectureId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If no lectureId is present, treat Analytics as the entry point to reports
    // and redirect to the Reports listing page.
    if (!lectureId && user?.user_id) {
      navigate('/professor/reports');
      return;
    }
    const fetchAnalytics = async () => {
      if (!lectureId || !user?.user_id) {
        setError('Missing lecture ID or user information');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log(`📊 Fetching analytics for lecture ${lectureId} (professor: ${user.user_id})`);
        const data = await analyticsAPI.getLectureAnalytics(lectureId, user.user_id);
        console.log('✅ Analytics data received:', data);
        setAnalytics(data);
      } catch (err) {
        console.error('❌ Failed to fetch analytics:', err);
        const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load analytics';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [lectureId, user]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && !analytics)) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center glass-card p-8 max-w-md">
          <p className="text-red-400 mb-2 text-lg font-bold">Failed to load analytics</p>
          {error && (
            <p className="text-slate-400 mb-6 text-sm">{error}</p>
          )}
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/professor/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
            <button onClick={() => window.location.reload()} className="btn-accent">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safely extract data with defaults
  const topic = analytics?.topic || 'Lecture';
  const date = analytics?.date || 'N/A';
  const duration_formatted = analytics?.duration_formatted || '0 min';
  const attendance_count = analytics?.attendance_count || 0;
  const total_students = analytics?.total_students || attendance_count || 0;
  const engagement_score = analytics?.engagement_score || 0;
  const participation_rate = analytics?.participation_rate || 0;
  const talk_time_ratio = analytics?.talk_time_ratio || { professor: 68, students: 32 };
  const talk_time_distribution = analytics?.talk_time_distribution || [
    { name: 'Professor', value: 68, color: '#06B6D4' },
    { name: 'Students', value: 32, color: '#10B981' }
  ];
  const engagement_timeline = analytics?.engagement_timeline || [];

  // Get class code from topic or use default
  const classCode = topic?.split(' - ')[0] || 'CSC2720';

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="text-slate-300">XP</span>
            <span className="text-cyan-400">LAB</span>
          </h1>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate('/professor/reports')}
                      className="btn-secondary"
                    >
                      View Reports
                    </button>
                    <button
                      onClick={() => navigate('/professor/dashboard')}
                      className="btn-primary"
                    >
                      Back to Dashboard
                    </button>
                  </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button
              onClick={() => navigate('/professor/dashboard')}
              className="nav-item w-full"
            >
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button className="nav-item nav-item-active w-full">
              <BarChart3 size={20} />
              <span>ANALYTICS</span>
            </button>
            <button
              onClick={() => navigate('/professor/students')}
              className="nav-item w-full"
            >
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Lecture Header */}
            <div className="glass-card p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{topic || 'Lecture'}</h2>
                  <p className="text-slate-400">{date} • {classCode}</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Duration</p>
                    <p className="text-2xl font-bold">{duration_formatted || '0 min'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Attendance</p>
                    <p className="text-2xl font-bold text-green-400">
                      {attendance_count}/{total_students || attendance_count}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Engagement Score */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Engagement Score</h3>
                  <TrendingUp className="text-green-400" size={20} />
                </div>
                <p className="text-4xl font-bold text-cyan-400">{engagement_score || 0}%</p>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${engagement_score || 0}%` }}
                  />
                </div>
              </div>

              {/* Participation Rate */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Participation Rate</h3>
                  <MessageCircle className="text-green-400" size={20} />
                </div>
                <p className="text-4xl font-bold text-green-400">{participation_rate || 0}%</p>
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${participation_rate || 0}%` }}
                  />
                </div>
              </div>

              {/* Talk Time Ratio */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-slate-400">Talk Time Ratio</h3>
                  <Clock className="text-blue-400" size={20} />
                </div>
                <p className="text-2xl font-bold">
                  <span className="text-cyan-400">{talk_time_ratio?.professor || 68}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-green-400">{talk_time_ratio?.students || 32}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Professor / Students</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Engagement Timeline */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Engagement Timeline</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={engagement_timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF" 
                      label={{ value: 'Seconds', position: 'insideBottom', offset: -5 }}
                      tickFormatter={(value) => {
                        const seconds = parseInt(value);
                        if (seconds >= 60) {
                          const mins = Math.floor(seconds / 60);
                          const secs = seconds % 60;
                          return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                        }
                        return `${seconds}s`;
                      }}
                    />
                    <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelFormatter={(value) => {
                        const seconds = parseInt(value);
                        if (seconds >= 60) {
                          const mins = Math.floor(seconds / 60);
                          const secs = seconds % 60;
                          return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                        }
                        return `${seconds}s`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#06B6D4"
                      strokeWidth={3}
                      dot={{ fill: '#06B6D4', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Talk Time Distribution */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Talk Time Distribution</h3>
                <div className="flex items-center justify-center h-[250px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={talk_time_distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(talk_time_distribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#06B6D4'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 text-lg">
                    {((talk_time_distribution || []).slice().sort((a, b) => {
                      if (a.name === 'Professor' && b.name !== 'Professor') return -1;
                      if (b.name === 'Professor' && a.name !== 'Professor') return 1;
                      return 0;
                    })).map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || '#06B6D4' }} />
                        <span>{entry.name}: {entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;