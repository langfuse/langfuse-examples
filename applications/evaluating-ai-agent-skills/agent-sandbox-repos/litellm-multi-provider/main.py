import litellm

# Instrument LiteLLM with Langfuse — all completion calls are
# automatically traced (requires LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
# and LANGFUSE_HOST env vars to be set).
litellm.success_callback = ["langfuse"]
litellm.failure_callback = ["langfuse"]

messages = [
    {"role": "system", "content": "You are a helpful assistant. Reply in one sentence."},
    {"role": "user", "content": "What is the capital of Japan?"},
]

# Call OpenAI via LiteLLM
response_openai = litellm.completion(
    model="gpt-4o-mini",
    messages=messages,
)
print("OpenAI:", response_openai.choices[0].message.content)

# Call Anthropic via LiteLLM
response_anthropic = litellm.completion(
    model="claude-3-5-haiku-20241022",
    messages=messages,
)
print("Anthropic:", response_anthropic.choices[0].message.content)

