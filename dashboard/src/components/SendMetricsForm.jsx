import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle, XCircle, Loader, Code } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { sendMetrics, sendLogs } from '../utils/api'

const SendMetricsForm = () => {
  const [activeTab, setActiveTab] = useState('metrics')
  const [formData, setFormData] = useState({
    metricName: 'api.response_time',
    metricValue: '125',
    appId: 'demo-app',
    logMessage: 'User action completed',
    logLevel: 'INFO',
  })

  const metricsMutation = useMutation({
    mutationFn: sendMetrics,
  })

  const logsMutation = useMutation({
    mutationFn: sendLogs,
  })

  const handleSendMetric = () => {
    const metrics = [{
      metric: formData.metricName,
      value: parseFloat(formData.metricValue),
      app_id: formData.appId,
      org_id: 'demo',
      tags: {
        source: 'dashboard',
        test: 'true',
      },
    }]

    metricsMutation.mutate(metrics)
  }

  const handleSendLog = () => {
    const logs = [{
      message: formData.logMessage,
      level: formData.logLevel,
      app_id: formData.appId,
      timestamp: Date.now(),
      metadata: {
        source: 'dashboard',
        test: 'true',
      },
    }]

    logsMutation.mutate(logs)
  }

  const isLoading = metricsMutation.isPending || logsMutation.isPending
  const isSuccess = metricsMutation.isSuccess || logsMutation.isSuccess
  const isError = metricsMutation.isError || logsMutation.isError

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Test CloudPulse API
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Send test metrics and logs to your CloudPulse backend
        </p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
          {['metrics', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'metrics' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metric Name
                </label>
                <input
                  type="text"
                  value={formData.metricName}
                  onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                  className="input-field"
                  placeholder="e.g., api.response_time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value
                </label>
                <input
                  type="number"
                  value={formData.metricValue}
                  onChange={(e) => setFormData({ ...formData, metricValue: e.target.value })}
                  className="input-field"
                  placeholder="125"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  App ID
                </label>
                <input
                  type="text"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  className="input-field"
                  placeholder="my-app"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendMetric}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Sending...' : 'Send Metric'}</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Log Message
                </label>
                <textarea
                  value={formData.logMessage}
                  onChange={(e) => setFormData({ ...formData, logMessage: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="User action completed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Log Level
                </label>
                <select
                  value={formData.logLevel}
                  onChange={(e) => setFormData({ ...formData, logLevel: e.target.value })}
                  className="input-field"
                >
                  <option>INFO</option>
                  <option>WARN</option>
                  <option>ERROR</option>
                  <option>DEBUG</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  App ID
                </label>
                <input
                  type="text"
                  value={formData.appId}
                  onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                  className="input-field"
                  placeholder="my-app"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSendLog}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Sending...' : 'Send Log'}</span>
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Response */}
      {(isSuccess || isError) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`card ${
            isSuccess
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
          }`}
        >
          <div className="flex items-start space-x-3">
            {isSuccess ? (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${
                isSuccess
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {isSuccess ? 'Success!' : 'Error'}
              </h4>
              <p className={`text-sm ${
                isSuccess
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {isSuccess
                  ? activeTab === 'metrics'
                    ? `Metric sent successfully! It should appear in DynamoDB within 5-10 seconds.`
                    : `Log sent successfully! It should appear in DynamoDB within 5-10 seconds.`
                  : `Failed to send ${activeTab}. Please check your API connection.`
                }
              </p>
              {isSuccess && (metricsMutation.data || logsMutation.data) && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Code className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Response
                    </span>
                  </div>
                  <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                    {JSON.stringify(
                      metricsMutation.data || logsMutation.data,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* cURL Examples */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          cURL Examples
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send Metrics:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-green-400">
                curl -X POST https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/metrics \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '{`'{"metrics":[{"metric":"test.metric","value":100,"app_id":"my-app"}]}'`}'
              </code>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send Logs:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <code className="text-sm text-green-400">
                curl -X POST https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/logs \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '{`'{"logs":[{"message":"Test log","level":"INFO","app_id":"my-app"}]}'`}'
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SendMetricsForm
