"""
CloudPulse Anomaly Detection
Statistical anomaly detection using moving averages and Z-scores
Detects unusual metric patterns and creates automatic alerts
"""
import json
import os
import boto3
import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from statistics import mean, stdev

# AWS clients
timestream_query = boto3.client('timestream-query')
dynamodb = boto3.resource('dynamodb')

# Environment variables
TIMESTREAM_DATABASE = os.environ['TIMESTREAM_DATABASE']
TIMESTREAM_TABLE = os.environ['TIMESTREAM_TABLE']
ALERTS_TABLE = os.environ['ALERTS_TABLE']

alerts_table = dynamodb.Table(ALERTS_TABLE)


def lambda_handler(event, context):
    """
    Analyze metrics for anomalies
    Can be triggered periodically or on-demand
    """
    print("🔬 Anomaly Detection: Starting analysis...")

    try:
        # Get list of metrics to analyze
        metrics = get_active_metrics()
        print(f"📊 Analyzing {len(metrics)} metrics")

        anomalies_found = []

        for metric in metrics:
            try:
                anomaly = detect_anomaly(metric)
                if anomaly:
                    anomalies_found.append(anomaly)
                    create_auto_alert(anomaly)
            except Exception as e:
                print(f"❌ Failed to analyze metric {metric}: {e}")

        print(f"✅ Anomaly detection complete. {len(anomalies_found)} anomalies found.")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'metrics_analyzed': len(metrics),
                'anomalies_detected': len(anomalies_found),
                'anomalies': anomalies_found
            })
        }

    except Exception as e:
        print(f"❌ Anomaly detection failed: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_active_metrics() -> List[Dict[str, str]]:
    """
    Get list of active metrics from Timestream
    Returns metrics that had data in the last hour
    """
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=1)

    query = f"""
    SELECT DISTINCT metric_name, app_id, org_id
    FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
    WHERE time BETWEEN from_unixtime({int(start_time.timestamp())})
                   AND from_unixtime({int(end_time.timestamp())})
    LIMIT 100
    """

    try:
        response = timestream_query.query(QueryString=query)
        metrics = []

        for row in response.get('Rows', []):
            metrics.append({
                'metric_name': row['Data'][0].get('ScalarValue', ''),
                'app_id': row['Data'][1].get('ScalarValue', ''),
                'org_id': row['Data'][2].get('ScalarValue', 'default')
            })

        return metrics

    except Exception as e:
        print(f"❌ Failed to get active metrics: {e}")
        return []


def detect_anomaly(metric: Dict[str, str]) -> Dict[str, any]:
    """
    Detect anomalies using Z-score method
    Returns anomaly details if detected, None otherwise
    """
    metric_name = metric['metric_name']
    app_id = metric['app_id']
    org_id = metric['org_id']

    # Get historical data (last 24 hours)
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=24)

    query = f"""
    SELECT
        BIN(time, 5m) as time_bin,
        AVG(measure_value::double) as value
    FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
    WHERE metric_name = '{metric_name}'
      AND app_id = '{app_id}'
      AND org_id = '{org_id}'
      AND time BETWEEN from_unixtime({int(start_time.timestamp())})
                   AND from_unixtime({int(end_time.timestamp())})
    GROUP BY BIN(time, 5m)
    ORDER BY time_bin DESC
    LIMIT 288
    """

    try:
        response = timestream_query.query(QueryString=query)
        rows = response.get('Rows', [])

        if len(rows) < 12:  # Need at least 1 hour of data
            return None

        # Extract values
        values = []
        for row in rows:
            value_str = row['Data'][1].get('ScalarValue', '0')
            values.append(float(value_str) if value_str else 0.0)

        # Statistical analysis
        current_value = values[0]  # Most recent
        historical_values = values[1:]  # Previous values

        # Calculate mean and standard deviation
        mean_value = mean(historical_values)
        std_value = stdev(historical_values) if len(historical_values) > 1 else 0

        # Calculate Z-score
        if std_value > 0:
            z_score = (current_value - mean_value) / std_value
        else:
            z_score = 0

        # Threshold: Z-score > 3 is considered anomalous
        if abs(z_score) > 3:
            print(f"🚨 Anomaly detected: {metric_name}")
            print(f"   Current: {current_value:.2f}, Mean: {mean_value:.2f}, "
                  f"Std: {std_value:.2f}, Z-score: {z_score:.2f}")

            return {
                'metric_name': metric_name,
                'app_id': app_id,
                'org_id': org_id,
                'current_value': current_value,
                'mean_value': mean_value,
                'std_deviation': std_value,
                'z_score': z_score,
                'severity': 'high' if abs(z_score) > 5 else 'medium',
                'detected_at': datetime.now().isoformat()
            }

        return None

    except Exception as e:
        print(f"❌ Anomaly detection failed for {metric_name}: {e}")
        return None


def create_auto_alert(anomaly: Dict[str, any]):
    """
    Create an automatic alert for detected anomaly
    """
    alert_id = f"anomaly-{anomaly['metric_name']}-{int(datetime.now().timestamp())}"

    try:
        # Check if similar alert already exists
        response = alerts_table.get_item(
            Key={
                'org_id': anomaly['org_id'],
                'alert_id': alert_id
            }
        )

        if 'Item' in response:
            print(f"⚠️  Alert already exists: {alert_id}")
            return

        # Create new alert
        alerts_table.put_item(Item={
            'org_id': anomaly['org_id'],
            'alert_id': alert_id,
            'name': f"Anomaly: {anomaly['metric_name']}",
            'type': 'anomaly',
            'metric_name': anomaly['metric_name'],
            'app_id': anomaly['app_id'],
            'condition': f"Z-score > 3 (detected: {anomaly['z_score']:.2f})",
            'severity': anomaly['severity'],
            'status': 'active',
            'created_at': int(datetime.now().timestamp()),
            'anomaly_details': anomaly
        })

        print(f"✅ Created automatic alert: {alert_id}")

    except Exception as e:
        print(f"❌ Failed to create alert: {e}")


# For local testing
if __name__ == '__main__':
    import os
    os.environ.setdefault('TIMESTREAM_DATABASE', 'cloudpulse_metrics')
    os.environ.setdefault('TIMESTREAM_TABLE', 'metrics')
    os.environ.setdefault('ALERTS_TABLE', 'cloudpulse-alerts')

    test_event = {}
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
