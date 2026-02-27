# PDF Service Setup Guide

The E-Sign platform requires a PDF service for HTML-to-PDF and PDF-to-HTML conversion. This guide explains how to set up the PDF service.

## Option 1: Puppeteer (Recommended for Node.js)

### Installation

```bash
cd backend
npm install puppeteer
```

### Implementation

The PDF service in `pdf.service.js` has placeholder code for Puppeteer. Once installed, uncomment the Puppeteer implementation in the `htmlToPdf` function.

### Configuration

Set the following environment variables:

```bash
PDF_SERVICE_TYPE=puppeteer
PDF_SERVICE_TIMEOUT=30000
PDF_SERVICE_MAX_RETRIES=2
```

### Docker Considerations

If running in Docker, add these dependencies to your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils
```

## Option 2: External Python Service with WeasyPrint

### Python Service Setup

Create a separate Python service:

```python
# pdf_service.py
from flask import Flask, request, send_file
from weasyprint import HTML
import io

app = Flask(__name__)

@app.route('/html-to-pdf', methods=['POST'])
def html_to_pdf():
    html_content = request.json.get('html')
    options = request.json.get('options', {})
    
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return send_file(pdf_buffer, mimetype='application/pdf')

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001)
```

### Installation

```bash
pip install flask weasyprint
python pdf_service.py
```

### Configuration

```bash
PDF_SERVICE_TYPE=python
PDF_SERVICE_URL=http://localhost:3001
PDF_SERVICE_TIMEOUT=30000
PDF_SERVICE_MAX_RETRIES=2
```

## Option 3: Cloud Service (AWS Lambda, Google Cloud Functions)

### AWS Lambda Setup

1. Create a Lambda function with Puppeteer layer
2. Deploy the function with API Gateway
3. Configure the endpoint URL

### Configuration

```bash
PDF_SERVICE_TYPE=cloud
PDF_SERVICE_URL=https://your-lambda-url.amazonaws.com/pdf
PDF_SERVICE_TIMEOUT=30000
PDF_SERVICE_MAX_RETRIES=2
```

## Testing the PDF Service

Once configured, test the service:

```bash
# Start the backend server
npm run dev

# Check PDF service health
curl http://localhost:5000/api/health
```

The health check should show the PDF service status.

## Timeout and Retry Configuration

- **Timeout**: 30 seconds (configurable via `PDF_SERVICE_TIMEOUT`)
- **Retries**: 2 attempts (configurable via `PDF_SERVICE_MAX_RETRIES`)
- **Retry Strategy**: Exponential backoff (1s, 2s, 4s)

## Performance Considerations

- **Puppeteer**: Best for complex HTML/CSS, slower startup
- **WeasyPrint**: Faster for simple documents, limited CSS support
- **Cloud Service**: Scalable, but adds network latency

## Troubleshooting

### Puppeteer Issues

- **Error: Failed to launch browser**: Install Chrome/Chromium dependencies
- **Timeout errors**: Increase `PDF_SERVICE_TIMEOUT`
- **Memory issues**: Limit concurrent PDF generations

### Python Service Issues

- **Connection refused**: Ensure Python service is running on port 3001
- **WeasyPrint errors**: Check font and CSS compatibility

### Cloud Service Issues

- **Cold start delays**: Consider provisioned concurrency
- **Timeout errors**: Increase Lambda timeout and `PDF_SERVICE_TIMEOUT`
