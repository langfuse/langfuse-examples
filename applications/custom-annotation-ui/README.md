# Custom Annotation UI

A custom annotation interface for reviewing LLM outputs from Langfuse annotation queues.

![Screenshot of Custom Annotation UI](./assets/screenshot.png)

Built with:
- **Next.js 15**: React framework with App Router
- **Langfuse SDK**: Type-safe API access to Langfuse annotation queues and traces
- **Tailwind CSS**: Styling with shadcn/ui components
- **TypeScript**: Full type safety


## Why Build This?

While Langfuse provides powerful annotation queue functionality, non-technical subject matter experts (SMEs) often need a simplified, domain-specific interface to review LLM outputs effectively. This custom UI:

- **Removes technical complexity**: SMEs can review traces without needing Langfuse platform access or understanding the full trace structure
- **Provides focused workflows**: Custom interface shows only what reviewers need to see, hiding technical details
- **Enables keyboard shortcuts**: Fast navigation keeps reviewers in flow state
- **Customizable rendering**: Adapt the interface to your domain (chat, emails, code, etc.)
- **Maintains Langfuse integration**: All scores and annotations sync back to Langfuse via the SDK

## Prerequisites

- Node.js 18+
- Langfuse credentials (Cloud or Self-Hosted)
- Langfuse annotation queues with traces to review

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file with your Langfuse credentials:

```bash
NEXT_PUBLIC_LANGFUSE_HOST=https://cloud.langfuse.com
NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

Get your Langfuse keys from [https://cloud.langfuse.com](https://cloud.langfuse.com)

## How to Run

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the annotation interface.

## Learn More

- [Langfuse Annotation Queues Documentation](https://langfuse.com/docs/scores/annotation)
- [Hamel's Guide: What Makes a Good Custom Interface](https://hamel.dev/blog/posts/evals-faq/what-makes-a-good-custom-interface-for-reviewing-llm-outputs.html)
- [Langfuse Documentation](https://langfuse.com/docs)
