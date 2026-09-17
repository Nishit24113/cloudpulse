import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  BarChart3,
  FileText,
  Send,
  TrendingUp,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import LogsView from './components/LogsView'
import SendMetricsForm from './components/SendMetricsForm'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

function App() {
  const [activeView, setActiveView] = useState('dashboard')

  const views = {
    dashboard: <Dashboard />,
    logs: <LogsView />,
    send: <SendMetricsForm />,
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-800">
      {/* Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {views[activeView]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
