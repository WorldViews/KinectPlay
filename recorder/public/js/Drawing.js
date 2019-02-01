
var LHAND = 7;
var RHAND = 11;
var TRAIL_JOINTS = [RHAND, LHAND];

function dist2(pt1, pt2) {
    var dx = pt1[0] - pt2[0];
    var dy = pt1[1] - pt2[1];
    return dx * dx + dy * dy;
}

function smooth(pts) {
    var npts = [];
    var N = pts.length;
    if (N == 0)
        return pts;
    npts[0] = pts[0];
    npts[N - 1] = pts[N - 1];
    for (var i = 1; i < N - 1; i++) {
        npts[i] = [(pts[i - 1][0] + pts[i][0] + pts[i + 1][0]) / 3.0,
        (pts[i - 1][1] + pts[i][1] + pts[i + 1][1]) / 3.0];
    }
    return npts;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return [evt.clientX - rect.left, evt.clientY - rect.top];
}

function findNearestPoint(pts, pt) {
    var d2Min = 1.0E100;
    var iMin = null;

    for (var i = 0; i < pts.length; i++) {
        var d2 = dist2(pts[i], pt);
        if (d2 < d2Min) {
            iMin = i;
            d2Min = d2;
        }
    }
    var ret = { iMin, d: Math.sqrt(d2Min) };
    if (iMin != null)
        ret.pt = pts[iMin];
    return ret;
}

function findBestPoint(pts, pt, low, cur, A) {
    //console.log("findBestPoint "+low+" "+cur);
    //return findNearestPoint(pts, pt);
    var sMin = 1.0E100;
    var dMin = 1.0E100;
    var iMin = null;

    for (var i = 0; i < pts.length; i++) {
        var d = Math.sqrt(dist2(pts[i], pt));
        var dn = cur - (i + low);
        var dt = dn * 1.0 / 20;
        //console.log("dt: "+dt);
        var s = d + A * Math.abs(dt);
        if (s < sMin) {
            sMin = s;
            iMin = i;
            dMin = d;
        }
    }
    var ret = { iMin, d: dMin, s: sMin };
    if (iMin != null)
        ret.pt = pts[iMin];
    return ret;
}


