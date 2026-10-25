
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    max_retries=2,
    api_key="AIzaSyDC67ETr0iF5TRcHKqQOA3sDRgTmaInOXk"
)

response = llm.invoke(
    "Explain RAG in an AI application in five bullet points."
)

print(response.content)
