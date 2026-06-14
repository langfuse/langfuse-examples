from openai import OpenAI

client = OpenAI()

# Simulates fetching context from a vector DB
def fetch_context(query: str) -> str:
    fake_docs = {
        "python": "Python is a high-level programming language created by Guido van Rossum in 1991.",
        "rust": "Rust is a systems programming language focused on safety and performance.",
    }
    for key, doc in fake_docs.items():
        if key in query.lower():
            return doc
    return "No relevant context found."


def generate_answer(question: str, context: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"Answer based on this context:\n{context}"},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content


question = "Tell me about Python"
context = fetch_context(question)
answer = generate_answer(question, context)
print(answer)

