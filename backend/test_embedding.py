import cv2, face_recognition
img = cv2.imread('storage/training/23BQ1A0506.jpeg')[:,:,::-1]
enc = face_recognition.face_encodings(img)
print('ok', len(enc), len(enc[0]) if enc else 0)