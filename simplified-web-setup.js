const fs = require('fs');
const path = require('path');

// Create minimal web app structure
console.log('Creating simplified web structure...');

// Create directories
const dirs = [
  'dist',
  'dist/assets'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create HTML file
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MedRec App</title>
  <style>
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #root {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #f5f5f7;
      color: #2c3e50;
    }
    .app-container {
      max-width: 800px;
      padding: 20px;
      text-align: center;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      margin: 10px;
    }
    .error {
      color: #e74c3c;
      margin: 20px 0;
    }
    .header {
      margin-bottom: 20px;
    }
    .header h1 {
      color: #3498db;
    }
    pre {
      background-color: #f5f5f7;
      padding: 10px;
      border-radius: 5px;
      text-align: left;
    }
    .footer {
      margin-top: 40px;
      font-size: 0.8em;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="app-container">
      <div class="header">
        <h1>MedRec PDF Processor</h1>
        <p>Medical Referral Document Processing Application</p>
      </div>
      
      <div class="features">
        <h2>Features</h2>
        <ul style="text-align: left;">
          <li>Upload and process PDF documents</li>
          <li>Extract text using direct methods and OCR</li>
          <li>Generate document embeddings for semantic search</li>
          <li>AI-powered chat interface to ask questions about documents</li>
          <li>Form extraction for medical referrals</li>
        </ul>
      </div>
      
      <div class="demo">
        <h2>Simple PDF Viewer Demo</h2>
        <p>Upload a PDF document to view it:</p>
        <input type="file" id="pdf-upload" accept="application/pdf" />
        <div id="pdf-preview" style="margin-top: 20px;"></div>
      </div>
      
      <div class="native-app">
        <h2>Run the Native Application</h2>
        <p>
          For the full experience with all features enabled, run the native app version:
        </p>
        <pre>npm start</pre>
        <p>And in another terminal:</p>
        <pre>npm run android</pre>
        <p>or</p>
        <pre>npm run ios</pre>
      </div>
      
      <div class="footer">
        <p>MedRec PDF Processor - Developed with React Native</p>
      </div>
    </div>
  </div>

  <script>
    // Simple PDF preview
    document.getElementById('pdf-upload').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const pdfPreview = document.getElementById('pdf-preview');
          pdfPreview.innerHTML = '';
          
          const embed = document.createElement('embed');
          embed.src = e.target.result;
          embed.type = 'application/pdf';
          embed.width = '100%';
          embed.height = '500px';
          
          pdfPreview.appendChild(embed);
        };
        reader.readAsDataURL(file);
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync('dist/index.html', htmlContent);
console.log('Created dist/index.html');

console.log('\nSimplified web setup complete!');
console.log('\nYou can open the file directly in a browser:');
console.log(`file://${path.resolve('dist/index.html')}`);
console.log('\nOr serve it using a simple HTTP server with:');
console.log('npx serve dist');