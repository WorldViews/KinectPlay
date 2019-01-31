
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

var LHAND = 7;
var RHAND = 11;
var TRAIL_JOINTS = [RHAND, LHAND];

var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];

// handstate circle size
var HANDSIZE = 20;

// closed hand state color
var HANDCLOSEDCOLOR = "red";

// open hand state color
var HANDOPENCOLOR = "green";

// lasso hand state color
var HANDLASSOCOLOR = "blue";


class BodyGraphic {
    constructor(viewer) {
        this.viewer = viewer;
        this.visibleJoints = null;
        //this.visibleJoints = [RHAND, LHAND];
    }

    setVisibleJoints(joints) {
        this.visibleJoints = joints;
    }

    draw(bodyFrame) {
        if (!bodyFrame) {
            console.log("*** drawBodies no bodyFrame");
            return;
        }
        //var showTrails = $("#showTrails").is(':checked');
        var viewer = this.viewer;
        var player = viewer.player;
        var showTrails = player.showTrails;
        var showSkels = player.showSkels;
        var fps = player.framesPerSec;
        var framesAhead = Math.round(player.secondsAhead * fps);
        var framesBehind = Math.round(player.secondsBehind * fps);
        //console.log("ahead behind: "+framesAhead+" "+framesBehind);
        for (var bodyIndex = 0; bodyIndex < bodyFrame.bodies.length; bodyIndex++) {
            var body = bodyFrame.bodies[bodyIndex];
            if (body.tracked) {
                //this.drawBody(body, bodyIndex);
                if (showTrails && player) {
                    for (var i = 0; i < TRAIL_JOINTS.length; i++) {
                        var joint = TRAIL_JOINTS[i];
                        var color = colors[i];
                        viewer.drawTrail(player.bodyFrames, bodyIndex,
                            joint, color,
                            player.frameNum - framesBehind,
                            player.frameNum + framesAhead);
                            viewer.drawVelocity(player.bodyFrames, bodyIndex, joint, color);
                    }
                }
                if(showSkels)
                    this.drawBody(body, bodyIndex);
            }
        }
    }

    drawBody(body, bodyIndex) {
        //draw hand states
        //console.log("drawBody "+bodyIndex, body);
        this.updateHandState(body.leftHandState, body.joints[7]);
        this.updateHandState(body.rightHandState, body.joints[11]);
        var ctx = this.viewer.ctx;
        var color = colors[bodyIndex];
        var s = 10
        var viewer = this.viewer;
        for (var jointType in body.joints) {
            if (this.visibleJoints && !this.visibleJoints[jointType])
                continue;
            var joint = body.joints[jointType];
            ctx.fillStyle = color;
            //ctx.fillRect(joint.colorX * this.width, joint.colorY * this.height, 10, 10);
            ctx.fillRect(joint.colorX * viewer.width - s / 2.0, joint.colorY * viewer.height - s / 2.0, s, s);
        }
        //this.drawSkel(body, bodyIndex);
    }

    drawSkel(body, bodyIndex) {
        this.drawBones(body, ["head", "neck"]);
        this.drawBones(body, ["neck", "shoulderLeft", "elbowLeft", "handLeft"]);
        this.drawBones(body, ["neck", "shoulderRight", "elbowRight", "handRight"]);
        this.drawBones(body, ["neck", "spineShoulder", "spineMid", "spineBase"]);
        this.drawBones(body, ["handLeft", "handRight"]);
    }

    drawBones(body, jointNames) {
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
            var pt = [joint.colorX*viewer.width, joint.colorY*viewer.height];
            pts.push(pt);
        }
        viewer.drawPolyline(pts, 'green');
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


