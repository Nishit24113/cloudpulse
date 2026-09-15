/**
 * CloudPulse Node.js SDK
 * Monitor any Node.js/TypeScript application with 2-3 lines of code
 */

import axios, { AxiosInstance } from 'axios';

export interface CloudPulseConfig {
  apiKey: string;
  apiUrl: string;
  appId?: string;
  orgId?: string;
  bufferSize?: number;
  flushInterval?: number;
  autoFlush?: boolean;
}

export interface MetricPoint {
  metric: string;
  value: number;
  timestamp?: number;
  app_id?: string;
  org_id?: string;
  tags?: Record<string, string>;
}

export interface LogEntry {
  message: string;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  timestamp?: number;
  app_id?: string;
  org_id?: string;
  tags?: Record<string, string>;
  attributes?: Record<string, any>;
}

export class CloudPulse {
  private apiKey: string;
  private apiUrl: string;
  private appId: string;
  private orgId: string;
  private bufferSize: number;
  private flushInterval: number;
  private autoFlush: boolean;

  private metricsBuffer: MetricPoint[] = [];
  private logsBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private httpClient: AxiosInstance;

  constructor(config: CloudPulseConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.appId = config.appId || this.generateAppId();
    this.orgId = config.orgId || 'default';
    this.bufferSize = config.bufferSize || 100;
    this.flushInterval = config.flushInterval || 10000; // 10 seconds
    this.autoFlush = config.autoFlush !== false;

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    // Start auto-flush
    if (this.autoFlush) {
      this.startFlushTimer();
    }

    console.log('✅ CloudPulse initialized (Node.js SDK)');
  }

  /**
   * Track a custom metric
   */
  trackMetric(
    metricName: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    const metric: MetricPoint = {
      metric: metricName,
      value,
      timestamp: Date.now(),
      app_id: this.appId,
      org_id: this.orgId,
      tags: tags || {},
    };

    this.metricsBuffer.push(metric);

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }
  }

  /**
   * Track a log entry
   */
  trackLog(
    message: string,
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'INFO',
    tags?: Record<string, string>,
    attributes?: Record<string, any>
  ): void {
    const log: LogEntry = {
      message,
      level,
      timestamp: Date.now(),
      app_id: this.appId,
      org_id: this.orgId,
      tags: tags || {},
      attributes: attributes || {},
    };

    this.logsBuffer.push(log);
  }

  /**
   * Trace an operation (returns a promise)
   */
  async trace<T>(
    operationName: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.trackMetric(`${operationName}.duration`, duration, tags);
      this.trackMetric(`${operationName}.success`, 1, tags);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.trackMetric(`${operationName}.duration`, duration, tags);
      this.trackMetric(`${operationName}.errors`, 1, {
        ...tags,
        error: error instanceof Error ? error.name : 'Unknown',
      });

      throw error;
    }
  }

  /**
   * Trace a synchronous operation
   */
  traceSync<T>(
    operationName: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = Date.now();

    try {
      const result = fn();
      const duration = Date.now() - startTime;

      this.trackMetric(`${operationName}.duration`, duration, tags);
      this.trackMetric(`${operationName}.success`, 1, tags);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.trackMetric(`${operationName}.duration`, duration, tags);
      this.trackMetric(`${operationName}.errors`, 1, {
        ...tags,
        error: error instanceof Error ? error.name : 'Unknown',
      });

      throw error;
    }
  }

  /**
   * Express/Fastify middleware
   */
  middleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      // Track request
      this.trackMetric('http.requests', 1, {
        method: req.method,
        path: req.path || req.url,
      });

      // Wrap res.end to track response
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;

        this.trackMetric('http.response_time', duration, {
          method: req.method,
          path: req.path || req.url,
          status: String(res.statusCode),
        });

        if (res.statusCode >= 400) {
          this.trackMetric('http.errors', 1, {
            method: req.method,
            path: req.path || req.url,
            status: String(res.statusCode),
          });
        }

        return originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Manually flush all buffered data
   */
  async flush(): Promise<void> {
    await Promise.all([
      this.flushMetrics(),
      this.flushLogs(),
    ]);
  }

  /**
   * Flush metrics to CloudPulse API
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await this.httpClient.post('/metrics', {
        metrics: metricsToSend,
      });

      console.log(`✅ CloudPulse: Sent ${metricsToSend.length} metrics`);
    } catch (error) {
      console.error('❌ CloudPulse: Failed to send metrics', error);
      // Re-add to buffer for retry
      this.metricsBuffer.push(...metricsToSend);
    }
  }

  /**
   * Flush logs to CloudPulse API
   */
  private async flushLogs(): Promise<void> {
    if (this.logsBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logsBuffer];
    this.logsBuffer = [];

    try {
      await this.httpClient.post('/logs', {
        logs: logsToSend,
      });

      console.log(`✅ CloudPulse: Sent ${logsToSend.length} logs`);
    } catch (error) {
      console.error('❌ CloudPulse: Failed to send logs', error);
      // Re-add to buffer for retry
      this.logsBuffer.push(...logsToSend);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.flushInterval);

    // Don't keep process alive
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Stop auto-flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Generate app ID from API key
   */
  private generateAppId(): string {
    return `app-${this.apiKey.substring(0, 16)}`;
  }
}

/**
 * Decorator for automatic method tracing (TypeScript)
 */
export function Trace(metricName?: string, tags?: Record<string, string>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Access CloudPulse instance from 'this.monitor' or global
      const monitor = (this as any).monitor || (global as any).cloudpulse;

      if (!monitor) {
        return originalMethod.apply(this, args);
      }

      return monitor.trace(name, () => originalMethod.apply(this, args), tags);
    };

    return descriptor;
  };
}

// Export types
export default CloudPulse;
