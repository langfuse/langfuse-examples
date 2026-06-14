from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from openai import OpenAI

# --- LangChain chain for main logic ---
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that answers concisely."),
    ("user", "{question}"),
])

model = ChatOpenAI(model="gpt-4o-mini")
parser = StrOutputParser()

chain = prompt | model | parser

langchain_result = chain.invoke({"question": "What is the capital of France?"})
print("LangChain:", langchain_result)


# --- Direct OpenAI call bypassing LangChain ---
def direct_openai_call(text: str) -> str:
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": f"Summarize in one line: {text}"},
        ],
    )
    return response.choices[0].message.content


summary = direct_openai_call(langchain_result)
print("Direct OpenAI:", summary)

