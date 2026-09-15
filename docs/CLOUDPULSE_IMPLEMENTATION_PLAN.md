# CloudPulse - Complete Implementation Plan

**Date:** September 15, 2026  
**Project:** CloudPulse - Universal Observability Platform  
**Timeline:** 60 hours (8-10 sessions)  
**Target:** 60,000+ lines of production-ready code

---

## 📋 Executive Summary

**What We're Building:**
A universal monitoring platform (like Datadog/New Relic) that can monitor ANY application through simple SDK integration, agents, or auto-instrumentation.

**Why It's Perfect:**
- ✅ **Universal:** Works with ANY app (AI, web, mobile, microservices)
- ✅ **Easy Integration:** 2-3 lines of code OR zero code changes
- ✅ **No Overlap:** Completely different from AI Agent Builder & CodeStream AI
- ✅ **Real Value:** Can monitor your own projects (AI Agent Builder, CodeStream)
- ✅ **Startup Potential:** $10B+ market (proven by Datadog/New Relic)
- ✅ **Tech Stack:** Shows OLD (Spring Boot, PostgreSQL) + NEW (Kinesis, Timestream, serverless)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CloudPulse Platform                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INGESTION LAYER (Receive data from ANY app)             │  │
│  │  ├─ Metrics API (Go Lambda) - StatsD/Prometheus/HTTP    │  │
│  │  ├─ Logs API (Go Lambda) - JSON/Syslog                  │  │
│  │  └─ Traces API (Go Lambda) - OpenTelemetry              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STREAMING LAYER (Real-time processing)                  │  │
│  │  ├─ Kinesis Data Streams (high-throughput)              │  │
│  │  ├─ Lambda Consumers (aggregations, windowing)          │  │
│  │  └─ SQS (async tasks)                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STORAGE LAYER                                           │  │
│  │  ├─ Amazon Timestream (time-series metrics)             │  │
│  │  ├─ DynamoDB (metadata, alerts, users)                  │  │
│  │  ├─ RDS PostgreSQL Serverless (organizations)           │  │
│  │  ├─ S3 (raw logs, archives)                             │  │
│  │  └─ OpenSearch Serverless (log search - optional)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  QUERY LAYER (Dashboards & alerts)                      │  │
│  │  ├─ Metrics Query API (FastAPI Lambda) - PromQL-like   │  │
│  │  ├─ Logs Query API (FastAPI Lambda) - Full-text search │  │
│  │  ├─ Alert Engine (Python Lambda) - Threshold alerts    │  │
│  │  └─ Analytics API (Python Lambda) - Aggregations       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (Dashboards)                                   │  │
│  │  ├─ Admin Dashboard (Next.js) - User management        │  │
│  │  ├─ Metrics Dashboard (React + D3.js) - Charts         │  │
│  │  └─ Logs Explorer (React) - Search & filter            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CLIENT SDKs (For ANY application)                       │  │
│  │  ├─ Python SDK (pip install cloudpulse)                 │  │
│  │  ├─ Node.js SDK (npm install @cloudpulse/node)         │  │
│  │  ├─ Java SDK (Maven/Gradle)                            │  │
│  │  └─ Go SDK (go get)                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: Core Infrastructure (8 hours)

### **Goal:** Set up AWS CDK infrastructure, basic APIs

### **Tasks:**

