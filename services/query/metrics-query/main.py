"""
CloudPulse Metrics Query API
FastAPI service for querying time-series metrics from Timestream
Supports PromQL-like query syntax
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import boto3
import os
from datetime import datetime, timedelta
import json

app = FastAPI(
    title="CloudPulse Metrics Query API",
    version="1.0.0",
    description="Query time-series metrics with PromQL-like syntax"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Timestream client
timestream_query = boto3.client('timestream-query')
TIMESTREAM_DATABASE = os.environ.get('TIMESTREAM_DATABASE', 'cloudpulse_metrics')
TIMESTREAM_TABLE = os.environ.get('TIMESTREAM_TABLE', 'metrics')


# Request/Response Models
class MetricQueryRequest(BaseModel):
    metric_name: str
    app_id: Optional[str] = None
    org_id: Optional[str] = "default"
    start_time: Optional[int] = None  # Unix timestamp (ms)
    end_time: Optional[int] = None
    aggregation: str = "avg"  # avg, sum, max, min, count, p50, p95, p99
    interval: str = "1m"  # 1m, 5m, 15m, 1h, 6h, 1d
    tags: Optional[Dict[str, str]] = None
    group_by: Optional[List[str]] = None


class DataPoint(BaseModel):
    timestamp: int
    value: float
    tags: Optional[Dict[str, str]] = None


class MetricQueryResponse(BaseModel):
    metric: str
    app_id: Optional[str]
    aggregation: str
    interval: str
    data_points: List[DataPoint]
    count: int
    start_time: int
    end_time: int


class AvailableMetrics(BaseModel):
    metrics: List[str]
    count: int


# Helper Functions
def interval_to_seconds(interval: str) -> int:
    """Convert interval string to seconds"""
    mapping = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '6h': 21600,
        '1d': 86400
    }
    return mapping.get(interval, 60)


def get_aggregation_function(agg: str) -> str:
    """Convert aggregation name to Timestream function"""
    mapping = {
        'avg': 'AVG',
        'sum': 'SUM',
        'max': 'MAX',
        'min': 'MIN',
        'count': 'COUNT',
        'p50': 'approx_percentile(measure_value::double, 0.50)',
        'p95': 'approx_percentile(measure_value::double, 0.95)',
        'p99': 'approx_percentile(measure_value::double, 0.99)',
    }
    return mapping.get(agg, 'AVG(measure_value::double)')


def build_where_clause(app_id: Optional[str], org_id: str, metric_name: str, tags: Optional[Dict[str, str]], start_ms: int, end_ms: int) -> str:
    """Build WHERE clause for Timestream query"""
    conditions = [
        f"metric_name = '{metric_name}'",
        f"org_id = '{org_id}'",
        f"time BETWEEN from_unixtime({start_ms / 1000}) AND from_unixtime({end_ms / 1000})"
    ]

    if app_id:
        conditions.append(f"app_id = '{app_id}'")

    if tags:
        for key, value in tags.items():
            conditions.append(f"{key} = '{value}'")

    return " AND ".join(conditions)


# API Endpoints
@app.get("/")
async def root():
    return {
        "service": "CloudPulse Metrics Query API",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "metrics-query"}


@app.post("/api/query/metrics", response_model=MetricQueryResponse)
async def query_metrics(request: MetricQueryRequest):
    """
    Query metrics from Timestream with aggregation and windowing

    Example:
        POST /api/query/metrics
        {
            "metric_name": "api.response_time",
            "app_id": "my-app",
            "start_time": 1726365600000,
            "end_time": 1726369200000,
            "aggregation": "p95",
            "interval": "5m"
        }
    """
    try:
        # Set default time range (last 1 hour)
        end_ms = request.end_time or int(datetime.now().timestamp() * 1000)
        start_ms = request.start_time or (end_ms - 3600000)  # 1 hour ago

        # Build query
        interval_seconds = interval_to_seconds(request.interval)
        agg_function = get_aggregation_function(request.aggregation)
        where_clause = build_where_clause(
            request.app_id,
            request.org_id,
            request.metric_name,
            request.tags,
            start_ms,
            end_ms
        )

        # PromQL-like query with time binning
        if request.aggregation in ['p50', 'p95', 'p99']:
            # For percentiles, use the special function
            query = f"""
            SELECT
                BIN(time, {interval_seconds}s) as time_bin,
                {agg_function} as value
            FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
            WHERE {where_clause}
            GROUP BY BIN(time, {interval_seconds}s)
            ORDER BY time_bin ASC
            """
        else:
            query = f"""
            SELECT
                BIN(time, {interval_seconds}s) as time_bin,
                {agg_function}(measure_value::double) as value
            FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
            WHERE {where_clause}
            GROUP BY BIN(time, {interval_seconds}s)
            ORDER BY time_bin ASC
            """

        print(f"🔍 Timestream Query: {query}")

        # Execute query
        response = timestream_query.query(QueryString=query)

        # Parse results
        data_points = []
        for row in response.get('Rows', []):
            try:
                # Extract time and value from row
                time_str = row['Data'][0].get('ScalarValue', '')
                value_str = row['Data'][1].get('ScalarValue', '0')

                # Convert time string to timestamp (Timestream returns ISO format)
                if time_str:
                    dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                    timestamp_ms = int(dt.timestamp() * 1000)
                else:
                    timestamp_ms = int(datetime.now().timestamp() * 1000)

                # Convert value to float
                value = float(value_str) if value_str else 0.0

                data_points.append(DataPoint(
                    timestamp=timestamp_ms,
                    value=value,
                    tags=request.tags
                ))
            except (ValueError, IndexError) as e:
                print(f"⚠️  Failed to parse row: {e}")
                continue

        return MetricQueryResponse(
            metric=request.metric_name,
            app_id=request.app_id,
            aggregation=request.aggregation,
            interval=request.interval,
            data_points=data_points,
            count=len(data_points),
            start_time=start_ms,
            end_time=end_ms
        )

    except Exception as e:
        print(f"❌ Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics/list", response_model=AvailableMetrics)
async def list_metrics(
    app_id: Optional[str] = Query(None),
    org_id: str = Query("default"),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List available metrics for an app
    """
    try:
        # Query to get distinct metric names
        where_conditions = [f"org_id = '{org_id}'"]
        if app_id:
            where_conditions.append(f"app_id = '{app_id}'")

        where_clause = " AND ".join(where_conditions)

        query = f"""
        SELECT DISTINCT metric_name
        FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
        WHERE {where_clause}
        ORDER BY metric_name
        LIMIT {limit}
        """

        response = timestream_query.query(QueryString=query)

        metrics = []
        for row in response.get('Rows', []):
            metric_name = row['Data'][0].get('ScalarValue', '')
            if metric_name:
                metrics.append(metric_name)

        return AvailableMetrics(
            metrics=metrics,
            count=len(metrics)
        )

    except Exception as e:
        print(f"❌ List metrics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics/apps", response_model=Dict[str, Any])
