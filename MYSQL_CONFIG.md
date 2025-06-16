# MySQL Configuration for SaaS Hospital Management System

## Issue: "Too many connections" error

The error occurs because MySQL has a default limit on concurrent connections. With multiple tenants, this limit can be reached quickly.

## Solution

### 1. **Increase MySQL Connection Limit**

Edit your MySQL configuration file (`my.cnf` or `my.ini`):

```ini
[mysqld]
# Increase maximum connections
max_connections = 500

# Increase connection timeout
wait_timeout = 600
interactive_timeout = 600

# Optimize connection handling
max_connect_errors = 100
connect_timeout = 60

# Connection pool settings
thread_cache_size = 50
table_open_cache = 4096
```

### 2. **Restart MySQL Service**

After editing the configuration:

**Windows:**
```cmd
net stop mysql
net start mysql
```

**Linux:**
```bash
sudo systemctl restart mysql
```

### 3. **Check Current Settings**

Connect to MySQL and run:
```sql
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

### 4. **Monitor Connection Usage**

```sql
-- See current connections
SHOW PROCESSLIST;

-- Check connection statistics
SHOW STATUS LIKE '%connect%';
```

## Code Improvements Made

### 1. **Connection Pooling**
- Added connection pooling with max 5 connections per tenant database
- Configured connection timeouts and retry logic

### 2. **Connection Reuse**
- Cached tenant connections for reuse
- Prevented creating new connections for each request

### 3. **Automatic Cleanup**
- Added idle connection cleanup (30 minutes timeout)
- Cleanup runs every 15 minutes automatically
- Graceful shutdown handling

### 4. **SaaS Database Optimization**
- Added connection limits for SaaS master database
- Configured reconnection and timeout settings

## Environment Variables

Add these to your `.env` file for better connection management:

```env
# Database connection settings
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# SaaS database settings
SAAS_DB_CONNECTION_LIMIT=10
SAAS_DB_ACQUIRE_TIMEOUT=60000
SAAS_DB_TIMEOUT=60000
```

## Monitoring

The system now logs:
- `Reusing existing connection to tenant database: [name]`
- `Connected to new tenant database: [name]`
- `Cleaned up idle connection for database: [name]`
- `Switched to tenant database: [name]`
- `Reset to default database: [name]`

## Best Practices

1. **Regular Monitoring**: Check connection usage regularly
2. **Connection Limits**: Set appropriate limits based on your server capacity
3. **Cleanup**: The automatic cleanup prevents connection leaks
4. **Pooling**: Connection pooling reduces overhead
5. **Graceful Shutdown**: Properly close connections on application shutdown

Your SaaS system should now handle connections much more efficiently! 🚀 