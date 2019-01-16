#include <iostream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include "NtKinect.h"
#include <string>
//#include <stdio.h>
#include <time.h>
#include <chrono>

using namespace std;
using namespace cv;

bool recording = false;
string kinDir = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\recordings";
string recId = "";
string recDir = "";
int frameNum = 0;

// ...



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
const std::string getRecId() {
	time_t     now = time(0);
	struct tm  tstruct;
	char       buf[80];
	tstruct = *localtime(&now);
	// Visit http://en.cppreference.com/w/cpp/chrono/c/strftime
	// for more information about date/time format
	strftime(buf, sizeof(buf), "%Y_%m_%d__%H_%M_%S", &tstruct);
	return buf;
}

void verifyDir(std::string dirPath)
{
	std::string com = "mkdir " + dirPath;
	system(com.c_str());
}

void doJob0() {
	NtKinect kinect;
	while (1) {
		kinect.setRGB();
		kinect.setSkeleton();
		for (auto person : kinect.skeleton) {
			for (auto joint : person) {
				if (joint.TrackingState == TrackingState_NotTracked) continue;
				ColorSpacePoint cp;
				kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
				cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
			}
		}
		cv::imshow("rgb", kinect.rgbImage);
		auto key = cv::waitKey(1);
		if (key == 'q') break;
	}
	cv::destroyAllWindows();
}

double tweak(double v) {
	if (v < -1.0E10)
		return -1.0E10;
	if (v > 1.0E10)
		return 1.0E10;
	return v;
}

void saveJSON(int frameNum, NtKinect& kinect) {
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
			fs << "colorX" << tweak(cp.X)/1920.0;
			fs << "colorY" << tweak(cp.Y)/1080.0;
			fs << "}";
		}
		fs << "]";
		fs << "}";
	}
	fs.release();
};

void startRecording()
{
	recId = getRecId();
	recDir = kinDir + "\\" + recId;
	verifyDir(kinDir);
	verifyDir(recDir);
	frameNum = 0;
	recording = true;
}

void doJob() {
	NtKinect kinect;
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
			saveJSON(frameNum, kinect);
			cv::imwrite(imagePath, kinect.rgbImage);
		}
		for (auto person : kinect.skeleton) {
			for (auto joint : person) {
				if (joint.TrackingState == TrackingState_NotTracked) continue;
				ColorSpacePoint cp;
				kinect.coordinateMapper->MapCameraPointToColorSpace(joint.Position, &cp);
				cv::rectangle(kinect.rgbImage, cv::Rect((int)cp.X - 5, (int)cp.Y - 5, 10, 10), cv::Scalar(0, 0, 255), 2);
			}
		}
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
		if (key == 'q') break;
		if (key == 'r') {
			startRecording();
		}
		if (key == 's') recording = false;
	}
	cv::destroyAllWindows();
}

int main(int argc, char** argv) {
	try {
		doJob();
	}
	catch (exception &ex) {
		cout << ex.what() << endl;
		string s;
		cin >> s;
	}
	return 0;
}