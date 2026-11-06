import asyncio
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import db
from app.services.ai.factory import get_ai_provider


async def main():
    print("=" * 60)
    print("Recall — Health & Connectivity Diagnostics")
    print("=" * 60)

    # 1. Database Check
    print("\n[1] Checking Database Configuration...")
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        print(f"  • SUPABASE_URL: {settings.SUPABASE_URL[:30]}...")
        if db.supabase:
            try:
                res = db.supabase.table("collections").select("count", count="exact").limit(1).execute()
                print(f"  ✓ Supabase PostgreSQL connected successfully! (Count query returned {res.count})")
            except Exception as e:
                print(f"  ✗ Supabase connection failed: {e}")
                print("    Hint: Ensure you ran 'docs/supabase_schema.sql' in the Supabase SQL Editor.")
        else:
            print("  ✗ Supabase client failed to initialize.")
    else:
        print("  ℹ SUPABASE_URL / SUPABASE_KEY not configured in .env.")
        print("    Running in local in-memory fallback mode.")

    # 2. AI Provider Check
    print("\n[2] Checking AI Provider...")
    provider = get_ai_provider()
    print(f"  • Active Provider: {type(provider).__name__}")
    print(f"  • AI_PROVIDER setting: {settings.AI_PROVIDER}")

    if settings.GEMINI_API_KEY:
        keys = [k.strip() for k in settings.GEMINI_API_KEY.split(",") if k.strip()]
        print(f"  • Gemini Keys configured: {len(keys)}")

    if settings.GROQ_API_KEY:
        print("  • Groq Key configured: Yes")

    # Quick test generation
    print("\n[3] Testing Synthesis Pipeline...")
    try:
        schema = {
            "type": "OBJECT",
            "properties": {
                "greeting": {"type": "STRING"}
            },
            "required": ["greeting"]
        }
        res = await provider.generate_structured_json(
            system_instruction="You are a helpful study tutor.",
            user_prompt="Say hello to a medical student in one phrase.",
            response_schema=schema
        )
        print(f"  ✓ Synthesis output: {res}")
    except Exception as e:
        print(f"  ✗ Generation test failed: {e}")

    print("\n" + "=" * 60)
    print("Diagnostics Complete.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

