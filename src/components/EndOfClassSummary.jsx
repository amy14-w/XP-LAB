import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * End of Class Summary
 * 
 * Shows:
 * - Questions students had trouble answering
 * - Correct answers for each question
 * - Student's performance summary
 */

export default function EndOfClassSummary({ lectureId, studentId, isOpen, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && lectureId) {
      fetchSummary();
    }
  }, [isOpen, lectureId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await analyticsAPI.getLectureSummary(lectureId, studentId);
      
      // Mock data
      const mockSummary = {
        lecture_title: "Introduction to Data Structures",
        total_questions: 8,
        correct_answers: 6,
        points_earned: 40,
        streak_bonus: 3,
        total_points: 43,
        difficult_questions: [
          {
            id: "q1",
            question_text: "What is the time complexity of binary search?",
            your_answer: "O(n)",
            correct_answer: "O(log n)",
            is_correct: false,
            explanation: "Binary search divides the search space in half with each step, resulting in logarithmic time complexity."
          },
          {
            id: "q2",
            question_text: "Which data structure uses LIFO principle?",
            your_answer: "Queue",
            correct_answer: "Stack",
            is_correct: false,
            explanation: "Stack follows Last In First Out (LIFO), while Queue follows First In First Out (FIFO)."
          }
        ],
        class_average: 5.2,
        your_rank: 3,
        badges_earned: ["Hot Streak", "Fastest Answerer"]
      };
      
      setSummary(mockSummary);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm p-6 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Class Summary</h2>
              <p className="text-slate-400 text-sm mt-1">
                {loading ? 'Loading...' : summary?.lecture_title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Loading summary...
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{summary.correct_answers}/{summary.total_questions}</div>
                  <div className="text-sm text-slate-400 mt-1">Correct Answers</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">+{summary.points_earned}</div>
                  <div className="text-sm text-slate-400 mt-1">Points Earned</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-400">+{summary.streak_bonus}</div>
                  <div className="text-sm text-slate-400 mt-1">Streak Bonus</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">#{summary.your_rank}</div>
                  <div className="text-sm text-slate-400 mt-1">Class Rank</div>
                </div>
              </div>

              {/* Badges Earned */}
              {summary.badges_earned && summary.badges_earned.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="text-yellow-400" size={20} />
                    <h3 className="font-bold">Badges Earned This Class</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.badges_earned.map((badge, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-sm font-medium"
                      >
                        🏆 {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions You Missed */}
              {summary.difficult_questions && summary.difficult_questions.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="text-cyan-400" size={24} />
                    Questions to Review
                  </h3>
                  <div className="space-y-4">
                    {summary.difficult_questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="bg-slate-800/50 border border-slate-700 rounded-lg p-5"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-lg">{q.question_text}</p>
                          </div>
                        </div>

                        <div className="ml-11 space-y-3">
                          {/* Your Answer */}
                          <div className="flex items-start gap-2">
                            <XCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                              <p className="text-sm text-slate-400">Your Answer:</p>
                              <p className="text-red-400 font-medium">{q.your_answer}</p>
                            </div>
                          </div>

                          {/* Correct Answer */}
                          <div className="flex items-start gap-2">
                            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                              <p className="text-sm text-slate-400">Correct Answer:</p>
                              <p className="text-green-400 font-medium">{q.correct_answer}</p>
                            </div>
                          </div>

                          {/* Explanation */}
                          {q.explanation && (
                            <div className="bg-slate-700/50 rounded-lg p-3 mt-2">
                              <p className="text-sm text-slate-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Perfect Score */}
              {summary.correct_answers === summary.total_questions && (
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg p-6 text-center">
                  <div className="text-6xl mb-3">🎉</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Perfect Score!</h3>
                  <p className="text-slate-300">
                    You answered all {summary.total_questions} questions correctly!
                  </p>
                </div>
              )}

              {/* Class Performance */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h4 className="font-bold mb-2">Class Performance</h4>
                <p className="text-slate-400 text-sm">
                  Average score: <span className="text-white font-semibold">{summary.class_average.toFixed(1)}/{summary.total_questions}</span>
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  You scored{' '}
                  <span className={`font-semibold ${summary.correct_answers > summary.class_average ? 'text-green-400' : 'text-orange-400'}`}>
                    {summary.correct_answers > summary.class_average ? 'above' : 'at or below'}
                  </span>{' '}
                  the class average
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-bold transition-colors"
              >
                Got it, thanks!
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
