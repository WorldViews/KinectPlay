
class LeapTracker extends HumanHandTracker {
    constructor(viewer) {
        super(viewer);
        this.player = viewer.player;
        var canvas = viewer.canvas;
        this.canvas = canvas;
        this.xCenter = canvas.width / 2;
        this.yCenter = canvas.height / 2;
        this.sx = 1.5;
        this.sy = this.sx;
        this.setEuler([180, 0, 0]);
        this.setTranslation([canvas.width / 2, canvas.height / 2]);
        this.setScale(1.7);
    }

    setProps(p) {
        if (p.scale) {
            this.setScale(p.scale);
        }
        if (p.euler) {
            this.setEuler(p.euler);
        }
        if (p.translation) {
            this.setTranslation(p.translation);
        }
    }

    setScale(sx, sy) {
        if (sy == null)
            sy = sx;
        this.sx = sx;
        this.sy = sy;
    }

    setTranslation(T) {
        this.xCenter = T[0];
        this.yCenter = T[1];
    }

    setEuler(eulerAnglesDeg) {
        this.R = M33.eulToMat(V3.toRadians(eulerAnglesDeg));
    }

    // convert world coordinates to canvas.  For now this is
    // limited but can be improved to implement a correct perspective
    // projection
    wToC(wpt) {
        let cpt = M33.transform(this.R, wpt);
        return [this.sx * cpt[0] + this.xCenter, this.sy * cpt[2] + this.yCenter];
    }

    draw(jsonObj, clear) {
        // various styles for hand skeleton 
        // 0: is default, shows each joint clearly
        // 1: is a cleaner design
        //var skStyle = 0; // -1, 0, 1
        var skStyle = 0; //104; // 100 series -- Xiaojing designs
        // 103: is two fingers, thumb and forefinger, and their first two joints; the rest in gray
        // 104: is three fingers, thumb and forefinger and middle finger; and their first joints, middle finger first two joints; the rest in gray

        //document.getElementById("demo").innerHTML = 'currentFrameRate: ' +  jsonObj.currentFrameRate + ', timestamp: ' + jsonObj.timestamp;
        //var canvas = document.getElementById("my-canvas");
        var canvas = this.canvas;
        var context = canvas.getContext("2d");

        // draw circles at the joints
        // see: https://developer-archive.leapmotion.com/documentation/javascript/devguide/Intro_Skeleton_API.html
        //canvas = document.getElementById("my-canvas");
        var ctx = canvas.getContext("2d");

        // clear canvas between frames
        if (clear) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        //var x = 0, y = 0;
        //var xPre = x, yPre = y;
        let pt, pre;
        var colorStylePre = "gray"

        // hands: one or two
        var hands = jsonObj.hands
        var pointables = jsonObj.pointables

        for (var k = 0; k < hands.length; k++) {
            // wrist: connect with 5 lines to carps, below
            pt = this.wToC(hands[k].wrist);
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 5, 0, 2 * Math.PI, true);
            if (skStyle >= 0)
                ctx.fillStyle = "LightGray";
            //ctx.fillStyle = "gray";		
            //ctx.fillStyle = "black";		
            else
                ctx.fillStyle = "gray";
            //ctx.fillStyle = "#00f";
            ctx.fill();
        }

        // fingers
        var fingerType = 0, fingerJoint = 0, fingerSegment = 0;

        for (var i = 0; i < pointables.length; i++) {
            fingerType = pointables[i].type;

            // btip
            fingerJoint = 0;
            pt = this.wToC(pointables[i].btipPosition);
            //document.getElementById("demo").innerHTML = 'x: ' +  x + ', y: ' + y;

            ctx.beginPath();
            if (skStyle >= 100)
                ctx.arc(pt[0], pt[1], 3, 0, 2 * Math.PI, true);
            else
                ctx.arc(pt[0], pt[1], 2, 0, 2 * Math.PI, true);
            ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
            //ctx.fillStyle = "red";
            //ctx.fillStyle = "#00f";
            ctx.fill();

            // dip
            fingerJoint = 1;
            colorStylePre = ctx.fillStyle
            pre = pt;
            pt = this.wToC(pointables[i].dipPosition);
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 3, 0, 2 * Math.PI, true);
            ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
            //ctx.fillStyle = "red";
            ctx.fill();

