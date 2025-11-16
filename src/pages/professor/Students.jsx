import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Trophy, Award, Flame, ChevronDown, ChevronUp, BookOpen, Target, Clock, Star, Medal, LogOut, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { classesAPI, studentsAPI } from '../../services/api';

const Students = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedClass, setSelectedClass] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [sortBy, setSortBy] = useState('points'); // 'points', 'name', 'streak', 'rank'
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch classes and students
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.user_id) return;
      
      setLoading(true);
      try {
        // Fetch professor's classes
        const classesData = await classesAPI.getAll(user.user_id);
        const classesList = [
          { id: 'all', name: 'All Classes', student_count: 0 },
          ...(classesData || []).map(cls => ({ 
            id: cls.class_id, 
            name: cls.name, 
            student_count: 0 // Will be updated
          }))
        ];
        setClasses(classesList);
        
        // Fetch all students
        const allStudents = await studentsAPI.getProfessorStudents(user.user_id);
        
        // Update student counts per class
        const updatedClasses = classesList.map(cls => {
          if (cls.id === 'all') {
            return { ...cls, student_count: allStudents.length };
          }
          const classStudents = allStudents.filter(s => s.class_id === cls.id);
          return { ...cls, student_count: classStudents.length };
        });
        setClasses(updatedClasses);
        
        setStudents(allStudents || []);
      } catch (error) {
        console.error('Failed to fetch students:', error);
        setStudents([]);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Filter students based on selected class
  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students.filter(s => s.class_id === selectedClass);

  const getRankColor = (rank) => {
    const colors = {
      'Master': 'text-purple-400',
      'Diamond': 'text-cyan-400',
      'Platinum': 'text-slate-300',
      'Gold': 'text-yellow-400',
      'Silver': 'text-slate-400',
      'Bronze': 'text-orange-400',
    };
    return colors[rank] || 'text-slate-400';
  };

  const getRankDisplay = (rank) => {
    if (!rank) return 'Bronze';
    return rank.charAt(0).toUpperCase() + rank.slice(1);
  };

  const getRankBgColor = (rank) => {
    const colors = {
      'Master': 'bg-purple-500/20 border-purple-500',
      'Diamond': 'bg-cyan-500/20 border-cyan-500',
      'Platinum': 'bg-slate-500/20 border-slate-500',
      'Gold': 'bg-yellow-500/20 border-yellow-500',
      'Silver': 'bg-slate-600/20 border-slate-600',
      'Bronze': 'bg-orange-500/20 border-orange-500',
    };
    return colors[rank] || 'bg-slate-600/20 border-slate-600';
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'streak':
        return b.streak - a.streak;
      case 'rank':
        const rankOrder = { 'master': 6, 'diamond': 5, 'platinum': 4, 'gold': 3, 'silver': 2, 'bronze': 1 };
        const aRank = (a.rank || 'bronze').toLowerCase();
        const bRank = (b.rank || 'bronze').toLowerCase();
        return (rankOrder[bRank] || 0) - (rankOrder[aRank] || 0);
      default:
        return 0;
    }
  });

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
            <button
              onClick={() => navigate('/professor/dashboard')}
              className="nav-item w-full"
            >
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button
              onClick={() => navigate('/professor/reports')}
              className="nav-item w-full"
            >
              <TrendingUp size={20} />
              <span>ANALYTICS</span>
            </button>
            <button className="nav-item nav-item-active w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
            <button onClick={() => navigate('/professor/more')} className="nav-item w-full">
              <MoreHorizontal size={20} />
              <span>MORE</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Student Performance</h2>
                <p className="text-slate-400">Track and analyze student progress across all classes</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="glass-card px-4 py-2">
                  <span className="text-sm text-slate-400">Total Students: </span>
                  <span className="text-xl font-bold text-cyan-400">{filteredStudents.length}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-slate-400">Filter by Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.student_count} students)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2 text-slate-400">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    <option value="points">Points (High to Low)</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="streak">Streak (High to Low)</option>
                    <option value="rank">Rank (High to Low)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Students List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading students...</div>
            ) : sortedStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No students found{selectedClass !== 'all' ? ' in this class' : ''}.</p>
                <p className="text-sm mt-2">Students appear here after they check into a lecture.</p>
              </div>
            ) : (
            <div className="space-y-4">
              {sortedStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Student Summary */}
                  <div
                    className="p-6 cursor-pointer hover:bg-slate-700/20 transition-all"
                    onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        {/* Rank Badge */}
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-slate-600">#{index + 1}</div>
                          <div className={`px-3 py-1 rounded-lg border ${getRankBgColor(student.rank)}`}>
                            <span className={`font-bold ${getRankColor(getRankDisplay(student.rank))}`}>
                              {getRankDisplay(student.rank)}
                            </span>
                          </div>
                        </div>

                        {/* Student Info */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{student.name}</h3>
                          <p className="text-sm text-slate-400">{student.email}</p>
                          <p className="text-sm text-slate-500">{student.class_name}</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-6">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Trophy className="text-yellow-400" size={16} />
                              <p className="text-sm text-slate-400">Points</p>
                            </div>
                            <p className="text-xl font-bold text-yellow-400">{student.points}</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Flame className="text-orange-400" size={16} />
                              <p className="text-sm text-slate-400">Streak</p>
                            </div>
                            <p className="text-xl font-bold text-orange-400">{student.streak}</p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Target className="text-green-400" size={16} />
                              <p className="text-sm text-slate-400">Avg Quiz</p>
                            </div>
                            <p className={`text-xl font-bold ${getPerformanceColor(student.avg_quiz_score)}`}>
                              {student.avg_quiz_score}%
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Clock className="text-blue-400" size={16} />
                              <p className="text-sm text-slate-400">Attendance</p>
                            </div>
                            <p className={`text-xl font-bold ${getPerformanceColor(student.attendance)}`}>
                              {student.attendance}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expand Icon */}
                      <div className="ml-4">
                        {expandedStudent === student.id ? (
                          <ChevronUp className="text-cyan-400" size={24} />
                        ) : (
                          <ChevronDown className="text-slate-400" size={24} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedStudent === student.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-700"
                      >
                        <div className="p-6 bg-slate-800/30 grid grid-cols-2 gap-6">
                          {/* Badges Section */}
                          <div>
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                              <Award className="text-cyan-400" size={20} />
                              Badges Earned ({student.badges.length})
                            </h4>
                            {student.badges.length > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                {student.badges.map((badge) => (
                                  <motion.div
                                    key={badge.id}
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-2xl">{badge.icon}</span>
                                      <p className="font-semibold text-sm">{badge.name}</p>
                                    </div>
                                    <p className="text-xs text-slate-400">{badge.description}</p>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400">No badges earned yet</p>
                            )}
                          </div>

                          {/* Quiz History Section */}
                          <div>
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                              <Star className="text-cyan-400" size={20} />
                              Recent Quiz Performance
                            </h4>
                            {student.quiz_history && student.quiz_history.length > 0 ? (
                              <div className="space-y-2">
                                {student.quiz_history.map((quiz) => (
                                  <div
                                    key={quiz.id}
                                    className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-semibold text-sm">{quiz.topic}</p>
                                      <span className={`text-lg font-bold ${getPerformanceColor(quiz.score)}`}>
                                        {quiz.score}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                      {new Date(quiz.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400">No quiz history available yet.</p>
                            )}
                          </div>

                          {/* Performance Metrics */}
                          <div className="col-span-2">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                              <TrendingUp className="text-cyan-400" size={20} />
                              Performance Metrics
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-2">Participation Rate</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        student.participation_rate >= 80 ? 'bg-green-500' : 
                                        student.participation_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${student.participation_rate}%` }}
                                    />
                                  </div>
                                  <span className="text-lg font-bold">{student.participation_rate}%</span>
                                </div>
                              </div>

                              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-2">Average Quiz Score</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        student.avg_quiz_score >= 80 ? 'bg-green-500' : 
                                        student.avg_quiz_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${student.avg_quiz_score}%` }}
                                    />
                                  </div>
                                  <span className="text-lg font-bold">{student.avg_quiz_score}%</span>
                                </div>
                              </div>

                              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-2">Attendance Rate</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        student.attendance >= 80 ? 'bg-green-500' : 
                                        student.attendance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${student.attendance}%` }}
                                    />
                                  </div>
                                  <span className="text-lg font-bold">{student.attendance}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;
