import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Trophy, UserCircle, MoreHorizontal, LogOut,
  Flame, Award, ChevronLeft, ChevronRight, 
  Clock, Target, Zap, CheckCircle, XCircle, Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lecturesAPI, questionsAPI, attendanceAPI, studentsAPI } from '../../services/api';

const StudentLiveLecture = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Lecture state
  const [lecture, setLecture] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [studentProfile, setStudentProfile] = useState({ total_points: 0, current_streak: 0, rank: 'bronze' });
  
  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [quizTimer, setQuizTimer] = useState(30);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [answeredQuizzes, setAnsweredQuizzes] = useState(new Set());

  // Slide content for Big O Notation lecture
  const slides = [
    {
      title: "Big O Notation",
      subtitle: "Understanding Algorithm Efficiency",
      content: [
        "📊 What is Big O?",
        "⏱️ Time Complexity",
        "💾 Space Complexity",
        "📈 Growth Rates"
      ],
      image: null
    },
    {
      title: "What is Big O Notation?",
      subtitle: "Mathematical notation describing limiting behavior",
      content: [
        "• Describes how runtime/space grows with input size",
        "• Focuses on worst-case scenarios",
        "• Ignores constants and lower-order terms",
        "• Example: O(n), O(log n), O(n²)"
      ],
      image: null
    },
    {
      title: "Common Time Complexities",
      subtitle: "From fastest to slowest",
      content: [
        "O(1) - Constant: Array access",
        "O(log n) - Logarithmic: Binary search",
        "O(n) - Linear: Simple loop",
        "O(n log n) - Linearithmic: Merge sort",
        "O(n²) - Quadratic: Nested loops",
        "O(2ⁿ) - Exponential: Recursive fibonacci"
      ],
      image: null
    },
    {
      title: "Binary Search Example",
      subtitle: "O(log n) Time Complexity",
      content: [
        "1. Start with sorted array",
        "2. Check middle element",
        "3. If target < middle, search left half",
        "4. If target > middle, search right half",
        "5. Repeat until found",
        "Each step cuts search space in half!"
      ],
      code: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`
    },
    {
      title: "Space Complexity",
      subtitle: "Memory usage of algorithms",
      content: [
        "• Measures additional memory needed",
        "• Doesn't count input size",
        "• Example: Merge sort uses O(n) extra space",
        "• Quick sort uses O(log n) stack space",
        "• In-place algorithms use O(1) space"
      ],
      image: null
    },
    {
      title: "Why Big O Matters",
      subtitle: "Real-world impact",
      content: [
        "🚀 Performance optimization",
        "💰 Cost savings (server resources)",
        "⚡ Better user experience",
        "📊 Scalability planning",
        "🎯 Algorithm selection"
      ],
      image: null
    }
  ];

  useEffect(() => {
    const fetchLectureData = async () => {
      if (!user?.user_id || !lectureId) return;
      
      try {
        // Fetch lecture details
        const lectureData = await lecturesAPI.getById(lectureId);
        setLecture(lectureData);

        // Fetch student profile for points display
        const profile = await studentsAPI.getProfile(user.user_id);
        setStudentProfile(profile);

        // Check in for attendance
        if (lectureData.lecture_code) {
          await attendanceAPI.checkIn(lectureData.lecture_code, user.user_id);
        }
      } catch (error) {
        console.error('Failed to fetch lecture data:', error);
      }
    };

    fetchLectureData();
  }, [lectureId, user]);

  // Simulate quiz being triggered by professor
  useEffect(() => {
    // Simulate receiving quiz at different slides
    const quizTriggers = {
      2: {
        question_id: 1,
        question_text: "What is the time complexity of binary search?",
        options: {
          A: "O(n)",
          B: "O(log n)",
          C: "O(n²)",
          D: "O(1)"
        },
        correct_answer: "B",
        points: 100
      },
      3: {
        question_id: 2,
        question_text: "Which notation describes the worst-case scenario?",
        options: {
          A: "Big Omega (Ω)",
          B: "Big Theta (Θ)",
          C: "Big O (O)",
          D: "Small o (o)"
        },
        correct_answer: "C",
        points: 100
      },
      4: {
        question_id: 3,
        question_text: "What is the space complexity of merge sort?",
        options: {
          A: "O(1)",
          B: "O(log n)",
          C: "O(n)",
          D: "O(n log n)"
        },
        correct_answer: "C",
        points: 100
      }
    };

    if (quizTriggers[currentSlide] && !answeredQuizzes.has(currentSlide)) {
      // Trigger quiz after 2 seconds on the slide
      const timer = setTimeout(() => {
        setActiveQuiz(quizTriggers[currentSlide]);
        setIsQuizActive(true);
        setQuizTimer(30);
        setSelectedAnswer(null);
        setQuizResult(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentSlide, answeredQuizzes]);

  // Quiz countdown timer
  useEffect(() => {
    if (isQuizActive && quizTimer > 0 && !quizResult) {
      const timer = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            handleQuizTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isQuizActive, quizTimer, quizResult]);

  const handleQuizTimeout = () => {
    setQuizResult({
      correct: false,
      message: "Time's up! ⏰",
      pointsEarned: 0
    });
    setAnsweredQuizzes(prev => new Set([...prev, currentSlide]));
    
    setTimeout(() => {
      setIsQuizActive(false);
      setActiveQuiz(null);
    }, 3000);
  };

  const handleAnswerSelect = async (answer) => {
    if (quizResult) return; // Already answered
    
    setSelectedAnswer(answer);
    const isCorrect = answer === activeQuiz.correct_answer;
    
    // Calculate points based on time remaining (bonus for speed)
    const basePoints = activeQuiz.points;
    const timeBonus = Math.floor((quizTimer / 30) * 50); // Up to 50 bonus points
    const pointsEarned = isCorrect ? basePoints + timeBonus : 0;

    setQuizResult({
      correct: isCorrect,
      message: isCorrect ? 
        `Correct! 🎉 +${pointsEarned} points` : 
        `Incorrect. The answer was ${activeQuiz.correct_answer}`,
      pointsEarned
    });

    // Update student points
    if (isCorrect) {
      setStudentProfile(prev => ({
        ...prev,
        total_points: prev.total_points + pointsEarned
      }));
    }

    setAnsweredQuizzes(prev => new Set([...prev, currentSlide]));

    // Submit answer to backend
    try {
      await questionsAPI.respond(
        activeQuiz.question_id,
        answer,
        (30 - quizTimer) * 1000,
        user.user_id
      );
    } catch (error) {
      console.error('Failed to submit quiz answer:', error);
    }

    // Close quiz after 3 seconds
    setTimeout(() => {
      setIsQuizActive(false);
      setActiveQuiz(null);
    }, 3000);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const getRankColor = (rank) => {
    const colors = {
      master: 'text-purple-400',
      diamond: 'text-cyan-400',
      platinum: 'text-gray-300',
      gold: 'text-yellow-400',
      silver: 'text-gray-400',
      bronze: 'text-orange-600'
    };
    return colors[rank?.toLowerCase()] || 'text-slate-400';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <BookOpen size={24} className="text-cyan-400" />
            </button>
            <h1 className="text-2xl font-bold">
              Live Lecture: <span className="text-cyan-400">Big O Notation</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={20} />
              <span className="text-lg font-bold">{studentProfile.current_streak || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              <span className="text-lg font-bold">{studentProfile.total_points || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className={`${getRankColor(studentProfile.rank)} size-20`} />
              <span className="text-lg font-semibold capitalize">{studentProfile.rank || 'Bronze'}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} className="text-slate-400 hover:text-white" />
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

          {/* Slide Navigator */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">LECTURE SLIDES</h3>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentSlide === index
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {index + 1}. {slide.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Slide Display */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8 relative">
            {/* Slide Content */}
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-12 max-w-4xl w-full min-h-[500px]"
            >
              <h2 className="text-5xl font-bold mb-4 text-cyan-400">
                {slides[currentSlide].title}
              </h2>
              <p className="text-2xl text-slate-400 mb-8">
                {slides[currentSlide].subtitle}
              </p>
              
              <div className="space-y-4">
                {slides[currentSlide].content.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-xl text-slate-200"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              {slides[currentSlide].code && (
                <motion.pre
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 bg-slate-900/50 p-4 rounded-lg overflow-x-auto"
                >
                  <code className="text-sm text-green-400">
                    {slides[currentSlide].code}
                  </code>
                </motion.pre>
              )}
            </motion.div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`absolute left-4 p-3 rounded-full transition-all ${
                currentSlide === 0
                  ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700/50 text-white hover:bg-slate-600/50'
              }`}
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className={`absolute right-4 p-3 rounded-full transition-all ${
                currentSlide === slides.length - 1
                  ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-700/50 text-white hover:bg-slate-600/50'
              }`}
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* Slide Progress */}
          <div className="bg-slate-800/50 border-t border-slate-700 px-8 py-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                Slide {currentSlide + 1} of {slides.length}
              </span>
              <div className="flex gap-1">
                {slides.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-cyan-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Popup */}
      <AnimatePresence>
        {isQuizActive && activeQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/50 rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
            >
              {/* Quiz Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Zap size={32} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-400">Quick Quiz!</h3>
                    <p className="text-slate-400">Answer fast for bonus points</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-orange-400" size={24} />
                  <span className="text-3xl font-bold text-orange-400">{quizTimer}s</span>
                </div>
              </div>

              {/* Question */}
              <div className="mb-6">
                <p className="text-2xl font-semibold text-white mb-4">
                  {activeQuiz.question_text}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Target size={16} />
                  <span>{activeQuiz.points} points + speed bonus</span>
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-3 mb-6">
                {Object.entries(activeQuiz.options).map(([key, value]) => (
                  <motion.button
                    key={key}
                    onClick={() => handleAnswerSelect(key)}
                    disabled={!!quizResult}
                    whileHover={{ scale: quizResult ? 1 : 1.02 }}
                    whileTap={{ scale: quizResult ? 1 : 0.98 }}
                    className={`w-full p-4 rounded-lg text-left font-medium transition-all border-2 ${
                      quizResult
                        ? key === activeQuiz.correct_answer
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : selectedAnswer === key
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-slate-700/30 border-slate-600 text-slate-500'
                        : selectedAnswer === key
                        ? 'bg-cyan-500/30 border-cyan-500 text-cyan-400'
                        : 'bg-slate-700/50 border-slate-600 text-white hover:border-cyan-500/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{key}.</span>
                        <span className="text-lg">{value}</span>
                      </div>
                      {quizResult && key === activeQuiz.correct_answer && (
                        <CheckCircle className="text-green-400" size={24} />
                      )}
                      {quizResult && selectedAnswer === key && key !== activeQuiz.correct_answer && (
                        <XCircle className="text-red-400" size={24} />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Quiz Result */}
              {quizResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    quizResult.correct
                      ? 'bg-green-500/20 border border-green-500/50'
                      : 'bg-red-500/20 border border-red-500/50'
                  }`}
                >
                  {quizResult.correct ? (
                    <Star className="text-green-400" size={32} />
                  ) : (
                    <XCircle className="text-red-400" size={32} />
                  )}
                  <div>
                    <p className={`text-xl font-bold ${
                      quizResult.correct ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {quizResult.message}
                    </p>
                    {quizResult.correct && (
                      <p className="text-sm text-slate-400">
                        Speed bonus: +{Math.floor((quizTimer / 30) * 50)} points
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentLiveLecture;
