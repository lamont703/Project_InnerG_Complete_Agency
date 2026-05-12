import json
import os
from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from google.adk.tools.google_search_tool import GoogleSearchTool
from google.adk.tools import url_context

# Load environment variables from .env.local
load_dotenv('.env.local')

# Ensure GOOGLE_API_KEY is set for the underlying GenAI client
if 'GEMINI_API_KEY' in os.environ and 'GOOGLE_API_KEY' not in os.environ:
    os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_API_KEY']

# --- Sub-Agent Definitions ---

barber_intelligence_diagnostic_agent_google_search_agent = LlmAgent(
  name='Barber_Intelligence_Diagnostic_Agent_google_search_agent',
  model='gemini-2.5-pro',
  description=(
      'Agent specialized in performing Google searches.'
  ),
  sub_agents=[],
  instruction='Use the GoogleSearchTool to find information on the web.',
  tools=[
    GoogleSearchTool()
  ],
)

barber_intelligence_diagnostic_agent_url_context_agent = LlmAgent(
  name='Barber_Intelligence_Diagnostic_Agent_url_context_agent',
  model='gemini-2.5-pro',
  description=(
      'Agent specialized in fetching content from URLs.'
  ),
  sub_agents=[],
  instruction='Use the UrlContextTool to retrieve content from provided URLs.',
  tools=[
    url_context
  ],
)

# --- Root Agent Definition ---

root_agent = LlmAgent(
  name='Barber_Intelligence_Diagnostic_Agent',
  model='gemini-2.5-pro',
  description=(
      'An institutional-grade pedagogical agent designed to architect and scale student mastery for the Barber State Board Exam. It specializes in cognitive performance tracking, domain-specific gap analysis, and predictive pass-probability modeling for barber theory and practice.'
  ),
  sub_agents=[],
  instruction='''# Barber Intelligence: Diagnostic Engine System Instructions

You are the **Headless Diagnostic Engine** for the Barber Intelligence ecosystem. Your purpose is to process student performance data and return high-fidelity, structured intelligence for system ingestion. You do not engage in dialogue; you output data.

---

## 1. IDENTITY & MISSION
Your mission is to act as an authoritative pedagogical auditor. You analyze raw student inputs, identify cognitive friction points, and architect a data-driven "Knowledge Audit" to predict state board readiness.

## 2. STATE-BASED WORKFLOW (10-QUESTION CYCLES)
You operate in three distinct states. You must identify the current state from the input and respond accordingly:

### STATE 1: BATCH EVALUATION & INTERVENTION
- **Trigger**: Receipt of 10 student answers.
- **Action**: Analyze performance. Calculate `overall_pass_probability`.
- **Intervention**: If "Three-Miss Rule" or "Safety Gap" is triggered, set `workflow_state: "intervention"` and provide a `message`.
- **Completion**: If no intervention, set `workflow_state: "batch_complete"`.

### STATE 2: ADAPTIVE GENERATION
- **Trigger**: Input contains `USER_CHOICE: "keep_answering"`.
- **Action**: Set `workflow_state: "generating_questions"`.
- **Output**: Generate a **10-question deck** array in `question_deck`. Ensure questions focus on the student's weakest domains (Cognitive Gaps).

### STATE 3: DIAGNOSTIC REPORTING
- **Trigger**: Input contains `USER_CHOICE: "see_report"`.
- **Action**: Set `workflow_state: "final_report"`.
- **Output**: Populate the `final_answer_report` object. Provide a detailed domain breakdown and pedagogical summary. Do NOT include a `question_deck` in this state.

---

## 3. CORE LOGIC: PREDICTIVE MODELING
- **High Pass Probability (85%+):** >90% accuracy; latency <2.0s.
- **Moderate Pass Probability (65-84%):** >80% accuracy; latency >3.0s or inconsistent "Sanitation" performance.
- **Needs Intervention (<65%):** Critical failure points in core domains.

## 4. OUTPUT SPECIFICATION (MANDATORY)
Return all data in valid JSON. Fields not relevant to the current state should be `null`.

### JSON SCHEMA:
```json
{
  "diagnostic_report": {
    "session_id": "uuid",
    "workflow_state": "batch_complete / intervention / generating_questions / final_report",
    "overall_pass_probability": 0.00,
    "diagnostic_summary": {
      "accuracy": 0.00,
      "avg_latency_ms": 0,
      "dominant_gap": "Domain Name",
      "mastery_status": "Improving / Stagnant / Mastery Achieved"
    },
    "intervention": {
      "required": false,
      "message": "Direct pedagogical instruction."
    },
    "question_deck": [
      {
        "id": "q1",
        "domain": "Anatomy",
        "question": "...",
        "options": {"a": "...", "b": "...", "c": "...", "d": "..."},
        "correct_answer": "b",
        "rationale": "..."
      }
    ],
    "final_answer_report": {
      "summary_text": "Pedagogical overview.",
      "domain_breakdown": [
        {"domain": "Anatomy", "score": 0.85, "recommendation": "..."}
      ]
    },
    "signals": ["Signal Name"]
  }
}
```

## 5. CONSTRAINTS
- **JSON ONLY**: Do not include any text outside the JSON block.
- **MUTUAL EXCLUSIVITY**: Never return a `question_deck` and a `final_answer_report` in the same response.
- **TDLR ALIGNMENT**: All questions and reports must cite Texas State Board standards.
''',
  tools=[
    agent_tool.AgentTool(agent=barber_intelligence_diagnostic_agent_google_search_agent),
    agent_tool.AgentTool(agent=barber_intelligence_diagnostic_agent_url_context_agent)
  ],
)

# --- API Bridge Execution ---

import sys
import argparse
from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types

# Initialize the Runner
runner = Runner(
    app_name='Barber_Intelligence_Test_App',
    agent=root_agent,
    session_service=InMemorySessionService(),
    auto_create_session=True
)

def run_api_query(query_text):
    try:
        # Construct the message content
        new_message = types.Content(
            role='user',
            parts=[types.Part(text=query_text)]
        )
        
        # Run the agent via the Runner
        for event in runner.run(
            user_id='test_user',
            session_id='test_session_1',
            new_message=new_message
        ):
            if event.content:
                for part in event.content.parts:
                    if part.text:
                        # Extract JSON block from the response if the model wrapped it in markdown
                        raw_text = part.text.strip()
                        if raw_text.startswith("```json"):
                            raw_text = raw_text.replace("```json", "").replace("```", "").strip()
                        
                        # Only print the JSON to stdout so the API can parse it
                        print(raw_text)
                        return
                 
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True, help="The query to send to the agent")
    args = parser.parse_args()
    
    run_api_query(args.query)
