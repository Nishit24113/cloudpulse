import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Activity, Zap, Clock, Database, Server } from 'lucide-react'

// Generate sample time-series data
const generateTimeSeriesData = () => {
  const data = []
  for (let i = 0; i < 24; i++) {
    data.push({
      time: `${i}:00`,
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      requests: Math.floor(Math.random() * 1000),
      responseTime: Math.random() * 200
    })
  }
  return data
}

const data = generateTimeSeriesData()

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -5 }}
    className="card card-hover"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
          {title}
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {value}
        </p>
        <div className="flex items-center space-x-1">
          <TrendingUp className={`w-4 h-4 ${
            change > 0 ? 'text-green-500' : 'text-red-500'
          }`} />
          <span className={`text-sm font-medium ${
            change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            vs last hour
          </span>
        </div>
      </div>
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        className={`p-3 rounded-lg bg-gradient-to-br ${color}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>
    </div>
  </motion.div>
)

const Dashboard = () => {
  const stats = [
    { title: 'CPU Usage', value: '75.5%', change: 12, icon: Activity, color: 'from-blue-500 to-blue-600' },
    { title: 'Memory Usage', value: '8.2 GB', change: -5, icon: Database, color: 'from-purple-500 to-purple-600' },
    { title: 'API Requests', value: '1.2K', change: 24, icon: Zap, color: 'from-green-500 to-green-600' },
    { title: 'Avg Response', value: '125ms', change: -8, icon: Clock, color: 'from-orange-500 to-orange-600' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Chart */}
        <motion.div variants={itemVariants} className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Resources (24h)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#a855f7" fillOpacity={1} fill="url(#colorMemory)" name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* API Requests Chart */}
        <motion.div variants={itemVariants} className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            API Requests (24h)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="requests" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Response Time Chart */}
        <motion.div variants={itemVariants} className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Response Time (24h)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ fill: '#f97316', r: 4 }}
                name="Response Time (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* System Info */}
      <motion.div variants={itemVariants} className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Information
          </h3>
          <span className="badge badge-success">Operational</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Region</p>
            <p className="font-semibold text-gray-900 dark:text-white">us-west-2</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uptime</p>
            <p className="font-semibold text-gray-900 dark:text-white">99.98%</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lambda Invocations</p>
            <p className="font-semibold text-gray-900 dark:text-white">15.2K</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cost (Today)</p>
            <p className="font-semibold text-gray-900 dark:text-white">$0.02</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Dashboard
