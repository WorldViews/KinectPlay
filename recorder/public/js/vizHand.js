

function vizHand(jsonObj, canvas, clear) {
	//document.getElementById("demo").innerHTML = 'currentFrameRate: ' +  jsonObj.currentFrameRate + ', timestamp: ' + jsonObj.timestamp;
	//var canvas = document.getElementById("my-canvas");
	//var context = canvas.getContext("2d");

	var xCenter = 200, yCenter = 200;

	// draw circles at the joints
	// see: https://developer-archive.leapmotion.com/documentation/javascript/devguide/Intro_Skeleton_API.html
	//canvas = document.getElementById("my-canvas");
	ctx = canvas.getContext("2d");
	
	// clear canvas between frames
        if (clear) {
	    ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

	var x = 0, y = 0;
	var xPre = x, yPre = y;	
	var colorStylePre = "black"
	
	// hands: one or two
	var hands = jsonObj.hands
	var pointables = jsonObj.pointables

	for (var k = 0; k < hands.length; k++) {
		// wrist: connect with 5 lines to carps, below
		x = hands[k].wrist[0] + xCenter;
		y = hands[k].wrist[1] + yCenter;	
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, 2*Math.PI, true);
		ctx.fillStyle = "black";
		//ctx.fillStyle = "#00f";
		ctx.fill();
	}

	// fingers
	for (var i = 0; i < pointables.length; i++) {
		// btip
		x = pointables[i].btipPosition[0] + xCenter;
		y = pointables[i].btipPosition[1] + yCenter;	
		//document.getElementById("demo").innerHTML = 'x: ' +  x + ', y: ' + y;

		ctx.beginPath();
		ctx.arc(x, y, 2, 0, 2*Math.PI, true);
		ctx.fillStyle = "red";
		//ctx.fillStyle = "#00f";
		ctx.fill();

		// dip
		xPre = x, yPre = y;	
		colorStylePre = ctx.fillStyle
		x = pointables[i].dipPosition[0] + xCenter;
		y = pointables[i].dipPosition[1] + yCenter;	
		ctx.beginPath();
		ctx.arc(x, y, 3, 0, 2*Math.PI, true);
		ctx.fillStyle = "red";
		ctx.fill();
		
		// connect with line
		ctx.beginPath();
		ctx.moveTo(xPre, yPre);
		ctx.lineTo(x, y);
		ctx.strokeStyle = colorStylePre;
		ctx.stroke(); 
		
		// pip
		xPre = x, yPre = y;	
		colorStylePre = ctx.fillStyle
		x = pointables[i].pipPosition[0] + xCenter;
		y = pointables[i].pipPosition[1] + yCenter;	
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, 2*Math.PI, true);
		ctx.fillStyle = "red";
		ctx.fill();
		
		// connect with line
		ctx.beginPath();
		ctx.moveTo(xPre, yPre);
		ctx.lineTo(x, y);
		ctx.strokeStyle = colorStylePre;
		ctx.stroke(); 

		// mcp
		xPre = x, yPre = y;	
		colorStylePre = ctx.fillStyle
		x = pointables[i].mcpPosition[0] + xCenter;
		y = pointables[i].mcpPosition[1] + yCenter;	
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, 2*Math.PI, true);
		ctx.fillStyle = "green";
		ctx.fill();
		
		// connect with line
		ctx.beginPath();
		ctx.moveTo(xPre, yPre);
		ctx.lineTo(x, y);
		ctx.strokeStyle = colorStylePre;
		ctx.stroke(); 
		
		// carp
		xPre = x, yPre = y;
		colorStylePre = ctx.fillStyle
		x = pointables[i].carpPosition[0] + xCenter;
		y = pointables[i].carpPosition[1] + yCenter;	
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, 2*Math.PI, true);
		ctx.fillStyle = "blue";
		ctx.fill();
		
		// connect with line
		ctx.beginPath();
		ctx.moveTo(xPre, yPre);
		ctx.lineTo(x, y);
		ctx.strokeStyle = colorStylePre;
		ctx.stroke(); 
				
		// wrist
		var handId= pointables[i].handId;  // want 0-based
		for (var k = 0; k < hands.length; k++) {
			if (handId == hands[k].id) {
				x = hands[k].wrist[0] + xCenter;
				y = hands[k].wrist[1] + yCenter;	
				break;
			}
		}
		
		// connect with line
		ctx.beginPath();
		ctx.moveTo(xPre, yPre);  // carp coordinates
		ctx.lineTo(x, y);
		ctx.strokeStyle = "black";
		ctx.stroke(); 	
	}
}

