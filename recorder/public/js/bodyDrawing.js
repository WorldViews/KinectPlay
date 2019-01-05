
var canvas = document.getElementById('bodyCanvas');
var ctx = canvas.getContext('2d');

var lastBodyFrame = null;

var compression = 3;
//compression = 4;
compression = 5;
var canvWd = 1920/compression;
var canvHt = 1080/compression;

function setCompression(c)
{
    compression = c;
    canvWd = 1920/compression;
    canvHt = 1080/compression;
}

var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];

// handstate circle size
var HANDSIZE = 20;

// closed hand state color
var HANDCLOSEDCOLOR = "red";

// open hand state color
var HANDOPENCOLOR = "green";

// lasso hand state color
var HANDLASSOCOLOR = "blue";


function updateHandState(handState, jointPoint) {
    switch (handState) {
    case 3:
	drawHand(jointPoint, HANDCLOSEDCOLOR);
	break;

    case 2:
	drawHand(jointPoint, HANDOPENCOLOR);
	break;

    case 4:
	drawHand(jointPoint, HANDLASSOCOLOR);
	break;
    }
}

function drawHand(jointPoint, handColor) {
    // draw semi transparent hand cicles
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.fillStyle = handColor;
    ctx.arc(jointPoint.colorX * canvWd, jointPoint.colorY * canvHt, HANDSIZE, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
}

function clearBackground(img)
{
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1000, 1000);
    if (img) {
        //var img = document.getElementById("img1");
        //ctx.drawImage(img, canvWd, ht);
        //ctx.drawImage(img, 640, 480);
        if (canvWd != img.width) {
            console.log("width: "+img.naturalWidth+"  height: "+img.naturalHeight);
            //canvWd = img.width;
            //canvHt = img.height;
            canvWd = img.naturalWidth;
            canvHt = img.naturalHeight;
        }
        ctx.drawImage(img, 0, 0);
    }
}

function drawBodies(bodyFrame)
{
    if (!bodyFrame) {
        console.log("*** drawBodies no bodyFrame");
        return;
    }
    var index = 0;
    bodyFrame.bodies.forEach(function(body){
	if(body.tracked) {
	    for(var jointType in body.joints) {
		var joint = body.joints[jointType];
		ctx.fillStyle = colors[index];
                ctx.fillRect(joint.colorX * canvWd, joint.colorY * canvHt, 10, 10);
                JOINT = joint;
	    }
	    //draw hand states
	    updateHandState(body.leftHandState, body.joints[7]);
	    updateHandState(body.rightHandState, body.joints[11]);
	    index++;
	}
    });
}

