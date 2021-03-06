
#include <iostream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include "NtKinect.h"
#include <string>
#include <time.h>
#include <chrono>
#include "TrailRecorder.h"
#include "KinRecorder.h"

int serving = 0;

cv::Scalar colors[] = {
	cv::Scalar(255,0,0),  // HandState_Unknown
	cv::Scalar(0,255,0),  // HandState_NotTracked
	cv::Scalar(255,255,0), // HandState_Open
	cv::Scalar(255,0,255), // HandState_Closed
	cv::Scalar(0,255,255),  // HandState_Lass
};

double getClockTime()
{
	auto current_time = std::chrono::system_clock::now();
	auto duration_in_seconds = std::chrono::duration<double>(current_time.time_since_epoch());

	double num_seconds = duration_in_seconds.count();
	return num_seconds;
}

double tweak(double v) {
	if (v < -1.0E10)
		return -1.0E10;
	if (v > 1.0E10)
		return 1.0E10;
	return v;
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



KinRecorder::KinRecorder()
{
	recording = false;
	kinDir = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\recordings";
	recId = "";
	recDir = "";
	frameNum = 0;
	//		recFS = NULL;
	trailRec = NULL;
	useDepth = false;
}


KinRecorder::~KinRecorder()
{
}

void KinRecorder::startRecording()
{
	if (recording) {
		return;
	}
	startTime = getClockTime();
	prevFrameTime = startTime;
	recId = getRecId();
	recDir = kinDir + "\\" + recId;
	verifyDir(kinDir);
	verifyDir(recDir);
	frameNum = 0;
	recording = true;
	string recJSONPath = recDir + "/rec.json";
	trailRec = new TrailRecorder(recJSONPath, this);
}

void KinRecorder::stopRecording()
{
	recording = false;
	if (trailRec != NULL) {
		delete trailRec;
		trailRec = NULL;
	}
}

void KinRecorder::draw() {
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

void KinRecorder::run_()
{
	NtKinect kinect;
	pKinect = &kinect;
	//cv::namedWindow("rgb", cv::WINDOW_AUTOSIZE);
	cv::namedWindow("rgb", 0);
	frameNum = 0;
	recId = getRecId();
	intVec trackedJoints;
	trackedJoints.push_back(JointType_HandLeft);
	trackedJoints.push_back(JointType_HandRight);
	double deltaT = 0;
	double maxDeltaT = 0;
	double avgDeltaT = 0.01;
	double avgFrameRate = 0; // running average
	double w = .2; // weight for running average
	while (1) {
		frameNum++;
		kinect.setRGB();
		if (useDepth) {
			kinect.setDepth(false);
		}
		kinect.setSkeleton();
		frameTime = getClockTime();
		deltaT = frameTime - prevFrameTime;
		if (deltaT > 0) {
			avgDeltaT = w*deltaT + (1-w)*avgDeltaT;
			avgFrameRate = 1 / avgDeltaT;
		}
		maxDeltaT = max(deltaT, maxDeltaT);
		prevFrameTime = frameTime;
		std::string imagePath = recDir + "/" + format("image%d.jpg", frameNum);
		std::string depthPath = recDir + "/" + format("depth%d.jpg", frameNum);
		//std::string imagePath = recDir + "/" + format("image%d.bmp", frameNum);
		if (recording) {
			//saveBodyFrameJSON(frameNum, kinect);
			trailRec->update();
			//trailRec->update(trackedJoints);
			cv::imwrite(imagePath, kinect.rgbImage);
		}
		if (serving) {
			string latestPath = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\public\\lastFrame.jpg";
			string tmpPath = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\public\\lastFrame_.jpg";
			cv::imwrite(tmpPath, kinect.rgbImage);
//			int rc = std::rename(tmpPath.c_str(), latestPath.c_str());
			remove(latestPath.c_str());
			int rc = std::rename(tmpPath.c_str(), latestPath.c_str());
			cout << "rc: " << rc << "\n";
			/*
			vector<uchar> buf;
			cv::imencode(".jpg", kinect.rgbImage, buf);
			cout << "Encoded to JPG size " << buf.capacity() << "\n";
			*/
		}
		draw();
		std::string stat = format("frame %d", frameNum);
		stat += " " + recId;
		if (useDepth)
			stat += " D";
		stat += format("  %4.1f fps ", avgFrameRate);
		if (recording)
			stat += " REC";
		cv::putText(kinect.rgbImage, stat,
			cv::Point(10, 30), //top-left position
			cv::FONT_HERSHEY_DUPLEX,
			1.0,
			CV_RGB(255, 0, 0), //font color
			2);
		cv::imshow("rgb", kinect.rgbImage);
		if (useDepth) {
			//std::string imagePath = recDir + "/" + format("image%d.bmp", frameNum);
			if (recording) {
				std::string depthPath = recDir + "/" + format("depth%d.png", frameNum);
				cv::imwrite(depthPath, kinect.depthImage);
			}
			cv::imshow("depth", kinect.depthImage);
		}
		int waitTime = 33;
		auto key = cv::waitKey(waitTime);
		if (key == 'd') {
			useDepth = !useDepth;
		}
		if (key == 'q') {
			if (recording)
				stopRecording();
			break;
		}
		if (key == 'r') {
			startRecording();
			deltaT = 0;
			maxDeltaT = 0;
		}
		if (key == 'm') {
			serving = (serving + 1) % 2;
		}
		if (key == 's') {
			stopRecording();
			cout << "maxDeltaT " << maxDeltaT << "\n";
		}
	}
	cv::destroyAllWindows();
}

int KinRecorder::run()
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

void KinRecorder::saveBodyFrameJSON(int frameNum, NtKinect& kinect) {
	std::string jsonName = format("bodyFrame%d.json", frameNum);
	std::string jsonPath = recDir + "/" + jsonName;
	FileStorage fs(jsonPath, FileStorage::WRITE);
	fs << "frameNum" << frameNum;
	fs << "frameTime" << getClockTime();
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

