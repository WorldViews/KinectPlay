#include <iostream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include "NtKinect.h"
#include <string>
#include <time.h>
#include <chrono>

using namespace std;
using namespace cv;
class KinRec;

class TrailRecorder
{
public:
	FileStorage* recFS = NULL;
	KinRec* pKinRec;

	TrailRecorder(string recJSONPath, KinRec* pKinRec);
	virtual ~TrailRecorder();
	void update();
};

cv::Scalar colors[] = {
	cv::Scalar(255,0,0),  // HandState_Unknown
	cv::Scalar(0,255,0),  // HandState_NotTracked
	cv::Scalar(255,255,0), // HandState_Open
	cv::Scalar(255,0,255), // HandState_Closed
	cv::Scalar(0,255,255),  // HandState_Lass
};

double getClockTime()
{
	/*
	using namespace std::chrono;
	milliseconds ms = duration_cast<milliseconds>(
		system_clock::now().time_since_epoch()
		);
	return ms;
	*/

	auto current_time = std::chrono::system_clock::now();
	auto duration_in_seconds = std::chrono::duration<double>(current_time.time_since_epoch());

	double num_seconds = duration_in_seconds.count();
	return num_seconds;
}

// Get current date/time, format is YYYY-MM-DD.HH:mm:ss
const std::string currentDateTime() {
	time_t     now = time(0);
	struct tm  tstruct;
	char       buf[80];
	tstruct = *localtime(&now);
	// Visit http://en.cppreference.com/w/cpp/chrono/c/strftime
	// for more information about date/time format
	strftime(buf, sizeof(buf), "%Y-%m-%d.%X", &tstruct);
	return buf;
}

// Get current date/time, format is YYYY-MM-DD.HH:mm:ss
const string getRecId() {
	time_t     now = time(0);
	struct tm  tstruct;
	char       buf[80];
	tstruct = *localtime(&now);
	// Visit http://en.cppreference.com/w/cpp/chrono/c/strftime
	// for more information about date/time format
	strftime(buf, sizeof(buf), "%Y_%m_%d__%H_%M_%S", &tstruct);
	return buf;
}

void verifyDir(string dirPath)
{
	std::string com = "mkdir " + dirPath;
	system(com.c_str());
}

double tweak(double v) {
	if (v < -1.0E10)
		return -1.0E10;
	if (v > 1.0E10)
		return 1.0E10;
	return v;
}





class KinRec {
public:

	bool recording = false;
	string kinDir = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\recordings";
	double startTime = 0;
	string recId = "";
	string recDir = "";
	int frameNum = 0;
	NtKinect* pKinect = NULL;
	TrailRecorder* trailRec = NULL;
//	FileStorage* recFS = NULL;

	KinRec() {
		recording = false;
		kinDir = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\recordings";
		recId = "";
		recDir = "";
		frameNum = 0;
//		recFS = NULL;
		trailRec = NULL;
	}

	void startRecording()
	{
		if (recording) {
			return;
		}
		startTime = getClockTime();
		recId = getRecId();
		recDir = kinDir + "\\" + recId;
		verifyDir(kinDir);
		verifyDir(recDir);
		frameNum = 0;
		recording = true;
		string recJSONPath = recDir + "/rec.json";
		trailRec = new TrailRecorder(recJSONPath, this);
		//startRecJSON();
	}

	void stopRecording()
	{
		recording = false;
		if (trailRec != NULL) {
			delete trailRec;
			trailRec = NULL;
		}
	}

	/*
	void updateRecJSON() {
		NtKinect& kinect = *pKinect;
		FileStorage& fs = *recFS;
		return;
		fs << "bodies" << "[";
		int pnum = 0;
		for (auto person : kinect.skeleton) {
			pnum++;
			fs << "{";
			fs << "bodyIndex" << pnum;
			fs << "tracked" << true;
			fs << "leftHandState" << 0;
			fs << "rightHandState" << 0;
			fs << "joints" << "[";
			for (auto joint : person) {
				if (joint.TrackingState == TrackingState_NotTracked) continue;
				ColorSpacePoint cp;
				kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
				//cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
				fs << "{";
				fs << "jointType" << joint.JointType;
				fs << "trackingState" << joint.TrackingState;
				fs << "cameraX" << joint.Position.X;
				fs << "cameraY" << joint.Position.Y;
				fs << "cameraZ" << joint.Position.Z;
				fs << "colorX" << tweak(cp.X) / 1920.0;
				fs << "colorY" << tweak(cp.Y) / 1080.0;
				fs << "}";
			}
			fs << "]";
			fs << "}";
		}

	}
	*/
	/*
	void endRecJSON() {
		if (recFS == NULL) {
			return;
		}
		FileStorage& fs = *recFS;
		fs << "]";
		fs << "duration" << getClockTime() - startTime;
		fs << "numFrames" << frameNum;
		recFS->release();
		recFS = NULL;
	}
	*/

