

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

function dist2(pt1, pt2)
{
    var dx = pt1[0]-pt2[0];
    var dy = pt1[1]-pt2[1];
    return dx*dx+dy*dy;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return [evt.clientX - rect.left, evt.clientY - rect.top];
//    return {
//      x: evt.clientX - rect.left,
//      y: 
//    };
}

function findNearestPoint(pts, pt)
{
    var d2Min = 1.0E100;
    var iMin = null;
    
    for (var i=0; i<pts.length; i++) {
        var d2 = dist2(pts[i],pt);
        if (d2 < d2Min) {
            iMin = i;
            d2Min = d2;
        }
    }
    var ret = {iMin, d: Math.sqrt(d2Min)};
    if (iMin != null)
        ret.pt = pts[iMin];
    return ret;
}

function findBestPoint(pts, pt, low, cur, A)
{
    //console.log("findBestPoint "+low+" "+cur);
    //return findNearestPoint(pts, pt);
    var sMin = 1.0E100;
    var dMin = 1.0E100;
    var iMin = null;
    
    for (var i=0; i<pts.length; i++) {
        var d = Math.sqrt(dist2(pts[i],pt));
        var dn = cur - (i+low);
        var dt = dn * 1.0/20;
        //console.log("dt: "+dt);
        var s = d + A*Math.abs(dt);
        if (s < sMin) {
            sMin = s;
            iMin = i;
            dMin = d;
        }
    }
    var ret = {iMin, d: dMin, s: sMin};
    if (iMin != null)
        ret.pt = pts[iMin];
    return ret;
}


