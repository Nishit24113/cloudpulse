"""
CloudPulse Alert Engine
Evaluates alert rules and sends notifications via SNS/SES
Triggered by EventBridge every 1 minute
"""
import json
import os
import boto3
from datetime import datetime, timedelta
from typing import List, Dict, Any

# AWS clients
dynamodb = boto3.resource('dynamodb')
timestream_query = boto3.client('timestream-query')
sns = boto3.client('sns')
ses = boto3.client('ses')

# Environment variables
ALERTS_TABLE = os.environ['ALERTS_TABLE']
TIMESTREAM_DATABASE = os.environ['TIMESTREAM_DATABASE']
TIMESTREAM_TABLE = os.environ['TIMESTREAM_TABLE']
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', '')
ALERT_EMAIL = os.environ.get('ALERT_EMAIL', '')

alerts_table = dynamodb.Table(ALERTS_TABLE)


def lambda_handler(event, context):
    """
    EventBridge scheduled trigger (every 1 minute)
    Evaluates all active alerts
    """
    print("🔔 Alert Engine: Evaluating alerts...")

    try:
        # Get all active alerts
        response = alerts_table.scan(
            FilterExpression='#status = :active',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':active': 'active'}
        )

        alerts = response.get('Items', [])
        print(f"📊 Found {len(alerts)} active alerts to evaluate")

        triggered_count = 0

        for alert in alerts:
            try:
                if evaluate_alert(alert):
                    send_notification(alert)
                    update_alert_status(alert)
                    triggered_count += 1
            except Exception as e:
                print(f"❌ Failed to evaluate alert {alert.get('alert_id')}: {e}")

        print(f"✅ Alert evaluation complete. {triggered_count} alerts triggered.")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'alerts_evaluated': len(alerts),
                'alerts_triggered': triggered_count
            })
        }

    except Exception as e:
        print(f"❌ Alert engine failed: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def evaluate_alert(alert: Dict[str, Any]) -> bool:
    """
    Evaluate an alert condition against Timestream
    Returns True if alert should trigger
    """
    alert_id = alert['alert_id']
    condition = alert['condition']
    metric_name = alert.get('metric_name', '')
    app_id = alert.get('app_id', '')
    org_id = alert.get('org_id', 'default')

    print(f"🔍 Evaluating alert: {alert_id}")

    # Parse condition (e.g., "avg(cpu_usage) > 80 for 5 minutes")
    # For MVP, support simple threshold conditions
    threshold_type = alert.get('threshold_type', 'above')  # above, below
    threshold_value = alert.get('threshold_value', 0)
    aggregation = alert.get('aggregation', 'avg')
    time_window = alert.get('time_window_minutes', 5)

    # Query Timestream for recent metrics
    end_time = datetime.now()
    start_time = end_time - timedelta(minutes=time_window)

    query = f"""
    SELECT {aggregation.upper()}(measure_value::double) as value
    FROM "{TIMESTREAM_DATABASE}"."{TIMESTREAM_TABLE}"
    WHERE metric_name = '{metric_name}'
      AND org_id = '{org_id}'
      AND time BETWEEN from_unixtime({int(start_time.timestamp())})
                   AND from_unixtime({int(end_time.timestamp())})
    """

    if app_id:
        query += f" AND app_id = '{app_id}'"

    try:
        response = timestream_query.query(QueryString=query)

        if not response.get('Rows'):
            print(f"⚠️  No data found for alert {alert_id}")
            return False

        # Extract value
        value_str = response['Rows'][0]['Data'][0].get('ScalarValue', '0')
        current_value = float(value_str) if value_str else 0.0

        print(f"📈 Current value: {current_value}, Threshold: {threshold_value}")

        # Check threshold
        if threshold_type == 'above':
            triggered = current_value > threshold_value
        elif threshold_type == 'below':
            triggered = current_value < threshold_value
        else:
            triggered = False

        if triggered:
            print(f"🚨 Alert {alert_id} triggered! Value: {current_value}")
            # Store current value for notification
            alert['current_value'] = current_value

        return triggered

    except Exception as e:
        print(f"❌ Query failed for alert {alert_id}: {e}")
        return False


def send_notification(alert: Dict[str, Any]):
    """
    Send alert notification via SNS and/or SES
    """
    alert_id = alert['alert_id']
    alert_name = alert.get('name', 'Unnamed Alert')
    metric_name = alert.get('metric_name', '')
    current_value = alert.get('current_value', 0)
    threshold_value = alert.get('threshold_value', 0)

    # Build notification message
    subject = f"🚨 CloudPulse Alert: {alert_name}"
    message = f"""
CloudPulse Alert Triggered

Alert: {alert_name}
Alert ID: {alert_id}
Metric: {metric_name}
Current Value: {current_value:.2f}
Threshold: {threshold_value}
Time: {datetime.now().isoformat()}

Condition: {alert.get('condition', 'N/A')}

This alert was triggered because the metric exceeded the configured threshold.

---
CloudPulse Observability Platform
"""

    # Send via SNS (if configured)
    if SNS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=subject,
                Message=message
            )
            print(f"✅ SNS notification sent for alert {alert_id}")
        except Exception as e:
            print(f"❌ SNS notification failed: {e}")

    # Send via SES (if configured)
    if ALERT_EMAIL:
        try:
            ses.send_email(
                Source=ALERT_EMAIL,
                Destination={'ToAddresses': [ALERT_EMAIL]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {'Text': {'Data': message}}
                }
            )
            print(f"✅ Email notification sent for alert {alert_id}")
        except Exception as e:
            print(f"❌ Email notification failed: {e}")


def update_alert_status(alert: Dict[str, Any]):
    """
    Update alert status in DynamoDB (last triggered time)
    """
    try:
        alerts_table.update_item(
            Key={
                'org_id': alert['org_id'],
                'alert_id': alert['alert_id']
            },
            UpdateExpression='SET last_triggered = :now, trigger_count = trigger_count + :inc',
            ExpressionAttributeValues={
                ':now': int(datetime.now().timestamp()),
                ':inc': 1
            }
        )
        print(f"✅ Updated alert status: {alert['alert_id']}")
    except Exception as e:
        print(f"❌ Failed to update alert status: {e}")


# For local testing
if __name__ == '__main__':
    import os
    os.environ.setdefault('ALERTS_TABLE', 'cloudpulse-alerts')
    os.environ.setdefault('TIMESTREAM_DATABASE', 'cloudpulse_metrics')
    os.environ.setdefault('TIMESTREAM_TABLE', 'metrics')

    test_event = {}
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
