# CloudPulse Deployment Modes

CloudPulse supports **4 deployment modes** to fit different use cases, from full production AWS deployment to local development.

---

## 📊 Deployment Modes Comparison

| Feature | Full AWS | Backend Only | Local + AWS | Local Only |
|---------|----------|--------------|-------------|------------|
| **Frontend Hosting** | S3 + CloudFront | Local dev server | Local dev server | Local dev server |
| **Backend API** | Lambda + API Gateway | Lambda + API Gateway | Local (optional) | Local mock |
| **Data Storage** | DynamoDB | DynamoDB | DynamoDB | In-memory mock |
| **Message Queue** | SQS | SQS | SQS | None |
| **Metrics Processing** | Lambda (async) | Lambda (async) | Manual/None | None |
| **Cost** | $0-2/month | $0-2/month | $0-1/month | $0 |
| **Setup Time** | 10 minutes | 5 minutes | 2 minutes | 1 minute |
| **Production Ready** | ✅ Yes | ⚠️  Partial | ❌ No | ❌ No |
| **Good For** | Production | Development | Testing | Demo/Learning |

---

## 🚀 Mode 1: Full AWS Deployment

**Deploy both backend + frontend to AWS for production use.**

### What Gets Deployed:
- ✅ Backend: Lambda functions, API Gateway, DynamoDB, SQS
- ✅ Frontend: S3 bucket with static website hosting
- ✅ All AWS services configured and connected
- ✅ Auto-scaling enabled
- ✅ Production-ready architecture

### Command:
```bash
./deploy-full.sh --mode full-aws --profile sandbox2025 --region us-west-2
```

### After Deployment:
- Backend API: `https://<api-id>.execute-api.us-west-2.amazonaws.com/v1/`
- Frontend: `http://<bucket-name>.s3-website-us-west-2.amazonaws.com`
- Cost: **$0-2/month** (with AWS Free Tier)

### Features Available:
- ✅ Real-time metrics ingestion
- ✅ Log storage and retrieval
- ✅ Async message processing
- ✅ Auto-scaling Lambda functions
- ✅ Global CDN (if using CloudFront)
- ✅ Data persistence (DynamoDB)
- ✅ TTL auto-cleanup

### Best For:
- Production deployments
- Public demos
- Portfolio projects
- Real-world usage

---

## 🔧 Mode 2: Backend-Only Deployment

**Deploy backend to AWS, run frontend locally for development.**

### What Gets Deployed:
- ✅ Backend: Lambda, API Gateway, DynamoDB, SQS
- ⚠️  Frontend: Runs on `localhost:3002`

### Command:
```bash
./deploy-full.sh --mode backend-only --profile sandbox2025 --region us-west-2
```

### After Deployment:
1. Backend is live on AWS
2. Update `dashboard/src/utils/api.js`:
   ```javascript
   const API_BASE_URL = 'https://your-api-url.amazonaws.com/v1'
   ```
3. Run frontend locally:
   ```bash
   cd dashboard
   npm install
   node ./node_modules/vite/bin/vite.js
   ```
4. Open `http://localhost:3002`

### Features Available:
- ✅ Real-time metrics ingestion
- ✅ Log storage (AWS)
- ✅ Async processing (AWS Lambda)
- ✅ Hot reload for frontend changes
- ⚠️  Frontend not publicly accessible

### Best For:
- Active development
- Testing backend changes
- UI/UX development
- Cost optimization (no S3 hosting)

### Cost: **$0-2/month**

---

## 🏠 Mode 3: Local with AWS Credentials

**Run backend + frontend locally, but use AWS services for storage.**

### What Gets Deployed:
- ⚠️  Backend: Local API server (you need to set this up)
- ⚠️  Frontend: Local dev server
- ✅ Data Storage: DynamoDB (AWS)
- ✅ Message Queue: SQS (AWS)

### Setup:
1. Deploy minimal AWS resources:
   ```bash
   ./deploy-full.sh --mode backend-only --profile sandbox2025
   ```
2. Configure AWS credentials locally:
   ```bash
   aws configure --profile sandbox2025
   ```
3. Run frontend:
   ```bash
   cd dashboard
   npm install
   node ./node_modules/vite/bin/vite.js
   ```

### Features Available:
- ✅ Frontend dashboard (full UI)
- ✅ DynamoDB storage
- ✅ SQS queues
- ⚠️  Manual Lambda triggers (no auto-processing)
- ⚠️  No API Gateway routing

### Best For:
- Testing AWS integrations
- Developing locally with real data
- Learning AWS SDK usage
- Debugging data flows

### Cost: **$0-1/month** (minimal AWS usage)

---

## 💻 Mode 4: Local-Only (No AWS)

**Run everything locally with mock data - no AWS required.**

