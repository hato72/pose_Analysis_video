from flask import Flask, request, jsonify, Response
import cv2
import mediapipe as mp
import numpy as np
import base64
import io

app = Flask(__name__)

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0:
        angle = 360-angle
    return angle

def process_frame(frame, pose):
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)

    if not results.pose_landmarks:
        return frame, None, None, None

    landmarks = results.pose_landmarks.landmark
    
    shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    
    upper_body_angle = calculate_angle(shoulder, hip, [hip[0], 0])

    ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
    back_leg_angle = calculate_angle(hip, ankle, [ankle[0], 0])

    front_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    front_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    front_leg_angle = calculate_angle([front_knee[0], 0], front_knee, front_ankle)

    image_height, image_width, _ = frame.shape
    cv2.putText(frame, f"Upper body angle: {upper_body_angle:.2f}", 
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"Back leg angle: {back_leg_angle:.2f}", 
                (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(frame, f"Front leg angle: {front_leg_angle:.2f}", 
                (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    mp_drawing.draw_landmarks(
        frame,
        results.pose_landmarks,
        mp_pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
        connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2)
    )

    return frame, upper_body_angle, back_leg_angle, front_leg_angle

@app.route('/analyze-pose-video', methods=['POST'])
def analyze_pose_video():
    video_file = request.files['video']
    video_bytes = video_file.read()
    video = cv2.VideoCapture(io.BytesIO(video_bytes))

    fps = int(video.get(cv2.CAP_PROP_FPS))
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter('temp_output.mp4', fourcc, fps, (width, height))

    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, enable_segmentation=True)

    frame_count = 0
    total_upper_body_angle = 0
    total_back_leg_angle = 0
    total_front_leg_angle = 0

    while True:
        ret, frame = video.read()
        if not ret:
            break

        processed_frame, upper_body_angle, back_leg_angle, front_leg_angle = process_frame(frame, pose)
        
        if upper_body_angle is not None:
            frame_count += 1
            total_upper_body_angle += upper_body_angle
            total_back_leg_angle += back_leg_angle
            total_front_leg_angle += front_leg_angle

        out.write(processed_frame)

    video.release()
    out.release()

    avg_upper_body_angle = total_upper_body_angle / frame_count if frame_count > 0 else 0
    avg_back_leg_angle = total_back_leg_angle / frame_count if frame_count > 0 else 0
    avg_front_leg_angle = total_front_leg_angle / frame_count if frame_count > 0 else 0

    with open('temp_output.mp4', 'rb') as f:
        processed_video = base64.b64encode(f.read()).decode('utf-8')

    return jsonify({
        "processedVideo": processed_video,
        "avgUpperBodyAngle": avg_upper_body_angle,
        "avgBackLegAngle": avg_back_leg_angle,
        "avgFrontLegAngle": avg_front_leg_angle
    })

if __name__ == '__main__':
    app.run(port=5000)