from flask import Flask, render_template, request, jsonify
import openpyxl
from io import BytesIO
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game')
def game():
    return render_template('game.html')

@app.route('/api/parse-questions', methods=['POST'])
def parse_questions():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    f = request.files['file']
    if not f.filename.endswith('.xlsx'):
        return jsonify({'error': 'File must be .xlsx'}), 400
    try:
        wb = openpyxl.load_workbook(BytesIO(f.read()))
        ws = wb.active
        questions = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[2]:
                continue
            questions.append({
                'round':     str(row[0] or 'Regular').strip(),
                'category':  str(row[1] or '').strip(),
                'question':  str(row[2]).strip(),
                'answer':    str(row[3] or '').strip(),
                'points':    int(row[4]) if row[4] else 10,
                'lightning': bool(row[5]) if row[5] is not None else False,
            })
        return jsonify({'questions': questions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)
