// services/llama-service.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class LLaMAService {
  constructor() {
    this.apiKey = process.env.LLAMA_API_KEY;
    this.baseURL = process.env.LLAMA_API_URL || 'https://api.llama.ai/v1';
    this.cache = new Map();
  }

  async generateExplanation(topic, difficulty = 'beginner', examType = 'general', language = 'english') {
    const cacheKey = `${topic}-${difficulty}-${examType}-${language}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this._buildExplanationPrompt(topic, difficulty, examType, language);
      
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'llama-2-13b-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert tutor specializing in competitive exam preparation. Provide clear, structured explanations that help students understand complex concepts.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const explanation = this._formatExplanation(
        response.data.choices[0].message.content, 
        topic, 
        difficulty,
        examType
      );

      // Cache the result
      this.cache.set(cacheKey, explanation);
      setTimeout(() => this.cache.delete(cacheKey), 3600000); // Clear cache after 1 hour

      return explanation;
    } catch (error) {
      console.error('LLaMA API Error:', error.response?.data || error.message);
      
      // Fallback explanation
      return this._generateFallbackExplanation(topic, difficulty, examType);
    }
  }

  async generateStepByStepSolution(question, subject, examType) {
    try {
      const prompt = `Solve this ${examType} ${subject} question step by step:\n\n"${question}"\n\nProvide a detailed solution with reasoning for each step. Format the response with clear steps and final answer.`;

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'llama-2-13b-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a patient tutor. Break down solutions into easy-to-follow steps with clear reasoning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return this._parseSolution(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Solution Generation Error:', error);
      return this._generateFallbackSolution(question, subject);
    }
  }

  async generatePracticeQuestions(topic, difficulty, count = 5, questionType = 'mcq') {
    try {
      const prompt = this._buildQuestionGenerationPrompt(topic, difficulty, count, questionType);

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'llama-2-13b-chat',
        messages: [
          {
            role: 'system',
            content: 'Generate high-quality practice questions for competitive exams. Ensure questions are accurate and relevant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.4,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return this._parseGeneratedQuestions(response.data.choices[0].message.content, topic, difficulty);
    } catch (error) {
      console.error('Question Generation Error:', error);
      return this._generateFallbackQuestions(topic, difficulty, count);
    }
  }

  _buildExplanationPrompt(topic, difficulty, examType, language) {
    const difficultyLevels = {
      beginner: 'a complete beginner',
      intermediate: 'an intermediate student',
      advanced: 'an advanced student preparing for competitive exams'
    };

    const examSpecifics = {
      NEET: 'Focus on biological concepts, medical terminology, and practical applications',
      JEE: 'Emphasize mathematical rigor, physics principles, and chemical concepts',
      UPSC: 'Include current affairs context, analytical perspectives, and governance aspects',
      SAT: 'Keep explanations concise with test-taking strategies',
      GRE: 'Focus on graduate-level concepts with quantitative and verbal reasoning',
      IELTS: 'Include language usage examples and communication context',
      TOEFL: 'Provide academic English context and usage examples',
      CODING: 'Include code examples, algorithms, and practical implementations'
    };

    return `
As an expert ${examType} tutor, explain "${topic}" for ${difficultyLevels[difficulty]}.

Requirements:
- Use simple, clear ${language}
- Provide 2-3 relevant examples
- Highlight key concepts and common misconceptions
- Include real-world applications
- Structure with: Introduction, Key Concepts, Examples, Summary
- ${examSpecifics[examType] || 'Focus on fundamental understanding'}

Make it engaging and easy to understand. Use analogies where helpful.
`;
  }

  _formatExplanation(text, topic, difficulty, examType) {
    const sections = this._extractSections(text);
    
    return {
      id: uuidv4(),
      topic: topic,
      difficulty: difficulty,
      examType: examType,
      explanation: text,
      structured: {
        introduction: sections.introduction || this._extractFirstParagraph(text),
        keyConcepts: sections.keyConcepts || this._extractKeyConcepts(text),
        examples: sections.examples || this._extractExamples(text),
        summary: sections.summary || this._extractLastParagraph(text),
        keyPoints: this._extractBulletPoints(text)
      },
      metadata: {
        length: text.length,
        estimatedReadingTime: Math.ceil(text.split(' ').length / 200),
        generatedAt: new Date().toISOString()
      }
    };
  }

  _extractSections(text) {
    const sections = {};
    const lines = text.split('\n\n');
    
    lines.forEach(line => {
      if (line.toLowerCase().includes('introduction')) {
        sections.introduction = line;
      } else if (line.toLowerCase().includes('key concept') || line.toLowerCase().includes('key points')) {
        sections.keyConcepts = line;
      } else if (line.toLowerCase().includes('example') || line.toLowerCase().includes('for instance')) {
        sections.examples = line;
      } else if (line.toLowerCase().includes('summary') || line.toLowerCase().includes('conclusion')) {
        sections.summary = line;
      }
    });
    
    return sections;
  }

  _extractKeyConcepts(text) {
    const concepts = [];
    const sentences = text.split('. ');
    
    sentences.forEach(sentence => {
      if (sentence.includes('important') || 
          sentence.includes('key') || 
          sentence.includes('essential') ||
          sentence.includes('crucial') ||
          sentence.match(/\b(must|should|always|never)\b/i)) {
        concepts.push(sentence.trim());
      }
    });
    
    return concepts.slice(0, 5);
  }

  _extractExamples(text) {
    const examples = [];
    const examplePatterns = [
      /for example[^.!?]*[.!?]/gi,
      /for instance[^.!?]*[.!?]/gi,
      /such as[^.!?]*[.!?]/gi,
      /consider[^.!?]*[.!?]/gi
    ];
    
    examplePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        examples.push(...matches);
      }
    });
    
    return examples.slice(0, 3);
  }

  _extractBulletPoints(text) {
    const bulletPoints = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.trim().match(/^[•\-*]\s/) || line.trim().match(/^\d+\.\s/)) {
        bulletPoints.push(line.trim());
      }
    });
    
    return bulletPoints.length > 0 ? bulletPoints : this._extractKeyConcepts(text);
  }

  _extractFirstParagraph(text) {
    return text.split('\n\n')[0] || text.substring(0, 300);
  }

  _extractLastParagraph(text) {
    const paragraphs = text.split('\n\n');
    return paragraphs[paragraphs.length - 1] || text.substring(text.length - 300);
  }

  _parseSolution(solutionText) {
    const steps = solutionText.split(/\n(?=\d+\.|\n|Step)/).filter(step => step.trim().length > 0);
    
    return {
      steps: steps.map((step, index) => ({
        step: index + 1,
        description: step.trim(),
        hasExplanation: step.includes(':') || step.length > 50
      })),
      finalAnswer: this._extractFinalAnswer(solutionText),
      totalSteps: steps.length,
      solutionText: solutionText
    };
  }

  _extractFinalAnswer(text) {
    const answerPatterns = [
      /final answer:?\s*([^\n.!?]+)/i,
      /answer:?\s*([^\n.!?]+)/i,
      /therefore[^.!?]*([^\n.!?]+)/i,
      /so[^.!?]*([^\n.!?]+)/i
    ];
    
    for (let pattern of answerPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return 'See step-by-step solution above';
  }

  _buildQuestionGenerationPrompt(topic, difficulty, count, questionType) {
    const formats = {
      mcq: 'multiple choice with 4 options (A, B, C, D)',
      truefalse: 'true/false questions',
      short: 'short answer questions',
      descriptive: 'descriptive/long answer questions'
    };

    return `
Generate ${count} ${difficulty} level ${questionType} questions about "${topic}".

Format: ${formats[questionType]}

Requirements:
- Each question should be clear and unambiguous
- For MCQ: Provide 4 plausible options with one correct answer
- Include detailed explanations for answers
- Vary the cognitive level (remember, understand, apply, analyze)
- Mark the correct answer clearly

Return in JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "type": "${questionType}",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "difficulty": "${difficulty}",
      "topic": "${topic}",
      "cognitiveLevel": "understand"
    }
  ]
}
`;
  }

  _parseGeneratedQuestions(text, topic, difficulty) {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && Array.isArray(parsed.questions)) {
          return parsed.questions.map(q => ({
            ...q,
            id: uuidv4(),
            topic: topic,
            difficulty: difficulty,
            generatedAt: new Date().toISOString()
          }));
        }
      }
      
      // Fallback parsing
      return this._manualParseQuestions(text, topic, difficulty);
    } catch (error) {
      console.error('Question Parsing Error:', error);
      return this._generateFallbackQuestions(topic, difficulty, 5);
    }
  }

  _manualParseQuestions(text, topic, difficulty) {
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;

    lines.forEach(line => {
      line = line.trim();
      
      if (line.match(/^\d+\./) || line.match(/^Q\d*:/i)) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          id: uuidv4(),
          question: line.replace(/^\d+\.\s*|^Q\d*:\s*/i, ''),
          type: 'mcq',
          options: [],
          correctAnswer: '',
          explanation: '',
          difficulty: difficulty,
          topic: topic
        };
      } else if (line.match(/^[A-D]\./)) {
        if (currentQuestion) {
          currentQuestion.options.push(line.substring(2).trim());
        }
      } else if (line.match(/answer:/i)) {
        if (currentQuestion) {
          currentQuestion.correctAnswer = line.split(':')[1].trim();
        }
      } else if (line.match(/explanation:/i)) {
        if (currentQuestion) {
          currentQuestion.explanation = line.split(':')[1].trim();
        }
      } else if (currentQuestion && line.length > 0) {
        // Additional question text
        currentQuestion.question += ' ' + line;
      }
    });

    if (currentQuestion) questions.push(currentQuestion);
    return questions.slice(0, 5);
  }

  _generateFallbackExplanation(topic, difficulty, examType) {
    return {
      id: uuidv4(),
      topic: topic,
      difficulty: difficulty,
      examType: examType,
      explanation: `This is a sample explanation for ${topic}. In a production environment, this would be generated by LLaMA AI. Focus on understanding the fundamental concepts and practice regularly.`,
      structured: {
        introduction: `Introduction to ${topic} for ${examType} preparation.`,
        keyConcepts: ['Key concept 1', 'Key concept 2', 'Key concept 3'],
        examples: ['Example 1 related to the topic', 'Example 2 demonstrating application'],
        summary: `Summary of ${topic} for quick revision.`,
        keyPoints: ['Important point 1', 'Important point 2', 'Important point 3']
      },
      metadata: {
        length: 200,
        estimatedReadingTime: 1,
        generatedAt: new Date().toISOString(),
        isFallback: true
      }
    };
  }

  _generateFallbackSolution(question, subject) {
    return {
      steps: [
        {
          step: 1,
          description: `Understand the ${subject} problem: ${question}`,
          hasExplanation: true
        },
        {
          step: 2,
          description: 'Apply relevant concepts and formulas',
          hasExplanation: true
        },
        {
          step: 3,
          description: 'Solve step by step with reasoning',
          hasExplanation: true
        }
      ],
      finalAnswer: 'Solution would be provided by AI in production',
      totalSteps: 3,
      solutionText: 'Complete AI-generated solution would appear here.',
      isFallback: true
    };
  }

  _generateFallbackQuestions(topic, difficulty, count) {
    const questions = [];
    for (let i = 1; i <= count; i++) {
      questions.push({
        id: uuidv4(),
        question: `Sample ${difficulty} question about ${topic}?`,
        type: 'mcq',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        explanation: `Explanation for ${topic} question.`,
        difficulty: difficulty,
        topic: topic,
        cognitiveLevel: 'understand',
        isFallback: true
      });
    }
    return questions;
  }
}

module.exports = new LLaMAService();