#### **1.1: Project Structure Setup (1 hour)**
```
cloudpulse/
├── infrastructure/           # AWS CDK (TypeScript)
│   ├── lib/
│   │   ├── ingestion-stack.ts
│   │   ├── storage-stack.ts
│   │   ├── query-stack.ts
│   │   └── frontend-stack.ts
│   ├── bin/
│   │   └── cloudpulse.ts
│   └── package.json
│
├── services/                 # Backend microservices
│   ├── ingestion/           # Go Lambda (metrics, logs, traces)
│   │   ├── metrics-api/
│   │   ├── logs-api/
│   │   └── traces-api/
│   ├── processing/          # Python Lambda (stream processors)
│   │   ├── metrics-processor/
│   │   ├── logs-processor/
│   │   └── aggregator/
│   ├── query/               # FastAPI Lambda (query APIs)
│   │   ├── metrics-query/
│   │   └── logs-query/
│   └── platform/            # Spring Boot Lambda (auth, users)
│       ├── auth-service/
│       └── user-service/
│
├── sdks/                     # Client SDKs
│   ├── python/
│   ├── nodejs/
│   ├── java/
│   └── go/
│
├── frontend/                 # Next.js dashboards
│   ├── apps/
│   │   ├── admin/
│   │   ├── metrics/
│   │   └── logs/
│   └── packages/
│       └── ui/
│
└── docs/                     # Documentation
    ├── architecture.md
    ├── integration-guide.md
    └── api-reference.md
```

#### **1.2: AWS CDK Base Infrastructure (3 hours)**

**Create:** `infrastructure/lib/storage-stack.ts`
```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class StorageStack extends cdk.Stack {
  public readonly metricsTable: timestream.CfnTable;
  public readonly metadataTable: dynamodb.Table;
  public readonly logsTable: dynamodb.Table;
  public readonly alertsTable: dynamodb.Table;
  public readonly logsBucket: s3.Bucket;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB: Metadata (users, orgs, dashboards, alerts)
    this.metadataTable = new dynamodb.Table(this, 'MetadataTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // DynamoDB: Log Index (for fast queries before OpenSearch)
    this.logsTable = new dynamodb.Table(this, 'LogsIndexTable', {
      partitionKey: { name: 'app_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-delete old logs
    });

    // DynamoDB: Alerts
    this.alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      partitionKey: { name: 'org_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'alert_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Amazon Timestream: Metrics (time-series)
    const timestreamDb = new timestream.CfnDatabase(this, 'MetricsDatabase', {
      databaseName: 'cloudpulse_metrics',
    });

    this.metricsTable = new timestream.CfnTable(this, 'MetricsTable', {
      databaseName: timestreamDb.databaseName!,
      tableName: 'metrics',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24', // 24 hours in memory
        magneticStoreRetentionPeriodInDays: '90', // 90 days on disk
      },
    });
    this.metricsTable.addDependency(timestreamDb);

    // S3: Log Archives
    this.logsBucket = new s3.Bucket(this, 'LogsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          transitions: [
            { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(30) },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });
  }
}
```

**Create:** `infrastructure/lib/ingestion-stack.ts`
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IngestionStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Kinesis Stream (for metrics ingestion)
    const metricsStream = new kinesis.Stream(this, 'MetricsStream', {
      shardCount: 1, // Start with 1 shard (FREE tier: $11/month, can use SQS for $0)
      retentionPeriod: cdk.Duration.hours(24),
    });

    // Go Lambda: Metrics Ingestion API
    const metricsApi = new lambda.Function(this, 'MetricsIngestionLambda', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: 'bootstrap',
      code: lambda.Code.fromAsset('services/ingestion/metrics-api/dist'),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        KINESIS_STREAM_NAME: metricsStream.streamName,
      },
    });
    metricsStream.grantWrite(metricsApi);

    // API Gateway (REST API)
    const api = new apigateway.RestApi(this, 'IngestionAPI', {
      restApiName: 'CloudPulse Ingestion API',
      description: 'Universal metrics/logs/traces ingestion',
    });

    // POST /v1/metrics
    const metricsResource = api.root.addResource('v1').addResource('metrics');
    metricsResource.addMethod('POST', new apigateway.LambdaIntegration(metricsApi));

    // Output API URL
    new cdk.CfnOutput(this, 'IngestionAPIUrl', {
      value: api.url,
      description: 'CloudPulse Ingestion API URL',
    });
  }
}
```

**Files to create:**
- ✅ `infrastructure/bin/cloudpulse.ts` - CDK app entry
- ✅ `infrastructure/cdk.json` - CDK config
- ✅ `infrastructure/package.json` - Dependencies
- ✅ `infrastructure/tsconfig.json` - TypeScript config

**Commands:**
```bash
cd infrastructure
npm install
cdk bootstrap --profile <your-profile>
cdk synth
cdk deploy --all --profile <your-profile>
```

**Deliverables:**
- ✅ DynamoDB tables created
- ✅ Amazon Timestream database created
- ✅ Kinesis stream created
- ✅ S3 bucket created
- ✅ Basic API Gateway deployed

---

## 🎯 Phase 2: Ingestion Services (10 hours)

### **Goal:** Build Go Lambda functions to ingest metrics, logs, traces

### **2.1: Metrics Ingestion API (Go) - 4 hours**

**Create:** `services/ingestion/metrics-api/main.go`

```go
package main

