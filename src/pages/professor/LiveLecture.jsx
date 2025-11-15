import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Mic, MicOff, Users, Clock, AlertCircle, Lightbulb, CheckCircle, TrendingUp, TrendingDown, Volume2, Wifi, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const LiveLecture = () => {
  const navigate = useNavigate();
  const { lectureId } = useParams();
  const { user } = useAuth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  // Microphone & WebSocket state
  const [micPermission, setMicPermission] = useState('pending'); // 'pending', 'granted', 'denied'
  const [voiceMetrics, setVoiceMetrics] = useState({
    volume: 0,
    clarity: 0,
    pace: 0,
    pitch: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // PowerPoint state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  
  // Refs for audio processing
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

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

  // PowerPoint slides - Binary Search Trees
  const slides = [
    {
      id: 1,
      type: 'title',
      title: 'Binary Search Trees (BST)',
      subtitle: 'Data Structures & Algorithms',
      content: 'An efficient hierarchical data structure for organizing sorted data'
    },
    {
      id: 2,
      type: 'content',
      title: 'What is a Binary Search Tree?',
      points: [
        'A binary tree where each node has at most 2 children',
        'Left subtree contains only nodes with keys less than parent',
        'Right subtree contains only nodes with keys greater than parent',
        'Both left and right subtrees must also be BSTs',
        'No duplicate nodes allowed'
      ],
      code: `class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}`
    },
    {
      id: 3,
      type: 'quiz',
      question: 'Which property MUST be true for a Binary Search Tree?',
      options: [
        'All nodes must have exactly 2 children',
        'Left child < Parent < Right child',
        'The tree must be balanced',
        'Duplicate values are allowed'
      ],
      correctAnswer: 1,
      explanation: 'In a BST, all values in the left subtree must be less than the parent, and all values in the right subtree must be greater than the parent.'
    },
    {
      id: 4,
      type: 'content',
      title: 'BST Operations - Search',
      points: [
        'Start at the root node',
        'If target equals current node, found!',
        'If target < current, go left',
        'If target > current, go right',
        'Repeat until found or reach null'
      ],
      code: `search(root, target) {
  if (root === null || root.value === target)
    return root;
    
  if (target < root.value)
    return search(root.left, target);
  else
    return search(root.right, target);
}`
    },
    {
      id: 5,
      type: 'content',
      title: 'BST Operations - Insertion',
      points: [
        'Always insert as a leaf node',
        'Start from root and compare values',
        'Go left if new value is smaller',
        'Go right if new value is larger',
        'Insert when you reach a null position'
      ],
      code: `insert(root, value) {
  if (root === null)
    return new Node(value);
    
  if (value < root.value)
    root.left = insert(root.left, value);
  else if (value > root.value)
    root.right = insert(root.right, value);
    
  return root;
}`
    },
    {
      id: 6,
      type: 'quiz',
      question: 'What is the time complexity of searching in a balanced BST?',
      options: [
        'O(n)',
        'O(log n)',
        'O(n²)',
        'O(1)'
      ],
      correctAnswer: 1,
      explanation: 'In a balanced BST, we eliminate half the remaining nodes with each comparison, giving us O(log n) time complexity.'
    },
    {
      id: 7,
      type: 'content',
      title: 'BST Traversals',
      points: [
        'Inorder (Left → Root → Right) - gives sorted order',
        'Preorder (Root → Left → Right) - useful for copying tree',
        'Postorder (Left → Right → Root) - useful for deletion',
        'Level-order (breadth-first) - uses queue'
      ],
      code: `inorder(root) {
  if (root !== null) {
    inorder(root.left);
    console.log(root.value);
    inorder(root.right);
  }
}`
    },
    {
      id: 8,
      type: 'quiz',
      question: 'Given BST with root 50, which traversal produces: 30, 40, 50, 60, 70?',
      options: [
        'Preorder',
        'Inorder',
        'Postorder',
        'Level-order'
      ],
      correctAnswer: 1,
      explanation: 'Inorder traversal (Left → Root → Right) of a BST always produces values in sorted ascending order.'
    },
    {
      id: 9,
      type: 'content',
      title: 'BST Advantages & Disadvantages',
      points: [
        '✅ Fast search, insert, delete: O(log n) average',
        '✅ Maintains sorted order automatically',
        '✅ Simple to implement',
        '❌ Can degrade to O(n) if unbalanced',
        '❌ No O(1) operations like hash tables',
        '💡 Solution: Use self-balancing BSTs (AVL, Red-Black)'
      ]
    },
    {
      id: 10,
      type: 'quiz',
      question: 'What happens to BST performance in the worst case (completely unbalanced)?',
      options: [
        'Still O(log n)',
        'Becomes O(n) like a linked list',
        'Becomes O(n²)',
        'Becomes O(1)'
      ],
      correctAnswer: 1,
      explanation: 'In the worst case (e.g., inserting sorted data), a BST degrades into a linked list with O(n) operations. This is why balanced BSTs exist!'
    }
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

  // Request microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      // Cleanup on unmount
      stopRecording();
    };
  }, []);

  // Audio level visualization
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      const updateAudioLevel = () => {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        
        if (isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
    }
  }, [isRecording]);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      setMicPermission(result.state);
      
      result.addEventListener('change', () => {
        setMicPermission(result.state);
      });
    } catch (error) {
      console.log('Permission API not supported, will request on record');
      setMicPermission('prompt');
    }
  };

  // Start recording and WebSocket connection
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      setMicPermission('granted');
      
      // Setup audio context for visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Setup MediaRecorder for 2-second chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Setup WebSocket connection
      const professorId = user?.user_id || 'demo-professor';
      const wsUrl = `ws://localhost:8000/audio/stream/${lectureId}?professor_id=${professorId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Received metrics:', data);
          
          // Update voice metrics
          if (data.metrics) {
            setVoiceMetrics(data.metrics);
          }
          
          // Update AI suggestions
          if (data.suggestion) {
            setAiSuggestions(prev => [...prev, {
              id: Date.now(),
              type: data.suggestion.type || 'tip',
              message: data.suggestion.message,
              icon: data.suggestion.type === 'warning' ? AlertCircle : Lightbulb,
              color: data.suggestion.type === 'warning' ? 'text-yellow-400' : 'text-blue-400',
              timestamp: duration
            }]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
      };
      
      // Handle audio data - send 2-second chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          // Convert blob to base64 for sending over WebSocket
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              data: base64Audio,
              timestamp: Date.now()
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      // Start recording with 2-second chunks (timeslice)
      mediaRecorder.start(2000); // 2000ms = 2 seconds
      setIsRecording(true);
      
      console.log('🎤 Recording started with 2-second chunks');
      
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      setMicPermission('denied');
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setIsConnected(false);
    setAudioLevel(0);
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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
    stopRecording();
    navigate(`/professor/analytics/${lectureId}`);
  };

  // PowerPoint handlers
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

  const handleQuizAnswer = (slideId, answerIndex) => {
    setQuizAnswers(prev => ({
      ...prev,
      [slideId]: answerIndex
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Get volume bar color based on level
  const getVolumeColor = (level) => {
    if (level < 30) return 'bg-slate-600';
    if (level < 60) return 'bg-green-500';
    if (level < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get metric color
  const getMetricColor = (value) => {
    if (value < 40) return 'text-red-400';
    if (value < 70) return 'text-yellow-400';
    return 'text-green-400';
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
            <div className="flex items-center gap-2">
              {/* Connection status */}
              {isRecording && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  <Wifi size={12} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              )}
              
              {/* Microphone button */}
              <button
                onClick={toggleRecording}
                disabled={micPermission === 'denied'}
                className={`p-3 rounded-full transition-all relative ${
                  micPermission === 'denied' 
                    ? 'bg-slate-600 cursor-not-allowed opacity-50'
                    : isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
                title={micPermission === 'denied' ? 'Microphone access denied' : isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </button>
            </div>
          </div>

          {micPermission === 'denied' && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">
                ❌ Microphone access denied. Please enable microphone permissions in your browser.
              </p>
            </div>
          )}

          {!isRecording ? (
            <div className="text-center py-12">
              <Mic className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 mb-2">Click the microphone to start the lecture</p>
              <p className="text-xs text-slate-500">Audio will be analyzed in real-time via WebSocket</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Audio Level Visualization */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-cyan-400">Audio Level</h3>
                  <Volume2 size={16} className="text-cyan-400" />
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${getVolumeColor(audioLevel)}`}
                    animate={{ width: `${(audioLevel / 128) * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {audioLevel < 10 ? '🔇 Too quiet' : audioLevel < 60 ? '🔊 Good' : audioLevel < 100 ? '📢 Loud' : '⚠️ Too loud'}
                </p>
              </div>

              {/* Voice Quality Metrics */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Voice Quality Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Volume</span>
                      <span className={`font-semibold ${getMetricColor(voiceMetrics.volume)}`}>
                        {voiceMetrics.volume}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getMetricColor(voiceMetrics.volume).replace('text-', 'bg-')}`}
                        style={{ width: `${voiceMetrics.volume}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Clarity</span>
                      <span className={`font-semibold ${getMetricColor(voiceMetrics.clarity)}`}>
                        {voiceMetrics.clarity}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getMetricColor(voiceMetrics.clarity).replace('text-', 'bg-')}`}
                        style={{ width: `${voiceMetrics.clarity}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Pace</span>
                      <span className={`font-semibold ${getMetricColor(voiceMetrics.pace)}`}>
                        {voiceMetrics.pace}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getMetricColor(voiceMetrics.pace).replace('text-', 'bg-')}`}
                        style={{ width: `${voiceMetrics.pace}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Pitch Variation</span>
                      <span className={`font-semibold ${getMetricColor(voiceMetrics.pitch)}`}>
                        {voiceMetrics.pitch}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getMetricColor(voiceMetrics.pitch).replace('text-', 'bg-')}`}
                        style={{ width: `${voiceMetrics.pitch}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Metrics */}
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
                    <span className="text-slate-400">Chunks Sent</span>
                    <span className="font-semibold">{Math.floor(duration / 2)}</span>
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
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* PowerPoint Presentation */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Lecture Slides</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    Slide {currentSlide + 1} / {slides.length}
                  </span>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Toggle fullscreen"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
              </div>

              {/* Slide Content */}
              <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-8 flex flex-col' : ''}`}>
                {isFullscreen && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Binary Search Trees</h2>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                )}

                <div className={`${isFullscreen ? 'flex-1 flex items-center justify-center' : ''}`}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 ${
                        isFullscreen ? 'w-full max-w-6xl h-[80vh]' : 'min-h-[500px]'
                      } flex flex-col`}
                    >
                      {/* Title Slide */}
                      {slides[currentSlide].type === 'title' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                          <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            {slides[currentSlide].title}
                          </h1>
                          <p className="text-2xl text-slate-300">{slides[currentSlide].subtitle}</p>
                          <p className="text-xl text-slate-400 max-w-2xl">{slides[currentSlide].content}</p>
                        </div>
                      )}

                      {/* Content Slide */}
                      {slides[currentSlide].type === 'content' && (
                        <div className="flex-1 space-y-6">
                          <h2 className="text-4xl font-bold text-cyan-400">{slides[currentSlide].title}</h2>
                          <div className="space-y-4">
                            {slides[currentSlide].points.map((point, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-cyan-400 font-bold text-sm">{index + 1}</span>
                                </div>
                                <p className="text-lg text-slate-200 flex-1">{point}</p>
                              </motion.div>
                            ))}
                          </div>
                          {slides[currentSlide].code && (
                            <div className="mt-6 bg-slate-950/50 rounded-lg p-4 border border-slate-700">
                              <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                                {slides[currentSlide].code}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quiz Slide */}
                      {slides[currentSlide].type === 'quiz' && (
                        <div className="flex-1 flex flex-col justify-center space-y-8">
                          <div className="text-center">
                            <div className="inline-block px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-full mb-4">
                              <span className="text-yellow-400 font-bold">📝 Quick Quiz</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-8">
                              {slides[currentSlide].question}
                            </h2>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto w-full">
                            {slides[currentSlide].options.map((option, index) => {
                              const isSelected = quizAnswers[slides[currentSlide].id] === index;
                              const isCorrect = index === slides[currentSlide].correctAnswer;
                              const showResult = quizAnswers[slides[currentSlide].id] !== undefined;
                              
                              return (
                                <motion.button
                                  key={index}
                                  whileHover={{ scale: showResult ? 1 : 1.02 }}
                                  whileTap={{ scale: showResult ? 1 : 0.98 }}
                                  onClick={() => !showResult && handleQuizAnswer(slides[currentSlide].id, index)}
                                  disabled={showResult}
                                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    showResult
                                      ? isCorrect
                                        ? 'bg-green-500/20 border-green-500'
                                        : isSelected
                                        ? 'bg-red-500/20 border-red-500'
                                        : 'bg-slate-800/50 border-slate-600'
                                      : isSelected
                                      ? 'bg-cyan-500/20 border-cyan-500'
                                      : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      showResult
                                        ? isCorrect
                                          ? 'bg-green-500 text-white'
                                          : isSelected
                                          ? 'bg-red-500 text-white'
                                          : 'bg-slate-700 text-slate-400'
                                        : isSelected
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-slate-700 text-slate-300'
                                    }`}>
                                      {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className="text-lg flex-1">{option}</span>
                                    {showResult && isCorrect && <CheckCircle className="text-green-500" size={24} />}
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>

                          {quizAnswers[slides[currentSlide].id] !== undefined && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="max-w-3xl mx-auto w-full p-4 bg-blue-500/20 border border-blue-500 rounded-lg"
                            >
                              <p className="text-sm text-blue-300">
                                <strong>Explanation:</strong> {slides[currentSlide].explanation}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>

                  <div className="flex gap-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentSlide
                            ? 'bg-cyan-500 w-8'
                            : 'bg-slate-600 hover:bg-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Student Participation Section */}
            <div>
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
