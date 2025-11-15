import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, User } from 'lucide-react';

const SignUp = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await register(formData.email, formData.password, formData.role);
      
      if (result.success) {
        // Navigate based on actual role from backend
        const userRole = result.role || formData.role;
        if (userRole === 'professor') {
          navigate('/professor/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
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
          <motion.h1 
            className="font-black mb-4"
            style={{ 
              fontFamily: "'Orbitron', 'Rajdhani', 'Exo 2', sans-serif", 
              letterSpacing: '0.05em',
              fontSize: '80px'
            }}
          >
            <motion.span 
              className="inline-block text-slate-200"
              initial={{ x: -100, opacity: 0 }}
              animate={{ 
                x: 0,
                opacity: 1,
                rotate: [0, -5, 5, -5, 0],
                scale: [1, 1.1, 0.95, 1.05, 1],
                y: [0, -10, 0, -5, 0]
              }}
              transition={{ 
                x: { duration: 0.6, delay: 0.2 },
                opacity: { duration: 0.6, delay: 0.2 },
                rotate: { duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
                scale: { duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" },
                y: { duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }
              }}
              whileHover={{ 
                scale: 1.2,
                rotate: 360,
                color: '#e2e8f0',
                transition: { duration: 0.5 }
              }}
            >
              XP
            </motion.span>
            <motion.span 
              className="text-cyan-400"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{ scale: 1.1, color: '#22d3ee' }}
            >
              LAB
            </motion.span>
          </motion.h1>
          <motion.p 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-lg tracking-wide"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            AI-Powered Lecture Assistant
          </motion.p>
        </div>

        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-8"
        >
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

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent py-3 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
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
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignUp;
