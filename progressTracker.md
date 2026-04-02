# Memory Feature - Progress Tracker

## Phase 1: Database Layer ✅ DONE
- [x] `backend/app/db_tables/caller.py` — Caller model (phone-based profiles with preferences)
- [x] `backend/app/db_tables/conversation.py` — Conversation, ConversationTurn, ConversationEntity, RagRetrieval models
- [x] `backend/app/db_tables/feedback.py` — Feedback model (likes, dislikes, conversions)
- [x] `backend/app/main.py` — Registered new model imports in startup

## Phase 2: Services ✅ DONE
- [x] `backend/app/services/__init__.py` — Package init
- [x] `backend/app/services/entity_extractor.py` — Regex entity extraction (locations, budget, bedrooms, area, property type, intents)
- [x] `backend/app/services/session_memory.py` — In-memory session accumulator with batch DB persist
- [x] `backend/app/services/caller_memory.py` — Long-term caller profile management (get_or_create, build_profile_context, update_preferences, generate_summary)

## Phase 3: Schemas + REST Endpoints ✅ DONE
- [x] `backend/app/schemas/caller.py` — CallerCreate, CallerUpdate, CallerOut
- [x] `backend/app/schemas/conversation.py` — ConversationOut, ConversationTurnOut, ConversationDetailOut
- [x] `backend/app/schemas/memory_analytics.py` — AnalyticsKPIs, PopularArea, RecentConversation, AnalyticsDashboard
- [x] `backend/app/schemas/feedback.py` — FeedbackCreate, FeedbackOut
- [x] `backend/app/api/endpoints/callers.py` — Full CRUD + phone lookup
- [x] `backend/app/api/endpoints/conversations.py` — List, detail with turns, by caller
- [x] `backend/app/api/endpoints/feedback_ep.py` — Create + list by caller/conversation
- [x] `backend/app/api/endpoints/analytics.py` — Added GET /dashboard, /entity-frequency, /peak-usage
- [x] `backend/app/main.py` — Registered callers, conversations, feedback_ep routers

## Phase 4: Pipeline Integration ✅ DONE
- [x] `backend/app/api/endpoints/voice_orchestrator.py` — Memory hooks at session start (caller load), per-turn (entity extraction + context enrichment), session end (persist + summary + preference update)
- [x] `backend/app/api/endpoints/dialogue.py` — Entity extraction + caller context injection via metadata.phone_number

## Phase 5: Frontend ✅ DONE
- [x] `frontend/lib/types.ts` — Added AnalyticsKPIs, PopularArea, RecentConversation, AnalyticsDashboard, CallerProfile interfaces
- [x] `frontend/app/analytics/page.tsx` — Replaced all mock data with real API calls (GET /analytics/dashboard + GET /conversations/{id})
- [x] `frontend/app/console/page.tsx` — Added phone number input field + pass as WebSocket query param
