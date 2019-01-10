

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


class BodyDrawer
{
    constructor() {
        this.canvas = document.getElementById('bodyCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    clearBackground(img)
    {
        console.log("clearBackground "+img);
        var ctx = this.ctx;
        ctx.fillStyle = "white";
        ctx.fillStyle = "pink";
        ctx.fillRect(0, 0, 1000, 1000);
        if (img) {
/*
            if (canvWd != img.width) {
                console.log("width: "+img.naturalWidth+"  height: "+img.naturalHeight);
                //canvWd = img.width;
                //canvHt = img.height;
                canvWd = img.naturalWidth;
                canvHt = img.naturalHeight;
            }
            //ctx.drawImage(img, 0, 0, 900, 700);
*/
            ctx.drawImage(img, 0, 0, this.width, this.height);
        }
    }

    draw(bodyFrame, player)
    {
        if (!bodyFrame) {
            console.log("*** drawBodies no bodyFrame");
            return;
        }
        var showTrails = $("#showTrails").is(':checked');
        var index = 0;
        var inst = this;
        bodyFrame.bodies.forEach(function(body){
	    if(body.tracked) {
                inst.drawBody(body, index);
                if (showTrails) {
                    //inst.drawTrail(player.bodyFrames, index, RHAND, 0, frames.length);
                    for (var i=0; i<TRAIL_JOINTS.length; i++) {
                        var joint = TRAIL_JOINTS[i];
                        var color = colors[i];
                        inst.drawTrail(player.bodyFrames, index, joint, color, player.frameNum-30, player.frameNum+30);
                    }
                }
	        index++;
            }});
    }

    drawBody(body, index) {
        var ctx = this.ctx;
	for(var jointType in body.joints) {
	    var joint = body.joints[jointType];
	    ctx.fillStyle = colors[index];
            ctx.fillRect(joint.colorX * this.width, joint.colorY * this.height, 10, 10);
	}
	//draw hand states
        this.updateHandState(body.leftHandState, body.joints[7]);
	this.updateHandState(body.rightHandState, body.joints[11]);
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
        var pts = [];
        for (var i=startNum; i<endNum; i++) {
            if (i < 1 || i > frames.length)
                continue;
            var frame = frames[i];
            var body = frame.bodies[bodyIdx];
            var joint = body.joints[jointId];
            pts.push([joint.colorX*this.width, joint.colorY*this.height]);
        }
        return pts;
    }
    
    drawTrail(frames, bodyIdx, jointId, color, low, high) {
        console.log("drawTrail "+bodyIdx+" "+jointId);
        var pts = this.computeTrail(frames, bodyIdx, jointId, low, high);
        this.drawPolyline(pts, color);
    }
}


