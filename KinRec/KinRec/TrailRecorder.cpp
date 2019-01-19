
#include <iostream>
#include <sstream>
#include <opencv2/opencv.hpp>
#include "NtKinect.h"
#include <string>
#include <time.h>
#include <chrono>
#include "KinRecorder.h";
#include "TrailRecorder.h"

TrailRecorder::TrailRecorder(string recJSONPath, KinRecorder* pKinRec) {
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
	fs << "frameTime" << pKinRec->frameTime;
	fs << "bodies" << "[";
	int pnum = 0;
	for (auto person : kinect.skeleton) {
		unsigned int personId = kinect.skeletonTrackingId[pnum];
		fs << "{";
		fs << "bodyIndex" << pnum;
		fs << "trackingId" << format("%u", personId);
		fs << "tracked" << true;
		fs << "leftHandState" << 0;
		fs << "rightHandState" << 0;
		pnum++;
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

void TrailRecorder::update(intVec& joints) {
	NtKinect& kinect = *pKinRec->pKinect;
	FileStorage& fs = *recFS;
	fs << "{";
	fs << "frameNum" << pKinRec->frameNum;
	fs << "frameTime" << pKinRec->frameTime - pKinRec->startTime;
	fs << "bodies" << "[";
	int pnum = 0;
	for (auto person : kinect.skeleton) {
		unsigned int personId = kinect.skeletonTrackingId[pnum];
		fs << "{";
		fs << "bodyIndex" << pnum;
		fs << "trackingId" << format("%u", personId);
		fs << "tracked" << true;
		fs << "leftHandState" << 0;
		fs << "rightHandState" << 0;
		pnum++;
		fs << "joints" << "[";
		for (int j = 0; j < joints.size(); j++) {
			int jointId = joints[j];
			Joint joint = person[jointId];
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

