#pragma once
#include <opencv2/opencv.hpp>

using namespace std;
using namespace cv;

typedef vector<int> intVec;

class KinRecorder;

class TrailRecorder
{
public:
	FileStorage* recFS = NULL;
	KinRecorder* pKinRec;

	TrailRecorder(string recJSONPath, KinRecorder* pKinRec);
	virtual ~TrailRecorder();
	void update();
	void update(intVec& joints);
};
