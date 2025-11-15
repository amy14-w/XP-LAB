import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, Users, UserCircle, Play, Flame, Award, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/api';

const StudentProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studentData, setStudentData] = useState({
    name: 'Student',
    email: '',
    course: 'N/A',
    points: 0,
    streak: 0,
    rank: 'Bronze',
    level: 1,
    totalLessons: 0,
    completedLessons: 0,
    participationScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [questionStats, setQuestionStats] = useState({ total_correct: 0, total_answered: 0, accuracy: 0 });
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.user_id) return;
      
      try {
        setLoading(true);
        const profile = await studentsAPI.getProfile(user.user_id);
        const streaks = await studentsAPI.getStreaks(user.user_id);
        const stats = await studentsAPI.getQuestionStats(user.user_id);
        const badgesData = await studentsAPI.getBadges(user.user_id);
        
        // Get highest streak
        const maxStreak = streaks.length > 0 
          ? Math.max(...streaks.map(s => s.current_streak || 0))
          : 0;
        
        // Calculate level from points
        const level = Math.floor(profile.total_points / 100) + 1;
        
        setStudentData({
          name: user.email?.split('@')[0] || 'Student',
          email: user.email || '',
          course: 'N/A', // Could fetch enrolled classes later
          points: profile.total_points || 0,
          streak: maxStreak,
          rank: profile.rank || 'bronze',
          level: level,
          totalLessons: 0, // Would need backend endpoint for this
          completedLessons: 0, // Would need backend endpoint for this
          participationScore: stats.accuracy || 0,
        });
        
        setQuestionStats(stats);
        setBadges(badgesData.badges || []);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user]);

  const weeklyProgress = [
    { day: 'Mon', xp: 45 },
    { day: 'Tue', xp: 30 },
    { day: 'Wed', xp: 60 },
    { day: 'Thu', xp: 40 },
    { day: 'Fri', xp: 55 },
    { day: 'Sat', xp: 20 },
    { day: 'Sun', xp: 35 },
  ];

  const participationData = [
    { week: 'W1', score: 65 },
    { week: 'W2', score: 72 },
    { week: 'W3', score: 78 },
    { week: 'W4', score: 85 },
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="text-slate-300">XP</span>
            <span className="text-cyan-400">LAB</span>
          </h1>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{studentData.course}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              <span className="text-2xl font-bold">{studentData.streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-yellow-500" size={24} />
              <span className="text-xl font-semibold">{studentData.rank}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="nav-item w-full"
            >
              <BookOpen size={20} />
              <span>LEARN</span>
            </button>
            <button
              onClick={() => navigate('/student/leaderboard')}
              className="nav-item w-full"
            >
              <Trophy size={20} />
              <span>LEADERBOARD</span>
            </button>
            <button className="nav-item w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
            <button
              onClick={() => navigate('/student/profile')}
              className="nav-item nav-item-active w-full"
            >
              <UserCircle size={20} />
              <span>PROFILE</span>
            </button>
            <button className="nav-item w-full">
              <Play size={20} />
              <span>MORE</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">My Profile</h2>

            {loading && !studentData.points ? (
              <div className="text-center py-12 text-slate-400">Loading profile...</div>
            ) : (
            <>
            {/* Profile Header */}
            <div className="glass-card p-8 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-4xl font-bold">
                    {studentData.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{studentData.name}</h3>
                    <p className="text-slate-400">{studentData.email}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
                        Level {studentData.level}
                      </span>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold capitalize">
                        {studentData.rank} Rank
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Total XP</p>
                  <p className="text-4xl font-bold text-cyan-400">{studentData.points}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-cyan-400" size={24} />
                  <TrendingUp className="text-green-400" size={20} />
                </div>
                <p className="text-2xl font-bold">{questionStats.total_answered}</p>
                <p className="text-sm text-slate-400">Questions Answered</p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Flame className="text-orange-400" size={24} />
                  <span className="text-xs text-green-400">+2 this week</span>
                </div>
                <p className="text-2xl font-bold">{studentData.streak} Days</p>
                <p className="text-sm text-slate-400">Current Streak</p>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="text-yellow-400" size={24} />
                  <span className="text-xs text-green-400">Top 15%</span>
                </div>
                <p className="text-2xl font-bold">{questionStats.total_correct}</p>
                <p className="text-sm text-slate-400">Correct Answers</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Weekly XP Progress</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Bar dataKey="xp" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-4">Participation Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={participationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Badges */}
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold mb-6">Badges & Achievements</h3>
              {loading ? (
                <div className="text-center py-8 text-slate-400">Loading badges...</div>
              ) : badges.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No badges earned yet. Keep learning to unlock badges!</div>
              ) : (
              <div className="grid grid-cols-3 gap-4">
                {badges.map((badge, index) => (
                  <div
                    key={badge.badge_id || badge.student_badge_id || index}
                    className="p-4 rounded-xl border-2 transition-all bg-yellow-500/10 border-yellow-500/50"
                  >
                    <div className="text-4xl mb-2">{badge.icon_name || '🏆'}</div>
                    <h4 className="font-bold text-sm mb-1">{badge.badge_name || badge.name || 'Badge'}</h4>
                    <p className="text-xs text-slate-400">{badge.description || 'Achievement unlocked!'}</p>
                    <div className="mt-2 text-xs text-yellow-400 font-semibold">✓ Earned</div>
                  </div>
                ))}
              </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
