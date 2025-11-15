import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, Users, UserCircle, Play, Flame, Award, Medal, Crown } from 'lucide-react';

const Leaderboard = () => {
  const navigate = useNavigate();

  const currentUser = {
    id: 'student-1',
    name: 'Alex Johnson',
    rank: 15,
  };

  const leaderboardData = [
    { id: 1, name: 'Sarah Chen', points: 2850, streak: 21, rank: 'Platinum', avatar: 'SC' },
    { id: 2, name: 'Mike Thompson', points: 2720, streak: 18, rank: 'Platinum', avatar: 'MT' },
    { id: 3, name: 'Emily Rodriguez', points: 2590, streak: 15, rank: 'Gold', avatar: 'ER' },
    { id: 4, name: 'David Park', points: 2340, streak: 12, rank: 'Gold', avatar: 'DP' },
    { id: 5, name: 'Lisa Wang', points: 2180, streak: 14, rank: 'Gold', avatar: 'LW' },
    { id: 6, name: 'James Miller', points: 1950, streak: 10, rank: 'Silver', avatar: 'JM' },
    { id: 7, name: 'Anna Kim', points: 1820, streak: 9, rank: 'Silver', avatar: 'AK' },
    { id: 8, name: 'Tom Bradley', points: 1690, streak: 8, rank: 'Silver', avatar: 'TB' },
    { id: 9, name: 'Nina Patel', points: 1540, streak: 7, rank: 'Bronze', avatar: 'NP' },
    { id: 10, name: 'Chris Lee', points: 1420, streak: 11, rank: 'Bronze', avatar: 'CL' },
    { id: 15, name: 'Alex Johnson', points: 1250, streak: 7, rank: 'Bronze', avatar: 'AJ' },
  ];

  const getRankColor = (rank) => {
    switch (rank) {
      case 'Platinum': return 'from-gray-300 to-gray-400';
      case 'Gold': return 'from-yellow-400 to-yellow-600';
      case 'Silver': return 'from-gray-400 to-gray-500';
      case 'Bronze': return 'from-orange-700 to-orange-900';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 1: return <Crown className="text-yellow-400" size={24} />;
      case 2: return <Medal className="text-gray-400" size={24} />;
      case 3: return <Medal className="text-orange-600" size={24} />;
      default: return null;
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
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">CSC2720</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              <span className="text-2xl font-bold">7</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-yellow-500" size={24} />
              <span className="text-xl font-semibold">Bronze</span>
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
              className="nav-item nav-item-active w-full"
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
              className="nav-item w-full"
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
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="text-yellow-400" size={36} />
                Class Leaderboard
              </h2>
              <select className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option>This Week</option>
                <option>This Month</option>
                <option>All Time</option>
              </select>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8 items-end">
              {/* 2nd Place */}
              <div className="glass-card p-6 text-center">
                <div className="mb-3">
                  <Medal className="text-gray-400 mx-auto" size={32} />
                </div>
                <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-br ${getRankColor(leaderboardData[1].rank)} rounded-full flex items-center justify-center text-xl font-bold`}>
                  {leaderboardData[1].avatar}
                </div>
                <h3 className="font-bold">{leaderboardData[1].name}</h3>
                <p className="text-2xl font-bold text-cyan-400 mt-2">{leaderboardData[1].points}</p>
                <p className="text-sm text-slate-400">XP</p>
              </div>

              {/* 1st Place */}
              <div className="glass-card p-6 text-center bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/50">
                <div className="mb-3">
                  <Crown className="text-yellow-400 mx-auto" size={40} />
                </div>
                <div className={`w-20 h-20 mx-auto mb-3 bg-gradient-to-br ${getRankColor(leaderboardData[0].rank)} rounded-full flex items-center justify-center text-2xl font-bold`}>
                  {leaderboardData[0].avatar}
                </div>
                <h3 className="font-bold text-lg">{leaderboardData[0].name}</h3>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{leaderboardData[0].points}</p>
                <p className="text-sm text-slate-400">XP</p>
              </div>

              {/* 3rd Place */}
              <div className="glass-card p-6 text-center">
                <div className="mb-3">
                  <Medal className="text-orange-600 mx-auto" size={32} />
                </div>
                <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-br ${getRankColor(leaderboardData[2].rank)} rounded-full flex items-center justify-center text-xl font-bold`}>
                  {leaderboardData[2].avatar}
                </div>
                <h3 className="font-bold">{leaderboardData[2].name}</h3>
                <p className="text-2xl font-bold text-cyan-400 mt-2">{leaderboardData[2].points}</p>
                <p className="text-sm text-slate-400">XP</p>
              </div>
            </div>

            {/* Full Leaderboard */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold mb-4">Full Rankings</h3>
              <div className="space-y-2">
                {leaderboardData.map((student, index) => {
                  const isCurrentUser = student.id === currentUser.id;
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        isCurrentUser
                          ? 'bg-cyan-500/20 border-2 border-cyan-500'
                          : 'bg-slate-800/30 hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 text-center">
                          {index < 3 ? (
                            getPositionIcon(index + 1)
                          ) : (
                            <span className="text-xl font-bold text-slate-400">#{student.id}</span>
                          )}
                        </div>
                        <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(student.rank)} rounded-full flex items-center justify-center font-bold`}>
                          {student.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{student.name}</h4>
                          <p className="text-sm text-slate-400">{student.rank}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                          <Flame className="text-orange-400" size={20} />
                          <span className="font-semibold">{student.streak}</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-2xl font-bold text-cyan-400">{student.points}</p>
                          <p className="text-xs text-slate-400">XP</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rank Tiers */}
            <div className="mt-8 glass-card p-6">
              <h3 className="text-xl font-bold mb-4">Rank Tiers</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-gray-300/10 to-gray-400/10 rounded-lg border border-gray-400/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full" />
                  <p className="font-bold">Platinum</p>
                  <p className="text-xs text-slate-400">2500+ XP</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 rounded-lg border border-yellow-500/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full" />
                  <p className="font-bold">Gold</p>
                  <p className="text-xs text-slate-400">1500-2499 XP</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-400/10 to-gray-500/10 rounded-lg border border-gray-500/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full" />
                  <p className="font-bold">Silver</p>
                  <p className="text-xs text-slate-400">800-1499 XP</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-700/10 to-orange-900/10 rounded-lg border border-orange-800/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-orange-700 to-orange-900 rounded-full" />
                  <p className="font-bold">Bronze</p>
                  <p className="text-xs text-slate-400">0-799 XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
