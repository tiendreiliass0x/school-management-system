import { Context } from 'hono'

/**
 * Audit event types for security monitoring
 */
export enum AuditEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  
  // Authorization Events
  ACCESS_DENIED = 'access_denied',
  PERMISSION_ESCALATION = 'permission_escalation',
  
  // Data Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  SCHOOL_CREATED = 'school_created',
  SCHOOL_UPDATED = 'school_updated',
  SCHOOL_DELETED = 'school_deleted',
  
  // Security Events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  TOKEN_REVOKED = 'token_revoked',
  INVALID_TOKEN = 'invalid_token',
  
  // System Events
  DATA_EXPORT = 'data_export',
  BULK_OPERATION = 'bulk_operation',
  CONFIG_CHANGE = 'config_change',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string
  timestamp: Date
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string
  userEmail?: string
  userRole?: string
  schoolId?: string
  ipAddress: string
  userAgent: string
  resource?: string
  action?: string
  details: Record<string, any>
  metadata?: Record<string, any>
  success: boolean
  errorMessage?: string
}

/**
 * Audit logger configuration
 */
interface AuditLoggerConfig {
  enableConsoleLogging: boolean
  enableFileLogging: boolean
  enableDatabaseLogging: boolean
  logFilePath?: string
  maxLogFileSize?: number
  retentionDays?: number
}

/**
 * Comprehensive audit logging system
 */
