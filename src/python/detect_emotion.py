
import sys
import json
import base64
import numpy as np
import cv2
from deepface import DeepFace
from deepface.commons.logger import Logger as DeepFaceLogger
import logging

# Suppress TensorFlow and DeepFace internal logging to keep stdout clean for JSON output
logging.getLogger('tensorflow').setLevel(logging.ERROR)
# For DeepFace, access its internal logger instance if possible, or set a high level.
# This approach tries to get the logger instance used by DeepFace.
try:
    df_logger = DeepFaceLogger.get_logger()
    df_logger.setLevel(logging.CRITICAL + 1) # Suppress all DeepFace logs
except AttributeError: # Fallback if DeepFace's logger isn't exposed this way
    logging.getLogger('DeepFace').setLevel(logging.CRITICAL + 1)


def decode_image_from_data_uri(data_uri):
    """Decodes a base64 image data URI into an OpenCV image object."""
    try:
        header, encoded_data = data_uri.split(",", 1)
        image_bytes = base64.b64decode(encoded_data)
        np_array = np.frombuffer(image_bytes, np.uint8)
        img_cv2 = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if img_cv2 is None:
            raise ValueError("cv2.imdecode returned None. Invalid image data or format.")
        return img_cv2
    except Exception as e:
        # Output error to stderr for debugging, not to stdout
        print(json.dumps({"script_error": f"Error decoding image: {str(e)}"}), file=sys.stderr)
        return None

def analyze_emotion(image_cv2):
    """Analyzes the given OpenCV image to detect the dominant emotion."""
    try:
        # detector_backend can be 'opencv', 'ssd', 'dlib', 'mtcnn', 'retinaface', 'mediapipe'
        # 'ssd' or 'mtcnn' are often good choices. 'ssd' is lighter.
        # enforce_detection=False means it won't raise an exception if no face is found.
        analysis_results = DeepFace.analyze(
            img_path=image_cv2,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='ssd', # Using ssd for potentially faster detection
            silent=True # Suppress DeepFace's own console logs as much as possible
        )
        # DeepFace.analyze returns a list of dicts, one for each detected face.
        # We'll use the first detected face.
        if isinstance(analysis_results, list) and len(analysis_results) > 0:
            return analysis_results[0].get('dominant_emotion', 'neutral').lower()
        # Handle cases where it might return a single dict if only one face
        elif isinstance(analysis_results, dict):
             return analysis_results.get('dominant_emotion', 'neutral').lower()
        return 'neutral'  # Default if no face or emotion is confidently detected
    except Exception as e:
        print(json.dumps({"script_error": f"Error during DeepFace analysis: {str(e)}"}), file=sys.stderr)
        return 'error_analysis'

def map_emotion_to_project_mood(emotion):
    """Maps detailed emotions from DeepFace to the project's defined moods."""
    mapping = {
        'happy': 'Happy',
        'sad': 'Sad',
        'surprise': 'Energetic',
        'neutral': 'Neutral',
        'angry': 'Energetic',
        'fear': 'Neutral',  # Fear can be complex; mapping to Neutral for broader category
        'disgust': 'Neutral', # Disgust doesn't map well to existing positive/calm moods
        'error_analysis': 'Neutral' # Default to Neutral if analysis failed
    }
    return mapping.get(emotion, 'Neutral') # Default to Neutral for unmapped emotions

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python detect_emotion.py <image_data_uri>"}), file=sys.stderr)
        sys.exit(1)

    input_data_uri = sys.argv[1]
    cv2_img = decode_image_from_data_uri(input_data_uri)

    output_json = {}

    if cv2_img is None:
        output_json = {"mood": "Neutral", "detail": "Failed to decode image data."}
    else:
        detected_emotion_str = analyze_emotion(cv2_img)
        final_mood = map_emotion_to_project_mood(detected_emotion_str)
        output_json = {"mood": final_mood}
        if detected_emotion_str == 'neutral' and final_mood == 'Neutral':
            # Check if it was 'neutral' because no face was found or actual neutral expression
            # Re-analyze just for face detection check, could be optimized
            try:
                face_check = DeepFace.extract_faces(img_path=cv2_img, detector_backend='ssd', enforce_detection=False)
                if not face_check or len(face_check) == 0 or not face_check[0].get('face').size > 0 : # face is a numpy array
                     output_json["detail"] = "No face detected or expression is neutral."
                else:
                     output_json["detail"] = "Expression detected as neutral."
            except: # Catch if extract_faces fails for some reason
                 output_json["detail"] = "Expression detected as neutral or face detection issue."

        elif detected_emotion_str == 'error_analysis':
             output_json["detail"] = "Error during emotion analysis."


    print(json.dumps(output_json))
    sys.exit(0)

    