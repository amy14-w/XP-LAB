const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('access_token');
};

// Set token in localStorage
const setToken = (token) => {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: async (email, password, role) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    return data;
  },
  
  login: async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      setToken(data.access_token);
    }
    return data;
  },
  
  getMe: async () => {
    const token = getToken();
    if (!token) throw new Error('No token available');
    
    const data = await apiRequest(`/auth/me?token=${encodeURIComponent(token)}`);
    return data;
  },
  
  logout: () => {
    setToken(null);
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
  },
};

// Classes API
export const classesAPI = {
  getAll: async (professorId) => {
    return await apiRequest(`/classes?professor_id=${professorId}`);
  },
  
  getById: async (classId) => {
    return await apiRequest(`/classes/${classId}`);
  },
  
  create: async (name, professorId) => {
    return await apiRequest(`/classes?professor_id=${professorId}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  delete: async (classId, professorId) => {
    return await apiRequest(`/classes/${classId}?professor_id=${professorId}`, {
      method: 'DELETE',
    });
  },
};

// Lectures API
export const lecturesAPI = {
  getAll: async (classId) => {
    // Note: Backend doesn't have getAll endpoint, need to add or use class_id filter
    return await apiRequest(`/lectures?class_id=${classId}`);
  },
  
  getById: async (lectureId) => {
    return await apiRequest(`/lectures/${lectureId}`);
  },
  
  create: async (classId) => {
    return await apiRequest('/lectures', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId }),
    });
  },
  
  start: async (lectureId) => {
    return await apiRequest(`/lectures/${lectureId}/start`, {
      method: 'POST',
    });
  },
  
  end: async (lectureId) => {
    return await apiRequest(`/lectures/${lectureId}/end`, {
      method: 'POST',
    });
  },
  
  getAttendance: async (lectureId) => {
    return await apiRequest(`/lectures/${lectureId}/attendance`);
  },
};

// Students API
export const studentsAPI = {
  getProfile: async (studentId) => {
    return await apiRequest(`/students/${studentId}/profile`);
  },
  
  getStreaks: async (studentId) => {
    return await apiRequest(`/students/${studentId}/streaks`);
  },
  
  getLeaderboard: async (classId = null, studentId = null) => {
    // Backend endpoint: /students/{student_id}/leaderboard?class_id={class_id}
    // student_id is required in path
    // class_id is optional query parameter
    const id = studentId || 'placeholder';
    const query = classId ? `?class_id=${classId}` : '';
    return await apiRequest(`/students/${id}/leaderboard${query}`);
  },
  
  getStudentClasses: async (studentId) => {
    return await apiRequest(`/students/${studentId}/classes`);
  },
  
  getQuestionStats: async (studentId) => {
    return await apiRequest(`/students/${studentId}/question-stats`);
  },
  
  getBadges: async (studentId, lectureId = null, classId = null) => {
    const params = new URLSearchParams();
    if (lectureId) params.append('lecture_id', lectureId);
    if (classId) params.append('class_id', classId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/students/${studentId}/badges${query}`);
  },
  
  getClassStudents: async (classId, professorId) => {
    return await apiRequest(`/students/class/${classId}/students?professor_id=${professorId}`);
  },
  
  getProfessorStudents: async (professorId) => {
    return await apiRequest(`/students/professor/${professorId}/students`);
  },
};

// Attendance API
export const attendanceAPI = {
  checkIn: async (lectureCode, studentId) => {
    return await apiRequest(`/attendance/check-in?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ lecture_code: lectureCode }),
    });
  },
  
  excuse: async (studentId, lectureId, professorId) => {
    return await apiRequest(`/attendance/excuse?professor_id=${professorId}`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, lecture_id: lectureId }),
    });
  },
};

// Analytics API
export const analyticsAPI = {
  getLectureAnalytics: async (lectureId, professorId) => {
    return await apiRequest(`/analytics/lectures/${lectureId}?professor_id=${professorId}`);
  },
  listReports: async (professorId) => {
    return await apiRequest(`/analytics/reports?professor_id=${professorId}`);
  },
  getReport: async (lectureId, professorId) => {
    return await apiRequest(`/analytics/reports/${lectureId}?professor_id=${professorId}`);
  },
};

// Questions API
export const questionsAPI = {
  create: async (lectureId, mode, questionData, professorId) => {
    const query = professorId ? `?professor_id=${professorId}` : '';
    return await apiRequest(`/questions${query}`, {
      method: 'POST',
      body: JSON.stringify({ lecture_id: lectureId, mode, ...questionData }),
    });
  },
  
  trigger: async (questionId) => {
    return await apiRequest(`/questions/${questionId}/trigger`, {
      method: 'POST',
    });
  },
  
  respond: async (questionId, selectedAnswer, responseTimeMs = null, studentId) => {
    return await apiRequest(`/questions/${questionId}/respond?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ 
        question_id: questionId, 
        selected_answer: selectedAnswer,
        response_time_ms: responseTimeMs,
      }),
    });
  },
  
  getResults: async (questionId) => {
    return await apiRequest(`/questions/${questionId}/results`);
  },
};

// Participation API
export const participationAPI = {
  log: async (studentId, lectureId, pointsAwarded, professorId) => {
    return await apiRequest(`/participation/log?professor_id=${professorId}`, {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        lecture_id: lectureId,
        points_awarded: pointsAwarded,
      }),
    });
  },
  
  getHistory: async (studentId) => {
    return await apiRequest(`/participation/${studentId}`);
  },
};

export { getToken, setToken };

