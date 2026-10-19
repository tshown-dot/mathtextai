import os
import json
import logging
from typing import Optional, List, Dict, Any
from .prompt import BTC_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

VISION_EXTRACTION_PROMPT = """Extract all mathematical curriculum content, lesson objectives, problem statements, diagrams descriptions, and equations from this image.
Ensure all mathematical formulas and expressions are transcribed precisely into LaTeX format ($...$ for inline and $$...$$ for display).
Return clean, structured Markdown."""


def call_llm_text(user_content: str, model: Optional[str] = None) -> str:
    """
    Calls the configured LLM (OpenAI, Anthropic, or Gemini) with the BTC system prompt.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            selected_model = model or os.getenv("OPENAI_MODEL", "gpt-4o")
            response = client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": BTC_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.7
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise e

    elif anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            selected_model = model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
            response = client.messages.create(
                model=selected_model,
                max_tokens=4096,
                system=BTC_SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": user_content}
                ]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            raise e

    elif gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            selected_model = model or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
            model_inst = genai.GenerativeModel(
                model_name=selected_model,
                system_instruction=BTC_SYSTEM_PROMPT
            )
            response = model_inst.generate_content(user_content)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise e

    else:
        raise ValueError(
            "No LLM API key detected. Please configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY in your environment."
        )


def call_llm_vision(image_base64: str, mime_type: str = "image/png") -> str:
    """
    Extracts text and LaTeX math from an image using a multimodal model (GPT-4o or Claude 3.5 Sonnet).
    """
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            import google.generativeai as genai
            import base64
            genai.configure(api_key=gemini_key)
            model_name = os.getenv("GEMINI_VISION_MODEL", "gemini-3.6-flash")
            model = genai.GenerativeModel(model_name)
            image_bytes = base64.b64decode(image_base64)
            response = model.generate_content([
                {"mime_type": mime_type, "data": image_bytes},
                VISION_EXTRACTION_PROMPT
            ])
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini Vision call failed: {e}")
            raise e

    elif openai_key:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        data_url = f"data:{mime_type};base64,{image_base64}"
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_VISION_MODEL", "gpt-4o"),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_EXTRACTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            temperature=0.2
        )
        return response.choices[0].message.content or ""

    elif anthropic_key:
        import anthropic
        client = anthropic.Anthropic(api_key=anthropic_key)
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_base64
                            }
                        },
                        {"type": "text", "text": VISION_EXTRACTION_PROMPT}
                    ]
                }
            ]
        )
        return response.content[0].text

    else:
        raise ValueError("A Gemini, OpenAI, or Anthropic API key is required for image extraction.")
