# Integration Example: Monitor AI Agent Builder Platform

**Demonstrates CloudPulse universality by monitoring an existing AI platform**

---

## Overview

This guide shows how to integrate CloudPulse with the AI Agent Builder Platform (your CIC work project) with just **3 lines of code**. After integration, you'll automatically track:

- ✅ Bedrock API latency
- ✅ DynamoDB query performance
- ✅ Lambda cold starts
- ✅ Canvas LMS OAuth success rate
- ✅ User activity patterns
- ✅ Error rates by endpoint

---

## Step 1: Install CloudPulse SDK

```bash
pip install cloudpulse
```

---

## Step 2: Initialize CloudPulse (2 lines)

**File:** `services/api/main.py`

```python
# ADD THESE 2 LINES AT THE TOP
from cloudpulse import CloudPulse
monitor = CloudPulse(
    api_key="your-cloudpulse-api-key",
    api_url="https://your-api.execute-api.us-east-1.amazonaws.com/v1",
    app_id="ai-agent-builder",
    org_id="cic-work"
)

# Your existing FastAPI app
app = FastAPI(title="Cintana AI Assistant", version="0.5.0")

# ... rest of your code unchanged ...
```

---

## Step 3: Track Key Operations (Examples)

### **Example 1: Monitor Bedrock API Calls**

```python
@app.post("/api/builder/chat")
async def builder_chat(request: ChatRequest):
    # Track Bedrock latency
    with monitor.trace('bedrock.converse', tags={'model': MODEL_ID}):
        response = bedrock.converse(
            modelId=MODEL_ID,
            messages=messages,
            toolConfig=tool_config
        )
    
    # Track token usage
    usage = response['usage']
    monitor.track_metric('bedrock.input_tokens', usage['inputTokens'], tags={'model': MODEL_ID})
    monitor.track_metric('bedrock.output_tokens', usage['outputTokens'], tags={'model': MODEL_ID})
    
    return response
```

**Now you can see in CloudPulse dashboard:**
- Average Bedrock response time: 2.3s
- Token usage per model: Claude Sonnet 4 = 1,523 tokens/request
- Spikes in latency at 12pm (peak usage time)

---

### **Example 2: Monitor DynamoDB Operations**

```python
def get_agent_config(agent_id: str):
    # Track DynamoDB read latency
    with monitor.trace('dynamodb.get_item', tags={'table': 'agents'}):
        response = agents_table.get_item(
            Key={'PK': f'AGENT#{agent_id}', 'SK': 'CONFIG'}
        )
    
    # Track if agent found
    if 'Item' in response:
        monitor.track_metric('dynamodb.hit', 1, tags={'table': 'agents'})
    else:
        monitor.track_metric('dynamodb.miss', 1, tags={'table': 'agents'})
    
    return response.get('Item')
```

**Dashboard shows:**
- DynamoDB avg latency: 8ms
- Cache hit rate: 87%
- Slow queries (>50ms): /api/knowledge/search

---

### **Example 3: Monitor Canvas OAuth**

```python
@app.get("/api/canvas/oauth/callback")
async def canvas_oauth_callback(code: str, state: str):
    start_time = time.time()
    
    try:
        # Exchange code for token
        token_response = httpx.post(
            f"{CANVAS_BASE_URL}/login/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "client_id": CANVAS_CLIENT_ID,
                "client_secret": CANVAS_CLIENT_SECRET,
                "code": code,
            }
        )
        
        # Track OAuth success
        monitor.track_metric('canvas.oauth.success', 1)
        monitor.track_metric('canvas.oauth.duration', (time.time() - start_time) * 1000)
        
        return RedirectResponse(url=f"{CLOUDFRONT_URL}?canvas_connected=true")
    
    except Exception as e:
        # Track OAuth failure
        monitor.track_metric('canvas.oauth.errors', 1, tags={'error': type(e).__name__})
        monitor.track_log(f"Canvas OAuth failed: {e}", level='ERROR')
        raise
```

