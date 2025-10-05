import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Brain, TrendingUp, Users, Rocket, 
  Award, Shield, Globe, Star, CheckCircle 
} from 'lucide-react';

const Home = ({ onGetStarted }) => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Learning',
      description: 'Adaptive algorithms that personalize your study plan based on performance'
    },
    {
      icon: TrendingUp,
      title: 'Real-time Analytics',
      description: 'Track progress with detailed insights and performance metrics'
    },
    {
      icon: Users,
      title: 'Expert Tutoring',
      description: '24/7 AI tutor support for instant doubt resolution'
    },
    {
      icon: Rocket,
      title: 'Fast Learning',
      description: 'Master concepts 3x faster with optimized study techniques'
    },
    {
      icon: Award,
      title: 'Exam Focused',
      description: 'Content specifically designed for competitive exam patterns'
    },
    {
      icon: Shield,
      title: 'Quality Content',
      description: 'Curated by subject matter experts and top performers'
    }
  ];

  const exams = [
    { name: 'NEET', students: '2M+', color: 'bg-green-500' },
    { name: 'JEE', students: '1.5M+', color: 'bg-blue-500' },
    { name: 'UPSC', students: '800K+', color: 'bg-purple-500' },
    { name: 'SAT', students: '500K+', color: 'bg-yellow-500' },
    { name: 'GRE', students: '300K+', color: 'bg-red-500' },
    { name: 'IELTS', students: '400K+', color: 'bg-indigo-500' }
  ];

  const stats = [
    { number: '50K+', label: 'Active Students' },
    { number: '95%', label: 'Success Rate' },
    { number: '2.5x', label: 'Faster Learning' },
    { number: '24/7', label: 'AI Support' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
              <Globe className="w-4 h-4 mr-2" />
              Trusted by students in 50+ countries
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Master Competitive Exams with{' '}
              <span className="text-gradient bg-gradient-to-r from-blue-600 to-purple-600">
                AI Tutor
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Personalized adaptive learning platform for NEET, JEE, UPSC, SAT, GRE, IELTS and more. 
              Get AI-powered mock tests, instant doubt solving, and smart study plans.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={onGetStarted}
                className="btn-primary text-lg px-8 py-4 flex items-center group"
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow animation-delay-4000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose AI Global Tutor?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Revolutionize your exam preparation with cutting-edge AI technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="card-hover p-6 text-center group"
              >
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-medium transition-shadow">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Exams Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Supporting 20+ Competitive Exams
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive preparation for all major entrance exams worldwide
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
            {exams.map((exam, index) => (
              <motion.div
                key={exam.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="text-center"
              >
                <div className={`w-20 h-20 ${exam.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-medium`}>
                  <span className="text-white font-bold text-lg">
                    {exam.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {exam.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {exam.students} students
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <button
              onClick={onGetStarted}
              className="btn-primary text-lg px-8 py-4"
            >
              View All Exams
            </button>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in 3 simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Select Your Exam',
                description: 'Choose from 20+ competitive exams and get personalized syllabus'
              },
              {
                step: '02',
                title: 'Take AI Mock Test',
                description: 'AI generates adaptive tests based on your target exam pattern'
              },
              {
                step: '03',
                title: 'Get Smart Tutoring',
                description: 'Receive personalized study plan and AI tutor guidance'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="text-center relative"
              >
                <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform translate-x-1/2"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Preparation?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join 50,000+ students who have improved their scores with AI Global Tutor
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="border border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:bg-opacity-10 transition-colors">
                Schedule Demo
              </button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-blue-100">
              {[
                'No credit card required',
                '7-day free trial',
                'Cancel anytime'
              ].map((item, index) => (
                <div key={item} className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;