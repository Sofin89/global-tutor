import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  BookOpen, Clock, TrendingUp, Award, Target, Calendar,
  Brain, Users, Rocket, Star, ChevronRight, Clock3,
  Play, BarChart3, FileText, Video, Settings, Bell,
  Search, Filter, Download, Share2, HelpCircle, Edit3
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';

const Dashboard = ({ user, onStartTest, onViewProgress, onStartFlashcards, onGoToStudy, onChangeExam }) => {
  const { user: authUser, updateUserExam } = useAuth();
  const { progress, recentActivities, updateStreak } = useProgress(authUser?.id);
  
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    studyTime: 0,
    masteryLevel: 0,
    streak: 0,
    rank: 'Top 20%'
  });
  
  const [progressData, setProgressData] = useState([]);
  const [topicPerformance, setTopicPerformance] = useState([]);
  const [studyPlan, setStudyPlan] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showExamSelector, setShowExamSelector] = useState(false);
  const [selectedExam, setSelectedExam] = useState(authUser?.examType || null);

  const exams = [
    { id: 'NEET', name: 'NEET', color: 'bg-green-500', description: 'Medical Entrance Exam' },
    { id: 'JEE', name: 'JEE', color: 'bg-blue-500', description: 'Engineering Entrance' },
    { id: 'UPSC', name: 'UPSC', color: 'bg-purple-500', description: 'Civil Services' },
    { id: 'SAT', name: 'SAT', color: 'bg-yellow-500', description: 'College Admissions' },
    { id: 'GRE', name: 'GRE', color: 'bg-red-500', description: 'Graduate Studies' },
    { id: 'IELTS', name: 'IELTS', color: 'bg-indigo-500', description: 'English Proficiency' }
  ];

  useEffect(() => {
    fetchDashboardData();
    if (authUser) {
      updateStreak();
    }
  }, [authUser]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Use progress data from hook
      setStats({
        totalTests: progress.testsTaken || 0,
        averageScore: Math.round(progress.averageScore) || 0,
        studyTime: Math.round(progress.totalStudyTime / 60) || 0, // Convert to hours
        masteryLevel: 68, // This would come from API
        streak: progress.streak || 0,
        rank: 'Top 15%'
      });

      // Mock progress data
      setProgressData([
        { week: 'Week 1', score: 65, questions: 50, time: 12 },
        { week: 'Week 2', score: 68, questions: 65, time: 15 },
        { week: 'Week 3', score: 72, questions: 80, time: 18 },
        { week: 'Week 4', score: 76, questions: 95, time: 20 },
        { week: 'Week 5', score: 79, questions: 110, time: 22 },
        { week: 'Week 6', score: 82, questions: 125, time: 25 }
      ]);

      setTopicPerformance([
        { name: 'Biology', value: 85, color: '#10B981', questions: 150 },
        { name: 'Chemistry', value: 65, color: '#3B82F6', questions: 120 },
        { name: 'Physics', value: 72, color: '#8B5CF6', questions: 130 },
        { name: 'Mathematics', value: 78, color: '#F59E0B', questions: 110 },
        { name: 'Reasoning', value: 88, color: '#EF4444', questions: 90 }
      ]);

      // Create recent activity from progress hook data
      const mockRecentActivity = [
        { 
          id: 1, 
          type: 'test', 
          title: 'NEET Mock Test 5', 
          score: 82, 
          time: '2 hours ago',
          subject: 'Full Syllabus',
          duration: '45 mins'
        },
        { 
          id: 2, 
          type: 'study', 
          title: 'Organic Chemistry Revision', 
          duration: '45 mins', 
          time: '5 hours ago',
          subject: 'Chemistry',
          topic: 'Reaction Mechanisms'
        },
        { 
          id: 3, 
          type: 'flashcard', 
          title: 'Physics Formulas', 
          cards: 25, 
          time: '1 day ago',
          subject: 'Physics',
          mastery: '85%'
        },
        { 
          id: 4, 
          type: 'test', 
          title: 'Quick Quiz - Biology', 
          score: 78, 
          time: '2 days ago',
          subject: 'Biology',
          duration: '15 mins'
        }
      ];

      setStudyPlan({
        today: [
          {
            task: 'Organic Chemistry - Reaction Mechanisms',
            subject: 'Chemistry',
            duration: '2 hours',
            completed: false,
            priority: 'high'
          },
          {
            task: 'Physics - Thermodynamics Practice',
            subject: 'Physics',
            duration: '1 hour',
            completed: true,
            priority: 'medium'
          },
          {
            task: 'Biology Flashcards - Genetics',
            subject: 'Biology',
            duration: '30 mins',
            completed: false,
            priority: 'high'
          }
        ],
        upcoming: [
          { date: 'Tomorrow', task: 'Full Length Mock Test', type: 'test' },
          { date: 'Mar 15', task: 'Weak Topics Revision Session', type: 'study' },
          { date: 'Mar 18', task: 'Progress Assessment Test', type: 'test' }
        ]
      });

      setQuickActions([
        {
          icon: Play,
          title: 'Quick Test',
          description: '15 min assessment',
          color: 'blue',
          action: onStartTest,
          disabled: !selectedExam
        },
        {
          icon: Brain,
          title: 'Flashcards',
          description: 'Smart revision',
          color: 'purple',
          action: () => onStartFlashcards('Quick Revision'),
          disabled: !selectedExam
        },
        {
          icon: BarChart3,
          title: 'Analytics',
          description: 'View progress',
          color: 'green',
          action: onViewProgress
        },
        {
          icon: BookOpen,
          title: 'Study Plan',
          description: 'Daily schedule',
          color: 'orange',
          action: onGoToStudy,
          disabled: !selectedExam
        }
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam.id);
    updateUserExam(exam.id);
    setShowExamSelector(false);
    // Refresh dashboard data for new exam
    fetchDashboardData();
  };

  const StatCard = ({ icon: Icon, label, value, subtitle, color = 'blue', trend }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="card p-6 border-l-4 transition-all duration-200 hover:shadow-medium"
      style={{ borderLeftColor: `var(--color-${color}-500)` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <div className="flex items-center mt-1">
              <p className={`text-xs ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {subtitle}
              </p>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  );

  const ActivityItem = ({ activity }) => (
    <motion.div
      whileHover={{ backgroundColor: '#F9FAFB' }}
      className="flex items-start p-4 rounded-lg border border-gray-200 cursor-pointer group"
    >
      <div className={`p-2 rounded-lg mr-4 mt-1 ${
        activity.type === 'test' ? 'bg-blue-50' : 
        activity.type === 'study' ? 'bg-green-50' : 'bg-purple-50'
      }`}>
        {activity.type === 'test' && <Award className="w-4 h-4 text-blue-600" />}
        {activity.type === 'study' && <BookOpen className="w-4 h-4 text-green-600" />}
        {activity.type === 'flashcard' && <Brain className="w-4 h-4 text-purple-600" />}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {activity.title}
            </h4>
            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
              <span className="flex items-center">
                <Clock3 className="w-3 h-3 mr-1" />
                {activity.time}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                {activity.subject}
              </span>
            </div>
          </div>
          {activity.score && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              activity.score >= 80 ? 'bg-green-100 text-green-800' :
              activity.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {activity.score}%
            </div>
          )}
        </div>
        
        <div className="flex items-center mt-2 text-xs text-gray-600 space-x-3">
          {activity.duration && (
            <span>Duration: {activity.duration}</span>
          )}
          {activity.cards && (
            <span>Cards: {activity.cards}</span>
          )}
          {activity.mastery && (
            <span>Mastery: {activity.mastery}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
    </motion.div>
  );

  const QuickActionCard = ({ action }) => (
    <motion.div
      whileHover={{ scale: action.disabled ? 1 : 1.05 }}
      whileTap={{ scale: action.disabled ? 1 : 0.95 }}
      onClick={action.disabled ? null : action.action}
      className={`p-6 rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-br from-${action.color}-50 to-${action.color}-100 border border-${action.color}-200 hover:shadow-medium group ${
        action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-' + action.color + '-300'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${action.color}-500 bg-opacity-10 group-hover:scale-110 transition-transform ${
          action.disabled ? 'group-hover:scale-100' : ''
        }`}>
          <action.icon className={`w-6 h-6 text-${action.color}-600 ${action.disabled ? 'text-gray-400' : ''}`} />
        </div>
        <div className={`w-2 h-2 rounded-full bg-${action.color}-500 opacity-0 group-hover:opacity-100 transition-opacity ${
          action.disabled ? 'hidden' : ''
        }`}></div>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
      <p className="text-sm text-gray-600">{action.description}</p>
      {action.disabled && (
        <p className="text-xs text-red-600 mt-2">Select an exam first</p>
      )}
    </motion.div>
  );

  const ExamSelectorModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Select Your Target Exam</h2>
          <button
            onClick={() => setShowExamSelector(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Choose the exam you're preparing for to get personalized content and recommendations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <motion.div
              key={exam.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExamSelect(exam)}
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                selectedExam === exam.id 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${exam.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {exam.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                  <p className="text-sm text-gray-600">{exam.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can change your selected exam anytime from the dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );

  // Mock recent activity data (temporary fix)
  const recentActivity = [
    { 
      id: 1, 
      type: 'test', 
      title: 'NEET Mock Test 5', 
      score: 82, 
      time: '2 hours ago',
      subject: 'Full Syllabus',
      duration: '45 mins'
    },
    { 
      id: 2, 
      type: 'study', 
      title: 'Organic Chemistry Revision', 
      duration: '45 mins', 
      time: '5 hours ago',
      subject: 'Chemistry',
      topic: 'Reaction Mechanisms'
    },
    { 
      id: 3, 
      type: 'flashcard', 
      title: 'Physics Formulas', 
      cards: 25, 
      time: '1 day ago',
      subject: 'Physics',
      mastery: '85%'
    },
    { 
      id: 4, 
      type: 'test', 
      title: 'Quick Quiz - Biology', 
      score: 78, 
      time: '2 days ago',
      subject: 'Biology',
      duration: '15 mins'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Preparing your learning insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showExamSelector && <ExamSelectorModal />}
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {authUser?.name || 'Student'}! 👋
                </h1>
                {selectedExam && (
                  <button
                    onClick={() => setShowExamSelector(true)}
                    className="flex items-center space-x-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
                  >
                    <span>{exams.find(e => e.id === selectedExam)?.name}</span>
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <p className="text-gray-600">
                {selectedExam ? (
                  <>
                    Continue your preparation for <strong>{exams.find(e => e.id === selectedExam)?.name}</strong>. 
                    Here's your progress overview and today's recommendations.
                  </>
                ) : (
                  <>
                    <strong>Select an exam</strong> to start your personalized learning journey and unlock all features.
                  </>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {!selectedExam && (
                <button
                  onClick={() => setShowExamSelector(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Select Exam</span>
                </button>
              )}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Exam Selection Prompt */}
        {!selectedExam && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-8 text-white text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
              <h2 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
              <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
                Select your target exam to unlock personalized study plans, AI-powered tests, 
                and smart recommendations tailored specifically for your preparation.
              </p>
              <button
                onClick={() => setShowExamSelector(true)}
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
              >
                <Rocket className="w-5 h-5" />
                <span>Choose Your Exam</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        {selectedExam && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <StatCard
                icon={BookOpen}
                label="Total Tests Taken"
                value={stats.totalTests}
                subtitle="+3 this week"
                color="blue"
                trend={3}
              />
              <StatCard
                icon={TrendingUp}
                label="Average Score"
                value={`${stats.averageScore}%`}
                subtitle="+8% improvement"
                color="green"
                trend={8}
              />
              <StatCard
                icon={Clock}
                label="Study Time"
                value={`${stats.studyTime}h`}
                subtitle="This month"
                color="purple"
                trend={5}
              />
              <StatCard
                icon={Award}
                label="Mastery Level"
                value={`${stats.masteryLevel}%`}
                subtitle={stats.rank}
                color="amber"
                trend={12}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
                <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {quickActions.map((action, index) => (
                  <QuickActionCard key={index} action={action} />
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Progress Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2 card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Progress Overview</h2>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg font-medium">
                      Weekly
                    </button>
                    <button className="px-3 py-1 text-sm text-gray-600 rounded-lg font-medium hover:bg-gray-100">
                      Monthly
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name="Test Score %"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="questions" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Questions Attempted"
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-6 mt-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Test Scores</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2" style={{ borderStyle: 'dashed' }}></div>
                    <span className="text-gray-600">Questions Attempted</span>
                  </div>
                </div>
              </motion.div>

              {/* Topic Performance */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Topic Performance</h2>
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topicPerformance}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {topicPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Mastery']}
                        contentStyle={{ 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {topicPerformance.map((topic, index) => (
                    <div key={topic.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: topic.color }}
                        ></div>
                        <span className="font-medium text-gray-700">{topic.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-gray-900">{topic.value}%</span>
                        <span className="text-gray-500 text-xs">({topic.questions} Qs)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-2 card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="space-y-4">
                  {recentActivity.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </motion.div>

              {/* Study Plan & Resources */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-6"
              >
                {/* Today's Study Plan */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Today's Plan</h2>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-4">
                    {studyPlan?.today.map((task, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        task.completed 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-white border-gray-300'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 text-sm mb-1">
                              {task.task}
                            </h3>
                            <div className="flex items-center text-xs text-gray-600 space-x-3">
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {task.subject}
                              </span>
                              <span>{task.duration}</span>
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ml-2 ${
                            task.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}>
                            {task.completed && (
                              <div className="w-1 h-1 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                        {task.priority === 'high' && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              High Priority
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-4 btn-secondary py-2 text-sm">
                    + Add Custom Task
                  </button>
                </div>

                {/* Upcoming Tests */}
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Upcoming Tests</h3>
                  <div className="space-y-3">
                    {studyPlan?.upcoming.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.type === 'test' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {item.type === 'test' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.task}</p>
                            <p className="text-xs text-gray-500">{item.date}</p>
                          </div>
                        </div>
                        <Target className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Motivational Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center"
            >
              <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-8 text-white">
                <div className="max-w-2xl mx-auto">
                  <Star className="w-8 h-8 mx-auto mb-4 text-yellow-300" />
                  <p className="text-xl font-semibold mb-4">
                    "Success is the sum of small efforts, repeated day in and day out."
                  </p>
                  <p className="text-primary-100">
                    You've completed {stats.studyTime} hours of focused study this month. Keep going! 🚀
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;