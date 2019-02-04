
var leapTracker;
var kinectTracker;

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
        this.mousePoint = null;
        console.log("Visible Joints: " + JSON.stringify(this.visibleJoints));
        this.mouseIsDown = false;
        this.kinectTracker = new KinectTracker(this);
        kinectTracker = this.kinectTracker;
        this.leapTracker = this.getLeapTracker();
        console.log("got leapTracker: ", this.leapTracker);
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
        for (var trailId in this.trails) {
            var trail = this.trails[trailId];
            var pts = trail.points;
            var jointIdx = trail.jointIdx;
            var ret = findNearestPoint(pts, pt);
            if (ret.d < 10) {
                if (jointId >= 0 && jointId != jointIdx)
                    return;
                this.draggedTrail = trailId;
                this.draggedJoint = jointIdx;
                var n = trail.low + ret.iMin;
                this.draggedBody = trail.bodyIdx;
                this.player.seekIdx(n);
            }
        }
    }

    //dragJoint(jointIdx, pt) {
    dragJoint(trailId, pt) {
        var trail = this.trails[trailId];
        var jointId = trail.jointId;
        var pts = trail.points;
        var low = trail.low;
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

    getLeapTracker() {
        console.log("*** getLeapTracker ***");
        if (this.leapTracker)
            return this.leapTracker;
        var params = this.player;
        leapTracker = new LeapTracker(this);
        leapTracker.setEuler([params.Rx, params.Ry, params.Rz]);
        leapTracker.setTranslation([params.Tx, params.Ty]);
        leapTracker.setScale(params.scale);
        this.leapTracker = leapTracker;
        return leapTracker;
    }

    draw(bodyFrame, handFrame) {
        var player = this.player;
        if (bodyFrame) {
            this.kinectTracker.draw(bodyFrame);
            if (player.showTrails)
                this.kinectTracker.drawTrails(bodyFrame);
        }
        //this.kinectTracker.draw(bodyFrame);
        //this.leapTracker.draw(handFrame);
        if (handFrame) {
            console.log("handFrame", handFrame);
            if (player.showSkels)
                leapTracker.draw(handFrame, false);
            if (player.showTrails)
                leapTracker.drawTrails(player.handFrames);
        }
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

    // pt and v are in image coordinates
    drawVectorImage(pt, v) {
        pt = [pt[0]/viewer.width, pt[1]/viewer.height];
        v = [v[0]/viewer.width, v[1]/viewer.height];
        this.drawVector(pt,v);
    }

    // pt and v are in normalized image coordinates
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
            this.kinectTracker.drawBody(body, bodyIndex);
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

