
import { type NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Define the expected output structure from the Python script
interface PythonMoodResponse {
  mood?: "Happy" | "Sad" | "Energetic" | "Calm" | "Neutral"; // Mood is optional on error
  detail?: string;
  error?: string; // Error message from the script logic or server
  script_error?: string; // Error message from python script execution path
}

// Helper function to encapsulate Python script logic
async function getMoodFromPython(photoDataUri: string): Promise<{ data: PythonMoodResponse, status: number }> {
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
    const scriptPath = path.join(process.cwd(), 'src', 'python', 'detect_emotion.py');

    return new Promise((resolve) => {
        // Do not pass photoDataUri as an argument here
        const pythonProcess = spawn(pythonExecutable, [scriptPath]);

        let stdoutData = '';
        let stderrData = '';

        // Write photoDataUri to stdin
        if (pythonProcess.stdin) {
            pythonProcess.stdin.write(photoDataUri);
            pythonProcess.stdin.end();
        } else {
            console.error('Python process stdin is null. Cannot send image data.');
            resolve({
                data: {
                    error: "Failed to send image data to Python script.",
                    detail: "Stdin is not available on the Python process."
                },
                status: 500
            });
            return;
        }

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (stderrData) {
                try {
                    const errJson = JSON.parse(stderrData) as PythonMoodResponse;
                    if (errJson.script_error || errJson.error) {
                        console.error(`Python script error (stderr JSON):`, errJson);
                        resolve({ 
                            data: { 
                                mood: "Neutral", 
                                error: "Python script internal error.",
                                detail: errJson.script_error || errJson.error || "Unknown error from Python script." 
                            }, 
                            status: 200 // Still 200 as the API call succeeded, but script had an issue
                        });
                        return;
                    }
                } catch (e) {
                    // This case handles if stderrData is not valid JSON, meaning a more fundamental script error.
                    console.error(`Python script stderr (raw, non-JSON): ${stderrData}`);
                    resolve({ 
                        data: { 
                            error: "Python script execution failed with non-JSON error output.", 
                            detail: `Python script error: ${stderrData}. Ensure Python and its dependencies (DeepFace, OpenCV, TensorFlow/PyTorch) are correctly installed. If Python is not in your system's PATH, set the PYTHON_EXECUTABLE environment variable.`
                        }, 
                        status: 500 
                    });
                    return;
                }
                 // If JSON parsing of stderr worked but didn't fit known error patterns above
                console.error(`Python script stderr (unhandled JSON): ${stderrData}`);
                resolve({ 
                    data: { 
                        error: "Python script execution failed with unhandled stderr.", 
                        detail: stderrData 
                    }, 
                    status: 500 
                });
                return;
            }

            if (code === 0) {
                try {
                    const result: PythonMoodResponse = JSON.parse(stdoutData);
                    if (result.error) { 
                        resolve({ 
                            data: { 
                                mood: "Neutral", 
                                error: "Python script logic error",
                                detail: result.error 
                            }, 
                            status: 200 // Script ran, but reported an error
                        });
                    } else if (result.mood) {
                        resolve({ data: result, status: 200 });
                    } else {
                         resolve({ 
                            data: { 
                                error: "Python script returned an invalid response.",
                                detail: "Mood field missing from script output." 
                            }, 
                            status: 500 
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing Python script output:', parseError, "\nRaw output:", stdoutData);
                    resolve({ 
                        data: { 
                            error: 'Failed to parse Python script output.', 
                            detail: (parseError as Error).message 
                        }, 
                        status: 500 
                    });
                }
            } else {
                console.error(`Python script exited with code ${code}. Stderr: ${stderrData}. Stdout: ${stdoutData}`);
                let detailMessage = stderrData || stdoutData || "No output from script.";
                if (stderrData.includes("No such file or directory") || stderrData.toLowerCase().includes("not found")) {
                    detailMessage += ` Ensure '${pythonExecutable}' is correctly installed and in your system PATH, or set the PYTHON_EXECUTABLE environment variable.`;
                }
                resolve({ 
                    data: { 
                        error: `Python script failed with exit code ${code}.`,
                        detail: detailMessage
                    }, 
                    status: 500 
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python subprocess.', err);
            let detailMsg = err.message;
            if (err.message.includes('ENOENT')) { // Error NO ENTity (file not found)
                detailMsg = `Failed to start Python process. Command '${pythonExecutable}' not found. Ensure Python is installed and in your system PATH, or set the PYTHON_EXECUTABLE environment variable in your .env file (e.g., PYTHON_EXECUTABLE=/usr/bin/python3 or C:\\Python39\\python.exe).`;
            }
            resolve({ 
                data: { 
                    error: 'Failed to start Python subprocess.', 
                    detail: detailMsg 
                }, 
                status: 500 
            });
        });
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const photoDataUri = body.photoDataUri;

        if (!photoDataUri || typeof photoDataUri !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid photoDataUri', detail: 'photoDataUri must be a string.' }, { status: 400 });
        }

        const result = await getMoodFromPython(photoDataUri);
        return NextResponse.json(result.data, { status: result.status });

    } catch (error) {
        console.error('Critical error in /api/detect-mood-python route handler:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred.';
        return NextResponse.json({ error: 'Internal Server Error', detail: errorMessage }, { status: 500 });
    }
}

