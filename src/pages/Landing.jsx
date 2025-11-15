import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="mb-12">
          <motion.h1 
            className="font-black mb-6"
            style={{ 
              fontFamily: "'Orbitron', 'Rajdhani', 'Exo 2', sans-serif", 
              letterSpacing: '0.05em',
              fontSize: '144px'
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-slate-400 text-xl tracking-wide"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            AI-Powered Lecture Assistant
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex gap-6 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="btn-primary text-lg px-8 py-4"
          >
            Login
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/signup')}
            className="btn-primary text-lg px-8 py-4"
          >
            Sign Up
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Landing;
