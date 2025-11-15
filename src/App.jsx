import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ProfessorDashboard from './pages/professor/Dashboard';
import ProfessorLecture from './pages/professor/LiveLecture';
import ProfessorAnalytics from './pages/professor/Analytics';
import ProfessorStudents from './pages/professor/Students';
import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import StudentLiveLecture from './pages/student/LiveLecture';
import Leaderboard from './pages/student/Leaderboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          {/* Professor Routes */}
          <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="/professor/lecture/:lectureId" element={<ProfessorLecture />} />
          <Route path="/professor/analytics/:lectureId?" element={<ProfessorAnalytics />} />
          <Route path="/professor/students" element={<ProfessorStudents />} />
          
          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          <Route path="/student/lecture/:lectureId" element={<StudentLiveLecture />} />
          <Route path="/student/leaderboard" element={<Leaderboard />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