**Dashboard shows:**
- OAuth success rate: 94%
- Failed attempts: 6% (mostly "token_expired" errors)
- Average OAuth flow duration: 1.2s

---

### **Example 4: Monitor User Activity**

```python
@app.post("/api/agents/{agent_id}/chat")
async def agent_chat(agent_id: str, request: ChatRequest, user: dict = Depends(get_current_user)):
    # Track user activity
    monitor.track_metric('agent.chat.request', 1, tags={
        'agent_id': agent_id,
        'user_id': user['sub'],
        'org_id': user.get('org_id', 'unknown')
    })
    
    with monitor.trace('agent.chat', tags={'agent_id': agent_id}):
        response = process_agent_chat(agent_id, request)
    
    return response
```

**Dashboard shows:**
- Active users today: 42
- Most used agent: "biology-assistant" (127 chats)
- Peak hours: 10am-12pm, 2pm-4pm

---

### **Example 5: Auto-Instrument All Endpoints (1 Line!)**

For automatic monitoring of ALL endpoints, add this **middleware:**

```python
from cloudpulse.integrations.fastapi import CloudPulseMiddleware

# ADD THIS ONE LINE
app.add_middleware(CloudPulseMiddleware, client=monitor)

# That's it! Now ALL endpoints are automatically tracked:
# - Request count
# - Response time
# - Status codes
# - Error rates
```

---

## Step 4: View Your Dashboard

Open CloudPulse dashboard:

```
https://your-cloudpulse-dashboard.cloudfront.net
```

**You'll see:**

### **1. Real-Time Metrics**
```
┌─────────────────────────────────────────────────┐
│  AI Agent Builder - Live Metrics                │
│                                                  │
│  Active Users: 42        Requests/min: 235      │
│  Agents Created: 127     Error Rate: 0.8%       │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Bedrock API Response Time (p95)         │   │
│  │ [Chart: 2.3s avg, spike at 12pm]       │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Top 5 Slowest Endpoints                  │   │
│  │ 1. /api/builder/chat - 4.2s              │   │
│  │ 2. /api/canvas/import - 3.1s             │   │
│  │ 3. /api/knowledge/search - 1.8s          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### **2. Alert Rules**

Create alerts:

```yaml
Alert: Bedrock Latency Spike
Condition: avg(bedrock.converse.duration) > 5000 for 5 minutes
Action: Send Slack message to #oncall

Alert: OAuth Failure Rate
Condition: sum(canvas.oauth.errors) / sum(canvas.oauth.success) > 0.1
Action: Send email to team@company.com
```

### **3. Log Search**

Search logs:
```
level:ERROR AND message:"Canvas OAuth failed"
```

---

## What This Proves

**✅ CloudPulse is UNIVERSAL:**
- Integrated with AI Agent Builder (AWS Bedrock, FastAPI, DynamoDB) with just 3 lines
- No changes to application logic
- Works with ANY endpoint automatically
- Can monitor external services (Canvas LMS, Bedrock)

**✅ Real Value:**
- Find bottlenecks: Bedrock is slow at 12pm → Need rate limiting
- Track errors: OAuth fails 6% of time → Need better error handling
- Understand users: Peak usage 10am-12pm → Scale Lambdas proactively

---

## Integration Summary

| Effort | Result |
|--------|--------|
| **2 lines** (initialize SDK) | Basic monitoring enabled |
| **1 line** (add middleware) | ALL endpoints auto-tracked |
| **5-10 lines** (custom metrics) | Deep insights into Bedrock, DynamoDB, Canvas |

**Total: 3-13 lines of code to monitor entire platform** ✅

---

## Next Steps

1. **Try it yourself:** Add CloudPulse to AI Agent Builder
2. **Monitor CodeStream AI:** Same pattern, different project
3. **Build dashboards:** Create custom views for your team
4. **Set alerts:** Get notified when things break

**CloudPulse = Universal monitoring that works with ANY application** 🚀
