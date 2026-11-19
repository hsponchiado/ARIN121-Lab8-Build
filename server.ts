import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client utility
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface QuizOption {
  key: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResponse {
  quizTitle: string;
  questions: QuizQuestion[];
}

app.post('/api/generate-quiz', async (req: Request, res: Response) => {
  try {
    const { notes, questionCount } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({
        error: 'Please enter study notes before generating a quiz.',
      });
    }

    const trimmedNotes = notes.trim();
    let count = parseInt(questionCount, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 5) count = 5;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your settings.',
      });
    }

    const prompt = `You are an academic exam specialist and university tutor.
Read the study notes provided below and generate a practice quiz for university students.
The quiz MUST contain exactly ${count} multiple-choice question(s).

Rules:
1. Generate exactly ${count} question(s).
2. Each question must have exactly 4 answer options, labeled with keys "A", "B", "C", and "D".
3. The questions should test comprehension, core concepts, critical definitions, or practical applications directly mentioned in or derived from the study notes.
4. "correctAnswer" MUST be one of "A", "B", "C", or "D".
5. "explanation" MUST provide a clear, educational, and thorough explanation of why the correct answer is right and why the other options are incorrect or how to remember this concept.
6. Provide an informative "quizTitle" that accurately reflects the topic.

STUDY NOTES:
${trimmedNotes}`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let text: string | undefined;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a rigorous, supportive university educator creating high-quality multiple choice quizzes with detailed explanations from student notes.',
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: {
                  type: Type.STRING,
                  description: 'Topic title of the quiz based on the notes',
                },
                questions: {
                  type: Type.ARRAY,
                  description: 'The generated quiz questions',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: {
                        type: Type.INTEGER,
                        description: 'Question number starting at 1',
                      },
                      question: {
                        type: Type.STRING,
                        description: 'The question text',
                      },
                      options: {
                        type: Type.ARRAY,
                        description: 'Exactly 4 distinct choices labeled A, B, C, D',
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            key: {
                              type: Type.STRING,
                              description: 'Option letter: A, B, C, or D',
                            },
                            text: {
                              type: Type.STRING,
                              description: 'The text for this option',
                            },
                          },
                          required: ['key', 'text'],
                        },
                      },
                      correctAnswer: {
                        type: Type.STRING,
                        description: 'Key of the correct option (A, B, C, or D)',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'Detailed explanation of why this answer is correct',
                      },
                    },
                    required: ['id', 'question', 'options', 'correctAnswer', 'explanation'],
                  },
                },
              },
              required: ['quizTitle', 'questions'],
            },
          },
        });

        if (response && response.text) {
          text = response.text;
          break; // Succeeded!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} encountered an issue:`, err?.message || err);
        // Continue to fallback model
      }
    }

    if (!text) {
      throw lastError || new Error('No content returned from Gemini models.');
    }

    const quizData = JSON.parse(text) as QuizResponse;

    // Safety check & normalization
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Received an invalid quiz format from the model.');
    }

    // Ensure count matches and keys are uppercase
    const validatedQuestions = quizData.questions.slice(0, count).map((q, idx) => ({
      id: idx + 1,
      question: q.question,
      options: (q.options || []).slice(0, 4).map((opt, oIdx) => ({
        key: ['A', 'B', 'C', 'D'][oIdx] || opt.key.toUpperCase(),
        text: opt.text,
      })),
      correctAnswer: (q.correctAnswer || 'A').toUpperCase().trim(),
      explanation: q.explanation || 'No explanation provided.',
    }));

    return res.json({
      quizTitle: quizData.quizTitle || 'Practice Quiz',
      questions: validatedQuestions,
    });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate quiz. Please try again.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
