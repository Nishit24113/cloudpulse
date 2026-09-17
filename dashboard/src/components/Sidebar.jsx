import { motion } from 'framer-motion'
import { Activity, BarChart3, FileText, Send } from 'lucide-react'

const Sidebar = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'send', label: 'Send Test Data', icon: Send },
  ]

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-lg"
          >
            <Activity className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              CloudPulse
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Observability Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="card p-4 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Live on AWS
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            us-west-2 • Free Tier
          </p>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center space-x-1 mt-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Operational
            </span>
          </motion.div>
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar
