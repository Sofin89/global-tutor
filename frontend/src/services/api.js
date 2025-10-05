
// Mock API service for demo purposes
export const mockAuth = {
  getCurrentUser: async () => {
    // Check if user exists in localStorage
    const userData = localStorage.getItem('ai_tutor_user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  },

  setUser: (user) => {
    localStorage.setItem('ai_tutor_user', JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem('ai_tutor_user');
  }
};

// Mock API calls
export const api = {
  generateTest: async (examType, subject, difficulty = 'medium', count = 10) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock test data
    return {
      questions: Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        question: `Sample ${examType} question about ${subject} (${difficulty} difficulty)`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        explanation: 'This is a sample explanation for the correct answer.',
        topic: subject,
        difficulty: difficulty
      }))
    };
  },

  evaluateTest: async (testId, userAnswers) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock evaluation
    return {
      testId,
      score: 75,
      totalQuestions: 10,
      correctAnswers: 7,
      timeSpent: 1800,
      analytics: {
        score: 75,
        topicPerformance: {
          'Biology': { correct: 3, total: 4, percentage: 75 },
          'Chemistry': { correct: 2, total: 3, percentage: 67 },
          'Physics': { correct: 2, total: 3, percentage: 67 }
        },
        difficultyPerformance: {
          'easy': { correct: 2, total: 2, percentage: 100 },
          'medium': { correct: 3, total: 5, percentage: 60 },
          'hard': { correct: 2, total: 3, percentage: 67 }
        },
        weakAreas: ['Chemistry', 'Physics'],
        strongAreas: ['Biology']
      },
      detailedResults: []
    };
  },

  generateFlashcards: async (topic, count = 10) => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      flashcards: Array.from({ length: count }, (_, i) => ({
        front: `Flashcard ${i + 1}: Question about ${topic}`,
        back: `Detailed answer and explanation for flashcard ${i + 1}. This covers important concepts that are frequently tested in competitive exams.`,
        mastered: false
      }))
    };
  }
};