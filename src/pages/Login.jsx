import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, User } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mock login
    const userData = {
      id: role === 'professor' ? 'prof-1' : 'student-1',
      name: role === 'professor' ? 'Dr. Smith' : 'Alex Johnson',
      email: email,
    };
    
    login(userData, role);
    
    if (role === 'professor') {
      navigate('/professor/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-slate-300">XP</span>
            <span className="text-cyan-400">LAB</span>
          </h1>
          <p className="text-slate-400">AI-Powered Lecture Assistant</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Login as</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    role === 'student'
                      ? 'bg-cyan-500 border-cyan-400 text-white'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  <User size={20} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('professor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    role === 'professor'
                      ? 'bg-cyan-500 border-cyan-400 text-white'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  <GraduationCap size={20} />
                  Professor
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-accent py-3 mt-6"
            >
              Login
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
