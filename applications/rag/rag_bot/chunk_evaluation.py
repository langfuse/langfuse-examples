# A chunk evaluation is added to find the right chunk size and overlap for the RAG pipeline.
# In this example, we evaluate multiple chunk sizes and overlaps to find the right balance,
# with the following combinations:
# | chunk_size | chunk_overlap |
# |------------|---------------|
# | 128        | 0            |
# | 128        | 64           |
# | 256        | 0            |
# | 256        | 128          |
# | 512        | 0            |
# | 512        | 256          |

from typing import Annotated, TypedDict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langfuse import Evaluation, get_client
from langfuse.experiment import ExperimentItem
from main import get_retriever, urls

load_dotenv()
langfuse = get_client()

print("Fetching dataset")
dataset = langfuse.get_dataset(name="rag_bot_evals")

def create_retriever_task(chunk_size: int, chunk_overlap: int):
  """Factory function to create a retriever task with specific chunk settings."""

  def retriever_task(*, item: ExperimentItem, **kwargs):
    question = item.input["question"]
    retriever = get_retriever(urls=urls, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    docs = retriever.invoke(question)

    return {"documents": docs}

  return retriever_task


class RetrieverRelevanceGrade(TypedDict):
  explanation: Annotated[str, ..., "Explain your reasoning for the score"]
  relevant: Annotated[list[int], ..., "Please rate the relevance of each chunk to the question from 1 to 10"]


retrieval_relevance_llm = ChatOpenAI(model="gpt-4o", temperature=0).with_structured_output(
  RetrieverRelevanceGrade, method="json_schema", strict=True
)

retrieval_relevance_instructions = """You are evaluating the relevance of a set of chunks to a question. 
You will be given a QUESTION, an EXPECTED OUTPUT, and a set of DOCUMENTS retrieved from the retriever.

Here is the grade criteria to follow:
(1) Your goal is to identify DOCUMENTS that are completely unrelated to the QUESTION
(2) It is OK if the facts have SOME information that is unrelated as long as it is close to the EXPECTED OUTPUT

You should return a list of numbers, one for each chunk, indicating the relevance of the chunk to the question.
"""


# Define evaluation functions
def relevant_chunks_evaluator(*, input, output, expected_output, metadata, **kwargs):
  retrieval_relevance_result = retrieval_relevance_llm.invoke(
    retrieval_relevance_instructions
    + "\n\nQUESTION: "
    + input["question"]
    + "\n\nEXPECTED OUTPUT: "
    + expected_output["answer"]
    + "\n\nDOCUMENTS: "
    + "\n\n".join(doc.page_content for doc in output["documents"])
  )

  # Calculate average relevance score
  relevance_scores = retrieval_relevance_result["relevant"]
  avg_score = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0

  return Evaluation(
    name="retrieval_relevance", value=avg_score, comment=retrieval_relevance_result.get("explanation", "")
  )


chunk_sizes = [128, 256, 512]
for chunk_size in chunk_sizes:
  print(f"Running experiments for chunk_size {chunk_size}")
  # Run experiment with no overlap
  dataset.run_experiment(
    name=f"Chunk precision: chunk_size {chunk_size} and chunk_overlap 0",
    task=create_retriever_task(chunk_size=chunk_size, chunk_overlap=0),
    evaluators=[relevant_chunks_evaluator],
    metadata={"chunk_size": chunk_size, "chunk_overlap": 0},
  )

  # Run experiment with 50% overlap
  chunk_overlap = chunk_size // 2
  dataset.run_experiment(
    name=f"Chunk precision: chunk_size {chunk_size} and chunk_overlap {chunk_overlap}",
    task=create_retriever_task(chunk_size=chunk_size, chunk_overlap=chunk_overlap),
    evaluators=[relevant_chunks_evaluator],
    metadata={"chunk_size": chunk_size, "chunk_overlap": chunk_overlap},
  )

print("Experiment run successfully")
langfuse.flush()
