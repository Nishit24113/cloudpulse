# CloudPulse - Quick Start Guide

**Choose your deployment mode and get started in minutes!**

---

## 🎯 Which Mode Should I Use?

**Just want to see the UI?**
→ [Local-Only Mode](#local-only-5-minutes) (No AWS needed)

**Want to test with real AWS backend?**
→ [Backend-Only Mode](#backend-only-10-minutes) (AWS + Local frontend)

**Ready for production deployment?**
→ [Full AWS Mode](#full-aws-15-minutes) (Everything on AWS)

---

## 💻 Local-Only (5 minutes)

**No AWS account required. Perfect for seeing the dashboard UI.**

### Step 1: Install Dependencies
```bash
cd dashboard
npm install
```

### Step 2: Start Dashboard
```bash
node ./node_modules/vite/bin/vite.js
```

### Step 3: Open Browser
```
http://localhost:3002
```

### What Works:
- ✅ Beautiful dashboard UI
- ✅ Interactive charts (mock data)
- ✅ Navigation and animations
- ❌ Send test data (no backend)
- ❌ Real metrics storage

**Perfect for:** UI preview, learning the interface

---

## 🔧 Backend-Only (10 minutes)

**Deploy backend to AWS, run frontend locally. Best for development.**

### Prerequisites:
- AWS account
- AWS CLI configured
- Node.js installed

### Step 1: Deploy Backend
```bash
./deploy-full.sh --mode backend-only --profile YOUR_PROFILE --region us-west-2
```

Wait 5-8 minutes for deployment...

### Step 2: Get API URL
The script will output:
```
Backend API: https://abc123.execute-api.us-west-2.amazonaws.com/v1/
```

### Step 3: Update Frontend Config
```bash
cd dashboard
```

Edit `src/utils/api.js`:
```javascript
const API_BASE_URL = 'https://YOUR-API-URL.amazonaws.com/v1'
```

### Step 4: Start Frontend
```bash
npm install
node ./node_modules/vite/bin/vite.js
```

### Step 5: Test It
1. Open `http://localhost:3002`
2. Click "Send Test Data"
3. Send a metric
4. See success response!

### What Works:
- ✅ Full dashboard UI
- ✅ Send metrics to AWS
- ✅ Send logs to AWS
- ✅ Data stored in DynamoDB
- ✅ Lambda processing
- ⚠️ Frontend only accessible locally

**Perfect for:** Development, testing, learning AWS

**Cost:** $0-2/month with AWS Free Tier

---

## 🚀 Full AWS (15 minutes)

**Production deployment. Everything on AWS, publicly accessible.**

### Prerequisites:
- AWS account
- AWS CLI configured
- Node.js installed

### Step 1: Deploy Everything
```bash
./deploy-full.sh --mode full-aws --profile YOUR_PROFILE --region us-west-2
```

Wait 10-15 minutes...

### Step 2: Access Your Dashboard
The script outputs:
```
Frontend Dashboard: http://cloudpulse-dashboard-123.s3-website-us-west-2.amazonaws.com
Backend API: https://abc123.execute-api.us-west-2.amazonaws.com/v1/
```

### Step 3: Test It
1. Open the Frontend URL
2. Dashboard loads with animations
3. Click "Send Test Data"
4. Send metrics and logs
5. Check DynamoDB for data

### What Works:
- ✅ Everything!
- ✅ Public dashboard access
- ✅ Full backend functionality
- ✅ Production-ready
- ✅ Auto-scaling
- ✅ Data persistence

**Perfect for:** Production, portfolio, public demos

**Cost:** $0-2/month with AWS Free Tier

---

## 🧪 Testing Your Deployment

### Test 1: Health Check
```bash
curl https://YOUR-API-URL.amazonaws.com/v1/health
```

Expected:
```json
{"status": "healthy", "service": "cloudpulse-ingestion"}
```

### Test 2: Send a Metric
```bash
curl -X POST https://YOUR-API-URL.amazonaws.com/v1/metrics \
  -H "Content-Type: application/json" \
  -d '{"metrics":[{"metric":"test","value":100,"app_id":"demo"}]}'
```

Expected:
```json
{
  "status": "accepted",
  "message": "Received 1 metrics",
  "count": 1,
  "message_id": "..."
}
```

### Test 3: Check DynamoDB
```bash
aws dynamodb scan \
  --table-name cloudpulse-metrics \
  --profile YOUR_PROFILE \
  --region us-west-2 \
  --max-items 5
```

You should see your test data!

---

## 🧹 Cleanup (Delete Everything)

**When you're done testing, delete all resources to avoid charges:**

```bash
./deploy-full.sh --destroy --profile YOUR_PROFILE
```

Wait 2-3 minutes...

**Cost after cleanup:** $0

---

## 🎨 Dashboard Features

Once deployed, you can:

### 1. View Metrics Dashboard
- Real-time charts
- CPU, Memory, API metrics
- 24-hour time series
- Beautiful animations

### 2. View Logs
- Filter by level (ERROR, WARN, INFO, DEBUG)
- Search logs
- Time range filters
- Color-coded entries

### 3. Send Test Data
- Send metrics via UI
- Send logs via UI
- See instant API responses
- cURL examples provided

---

## ⚡ Quick Commands Reference

```bash
# Local development (no AWS)
cd dashboard && npm install && node ./node_modules/vite/bin/vite.js

# Deploy backend only
./deploy-full.sh --mode backend-only --profile YOUR_PROFILE --region us-west-2

# Deploy everything to AWS
./deploy-full.sh --mode full-aws --profile YOUR_PROFILE --region us-west-2

# Destroy all resources
./deploy-full.sh --destroy --profile YOUR_PROFILE

# Check deployment status
aws cloudformation describe-stacks --profile YOUR_PROFILE

# View Lambda logs
aws logs tail /aws/lambda/cloudpulse-metrics-ingestion --profile YOUR_PROFILE --follow
```

---

## 📊 What You Get

### Backend (AWS):
- ✅ 3 Lambda functions (Python 3.12, ARM64)
- ✅ API Gateway REST API
- ✅ 4 DynamoDB tables
- ✅ 2 SQS queues
- ✅ S3 bucket for logs
- ✅ CloudWatch logs
- ✅ IAM roles (least-privilege)

### Frontend (Dashboard):
- ✅ React 19 + Vite 8
- ✅ Tailwind CSS 3
- ✅ Framer Motion animations
- ✅ Recharts visualizations
- ✅ Responsive design
- ✅ Real-time updates

### Total Lines of Code: **8,900+**

---

## 💰 Cost Breakdown

**With AWS Free Tier (first 12 months):**
- Lambda: $0 (1M requests free)
- API Gateway: $0 (1M requests free)
- DynamoDB: $0 (25GB free)
- SQS: $0 (1M requests free)
- S3: $0 (5GB free)

**Total: $0-2/month**

**After Free Tier (1M requests/month):**
- Total: ~$15-20/month

**Compare to:**
- Datadog: $270-710/month
- New Relic: $149-549/month

**Savings: 90-97%!**

---

## 🐛 Troubleshooting

### Frontend shows blank screen
- Check browser console for errors
- Verify API URL is correct
- Try clearing browser cache

### API returns "Missing Authentication Token"
- Don't use base URL, use specific endpoints:
  - `/health` (GET)
  - `/metrics` (POST)
  - `/logs` (POST)

### Metrics not appearing in DynamoDB
- Wait 5-10 seconds (SQS processing delay)
- Check Lambda logs for errors
- Verify SQS queue has messages

### Deployment fails
- Check AWS credentials: `aws sts get-caller-identity`
- Verify region is correct
- Check CloudFormation stack events

---

## 📚 More Resources

- **Full Documentation:** See `DEPLOYMENT_MODES.md`
- **API Testing:** See `TEST_CLOUDPULSE.md`
- **Architecture:** See `README.md`
- **GitHub:** https://github.com/Nishit24113/cloudpulse

---

## 🎉 You're All Set!

**CloudPulse is now running. Start monitoring your applications!**

Questions? Check the documentation or open an issue on GitHub.

**Happy monitoring!** 🚀
