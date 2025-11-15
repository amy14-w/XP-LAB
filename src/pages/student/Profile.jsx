import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, Users, UserCircle, Play, Flame, Award, TrendingUp, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentProfile = () => {
  const navigate = useNavigate();

  const studentData = {
    name: 'Alex Johnson',
    email: 'alex.johnson@university.edu',
    course: 'CSC2720',
    points: 1250,
    streak: 7,
    rank: 'Gold',
    level: 12,
    totalLessons: 45,
    completedLessons: 28,
    participationScore: 85,
  };

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

  const badges = [
    { id: 1, name: 'Fast Learner', icon: '🚀', description: 'Completed 5 lessons in one day', earned: true },
    { id: 2, name: 'Question Master', icon: '❓', description: 'Asked 10 questions in class', earned: true },
    { id: 3, name: 'Streak Keeper', icon: '🔥', description: '7 day learning streak', earned: true },
    { id: 4, name: 'Top Performer', icon: '⭐', description: 'Ranked in top 10%', earned: true },
    { id: 5, name: 'Perfect Score', icon: '💯', description: 'Scored 100% on a quiz', earned: false },
    { id: 6, name: 'Team Player', icon: '🤝', description: 'Helped 5 classmates', earned: false },
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
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
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
                <p className="text-2xl font-bold">{studentData.completedLessons}/{studentData.totalLessons}</p>
                <p className="text-sm text-slate-400">Lessons Completed</p>
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
                <p className="text-2xl font-bold">{studentData.participationScore}%</p>
                <p className="text-sm text-slate-400">Participation Score</p>
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
              <div className="grid grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      badge.earned
                        ? 'bg-yellow-500/10 border-yellow-500/50'
                        : 'bg-slate-800/30 border-slate-700 opacity-50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <h4 className="font-bold text-sm mb-1">{badge.name}</h4>
                    <p className="text-xs text-slate-400">{badge.description}</p>
                    {badge.earned && (
                      <div className="mt-2 text-xs text-yellow-400 font-semibold">✓ Earned</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
