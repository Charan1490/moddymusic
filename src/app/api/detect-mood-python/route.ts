
import { type NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Define the expected output structure from the Python script
interface PythonMoodResponse {
  mood: "Happy" | "Sad" | "Energetic" | "Calm" | "Neutral";
  detail?: string;
  error?: string; // Error message from the script itself
  script_error?: string; // Error message from python script execution path
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const photoDataUri = body.photoDataUri;

    if (!photoDataUri || typeof photoDataUri !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid photoDataUri' }, { status: 400 });
    }

    // Path to the Python executable and script
    // Ensure 'python3' is in your system's PATH or use an absolute path
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3'; 
    const scriptPath = path.join(process.cwd(), 'src', 'python', 'detect_emotion.py');

    return new Promise((resolve) => {
      const pythonProcess = spawn(pythonExecutable, [scriptPath, photoDataUri]);

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (stderrData) {
            // Try to parse stderr for JSON error from script, otherwise use raw stderr
            try {
                const errJson = JSON.parse(stderrData);
                if(errJson.script_error || errJson.error) {
                    console.error(`Python script error (stderr JSON):`, errJson);
                     // Default to Neutral mood on script error
                    resolve(NextResponse.json({ mood: "Neutral", detail: errJson.script_error || errJson.error || "Python script error" } as PythonMoodResponse, { status: 200 }));
                    return;
                }
            } catch (e) {
                // Not a JSON error, log raw stderr
                 console.error(`Python script stderr (raw): ${stderrData}`);
            }
             // Default to Neutral mood on non-JSON script error
            resolve(NextResponse.json({ mood: "Neutral", detail: "Python script execution failed." } as PythonMoodResponse, { status: 200 }));
            return;
        }


        if (code === 0) {
          try {
            const result: PythonMoodResponse = JSON.parse(stdoutData);
            if (result.error) { // Error reported by script logic
                 resolve(NextResponse.json({ mood: "Neutral", detail: result.error } as PythonMoodResponse, { status: 200 }));
            } else {
                 resolve(NextResponse.json(result, { status: 200 }));
            }
          } catch (parseError) {
            console.error('Error parsing Python script output:', parseError, "\nRaw output:", stdoutData);
            resolve(NextResponse.json({ mood: "Neutral", detail: 'Failed to parse Python script output.' } as PythonMoodResponse, { status: 200 }));
          }
        } else {
          console.error(`Python script exited with code ${code}. Stderr: ${stderrData}. Stdout: ${stdoutData}`);
          resolve(NextResponse.json({ mood: "Neutral", detail: `Python script failed with code ${code}.`} as PythonMoodResponse, { status: 200 }));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python subprocess.', err);
        resolve(NextResponse.json({ mood: "Neutral", detail: 'Failed to start Python subprocess.'} as PythonMoodResponse, { status: 200 }));
      });
    });

  } catch (error) {
    console.error('Error in /api/detect-mood-python:', error);
    return NextResponse.json({ mood: "Neutral", detail: 'Internal server error.' } as PythonMoodResponse, { status: 200 });
  }
}

    