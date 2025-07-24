import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

const App = () => {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please paste some code to review.');
      return;
    }

    setIsLoading(true);
    setError('');
    setFeedback('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Please act as an expert code reviewer.
        Review the following code and provide detailed feedback on:
        1.  Potential bugs or errors.
        2.  Adherence to best practices.
        3.  Style and readability issues.
        4.  Suggestions for improvement and optimization.
        Format your response clearly, using headings and bullet points.

        Here is the code:
        \`\`\`
        ${code}
        \`\`\`
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setFeedback(response.text);
    } catch (err) {
      console.error(err);
      setError('An error occurred while reviewing the code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Automated Code Review</h1>
      <p style={styles.subtitle}>Powered by Gemini</p>
      
      <div style={styles.editorContainer}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          style={styles.textarea}
          aria-label="Code Input"
          spellCheck="false"
        />
      </div>

      <button
        onClick={handleReview}
        disabled={isLoading}
        style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
        aria-label={isLoading ? "Reviewing code" : "Review Code"}
      >
        {isLoading ? 'Reviewing...' : 'Review Code'}
      </button>

      {error && <p style={styles.error} role="alert">{error}</p>}

      {isLoading && (
          <div style={styles.spinnerContainer} aria-label="Loading feedback">
              <div style={styles.spinner}></div>
          </div>
      )}

      {feedback && (
        <div style={styles.feedbackContainer} aria-live="polite">
          <h2 style={styles.feedbackTitle}>Review Feedback</h2>
          <pre style={styles.feedbackContent}>
            <code>{feedback}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a73e8',
    margin: '0 0 10px 0',
  },
  subtitle: {
    textAlign: 'center',
    margin: '0 0 30px 0',
    color: '#5f6368',
    fontSize: '1rem',
  },
  editorContainer: {
    marginBottom: '20px',
  },
  textarea: {
    width: '100%',
    height: '300px',
    padding: '15px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontFamily: "'SF Mono', 'Consolas', 'Menlo', monospace",
    lineHeight: '1.5',
    boxSizing: 'border-box',
    resize: 'vertical',
    backgroundColor: '#f8f9fa',
    color: '#202124',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1a73e8',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  buttonDisabled: {
    backgroundColor: '#9ac1f6',
    cursor: 'not-allowed',
  },
  error: {
    color: '#d93025',
    textAlign: 'center',
    marginTop: '15px',
  },
  spinnerContainer: {
      display: 'flex',
      justifyContent: 'center',
      padding: '20px'
  },
  spinner: {
      border: '4px solid rgba(0, 0, 0, 0.1)',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      borderLeftColor: '#1a73e8',
      animation: 'spin 1s ease infinite',
  },
  feedbackContainer: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '8px',
  },
  feedbackTitle: {
    margin: '0 0 15px 0',
    color: '#3c4043',
    fontSize: '1.5rem',
  },
  feedbackContent: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    fontSize: '0.9rem',
    color: '#3c4043',
    backgroundColor: '#ffffff',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    maxHeight: '500px',
    overflowY: 'auto',
  },
};

const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = keyframes;
document.head.appendChild(styleSheet);


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
