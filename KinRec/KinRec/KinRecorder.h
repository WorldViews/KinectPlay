#pragma once
#include <iostream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include "NtKinect.h"
#include <string>
#include <time.h>
#include <chrono>
#include "TrailRecorder.h"

double tweak(double v);
double getClockTime();

class KinRecorder
{
public:

	bool recording = false;
	string kinDir = "C:\\GitHub\\WorldViews\\KinectPlay\\recorder\\recordings";
	double startTime = 0;
	double frameTime = 0;
	double prevFrameTime = 0;
	string recId = "";
	string recDir = "";
	int frameNum = 0;
	NtKinect* pKinect = NULL;
	TrailRecorder* trailRec = NULL;
	//	FileStorage* recFS = NULL;

	KinRecorder();
	~KinRecorder();

	void startRecording();
	void stopRecording();
	void draw();
	void saveBodyFrameJSON(int frameNum, NtKinect& kinect);
	int run();

private:
	void run_();
};

