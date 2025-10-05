import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useTutor = () => {
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateTest = async (examType, subject, difficulty = 'medium', count = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      const test = await api.generateTest(examType, subject, difficulty, count);
      return test;
    } catch (err) {
      setError('Failed to generate test');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateTest = async (testId, userAnswers) => {
    try {
      setIsLoading(true);
      setError(null);
      const results = await api.evaluateTest(testId, userAnswers);
      return results;
    } catch (err) {
      setError('Failed to evaluate test');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateFlashcards = async (topic, count = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      const flashcards = await api.generateFlashcards(topic, count);
      return flashcards;
    } catch (err) {
      setError('Failed to generate flashcards');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const startTutoringSession = async (weakAreas) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate session creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session = {
        id: 'session-' + Date.now(),
        weakAreas,
        startTime: new Date().toISOString(),
        progress: 0,
        topics: weakAreas.map(area => ({
          name: area,
          completed: false,
          steps: ['concept', 'examples', 'practice']
        }))
      };
      
      setSessionData(session);
      return session;
    } catch (err) {
      setError('Failed to start tutoring session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sessionData,
    isLoading,
    error,
    generateTest,
    evaluateTest,
    generateFlashcards,
    startTutoringSession
  };
};