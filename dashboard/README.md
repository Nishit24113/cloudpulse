# CloudPulse Dashboard

Beautiful, modern observability dashboard for CloudPulse built with React, Vite, Tailwind CSS, and Framer Motion.

## Features

- **Real-Time Metrics Visualization** - Live charts showing system metrics (CPU, Memory, API requests, Response time)
- **Logs Viewer** - Real-time log stream with filtering and search
- **Test Data Sender** - Send test metrics and logs directly to your API
- **Modern UI/UX** - Smooth animations, beautiful gradients, responsive design
- **Health Monitoring** - Live API health status

## Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite 8** - Lightning-fast build tool
- **Tailwind CSS 3** - Utility-first CSS framework
- **Framer Motion** - Smooth, production-ready animations
- **Recharts** - Composable charting library
- **React Query** - Powerful data fetching
- **Lucide Icons** - Beautiful, consistent icon set
- **Axios** - Promise-based HTTP client

## Quick Start

### Development Server

```bash
cd dashboard
node ./node_modules/vite/bin/vite.js
```

Open **http://localhost:3002** in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to deploy to S3 or any static hosting.

## Dashboard Views

### 1. Dashboard
- 4 stat cards (CPU, Memory, Requests, Response Time)
- System Resources Chart (Area chart showing CPU & Memory over 24h)
- API Requests Chart (Bar chart showing requests over 24h)
- Response Time Chart (Line chart showing latency over 24h)
- System Information panel

### 2. Logs
- Log entries with color-coded levels (ERROR, WARN, INFO, DEBUG)
- Filter by log level
- Time range selector
- Search functionality
- Log statistics (Total, Errors, Warnings, Info)

### 3. Send Test Data
- Form to send test metrics
- Form to send test logs
- Real-time response display
- cURL examples for API testing

## API Configuration

The dashboard connects to your CloudPulse AWS API:

```javascript
// src/utils/api.js
const API_BASE_URL = 'https://l90jg6iti4.execute-api.us-west-2.amazonaws.com/v1'
```

Update this URL if you deploy to a different region or account.

## Component Structure

```
src/
├── components/
│   ├── Sidebar.jsx           # Animated navigation sidebar
│   ├── Header.jsx             # Top header with health status
│   ├── Dashboard.jsx          # Main dashboard with charts
│   ├── LogsView.jsx          # Logs viewer component
│   └── SendMetricsForm.jsx   # Test data sender
├── utils/
│   └── api.js                 # API client functions
├── App.jsx                    # Main app component
├── main.jsx                   # Entry point
└── index.css                  # Global styles with Tailwind
```

## Animations

The dashboard uses **Framer Motion** for smooth animations:

- **Page transitions** - Fade in/out when switching views
- **Card hover effects** - Scale and lift on hover
- **Button interactions** - Tap feedback
- **Loading states** - Spinning indicators
- **Stagger animations** - Sequential appearance of elements

## Styling

Built with **Tailwind CSS 3** featuring:

- **Responsive design** - Works on desktop, tablet, and mobile
- **Dark mode ready** - Full dark theme support (not enabled by default)
- **Custom animations** - Fade in, slide up, pulse
- **Gradient backgrounds** - Modern gradient effects
- **Custom scrollbars** - Styled scrollbars
- **Card components** - Reusable card styles with shadows

## Deployment

### Deploy to S3 (Static Website)

1. Build the app:
   ```bash
   npm run build
   ```

2. Upload `dist/` folder to S3 bucket

3. Enable static website hosting on the bucket

4. Update API CORS to allow your S3 URL

### Deploy with AWS Amplify

1. Connect your GitHub repository to Amplify

2. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd dashboard
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dashboard/dist
       files:
         - '**/*'
   ```

3. Deploy automatically on push

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Custom date range selector
- [ ] Export metrics data
- [ ] Alert configuration UI
- [ ] User authentication
- [ ] Multi-tenant support
- [ ] Dashboard customization
- [ ] Mobile app version

## Screenshots

### Dashboard View
Beautiful charts showing real-time metrics with smooth animations.

### Logs View
Color-coded log entries with filtering and search capabilities.

### Send Test Data
Interactive form to test your CloudPulse API.

---

**Built with ❤️ for CloudPulse Observability Platform**
