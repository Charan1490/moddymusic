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
    let resolved = false;

    return new Promise((resolve) => {
        const pythonProcess = spawn(pythonExecutable, [scriptPath]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.on('error', (err) => {
            if (resolved) return;
            resolved = true;
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

        if (pythonProcess.stdin) {
            pythonProcess.stdin.on('error', (err) => {
                if (resolved) return;
                resolved = true;
                console.error('Error writing to Python stdin:', err);
                resolve({
                    data: {
                        error: "Failed to write data to Python script's stdin.",
                        detail: `Stdin write error: ${err.message}. This can happen if the Python script closes prematurely.`
                    },
                    status: 500
                });
            });

            try {
                pythonProcess.stdin.write(photoDataUri);
                pythonProcess.stdin.end();
            } catch (writeError) {
                if (resolved) return;
                resolved = true;
                console.error('Synchronous error writing to Python stdin:', writeError);
                resolve({
                    data: {
                        error: "Synchronous failure sending data to Python script.",
                        detail: (writeError as Error).message
                    },
                    status: 500
                });
                return; // Exit if synchronous write fails
            }
        } else {
            if (resolved) return;
            resolved = true;
            console.error('Python process stdin is null. Cannot send image data.');
            resolve({
                data: {
                    error: "Failed to send image data to Python script.",
                    detail: "Stdin is not available on the Python process. This might indicate the process failed to spawn correctly."
                },
                status: 500
            });
            return; // Exit if stdin is not available
        }

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (resolved) return;
            resolved = true;

            if (stderrData && !stdoutData) { // If only stderr has data, treat it as primary error source
                try {
                    // Attempt to parse stderr as JSON if it might contain structured errors
                    const errJson = JSON.parse(stderrData) as PythonMoodResponse;
                    if (errJson.script_error || errJson.error) {
                        console.error(`Python script error (stderr JSON):`, errJson);
                        resolve({ 
                            data: { 
                                mood: "Neutral", 
                                error: "Python script internal error.",
                                detail: errJson.script_error || errJson.error || "Unknown error from Python script stderr." 
                            }, 
                            status: 200 // Still 200 as the API call succeeded, but script had an issue
                        });
                        return;
                    }
                } catch (e) {
                    // stderrData is not valid JSON, treat as raw error string
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
                                detail: result.error + (stderrData ? ` Stderr: ${stderrData}` : "")
                            }, 
                            status: 200 
                        });
                    } else if (result.mood) {
                        resolve({ data: result, status: 200 });
                    } else {
                         resolve({ 
                            data: { 
                                error: "Python script returned an invalid response.",
                                detail: "Mood field missing from script output." + (stderrData ? ` Stderr: ${stderrData}` : "")
                            }, 
                            status: 500 
                        });
                    }
                } catch (parseError) {
                    console.error('Error parsing Python script output:', parseError, "\nRaw stdout:", stdoutData, "\nRaw stderr:", stderrData);
                    resolve({ 
                        data: { 
                            error: 'Failed to parse Python script output.', 
                            detail: (parseError as Error).message + (stderrData ? ` Stderr: ${stderrData}` : "")
                        }, 
                        status: 500 
                    });
                }
            } else {
                console.error(`Python script exited with code ${code}. Stderr: ${stderrData}. Stdout: ${stdoutData}`);
                let detailMessage = stderrData || stdoutData || "No output from script.";
                if (stderrData.includes("No such file or directory") || stderrData.toLowerCase().includes("not found") || (code === 1 && stderrData.toLowerCase().includes("was not found"))) {
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
