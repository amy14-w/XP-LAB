import { useState, useEffect } from 'react';
import { X, TrendingUp, Flame, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Feedback notifications system
 * 
 * Shows notifications for:
 * - "You contributed today"
 * - "Your streak is at x days"
 * - Badge awards
 * - Points earned
 */

export default function FeedbackNotifications({ userId, classId }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, message, data = {}) => {
    const id = Date.now();
    const notification = { id, type, message, data };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(id);
    }, 5000);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Mock: Listen for events (in production, use WebSocket or polling)
  useEffect(() => {
    // Example notifications
    const checkActivity = () => {
      // These would come from API/WebSocket in production
      const mockNotifications = [
        { type: 'contribution', message: 'You contributed today!', data: { points: 15 } },
        { type: 'streak', message: 'Your streak is at 7 days', data: { streak: 7, bonus: 2 } },
      ];
      
      // Uncomment to test notifications
      // mockNotifications.forEach(n => addNotification(n.type, n.message, n.data));
    };

    checkActivity();
  }, [userId, classId]);

  const getIcon = (type) => {
    switch (type) {
      case 'contribution':
        return <TrendingUp className="w-5 h-5" />;
      case 'streak':
        return <Flame className="w-5 h-5" />;
      case 'badge':
        return <Trophy className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'contribution':
        return 'from-green-500 to-emerald-600';
      case 'streak':
        return 'from-orange-500 to-red-600';
      case 'badge':
        return 'from-yellow-500 to-amber-600';
      default:
        return 'from-blue-500 to-cyan-600';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`bg-gradient-to-r ${getColor(notification.type)} text-white p-4 rounded-lg shadow-lg`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
                
                {notification.data.points && (
                  <p className="text-sm opacity-90 mt-1">
                    +{notification.data.points} points earned
                  </p>
                )}
                
                {notification.data.streak && (
                  <p className="text-sm opacity-90 mt-1">
                    +{notification.data.bonus} bonus points
                  </p>
                )}
              </div>
              
              <button
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook to trigger notifications from anywhere in the app
export function useNotifications() {
  const [notificationFn, setNotificationFn] = useState(null);

  const showContributionNotification = (points) => {
    if (notificationFn) {
      notificationFn('contribution', 'You contributed today!', { points });
    }
  };

  const showStreakNotification = (streakDays, bonus) => {
    if (notificationFn) {
      notificationFn('streak', `Your streak is at ${streakDays} days`, { streak: streakDays, bonus });
    }
  };

  const showBadgeNotification = (badgeName) => {
    if (notificationFn) {
      notificationFn('badge', `New badge: ${badgeName}!`, {});
    }
  };

  return {
    showContributionNotification,
    showStreakNotification,
    showBadgeNotification,
    setNotificationFn
  };
}
