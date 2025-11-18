import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Mic, MicOff, Users, Clock, AlertCircle, Lightbulb, CheckCircle, TrendingUp, TrendingDown, Volume2, Wifi, ChevronLeft, ChevronRight, Maximize2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { lecturesAPI, classesAPI, questionsAPI } from '../../services/api';

const LiveLecture = () => {
  const navigate = useNavigate();
  const { lectureId } = useParams();
  const { user, logout } = useAuth();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  // Live transcription state
  const [transcript, setTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState([]); // Array of {text, timestamp}
  
  // AI Sentiment & Tone Analysis state
  const [sentimentData, setSentimentData] = useState({
    sentiment_score: 0,
    sentiment_label: 'neutral',
    confidence: 0,
    tone_description: '',
    engagement_indicators: []
  });
  
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
  
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  
  // Sidebar state for mobile responsiveness
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Quick comprehension check state
  const [comprehensionQuestion, setComprehensionQuestion] = useState(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Default slides - Binary Search Trees
  const defaultSlides = [
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

  // System Level Programming / C slides (used when class name indicates systems)
  const systemSlides = [
    { id: 1, type: 'title', title: 'System Level Programming', subtitle: 'C, Processes, Memory, and the OS', content: 'How programs interact with hardware and the operating system' },
    { id: 2, type: 'content', title: 'Why C for Systems?', points: ['Close to the metal: control over memory and performance','Portable across architectures','Small runtime: kernels, drivers, embedded','Interop layer for many languages'], code: `#include <stdio.h>\nint main(void){\n  printf("Hello, systems!\\n");\n  return 0;\n}` },
    { id: 3, type: 'content', title: 'Memory Model (Stack vs Heap)', points: ['Stack: function frames, fast LIFO','Heap: malloc/free for dynamic lifetime','Pointers reference addresses','Beware leaks, dangling, double free'], code: `int *make_array(int n){\n  int *p=(int*)malloc(n*sizeof(int));\n  if(!p) return NULL; /* ... */\n  return p; /* caller must free */\n}` },
    { id: 4, type: 'content', title: 'Pointers & Arrays', points: ['Arrays decay to pointer to first element','Pointer arithmetic uses element size','Use const to document immutability'], code: `void fill(int *a,int n){\n  for(int i=0;i<n;i++) a[i]=i;\n}` },
    { id: 5, type: 'content', title: 'Compilation Pipeline', points: ['Preprocess → Compile → Assemble → Link','Toolchain: gcc/clang + as + ld','-O0..-O3 for optimization, -g for debug'], code: `gcc -Wall -Wextra -O2 main.c -o app\n# or stepwise\ngcc -c main.c -o main.o\ngcc main.o -o app` },
    { id: 6, type: 'content', title: 'Processes & Syscalls', points: ['Process: address space, registers, FDs','Syscalls: execve, fork, wait, read, write','FDs reference open files/pipes/sockets'], code: `#include <unistd.h>\n#include <sys/wait.h>\nint main(){\n  pid_t pid=fork();\n  if(pid==0){ execlp(\"ls\",\"ls\",\"-l\",NULL); }\n  else { wait(NULL); }\n  return 0;\n}` },
    { id: 7, type: 'content', title: 'File I/O', points: ['POSIX: open/read/write/close (fd)','stdio: fopen/fread/fwrite/fclose (FILE*)','Check return values for short IO/errors'], code: `#include <fcntl.h>\n#include <unistd.h>\nint fd=open(\"data.bin\",O_RDONLY);\nchar buf[1024];\nssize_t n=read(fd,buf,sizeof buf);\nclose(fd);` },
    { id: 8, type: 'quiz', question: 'Which region stores local variables by default?', options: ['Heap','Stack','BSS','Global segment'], correctAnswer: 1, explanation: 'Automatic (local) variables live on the stack.' },
    { id: 9, type: 'quiz', question: 'Which call replaces the current process image with a new program?', options: ['fork()','wait()','execve()','clone()'], correctAnswer: 2, explanation: 'execve() overlays current process image; fork() creates a child copy.' },
    { id: 10, type: 'content', title: 'Safety Tips', points: ['Initialize pointers; set NULL after free()','Prefer size_t for sizes/indices; validate inputs','Use ASan/UBSan, valgrind, static analyzers'] }
  ];

  // Slides state (switch based on course)
  const [slides, setSlides] = useState(defaultSlides);

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!lectureId) return;
      setStudentsLoading(true);
      try {
        const data = await lecturesAPI.getAttendance(lectureId);
        setStudents(data.students || []);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };
    
    // Fetch initially and then poll every 10 seconds
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 10000);
    
    return () => clearInterval(interval);
  }, [lectureId]);

  // Choose slide deck based on class name ("System Level Programming" → systemSlides)
  useEffect(() => {
    const chooseSlides = async () => {
      try {
        if (!lectureId) return;
        const lecture = await lecturesAPI.getById(lectureId);
        const classId = lecture?.class_id;
        if (!classId) return;
        const cls = await classesAPI.getById(classId);
        const name = (cls?.name || '').toLowerCase();
        if (name.includes('system')) {
          setSlides(systemSlides);
        } else if (name.includes('data structure')) {
          setSlides(defaultSlides);
        }
      } catch (e) {
        // keep default slides on failure
      }
    };
    chooseSlides();
  }, [lectureId]);

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
      // Setup Web Audio API for real-time PCM streaming (replaces MediaRecorder)
      // Use 16kHz sample rate (matching Whisper API requirements)
      const targetSampleRate = 16000;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: targetSampleRate
      });
      
      // Create media stream source
      const source = audioContext.createMediaStreamSource(stream);
      
      // Keep analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;
      
      // Setup WebSocket connection
      const professorId = user?.user_id;
      if (!professorId) {
        alert('You must be logged in to start recording');
        return;
      }
      const wsUrl = `ws://localhost:8000/audio/stream/${lectureId}?professor_id=${professorId}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer'; // Enable binary data support for PCM
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Received WebSocket message:', data);
          
          // Update voice metrics (from AI assistant backend)
          if (data.type === 'voice_metrics' && data.metrics) {
            console.log('✅ Updating voice metrics:', data.metrics);
            setVoiceMetrics(prev => {
              const incoming = data.metrics || {};
              const merged = { ...prev };

              // Only overwrite a field if a valid numeric value is provided.
              // If a field is missing/undefined/NaN, keep the previous value (pause at last value).
              ['clarity', 'pace', 'pitch', 'volume'].forEach(key => {
                const raw = incoming[key];
                const candidate = typeof raw === 'number' ? raw : (raw != null ? parseFloat(raw) : NaN);
                if (!Number.isNaN(candidate)) {
                  merged[key] = candidate;
                }
              });

              return merged;
            });
          }
          
          // Update live transcription
          if (data.type === 'transcript_update') {
            console.log('📝 Received transcript update:', data);
            if (data.transcript) {
              setTranscript(data.transcript);
            }
            // Add new segment to transcript segments for animation
            if (data.new_segment) {
              const newSegment = {
                text: data.new_segment,
                timestamp: data.timestamp || new Date().toISOString()
              };
              setTranscriptSegments(prev => [...prev, newSegment]);
              console.log('✅ Added transcript segment:', newSegment);
            }
          }
          
          // Update AI feedback (sentiment analysis, tone, engagement)
          if (data.type === 'ai_feedback' && data.feedback) {
            const feedback = data.feedback;
            console.log('🤖 Received AI feedback:', feedback);
            
            // Update sentiment data state (always update if feedback exists)
            setSentimentData(prev => ({
              sentiment_score: feedback.sentiment_score !== undefined ? feedback.sentiment_score : prev.sentiment_score,
              sentiment_label: feedback.sentiment || prev.sentiment_label || 'neutral',
              confidence: feedback.confidence !== undefined ? feedback.confidence : prev.confidence,
              tone_description: feedback.tone || prev.tone_description || '',
              engagement_indicators: feedback.engagement_indicators || prev.engagement_indicators || []
            }));
            console.log('✅ Updated sentiment data state');
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
      
      // Setup ScriptProcessor for real-time PCM capture (replaces MediaRecorder)
      // ScriptProcessor is deprecated but widely supported; AudioWorklet is preferred but needs separate file
      // Buffer size: 4096 samples = ~0.25 seconds at 16kHz (good balance between latency and performance)
      const bufferSize = 4096;
      const numberOfChannels = 1; // Mono audio
      
      let scriptProcessor = null;
      
      // Try to create ScriptProcessor (deprecated but widely supported)
      try {
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, numberOfChannels, numberOfChannels);
      } catch (e) {
        console.error('❌ ScriptProcessor not supported, falling back to AudioWorklet or alternative');
        alert('Your browser does not support ScriptProcessor. Please use a modern browser.');
        return;
      }
      
      // Track chunk count and buffer for batching
      let chunkCount = 0;
      let isStillRecording = true;
      const pcmBuffer = []; // Buffer to accumulate PCM data before sending
      const bufferDuration = 0.5; // Send PCM chunks every 0.5 seconds (500ms)
      const bufferSampleCount = Math.floor(targetSampleRate * bufferDuration); // Samples per buffer
      
      // Process audio data in real-time
      scriptProcessor.onaudioprocess = (event) => {
        if (!isStillRecording || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        
        try {
          // Get PCM data from input buffer (Float32Array, range -1.0 to 1.0)
          const inputBuffer = event.inputBuffer.getChannelData(0);
          
          // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767) for transmission
          // This is more efficient than sending Float32
          const int16Buffer = new Int16Array(inputBuffer.length);
          for (let i = 0; i < inputBuffer.length; i++) {
            // Clamp to [-1, 1] and convert to Int16
            const sample = Math.max(-1, Math.min(1, inputBuffer[i]));
            int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // Accumulate in buffer
          pcmBuffer.push(...Array.from(int16Buffer));
          
          // Send when buffer reaches target duration
          if (pcmBuffer.length >= bufferSampleCount) {
            chunkCount++;
            
            // Create ArrayBuffer from Int16 array
            const pcmArray = new Int16Array(pcmBuffer.splice(0, bufferSampleCount));
            const pcmBytes = pcmArray.buffer;
            
            // Send PCM data as binary with metadata
            // Use ArrayBuffer directly for binary WebSocket transmission (more efficient than base64)
            // We'll send metadata separately via JSON, then binary data
            try {
              // Send metadata first (JSON)
              ws.send(JSON.stringify({
                type: 'audio_chunk_pcm',
                sample_rate: targetSampleRate,
                samples: pcmArray.length,
                duration: pcmArray.length / targetSampleRate,
                timestamp: Date.now(),
                chunk_index: chunkCount,
                format: 'pcm_int16'
              }));
              
              // Send PCM binary data (ArrayBuffer)
              ws.send(pcmBytes);
              
              console.log(`✅ Sent PCM chunk #${chunkCount}: ${pcmArray.length} samples (${(pcmArray.length / targetSampleRate).toFixed(2)}s, ${pcmBytes.byteLength} bytes)`);
            } catch (error) {
              console.error('❌ Error sending PCM chunk:', error);
            }
          }
        } catch (error) {
          console.error('❌ Error processing audio:', error);
        }
      };
      
      // Connect source to script processor (creates audio processing graph)
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination); // Connect to destination to avoid audio routing issues
      
      // Store processor reference for cleanup
      mediaRecorderRef.current = scriptProcessor;
      
      // Cleanup function
      const stopFunction = () => {
        isStillRecording = false;
        
        // Send any remaining buffered PCM data
        if (pcmBuffer.length > 0 && ws.readyState === WebSocket.OPEN) {
          try {
            const remainingPcm = new Int16Array(pcmBuffer);
            const remainingBytes = remainingPcm.buffer;
            
            ws.send(JSON.stringify({
              type: 'audio_chunk_pcm',
              sample_rate: targetSampleRate,
              samples: remainingPcm.length,
              duration: remainingPcm.length / targetSampleRate,
              timestamp: Date.now(),
              chunk_index: chunkCount + 1,
              format: 'pcm_int16',
              is_final: true
            }));
            
            ws.send(remainingBytes);
            pcmBuffer.length = 0; // Clear buffer
            console.log(`✅ Sent final PCM chunk: ${remainingPcm.length} samples`);
          } catch (error) {
            console.error('❌ Error sending final PCM chunk:', error);
          }
        }
        
        // Disconnect audio nodes
        if (scriptProcessor) {
          try {
            scriptProcessor.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
        }
      };
      
      // Store stop function reference for cleanup
      if (!window.recordingStopFunctions) {
        window.recordingStopFunctions = {};
      }
      window.recordingStopFunctions[lectureId] = stopFunction;
      
      setIsRecording(true);
      
      console.log(`🎤 Recording started with Web Audio API (PCM streaming at ${targetSampleRate}Hz, ${bufferDuration}s chunks)`);
      
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      setMicPermission('denied');
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    // Clear recording interval if it exists
    if (window.recordingIntervals && window.recordingIntervals[lectureId]) {
      clearInterval(window.recordingIntervals[lectureId]);
      delete window.recordingIntervals[lectureId];
    }
    
    // Call stop function if it exists (for PCM cleanup)
    if (window.recordingStopFunctions && window.recordingStopFunctions[lectureId]) {
      try {
        window.recordingStopFunctions[lectureId]();
        delete window.recordingStopFunctions[lectureId];
      } catch (e) {
        console.error('Error calling stop function:', e);
      }
    }
    
    // Disconnect script processor if it exists
    if (mediaRecorderRef.current && typeof mediaRecorderRef.current.disconnect === 'function') {
      try {
        mediaRecorderRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore if already closed
      }
    }
    
    setIsRecording(false);
    setIsConnected(false);
    setAudioLevel(0);
    // Keep transcript and segments - don't clear them on stop
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // AI suggestions are now handled via WebSocket messages from backend

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

  const endLecture = async () => {
    try {
      // Stop recording first
      stopRecording();
      
      // End the lecture via API
      await lecturesAPI.end(lectureId);
      
      // Navigate to analytics page
      navigate(`/professor/analytics/${lectureId}`);
    } catch (error) {
      console.error('Failed to end lecture:', error);
      // Still navigate even if API call fails
      navigate(`/professor/analytics/${lectureId}`);
    }
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

  // Extract lecture content from slides for AI question generation
  const extractLectureContent = () => {
    // Get content from all slides up to current slide (include current)
    const slidesToUse = slides.slice(0, currentSlide + 1);
    let content = '';
    
    slidesToUse.forEach((slide, idx) => {
      if (slide.type === 'title') {
        content += `\n\nSlide ${idx + 1}: ${slide.title}\n${slide.subtitle || ''}\n${slide.content || ''}`;
      } else if (slide.type === 'content') {
        content += `\n\nSlide ${idx + 1}: ${slide.title || ''}`;
        if (slide.points) {
          content += '\n' + slide.points.join('\n');
        }
        if (slide.code) {
          content += '\n\nCode:\n' + slide.code;
        }
      } else if (slide.type === 'quiz') {
        content += `\n\nSlide ${idx + 1}: Quiz Question\n${slide.question}`;
      }
    });
    
    return content.trim();
  };

  // Handle quick comprehension check button click
  const handleQuickComprehensionCheck = async () => {
    // Prevent multiple simultaneous questions
    if (isGeneratingQuestion || comprehensionQuestion) {
      console.log('Question already active, please wait...');
      return;
    }

    if (!lectureId || !user?.user_id) {
      console.error('Missing lecture ID or user ID');
      return;
    }

    setIsGeneratingQuestion(true);

    try {
      // Extract lecture content from slides
      const lectureContent = extractLectureContent();
      
      if (!lectureContent || lectureContent.length < 50) {
        alert('Not enough lecture content available. Please ensure you have slides loaded.');
        setIsGeneratingQuestion(false);
        return;
      }

      // Call API to generate question using AI (mode: 'ai_full')
      // Include slide content so GPT can generate questions relevant to the PowerPoint material
      const question = await questionsAPI.create(
        lectureId,
        'ai_full',
        {
          slide_content: lectureContent  // Send extracted slide content for context
        },
        user.user_id
      );

      // Set the question and show modal
      setComprehensionQuestion(question);
      setShowQuestionModal(true);
    } catch (error) {
      console.error('Failed to generate comprehension check:', error);
      alert('Failed to generate question. Please try again.');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Close question modal
  const closeQuestionModal = () => {
    setShowQuestionModal(false);
    setComprehensionQuestion(null);
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Toggle AI Assistant"
            >
              <Lightbulb size={20} className="text-cyan-400" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold">
              <span className="text-slate-300">XP</span>
              <span className="text-cyan-400">LAB</span>
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-slate-400 text-sm md:text-base">Live Lecture</span>
              {isRecording && (
                <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-red-500/20 border border-red-500 rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 text-xs md:text-sm font-semibold">LIVE</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2 text-base md:text-lg">
              <Clock size={18} className="md:w-5 md:h-5" />
              <span className="font-mono font-bold text-sm md:text-base">{formatTime(duration)}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={18} className="md:w-5 md:h-5 text-slate-400 hover:text-white" />
            </button>
            <button
              onClick={() => navigate('/professor/dashboard')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)] relative">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          />
        )}

        {/* AI Assistant Panel - Responsive Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed md:relative z-40
          w-80 md:w-96 lg:w-[28rem]
          h-full md:h-auto
          bg-slate-800/30 backdrop-blur-sm
          border-r border-slate-700
          p-4 md:p-6
          overflow-y-auto
          transition-transform duration-300 ease-in-out
          shadow-lg md:shadow-none
        `}>
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors z-50"
            title="Close sidebar"
          >
            <X size={20} className="text-slate-400" />
          </button>
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
                <h3 className="text-sm font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Real-Time Voice Quality
                </h3>
                <div className="space-y-4">
                  {/* Clarity */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-300 font-medium flex items-center gap-2">
                        <CheckCircle size={14} />
                        Clarity
                      </span>
                      <span className={`font-bold text-lg ${getMetricColor(voiceMetrics.clarity)}`}>
                        {voiceMetrics.clarity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden relative">
                      <motion.div
                        className={`h-full ${getMetricColor(voiceMetrics.clarity).replace('text-', 'bg-').replace('400', '500')}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${voiceMetrics.clarity}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {voiceMetrics.clarity < 40 ? 'Many filler words' : voiceMetrics.clarity < 70 ? 'Some filler words' : 'Clear speech'}
                    </p>
                  </div>

                  {/* Pace */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-300 font-medium flex items-center gap-2">
                        <Clock size={14} />
                        Pace
                      </span>
                      <span className={`font-bold text-lg ${getMetricColor(voiceMetrics.pace)}`}>
                        {voiceMetrics.pace.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden relative">
                      <motion.div
                        className={`h-full ${getMetricColor(voiceMetrics.pace).replace('text-', 'bg-').replace('400', '500')}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${voiceMetrics.pace}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {voiceMetrics.pace < 40 ? 'Too slow/fast' : voiceMetrics.pace < 70 ? 'Good pace' : 'Optimal speaking rate'}
                    </p>
                  </div>

                  {/* Pitch Variation */}
                  <div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-slate-300 font-medium flex items-center gap-2">
                        <TrendingUp size={14} />
                        Pitch Variation
                      </span>
                      <span className={`font-bold text-lg ${getMetricColor(voiceMetrics.pitch)}`}>
                        {voiceMetrics.pitch.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden relative">
                      <motion.div
                        className={`h-full ${getMetricColor(voiceMetrics.pitch).replace('text-', 'bg-').replace('400', '500')}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${voiceMetrics.pitch}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {voiceMetrics.pitch < 40 ? 'Monotone delivery' : voiceMetrics.pitch < 70 ? 'Some variation' : 'Engaging pitch variation'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Metrics */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Lecture Statistics
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Talk Time</span>
                    <span className="font-bold text-cyan-400">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Audio Chunks Processed</span>
                    <span className="font-bold">{Math.floor(duration / 2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Students Present</span>
                    <span className="font-bold text-green-400">{students.filter(s => s.present).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Participation</span>
                    <span className="font-bold text-yellow-400">
                      {students.reduce((sum, s) => sum + (s.participated || 0), 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span>{isConnected ? 'Live metrics updating' : 'Waiting for connection...'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentiment Analysis & Tone */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Lightbulb size={14} />
                    AI Sentiment Analysis
                  </h3>
                  {isConnected && sentimentData.tone_description && (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span>Active</span>
                    </div>
                  )}
                </div>
                {(sentimentData.tone_description || sentimentData.sentiment_label !== 'neutral' || sentimentData.engagement_indicators?.length > 0) ? (
                  <div className="space-y-3">
                    {/* Sentiment Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Sentiment</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold px-2 py-1 rounded ${
                          sentimentData.sentiment_label === 'positive' 
                            ? 'bg-green-500/20 text-green-400' 
                            : sentimentData.sentiment_label === 'negative'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {sentimentData.sentiment_label?.toUpperCase() || 'NEUTRAL'}
                        </span>
                        {(sentimentData.sentiment_score !== undefined && sentimentData.sentiment_score !== 0) && (
                          <span className="text-xs text-slate-500">
                            ({sentimentData.sentiment_score > 0 ? '+' : ''}{sentimentData.sentiment_score.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Tone Description */}
                    {sentimentData.tone_description && (
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Tone</span>
                        <p className="text-sm text-slate-300 italic">{sentimentData.tone_description}</p>
                      </div>
                    )}
                    
                    {/* Engagement Indicators */}
                    {sentimentData.engagement_indicators && sentimentData.engagement_indicators.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400 block mb-2">Engagement Indicators</span>
                        <div className="flex flex-wrap gap-2">
                          {sentimentData.engagement_indicators.map((indicator, idx) => (
                            <span 
                              key={idx}
                              className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20"
                            >
                              {indicator}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Confidence Score */}
                    {(sentimentData.confidence !== undefined && sentimentData.confidence > 0) && (
                      <div className="pt-2 border-t border-slate-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Confidence</span>
                          <span className="text-slate-300">{Math.round(sentimentData.confidence * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    {isConnected 
                      ? 'Sentiment analysis will appear here every 12 seconds...' 
                      : 'Start recording to see AI sentiment analysis'}
                  </p>
                )}
              </div>

              {/* Live Transcription */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Mic size={14} />
                    Live Transcription
                  </h3>
                  {isConnected && (
                    <div className="flex items-center gap-1 text-xs text-green-400">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  )}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 max-h-64 overflow-y-auto">
                  {transcriptSegments.length > 0 || transcript ? (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {transcriptSegments.map((segment, index) => (
                          <motion.div
                            key={`${segment.timestamp}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm text-slate-300 leading-relaxed"
                          >
                            <span className="text-cyan-400/70">[{new Date(segment.timestamp).toLocaleTimeString()}]</span> {segment.text}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {transcriptSegments.length === 0 && transcript && (
                        <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
                      )}
                      {transcriptSegments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500">
                            Last updated: {transcriptSegments[transcriptSegments.length - 1]?.timestamp 
                              ? new Date(transcriptSegments[transcriptSegments.length - 1].timestamp).toLocaleTimeString()
                              : 'Just now'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Total segments: {transcriptSegments.length}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500 italic mb-2">
                        {isConnected 
                          ? 'Waiting for transcription... (every 10 seconds)' 
                          : 'Start recording to see live transcription'}
                      </p>
                      {isConnected && (
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                          <div className="w-2 h-2 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          <span>Listening to audio...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>


              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Quick Activities</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-all">
                    💡 Ask for examples from class
                  </button>
                  <button 
                    onClick={handleQuickComprehensionCheck}
                    disabled={isGeneratingQuestion || !!comprehensionQuestion}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      isGeneratingQuestion || comprehensionQuestion
                        ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700/50 hover:bg-slate-600/50'
                    }`}
                  >
                    {isGeneratingQuestion ? '🔄 Generating question...' : '🤔 Quick comprehension check'}
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-all">
                    👥 Think-pair-share activity
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile sidebar toggle button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden fixed top-20 left-4 z-30 p-3 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
            title="Open AI Assistant"
          >
            <Lightbulb size={20} className="text-cyan-400" />
          </button>
        )}

        {/* Student Participation Panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
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
            </div>

            {/* Student Participation Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Users size={28} />
                  Student Participation
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">
                    Present: <span className="font-bold text-green-400">{students.filter(s => s.present).length}</span> {students.length > 0 && ` / ${students.length}`}
                  </span>
                </div>
              </div>

              <div className="glass-card p-6">
                {studentsLoading ? (
                  <div className="text-center py-12 text-slate-400">Loading attendance...</div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No students have checked in yet.</p>
                    <p className="text-sm mt-2">Students can join using the lecture code.</p>
                  </div>
                ) : (
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
                )}
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

        {/* Quick Comprehension Check Modal - Overlay */}
        <AnimatePresence>
          {showQuestionModal && comprehensionQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={closeQuestionModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-cyan-400">🤔 Quick Comprehension Check</h2>
                  <button
                    onClick={closeQuestionModal}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {comprehensionQuestion.question_text}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((optionKey, idx) => {
                      const letter = String.fromCharCode(97 + idx); // a, b, c, d
                      const optionText = comprehensionQuestion[optionKey];
                      const isCorrect = comprehensionQuestion.correct_answer === letter;
                      
                      return (
                        <div
                          key={optionKey}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isCorrect
                              ? 'bg-green-900/30 border-green-500 text-green-100'
                              : 'bg-slate-700/50 border-slate-600 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`font-bold text-lg ${
                              isCorrect ? 'text-green-400' : 'text-slate-400'
                            }`}>
                              {letter.toUpperCase()}.
                            </span>
                            <span className="flex-1">{optionText}</span>
                            {isCorrect && (
                              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                      onClick={closeQuestionModal}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default LiveLecture;
