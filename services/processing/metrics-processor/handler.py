"""
CloudPulse Metrics Processor
Consumes metrics from SQS and writes to Timestream
Performs aggregations and windowing
"""
import json
import os
import boto3
from typing import List, Dict

timestream_write = boto3.client('timestream-write')

TIMESTREAM_DATABASE = os.environ['TIMESTREAM_DATABASE']
TIMESTREAM_TABLE = os.environ['TIMESTREAM_TABLE']


def lambda_handler(event, context):
    """
    SQS trigger handler
    Processes batches of metrics and writes to Timestream
    """
    print(f"📊 Processing {len(event['Records'])} SQS messages")

    all_metrics = []

    # Extract metrics from all SQS messages
    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            metrics = body.get('metrics', [])
            all_metrics.extend(metrics)
        except Exception as e:
            print(f"❌ Failed to parse SQS message: {e}")
            continue

    if not all_metrics:
        print("⚠️  No metrics to process")
        return {'statusCode': 200, 'body': 'No metrics'}

    # Write to Timestream
    try:
        write_to_timestream(all_metrics)
        print(f"✅ Successfully processed {len(all_metrics)} metrics")
        return {'statusCode': 200, 'body': f'Processed {len(all_metrics)} metrics'}
    except Exception as e:
        print(f"❌ Failed to write to Timestream: {e}")
        raise  # Re-raise to retry SQS message


def write_to_timestream(metrics: List[Dict]):
    """
    Write metrics to Amazon Timestream
    """
    records = []

    for metric in metrics:
        # Build dimensions
        dimensions = [
            {'Name': 'app_id', 'Value': metric['app_id']},
            {'Name': 'org_id', 'Value': metric['org_id']},
            {'Name': 'metric_name', 'Value': metric['metric']},
        ]

        # Add tags as dimensions
        for key, value in metric.get('tags', {}).items():
            dimensions.append({'Name': key, 'Value': str(value)})

        # Create Timestream record
        record = {
            'Dimensions': dimensions,
            'MeasureName': 'value',
            'MeasureValue': str(metric['value']),
            'MeasureValueType': 'DOUBLE',
            'Time': str(metric['timestamp']),
            'TimeUnit': 'MILLISECONDS'
        }
        records.append(record)

    # Write in batches (max 100 per request)
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            response = timestream_write.write_records(
                DatabaseName=TIMESTREAM_DATABASE,
                TableName=TIMESTREAM_TABLE,
                Records=batch
            )
            print(f"✅ Wrote batch of {len(batch)} records to Timestream")
        except Exception as e:
            print(f"❌ Timestream batch write failed: {e}")
            # Log which metrics failed but continue with other batches
            print(f"Failed metrics: {json.dumps(batch[:3])}...")  # Log first 3 for debugging
            raise


if __name__ == '__main__':
    # Test event (SQS format)
    test_event = {
        'Records': [
            {
                'body': json.dumps({
                    'metrics': [
                        {
                            'metric': 'api.response_time',
                            'value': 125.5,
                            'timestamp': 1726365600000,
                            'app_id': 'demo-app',
                            'org_id': 'demo-org',
                            'tags': {'endpoint': '/users', 'method': 'GET'}
                        }
                    ]
                })
            }
        ]
    }

    os.environ.setdefault('TIMESTREAM_DATABASE', 'cloudpulse_metrics')
    os.environ.setdefault('TIMESTREAM_TABLE', 'metrics')

    result = lambda_handler(test_event, None)
    print(result)
