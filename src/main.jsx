import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Add cursor tracking for interactive background
document.addEventListener('DOMContentLoaded', () => {
  let mouseX = 50;
  let mouseY = 50;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 100;
    mouseY = (e.clientY / window.innerHeight) * 100;
    
    document.body.style.setProperty('--mouse-x', `${mouseX}%`);
    document.body.style.setProperty('--mouse-y', `${mouseY}%`);
  });

  // Set initial position
  document.body.style.setProperty('--mouse-x', '50%');
  document.body.style.setProperty('--mouse-y', '50%');
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
