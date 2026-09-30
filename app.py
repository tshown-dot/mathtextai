import os
import subprocess
import tempfile
import io
from flask import Flask, render_template, request, send_file

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    text = request.form.get('markdown_text', '').strip()
    if not text:
        return "Please paste some markdown text first.", 400

    with tempfile.NamedTemporaryFile(delete=False, suffix='.md', mode='w', encoding='utf-8') as temp_md:
        temp_md.write(text)
        md_path = temp_md.name

    docx_path = md_path.replace('.md', '.docx')

    try:
        subprocess.run(
            ['pandoc', md_path, '-o', docx_path, '--from', 'markdown+tex_math_dollars+tex_math_single_backslash'],
            check=True
        )

        with open(docx_path, 'rb') as f:
            file_data = f.read()
        
        buffer = io.BytesIO(file_data)

        return send_file(
            buffer,
            as_attachment=True,
            download_name='Converted_Math_Document.docx',
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except subprocess.CalledProcessError as e:
        return f"Conversion failed. Is Pandoc installed? Error: {str(e)}", 500
    except Exception as e:
        return f"An unexpected error occurred: {str(e)}", 500

    finally:
        if os.path.exists(md_path):
            os.remove(md_path)
        if os.path.exists(docx_path):
            os.remove(docx_path)

if __name__ == '__main__':
    print("🚀 MathtextAI server starting at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
