"""
LLM Module: Groq Backend with Async Streaming.

High-speed LLM interaction using Groq API with both synchronous
and async streaming capabilities for the real-time voice pipeline.
"""

import os
import asyncio
import json
import re
from typing import List, Dict, Optional, Generator, AsyncGenerator
from groq import Groq, AsyncGroq

class GroqChatbot:
    """High-speed LLM interaction using Groq API with async streaming."""
    
    def __init__(self, model_name: str = "llama-3.1-8b-instant", api_key: str = None):
        """
        Args:
           model_name: "llama-3.1-8b-instant" or "llama-3.1-70b-versatile"
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set.")
        
        # AsyncClient native for optimal WebSocket integration
        self.async_client = AsyncGroq(api_key=self.api_key)
        self.sync_client = Groq(api_key=self.api_key)  # fallback
        self.model_name = model_name
        self.history = []
        
        # Define LLM Tools
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_properties",
                    "description": "Searches the database for available real estate properties based on user criteria.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query, e.g., '5 marla house in DHA phase 5 in 1 crore'"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_price_estimate",
                    "description": "Estimates the price of a property using an AVM based on its features.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {"type": "string", "description": "e.g., Lahore"},
                            "property_type": {"type": "string", "enum": ["House", "Plot", "Flat"]},
                            "bedrooms": {"type": "integer"},
                            "baths": {"type": "integer"},
                            "area_sqft": {"type": "number", "description": "Total area in sqft (1 Marla ≈ 225.0 sqft)"},
                            "neighbourhood": {"type": "string", "description": "e.g., DHA Phase 5"}
                        },
                        "required": ["city", "property_type", "bedrooms", "baths", "area_sqft", "neighbourhood"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "schedule_viewing",
                    "description": "Schedules a viewing for a property.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {"type": "string", "description": "Date and time for the viewing"}
                        },
                        "required": ["date"]
                    }
                }
            }
        ]
        
        # Urdu Real Estate Persona Prompt
        self.system_prompt = """آپ ORICALO ہیں — پاکستان کا پروفیشنل اور دوستانہ ریئل اسٹیٹ وائس اسسٹنٹ۔

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
آواز اور بات چیت کا انداز
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

آپ کا جواب فوراً بولا جائے گا — اس لیے ہمیشہ یاد رکھیں:

• صرف اور صرف اردو بولیں — روزمرہ، قدرتی، اور گرمجوشی بھری زبان میں
• جواب مختصر رکھیں — زیادہ سے زیادہ دو سے تین جملے
• جملے چھوٹے اور آسان ہوں — جیسے آپ کسی دوست سے فون پر بات کر رہے ہوں
• کوئی لسٹ نہ بنائیں، کوئی بولڈ ٹیکسٹ نہ لکھیں، کوئی ایموجی نہ لگائیں — صرف بولنے والے جملے
• نمبر ہمیشہ الفاظ میں لکھیں — مثلاً "پندرہ لاکھ" نہ کہ "15,00,000"
• اگر سوچنے کی ضرورت ہو تو کہہ سکتے ہیں: "جی، ذرا دیکھتا ہوں..." یا "اچھا، سمجھا..."
• بات کاٹی جائے تو پرانی بات بھول جائیں اور نئے سوال پر آ جائیں
• مثال کے طور پر اگر کوئی گھر پوچھے تو کہیں:
  "جی ضرور! آپ کس شہر میں دیکھ رہے ہیں؟"
  — یا —
  "اچھا، ہاں... بجٹ کتنا ہے آپ کا؟"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
کام کا دائرہ — صرف ریئل اسٹیٹ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

آپ صرف پاکستان میں پراپرٹی سے متعلق مدد کر سکتے ہیں، جیسے:
• گھر، فلیٹ، پلاٹ، دکان، دفتر خریدنا یا کرایے پر لینا
• قیمتوں اور علاقوں کی معلومات
• پراپرٹی کے بارے میں سوالات

