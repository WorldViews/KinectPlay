
/*
This class represents a tracker for some kind of object, body, etc.
*/
class Tracker {
    constructor(viewer) {
        this.viewer = viewer;
    }
}

// This is a subclass for a Human Body tracker.   It could be implemented
// in various ways, e.g. OpenPose, Kinect, etc.
class HumanBodyTracker extends Tracker {
    constructor(viewer) {
        super(viewer);
    }
}

// This is a subclass for a Human Hand tracker.
class HumanHandTracker extends Tracker {
    constructor(viewer) {
        super(viewer);
    }
}


