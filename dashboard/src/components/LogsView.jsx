import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, XCircle, Info, Clock } from 'lucide-react'

// Sample log data
const sampleLogs = [
  { id: 1, level: 'INFO', message: 'User login successful', timestamp: new Date(), metadata: { user: 'john@example.com' } },
  { id: 2, level: 'WARN', message: 'High memory usage detected', timestamp: new Date(Date.now() - 300000), metadata: { usage: '85%' } },
  { id: 3, level: 'ERROR', message: 'Database connection timeout', timestamp: new Date(Date.now() - 600000), metadata: { db: 'postgres', timeout: '30s' } },
  { id: 4, level: 'INFO', message: 'API request completed', timestamp: new Date(Date.now() - 900000), metadata: { endpoint: '/api/users', status: 200 } },
  { id: 5, level: 'DEBUG', message: 'Cache invalidated', timestamp: new Date(Date.now() - 1200000), metadata: { cache: 'redis', key: 'user:123' } },
]

const levelConfig = {
  ERROR: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  WARN: { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  INFO: { icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  DEBUG: { icon: Info, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
}

const LogEntry = ({ log, index }) => {
  const config = levelConfig[log.level] || levelConfig.INFO
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card hover:shadow-xl transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start space-x-4">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className={`badge ${config.bg} ${config.color}`}>
              {log.level}
            </span>
            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{log.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-2">
            {log.message}
          </p>
          {log.metadata && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const LogsView = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Application Logs
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time log stream from your applications
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
        >
          Refresh Logs
        </motion.button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <select className="input-field">
            <option>All Levels</option>
            <option>ERROR</option>
            <option>WARN</option>
            <option>INFO</option>
            <option>DEBUG</option>
          </select>
          <select className="input-field">
            <option>Last Hour</option>
            <option>Last 6 Hours</option>
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
          </select>
          <input
            type="text"
            placeholder="Search logs..."
            className="input-field flex-1"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: '24.5K', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Errors', value: '42', color: 'text-red-600 dark:text-red-400' },
          { label: 'Warnings', value: '128', color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Info', value: '24.3K', color: 'text-green-600 dark:text-green-400' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02, y: -2 }}
            className="card"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Log Entries */}
      <div className="space-y-4">
        {sampleLogs.map((log, index) => (
          <LogEntry key={log.id} log={log} index={index} />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-secondary"
        >
          Load More Logs
        </motion.button>
      </div>
    </div>
  )
}

export default LogsView