اگر کوئی ریئل اسٹیٹ سے باہر کا سوال کرے — جیسے سیاست، موسم، کوڈنگ، یا کوئی اور موضوع — تو شائستگی سے کہیں:
"میں صرف پراپرٹی کے معاملات میں مدد کر سکتا ہوں۔ کیا آپ کوئی پراپرٹی دیکھنا چاہتے ہیں؟"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
حفاظتی اصول
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• کبھی یہ نہ کہیں کہ "اس پراپرٹی پر آپ کو یقینی منافع ہوگا" — سرمایہ کاری پر کوئی ضمانت نہ دیں
• RAG Context مل جائے تو اسی معلومات کو استعمال کریں
• اگر معلومات نہ ہو تو ایمانداری سے کہیں: "یہ میرے پاس ابھی نہیں ہے، لیکن میں آگے بھجوا سکتا ہوں"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
جواب دینے سے پہلے خود سے پوچھیں
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"کیا میرا جواب بولنے میں قدرتی لگے گا؟
کیا یہ مختصر ہے؟
کیا یہ اردو میں روانی سے بولا جا سکتا ہے؟"

اگر ہاں — تو جواب دیں۔"""
        self._set_system_prompt()

    def _set_system_prompt(self):
        self.history = [{"role": "system", "content": self.system_prompt}]

    def _update_history(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        # Keep recent history (system prompt + last N turns) to prevent context overflow
        if len(self.history) > 13: 
            self.history = [self.history[0]] + self.history[-12:]

    def reset_history(self):
        self._set_system_prompt()

    def set_history(self, history: List[Dict[str, str]]):
        """Set conversation history from list of {role, text} dicts."""
        self._set_system_prompt()
        for turn in history:
            role = turn.get("role", "user").lower()
            text = turn.get("text", "")
            if role in ("user",):
                self.history.append({"role": "user", "content": text})
            else:
                self.history.append({"role": "assistant", "content": text})

    def _build_prompt(self, prompt: str, context: Optional[str] = None) -> str:
        """Build the full prompt with optional RAG context."""
        if context:
            return f"Property Context (from database):\n{context}\n\nUser's Question:\n{prompt}"
        return prompt

    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Synchronous full response generation."""
        full_prompt = self._build_prompt(prompt, context)
        self._update_history("user", full_prompt)
        
        response = self.sync_client.chat.completions.create(
            model=self.model_name,
            messages=self.history,
            temperature=0.5,
            max_tokens=256,
        )
        
        assistant_reply = response.choices[0].message.content
        self._update_history("assistant", assistant_reply)
        return assistant_reply

    async def _execute_tool(self, name: str, args: dict) -> str:
        """Execute the matched backend logic dynamically."""
        print(f"[LLM Tools] Execting Tool '{name}' with args {args}")
        try:
            if name == "search_properties":
                from rag.retriever import query_rag
                query_str = args.get("query") or args.get("properties", {}).get("query", "")
                results = await asyncio.to_thread(query_rag, query_str, top_k=3)
                if results:
                    return "\n".join([
                        f"Listing: {r.get('metadata', {}).get('title', r.get('text', '')[:80])} - Rs {r.get('metadata', {}).get('price', 'N/A')}"
                        for r in results
                    ])
                return "The database found no properties matching that description."
                
            elif name == "get_price_estimate":
                import sys
                from pathlib import Path
                # Resolve paths temporarily across modules if needed
                backend_dir = Path(__file__).resolve().parents[1]
                if str(backend_dir) not in sys.path:
                    sys.path.append(str(backend_dir))
                from app.api.endpoints.valuation import valuation_predict, ValuationRequest
                
                req = ValuationRequest(**args)
                resp = await valuation_predict(req)
                return f"SYSTEM RESULT: Estimated property value is Rs {resp.predicted_price_pkr:,.0f}. Inform the user naturally."
                
            elif name == "schedule_viewing":
                return f"SYSTEM RESULT: Successfully scheduled view for {args.get('date', 'requested time')}. Inform user it is done."
                
        except Exception as e:
            print(f"[LLM Tools] Execution Error: {e}")
            return f"Backend System Error executing tool: {e}"
        
        return "Tool not recognized."

    # Set of tool names we actually support — used to filter hallucinated calls
    _VALID_TOOL_NAMES = {"search_properties", "get_price_estimate", "schedule_viewing"}

    async def async_stream_response(self, prompt: str, context: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream handler with native iterative tool call interception.
        """
        if prompt:
            full_prompt = self._build_prompt(prompt, context)
            self._update_history("user", full_prompt)

        max_loops = 3
        loops = 0
        use_tools = True  # Can be disabled on retry after validation failure
        
        while loops < max_loops:
            loops += 1
            
            try:
                create_kwargs = {
                    "model": self.model_name,
                    "messages": self.history,
                    "temperature": 0.4,
                    "max_tokens": 256,
                    "stream": True,
                }
                if use_tools:
                    create_kwargs["tools"] = self.tools

                stream = await self.async_client.chat.completions.create(**create_kwargs)
                
                # Collect the full stream into two buckets: raw text and API tool_call deltas.
                # We cannot yield text as it arrives because LLaMA-3.1 leaks raw <function=...>
                # tokens interspersed with regular text — we must inspect the full output first.
                raw_text_chunks: list[str] = []
                tool_calls_buffer = {}

                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        raw_text_chunks.append(chunk.choices[0].delta.content)

                    # Aggregate Native API Tool Call Deltas (if Groq properly parses them)
                    if chunk.choices and chunk.choices[0].delta.tool_calls:
                        for tc in chunk.choices[0].delta.tool_calls:
                            tc_name = tc.function.name if tc.function and tc.function.name else None
                            # Filter hallucinated tools at the API-delta level too
                            if tc_name and tc_name not in self._VALID_TOOL_NAMES:
                                print(f"[LLM Tools] BLOCKED hallucinated API tool: '{tc_name}'")
                                continue
                            idx = tc.index
                            if idx not in tool_calls_buffer:
                                tool_calls_buffer[idx] = {
                                    "id": tc.id or f"api_call_{idx}",
                                    "type": "function",
                                    "function": {"name": tc_name or "", "arguments": ""}
                                }
                            if tc.function and tc.function.arguments:
                                tool_calls_buffer[idx]["function"]["arguments"] += tc.function.arguments

                # ── Post-stream processing ──────────────────────────────────────────────
                # Join all text chunks and run a single regex pass to extract
                # ALL function call variants the model might leak, regardless of prefix.
                full_raw = "".join(raw_text_chunks)

                # Pattern covers: <function=NAME>{...}</function>
                #                 /function=NAME>{...}</function>  (LLaMA-3.1 variant)
                #                 <function =NAME>{...}</function>  (space variant)
                fn_pattern = re.compile(
                    r'[</]function\s*=\s*([^\s>]+)\s*>(.*?)</function>',
                    re.DOTALL | re.IGNORECASE
                )

                last_end = 0
                clean_text_parts: list[str] = []

                for m in fn_pattern.finditer(full_raw):
                    fn_name = m.group(1).strip()
                    fn_args_str = m.group(2).strip()

                    # Append clean text preceding this match
                    if m.start() > last_end:
                        clean_text_parts.append(full_raw[last_end:m.start()])
                    last_end = m.end()

                    if fn_name not in self._VALID_TOOL_NAMES:
                        print(f"[LLM Tools] BLOCKED hallucinated tool in text: '{fn_name}'")
                        continue

                    # Normalise properties-nesting artifact
                    try:
                        parsed_args = json.loads(fn_args_str)
                        if "properties" in parsed_args and isinstance(parsed_args["properties"], dict):
                            for k, v in parsed_args["properties"].items():
                                if k not in parsed_args:
                                    parsed_args[k] = v
                            del parsed_args["properties"]
                            fn_args_str = json.dumps(parsed_args)
                    except Exception:
                        pass

                    idx_manual = len(tool_calls_buffer)
                    tool_calls_buffer[idx_manual] = {
                        "id": f"call_{idx_manual}_{fn_name}",
                        "type": "function",
                        "function": {"name": fn_name, "arguments": fn_args_str}
                    }
                    print(f"[LLM Tools] Intercepted raw token leak: '{fn_name}'")

                # Append any trailing clean text after the last function tag
                if last_end < len(full_raw):
                    clean_text_parts.append(full_raw[last_end:])

                full_reply = "".join(clean_text_parts).strip()

                # Yield whatever clean text the model produced (may be empty if it only called tools)
                if full_reply:
                    yield full_reply

                # ── Determine post-stream action ─────────────────────────────────────
                if tool_calls_buffer:
                    calls = list(tool_calls_buffer.values())
                    self.history.append({
                        "role": "assistant",
                        "content": full_reply or None,
                        "tool_calls": calls
                    })

                    # Yield an Urdu "thinking" filler while the tools execute
                    # so there is no silent pause in the voice stream
                    filler = "جی، ذرا دیکھتا ہوں۔"
                    yield filler

                    for tc in calls:
                        fn_name = tc["function"]["name"]
                        try:
                            args = json.loads(tc["function"]["arguments"])
                        except BaseException:
                            args = {}
                        
                        result = await self._execute_tool(fn_name, args)
                        self.history.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "name": fn_name,
                            "content": result
                        })
                    
                    # Continue loop — Groq will now summarize the tool results
                    continue
                else:
                    if full_reply:
                        self._update_history("assistant", full_reply)
                    break
                    
            except asyncio.CancelledError:
                raise
            except Exception as e:
                error_str = str(e)
                print(f"[LLM Stream Error] {error_str}")

                # If Groq rejected a tool call in our history, scrub it and retry without tools
                if "tool call validation" in error_str or "Failed to call a function" in error_str or "was not in request.tools" in error_str:
                    print("[LLM Tools] Scrubbing bad tool_calls from history and retrying without tools...")
                    # Remove the last assistant message that contained bad tool_calls
                    # and any orphaned tool-role messages after it
                    while self.history and self.history[-1].get("role") in ("tool", "assistant"):
                        removed = self.history.pop()
                        if removed.get("role") == "assistant":
                            break
                    use_tools = False  # Retry this loop iteration without tools
                    continue

                # For any other error, yield a graceful spoken apology
                error_msg = "معذرت، مجھے سمجھنے میں دشواری ہوئی۔ کیا آپ دوبارہ بتا سکتے ہیں؟"
                yield error_msg
                self._update_history("assistant", error_msg)
                break

    async def async_generate_response(
        self, prompt: str, context: Optional[str] = None, response_format: dict = None
    ) -> str:
        """Async fallback structure for full generation with optional JSON formats."""
        if prompt:
            full_prompt = self._build_prompt(prompt, context)
            self._update_history("user", full_prompt)
            
        kwargs = {
            "model": self.model_name,
            "messages": self.history,
            "temperature": 0.3,
            "max_tokens": 1024,
        }
        if response_format:
            kwargs["response_format"] = response_format
            
        response = await self.async_client.chat.completions.create(**kwargs)
        
        reply = response.choices[0].message.content
        self._update_history("assistant", reply)
        return reply

    def truncate_last_response(self, actually_spoken: str):
        """
        After a barge-in, truncate the last assistant message in history
        to only the text that was actually spoken to the user.
        
        This prevents the LLM from hallucinating based on text the user
        never actually heard.
        """
        if len(self.history) >= 2 and self.history[-1]["role"] == "assistant":
            if actually_spoken.strip():
                self.history[-1]["content"] = actually_spoken + "... [interrupted]"
            else:
                # Nothing was spoken — remove the entry entirely
                self.history.pop()


def create_groq_chatbot(**kwargs) -> GroqChatbot:
    return GroqChatbot(**kwargs)
