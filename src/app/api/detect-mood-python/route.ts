
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
                try {
                    const errJson = JSON.parse(stderrData) as PythonMoodResponse;
                    if (errJson.script_error || errJson.error) {
                        console.error(`Python script error (stderr JSON):`, errJson);
                        // Script itself reported an error, but executed.
                        // This could be a "logical" error like no face found.
                        // We return 200 but with error information.
                        resolve({ 
                            data: { 
                                mood: "Neutral", // Default mood on script-reported error
                                error: "Python script internal error",
                                detail: errJson.script_error || errJson.error || "Unknown error from Python script." 
                            }, 
                            status: 200 
                        });
                        return;
                    }
                } catch (e) {
                    // stderr had data, but it wasn't JSON. This is a more severe script problem.
                    console.error(`Python script stderr (raw, non-JSON): ${stderrData}`);
                    resolve({ 
                        data: { 
                            error: "Python script execution failed with non-JSON error output.", 
                            detail: stderrData 
                        }, 
                        status: 500 
                    });
                    return;
                }
                // If stderrData was present but not caught above as a JSON error,
                // it implies a less structured error. Treat as execution failure.
                console.error(`Python script stderr (unhandled): ${stderrData}`);
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
                    if (result.error) { // Error reported by script logic in stdout
                        resolve({ 
                            data: { 
                                mood: "Neutral", 
                                error: "Python script logic error",
                                detail: result.error 
                            }, 
                            status: 200 // Still 200 as script ran, but reported an issue
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
                resolve({ 
                    data: { 
                        error: `Python script failed with exit code ${code}.`,
                        detail: stderrData || stdoutData || "No output from script."
                    }, 
                    status: 500 
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python subprocess.', err);
            resolve({ 
                data: { 
                    error: 'Failed to start Python subprocess.', 
                    detail: err.message 
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
        // If the result from Python indicates an error in its data but was status 200 (e.g. logical error like no face),
        // we might want to change the HTTP status code here, or let the client handle the 'error' field in the JSON.
        // For now, we forward the status from getMoodFromPython.
        return NextResponse.json(result.data, { status: result.status });

    } catch (error) {
        console.error('Critical error in /api/detect-mood-python route handler:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred.';
        return NextResponse.json({ error: 'Internal Server Error', detail: errorMessage }, { status: 500 });
    }
}
