package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

type ChatResponse struct {
	Response string `json:"response"`
}

const DEMO_APP = "langfuse-golang-demo"

var tracer = otel.Tracer(DEMO_APP)

func initTracer() (*trace.TracerProvider, error) {
	ctx := context.Background()

	client := otlptracehttp.NewClient()

	exporter, err := otlptrace.New(ctx, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create trace exporter: %w", err)
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(DEMO_APP),
			semconv.ServiceVersion("0.0.1"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	tp := trace.NewTracerProvider(
		trace.WithBatcher(exporter),
		trace.WithResource(res),
		trace.WithSampler(trace.AlwaysSample()),
	)

	otel.SetTracerProvider(tp)
	return tp, nil
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "chat-handler")
	defer span.End()

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		http.Error(w, "OPENAI_API_KEY environment variable not set", http.StatusInternalServerError)
		return
	}

	llm, err := openai.New(openai.WithToken(apiKey))
	if err != nil {
		log.Printf("Failed to create OpenAI client: %v", err)
		http.Error(w, "Failed to create OpenAI client", http.StatusInternalServerError)
		return
	}

	prompt := "Reply with `golang`"

	span.SetAttributes(
		semconv.MessagingDestinationName("openai"),
		semconv.MessagingOperationProcess,
	)

	span.SetAttributes(
		// Add model information for Langfuse tracing
		attribute.String("gen_ai.request.model", "gpt-3.5-turbo"),
		// Add input tracking
		attribute.String("gen_ai.prompt", prompt),
	)

	response, err := llm.GenerateContent(ctx, []llms.MessageContent{
		{
			Role: llms.ChatMessageTypeHuman,
			Parts: []llms.ContentPart{
				llms.TextPart(prompt),
			},
		},
	}, llms.WithModel("gpt-3.5-turbo"))
	if err != nil {
		log.Printf("Failed to generate content: %v", err)
		http.Error(w, "Failed to generate content", http.StatusInternalServerError)
		return
	}

	result := response.Choices[0].Content
	log.Printf("AI Response: %s", result)

	span.SetAttributes(
		// Add output tracking
		attribute.String("gen_ai.completion", result),
	)

	// Add Langfuse-specific metadata
	span.SetAttributes(
		attribute.String("langfuse.metadata.endpoint", "/chat"),
		attribute.String("langfuse.metadata.framework", "langchain-go"),
	)

	chatResponse := ChatResponse{Response: result}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatResponse)
}

func main() {
	tp, err := initTracer()
	if err != nil {
		log.Fatalf("Failed to initialize tracer: %v", err)
	}
	defer func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/chat", chatHandler)

	handler := otelhttp.NewHandler(mux, DEMO_APP)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
