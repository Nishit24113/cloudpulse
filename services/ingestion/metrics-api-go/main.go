package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/timestreamwrite"
	"github.com/aws/aws-sdk-go-v2/service/timestreamwrite/types"
)

// MetricPoint represents a single metric data point
type MetricPoint struct {
	MetricName string            `json:"metric"`
	Value      float64           `json:"value"`
	Timestamp  int64             `json:"timestamp"`
	AppID      string            `json:"app_id"`
	OrgID      string            `json:"org_id"`
	Tags       map[string]string `json:"tags"`
}

// MetricBatch represents a batch of metrics
type MetricBatch struct {
	Metrics []MetricPoint `json:"metrics"`
}

// Response represents the API response
type Response struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Count     int    `json:"count"`
	MessageID string `json:"message_id,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

var (
	sqsClient         *sqs.Client
	timestreamClient  *timestreamwrite.Client
	metricsQueueURL   string
	timestreamDB      string
	timestreamTable   string
)

func init() {
	// Initialize AWS SDK clients (connection pooling - best practice)
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("AWS_REGION")))
	if err != nil {
		panic(fmt.Sprintf("unable to load SDK config: %v", err))
	}

	sqsClient = sqs.NewFromConfig(cfg)
	timestreamClient = timestreamwrite.NewFromConfig(cfg)

	// Load environment variables
	metricsQueueURL = os.Getenv("METRICS_QUEUE_URL")
	timestreamDB = os.Getenv("TIMESTREAM_DATABASE")
	timestreamTable = os.Getenv("TIMESTREAM_TABLE")

	fmt.Println("✅ CloudPulse Metrics Ingestion - Initialized (Go)")
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	fmt.Printf("📊 Metrics Ingestion Request - Method: %s, Path: %s\n", request.HTTPMethod, request.Path)

	// CORS headers
	headers := map[string]string{
		"Content-Type":                "application/json",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}

	// Handle OPTIONS (preflight)
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       "",
		}, nil
	}

	// Parse request body
	var batch MetricBatch
	if err := json.Unmarshal([]byte(request.Body), &batch); err != nil {
		return errorResponse(400, "Invalid JSON", err.Error(), headers)
	}

	// Validate metrics
	if len(batch.Metrics) == 0 {
		return errorResponse(400, "No metrics provided", "Request must include 'metrics' array", headers)
	}

	// Enrich metrics
	enrichedMetrics := enrichMetrics(batch.Metrics)

	if len(enrichedMetrics) == 0 {
		return errorResponse(400, "No valid metrics", "All metrics must have 'metric' and 'value' fields", headers)
	}

	// Send to SQS for async processing
	messageID, err := sendToSQS(ctx, enrichedMetrics)
	if err != nil {
		fmt.Printf("❌ SQS send failed: %v\n", err)
		return errorResponse(500, "Internal server error", err.Error(), headers)
	}

	fmt.Printf("✅ Sent %d metrics to SQS: %s\n", len(enrichedMetrics), messageID)

	// Also write directly to Timestream (for demo/testing)
	go writeToTimestream(context.Background(), enrichedMetrics)

	// Success response
	response := Response{
		Status:    "accepted",
		Message:   fmt.Sprintf("Received %d metrics", len(enrichedMetrics)),
		Count:     len(enrichedMetrics),
		MessageID: messageID,
	}

	body, _ := json.Marshal(response)
	return events.APIGatewayProxyResponse{
		StatusCode: 202, // Accepted
		Headers:    headers,
		Body:       string(body),
	}, nil
}

func enrichMetrics(metrics []MetricPoint) []MetricPoint {
	enriched := make([]MetricPoint, 0, len(metrics))
	currentTime := time.Now().UnixMilli()

	for _, metric := range metrics {
		// Skip invalid metrics
		if metric.MetricName == "" || metric.Value == 0 {
			continue
		}

		// Set defaults
		if metric.Timestamp == 0 {
			metric.Timestamp = currentTime
		}
		if metric.AppID == "" {
			metric.AppID = "unknown"
		}
		if metric.OrgID == "" {
			metric.OrgID = "default"
		}
		if metric.Tags == nil {
			metric.Tags = make(map[string]string)
		}

		enriched = append(enriched, metric)
	}

	return enriched
}

func sendToSQS(ctx context.Context, metrics []MetricPoint) (string, error) {
	// Serialize metrics
	body, err := json.Marshal(map[string]interface{}{
		"metrics": metrics,
	})
	if err != nil {
		return "", err
	}

	// Send to SQS
	result, err := sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    &metricsQueueURL,
		MessageBody: stringPtr(string(body)),
		MessageAttributes: map[string]types.MessageAttributeValue{
			"source": {
				DataType:    stringPtr("String"),
				StringValue: stringPtr("metrics-ingestion-go"),
			},
			"count": {
				DataType:    stringPtr("Number"),
				StringValue: stringPtr(fmt.Sprintf("%d", len(metrics))),
			},
		},
	})

	if err != nil {
		return "", err
	}

	return *result.MessageId, nil
}

func writeToTimestream(ctx context.Context, metrics []MetricPoint) {
	if len(metrics) == 0 {
		return
	}

	// Build Timestream records
	records := make([]types.Record, 0, len(metrics))

	for _, metric := range metrics {
		// Build dimensions
		dimensions := []types.Dimension{
			{Name: stringPtr("app_id"), Value: stringPtr(metric.AppID)},
			{Name: stringPtr("org_id"), Value: stringPtr(metric.OrgID)},
			{Name: stringPtr("metric_name"), Value: stringPtr(metric.MetricName)},
		}

		// Add tags as dimensions
		for key, value := range metric.Tags {
			dimensions = append(dimensions, types.Dimension{
				Name:  stringPtr(key),
				Value: stringPtr(value),
			})
		}

		// Create record
		record := types.Record{
			Dimensions:       dimensions,
			MeasureName:      stringPtr("value"),
			MeasureValue:     stringPtr(fmt.Sprintf("%f", metric.Value)),
			MeasureValueType: types.MeasureValueTypeDouble,
			Time:             stringPtr(fmt.Sprintf("%d", metric.Timestamp)),
			TimeUnit:         types.TimeUnitMilliseconds,
		}

		records = append(records, record)
	}

	// Write in batches (max 100 records per request)
	batchSize := 100
	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}

		batch := records[i:end]

		_, err := timestreamClient.WriteRecords(ctx, &timestreamwrite.WriteRecordsInput{
			DatabaseName: &timestreamDB,
			TableName:    &timestreamTable,
			Records:      batch,
		})

		if err != nil {
			fmt.Printf("⚠️  Timestream write failed for batch %d: %v\n", i/batchSize, err)
		} else {
			fmt.Printf("✅ Wrote %d records to Timestream (batch %d)\n", len(batch), i/batchSize)
		}
	}
}

func errorResponse(statusCode int, errorMsg, details string, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	errResp := ErrorResponse{
		Error:   errorMsg,
		Message: details,
	}
	body, _ := json.Marshal(errResp)

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    headers,
		Body:       string(body),
	}, nil
}

func stringPtr(s string) *string {
	return &s
}

func main() {
	lambda.Start(handler)
}
