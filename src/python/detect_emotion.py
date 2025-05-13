
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
try:
    df_logger = DeepFaceLogger.get_logger()
    df_logger.setLevel(logging.CRITICAL + 1) # Suppress all DeepFace logs
except AttributeError: 
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
        print(json.dumps({"script_error": f"Error decoding image: {str(e)}"}), file=sys.stderr)
        return None

def analyze_emotion(image_cv2):
    """Analyzes the given OpenCV image to detect the dominant emotion."""
    try:
        analysis_results = DeepFace.analyze(
            img_path=image_cv2,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='ssd', 
            silent=True 
        )
        if isinstance(analysis_results, list) and len(analysis_results) > 0:
            return analysis_results[0].get('dominant_emotion', 'neutral').lower()
        elif isinstance(analysis_results, dict):
             return analysis_results.get('dominant_emotion', 'neutral').lower()
        return 'neutral' 
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
        'fear': 'Neutral', 
        'disgust': 'Neutral', 
        'error_analysis': 'Neutral'
    }
    return mapping.get(emotion, 'Neutral') 

if __name__ == "__main__":
    # Read image data URI from stdin
    input_data_uri = sys.stdin.read()

    if not input_data_uri:
        print(json.dumps({"error": "No image data received via stdin."}), file=sys.stderr)
        sys.exit(1)
        
    cv2_img = decode_image_from_data_uri(input_data_uri)

    output_json = {}

    if cv2_img is None:
        output_json = {"mood": "Neutral", "detail": "Failed to decode image data."}
    else:
        detected_emotion_str = analyze_emotion(cv2_img)
        final_mood = map_emotion_to_project_mood(detected_emotion_str)
        output_json = {"mood": final_mood}
        if detected_emotion_str == 'neutral' and final_mood == 'Neutral':
            try:
                face_check = DeepFace.extract_faces(img_path=cv2_img, detector_backend='ssd', enforce_detection=False)
                if not face_check or len(face_check) == 0 or not face_check[0].get('face').size > 0 : 
                     output_json["detail"] = "No face detected or expression is neutral."
                else:
                     output_json["detail"] = "Expression detected as neutral."
            except: 
                 output_json["detail"] = "Expression detected as neutral or face detection issue."

        elif detected_emotion_str == 'error_analysis':
             output_json["detail"] = "Error during emotion analysis."


    print(json.dumps(output_json))
    sys.exit(0)
