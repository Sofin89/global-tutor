import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, ComposedChart,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  TrendingUp, Award, Clock, Target, Brain,
  BookOpen, CheckCircle, XCircle, Calendar,
  Download, Share2, Filter, ArrowUp, ArrowDown
} from 'lucide-react';

const Analytics = ({ user }) => {
  const [timeRange, setTimeRange] = useState('month');
  const [stats, setStats] = useState({});
  const [performanceData, setPerformanceData] = useState([]);
  const [topicAnalysis, setTopicAnalysis] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    // Mock analytics data
    const statsData = {
      totalTests: 24,
      averageScore: 76,
      studyHours: 42,
      accuracy: 82,
      improvement: 8,
      streak: 7,
      rank: 'Top 15%'
    };

    const performanceData = [
      { week: 'W1', score: 65, questions: 50, time: 12 },
      { week: 'W2', score: 68, questions: 65, time: 15 },
      { week: 'W3', score: 72, questions: 80, time: 18 },
      { week: 'W4', score: 76, questions: 95, time: 20 },
      { week: 'W5', score: 79, questions: 110, time: 22 },
      { week: 'W6', score: 82, questions: 125, time: 25 }
    ];

    const topicAnalysisData = [
      { subject: 'Physics', score: 75, accuracy: 78, timeSpent: 15, trend: 5 },
      { subject: 'Chemistry', score: 72, accuracy: 75, timeSpent: 12, trend: 8 },
      { subject: 'Biology', score: 82, accuracy: 85, timeSpent: 15, trend: 12 },
      { subject: 'Mathematics', score: 68, accuracy: 70, timeSpent: 10, trend: 3 }
    ];

    setStats(statsData);
    setPerformanceData(performanceData);
    setTopicAnalysis(topicAnalysisData);
  };

  const radarData = [
    { subject: 'Speed', A: 80, fullMark: 100 },
    { subject: 'Accuracy', A: 85, fullMark: 100 },
    { subject: 'Consistency', A: 75, fullMark: 100 },
    { subject: 'Coverage', A: 70, fullMark: 100 },
    { subject: 'Difficulty', A: 65, fullMark: 100 }
  ];

  const timeDistribution = [
    { range: '0-30s', count: 120, percentage: 40 },
    { range: '30-60s', count: 90, percentage: 30 },
    { range: '1-2m', count: 60, percentage: 20 },
    { range: '2m+', count: 30, percentage: 10 }
  ];

  const StatCard = ({ icon: Icon, label, value, change, color = 'blue' }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-1 text-sm ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </motion.div>
  );

  const TopicRow = ({ topic }) => (
    <motion.div
      whileHover={{ backgroundColor: '#F9FAFB' }}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-3 h-3 rounded-full ${
          topic.trend >= 5 ? 'bg-green-500' :
          topic.trend >= 0 ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <div>
          <h4 className="font-semibold text-gray-900">{topic.subject}</h4>
          <p className="text-sm text-gray-600">{topic.timeSpent} hours spent</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="text-right">
          <div className="font-semibold text-gray-900">{topic.score}%</div>
          <div className="text-sm text-gray-600">Score</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-gray-900">{topic.accuracy}%</div>
          <div className="text-sm text-gray-600">Accuracy</div>
        </div>
        <div className={`flex items-center text-sm ${
          topic.trend >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {topic.trend >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
          {Math.abs(topic.trend)}%
        </div>
      </div>
    </motion.div>
  );

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
              <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
              <p className="text-gray-600 mt-2">
                Detailed insights into your learning progress and performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input pr-8"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last Year</option>
              </select>
              <button className="btn-secondary flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
              <button className="btn-secondary flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            icon={Award}
            label="Average Score"
            value={`${stats.averageScore}%`}
            change={stats.improvement}
            color="green"
          />
          <StatCard
            icon={BookOpen}
            label="Total Tests"
            value={stats.totalTests}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Study Hours"
            value={stats.studyHours}
            color="purple"
          />
          <StatCard
            icon={Target}
            label="Accuracy"
            value={`${stats.accuracy}%`}
            color="orange"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Performance Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Performance Trend</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                  Score
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                  Questions
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="right"
                    dataKey="questions" 
                    fill="#10B981" 
                    name="Questions Attempted"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="Test Score"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Skill Radar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Skill Analysis</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Your Performance"
                    dataKey="A"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Topic Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Topic Performance</h2>
            <button className="text-primary-600 font-medium text-sm">
              View Detailed Report
            </button>
          </div>
          
          <div className="space-y-3">
            {topicAnalysis.map((topic, index) => (
              <TopicRow key={topic.subject} topic={topic} />
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Time Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Time Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="count" 
                    fill="#8B5CF6" 
                    radius={[4, 4, 0, 0]}
                    name="Number of Questions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">AI Recommendations</h2>
            <div className="space-y-4">
              <div className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Brain className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Focus on Organic Chemistry
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Your performance in reaction mechanisms needs improvement. 
                    Practice 15 questions daily for the next week.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-green-50 rounded-lg border border-green-200">
                <Target className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    Improve Time Management
                  </h4>
                  <p className="text-green-800 text-sm">
                    You're spending too much time on difficult questions. 
                    Practice skipping and revisiting strategy.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-purple-50 rounded-lg border border-purple-200">
                <TrendingUp className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 mb-1">
                    Revision Schedule
                  </h4>
                  <p className="text-purple-800 text-sm">
                    Schedule weekly revisions for Thermodynamics and Genetics 
                    to maintain 85%+ accuracy.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;