export class AuditLogger {
  private config: AuditLoggerConfig
  private logBuffer: AuditLogEntry[] = []

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableFileLogging: process.env.NODE_ENV === 'production',
      enableDatabaseLogging: true,
      logFilePath: './logs/audit.log',
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      retentionDays: 90,
      ...config,
    }
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    }

    // Add to buffer for batch processing
    this.logBuffer.push(auditEntry)

    // Process logs based on configuration
    if (this.config.enableConsoleLogging) {
      this.logToConsole(auditEntry)
    }

    if (this.config.enableFileLogging) {
      await this.logToFile(auditEntry)
    }

    if (this.config.enableDatabaseLogging) {
      await this.logToDatabase(auditEntry)
    }

    // Flush buffer if it gets too large
    if (this.logBuffer.length > 100) {
      await this.flushBuffer()
    }
  }

  /**
   * Helper method to create audit log from Hono context
   */
  async logFromContext(
    c: Context,
    eventType: AuditEventType,
    severity: AuditSeverity,
    options: {
      success?: boolean
      resource?: string
      action?: string
      details?: Record<string, any>
      errorMessage?: string
    } = {}
  ): Promise<void> {
    const user = c.get('user')
    const ipAddress = this.getClientIp(c)
    const userAgent = c.req.header('user-agent') || 'Unknown'

    await this.log({
      eventType,
      severity,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      schoolId: user?.schoolId,
      ipAddress,
      userAgent,
      resource: options.resource || c.req.path,
      action: options.action || c.req.method,
      details: options.details || {},
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    })
  }

  /**
   * Log authentication events
   */
  async logAuth(
    type: 'login' | 'logout' | 'password_change' | 'token_refresh',
    context: {
      userId?: string
      email?: string
      ipAddress: string
      userAgent: string
      success: boolean
      errorMessage?: string
      details?: Record<string, any>
    }
  ): Promise<void> {
    const eventTypeMap = {
      login: AuditEventType.LOGIN_SUCCESS,
      logout: AuditEventType.LOGOUT,
      password_change: AuditEventType.PASSWORD_CHANGE,
      token_refresh: AuditEventType.TOKEN_REFRESH,
    }

    const eventType = context.success 
      ? eventTypeMap[type] 
      : (type === 'login' ? AuditEventType.LOGIN_FAILED : eventTypeMap[type])

    const severity = context.success 
      ? (type === 'password_change' ? AuditSeverity.MEDIUM : AuditSeverity.LOW)
      : AuditSeverity.HIGH

    await this.log({
      eventType,
      severity,
      userId: context.userId,
      userEmail: context.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: '/api/auth',
      action: type.toUpperCase(),
      details: context.details || {},
      success: context.success,
      errorMessage: context.errorMessage,
    })
  }

  /**
   * Log security events
   */
  async logSecurity(
    eventType: AuditEventType,
    context: {
      userId?: string
      ipAddress: string
      userAgent: string
      resource?: string
      details: Record<string, any>
      severity?: AuditSeverity
    }
  ): Promise<void> {
    await this.log({
      eventType,
      severity: context.severity || AuditSeverity.HIGH,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: context.resource,
      details: context.details,
      success: false,
    })
  }

  /**
   * Log data manipulation events
   */
  async logDataEvent(
    action: 'create' | 'update' | 'delete',
    resource: string,
    context: {
      userId: string
      userEmail?: string
      userRole?: string
      schoolId?: string
      ipAddress: string
      userAgent: string
      resourceId?: string
      oldData?: Record<string, any>
      newData?: Record<string, any>
      success: boolean
      errorMessage?: string
    }
  ): Promise<void> {
    const eventTypeMap = {
      create: resource.includes('user') ? AuditEventType.USER_CREATED : AuditEventType.SCHOOL_CREATED,
      update: resource.includes('user') ? AuditEventType.USER_UPDATED : AuditEventType.SCHOOL_UPDATED,
      delete: resource.includes('user') ? AuditEventType.USER_DELETED : AuditEventType.SCHOOL_DELETED,
    }

    await this.log({
      eventType: eventTypeMap[action],
      severity: action === 'delete' ? AuditSeverity.HIGH : AuditSeverity.MEDIUM,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      schoolId: context.schoolId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource,
      action: action.toUpperCase(),
      details: {
        resourceId: context.resourceId,
        oldData: context.oldData,
        newData: context.newData,
      },
      success: context.success,
      errorMessage: context.errorMessage,
    })
  }

  /**
   * Get client IP address from context
   */
  private getClientIp(c: Context): string {
    return c.env?.CF_CONNECTING_IP || 
           c.req.header('x-forwarded-for') || 
           c.req.header('x-real-ip') || 
           'unknown'
  }

  /**
   * Generate unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log to console (development)
   */
  private logToConsole(entry: AuditLogEntry): void {
    const color = this.getSeverityColor(entry.severity)
    const prefix = `🔒 [AUDIT]`
    
    console.log(
      `${color}${prefix} ${entry.timestamp.toISOString()} | ${entry.eventType} | ${entry.severity} | ${entry.userId || 'anonymous'} | ${entry.ipAddress}\x1b[0m`
    )
    
    if (entry.details && Object.keys(entry.details).length > 0) {
      console.log(`   Details:`, entry.details)
    }
    
    if (!entry.success && entry.errorMessage) {
      console.log(`   Error: ${entry.errorMessage}`)
    }
  }

  /**
   * Log to file (production)
   */
  private async logToFile(entry: AuditLogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n'
      
      // In a real implementation, you'd use fs.appendFile or a logging library
      // For now, we'll just simulate this
      if (process.env.NODE_ENV === 'production') {
        // await fs.appendFile(this.config.logFilePath!, logLine)
      }
    } catch (error) {
      console.error('Failed to write audit log to file:', error)
    }
  }

  /**
   * Log to database (all environments)
   */
  private async logToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // In a real implementation, you'd save to an audit_logs table
      // For now, we'll store in memory or use a separate audit database
      console.log(`📝 [DB AUDIT] ${entry.eventType} by ${entry.userId || 'anonymous'}`)
    } catch (error) {
      console.error('Failed to write audit log to database:', error)
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: AuditSeverity): string {
    const colors = {
      [AuditSeverity.LOW]: '\x1b[32m',      // Green
      [AuditSeverity.MEDIUM]: '\x1b[33m',   // Yellow
      [AuditSeverity.HIGH]: '\x1b[31m',     // Red
      [AuditSeverity.CRITICAL]: '\x1b[35m', // Magenta
    }
    return colors[severity] || '\x1b[37m' // White default
  }

  /**
   * Flush log buffer
   */
  private async flushBuffer(): Promise<void> {
    // Process any buffered logs
    this.logBuffer = []
  }

  /**
   * Clean up old logs (for maintenance)
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays!)
    
    // In a real implementation, you'd clean up old log files and database entries
    console.log(`🧹 Cleaning up audit logs older than ${cutoffDate.toISOString()}`)
  }
}

// Create singleton instance
export const auditLogger = new AuditLogger()
export default auditLogger
