import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, User } from 'lucide-react';

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const userData = {
      id: formData.role === 'professor' ? 'prof-1' : 'student-1',
      name: formData.name,
      email: formData.email,
    };
    
    login(userData, formData.role);
    
    if (formData.role === 'professor') {
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
          <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">I am a</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    formData.role === 'student'
                      ? 'bg-cyan-500 border-cyan-400 text-white'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  <User size={20} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'professor' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                    formData.role === 'professor'
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
              Create Account
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              Login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUp;