import (
    "context"
    "encoding/json"
    "os"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/kinesis"
)

type MetricPoint struct {
    MetricName string            `json:"metric"`
    Value      float64           `json:"value"`
    Timestamp  int64             `json:"timestamp"`
    Tags       map[string]string `json:"tags"`
    AppID      string            `json:"app_id"`
    OrgID      string            `json:"org_id"`
}

type MetricBatch struct {
    Metrics []MetricPoint `json:"metrics"`
}

var kinesisClient *kinesis.Client
var streamName string

func init() {
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        panic(err)
    }
    kinesisClient = kinesis.NewFromConfig(cfg)
    streamName = os.Getenv("KINESIS_STREAM_NAME")
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Parse request body
    var batch MetricBatch
    if err := json.Unmarshal([]byte(request.Body), &batch); err != nil {
        return events.APIGatewayProxyResponse{
            StatusCode: 400,
            Body:       `{"error": "invalid JSON"}`,
        }, nil
    }

    // Validate metrics
    if len(batch.Metrics) == 0 {
        return events.APIGatewayProxyResponse{
            StatusCode: 400,
            Body:       `{"error": "no metrics provided"}`,
        }, nil
    }

    // Send to Kinesis (batch)
    for _, metric := range batch.Metrics {
        data, _ := json.Marshal(metric)
        _, err := kinesisClient.PutRecord(ctx, &kinesis.PutRecordInput{
            StreamName:   &streamName,
            Data:         data,
            PartitionKey: &metric.AppID,
        })
        if err != nil {
            return events.APIGatewayProxyResponse{
                StatusCode: 500,
                Body:       `{"error": "kinesis write failed"}`,
            }, nil
        }
    }

    return events.APIGatewayProxyResponse{
        StatusCode: 202,
        Body:       `{"status": "accepted", "count": ` + string(rune(len(batch.Metrics))) + `}`,
        Headers:    map[string]string{"Content-Type": "application/json"},
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

**Build & Deploy:**
```bash
cd services/ingestion/metrics-api
GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap main.go
zip deployment.zip bootstrap
# CDK will deploy this
```

**Protocols Supported:**
- ✅ HTTP JSON (custom)
- ✅ StatsD (future)
- ✅ Prometheus remote write (future)

**Deliverables:**
- ✅ Go Lambda function (metrics ingestion)
- ✅ API endpoint: `POST /v1/metrics`
- ✅ Kinesis integration
- ✅ Error handling & validation

---

### **2.2: Logs Ingestion API (Go) - 3 hours**

**Create:** `services/ingestion/logs-api/main.go`

```go
package main

import (
    "context"
    "encoding/json"
    "os"
    "time"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
)

type LogEntry struct {
    Timestamp  int64             `json:"timestamp"`
    Level      string            `json:"level"`
    Message    string            `json:"message"`
    AppID      string            `json:"app_id"`
    OrgID      string            `json:"org_id"`
    Tags       map[string]string `json:"tags"`
    Attributes map[string]string `json:"attributes"`
}

type LogBatch struct {
    Logs []LogEntry `json:"logs"`
}

var dynamoClient *dynamodb.Client
var logsTableName string

func init() {
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        panic(err)
    }
    dynamoClient = dynamodb.NewFromConfig(cfg)
    logsTableName = os.Getenv("LOGS_TABLE_NAME")
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    var batch LogBatch
    if err := json.Unmarshal([]byte(request.Body), &batch); err != nil {
        return events.APIGatewayProxyResponse{
            StatusCode: 400,
            Body:       `{"error": "invalid JSON"}`,
        }, nil
    }

    // Write to DynamoDB (for fast queries) + S3 (for archives)
    for _, log := range batch.Logs {
        item, _ := attributevalue.MarshalMap(log)
        _, err := dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
            TableName: &logsTableName,
            Item:      item,
        })
        if err != nil {
            return events.APIGatewayProxyResponse{
                StatusCode: 500,
                Body:       `{"error": "dynamo write failed"}`,
            }, nil
        }
    }

    return events.APIGatewayProxyResponse{
        StatusCode: 202,
        Body:       `{"status": "accepted"}`,
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

**Deliverables:**
- ✅ Go Lambda function (logs ingestion)
- ✅ API endpoint: `POST /v1/logs`
- ✅ DynamoDB storage
- ✅ S3 archival (async via Kinesis Firehose)

---

### **2.3: Traces Ingestion API (Go) - 3 hours**

**Similar structure, accepts OpenTelemetry traces**

**Deliverables:**
- ✅ Go Lambda function (traces ingestion)
- ✅ API endpoint: `POST /v1/traces`
- ✅ OpenTelemetry protocol support

---

## 🎯 Phase 3: Stream Processing (10 hours)

### **Goal:** Process metrics in real-time (aggregations, windowing)

### **3.1: Metrics Stream Processor (Python Lambda) - 5 hours**

**Create:** `services/processing/metrics-processor/handler.py`

```python
import json
import boto3
import os
from datetime import datetime, timedelta

timestream_client = boto3.client('timestream-write')
DATABASE_NAME = os.environ['TIMESTREAM_DATABASE']
TABLE_NAME = os.environ['TIMESTREAM_TABLE']

def lambda_handler(event, context):
    """
    Kinesis Lambda trigger: Process metric records
    Aggregate metrics into 1-minute windows
    Write to Timestream
    """
    records = []
    
    for record in event['Records']:
        # Decode Kinesis record
        payload = json.loads(record['kinesis']['data'])
        
        # Extract metric data
        metric_name = payload['metric']
        value = payload['value']
        timestamp = payload['timestamp']
        app_id = payload['app_id']
        tags = payload.get('tags', {})
        
        # Prepare Timestream record
        dimensions = [
            {'Name': 'app_id', 'Value': app_id},
            {'Name': 'metric_name', 'Value': metric_name}
        ]
        for k, v in tags.items():
            dimensions.append({'Name': k, 'Value': str(v)})
        
        records.append({
            'Dimensions': dimensions,
            'MeasureName': 'value',
            'MeasureValue': str(value),
            'MeasureValueType': 'DOUBLE',
            'Time': str(timestamp),
            'TimeUnit': 'MILLISECONDS'
        })
    
    # Batch write to Timestream
    if records:
        try:
            timestream_client.write_records(
                DatabaseName=DATABASE_NAME,
                TableName=TABLE_NAME,
                Records=records
            )
            print(f"✅ Wrote {len(records)} metrics to Timestream")
        except Exception as e:
            print(f"❌ Timestream write error: {e}")
            raise
    
    return {'statusCode': 200, 'body': 'OK'}
```

**Aggregation Logic:**
- Raw metrics → 1-minute rollups → 5-minute rollups → 1-hour rollups
- Calculate: avg, min, max, p50, p95, p99
- Store in Timestream

**Deliverables:**
- ✅ Python Lambda (Kinesis consumer)
- ✅ Real-time aggregations
- ✅ Timestream write
- ✅ Error handling

---

### **3.2: Alert Evaluation Engine (Python Lambda) - 5 hours**

**Create:** `services/processing/alert-engine/handler.py`

```python
import boto3
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
alerts_table = dynamodb.Table(os.environ['ALERTS_TABLE'])
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    EventBridge trigger every 1 minute
    Evaluate all active alerts
    Check thresholds against Timestream
    Send notifications via SNS/SES
    """
    
    # Get all active alerts
    response = alerts_table.scan(
        FilterExpression='#status = :active',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':active': 'active'}
    )
    
    for alert in response['Items']:
        alert_id = alert['alert_id']
        condition = alert['condition']  # e.g., "avg(cpu_usage) > 80 for 5 minutes"
        
        # Query Timestream for latest metrics
        is_triggered = evaluate_condition(condition)
        
        if is_triggered:
            # Send notification
            send_notification(alert)
            
            # Update alert state
            alerts_table.update_item(
                Key={'org_id': alert['org_id'], 'alert_id': alert_id},
                UpdateExpression='SET last_triggered = :now',
                ExpressionAttributeValues={':now': int(datetime.now().timestamp())}
            )
    
    return {'statusCode': 200}

def evaluate_condition(condition):
    # Parse condition, query Timestream, check threshold
    # Return True if alert should fire
    pass

def send_notification(alert):
    # Send to SNS topic (Email/Slack/PagerDuty)
    sns.publish(
        TopicArn=alert['notification_topic'],
        Subject=f"🚨 Alert: {alert['name']}",
        Message=f"Condition: {alert['condition']}\nTriggered at: {datetime.now()}"
    )
```

**Deliverables:**
- ✅ Alert evaluation engine
- ✅ Threshold alerts
- ✅ SNS/SES notifications
- ✅ EventBridge scheduled trigger

---

## 🎯 Phase 4: Query APIs (FastAPI) - 8 hours

### **Goal:** Build FastAPI Lambda functions for querying metrics/logs

### **4.1: Metrics Query API (FastAPI) - 4 hours**

**Create:** `services/query/metrics-query/main.py`

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import boto3
from datetime import datetime, timedelta

app = FastAPI(title="CloudPulse Metrics Query API")

timestream_client = boto3.client('timestream-query')
DATABASE_NAME = 'cloudpulse_metrics'
TABLE_NAME = 'metrics'

class MetricQueryRequest(BaseModel):
    metric_name: str
    app_id: str
    start_time: int  # Unix timestamp
    end_time: int
    aggregation: str = 'avg'  # avg, sum, max, min, p95, p99
    interval: str = '1m'  # 1m, 5m, 1h, 1d

class MetricDataPoint(BaseModel):
    timestamp: int
    value: float

@app.post("/api/query/metrics")
async def query_metrics(request: MetricQueryRequest):
    """
    Query metrics from Timestream
    Supports PromQL-like queries
    """
    
    # Build Timestream query
    query = f"""
    SELECT 
        BIN(time, {interval_to_seconds(request.interval)}s) as time_bin,
        {request.aggregation}(measure_value::double) as value
    FROM "{DATABASE_NAME}"."{TABLE_NAME}"
    WHERE 
        app_id = '{request.app_id}'
        AND metric_name = '{request.metric_name}'
        AND time BETWEEN from_unixtime({request.start_time}) 
                     AND from_unixtime({request.end_time})
    GROUP BY BIN(time, {interval_to_seconds(request.interval)}s)
    ORDER BY time_bin ASC
    """
    
    try:
        response = timestream_client.query(QueryString=query)
        
        # Parse results
        data_points = []
        for row in response['Rows']:
            timestamp = int(row['Data'][0]['ScalarValue'])
            value = float(row['Data'][1]['ScalarValue'])
            data_points.append(MetricDataPoint(timestamp=timestamp, value=value))
        
        return {
            'metric': request.metric_name,
            'data': data_points,
            'count': len(data_points)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def interval_to_seconds(interval: str) -> int:
    """Convert interval string to seconds"""
    mapping = {'1m': 60, '5m': 300, '1h': 3600, '1d': 86400}
    return mapping.get(interval, 60)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Deploy with Mangum:**
```python
# lambda_handler.py
from mangum import Mangum
from main import app

handler = Mangum(app)
```

**Deliverables:**
- ✅ FastAPI query endpoint
- ✅ Timestream integration
- ✅ PromQL-like query language
- ✅ Aggregation functions

---

### **4.2: Logs Query API (FastAPI) - 4 hours**

**Similar structure, queries DynamoDB/OpenSearch for logs**

**Deliverables:**
- ✅ FastAPI query endpoint
- ✅ Full-text search
- ✅ Structured filters
- ✅ Pagination

---

## 🎯 Phase 5: Platform Services (Spring Boot) - 8 hours

### **Goal:** Auth service, user management (shows OLD tech)

### **5.1: Auth Service (Spring Boot) - 4 hours**

**Create:** `services/platform/auth-service/src/main/java/com/cloudpulse/auth/AuthController.java`

```java
package com.cloudpulse.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

import java.util.Date;

@SpringBootApplication
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String SECRET = System.getenv("JWT_SECRET");
    private static final Algorithm algorithm = Algorithm.HMAC256(SECRET);

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Validate credentials (simplified)
        if (isValidUser(request.getEmail(), request.getPassword())) {
            String token = JWT.create()
                .withSubject(request.getEmail())
                .withExpiresAt(new Date(System.currentTimeMillis() + 86400000)) // 24h
                .withClaim("org_id", "org_123")
                .sign(algorithm);
            
            return ResponseEntity.ok(new AuthResponse(token));
        }
        return ResponseEntity.status(401).body("Invalid credentials");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // Create user in DynamoDB
        // Send verification email
        return ResponseEntity.ok("User registered");
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestHeader("Authorization") String token) {
        try {
            JWT.require(algorithm).build().verify(token.replace("Bearer ", ""));
            return ResponseEntity.ok("Valid token");
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid token");
        }
    }

    private boolean isValidUser(String email, String password) {
        // Check DynamoDB
        return true; // Simplified
    }

    public static void main(String[] args) {
        SpringApplication.run(AuthController.class, args);
    }
}
```

**Build:**
```bash
mvn clean package
# Deploy to Lambda with SnapStart
```

**Deliverables:**
- ✅ Spring Boot auth service
- ✅ JWT generation/validation
- ✅ User registration
- ✅ Password hashing

---

### **5.2: User Service (Spring Boot) - 4 hours**

**User CRUD, organization management, API keys**

**Deliverables:**
- ✅ User management
- ✅ Organization multi-tenancy
- ✅ API key generation
- ✅ RBAC

---

## 🎯 Phase 6: Client SDKs (8 hours)

### **Goal:** Build SDKs for Python, Node.js, Java, Go

### **6.1: Python SDK - 2 hours**

**Create:** `sdks/python/cloudpulse/__init__.py`

```python
import requests
import time
import threading
from typing import Dict, Any, Optional

class CloudPulse:
    """CloudPulse Python SDK - Monitor any Python application"""
    
    def __init__(self, api_key: str, api_url: str = "https://api.cloudpulse.io"):
        self.api_key = api_key
        self.api_url = api_url
        self.metrics_buffer = []
        self.buffer_size = 100
        self._start_flush_thread()
    
    def track_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Track a custom metric"""
        metric = {
            'metric': metric_name,
            'value': value,
            'timestamp': int(time.time() * 1000),
            'tags': tags or {},
            'app_id': self.api_key[:16],  # Derive app_id from key
        }
        self.metrics_buffer.append(metric)
        
        if len(self.metrics_buffer) >= self.buffer_size:
            self._flush_metrics()
    
    def _flush_metrics(self):
        """Send buffered metrics to CloudPulse"""
        if not self.metrics_buffer:
            return
        
        try:
            response = requests.post(
                f"{self.api_url}/v1/metrics",
                json={'metrics': self.metrics_buffer},
                headers={'Authorization': f'Bearer {self.api_key}'},
                timeout=5
            )
            if response.status_code == 202:
                self.metrics_buffer.clear()
        except Exception as e:
            print(f"CloudPulse metric flush error: {e}")
    
    def _start_flush_thread(self):
        """Auto-flush every 10 seconds"""
        def flush_loop():
            while True:
                time.sleep(10)
                self._flush_metrics()
        
        thread = threading.Thread(target=flush_loop, daemon=True)
        thread.start()
    
    # Context manager for tracing
    def trace(self, operation_name: str):
        return Trace(self, operation_name)

class Trace:
    def __init__(self, client: CloudPulse, operation_name: str):
        self.client = client
        self.operation_name = operation_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.time() - self.start_time) * 1000  # ms
        self.client.track_metric(
            f'{self.operation_name}.duration',
            duration,
            tags={'operation': self.operation_name}
        )
        if exc_type:
            self.client.track_metric(
                f'{self.operation_name}.errors',
                1,
                tags={'error_type': exc_type.__name__}
            )
