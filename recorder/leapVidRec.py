
import cv2
import websocket
import threading
import json
import sys, os, time
from datetime import datetime

def verifyDir(path):
    if not os.path.exists(path):
        print "Creating", path
        os.mkdir(path)
        
sessionsDir = "./leapRecordings"

def getSessionId():
    t = time.time()
    dt = datetime.fromtimestamp(t)
    #return "%d" % time.time()
    id = dt.strftime("%Y_%m_%d__%H_%M_%S")
    return id

def on_message(ws, message):
    print(message)

def on_error(ws, error):
    print(error)

def on_close(ws):
    print("### closed ###")

class Recorder:
    def __init__(self):
        websocket.enableTrace(True)
        self.ws = None
        self.recording = False

    def startRecording(self):
        print "Start Recording"
        self.recId = getSessionId()
        print "Session:", self.recId
        self.recDir = sessionsDir+"/"+self.recId
        verifyDir(self.recDir)
        self.startTime = time.time()
        self.frameNum = 0
        self.frameRecs = []
        self.recording = True
        self.running = True
        
    def stopRecording(self):
        print "Stop Recording", self.recId
        self.recording = False
        t = time.time()
        dur = t - self.startTime
        sessObj = {'name': self.recId,
                   'sessionType': 'Leap',
                   'startTime': self.startTime,
                   'numFrames': self.frameNum,
                   'duration': dur,
                   'frameRecs': self.frameRecs}
        sessObjPath = "%s/rec.json" % self.recDir
        file(sessObjPath,'w').write(json.dumps(sessObj, indent=4))
    
    def run(self):
        self.running = True
        self.startWS()
        self.startImageWatcher()
        while 1:
            if not self.running:
                print "Main thread exiting..."
                sys.exit(0)
            time.sleep(1)

    def startImageWatcher(self):
        self.iwt = threading.Thread(target = lambda s=self: s.runImageWatcher());
        self.iwt.setDaemon(False)
        self.iwt.start()

    def runImageWatcher(self):
        cv2.namedWindow("Source", 0) # displays captured image
        self.cam = cv2.VideoCapture(1)
        while 1:
            s, im = self.cam.read() # captures image
            if self.recording:
                self.frameNum += 1
                name = "image%d.jpg" % self.frameNum
                imgPath = "%s/%s" % (self.recDir, name)
                cv2.imwrite(imgPath,im) # writes image test.bmp to disk
                if self.lastFrame:
                    self.frameRecs.append(self.lastFrame)
            cv2.imshow("Source", im) # displays captured image
            key = cv2.waitKey(30)
            if key == ord('r'):
                self.startRecording()
            if key == ord('s'):
                self.stopRecording()
            if key == ord('q'):
                break
        print "Finishing"
        self.running = False

    def startWS(self):
        self.wst = threading.Thread(target = lambda s=self: s.runWS());
        self.wst.setDaemon(False)
        self.wst.start()

    def runWS(self):
        print "Run WebSocket"
        self.ws = websocket.WebSocketApp(
                     "ws://localhost:6437/v7.json",
                     on_message = lambda ws,msg,s=self: s.onLeapMessage(ws, msg),
                     on_error = on_error,
                     on_close = on_close)
        self.ws.run_forever()
        print "WebSocket finished"

    def onLeapMessage(self, ws, msg):
        if not self.running:
            print "**** leap thread exiting..."
            sys.exit(0)
        frame = json.loads(msg)
        try:
            hands = frame["hands"]
        except:
            print "msg:", msg
            return
        self.lastFrame = frame
        dense = False
        if dense and self.recording:
            self.frameRecs.append(frame)
            name = "handFrame%d.json" % self.frameNum
            framePath = "%s/%s" % (self.recDir, name)
            file(framePath,'w').write(json.dumps(frame, indent=4))
        #if hands:
        #    print hands

if __name__ == "__main__":
    rec = Recorder()
    rec.run()

