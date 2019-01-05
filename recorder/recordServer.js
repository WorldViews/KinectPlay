
var Kinect2 = require('../../lib/kinect2'), //change to 'kinect2' in a project of your own
    express = require('express'),
    app = express(),
    recsApp = express();
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    Jimp = require('jimp'),
    zlib = require('zlib');

var kinect = new Kinect2();
var recording = false;
var viewing = true;
var bodyFrameNum = 0;
var colorFrameNum = 0;
var recSession = null;
var recDir = null;
var imageDir = null;
var poseDir = null;

// compression is used as a factor to resize the image
// the higher this number, the smaller the image
// make sure that the width and height (1920 x 1080) are dividable by this number
// also make sure the canvas size in the html matches the resized size
//var compression = 3;
var compression = 5;
var origWidth = 1920;
var origHeight = 1080;
var origLength = 4 * origWidth * origHeight;
var compressedWidth = origWidth / compression;
var compressedHeight = origHeight / compression;

function setCompression(c)
{
    compression = c;
    compressedWidth = origWidth / compression;
    compressedHeight = origHeight / compression;
}

function getClockTime()
{
    return new Date().getTime()/1000.0;
}

function verifyDir(dir)
{
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: "+err);
    }
}

function mkDir(dir)
{
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: "+err);
    }
}

function getNames(dirPath)
{
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, function(err, items) {
            if (err) {
                console.log("err: "+err);
                reject(err);
                return;
            }
            resolve(items);
        });
    });
}


function sendSessions0(dirPath, req, resp)
{
    var obj = {dir: dirPath, sessions:{}};
    console.log("sendSessions: dirPath: "+dirPath);
    fs.readdir(dirPath, function(err, items) {
        console.log("err: "+err);
        if (err) {
            obj.error = err;
            resp.send(obj);
            return;
        }
        //console.log(items);
        for (var i=0; i<items.length; i++) {
            console.log(items[i]);
            obj.sessions[items[i]] = items[i];
        }
        console.log("sendSessions obj: "+JSON.stringify(obj, null, 3));
        resp.send(obj);
    });
}

function sendSessions(dirPath, req, resp)
{
    console.log("sendSessions: dirPath: "+dirPath);
    getNames(dirPath).then((items) => {
        console.log("Names: "+items);
        var obj = {dir: dirPath, sessions:items};
        resp.send(obj);
    });
}


function getSession()
{
    var m = new Date();
    var session =
        m.getUTCFullYear() +"_"+
        (m.getUTCMonth()+1) +"_"+
        m.getUTCDate() + "__" +
        m.getUTCHours() + "_" +
        m.getUTCMinutes() + "_" +
        m.getUTCSeconds();
    recDir = "recordings/"+session;
    verifyDir("recordings");
    mkDir(recDir);
    imageDir = recDir;
    poseDir = recDir;
    return session;
}

function saveImage(path, data, width, height) {
    console.log("Saving (using jimp) image to "+path);
    var width = width || 1920;
    var height = height || 1080;
    var jimp = new Jimp(
        {data, width, height},
        (err, image) => {
            image.write(path, err => {
                if (err) throw err;
                else
                    console.log("Finished writing "+path);
            });
        }
    );
}


function saveJSON(path, obj)
{
    var json = JSON.stringify(obj, null, 4);
    console.log("saving JSON to "+path);
    fs.writeFile(path, json, (err) => {
        if (err) throw err;
        console.log("File saved");
    });
}

function sendStats(sock, eventType)
{
    //console.log("sendStats..."+eventType);
    obj = {bodyFrameNum, colorFrameNum, recording, viewing,
           eventType, recSession, compression};
    sock.emit('stats', obj);
}

//*******
//*** There seem to be two different ways a callback occurs.
//*** THis is one.   The other is the kinect.on('bodyFrame',...)
function myBodyFrameCallback(data, sock)
{
//    console.log("bodyFrame", data);
//    console.log("bodyFrame");
    bodyFrameNum++;
    //console.log("bodyFrame "+bodyFrameNum);
    if (recording) {
        var posePath = "bodyFrame"+bodyFrameNum+".json";
        posePath = poseDir +"/"+posePath;
        saveJSON(posePath, data);
    }
    sock.emit('bodyFrame', data);
    sendStats(sock, 'bodyFrame');
}

function myOpenBodyReader(kinect)
{
    console.log("myOpenBodyReader");
    kinect.openBodyReader();
    kinect.nativeKinect2.openBodyReader(data => myBodyFrameCallback(data, io.sockets));
}