class Viewer {
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
        this.trailsJointId = {};
        this.mousePoint = null;
        console.log("Visible Joints: " + JSON.stringify(this.visibleJoints));
        this.mouseIsDown = false;
        this.bodyGraphic = new BodyGraphic(this);
        $("#bodyCanvas").mousemove(e => inst.onMouseMove(e));
        $("#bodyCanvas").mousedown(e => inst.onMouseDown(e));
        $("#bodyCanvas").mouseup(e => inst.onMouseUp(e));
    }


    onMouseDown(e) {
        console.log("mouseDown");
        var pt = getMousePos(this.canvas, e);
        this.mouseIsDown = true;
        this.mousePoint = pt;
        this.findDraggedJoint(pt, -1);
    }

    findDraggedJoint(pt, jointId) {
        this.draggedJoint = -1;
        this.draggedBody = -1;
        this.draggedTrail = null;
        //for (var jointIdx in this.trails) {
        for (var trailId in this.trails) {
            //var pts = this.trails[jointIdx];
            var pts = this.trails[trailId];
            var jointIdx = this.trailsJointId[trailId];
            var ret = findNearestPoint(pts, pt);
            //console.log("nearest "+jointIdx+" "+JSON.stringify(ret));
            if (ret.d < 10) {
                if (jointId >= 0 && jointId != jointIdx)
                    return;
                this.draggedTrail = trailId;
                this.draggedJoint = jointIdx;
                //var n = this.trailsLow[jointIdx] + ret.iMin;
                //this.draggedBody = this.trailsBodyIdx[jointIdx];
                var n = this.trailsLow[trailId] + ret.iMin;
                this.draggedBody = this.trailsBodyIdx[trailId];
                this.player.seekIdx(n);
            }
        }
    }

    //dragJoint(jointIdx, pt) {
    dragJoint(trailId, pt) {
        var jointId = this.trailsJointId[trailId];
        var pts = this.trails[trailId];
        var low = this.trailsLow[trailId];
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
        //if (this.draggedJoint >= 0)
        //    this.dragJoint(this.draggedJoint, pt);
        if (this.draggedTrail)
            this.dragJoint(this.draggedTrail, pt);
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

    clearBackground(img) {
        //console.log("clearBackground "+img);
        var ctx = this.ctx;
        ctx.fillStyle = "white";
        ctx.fillStyle = "pink";
        ctx.fillRect(0, 0, 1000, 1000);
        if (img) {
            ctx.drawImage(img, 0, 0, this.width, this.height);
        }
    }

    draw(bodyFrame) {
        this.bodyGraphic.draw(bodyFrame);
    }

    drawPolyline(pts, color) {
        var ctx = this.ctx;

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
            var pt = pts[i];
            ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
    }

    computeTrail(frames, bodyIdx, jointId, startNum, endNum) {
        //console.log("computeTrail "+bodyIdx+" "+jointId+" "+startNum+" "+endNum);
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
            pts.push([joint.colorX * this.width, joint.colorY * this.height]);
        }
        for (var j = 0; j < this.player.smoothNum; j++)
            pts = smooth(pts);
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
        var trailId = bodyIdx + "_" + jointId;
        this.trails[trailId] = pts;
        this.trailsLow[trailId] = low;
        this.trailsBodyIdx[trailId] = bodyIdx;
        this.trailsJointId[trailId] = jointId;
        this.drawPolyline(pts, color);
        this.drawDrag();
    }

    drawVelocity(frames, bodyIdx, jointId, color, low, high) {
        //console.log("drawVector "+bodyIdx+" "+jointId);
        var player = this.player;
        var i1 = Math.max(player.frameNum - 1, 0);
        var i2 = Math.min(player.frameNum + 1, frames.length - 1);
        //console.log("i1: "+i1+"  i2: "+i2);
        if (i1 == 0) {
            return; // frame indices start at 1
        }
        var f = frames[player.frameNum];
        var f1 = frames[i1];
        var f2 = frames[i2];
        var jt = f.bodies[bodyIdx].joints[jointId];
        var jt1 = f1.bodies[bodyIdx].joints[jointId];
        var jt2 = f2.bodies[bodyIdx].joints[jointId];
        var pt = [jt.colorX, jt.colorY];
        var pt2 = [jt2.colorX, jt2.colorY];
        var v = [pt2[0] - pt[0], pt2[1] - pt[1]];
        this.drawVector(pt, v);
    }

    drawVector(pt, v) {
        var L = 1.5;
        var pt2 = [pt[0] + L * v[0], pt[1] + L * v[1]];
        var ctx = this.ctx;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'purple';
        ctx.beginPath();
        ctx.moveTo(this.width * pt[0], this.height * pt[1]);
        ctx.lineTo(this.width * pt2[0], this.height * pt2[1]);
        ctx.stroke();
    }

    handleLive(frame) {
        //console.log("handleLive", frame);
        this.player.redraw();
        for (var bodyIndex = 0; bodyIndex < frame.bodies.length; bodyIndex++) {
            var body = frame.bodies[bodyIndex];
            if (!body.tracked)
                continue;
            $("#trackedControlId").html(body.trackingId);
            this.bodyGraphic.drawBody(body, bodyIndex);
            var joint = body.joints[RHAND];
            var pt = [joint.colorX * this.width, joint.colorY * this.height];
            if (this.draggedTrail == null)
                this.findDraggedJoint(pt, RHAND);
            if (this.draggedTrail) {
                this.controlPoint = pt;
                var ret = this.dragJoint(this.draggedTrail, pt);
                if (ret.d > 200) {
                    console.log("break dragging");
                    this.draggedTrail = null;
                    this.draggedJoint = -1;
                    this.controlPoint = null;
                }
            }
        }
    }
}