### What Gets Deployed:
- ⚠️  Frontend: Local dev server with mock data
- ❌ Backend: No real backend
- ❌ Storage: In-memory mock
- ❌ Processing: None

### Command:
```bash
./deploy-full.sh --mode local-only
```

Or manually:
```bash
cd dashboard
npm install
node ./node_modules/vite/bin/vite.js
```

Open `http://localhost:3002`

### Features Available:
- ✅ Frontend dashboard UI
- ✅ Interactive charts
- ✅ Mock data visualization
- ❌ No real metrics storage
- ❌ No API calls
- ❌ No data persistence
- ❌ No Lambda processing

### Limitations:
- **Send Test Data** - Will show errors (no API)
- **Real-time updates** - Uses static mock data
- **Data persistence** - Nothing is saved
- **Charts** - Show sample/demo data only

### Best For:
- UI/UX previews
- Learning the dashboard interface
- Quick demos without AWS account
- Frontend development (styling, layout)

### Cost: **$0** (no AWS resources)

---

## 🧹 Destroying Resources

To delete all AWS resources and return cost to $0:

```bash
./deploy-full.sh --destroy --profile sandbox2025
```

This will:
- Delete all Lambda functions
- Delete DynamoDB tables
- Delete SQS queues
- Delete API Gateway
- Delete S3 bucket (if using full-aws mode)
- Delete all IAM roles

**Time:** ~3 minutes  
**Cost after:** $0

---

## 📈 Deployment Mode Decision Tree

```
Do you need public access?
├─ Yes → Full AWS Deployment (Mode 1)
└─ No
   └─ Do you need real data storage?
      ├─ Yes → Backend-Only Deployment (Mode 2)
      └─ No
         └─ Do you have AWS credentials?
            ├─ Yes → Local with AWS (Mode 3)
            └─ No → Local-Only (Mode 4)
```

---

## 💰 Cost Breakdown by Mode

### Full AWS (Mode 1):
```
API Gateway: $0 (1M requests free)
Lambda: $0 (1M invocations free)
DynamoDB: $0 (25 GB free)
SQS: $0 (1M requests free)
S3: $0 (5 GB free)
-------------------------
Total: $0-2/month
```

### Backend-Only (Mode 2):
```
Same as Full AWS, minus S3 hosting
-------------------------
Total: $0-2/month
```

### Local with AWS (Mode 3):
```
DynamoDB: $0 (minimal usage)
SQS: $0 (minimal usage)
-------------------------
Total: $0-1/month
```

### Local-Only (Mode 4):
```
No AWS resources
-------------------------
Total: $0/month
```

---

## 🎯 Recommended Modes

**For Learning:**
- Start with **Local-Only (Mode 4)** - See the UI
- Progress to **Local with AWS (Mode 3)** - Learn AWS SDKs
- Deploy **Backend-Only (Mode 2)** - Test real functionality
- Finally **Full AWS (Mode 1)** - Production deployment

**For Production:**
- Use **Full AWS (Mode 1)** only

**For Development:**
- Use **Backend-Only (Mode 2)** for active development

**For Portfolio/Demos:**
- Use **Full AWS (Mode 1)** for public access

---

## 📝 Mode-Specific Documentation

Each mode has different features. See what works in each:

| Feature | Mode 1 | Mode 2 | Mode 3 | Mode 4 |
|---------|--------|--------|--------|--------|
| Dashboard UI | ✅ | ✅ | ✅ | ✅ |
| Send Metrics | ✅ | ✅ | ⚠️ | ❌ |
| Send Logs | ✅ | ✅ | ⚠️ | ❌ |
| View Charts | ✅ | ✅ | ✅ | ✅* |
| Health Check | ✅ | ✅ | ⚠️ | ❌ |
| Data Persistence | ✅ | ✅ | ✅ | ❌ |
| Auto-Processing | ✅ | ✅ | ❌ | ❌ |
| Public Access | ✅ | ❌ | ❌ | ❌ |

✅ = Fully working  
⚠️ = Partial/Manual  
❌ = Not available  
\* = Mock data only

---

## 🚨 Important Notes

1. **Mode 1 (Full AWS)** - Only mode suitable for production
2. **Mode 2 (Backend-Only)** - Best for development, not public
3. **Mode 3 (Local + AWS)** - Requires AWS credentials setup
4. **Mode 4 (Local-Only)** - Demo/learning only, no real functionality

5. **Always destroy resources** when done testing to avoid charges
6. **Free Tier** covers most usage in Modes 1-3
7. **Mode 4** is completely free (no AWS)

---

## 📞 Support

For issues with specific modes:
- Mode 1/2: Check AWS CloudFormation logs
- Mode 3: Verify AWS credentials with `aws sts get-caller-identity`
- Mode 4: Check browser console for JavaScript errors

GitHub: https://github.com/Nishit24113/cloudpulse

---

**Choose the mode that fits your needs and deploy!** 🚀
