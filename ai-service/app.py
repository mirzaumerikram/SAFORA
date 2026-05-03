from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB

# Register blueprints
from routes.pink_pass import pink_pass_bp
from routes.pricing   import pricing_bp
from routes.matching  import matching_bp

app.register_blueprint(pink_pass_bp, url_prefix='/api/pink-pass')
app.register_blueprint(pricing_bp,   url_prefix='/api/pricing')
app.register_blueprint(matching_bp,  url_prefix='/api/matching')

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'SAFORA AI Microservice',
        'version': '1.0.0',
        'endpoints': [
            '/api/pink-pass/verify-frames',
            '/api/pricing/predict',
            '/api/matching/rank-drivers',
        ]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