```

**Usage Example:**
```python
# Install: pip install cloudpulse

from cloudpulse import CloudPulse

# Initialize (ONE LINE)
monitor = CloudPulse(api_key="your-api-key")

# Track metrics
monitor.track_metric('api.requests', 1, tags={'endpoint': '/users'})

# Trace operations
with monitor.trace('database_query'):
    result = db.query("SELECT * FROM users")
```

**Publish:**
```bash
cd sdks/python
python setup.py sdist bdist_wheel
twine upload dist/*
```

**Deliverables:**
- ✅ Python SDK (pip installable)
- ✅ Auto-buffering & flushing
- ✅ Context manager for tracing
- ✅ Error handling

---

### **6.2: Node.js SDK - 2 hours**

**Similar structure in TypeScript**

**Usage:**
```javascript
const { CloudPulse } = require('@cloudpulse/node');

const monitor = new CloudPulse({ apiKey: 'your-key' });

monitor.trackMetric('api.requests', 1, { endpoint: '/users' });

// Express middleware
app.use(monitor.middleware());
```

**Deliverables:**
- ✅ Node.js SDK (npm package)
- ✅ Express/Fastify middleware
- ✅ Auto-instrumentation

---

### **6.3: Java SDK - 2 hours**

**Maven package with Spring Boot auto-configuration**

**Deliverables:**
- ✅ Java SDK (Maven Central)
- ✅ Spring Boot starter
- ✅ Auto-configuration

---

### **6.4: Go SDK - 2 hours**

**Go module with http.Handler middleware**

**Deliverables:**
- ✅ Go SDK (go get)
- ✅ HTTP middleware
- ✅ Goroutine-safe

---

## 🎯 Phase 7: Frontend Dashboards (8 hours)

### **Goal:** Build Next.js dashboards with D3.js charts

### **7.1: Metrics Dashboard (React + D3.js) - 4 hours**

**Create:** `frontend/apps/metrics/src/app/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/query/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_name: 'api.response_time',
          app_id: 'demo-app',
          start_time: Date.now() - 3600000, // Last hour
          end_time: Date.now(),
          aggregation: 'avg',
          interval: '1m',
        }),
      });
      const data = await response.json();
      setMetrics(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">CloudPulse Metrics</h1>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

**Features:**
- ✅ Real-time charts (auto-refresh)
- ✅ Multiple metric types (line, bar, heatmap)
- ✅ Time range selector
- ✅ Custom queries

---

### **7.2: Logs Explorer - 2 hours**

**Search UI, filters, log streaming**

---

### **7.3: Admin Dashboard - 2 hours**

**User management, API keys, billing**

---

## 📊 Final Project Structure

```
cloudpulse/                                    Total Lines
├── infrastructure/ (AWS CDK)                  5,000
│   ├── lib/
│   │   ├── storage-stack.ts
│   │   ├── ingestion-stack.ts
│   │   ├── query-stack.ts
│   │   └── frontend-stack.ts
│   └── bin/cloudpulse.ts
│
├── services/                                  30,000
│   ├── ingestion/ (Go)                        8,000
│   │   ├── metrics-api/
│   │   ├── logs-api/
│   │   └── traces-api/
│   ├── processing/ (Python)                   12,000
│   │   ├── metrics-processor/
│   │   ├── alert-engine/
│   │   └── aggregator/
│   ├── query/ (FastAPI)                       10,000
│   │   ├── metrics-query/
│   │   └── logs-query/
│   └── platform/ (Spring Boot)                5,000
│       ├── auth-service/
│       └── user-service/
│
├── sdks/                                      8,000
│   ├── python/                                2,500
│   ├── nodejs/                                2,500
│   ├── java/                                  2,000
│   └── go/                                    1,000
│
├── frontend/                                  12,000
│   ├── apps/
│   │   ├── admin/ (Next.js)                   4,000
│   │   ├── metrics/ (React + D3.js)           5,000
│   │   └── logs/ (React)                      3,000
│   └── packages/ui/
│
├── docs/                                      5,000
│   ├── architecture.md
│   ├── integration-guide.md
│   ├── api-reference.md
│   └── sdk-docs/
│
└── tests/                                     2,000
    ├── unit/
    └── integration/

TOTAL: 62,000 LINES ✅
```

---

## 🚀 Deployment Strategy

### **Phase 1: Core Platform (MVP)**
```bash
# Deploy infrastructure
cd infrastructure
cdk deploy --all

# Deploy ingestion services
cd ../services/ingestion/metrics-api
make deploy

# Deploy processing services
cd ../../processing/metrics-processor
make deploy

# Deploy query APIs
cd ../../query/metrics-query
make deploy

# Deploy frontend
cd ../../../frontend
npm run build
aws s3 sync out/ s3://cloudpulse-frontend
```

### **Phase 2: SDKs Release**
```bash
# Publish Python SDK
cd sdks/python
python setup.py sdist upload

# Publish Node.js SDK
cd ../nodejs
npm publish

# Publish Java SDK
cd ../java
mvn deploy

# Publish Go SDK
cd ../go
git tag v1.0.0
git push --tags
```

---

## 💰 Cost Breakdown (AWS Free Tier)

### **Option 1: Ultra-Minimal ($0/month)**
- ✅ Lambda (1M requests): FREE
- ✅ API Gateway (1M requests): FREE (12 months)
- ✅ DynamoDB (25GB): FREE
- ✅ S3 (5GB): FREE (12 months)
- ✅ CloudFront (50GB): FREE (12 months)
- ✅ SQS (instead of Kinesis): FREE
- ✅ DynamoDB for metrics (instead of Timestream): FREE

**Total: $0/month for 12 months** ✅

### **Option 2: With Streaming ($38/month)**
- FREE: Lambda, API Gateway, DynamoDB, S3, CloudFront
- PAID:
  - Kinesis (1 shard): $11/month
  - Timestream (100K writes): $2/month
  - OpenSearch Serverless: $25/month

**Total: ~$38/month**

---

## ✅ Success Criteria

### **Technical:**
- ✅ 60,000+ lines of production code
- ✅ 15+ microservices
- ✅ 4 client SDKs (Python, Node.js, Java, Go)
- ✅ 3 frontend dashboards
- ✅ 100% serverless (no EC2)
- ✅ AWS Free Tier compatible

### **Functional:**
- ✅ Can monitor ANY application
- ✅ 2-3 lines of code integration
- ✅ Real-time dashboards
- ✅ Alert notifications
- ✅ Log search & analysis

### **Demonstration:**
- ✅ Monitor your own AI Agent Builder Platform
- ✅ Monitor CodeStream AI
- ✅ Show metrics/logs/alerts working
- ✅ Demo SDKs in multiple languages

---

## 🎯 Next Steps

**If you approve this plan, I will:**

1. **Create project structure** (30 mins)
2. **Set up AWS CDK infrastructure** (2 hours)
3. **Build first Go Lambda (metrics API)** (2 hours)
4. **Deploy MVP to AWS** (1 hour)
5. **Test with your AI Agent Builder** (prove universality)

**Total for Day 1: 5-6 hours → Working prototype** ✅

---

**Ready to start building? Say "YES" and I'll begin! 🚀**
