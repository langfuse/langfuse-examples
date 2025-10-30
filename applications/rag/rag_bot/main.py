from typing import List

from dotenv import load_dotenv
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.retrievers import BaseRetriever
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langfuse import get_client, observe
from langfuse.langchain import CallbackHandler

load_dotenv()

urls = [
  "https://langfuse.com/docs",
  "https://langfuse.com/guides/cookbook/example_evaluating_multi_turn_conversations",
  "https://langfuse.com/guides/cookbook/example_simulated_multi_turn_conversations",
]

langfuse = get_client()
langfuse_handler = CallbackHandler()

bot = ChatOpenAI(model="gpt-5-mini")

# Add decorator so this function is traced in Lngfuse
@observe()
def rag_bot(question: str):
  retriever = get_retriever(urls, chunk_size=256, chunk_overlap=0)
  # Trace the document retrieval, and add the documents to the span
  with langfuse.start_as_current_observation(name="retrieve_documents", input=question, as_type="retriever") as span:
    docs = retriever.invoke(question)
    span.update(output=docs)
  docs_string = "".join(doc.page_content for doc in docs)

  instructions = f"""You are a helpful Langfuse assistant.
        Use the following source documents to answer the user's questions.
        If you don't know the answer, just say that you don't know.
        Use three sentences maximum and keep the answer concise.

        Documents:
        {docs_string}"""

  ai_msg = bot.invoke(
    [
      {"role": "system", "content": instructions},
      {"role": "user", "content": question},
    ],
    config={
      "callbacks": [langfuse_handler]
    },  # Add the Langfuse callback to the LLM trace, so we can trace the LLM generation
  )

  return {"answer": ai_msg.content, "documents": docs}

def get_retriever(urls: List[str], chunk_size: int = 250, chunk_overlap: int = 0, k: int = 3) -> BaseRetriever:
  docs = [WebBaseLoader(url).load() for url in urls]
  docs_list = [item for sublist in docs for item in sublist]

  text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=chunk_size, chunk_overlap=chunk_overlap
  )
  doc_splits = text_splitter.split_documents(docs_list)

  vectorstore = InMemoryVectorStore.from_documents(
    documents=doc_splits,
    embedding=OpenAIEmbeddings(),
  )

  return vectorstore.as_retriever(k=k)



if __name__ == "__main__":
  question = "What is Langfuse?"
  print("Running question on the RAG bot...")
  result = rag_bot(question)
  print(f"\nQuestion: {question}")
  print(f"\nAnswer:\n{result['answer']}\n")
  print(f"Sources: {len(result['documents'])} documents retrieved")

  # Flush events in short-lived applications
  langfuse.flush()
