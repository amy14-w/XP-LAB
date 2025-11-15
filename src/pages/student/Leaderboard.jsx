import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, Users, UserCircle, MoreHorizontal, Flame, Award, Medal, Crown, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/api';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUser, setCurrentUser] = useState({ rank: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user?.user_id) return;
      
      try {
        setLoading(true);
        const leaderboard = await studentsAPI.getLeaderboard(null, user.user_id);
        
        // Transform backend data to match frontend format
        const transformed = (leaderboard || []).map((student, index) => ({
          id: student.student_id,
          name: student.email?.split('@')[0] || `Student ${index + 1}`,
          points: student.total_points || 0,
          streak: student.current_streak || 0,
          rank: student.rank || 'bronze',
          avatar: student.email?.substring(0, 2).toUpperCase() || 'ST',
        })).sort((a, b) => b.points - a.points);
        
        setLeaderboardData(transformed);
        
        // Find current user's rank
        const userIndex = transformed.findIndex(s => s.id === user.user_id);
        if (userIndex >= 0) {
          setCurrentUser({ rank: userIndex + 1 });
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Fallback to empty array
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [user]);

  const leaderboardDataMock = [
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
    const rankLower = typeof rank === 'string' ? rank.toLowerCase() : rank;
    switch (rankLower) {
      case 'master': return 'from-purple-500 to-purple-700';
      case 'diamond': return 'from-cyan-300 to-blue-400';
      case 'platinum': return 'from-gray-300 to-gray-400';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-400 to-gray-500';
      case 'bronze': return 'from-orange-700 to-orange-900';
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
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={24} className="text-slate-400 hover:text-white" />
            </button>
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
            <button
              onClick={() => navigate('/student/profile')}
              className="nav-item w-full"
            >
              <UserCircle size={20} />
              <span>PROFILE</span>
            </button>
            <button className="nav-item w-full">
              <MoreHorizontal size={20} />
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

            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading leaderboard...</div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No leaderboard data available yet.</div>
            ) : (
            <>
            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
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
            )}

            {/* Full Leaderboard - Class Tracker: Top 5 + Current User Position */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold mb-4">Class Tracker</h3>
              
              {/* Top 5 Students */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Top 5</h4>
                <div className="space-y-2">
                  {leaderboardData.slice(0, 5).map((student, index) => {
                    const isCurrentUser = student.id === user?.user_id;
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
                              <span className="text-xl font-bold text-slate-400">#{index + 1}</span>
                            )}
                          </div>
                          <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(student.rank)} rounded-full flex items-center justify-center font-bold`}>
                            {student.avatar}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold">
                              {student.name}
                              {isCurrentUser && <span className="ml-2 text-cyan-400">(You)</span>}
                            </h4>
                            <p className="text-sm text-slate-400 capitalize">{student.rank}</p>
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

              {/* Current User Position (if not in top 5) */}
              {currentUser.rank > 5 && leaderboardData[currentUser.rank - 1] && (
                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Your Position</h4>
                  {(() => {
                    const student = leaderboardData[currentUser.rank - 1];
                    return (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-cyan-500/20 border-2 border-cyan-500">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 text-center">
                            <span className="text-xl font-bold text-cyan-400">#{currentUser.rank}</span>
                          </div>
                          <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(student.rank)} rounded-full flex items-center justify-center font-bold`}>
                            {student.avatar}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold">
                              {student.name}
                              <span className="ml-2 text-cyan-400">(You)</span>
                            </h4>
                            <p className="text-sm text-slate-400 capitalize">{student.rank}</p>
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
                  })()}
                  <p className="text-sm text-slate-400 mt-3 text-center">
                    {currentUser.rank - 5} {currentUser.rank - 5 === 1 ? 'place' : 'places'} below top 5
                  </p>
                </div>
              )}

              {/* Show full list button */}
              {leaderboardData.length > 5 && (
                <button 
                  className="w-full mt-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-sm font-medium"
                  onClick={() => {
                    // Toggle showing full list
                    document.getElementById('full-list')?.classList.toggle('hidden');
                  }}
                >
                  View Full Leaderboard ({leaderboardData.length} students)
                </button>
              )}
              
              {/* Full list (hidden by default) */}
              <div id="full-list" className="hidden mt-6 border-t border-slate-700 pt-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Full Rankings</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {leaderboardData.map((student, index) => {
                    const isCurrentUser = student.id === user?.user_id;
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                          isCurrentUser
                            ? 'bg-cyan-500/20 border border-cyan-500'
                            : 'bg-slate-800/20 hover:bg-slate-700/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm font-bold text-slate-400 w-8">#{index + 1}</span>
                          <div className={`w-10 h-10 bg-gradient-to-br ${getRankColor(student.rank)} rounded-full flex items-center justify-center text-sm font-bold`}>
                            {student.avatar}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {student.name}
                              {isCurrentUser && <span className="ml-2 text-cyan-400 text-xs">(You)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-cyan-400">{student.points}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rank Tiers - Updated with 6 tiers */}
            <div className="mt-8 glass-card p-6">
              <h3 className="text-xl font-bold mb-4">Rank Tiers</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-700/10 rounded-lg border border-purple-500/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full" />
                  <p className="font-bold text-sm">Master</p>
                  <p className="text-xs text-slate-400">1500+ XP</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-cyan-300/10 to-blue-400/10 rounded-lg border border-cyan-400/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-full" />
                  <p className="font-bold text-sm">Diamond</p>
                  <p className="text-xs text-slate-400">1250-1499</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-300/10 to-gray-400/10 rounded-lg border border-gray-400/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full" />
                  <p className="font-bold text-sm">Platinum</p>
                  <p className="text-xs text-slate-400">820-1249</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 rounded-lg border border-yellow-500/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full" />
                  <p className="font-bold text-sm">Gold</p>
                  <p className="text-xs text-slate-400">400-819</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-400/10 to-gray-500/10 rounded-lg border border-gray-500/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full" />
                  <p className="font-bold text-sm">Silver</p>
                  <p className="text-xs text-slate-400">150-399</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-700/10 to-orange-900/10 rounded-lg border border-orange-800/30">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-orange-700 to-orange-900 rounded-full" />
                  <p className="font-bold text-sm">Bronze</p>
                  <p className="text-xs text-slate-400">0-149</p>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
