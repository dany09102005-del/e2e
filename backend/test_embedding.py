import cv2, face_recognition
img = cv2.imread('backend/storage/23BQ1A05A9_demo.jpg')[:,:,::-1]
enc = face_recognition.face_encodings(img)
print('ok', len(enc), len(enc[0]) if enc else 0)