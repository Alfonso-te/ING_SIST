import cv2
import mediapipe as mp

mp_face = mp.solutions.face_detection
face_detection = mp_face.FaceDetection(min_detection_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if ret == False:
        break
        
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_detection.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    if results.detections:
        for detection in results.detections:
            mp_drawing.draw_detection(image, detection)

    cv2.imshow("Face Detection", image)
    if cv2.waitKey(1) & 0xFF == 27: # Tecla ESC para salir
        break

cap.release()
cv2.destroyAllWindows()