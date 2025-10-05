// services/cerebras-service.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CerebrasService {
  constructor() {
    this.apiKey = process.env.CEREBRAS_API_KEY;
    this.baseURL = process.env.CEREBRAS_API_URL || 'https://api.cerebras.ai/v1';
    this.testCache = new Map();
  }

  async generateTest(examType, subjects, difficulty = 'medium', numberOfQuestions = 10, questionTypes = ['mcq']) {
    const testId = uuidv4();
    
    try {
      const questions = [];
      const questionsPerSubject = Math.ceil(numberOfQuestions / subjects.length);

      for (const subject of subjects) {
        const subjectQuestions = await this._generateSubjectQuestions(
          examType, 
          subject, 
          difficulty, 
          questionsPerSubject, 
          questionTypes
        );
        questions.push(...subjectQuestions);
      }

      // Shuffle and limit to requested number
      const shuffledQuestions = this._shuffleArray(questions).slice(0, numberOfQuestions);
      
      const test = {
        testId,
        examType,
        subjects,
        difficulty,
        totalQuestions: shuffledQuestions.length,
        duration: this._calculateTestDuration(shuffledQuestions.length, examType),
        questions: shuffledQuestions,
        generatedAt: new Date().toISOString(),
        metadata: {
          questionTypes,
          estimatedDifficulty: this._calculateAverageDifficulty(shuffledQuestions)
        }
      };

      // Cache the test
      this.testCache.set(testId, test);
      setTimeout(() => this.testCache.delete(testId), 3600000); // 1 hour cache

      return test;
    } catch (error) {
      console.error('Test Generation Error:', error);
      throw new Error(`Failed to generate test: ${error.message}`);
    }
  }

  async _generateSubjectQuestions(examType, subject, difficulty, count, questionTypes) {
    const prompt = this._buildTestGenerationPrompt(examType, subject, difficulty, count, questionTypes);
    
    try {
      const response = await axios.post(`${this.baseURL}/completions`, {
        model: 'cerebras-gpt',
        prompt: prompt,
        max_tokens: 4000,
        temperature: 0.4,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.1,
        stop: ['### END']
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      });

      return this._parseGeneratedQuestions(
        response.data.choices[0].text, 
        examType, 
        subject, 
        difficulty
      );
    } catch (error) {
      console.error(`Subject Question Generation Error for ${subject}:`, error);
      return this._generateFallbackQuestions(examType, subject, difficulty, count);
    }
  }

  _buildTestGenerationPrompt(examType, subject, difficulty, count, questionTypes) {
    const examSpecifics = {
      NEET: {
        format: 'Multiple choice with 4 options (A, B, C, D)',
        focus: 'conceptual understanding and application in medical context',
        subjects: {
          'Biology': 'human physiology, genetics, ecology, plant physiology',
          'Chemistry': 'organic chemistry, inorganic chemistry, physical chemistry',
          'Physics': 'mechanics, thermodynamics, optics, modern physics'
        }
      },
      JEE: {
        format: 'Problem-solving with multiple steps and calculations',
        focus: 'mathematical rigor and conceptual depth',
        subjects: {
          'Mathematics': 'calculus, algebra, coordinate geometry, vectors',
          'Physics': 'mechanics, electromagnetism, thermodynamics, waves',
          'Chemistry': 'physical chemistry, organic chemistry, inorganic chemistry'
        }
      },
      UPSC: {
        format: 'Analytical and descriptive questions',
        focus: 'current affairs, analytical ability, and governance',
        subjects: {
          'Current Affairs': 'national and international events, government schemes',
          'History': 'ancient, medieval, modern Indian history',
          'Geography': 'physical, human, economic geography of India',
          'Polity': 'Indian constitution, governance, political system',
          'Economy': 'Indian economy, economic development, budgeting'
        }
      }
    };

    const examConfig = examSpecifics[examType] || {
      format: 'Multiple choice with 4 options',
      focus: 'conceptual understanding and problem solving'
    };

    const subjectFocus = examConfig.subjects?.[subject] || 'fundamental concepts and applications';

    return `
Generate ${count} ${difficulty} level ${questionTypes.join(', ')} questions for ${examType} ${subject}.

Exam: ${examType}
Subject: ${subject}
Difficulty: ${difficulty}
Question Types: ${questionTypes.join(', ')}
Focus Areas: ${subjectFocus}

Requirements:
- ${examConfig.format}
- Focus on ${examConfig.focus}
- Include detailed explanations
- Vary cognitive levels (remember, understand, apply, analyze, evaluate)
- Ensure accuracy and relevance to ${examType} syllabus
- Mark correct answers clearly

Return in JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Clear and unambiguous question text",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this is correct",
      "topic": "Specific sub-topic",
      "difficulty": "${difficulty}",
      "cognitiveLevel": "apply",
      "subject": "${subject}",
      "examType": "${examType}"
    }
  ]
}

### END
`;
  }

  _parseGeneratedQuestions(text, examType, subject, difficulty) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions.map(q => ({
            ...q,
            id: uuidv4(),
            subject: subject,
            examType: examType,
            difficulty: difficulty,
            timeLimit: this._calculateQuestionTimeLimit(q.type, difficulty)
          }));
        }
      }
      
      return this._manualParseQuestions(text, examType, subject, difficulty);
    } catch (error) {
      console.error('Question Parsing Error:', error);
      return this._generateFallbackQuestions(examType, subject, difficulty, 3);
    }
  }

  _manualParseQuestions(text, examType, subject, difficulty) {
    const questions = [];
    const blocks = text.split(/\n\n+/);
    let currentQuestion = null;

    blocks.forEach(block => {
      block = block.trim();
      if (!block) return;

      // Detect question start
      if (block.match(/^\d+\./) || block.match(/^Q\d*:/i)) {
        if (currentQuestion) questions.push(currentQuestion);
        
        currentQuestion = {
          id: uuidv4(),
          question: block.replace(/^\d+\.\s*|^Q\d*:\s*/i, ''),
          type: 'mcq',
          options: [],
          correctAnswer: '',
          explanation: '',
          topic: this._extractTopic(block, subject),
          difficulty: difficulty,
          cognitiveLevel: 'understand',
          subject: subject,
          examType: examType,
          timeLimit: 60
        };
      } 
      // Detect options
      else if (block.match(/^[A-D]\.\s/)) {
        if (currentQuestion) {
          const options = block.split('\n')
            .filter(line => line.match(/^[A-D]\./))
            .map(line => line.substring(2).trim());
          currentQuestion.options = options;
        }
      }
      // Detect correct answer
      else if (block.match(/answer:\s*[A-D]/i)) {
        if (currentQuestion) {
          const match = block.match(/answer:\s*([A-D])/i);
          currentQuestion.correctAnswer = match ? match[1] : '';
        }
      }
      // Detect explanation
      else if (block.match(/explanation:/i)) {
        if (currentQuestion) {
          currentQuestion.explanation = block.split(/explanation:/i)[1].trim();
        }
      }
      // Additional question text
      else if (currentQuestion && !currentQuestion.question.includes(block)) {
        currentQuestion.question += ' ' + block;
      }
    });

    if (currentQuestion) questions.push(currentQuestion);
    return questions;
  }

  async evaluateTest(testId, userAnswers, timeSpent = 0) {
    try {
      const test = this.testCache.get(testId);
      if (!test) {
        throw new Error('Test not found or expired');
      }

      const evaluation = await this._performDetailedEvaluation(test.questions, userAnswers);
      const analytics = this._calculateComprehensiveAnalytics(evaluation, timeSpent);
      const recommendations = this._generatePersonalizedRecommendations(analytics, test.examType);

      const result = {
        testId,
        examType: test.examType,
        submittedAt: new Date().toISOString(),
        score: analytics.overall.score,
        timeSpent,
        evaluation: evaluation,
        analytics: analytics,
        recommendations: recommendations,
        improvementPlan: this._createImprovementPlan(analytics, test.subjects)
      };

      return result;
    } catch (error) {
      console.error('Test Evaluation Error:', error);
      throw new Error(`Failed to evaluate test: ${error.message}`);
    }
  }

  async _performDetailedEvaluation(questions, userAnswers) {
    const evaluation = [];

    for (const question of questions) {
      const userAnswer = userAnswers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      const questionAnalysis = {
        questionId: question.id,
        question: question.question,
        type: question.type,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        explanation: question.explanation,
        cognitiveLevel: question.cognitiveLevel,
        timeSpent: userAnswers.timeSpent?.[question.id] || 0
      };

      // Add confidence scoring
      questionAnalysis.confidence = this._calculateAnswerConfidence(question, userAnswer);
      
      evaluation.push(questionAnalysis);
    }

    return evaluation;
  }

  _calculateComprehensiveAnalytics(evaluation, totalTimeSpent) {
    const subjectPerformance = {};
    const topicPerformance = {};
    const difficultyPerformance = {};
    const cognitiveLevelPerformance = {};

    evaluation.forEach(q => {
      // Subject performance
      if (!subjectPerformance[q.subject]) {
        subjectPerformance[q.subject] = { correct: 0, total: 0, timeSpent: 0 };
      }
      subjectPerformance[q.subject].total++;
      subjectPerformance[q.subject].timeSpent += q.timeSpent;
      if (q.isCorrect) subjectPerformance[q.subject].correct++;

      // Topic performance
      if (!topicPerformance[q.topic]) {
        topicPerformance[q.topic] = { correct: 0, total: 0 };
      }
      topicPerformance[q.topic].total++;
      if (q.isCorrect) topicPerformance[q.topic].correct++;

      // Difficulty performance
      if (!difficultyPerformance[q.difficulty]) {
        difficultyPerformance[q.difficulty] = { correct: 0, total: 0 };
      }
      difficultyPerformance[q.difficulty].total++;
      if (q.isCorrect) difficultyPerformance[q.difficulty].correct++;

      // Cognitive level performance
      if (!cognitiveLevelPerformance[q.cognitiveLevel]) {
        cognitiveLevelPerformance[q.cognitiveLevel] = { correct: 0, total: 0 };
      }
      cognitiveLevelPerformance[q.cognitiveLevel].total++;
      if (q.isCorrect) cognitiveLevelPerformance[q.cognitiveLevel].correct++;
    });

    // Calculate percentages and metrics
    Object.keys(subjectPerformance).forEach(subject => {
      const perf = subjectPerformance[subject];
      perf.accuracy = (perf.correct / perf.total) * 100;
      perf.averageTime = perf.timeSpent / perf.total;
      perf.efficiency = perf.accuracy / (perf.averageTime || 1);
    });

    const totalCorrect = evaluation.filter(q => q.isCorrect).length;
    const totalQuestions = evaluation.length;
    const overallAccuracy = (totalCorrect / totalQuestions) * 100;

    return {
      overall: {
        score: Math.round(overallAccuracy),
        totalQuestions,
        correctAnswers: totalCorrect,
        accuracy: overallAccuracy,
        timeSpent: totalTimeSpent,
        averageTimePerQuestion: totalTimeSpent / totalQuestions
      },
      subjectPerformance,
      topicPerformance: this._calculatePercentages(topicPerformance),
      difficultyPerformance: this._calculatePercentages(difficultyPerformance),
      cognitiveLevelPerformance: this._calculatePercentages(cognitiveLevelPerformance),
      weakAreas: this._identifyWeakAreas(topicPerformance),
      strongAreas: this._identifyStrongAreas(topicPerformance),
      timeManagement: this._analyzeTimeManagement(evaluation, totalTimeSpent)
    };
  }

  _calculatePercentages(performance) {
    const result = {};
    Object.keys(performance).forEach(key => {
      const perf = performance[key];
      result[key] = {
        ...perf,
        percentage: (perf.correct / perf.total) * 100
      };
    });
    return result;
  }

  _identifyWeakAreas(topicPerformance) {
    return Object.entries(topicPerformance)
      .filter(([_, perf]) => (perf.correct / perf.total) < 60)
      .map(([topic, perf]) => ({
        topic,
        accuracy: (perf.correct / perf.total) * 100,
        totalQuestions: perf.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
  }

  _identifyStrongAreas(topicPerformance) {
    return Object.entries(topicPerformance)
      .filter(([_, perf]) => (perf.correct / perf.total) >= 75)
      .map(([topic, perf]) => ({
        topic,
        accuracy: (perf.correct / perf.total) * 100,
        totalQuestions: perf.total
      }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);
  }

  _analyzeTimeManagement(evaluation, totalTimeSpent) {
    const timeAnalysis = {
      tooFast: 0,
      optimal: 0,
      tooSlow: 0,
      averageTimePerQuestion: totalTimeSpent / evaluation.length
    };

    evaluation.forEach(q => {
      const optimalTime = this._getOptimalTimeForQuestion(q);
      if (q.timeSpent < optimalTime * 0.5) {
        timeAnalysis.tooFast++;
      } else if (q.timeSpent > optimalTime * 1.5) {
        timeAnalysis.tooSlow++;
      } else {
        timeAnalysis.optimal++;
      }
    });

    return timeAnalysis;
  }

  _generatePersonalizedRecommendations(analytics, examType) {
    const recommendations = [];

    // Accuracy-based recommendations
    if (analytics.overall.accuracy < 50) {
      recommendations.push({
        type: 'foundation',
        priority: 'high',
        message: 'Focus on strengthening fundamental concepts before attempting advanced problems',
        action: 'Review basic concepts and practice foundational questions'
      });
    } else if (analytics.overall.accuracy < 75) {
      recommendations.push({
        type: 'practice',
        priority: 'medium',
        message: 'Regular practice with varied difficulty levels will improve performance',
        action: 'Attempt mixed-difficulty practice sets daily'
      });
    }

    // Time management recommendations
    if (analytics.timeManagement.tooSlow > analytics.timeManagement.tooFast) {
      recommendations.push({
        type: 'time_management',
        priority: 'medium',
        message: 'Work on improving speed while maintaining accuracy',
        action: 'Practice with timed quizzes and learn time-saving techniques'
      });
    }

    // Subject-specific recommendations
    Object.entries(analytics.subjectPerformance).forEach(([subject, perf]) => {
      if (perf.accuracy < 60) {
        recommendations.push({
          type: 'subject_focus',
          priority: 'high',
          message: `Need improvement in ${subject} (Accuracy: ${Math.round(perf.accuracy)}%)`,
          action: `Dedicate more study time to ${subject} concepts`
        });
      }
    });

    // Weak areas recommendations
    analytics.weakAreas.forEach(weakArea => {
      recommendations.push({
        type: 'topic_focus',
        priority: 'high',
        message: `Weak in "${weakArea.topic}" (${Math.round(weakArea.accuracy)}% accuracy)`,
        action: `Practice more questions on ${weakArea.topic} and review related concepts`
      });
    });

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  _createImprovementPlan(analytics, subjects) {
    const plan = {
      duration: '4 weeks',
      focusAreas: analytics.weakAreas.slice(0, 3).map(area => area.topic),
      practiceSchedule: {},
      resources: []
    };

    // Create weekly schedule
    subjects.forEach(subject => {
      const subjectPerf = analytics.subjectPerformance[subject];
      plan.practiceSchedule[subject] = {
        weeklyHours: subjectPerf.accuracy < 60 ? 8 : 4,
        focus: subjectPerf.accuracy < 60 ? 'concept strengthening' : 'advanced practice'
      };
    });

    return plan;
  }

  _calculateAnswerConfidence(question, userAnswer) {
    // Simple confidence calculation based on answer patterns
    if (!userAnswer) return 'low';
    
    const answerLength = userAnswer.length;
    const hasExplanation = question.explanation && question.explanation.length > 50;
    
    if (answerLength > 20 && hasExplanation) return 'high';
    if (answerLength > 10) return 'medium';
    return 'low';
  }

  _calculateTestDuration(questionCount, examType) {
    const baseTimes = {
      NEET: 180, // 3 hours for 180 questions
      JEE: 180,  // 3 hours
      UPSC: 180, // 3 hours
      SAT: 180,  // 3 hours
      GRE: 135,  // 2 hours 15 minutes
      IELTS: 165, // 2 hours 45 minutes
      TOEFL: 120, // 2 hours
      CODING: 120 // 2 hours
    };

    const baseTime = baseTimes[examType] || 120;
    return Math.ceil((baseTime / 180) * questionCount); // Scale based on standard 180 questions
  }

  _calculateQuestionTimeLimit(type, difficulty) {
    const baseTimes = {
      mcq: { easy: 45, medium: 60, hard: 90 },
      descriptive: { easy: 120, medium: 180, hard: 240 },
      coding: { easy: 300, medium: 450, hard: 600 }
    };

    return baseTimes[type]?.[difficulty] || 60;
  }

  _getOptimalTimeForQuestion(question) {
    return question.timeLimit || this._calculateQuestionTimeLimit(question.type, question.difficulty);
  }

  _calculateAverageDifficulty(questions) {
    const difficultyWeights = { easy: 1, medium: 2, hard: 3, expert: 4 };
    const totalWeight = questions.reduce((sum, q) => sum + (difficultyWeights[q.difficulty] || 2), 0);
    return totalWeight / questions.length;
  }

  _extractTopic(text, subject) {
    // Simple topic extraction - can be enhanced with NLP
    const commonTopics = {
      'Biology': ['cell', 'genetics', 'evolution', 'ecology', 'physiology'],
      'Physics': ['mechanics', 'thermodynamics', 'optics', 'electricity', 'magnetism'],
      'Chemistry': ['organic', 'inorganic', 'physical', 'periodic', 'reaction'],
      'Mathematics': ['algebra', 'calculus', 'geometry', 'trigonometry', 'statistics']
    };

    const topics = commonTopics[subject] || ['fundamentals'];
    const foundTopic = topics.find(topic => text.toLowerCase().includes(topic));
    return foundTopic || 'general';
  }

  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  _generateFallbackQuestions(examType, subject, difficulty, count) {
    const questions = [];
    for (let i = 1; i <= count; i++) {
      questions.push({
        id: uuidv4(),
        question: `${examType} ${subject} Question ${i} (${difficulty} level) - What is the correct approach?`,
        type: 'mcq',
        options: [
          'Apply fundamental concepts systematically',
          'Use advanced theoretical framework', 
          'Follow standard problem-solving methodology',
          'Combine multiple approaches creatively'
        ],
        correctAnswer: 'A',
        explanation: `This question tests ${difficulty} level understanding of ${subject}. The correct approach involves applying fundamental concepts systematically.`,
        topic: 'fundamentals',
        difficulty: difficulty,
        cognitiveLevel: 'understand',
        subject: subject,
        examType: examType,
        timeLimit: 60,
        isFallback: true
      });
    }
    return questions;
  }
}

module.exports = new CerebrasService();