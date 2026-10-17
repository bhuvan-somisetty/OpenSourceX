-- More free AI providers for Ask (Cerebras, OpenRouter) and a generic OpenAI-compatible endpoint.
ALTER TABLE ask_message DROP CONSTRAINT ask_message_engine_check;
ALTER TABLE ask_message ADD CONSTRAINT ask_message_engine_check
  CHECK (engine IN ('google','groq','cerebras','openrouter','compat','gateway','anthropic','openai','offline'));
