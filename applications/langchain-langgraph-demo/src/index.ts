import { config } from "dotenv";
import { createGraph } from "./graph.ts";
import { HumanMessage } from "@langchain/core/messages";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { CallbackHandler } from "@langfuse/langchain";


config(); // Load .env

const sdk = new NodeSDK({
  spanProcessors: [
    new LangfuseSpanProcessor(),
  ],
})
sdk.start();

// Initialize the Langfuse CallbackHandler
const langfuseHandler = new CallbackHandler({
  sessionId: "user-session-123",
  userId: "user-abc",
  tags: ["langchain-test"],
});

async function main() {
  const input = process.argv[2] || "From 3 March 2025 14:00 to 7 March 2025 09:30";
  console.log("Running agent...\n");

  // Create the graph
  const { graph } = await createGraph();
  
  // Invoke the graph
  const result = await graph.invoke(
    { messages: [new HumanMessage(input)] }, 
    { callbacks: [langfuseHandler] }
  );

  // Extract and display the final AI response
  const lastMessage = result.messages[result.messages.length - 1];
  if (lastMessage.content) {
    console.log("Agent:", lastMessage.content);
  }
}

main().catch(console.error);

