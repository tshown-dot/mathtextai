import os
import shutil
import tempfile
import subprocess
import logging
from flask import (
    Blueprint,
    render_template,
    request,
    jsonify,
    send_file,
    current_app,
)
from werkzeug.utils import secure_filename

from .prompt import build_user_prompt
from .extractors import (
    extract_docx_text,
    extract_pdf_text,
    encode_image_base64,
    TEXT_PDF_EXTS,
    DOCX_EXTS,
    IMAGE_EXTS,
)
from .llm import call_llm_text, call_llm_vision

logger = logging.getLogger(__name__)

btc_bp = Blueprint(
    "btc",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static/btc",
)


@btc_bp.route("/", methods=["GET"])
def index():
    """Renders the Building Thinking Classrooms (BTC) lesson generator UI."""
    return render_template("btc/index.html")


@btc_bp.route("/generate", methods=["POST"])
def generate():
    """
    Processes prompt or uploaded files, coordinates curriculum extraction,
    and calls the LLM with the BTC system prompt.
    """
    try:
        topic_or_prompt = request.form.get("prompt", "").strip()
        grade_level = request.form.get("grade_level", "").strip()
        extracted_content = ""

        # Check if a file was uploaded
        file = request.files.get("file")
        if file and file.filename:
            filename = secure_filename(file.filename)
            ext = os.path.splitext(filename)[1].lower()

            if ext in DOCX_EXTS:
                extracted_content = extract_docx_text(file.stream)
            elif ext in TEXT_PDF_EXTS:
                pdf_text, is_scanned = extract_pdf_text(file.stream)
                if is_scanned:
                    # Attempt vision extraction if converted or direct notification
                    extracted_content = f"{pdf_text}\n[Notice: PDF appears scanned. OCR / direct text was minimal.]"
                else:
                    extracted_content = pdf_text
            elif ext in IMAGE_EXTS:
                img_b64 = encode_image_base64(file.stream)
                mime = file.content_type or "image/png"
                extracted_content = call_llm_vision(img_b64, mime_type=mime)
            else:
                return jsonify({"error": f"Unsupported file format: {ext}"}), 400

        if not topic_or_prompt and not extracted_content:
            return jsonify({"error": "Please provide a lesson prompt, topic, or upload a curriculum file."}), 400

        user_prompt = build_user_prompt(
            topic_or_prompt=topic_or_prompt,
            grade_level=grade_level,
            extracted_content=extracted_content,
        )

        # Call LLM with BTC instructions
        generated_markdown = call_llm_text(user_prompt)

        return jsonify({
            "success": True,
            "markdown": generated_markdown,
            "extracted_preview": extracted_content[:300] if extracted_content else ""
        })

    except Exception as e:
        logger.exception("Error generating BTC lesson:")
        return jsonify({"error": str(e)}), 500


@btc_bp.route("/download", methods=["POST"])
def download():
    """
    Accepts finalized Markdown and triggers Pandoc to convert it to DOCX
    using the specified reference template and flags.
    """
    try:
        # Markdown can be sent as JSON or form data
        if request.is_json:
            markdown_content = request.json.get("markdown", "")
        else:
            markdown_content = request.form.get("markdown", "")

        if not markdown_content.strip():
            return jsonify({"error": "No markdown content provided for export."}), 400

        # Locate reference template specifically for BTC
        # Isolated inside the btc folder so it never interferes with MathTextAI's custom_template.docx
        template_candidates = [
            os.path.join(os.path.dirname(__file__), "btc_template.docx"),
            os.path.join(os.path.dirname(__file__), "custom_template.docx"),
        ]
        template_path = next((p for p in template_candidates if os.path.exists(p)), None)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_md_path = os.path.join(tmpdir, "input_btc.md")
            output_docx_path = os.path.join(tmpdir, "BTC_Lesson_Output.docx")

            with open(input_md_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)

            # Locate pandoc executable
            pandoc_bin = (
                os.environ.get("PANDOC_PATH")
                or shutil.which("pandoc")
                or os.path.join(current_app.root_path, "bin", "pandoc")
                or os.path.join(os.getcwd(), "bin", "pandoc")
                or "/opt/homebrew/bin/pandoc"
                or "/usr/bin/pandoc"
                or "pandoc"
            )

            # Build Pandoc CLI command
            # pandoc input_btc.md -o BTC_Lesson_Output.docx --reference-doc=custom_template.docx --variable=geometry:margin=0.5in --variable=table-style:"Table Grid"
            cmd = [
                pandoc_bin,
                input_md_path,
                "-o",
                output_docx_path,
                "--variable=geometry:margin=0.5in",
                '--variable=table-style:Table Grid',
            ]

            if template_path:
                cmd.append(f"--reference-doc={template_path}")

            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False
            )

            if result.returncode != 0:
                logger.error(f"Pandoc error: {result.stderr}")
                return jsonify({"error": f"Pandoc conversion failed: {result.stderr}"}), 500

            # Automatically apply dark grey borders, shaded header, and cell padding
            try:
                from doc_formatter import format_math_document
                format_math_document(output_docx_path)
            except Exception as e:
                logger.warning(f"Could not apply advanced table styling: {e}")

            return send_file(
                output_docx_path,
                as_attachment=True,
                download_name="BTC_Lesson_Output.docx",
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )

    except Exception as e:
        logger.exception("Error processing DOCX download:")
        return jsonify({"error": str(e)}), 500
