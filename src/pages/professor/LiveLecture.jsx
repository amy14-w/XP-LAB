import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Mic, MicOff, Users, Clock, AlertCircle, Lightbulb, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LiveLecture = () => {
  const navigate = useNavigate();
  const { lectureId } = useParams();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const students = [
    { id: 1, name: 'Sarah Chen', present: true, participated: 3, lastActive: '2 min ago' },
    { id: 2, name: 'Mike Thompson', present: true, participated: 1, lastActive: '5 min ago' },
    { id: 3, name: 'Emily Rodriguez', present: true, participated: 2, lastActive: '1 min ago' },
    { id: 4, name: 'David Park', present: true, participated: 0, lastActive: 'Never' },
    { id: 5, name: 'Lisa Wang', present: true, participated: 4, lastActive: '30 sec ago' },
    { id: 6, name: 'James Miller', present: false, participated: 0, lastActive: 'Absent' },
    { id: 7, name: 'Anna Kim', present: true, participated: 1, lastActive: '8 min ago' },
    { id: 8, name: 'Tom Bradley', present: true, participated: 0, lastActive: 'Never' },
  ];

  const mockSuggestions = [
    { id: 1, type: 'warning', message: "You've been lecturing for 12 minutes straight. Consider asking a question.", icon: AlertCircle, color: 'text-yellow-400' },
    { id: 2, type: 'tip', message: "Pacing is slightly fast. Students may need time to process.", icon: TrendingDown, color: 'text-blue-400' },
    { id: 3, type: 'activity', message: "Try a quick example: 'Can someone explain the time complexity?'", icon: Lightbulb, color: 'text-green-400' },
  ];

  useEffect(() => {
    if (isRecording) {
      const timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isRecording]);

  useEffect(() => {
    // Simulate AI suggestions appearing over time
    if (isRecording && duration % 15 === 0 && duration > 0) {
      const randomSuggestion = mockSuggestions[Math.floor(Math.random() * mockSuggestions.length)];
      setAiSuggestions(prev => {
        if (prev.length >= 3) return prev;
        if (prev.some(s => s.id === randomSuggestion.id)) return prev;
        return [...prev, { ...randomSuggestion, timestamp: duration }];
      });
    }
  }, [duration, isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStudentClick = (student) => {
    if (!student.present) return;
    const updatedStudent = {
      ...student,
      participated: student.participated + 1,
      lastActive: 'Just now'
    };
    setSelectedStudent(updatedStudent);
  };

  const endLecture = () => {
    setIsRecording(false);
    navigate(`/professor/analytics/${lectureId}`);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">
              <span className="text-slate-300">XP</span>
              <span className="text-cyan-400">LAB</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">CSC2720 - Binary Search Trees</span>
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500 rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 text-sm font-semibold">LIVE</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-lg">
              <Clock size={20} />
              <span className="font-mono font-bold">{formatTime(duration)}</span>
            </div>
            <button
              onClick={() => navigate('/professor/dashboard')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* AI Assistant Panel */}
        <div className="w-96 bg-slate-800/30 border-r border-slate-700 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">AI Assistant</h2>
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>

          {!isRecording ? (
            <div className="text-center py-12">
              <Mic className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400">Click the microphone to start the lecture</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-2">Current Metrics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Talk Time</span>
                    <span className="font-semibold">{Math.floor(duration / 60)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engagement</span>
                    <span className="font-semibold text-green-400">82%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pacing</span>
                    <span className="font-semibold text-yellow-400">Moderate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Questions Asked</span>
                    <span className="font-semibold">3</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Suggestions</h3>
                <AnimatePresence>
                  {aiSuggestions.length === 0 ? (
                    <p className="text-sm text-slate-400">Looking good! Keep going...</p>
                  ) : (
                    <div className="space-y-3">
                      {aiSuggestions.map((suggestion) => {
                        const Icon = suggestion.icon;
                        return (
                          <motion.div
                            key={suggestion.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="glass-card p-4"
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={suggestion.color} size={20} />
                              <p className="text-sm flex-1">{suggestion.message}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Quick Activities</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-all">
                    💡 Ask for examples from class
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-all">
                    🤔 Quick comprehension check
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-all">
                    👥 Think-pair-share activity
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Participation Panel */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Users size={28} />
                Student Participation
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  Present: <span className="font-bold text-green-400">{students.filter(s => s.present).length}</span> / {students.length}
                </span>
                <button className="btn-primary">
                  Random Call
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="grid grid-cols-2 gap-4">
                {students.map((student) => (
                  <motion.button
                    key={student.id}
                    whileHover={student.present ? { scale: 1.02 } : {}}
                    whileTap={student.present ? { scale: 0.98 } : {}}
                    onClick={() => handleStudentClick(student)}
                    disabled={!student.present}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      student.present
                        ? 'bg-slate-800/50 border-slate-600 hover:border-cyan-500 cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${student.present ? 'bg-green-500' : 'bg-red-500'}`} />
                        <h3 className="font-bold">{student.name}</h3>
                      </div>
                      {student.participated > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-full">
                          <CheckCircle size={14} className="text-cyan-400" />
                          <span className="text-xs font-bold text-cyan-400">{student.participated}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Last active: {student.lastActive}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {isRecording && (
              <div className="mt-8 text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={endLecture}
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-lg"
                >
                  End Lecture & View Analytics
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveLecture;
