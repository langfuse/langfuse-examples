# langfuse-examples

Examples on how to deploy and use Langfuse.
Here, we try to highlight amazing work by our contributors and partners.

## Usage Examples

| Example                                                             | Description                                                                   | Contributor                                    |
|---------------------------------------------------------------------|-------------------------------------------------------------------------------|------------------------------------------------|
| [Spring AI Demo](./applications/spring-ai-demo)                     | A simple Spring Boot application that uses Langfuse to trace a chat endpoint. | [@jakehilborn](https://github.com/jakehilborn) |
| [Quarkus Langchain4j Demo](./applications/quarkus-langchain4j-demo) | A Quarkus Langchain4J application that uses Langfuse for tracing.             | [@geoand](https://github.com/geoand)           |
| [Go Langchain Demo](./applications/golang-langchain-demo)           | A Go application using langchaingo with OpenTelemetry tracing to Langfuse.    |                                                |
| [DSPy.rb Langfuse Integration](https://github.com/vicentereig/dspy.rb) | A Ruby framework for LLM programming with built-in Langfuse tracing via OpenTelemetry. | [@vicentereig](https://github.com/vicentereig) |
| [Tracing Pipecat Applications](./applications/langchat)             | A Pipecat application sending traces to Langfuse.                             | [@aabedraba](https://github.com/aabedraba)     |
| [Tracing MCP Servers](./applications/mcp-tracing)  | An example on using the OpenAI agents SDK together with an MCP server. | [@aabedraba](https://github.com/aabedraba)   |
| [RAG Observability and Evals](./applications/rag) | A RAG application that uses Langfuse for tracing and evals. | [@aabedraba](https://github.com/aabedraba) |
| [User Feedback](./applications/user-feedback) | An example on collecting user feedback using Langfuse Web SDK. | [@aabedraba](https://github.com/aabedraba) |
| [Custom Annotation UI](./applications/custom-annotation-ui) | An example on building a custom annotation UI using Langfuse APIs. | [@aabedraba](https://github.com/aabedraba) |
| [Kiro Langfuse Integration](./applications/kiro-langfuse) | Kiro IDE hooks that send AI agent activity traces to Langfuse. | [@nklmish](https://github.com/nklmish) |
| [Laravel Langfuse Integration](./applications/laravel-langfuse) | Laravel examples demonstrating auto-instrumented Langfuse tracing with Laravel AI, Prism, and Neuron AI. | [@axyr](https://github.com/axyr) |

## Deployment Examples

Here, we highlight community maintained deployment examples for various cloud providers.
For the Langfuse-maintained modules checkout [langfuse-terraform-aws](https://github.com/langfuse/langfuse-terraform-aws) and [langfuse-terraform-gcp](https://github.com/langfuse/langfuse-terraform-gcp).

| Example                                                                                             | Description                                                                                                                                                                       | Contributor                              |
|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| [AWS Terraform](https://github.com/tubone24/langfuse-v3-terraform)                                  | This Terraform module provides infrastructure components for deploying Langfuse v3 self-hosted on Amazon Web Service (AWS).                                                       | [@tubone24](https://github.com/tubone24) |
| [AWS CDK](https://github.com/aws-samples/deploy-langfuse-on-ecs-with-fargate/tree/main/langfuse-v3) | This repository contains the AWS CDK Python code for deploying the Langfuse application using Amazon Elastic Container Registry (ECR) and Amazon Elastic Container Service (ECS). | [@ksmin23](https://github.com/ksmin23)   |
| [GCP Terraform](https://github.com/sotazum/langfuse-google-cloud-terraform)                         | Terraform configuration for self-hosting Langfuse on Google Cloud.                                                                                                                | [@sotazum](https://github.com/sotazum)   |



## Community-maintained SDKs

Below is a list of SDKs maintained by the community. Please note that for tracing (other than Python or JS/TS), you can also use the [OpenTelemetry SDK of your choice](https://opentelemetry.io/docs/languages/) and send traces to the [Langfuse OTel Endpoint](https://langfuse.com/integrations/native/opentelemetry).

| Language | Description | Contributor |
|----------|-------------|-------------|
| Rust     | Unofficial Rust client for Langfuse: [adolfousier/langfuse-rust](https://github.com/adolfousier/langfuse-rust) | [@adolfousier](https://github.com/adolfousier) |
| Ruby     | Unofficial Ruby SDK for Langfuse: [ai-firstly/langfuse-ruby](https://github.com/ai-firstly/langfuse-ruby) | [@ai-firstly](https://github.com/ai-firstly) |
| Ruby     | Unofficial Ruby SDK for Langfuse: [simplepractice/langfuse-rb](https://github.com/simplepractice/langfuse-rb) | [@NoahFisher](https://github.com/NoahFisher) |
| Elixir   | Unofficial Elixir SDK for Langfuse: [workera-ai/langfuse_sdk](https://github.com/workera-ai/langfuse_sdk) | [@workera-ai](https://github.com/workera-ai) |
| PHP      | PHP library for integrating Langfuse: [janzaba/langfuse-php](https://github.com/janzaba/langfuse-php) | [@janzaba](https://github.com/janzaba) |
| Laravel | Laravel SDK with tracing, prompts, and auto-instrumentation for Prism, Laravel AI, and Neuron AI: [axyr/laravel-langfuse](https://github.com/axyr/laravel-langfuse) | [@axyr](https://github.com/axyr) |
| .NET     | .NET client library for Langfuse: [lukaszzborek/Langfuse-dotnet](https://github.com/lukaszzborek/Langfuse-dotnet) | [@lukaszzborek](https://github.com/lukaszzborek) |
| JVM      | Java/JVM SDK for Langfuse: [kpavlov/langfuse-jvm](https://github.com/kpavlov/langfuse-jvm) | [@kpavlov](https://github.com/kpavlov) |
| Go       | Go SDK for Langfuse: [henomis/langfuse-go](https://github.com/henomis/langfuse-go) | [@henomis](https://github.com/henomis) |
| Go       | Go SDK for Langfuse: [wepala/langfuse-go](https://github.com/wepala/langfuse-go) | [@wepala](https://github.com/wepala) |
| Go       | Go SDK for Langfuse: [oiime/langfuse-go](https://github.com/oiime/langfuse-go) | [@oiime](https://github.com/oiime) |



## Disclaimer

All examples are provided as-is and are meant to illustrate how to deploy and use Langfuse.
Langfuse does not assume any responsibility or liability for the examples given, especially references to external repositories or web-sites.

## Additional Resources

- [DSPy.rb Observability Documentation](https://vicentereig.github.io/dspy.rb/production/observability/) - Zero-config Langfuse integration guide
- [DSPy.rb Concurrent Architecture Deep Dive](https://vicentereig.github.io/dspy.rb/blog/articles/dspy-rb-concurrent-architecture-deep-dive/) - Technical architecture overview
- [DSPy.rb Discussion](https://x.com/highwayvaquero/status/1965031131948196233) - Community thread
