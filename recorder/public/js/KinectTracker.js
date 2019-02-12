
JointType = {
    spineBase: 0,
    spineMid: 1,
    neck: 2,
    head: 3,
    shoulderLeft: 4,
    elbowLeft: 5,
    wristLeft: 6,
    handLeft: 7,
    shoulderRight: 8,
    elbowRight: 9,
    wristRight: 10,
    handRight: 11,
    hipLeft: 12,
    kneeLeft: 13,
    ankleLeft: 14,
    footLeft: 15,
    hipRight: 16,
    kneeRight: 17,
    ankleRight: 18,
    footRight: 19,
    spineShoulder: 20,
    handTipLeft: 21,
    thumbLeft: 22,
    handTipRight: 23,
    thumbRight: 24
};

var TrackingState_NotTracked = 0;
var TrackingState_Inferred = 1;
var TrackingState_Tracked = 2;

var LHAND = 7;
var RHAND = 11;
var TRAIL_JOINTS = [RHAND, LHAND];

var colors = [
    'hsla(360,100%,50%,0.6)',
    'hsla(120,100%,50%,0.6)',
    //'#ff0000',
    //'#00ff00',
    '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];

// handstate circle size
var HANDSIZE = 20;

// closed hand state color
var HANDCLOSEDCOLOR = "red";

// open hand state color
var HANDOPENCOLOR = "green";

// lasso hand state color
var HANDLASSOCOLOR = "blue";

class KinTrans
{
    constructor(tracker) {
        this.tracker = tracker;
        this.viewer = tracker.viewer;
        this.useColorXY = true;
        //this.useColorXY = false;
        this.T = {
            cx: 959.5,
            cy:539.5,
            fx: 1081.37,
            fy: 1081.37
        };
    }

    // get normalized color image coordinates
    getNcpt(joint) {
        if (this.useColorXY) {
            return [joint.colorX, joint.colorY];
        }
        else {
            var T = this.T;
       // https://stackoverflow.com/questions/47348266/color-space-to-camera-space-transformation-matrix
            var z = joint.cameraZ;
            //var ix = (T.fx*joint.cameraX + T.cx)/z;
            //var iy = (T.fy*joint.cameraY + T.cy)/z;
            //var ix = (T.fx*joint.cameraX/z + T.cx);
            //var iy = (T.fy*joint.cameraY/z + T.cy);
            //var ix = T.fx*(joint.cameraX/z + T.cx);
            //var iy = T.fy*(joint.cameraY/z + T.cy);
            //var ix = (T.fx*joint.cameraX + T.cx);
            //var iy = (T.fy*joint.cameraY + T.cy);
            var ix = (T.fx*joint.cameraX + T.cx*z)/z;
            var iy = (T.fy*joint.cameraY + T.cy*z)/z;
            return [ix/this.viewer.width, iy/this.viewer.height];
       }
    }
}

var kinTrans = null;

class KinectTracker extends HumanBodyTracker {
    constructor(viewer) {
        super(viewer);
        this.player = viewer.player;
        this.visibleJoints = null;
        this.kinTrans = new KinTrans(this);
        kinTrans = this.kinTrans;
        //this.visibleJoints = [RHAND, LHAND];
    }

    setVisibleJoints(joints) {
        this.visibleJoints = joints;
    }

    draw(bodyFrame, opts) {
        if (!bodyFrame) {
            console.log("*** drawBodies no bodyFrame");
            return;
        }
        for (var bodyIndex = 0; bodyIndex < bodyFrame.bodies.length; bodyIndex++) {
            var body = bodyFrame.bodies[bodyIndex];
            if (body.tracked) {
                //if (opts.showSkels)
                    this.drawBody(body, bodyIndex);
            }
        }
        if (opts.showTrails) {
            this.drawTrails(bodyFrame);
        }
    }

    drawTrails(bodyFrame) {
        //console.log("drawTrails");
        this.computeTrails(bodyFrame);
        for (var trailId in viewer.trails) {
            var trail = viewer.trails[trailId];
            this.drawTrail(trail);
        }
    }

    drawTrail(trail) {
        var viewer = this.viewer;
        viewer.drawPolyline(trail.points, trail.color, this.player.trailWidth);
        //this.drawVelocity(trail);
        this.drawVelocityFromTrail(trail);
    }

    drawVelocity(trail) {
        //console.log("drawVector "+bodyIdx+" "+jointId);
        var player = this.player;
        var frames = player.bodyFrames;
        var i1 = Math.max(player.frameNum - 1, 0);
        var i2 = Math.min(player.frameNum + 1, frames.length - 1);
        //console.log("i1: "+i1+"  i2: "+i2);
        if (i1 == 0) {
            return; // frame indices start at 1
        }
        var bodyIdx = trail.bodyIdx;
        var jointId = trail.jointId;
        var f = frames[player.frameNum];
        var f1 = frames[i1];
        var f2 = frames[i2];
        var jt = f.bodies[bodyIdx].joints[jointId];
        var jt1 = f1.bodies[bodyIdx].joints[jointId];
        var jt2 = f2.bodies[bodyIdx].joints[jointId];
        var pt = this.kinTrans.getNcpt(jt);
        var pt2 = this.kinTrans.getNcpt(jt2);
        var v = [pt2[0] - pt[0], pt2[1] - pt[1]];
        this.viewer.drawVector(pt, v);
    }

    drawVelocityFromTrail(trail) {
        //console.log("drawVector "+bodyIdx+" "+jointId);
        var player = this.player;
        var viewer = this.viewer;
        var i1 = player.frameNum - trail.low - 1;
        var i2 = player.frameNum - trail.low + 1;
        if (i1 < 0 || i2 >= trail.points.length) {
            //console.log("i1: "+i1+"  i2: "+i2);
            return;
        }
        var pt = trail.points[player.frameNum - trail.low]
        var pt1 = trail.points[i1];
        var pt2 = trail.points[i2];
        var v = [pt2[0] - pt1[0], pt2[1] - pt1[1]];
        viewer.drawVectorImage(pt, v);
    }

    computeTrails(bodyFrame) {
        if (!bodyFrame) {
            console.log("*** computeTrails no bodyFrame");
            return;
        }
        var viewer = this.viewer;
        viewer.trails = {};
        var player = viewer.player;
        var fps = player.framesPerSec;
        var framesAhead = Math.round(player.secondsAhead * fps);
        var framesBehind = Math.round(player.secondsBehind * fps);
        var low = player.frameNum - framesBehind;
        var high = player.frameNum + framesAhead;
        //console.log("ahead behind: "+framesAhead+" "+framesBehind);
        for (var bodyIndex = 0; bodyIndex < bodyFrame.bodies.length; bodyIndex++) {
            var body = bodyFrame.bodies[bodyIndex];
            if (!body.tracked)
                continue;
            for (var i = 0; i < TRAIL_JOINTS.length; i++) {
                var jointId = TRAIL_JOINTS[i];
                var trail = this.computeTrail(player.bodyFrames,
                                        bodyIndex, jointId, low, high);
                trail.color = colors[i];
            }
        }
    }

    computeTrail(frames, bodyIdx, jointId, startNum, endNum) {
        //console.log("computeTrail "+bodyIdx+" "+jointId+" "+startNum+" "+endNum);
        var viewer = this.viewer;
        var pts = [];
        for (var i = startNum; i < endNum; i++) {
            if (i < 1 || i > frames.length)
                continue;
            var frame = frames[i];
            if (!frame) {
                console.log("No frame for i: " + i);
                continue;
            }
            var body = frame.bodies[bodyIdx];
            var joint = body.joints[jointId];
             var pt = this.kinTrans.getNcpt(joint);
            pts.push([pt[0] * viewer.width, pt[1] * viewer.height]);
        }
        for (var j = 0; j < this.player.smoothNum; j++)
            pts = smooth(pts);
        var trailId = bodyIdx + "_" + jointId;
        var trail = {points: pts, trailId, bodyIdx, jointId,
                     low: startNum, high: endNum};
        viewer.trails[trailId] = trail;
        return trail;
    }

    drawBody(body, bodyIndex) {
        //draw hand states
        //console.log("drawBody "+bodyIndex, body);
        if (0) {
            this.updateHandState(body.leftHandState, body.joints[7]);
            this.updateHandState(body.rightHandState, body.joints[11]);
        }
        var ctx = this.viewer.ctx;
        var color = colors[bodyIndex];
        var s = 10
        var viewer = this.viewer;
        for (var jointType in body.joints) {
            if (this.visibleJoints && !this.visibleJoints[jointType])
                continue;
            var joint = body.joints[jointType];
            //ctx.fillStyle = color;
            //ctx.fillRect(joint.colorX * this.width, joint.colorY * this.height, 10, 10);
           // ctx.fillRect(joint.colorX * viewer.width - s / 2.0, joint.colorY * viewer.height - s / 2.0, s, s);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(joint.colorX*viewer.width, joint.colorY*viewer.height,
                        s, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.closePath();
        }
        if (this.player.showSkels)
            this.drawSkel(body, bodyIndex, color);
    }

    drawSkel(body, bodyIndex, color) {
        if (player.sessionType == "posenet") {
            this.drawBones(body, ["shoulderLeft", "elbowLeft", "wristLeft"], color);
            this.drawBones(body, ["shoulderRight", "elbowRight", "wristRight"], color);
            this.drawBones(body, ["shoulderLeft", "shoulderRight", "hipRight", "hipLeft", "shoulderLeft"], color);
            this.drawBones(body, ["hipLeft", "kneeLeft", "ankleLeft"], color);
            this.drawBones(body, ["hipRight", "kneeRight", "ankleRight"], color);
            return;  
        }
        this.drawBones(body, ["head", "neck"], color);
        this.drawBones(body, ["neck", "shoulderLeft", "elbowLeft", "handLeft"], color);
        this.drawBones(body, ["neck", "shoulderRight", "elbowRight", "handRight"], color);
        this.drawBones(body, ["neck", "spineShoulder", "spineMid", "spineBase"], color);
        this.drawBones(body, ["neck", "spineShoulder", "spineMid", "spineBase"], color);
        this.drawBones(body, ["spineBase", "hipLeft", "kneeLeft", "ankleLeft", "footLeft"], color);
        this.drawBones(body, ["spineBase", "hipRight", "kneeRight", "ankleRight", "footRight"], color);
        //this.drawBones(body, ["handLeft", "handRight"], "green");
    }

    drawBones(body, jointNames, color) {
        //console.log("body "+JSON.stringify(body, null, 3));
        var viewer = this.viewer;
        var pts = [];
        for (var i=0; i<jointNames.length; i++) {
            var jointName = jointNames[i];
            var jointId = JointType[jointName];
            var joint = body.joints[jointId];
            if (joint == null) {
                //console.log("No joint for "+jointName);
                return;
            }
            if (joint.trackingState == TrackingState_NotTracked) {
                console.log("Not Tracked");
                return;
            }
            if (joint.colorX > 1 || joint.colorY > 1) {
                //console.log("Joint image coord out of range");
                return;
            }
            var pt = [joint.colorX*viewer.width, joint.colorY*viewer.height];
            pts.push(pt);
        }
        viewer.drawPolyline(pts, color);
    }

    drawHand(jointPoint, handColor) {
        // draw semi transparent hand cicles
        var viewer = this.viewer;
        var ctx = viewer.ctx;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.fillStyle = handColor;
        ctx.arc(jointPoint.colorX * viewer.width, jointPoint.colorY * viewer.height, HANDSIZE, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
    }

    updateHandState(handState, jointPoint) {
        switch (handState) {
            case 3:
                this.drawHand(jointPoint, HANDCLOSEDCOLOR);
                break;

            case 2:
                this.drawHand(jointPoint, HANDOPENCOLOR);
                break;

            case 4:
                this.drawHand(jointPoint, HANDLASSOCOLOR);
                break;
        }
    }


}


