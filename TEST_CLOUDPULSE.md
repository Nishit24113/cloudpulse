# CloudPulse - AWS Testing Guide

**API Base URL:** https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/

---

## 🧪 Test 1: Health Check

```bash
curl https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/health
```

**Expected Response:**
```json
{"status": "healthy", "service": "cloudpulse-ingestion"}
```

---

## 🧪 Test 2: Send Metrics

```bash
curl -X POST https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": [
      {
        "metric": "cpu.usage",
        "value": 75.5,
        "app_id": "my-app",
        "org_id": "test",
        "tags": {
          "host": "server-1",
          "environment": "production"
        }
      },
      {
        "metric": "memory.usage",
        "value": 8192,
        "app_id": "my-app",
        "tags": {
          "host": "server-1"
        }
      },
      {
        "metric": "api.requests",
        "value": 1,
        "app_id": "my-app",
        "tags": {
          "endpoint": "/users",
          "method": "GET",
          "status": "200"
        }
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "status": "accepted",
  "message": "Received 3 metrics",
  "count": 3,
  "message_id": "<some-uuid>"
}
```

---

## 🧪 Test 3: Send Logs

```bash
curl -X POST https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "message": "User login successful",
        "level": "INFO",
        "app_id": "my-app",
        "timestamp": 1726365600000,
        "metadata": {
          "user_id": "user123",
          "ip": "192.168.1.1"
        }
      },
      {
        "message": "Database connection timeout",
        "level": "ERROR",
        "app_id": "my-app",
        "metadata": {
          "database": "postgres",
          "timeout": 30000
        }
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "status": "accepted",
  "message": "Received 2 logs",
  "count": 2
}
```

---

## 🧪 Test 4: Check DynamoDB Data

Wait 5-10 seconds for SQS processing, then check DynamoDB:

```bash
# Check metrics table
aws dynamodb scan \
  --table-name cloudpulse-metrics \
  --profile sandbox2025 \
  --region us-west-2 \
  --max-items 5

# Check logs table
aws dynamodb scan \
  --table-name cloudpulse-logs-index \
  --profile sandbox2025 \
  --region us-west-2 \
  --max-items 5
```

---

## 🧪 Test 5: Check Lambda Logs

```bash
# Metrics Ingestion Lambda logs
aws logs tail /aws/lambda/cloudpulse-metrics-ingestion \
  --profile sandbox2025 \
  --region us-west-2 \
  --follow

# Metrics Processor Lambda logs
aws logs tail /aws/lambda/cloudpulse-metrics-processor \
  --profile sandbox2025 \
  --region us-west-2 \
  --follow
```

---

## 🧪 Test 6: Check SQS Messages

```bash
# Get queue URL
aws sqs get-queue-url \
  --queue-name cloudpulse-metrics-queue \
  --profile sandbox2025 \
  --region us-west-2

# Check approximate number of messages
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-west-2.amazonaws.com/216989103356/cloudpulse-metrics-queue \
  --attribute-names ApproximateNumberOfMessages \
  --profile sandbox2025 \
  --region us-west-2
```

---

## 🧪 Test 7: End-to-End Python SDK Test

Create a test script:

```python
# test_cloudpulse.py
import requests
import time

API_URL = "https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1"

# Send 10 metrics
for i in range(10):
    response = requests.post(
        f"{API_URL}/metrics",
        json={
            "metrics": [
                {
                    "metric": "test.counter",
                    "value": i,
                    "app_id": "sdk-test",
                    "tags": {"iteration": str(i)}
                }
            ]
        }
    )
    print(f"Metric {i}: {response.status_code} - {response.json()}")
    time.sleep(1)

print("\nAll 10 metrics sent!")
```

Run it:
```bash
python test_cloudpulse.py
```

---

## ✅ What to Verify

1. **Health Check** → Returns `{"status": "healthy"}`
2. **Metrics API** → Returns status "accepted" with message_id
3. **Logs API** → Returns status "accepted"
4. **DynamoDB** → Data appears in cloudpulse-metrics table
5. **Lambda Logs** → Shows successful processing
6. **SQS** → Messages processed (queue should be empty after processing)

---

## 🎯 Success Criteria

✅ API responds to all endpoints  
✅ Metrics are queued in SQS  
✅ Lambda processor runs automatically  
✅ Data written to DynamoDB  
✅ No errors in CloudWatch logs  
✅ End-to-end flow: Client → API → SQS → Lambda → DynamoDB

---

## 🧹 After Testing: Cleanup

When you're satisfied everything works:

```bash
cd /c/Users/nishi/Desktop/Resume_&_projects/cloudpulse/infrastructure
cdk destroy --all --profile sandbox2025 --region us-west-2
```

This will delete all resources and return cost to $0.

---

**Happy Testing!** 🚀
