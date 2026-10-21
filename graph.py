import operator
from typing import Annotated, TypedDict, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from schemas import LimaResponse

class LimaState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    reply: str
    follow_up_suggestions: List[str]

# Initialize LLM with structured output
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
structured_llm = llm.with_structured_output(LimaResponse)

def generate_reply_node(state: LimaState):
    messages = state["messages"]
    system_prompt = (
        "You are Lima, an intelligent AI assistant. Provide a helpful primary reply "
        "and suggest 2 relevant follow-up actions or questions."
    )
    full_prompt = [SystemMessage(content=system_prompt)] + messages
    
    # Invoke structured LLM
    result: LimaResponse = structured_llm.invoke(full_prompt)
    
    return {
        "reply": result.reply,
        "follow_up_suggestions": result.follow_up_suggestions,
        "messages": [AIMessage(content=result.reply)]
    }

# Build Graph
workflow = StateGraph(LimaState)
workflow.add_node("generator", generate_reply_node)
workflow.set_entry_point("generator")
workflow.add_edge("generator", END)

lima_app = workflow.compile()