            // connect with line
            fingerSegment = 0;
            ctx.beginPath();
            ctx.moveTo(pre[0], pre[1]);
            ctx.lineTo(pt[0], pt[1]);
            ctx.strokeStyle = getStrokeStyle(skStyle, fingerType, fingerSegment);
            //ctx.strokeStyle = colorStylePre;
            ctx.stroke();

            // pip
            fingerJoint = 2;
            colorStylePre = ctx.fillStyle;
            pre = pt;
            pt = this.wToC(pointables[i].pipPosition)
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 4, 0, 2 * Math.PI, true);
            ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
            //ctx.fillStyle = "red";
            ctx.fill();

            // connect with line
            fingerSegment = 1;
            ctx.beginPath();
            ctx.moveTo(pre[0], pre[1]);
            ctx.lineTo(pt[0], pt[1]);
            ctx.strokeStyle = getStrokeStyle(skStyle, fingerType, fingerSegment);
            //ctx.strokeStyle = colorStylePre;
            ctx.stroke();

            // note: thumb does not have mcp to carp joint
            fingerJoint = 3;
            if (fingerType != 0) {
                // mcp
                colorStylePre = ctx.fillStyle
                pre = pt;
                pt = this.wToC(pointables[i].mcpPosition)
                ctx.beginPath();
                ctx.arc(pt[0], pt[1], 4, 0, 2 * Math.PI, true);
                ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
                //ctx.fillStyle = "blue";
                ctx.fill();

                // connect with line
                fingerSegment = 2;
                ctx.beginPath();
                ctx.moveTo(pre[0], pre[1]);
                ctx.lineTo(pt[0], pt[1]);
                ctx.strokeStyle = getStrokeStyle(skStyle, fingerType, fingerSegment);
                //ctx.strokeStyle = colorStylePre;
                ctx.stroke();
            }
            else {
                ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
                //ctx.fillStyle = "green";
            }

            // carp
            fingerJoint = 4;
            colorStylePre = ctx.fillStyle
            pre = pt;
            pt = this.wToC(pointables[i].carpPosition);
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 5, 0, 2 * Math.PI, true);
            ctx.fillStyle = getJointStyle(skStyle, fingerType, fingerJoint);
            //ctx.fillStyle = "blue";
            ctx.fill();

            // connect with line
            fingerSegment = 3;
            ctx.beginPath();
            ctx.moveTo(pre[0], pre[1]);
            ctx.lineTo(pt[0], pt[1]);
            ctx.strokeStyle = getStrokeStyle(skStyle, fingerType, fingerSegment);
            //ctx.strokeStyle = colorStylePre;
            ctx.stroke();

            // wrist
            pre = pt;
            var handId = pointables[i].handId;  // want 0-based
            for (var k = 0; k < hands.length; k++) {
                if (handId == hands[k].id) {
                    //x = hands[k].wrist[0] + xCenter;
                    //y = hands[k].wrist[1] + yCenter;
                    pt = this.wToC(hands[k].wrist);
                    break;
                }
            }

            // connect with line
            fingerSegment = 4;
            ctx.beginPath();
            ctx.moveTo(pre[0], pre[1]);  // carp coordinates
            ctx.lineTo(pt[0], pt[1]);
            ctx.strokeStyle = getStrokeStyle(skStyle, fingerType, fingerSegment);
            //ctx.strokeStyle = "gray";
            ctx.stroke();
        }
    }

    drawTrails(handFrame) {
        var frames = this.player.handFrames;
        this.computeTrails(frames);
        for (var trailId in viewer.trails) {
            var trail = viewer.trails[trailId];
            viewer.drawPolyline(trail.points, 'red');
        }
    }

    computeTrails(frames) {
        var viewer = this.viewer;
        var player = viewer.player;
        if (!frames) {
            console.log("no frames");
            return;
        }
        viewer.trails = {};
        var n = player.getCurrentIdx();
        var fps = player.framesPerSec;
        var framesAhead = Math.round(player.secondsAhead * fps);
        var framesBehind = Math.round(player.secondsBehind * fps);
        var low = n - framesBehind;
        var high = n + framesAhead;
        if (low < 1)
            low = 1;
        if (high > frames.length-1)
            high = frames.length -1;
        var trailId = 0;
        for (var handId=0; handId<3; handId++) {
            var pts = [];
            for (var i=low; i<high; i++) {
                var frame = frames[i];
                var hands = frame.hands;
                if (!hands || hands.length <= handId)
                    continue;
                var pt = this.wToC(hands[handId].wrist);
                pts.push(pt);        
            }
            if (pts.length == 0)
                continue;
            var trail = {points: pts, trailId, handId, low, high};                         
            viewer.trails[trailId] = trail;
            trailId++;
            //console.log("hands trail pts:", pts);
        }
    }
}

