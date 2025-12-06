import sys
import os
import traceback

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

print("Attempting to import get_chatbot...")
try:
    from llm import get_chatbot
    print("Import successful.")
except Exception as e:
    print(f"Import failed: {e}")
    traceback.print_exc()
    sys.exit(1)

print("Attempting to initialize chatbot...")
try:
    bot = get_chatbot()
    print(f"Chatbot initialized: {type(bot)}")
    response = bot.generate_response("Test")
    print(f"Response: {response}")
except Exception as e:
    print(f"Initialization/Generation failed: {e}")
    traceback.print_exc()