	void draw() {
		NtKinect& kinect = *pKinect;
		for (int i = 0; i < kinect.skeleton.size(); i++) {
			auto person = kinect.skeleton[i];
			for (int j = 0; j < person.size(); j++) {
				Joint joint = person[j];
				if (joint.TrackingState == TrackingState_NotTracked) continue;
				ColorSpacePoint cp;
				kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
				if (j == JointType_HandLeft || j == JointType_HandRight) {
					pair<int, int> handState = kinect.handState(i, j == JointType_HandLeft);
					cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 10, (int)cp.Y - 10, 20, 20), colors[handState.first], CV_FILLED);
				}
				cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
			}
		}
	}

	void run_() {
		NtKinect kinect;
		pKinect = &kinect;
		//cv::namedWindow("rgb", cv::WINDOW_AUTOSIZE);
		cv::namedWindow("rgb", 0);
		frameNum = 0;
		recId = getRecId();
		while (1) {
			frameNum++;
			kinect.setRGB();
			kinect.setSkeleton();
			std::string imagePath = recDir + "/" + format("image%d.jpg", frameNum);
			//std::string imagePath = recDir + "/" + format("image%d.bmp", frameNum);
			if (recording) {
				saveBodyFrameJSON(frameNum, kinect);
				trailRec->update();
				cv::imwrite(imagePath, kinect.rgbImage);
			}
			draw();
			/*
			for (auto person : kinect.skeleton) {
				for (auto joint : person) {
					if (joint.TrackingState == TrackingState_NotTracked) continue;
					ColorSpacePoint cp;
					kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
					cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
				}
			}
			*/
			std::string stat = format("frame %d", frameNum);
			stat += " " + recId;
			if (recording)
				stat += " REC";
			cv::putText(kinect.rgbImage, stat,
				cv::Point(10, 30), //top-left position
				cv::FONT_HERSHEY_DUPLEX,
				1.0,
				CV_RGB(255, 0, 0), //font color
				2);
			cv::imshow("rgb", kinect.rgbImage);
			auto key = cv::waitKey(1);
			if (key == 'q') {
				if (recording)
					stopRecording();
				break;
			}
			if (key == 'r') {
				startRecording();
			}
			if (key == 's') {
				stopRecording();
			}
		}
		cv::destroyAllWindows();
	}

	void saveBodyFrameJSON(int frameNum, NtKinect& kinect) {
		std::string jsonName = format("bodyFrame%d.json", frameNum);
		std::string jsonPath = recDir + "/" + jsonName;
		FileStorage fs(jsonPath, FileStorage::WRITE);
		fs << "frameNum" << frameNum;
		fs << "frameTime" << getClockTime();
		//time_t rawtime; time(&rawtime);
		//fs << "calibrationDate" << asctime(localtime(&rawtime));
		/*
		Mat cameraMatrix = (Mat_<double>(3, 3) << 1000, 0, 320, 0, 1000, 240, 0, 0, 1);
		Mat distCoeffs = (Mat_<double>(5, 1) << 0.1, 0.01, -0.001, 0, 0);
		fs << "cameraMatrix" << cameraMatrix << "distCoeffs" << distCoeffs;
		*/
		fs << "bodies" << "[";
		int pnum = 0;
		for (auto person : kinect.skeleton) {
			pnum++;
			fs << "{";
			fs << "bodyIndex" << pnum;
			fs << "tracked" << true;
			fs << "leftHandState" << 0;
			fs << "rightHandState" << 0;
			fs << "joints" << "[";
			for (auto joint : person) {
				if (joint.TrackingState == TrackingState_NotTracked) continue;
				ColorSpacePoint cp;
				kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
				//cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
				fs << "{";
				fs << "jointType" << joint.JointType;
				fs << "trackingState" << joint.TrackingState;
				fs << "cameraX" << joint.Position.X;
				fs << "cameraY" << joint.Position.Y;
				fs << "cameraZ" << joint.Position.Z;
				fs << "colorX" << tweak(cp.X) / 1920.0;
				fs << "colorY" << tweak(cp.Y) / 1080.0;
				fs << "}";
			}
			fs << "]";
			fs << "}";
		}
		fs.release();
	};

	int run()
	{
		try {
			this->run_();
		}
		catch (exception &ex) {
			cout << ex.what() << endl;
			string s;
			cin >> s;
		}
		return 0;
	}
};



TrailRecorder::TrailRecorder(string recJSONPath, KinRec* pKinRec) {
	this->pKinRec = pKinRec;
	recFS = new FileStorage(recJSONPath, FileStorage::WRITE);
	FileStorage& fs = *recFS;
	fs << "startTime" << pKinRec->startTime;
	fs << "frames" << "[";
}

void TrailRecorder::update() {
	NtKinect& kinect = *pKinRec->pKinect;
	FileStorage& fs = *recFS;
	fs << "{";
	fs << "frameNum" << pKinRec->frameNum;
	fs << "bodies" << "[";
	int pnum = 0;
	for (auto person : kinect.skeleton) {
		pnum++;
		fs << "{";
		fs << "bodyIndex" << pnum;
		fs << "tracked" << true;
		fs << "leftHandState" << 0;
		fs << "rightHandState" << 0;
		fs << "joints" << "[";
		for (auto joint : person) {
			if (joint.TrackingState == TrackingState_NotTracked) continue;
			ColorSpacePoint cp;
			kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
			//cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
			fs << "{";
			fs << "jointType" << joint.JointType;
			fs << "trackingState" << joint.TrackingState;
			fs << "cameraX" << joint.Position.X;
			fs << "cameraY" << joint.Position.Y;
			fs << "cameraZ" << joint.Position.Z;
			fs << "colorX" << tweak(cp.X) / 1920.0;
			fs << "colorY" << tweak(cp.Y) / 1080.0;
			fs << "}";
		}
		fs << "]";
		fs << "}";
	}
	fs << "]";
	fs << "}";
}

TrailRecorder::~TrailRecorder() {
	if (recFS == NULL) {
		return;
	}
	FileStorage& fs = *recFS;
	fs << "]";
	fs << "duration" << getClockTime() - pKinRec->startTime;
	fs << "numFrames" << pKinRec->frameNum;
	recFS->release();
	recFS = NULL;
}

int main(int argc, char** argv) {
	KinRec kr;
	return kr.run();
}