function getJointStyle(skStyle, fingerType, fingerJoint) {
    // fingerJoint is 0-based, from the finger tip inwards
    if (skStyle == 0) {
        if (fingerJoint < 2)
            return "red"
        else if (fingerJoint == 2)
            if (fingerType == 0)
                return "green"
            else
                return "orange"
        else if (fingerJoint == 3)
            return "green"
    }
    else if (skStyle == 1) {
        if (fingerJoint < 2)
            return "red"
        else if (fingerJoint == 2)
            return "red"
        else if (fingerJoint == 3)
            return "orange"
    }
    else if (skStyle == 103) {
        if (fingerType != 0 && fingerType != 1)
            return "LightGray";

        if (fingerJoint < 2)
            return "Orchid"
        else if (fingerJoint == 2)
            return "Orchid"
        else if (fingerJoint == 3)
            return "gray";
        //return "LightGray";
        //return "orange"	
    }
    else if (skStyle == 104) {
        if (fingerType != 0 && fingerType != 1 && fingerType != 2)
            return "LightGray";

        if (fingerJoint == 0)
            if (fingerType == 1)
                return "red";
            else
                return "Orchid"
        else if (fingerJoint == 1)
            if (fingerType == 1)
                return "Orchid";
            else
                return "gray"
        else if (fingerJoint == 2)
            return "gray"
        else if (fingerJoint == 3)
            return "gray";
        //return "LightGray";
        //return "orange"	
    }
    // default:
    return "gray"
}

function getStrokeStyle(skStyle, fingerType, fingerSegment) {
    // fingerSegment is 0-based, from the finger tip inwards
    if (skStyle == 0) {
        // default
        if (fingerSegment < 2)
            return "red"
        else if (fingerSegment == 2)
            if (fingerType == 0)
                return "green"
            else
                return "red"
        else if (fingerSegment == 3)
            return "green"
        else if (fingerSegment == 4)
            return "LightGray"
    }
    else if (skStyle == 1) {
        if (fingerSegment < 2)
            return "red"
        else if (fingerSegment == 2)
            return "red"
        else if (fingerSegment == 3)
            return "orange"
        else if (fingerSegment == 4)
            return "LightGray"
        //return "green"	
    }
    else if (skStyle == 103) {
        if (fingerType != 0 && fingerType != 1)
            return "LightGray";

        if (fingerSegment < 2)
            return "Orchid"
        else if (fingerSegment == 2)
            return "LightGray"
        //return "red"	
        else if (fingerSegment == 3)
            return "LightGray"
        //return "orange"	
        else if (fingerSegment == 4)
            return "LightGray"
    }
    else if (skStyle == 104) {
        if (fingerType != 0 && fingerType != 1 && fingerType != 2)
            return "LightGray";

        if (fingerSegment == 0)
            if (fingerType == 1)
                return "red";
            else
                return "Orchid"
        else if (fingerSegment == 1)
            if (fingerType == 1)
                return "Orchid"
            else
                return "LightGray"
        else if (fingerSegment == 2)
            return "LightGray"
        //return "red"	
        else if (fingerSegment == 3)
            return "LightGray"
        //return "orange"	
        else if (fingerSegment == 4)
            return "LightGray"
    }
    // default:
    return "LightGray"
    //return "gray"
}
