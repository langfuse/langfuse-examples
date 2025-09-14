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

## Deployment Examples

Here, we highlight community maintained deployment examples for various cloud providers.
For the Langfuse-maintained modules checkout [langfuse-terraform-aws](https://github.com/langfuse/langfuse-terraform-aws) and [langfuse-terraform-gcp](https://github.com/langfuse/langfuse-terraform-gcp).

| Example                                                                                             | Description                                                                                                                                                                       | Contributor                              |
|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| [AWS Terraform](https://github.com/tubone24/langfuse-v3-terraform)                                  | This Terraform module provides infrastructure components for deploying Langfuse v3 self-hosted on Amazon Web Service (AWS).                                                       | [@tubone24](https://github.com/tubone24) |
| [AWS CDK](https://github.com/aws-samples/deploy-langfuse-on-ecs-with-fargate/tree/main/langfuse-v3) | This repository contains the AWS CDK Python code for deploying the Langfuse application using Amazon Elastic Container Registry (ECR) and Amazon Elastic Container Service (ECS). | [@ksmin23](https://github.com/ksmin23)   |
| [GCP Terraform](https://github.com/sotazum/langfuse-google-cloud-terraform)                         | Terraform configuration for self-hosting Langfuse on Google Cloud.                                                                                                                | [@sotazum](https://github.com/sotazum)   |

## Disclaimer

All examples are provided as-is and are meant to illustrate how to deploy and use Langfuse.
Langfuse does not assume any responsibility or liability for the examples given, especially references to external repositories or web-sites.

## Additional Resources

- [DSPy.rb Observability Documentation](https://vicentereig.github.io/dspy.rb/production/observability/) - Zero-config Langfuse integration guide
- [DSPy.rb Concurrent Architecture Deep Dive](https://vicentereig.github.io/dspy.rb/blog/articles/dspy-rb-concurrent-architecture-deep-dive/) - Technical architecture overview
- [DSPy.rb Discussion](https://x.com/highwayvaquero/status/1965031131948196233) - Community thread
