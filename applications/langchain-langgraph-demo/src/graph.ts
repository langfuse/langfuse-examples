import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { dateDiffTool } from "./tools/dateDiff.ts";
import Langfuse from "langfuse";
import { config } from "dotenv";

// Load environment variables first
config();

// Define the tools
const tools = [dateDiffTool];

// Initialize the model
const model = new ChatOpenAI({
  model: "gpt-5-mini"
});

// Initialize Langfuse client for prompt management (after env vars are loaded)
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

/**
 * Create the agent graph with a prompt from Langfuse
 */
export async function createGraph() {
  // Fetch the chat-type prompt from Langfuse
  const prompt = await langfuse.getPrompt("time-difference-agent");
  
  // Compile the prompt with current timestamp variable
  const compiledPrompt = prompt.compile({
    current_time: new Date().toISOString()
  });
  
  // Pass the compiled prompt directly to createReactAgent
  // It expects a system message in the format: { role: 'system', content: '...' }
  const systemMsg = compiledPrompt.find((msg: any) => msg.role === 'system');
  
  const graph = createReactAgent({
    llm: model,
    tools,
    messageModifier: systemMsg.content,
  });
  
  return { 
    graph, 
    promptData: {
      promptName: prompt.name,
      promptVersion: prompt.version,
    }
  };
}