function startRecording()
{
    console.log("Start Recording");
    if (recording) {
        console.log("already recording");
        return;
    }
    recSession = getSession();
    console.log("recSession: "+recSession);
    console.log("recDir: "+recDir);
    bodyFrameNum = 0;
    colorFrameNum = 0;
    recording = true;
}

function stopRecording()
{
    console.log("Stop Recording");
    recording = false;
}

function startViewing()
{
    console.log("Start Viewing");
    viewing = true;
}

function stopViewing()
{
    console.log("Stop Recording");
    viewing = false;
}

if(kinect.open()) {
        var port = 8002;
	server.listen(port);
        console.log('Server listening on port '+port);
        console.log('Point your browser to http://localhost:'+port);

	app.get('/', function(req, res) {
	    res.sendFile(__dirname + '/public/index.html');
	});

    	app.get('/record', function(req, res) {
	    res.sendFile(__dirname + '/public/record.html');
	});

    	app.get('/startRecording', function(req, res) {
            startRecording();
	    res.sendFile(__dirname + '/public/record.html');
	});

    	app.get('/stopRecording', function(req, res) {
            stopRecording();
	    res.sendFile(__dirname + '/public/record.html');
	});

    	app.get('/startViewing', function(req, res) {
            startViewing();
	    res.sendFile(__dirname + '/public/record.html');
	});

    	app.get('/stopViewing', function(req, res) {
            stopViewing();
	    res.sendFile(__dirname + '/public/record.html');
	});

        app.get('/sessions', function (req, resp) {
            console.log("/sessions path: "+req.path);
            var dirPath = req.path.slice("/dir/".length);
            dirPath =__dirname + "/recordings";
            getNames(dirPath).then((items) => {
                console.log("Names: "+items);
                var obj = {dir: dirPath, sessions:items};
                resp.send(obj);
            });
        });
    
	app.get('/color', function(req, res) {
		res.sendFile(__dirname + '/public/index.html');
	});
    
	app.get('/skel', function(req, res) {
		//res.sendFile(__dirname + '/public/index.html');
		res.sendFile(__dirname + '/public/skel.html');
	});

    	app.get('/stop', function(req, res) {
            stopRecording();
	    res.sendFile(__dirname + '/public/colorSkel.html');
	});

    	app.get('/colorSkel', function(req, res) {
		res.sendFile(__dirname + '/public/colorSkel.html');
	});

	app.use(express.static(__dirname + '/public'));
        recsApp.use(express.static(__dirname + '/recordings'));
        app.use('/recs', recsApp);

	kinect.on('bodyFrame', function(bodyFrame){
		//io.sockets.emit('bodyFrame', bodyFrame);
	});

	var resizedLength = 4 * compressedWidth * compressedHeight;
	//we will send a smaller image (1 / 10th size) over the network
	var resizedBuffer = new Buffer(resizedLength);
	var compressing = false;
	kinect.on('colorFrame', function(data){
		//compress the depth data using zlib
            colorFrameNum++;
            //console.log("colorFrame "+colorFrameNum);
            //var imagePath = "frames/image"+colorFrameNum+".png";
            //var imagePath = "frames/image"+colorFrameNum+".jpeg";
            var imagePath = imageDir+"/image"+colorFrameNum+".bmp";
            var hdPath = imageDir+"/imageHD"+colorFrameNum+".bmp";
	    if(!compressing) {
		compressing = true;
		//data is HD bitmap image, which is a bit too heavy to handle in our browser
		//only send every x pixels over to the browser
		var y2 = 0;
		for(var y = 0; y < origHeight; y+=compression) {
		    y2++;
		    var x2 = 0;
		    for(var x = 0; x < origWidth; x+=compression) {
			var i = 4 * (y * origWidth + x);
			var j = 4 * (y2 * compressedWidth + x2);
			resizedBuffer[j] = data[i];
			resizedBuffer[j+1] = data[i+1];
			resizedBuffer[j+2] = data[i+2];
			resizedBuffer[j+3] = data[i+3];
			x2++;
		    }
		}

                if (recording) {
                    saveImage(imagePath, resizedBuffer,
                              compressedWidth, compressedHeight);
                    //saveImage(hdPath, data, origWidth, origHeight);
                }
                if (viewing) {
		    zlib.deflate(resizedBuffer, function(err, result){
		        if(!err) {
			    var buffer = result.toString('base64');
			    io.sockets.sockets.forEach(function(socket){
                                //console.log("send colorFrame");
			        socket.volatile.emit('colorFrame', buffer);
                                sendStats(socket, 'colorFrame');
			    });
		        }
		        compressing = false;
		    });
                }
		compressing = false;
	    }
	});

	kinect.openColorReader();
//        kinect.openBodyReader();
        myOpenBodyReader(kinect);
}
