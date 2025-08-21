import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  endTime: number;
  onExpire?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    // Mise à jour immédiate
    updateTimer();

    // Mise à jour chaque seconde
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft === 0) {
    return null;
  }

  const isUrgent = timeLeft < 2 * 60 * 1000; // Moins de 2 minutes

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
      isUrgent 
        ? 'bg-red-100 border-2 border-red-300 animate-pulse' 
        : 'bg-orange-100 border-2 border-orange-300'
    }`}>
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
      <span className={`font-mono font-semibold text-sm ${
        isUrgent ? 'text-red-800' : 'text-orange-800'
      }`}>
        {formatTime(timeLeft)}
      </span>
      <span className={`text-xs font-medium ${
        isUrgent ? 'text-red-700' : 'text-orange-700'
      }`}>
        restant
      </span>
    </div>
  );
};