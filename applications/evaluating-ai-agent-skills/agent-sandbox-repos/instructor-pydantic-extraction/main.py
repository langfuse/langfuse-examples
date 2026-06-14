import instructor
from openai import OpenAI
from pydantic import BaseModel


class Person(BaseModel):
    name: str
    age: int
    occupation: str


client = instructor.from_openai(OpenAI())

person = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=Person,
    messages=[
        {
            "role": "user",
            "content": "Extract: John Smith is a 32-year-old software engineer.",
        },
    ],
)

print(person)

