import { motion } from 'framer-motion'
import { CheckCircle, Bell, Code } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { checkHealth } from '../utils/api'

const Header = () => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const isHealthy = health?.status === 'healthy'

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h2>

          {/* Health Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
              isHealthy
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {isLoading ? (
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            ) : (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle className={`w-4 h-4 ${
                  isHealthy ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`} />
              </motion.div>
            )}
            <span className={`text-sm font-medium ${
              isHealthy
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {isLoading ? 'Checking...' : isHealthy ? 'API Healthy' : 'API Down'}
            </span>
          </motion.div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>

          {/* GitHub Link */}
          <motion.a
            href="https://github.com/Nishit24113/cloudpulse"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Code className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.a>

          {/* AWS Status */}
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              AWS us-west-2
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
