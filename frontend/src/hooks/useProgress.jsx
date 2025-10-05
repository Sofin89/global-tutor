import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useProgress = (userId) => {
  const [progress, setProgress] = useLocalStorage(`progress-${userId}`, {
    testsTaken: 0,
    averageScore: 0,
    totalStudyTime: 0,
    topicsMastered: 0,
    streak: 0,
    lastActivity: null
  });

  const [recentActivities, setRecentActivities] = useLocalStorage(`activities-${userId}`, []);

  const updateProgress = (newData) => {
    setProgress(prev => ({
      ...prev,
      ...newData,
      lastActivity: new Date().toISOString()
    }));
  };

  const addTestResult = (score, topic, timeSpent) => {
    const newTest = {
      id: Date.now(),
      type: 'test',
      score,
      topic,
      timeSpent,
      date: new Date().toISOString()
    };

    setRecentActivities(prev => [newTest, ...prev.slice(0, 9)]);
    
    updateProgress({
      testsTaken: progress.testsTaken + 1,
      averageScore: ((progress.averageScore * progress.testsTaken) + score) / (progress.testsTaken + 1),
      totalStudyTime: progress.totalStudyTime + timeSpent
    });
  };

  const addStudySession = (topic, duration) => {
    const newSession = {
      id: Date.now(),
      type: 'study',
      topic,
      duration,
      date: new Date().toISOString()
    };

    setRecentActivities(prev => [newSession, ...prev.slice(0, 9)]);
    updateProgress({
      totalStudyTime: progress.totalStudyTime + duration
    });
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastActivity = progress.lastActivity ? new Date(progress.lastActivity).toDateString() : null;
    
    if (lastActivity === today) return; // Already updated today
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity === yesterday.toDateString()) {
      // Consecutive day
      updateProgress({ streak: progress.streak + 1 });
    } else if (!lastActivity || lastActivity !== today) {
      // New streak or broken streak
      updateProgress({ streak: 1 });
    }
  };

  return {
    progress,
    recentActivities,
    updateProgress,
    addTestResult,
    addStudySession,
    updateStreak
  };
};