class BodyDrawer
{
    constructor(player) {
        var inst = this;
        this.player = player;
        this.canvas = document.getElementById('bodyCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.aspectRatio = this.width / (this.height + 0.0);
        this.trails = {};
        this.trailsLow = {};
        this.trailsBodyIdx = {};
        this.mousePoint = null;
        this.visibleJoints = null;
        //this.visibleJoints = [RHAND, LHAND];
        console.log("Visible Joints: "+JSON.stringify(this.visibleJoints));
        this.mouseIsDown = false;
        $("#bodyCanvas").mousemove(e => inst.onMouseMove(e));
        $("#bodyCanvas").mousedown(e => inst.onMouseDown(e));
        $("#bodyCanvas").mouseup(e => inst.onMouseUp(e));
    }

    setVisibleJoints(joints)
    {
        this.visibleJoints = joints;
    }
    
    onMouseDown(e) {
        console.log("mouseDown");
        var pt = getMousePos(this.canvas, e);
        this.mouseIsDown = true;
        this.mousePoint = pt;
        this.findDraggedJoint(pt);
    }

    findDraggedJoint(pt) {
        this.draggedJoint = -1;
        for (var jointIdx in this.trails) {
            var pts = this.trails[jointIdx];
            var ret = findNearestPoint(pts, pt);
            //console.log("nearest "+jointIdx+" "+JSON.stringify(ret));
            if (ret.d < 10) {
                this.draggedJoint = jointIdx;
                var n = this.trailsLow[jointIdx] + ret.iMin;
                this.player.seekIdx(n);
            }
        }
    }

    dragJoint(jointIdx, pt) {
        var pts = this.trails[jointIdx];
        var low = this.trailsLow[jointIdx]
        if (low < 0)
            low = 0;
        var cur = player.frameNum;
        var ret = findBestPoint(pts, pt, low, cur, player.WT);
        this.nearestPoint = ret.pt;
        //console.log("nearest "+jointIdx+" "+JSON.stringify(ret));
        var n = low + ret.iMin;
        //console.log("low "+low+" iMin "+ret.iMin+"  n: "+n);
        this.player.redraw();
        this.player.seekIdx(n);
        return ret;
    }

    onMouseMove(e) {
        var pt = getMousePos(this.canvas, e);
        //console.log("mouseMove "+x+" "+y);
        if (!this.mouseIsDown)
            return;
        this.mousePoint = pt;
        this.controlPoint = pt;
        //console.log("mouseDrag "+pt);
        if (this.draggedJoint >= 0)
            this.dragJoint(this.draggedJoint, pt);
    }

    onMouseUp(e) {
        console.log("mouseUp");
        this.mouseIsDown = false;
        this.mousePoint = null;
        this.controlPoint = null;
    }

    resize() {
        //console.log("resize");
        this.width = window.innerWidth;
        this.height = this.width / this.aspectRatio;
        //console.log("w: "+this.width);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
//        this.canvas.height = window.innerHeight;
    }
    
    clearBackground(img)
    {
        //console.log("clearBackground "+img);
        var ctx = this.ctx;
        ctx.fillStyle = "white";
        ctx.fillStyle = "pink";
        ctx.fillRect(0, 0, 1000, 1000);
        if (img) {
            ctx.drawImage(img, 0, 0, this.width, this.height);
        }
    }

    draw(bodyFrame)
    {
        if (!bodyFrame) {
            console.log("*** drawBodies no bodyFrame");
            return;
        }
        var showTrails = $("#showTrails").is(':checked');
        var player = this.player;
        for (var bodyIndex=0; bodyIndex<bodyFrame.bodies.length; bodyIndex++) {
            var body = bodyFrame.bodies[bodyIndex];
	    if(body.tracked) {
                //this.drawBody(body, bodyIndex);
                if (showTrails && player) {
                    for (var i=0; i<TRAIL_JOINTS.length; i++) {
                        var joint = TRAIL_JOINTS[i];
                        var color = colors[i];
                        this.drawTrail(player.bodyFrames, bodyIndex,
                                       joint, color,
                                       player.frameNum-player.framesBehind,
                                       player.frameNum+player.framesAhead);
                    }
                }
                this.drawBody(body, bodyIndex);
            }
        }
    }

    drawBody(body, index) {
	//draw hand states
        //console.log("drawBody "+index);
        this.updateHandState(body.leftHandState, body.joints[7]);
	this.updateHandState(body.rightHandState, body.joints[11]);
        var ctx = this.ctx;
        var color = colors[index];
        var s = 10
	for(var jointType in body.joints) {
            if (this.visibleJoints && !this.visibleJoints[jointType])
                continue;
	    var joint = body.joints[jointType];
	    ctx.fillStyle = color;
            //ctx.fillRect(joint.colorX * this.width, joint.colorY * this.height, 10, 10);
            ctx.fillRect(joint.colorX * this.width - s/2.0, joint.colorY * this.height - s/2.0, s, s);
	}
        /*
	for(var j in body.joints) {
	    var joint = body.joints[j];
            var jointType = joint.jointType;
            if (this.visibleJoints && !this.visibleJoints[jointType])
                continue;
	    ctx.fillStyle = color;
            ctx.fillRect(joint.colorX * this.width, joint.colorY * this.height, 10, 10);
	}
        */
    }

    drawHand(jointPoint, handColor) {
        // draw semi transparent hand cicles
        var ctx = this.ctx;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.fillStyle = handColor;
        ctx.arc(jointPoint.colorX * this.width, jointPoint.colorY * this.height, HANDSIZE, 0, Math.PI * 2, true);
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

    drawPolyline(pts, color)
    {
        var ctx = this.ctx;

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++)
        {
            var pt = pts[i];
            ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
    }

    computeTrail(frames, bodyIdx, jointId, startNum, endNum)
    {
        //console.log("computeTrail "+bodyIdx+" "+jointId+" "+startNum+" "+endNum);
        var pts = [];
        for (var i=startNum; i<endNum; i++) {
            if (i < 1 || i > frames.length)
                continue;
            var frame = frames[i];
            if (!frame) {
                console.log("No frame for i: "+i);
                continue;
            }
            var body = frame.bodies[bodyIdx];
            var joint = body.joints[jointId];
            pts.push([joint.colorX*this.width, joint.colorY*this.height]);
        }
        return pts;
    }

    drawDrag() {
        if (!this.controlPoint || !this.nearestPoint)
            return;
        var ctx = this.ctx;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'pink';
        ctx.beginPath();
        ctx.moveTo(this.nearestPoint[0], this.nearestPoint[1]);
        ctx.lineTo(this.controlPoint[0], this.controlPoint[1]);
        ctx.stroke();
    }
    
    drawTrail(frames, bodyIdx, jointId, color, low, high) {
        //console.log("drawTrail "+bodyIdx+" "+jointId);
        var pts = this.computeTrail(frames, bodyIdx, jointId, low, high);
        this.trails[jointId] = pts;
        this.trailsLow[jointId] = low;
        this.trailsBodyIdx[jointId] = bodyIdx;
        this.drawPolyline(pts, color);
        this.drawDrag();
    }

    handleLive(frame) {
        //console.log("handleLive");
        this.player.redraw();
        for (var bodyIndex=0; bodyIndex<frame.bodies.length; bodyIndex++) {
            var body = frame.bodies[bodyIndex];
            if (!body.tracked)
                continue;
            this.drawBody(body, bodyIndex);
            var joint = body.joints[RHAND];
            var pt = [joint.colorX * this.width, joint.colorY * this.height];
            if (this.draggedJoint < 0)
                this.findDraggedJoint(pt);
            if (this.draggedJoint >= 0) {
                this.controlPoint = pt;
                var ret = this.dragJoint(this.draggedJoint, pt);
                if (ret.d > 200) {
                    console.log("break dragging");
                    this.draggedJoint = -1;
                    this.controlPoint = null;
                }
            }
        }
    }
}


