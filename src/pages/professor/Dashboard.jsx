import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart3, Settings, Plus, Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfessorDashboard = () => {
  const navigate = useNavigate();

  const classes = [
    {
      id: 'csc2720',
      name: 'CSC2720 - Data Structures',
      students: 45,
      nextLecture: 'Today, 2:00 PM',
      avgEngagement: 78,
    },
    {
      id: 'csc3600',
      name: 'CSC3600 - Algorithms',
      students: 32,
      nextLecture: 'Tomorrow, 10:00 AM',
      avgEngagement: 85,
    },
  ];

  const recentLectures = [
    {
      id: 1,
      class: 'CSC2720',
      topic: 'Binary Search Trees',
      date: 'Nov 13, 2025',
      duration: '50 min',
      engagement: 82,
      participation: 28,
    },
    {
      id: 2,
      class: 'CSC3600',
      topic: 'Dynamic Programming',
      date: 'Nov 12, 2025',
      duration: '55 min',
      engagement: 88,
      participation: 24,
    },
    {
      id: 3,
      class: 'CSC2720',
      topic: 'Hash Tables',
      date: 'Nov 11, 2025',
      duration: '48 min',
      engagement: 75,
      participation: 22,
    },
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
          <div className="flex items-center gap-4">
            <span className="text-slate-300">Dr. Smith</span>
            <Settings className="text-slate-400 cursor-pointer hover:text-white transition-colors" />
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
                className="btn-accent flex items-center gap-2"
              >
                <Plus size={20} />
                New Class
              </motion.button>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              {classes.map((cls) => (
                <motion.div
                  key={cls.id}
                  whileHover={{ scale: 1.02 }}
                  className="glass-card p-6 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
                      <p className="text-sm text-slate-400">{cls.students} students enrolled</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      cls.avgEngagement >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {cls.avgEngagement}% engagement
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 mb-4">
                    <Clock size={16} />
                    <span className="text-sm">Next: {cls.nextLecture}</span>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/professor/lecture/${cls.id}`)}
                      className="flex-1 btn-accent flex items-center justify-center gap-2 py-2"
                    >
                      <Play size={18} />
                      Start Lecture
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/professor/analytics/${cls.id}`)}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 py-2"
                    >
                      <BarChart3 size={18} />
                      Analytics
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Lectures */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
