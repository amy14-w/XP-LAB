import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, UserCircle, MoreHorizontal, Circle, Diamond, Flame, Award, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI } from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [studentData, setStudentData] = useState({
    name: 'Student',
    course: 'N/A',
    points: 0,
    streak: 0,
    rank: 'Bronze',
    level: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.user_id) return;
      
      try {
        setLoading(true);
        const profile = await studentsAPI.getProfile(user.user_id);
        const streaks = await studentsAPI.getStreaks(user.user_id);
        
        // Get highest streak
        const maxStreak = streaks.length > 0 
          ? Math.max(...streaks.map(s => s.current_streak || 0))
          : 0;
        
        // Calculate level from points (rough estimate: level = points / 100)
        const level = Math.floor(profile.total_points / 100) + 1;
        
        setStudentData({
          name: user.email?.split('@')[0] || 'Student',
          course: 'N/A', // Could fetch enrolled classes later
          points: profile.total_points || 0,
          streak: maxStreak,
          rank: profile.rank || 'bronze',
          level: level,
        });
      } catch (error) {
        console.error('Failed to fetch student data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [user]);

  const chapters = [
    {
      id: 1,
      title: 'Chapter 1',
      lessons: [
        { id: '1.1', title: 'Big O Notation', completed: true, type: 'lesson' },
        { id: '1.2', title: 'Arrays & Lists', completed: false, type: 'lesson' },
        { id: '1.3', title: 'Practice Quiz', completed: false, type: 'quiz' },
        { id: '1.4', title: 'Hash Tables', completed: false, type: 'lesson' },
      ]
    },
    {
      id: 2,
      title: 'Chapter 2',
      lessons: [
        { id: '2.1', title: 'Trees Introduction', completed: false, type: 'lesson' },
        { id: '2.2', title: 'Binary Search Trees', completed: false, type: 'lesson' },
        { id: '2.3', title: 'Tree Traversal', completed: false, type: 'lesson' },
        { id: '2.4', title: 'Practice Problems', completed: false, type: 'quiz' },
      ]
    },
  ];

  const LessonNode = ({ lesson, index }) => {
    const icons = {
      lesson: Circle,
      quiz: Diamond,
    };
    const Icon = icons[lesson.type] || Circle;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1 }}
        className="flex flex-col items-center relative"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedChapter(lesson)}
          className={`relative z-10 ${
            lesson.completed
              ? 'bg-pink-500 text-white'
              : 'bg-slate-600/50 text-slate-300 border-2 border-slate-500'
          } rounded-full p-6 shadow-lg transition-all hover:shadow-xl`}
        >
          <Icon size={32} />
          {lesson.completed && (
            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </motion.button>
        <span className="mt-2 text-sm text-slate-300">{lesson.id}</span>
        {index < 3 && (
          <div className="absolute top-full h-12 w-1 bg-slate-600/50" style={{ marginTop: '2rem' }} />
        )}
      </motion.div>
    );
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
              <span className="text-slate-400">{studentData.course}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              <span className="text-2xl font-bold">{studentData.streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-yellow-500" size={24} />
              <span className="text-xl font-semibold capitalize">{studentData.rank}</span>
            </div>
            {loading && (
              <div className="text-sm text-slate-400">Loading...</div>
            )}
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
              onClick={() => navigate('/student/dashboard')}
              className="nav-item nav-item-active w-full"
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
          <div className="max-w-6xl mx-auto">
            {/* Active Lectures Banner */}
            <div className="mb-8">
              <div className="glass-card p-6 border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <h3 className="text-xl font-bold text-cyan-400">Live Lecture in Progress</h3>
                    </div>
                    <p className="text-slate-300 mb-1">Big O Notation - CSC2720</p>
                    <p className="text-sm text-slate-400">Join now to earn points and maintain your streak!</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/student/lecture/1')}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all"
                  >
                    Join Lecture →
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Chapters */}
            {chapters.map((chapter) => (
              <div key={chapter.id} className="mb-16">
                <div className="text-center mb-8">
                  <div className="inline-block border-t-2 border-b-2 border-slate-600 py-2 px-12">
                    <h2 className="text-2xl text-slate-400">{chapter.title}</h2>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="space-y-8">
                    {chapter.lessons.map((lesson, index) => (
                      <LessonNode key={lesson.id} lesson={lesson} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar - Progress Cards */}
        <div className="w-80 bg-slate-800/30 border-l border-slate-700 p-6 space-y-4">
          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm text-slate-400 mb-2">Daily Goal</h3>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-cyan-500 h-3 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">13/20 XP</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm text-slate-400 mb-2">Weekly Progress</h3>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '80%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-2">4/5 lessons</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm text-slate-400 mb-3">Recent Achievements</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  🏆
                </div>
                <div className="text-xs">
                  <p className="font-semibold">Fast Learner</p>
                  <p className="text-slate-400">Completed 5 lessons</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  🔥
                </div>
                <div className="text-xs">
                  <p className="font-semibold">7 Day Streak</p>
                  <p className="text-slate-400">Keep it up!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Modal */}
      {selectedChapter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedChapter(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass-card p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedChapter.id} {selectedChapter.title}</h2>
            <p className="text-slate-300 mb-6">
              Ready to start this {selectedChapter.type === 'quiz' ? 'quiz' : 'lesson'}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedChapter(null)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Navigate to live lecture for Big O Notation (lesson 1.1)
                  if (selectedChapter.id === '1.1') {
                    navigate('/student/lecture/1');
                  } else {
                    alert('Lesson would start here!');
                  }
                  setSelectedChapter(null);
                }}
                className="flex-1 btn-accent"
              >
                Start
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default StudentDashboard;