async def list_apps(
    org_id: str = Query("default"),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List apps that have sent metrics
    """
    try:
        query = f"""
        SELECT DISTINCT app_id
        FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
        WHERE org_id = '{org_id}'
        ORDER BY app_id
        LIMIT {limit}
        """

        response = timestream_query.query(QueryString=query)

        apps = []
        for row in response.get('Rows', []):
            app_id = row['Data'][0].get('ScalarValue', '')
            if app_id:
                apps.append(app_id)

        return {
            "apps": apps,
            "count": len(apps),
            "org_id": org_id
        }

    except Exception as e:
        print(f"❌ List apps failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics/latest")
async def get_latest_metrics(
    app_id: Optional[str] = Query(None),
    org_id: str = Query("default"),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Get latest metric values (for real-time dashboard)
    """
    try:
        where_conditions = [f"org_id = '{org_id}'"]
        if app_id:
            where_conditions.append(f"app_id = '{app_id}'")

        where_clause = " AND ".join(where_conditions)

        query = f"""
        SELECT
            metric_name,
            measure_value::double as value,
            time
        FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
        WHERE {where_clause}
        ORDER BY time DESC
        LIMIT {limit}
        """

        response = timestream_query.query(QueryString=query)

        metrics = []
        for row in response.get('Rows', []):
            try:
                metric_name = row['Data'][0].get('ScalarValue', '')
                value = float(row['Data'][1].get('ScalarValue', '0'))
                time_str = row['Data'][2].get('ScalarValue', '')

                if time_str:
                    dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                    timestamp_ms = int(dt.timestamp() * 1000)
                else:
                    timestamp_ms = int(datetime.now().timestamp() * 1000)

                metrics.append({
                    "metric": metric_name,
                    "value": value,
                    "timestamp": timestamp_ms
                })
            except (ValueError, IndexError):
                continue

        return {
            "metrics": metrics,
            "count": len(metrics),
            "app_id": app_id,
            "org_id": org_id
        }

    except Exception as e:
        print(f"❌ Get latest metrics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
