import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, Target, TrendingUp,
  Calendar, CheckCircle, Play, FileText,
  BarChart3, Video, Bookmark, Share2
} from 'lucide-react';

const Study = ({ user, onStartTest, onStartFlashcards }) => {
  const [studyPlan, setStudyPlan] = useState(null);
  const [progress, setProgress] = useState({});
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    // Simulate fetching study plan
    fetchStudyPlan();
    fetchProgress();
  }, []);

  const fetchStudyPlan = async () => {
    // Mock study plan data
    const plan = {
      today: [
        {
          id: 1,
          subject: 'Physics',
          topic: 'Thermodynamics',
          duration: '2 hours',
          type: 'concept',
          completed: false,
          priority: 'high'
        },
        {
          id: 2,
          subject: 'Chemistry',
          topic: 'Organic Chemistry - Reaction Mechanisms',
          duration: '1.5 hours',
          type: 'practice',
          completed: true,
          priority: 'medium'
        },
        {
          id: 3,
          subject: 'Biology',
          topic: 'Genetics and Evolution',
          duration: '1 hour',
          type: 'revision',
          completed: false,
          priority: 'high'
        }
      ],
      week: [
        {
          day: 'Monday',
          tasks: ['Physics: Thermodynamics', 'Chemistry: Organic Basics'],
          completed: true
        },
        {
          day: 'Tuesday',
          tasks: ['Biology: Genetics', 'Physics: Problems'],
          completed: true
        },
        {
          day: 'Wednesday',
          tasks: ['Chemistry: Mechanisms', 'Full Test'],
          completed: false
        },
        {
          day: 'Thursday',
          tasks: ['Biology: Evolution', 'Chemistry Revision'],
          completed: false
        },
        {
          day: 'Friday',
          tasks: ['Physics Advanced', 'Mock Test'],
          completed: false
        },
        {
          day: 'Saturday',
          tasks: ['Weak Areas Focus', 'Concept Revision'],
          completed: false
        },
        {
          day: 'Sunday',
          tasks: ['Full Syllabus Test', 'Analysis'],
          completed: false
        }
      ]
    };
    setStudyPlan(plan);
  };

  const fetchProgress = async () => {
    // Mock progress data
    const progressData = {
      overall: 65,
      subjects: {
        'Physics': { completed: 45, total: 70, percentage: 64 },
        'Chemistry': { completed: 52, total: 80, percentage: 65 },
        'Biology': { completed: 48, total: 75, percentage: 64 }
      },
      weeklyProgress: [45, 52, 48, 55, 60, 58, 65]
    };
    setProgress(progressData);
  };

  const resources = [
    {
      type: 'video',
      title: 'Thermodynamics Complete Lecture',
      duration: '45 min',
      subject: 'Physics',
      views: '2.4K',
      thumbnail: '📺'
    },
    {
      type: 'document',
      title: 'Organic Chemistry Formulas',
      pages: '24',
      subject: 'Chemistry',
      downloads: '1.8K',
      thumbnail: '📄'
    },
    {
      type: 'quiz',
      title: 'Genetics Quick Test',
      questions: '15',
      subject: 'Biology',
      attempts: '3.2K',
      thumbnail: '🧪'
    },
    {
      type: 'notes',
      title: 'Physics Formula Sheet',
      pages: '12',
      subject: 'Physics',
      downloads: '4.1K',
      thumbnail: '📝'
    }
  ];

  const StudyTask = ({ task }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`card p-4 mb-3 border-l-4 ${
        task.priority === 'high' ? 'border-l-red-500' : 
        task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
      } ${task.completed ? 'bg-green-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <button
            onClick={() => toggleTaskCompletion(task.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 ${
              task.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {task.completed && <CheckCircle className="w-3 h-3" />}
          </button>
          <div>
            <h3 className="font-semibold text-gray-900">{task.topic}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <BookOpen className="w-4 h-4 mr-1" />
              <span>{task.subject}</span>
              <Clock className="w-4 h-4 ml-3 mr-1" />
              <span>{task.duration}</span>
              <span className={`ml-3 px-2 py-1 rounded-full text-xs ${
                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {task.priority} priority
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {task.type === 'practice' && (
            <button
              onClick={() => onStartTest()}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Start Practice"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onStartFlashcards(task.topic)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Flashcards"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const toggleTaskCompletion = (taskId) => {
    setStudyPlan(prev => ({
      ...prev,
      today: prev.today.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  if (!studyPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Study Plan</h1>
              <p className="text-gray-600 mt-2">
                Personalized learning path for {user?.examType || 'your exam'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="btn-secondary flex items-center">
                <Share2 className="w-4 h-4 mr-2" />
                Share Plan
              </button>
              <button className="btn-primary flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar View
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Progress Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Progress Overview</h2>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              
              <div className="grid grid-cols-3 gap-6 mb-6">
                {Object.entries(progress.subjects || {}).map(([subject, data]) => (
                  <div key={subject} className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {data.percentage}%
                    </div>
                    <div className="text-sm text-gray-600">{subject}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${data.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Overall Completion: {progress.overall}%</span>
                <span>Last updated: Today</span>
              </div>
            </motion.div>

            {/* Study Tasks */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Today's Study Plan</h2>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">
                    {studyPlan.today.filter(t => t.completed).length} of {studyPlan.today.length} completed
                  </span>
                  <Target className="w-4 h-4 text-green-600" />
                </div>
              </div>

              <div className="space-y-3">
                {studyPlan.today.map((task, index) => (
                  <StudyTask key={task.id} task={task} />
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button className="w-full btn-secondary py-3">
                  + Add Custom Task
                </button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Weekly Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Plan</h3>
              <div className="space-y-3">
                {studyPlan.week.map((day, index) => (
                  <div
                    key={day.day}
                    className={`p-3 rounded-lg border ${
                      day.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        day.completed ? 'text-green-800' : 'text-gray-900'
                      }`}>
                        {day.day}
                      </span>
                      {day.completed && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {day.tasks.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recommended Resources */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recommended Resources
              </h3>
              <div className="space-y-4">
                {resources.map((resource, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    <div className="text-2xl">{resource.thumbnail}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {resource.title}
                      </h4>
                      <div className="flex items-center text-xs text-gray-600 mt-1">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {resource.subject}
                        </span>
                        <span className="ml-2">
                          {resource.duration || resource.pages + ' pages'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onStartTest}
                  className="p-3 bg-blue-50 text-blue-700 rounded-lg text-center hover:bg-blue-100 transition-colors"
                >
                  <FileText className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">Mock Test</div>
                </button>
                <button
                  onClick={() => onStartFlashcards('Quick Revision')}
                  className="p-3 bg-purple-50 text-purple-700 rounded-lg text-center hover:bg-purple-100 transition-colors"
                >
                  <Bookmark className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">Flashcards</div>
                </button>
                <button className="p-3 bg-green-50 text-green-700 rounded-lg text-center hover:bg-green-100 transition-colors">
                  <BarChart3 className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">Analytics</div>
                </button>
                <button className="p-3 bg-orange-50 text-orange-700 rounded-lg text-center hover:bg-orange-100 transition-colors">
                  <Video className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">Videos</div>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Study;