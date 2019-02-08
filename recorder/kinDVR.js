
var Kinect2 = require('../lib/kinect2'), //change to 'kinect2' in a project of your own
    express = require('express'),
    app = express(),
    recsApp = express(),
    handRecsApp = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    sharp = require('sharp');
//    Jimp = require('jimp'),
//    zlib = require('zlib');

var kinect = new Kinect2();
var recording = false;
var viewing = true;
var bodyFrameNum = 0;
var colorFrameNum = 0;
var numFramesSaved = 0;
var latestSavedFile = null;
var noFilePath = "public/NoImage.jpg";
var recStartTime;
var recSession = null;
var recDir = null;
var imageDir = null;
var poseDir = null;
var deleteOldImages = true;

// compression is used as a factor to resize the image
// the higher this number, the smaller the image
// make sure that the width and height (1920 x 1080) are dividable by this number
// also make sure the canvas size in the html matches the resized size
//var compression = 3;
var compression = 5;
var origWidth = 1920;
var origHeight = 1080;
var origLength = 4 * origWidth * origHeight;


function getClockTime() {
    return new Date().getTime() / 1000.0;
}

function verifyDir(dir) {
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: " + err);
    }
}

function mkDir(dir) {
    try {
        fs.mkdirSync(dir)
    }
    catch (err) {
        console.log("err: " + err);
    }
}

function getNames(dirPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, function (err, items) {
            if (err) {
                console.log("err: " + err);
                reject(err);
                return;
            }
            resolve(items);
        });
    });
}


function sendSessions(dirPath, req, resp) {
    console.log("sendSessions: dirPath: " + dirPath);
    getNames(dirPath).then((items) => {
        console.log("Names: " + items);
        var obj = { dir: dirPath, sessions: items };
        resp.send(obj);
    });
}


function getSession() {
    var m = new Date();
    var session =
        m.getUTCFullYear() + "_" +
        (m.getUTCMonth() + 1) + "_" +
        m.getUTCDate() + "__" +
        m.getUTCHours() + "_" +
        m.getUTCMinutes() + "_" +
        m.getUTCSeconds();
    recDir = "recordings/" + session;
    verifyDir("recordings");
    mkDir(recDir);
    imageDir = recDir;
    poseDir = recDir;
    return session;
}

function saveImage(path, data, width, height) {
    //console.log("Saving (using sharp) image to "+path);
    var width = width || 1920;
    var height = height || 1080;
    var img = sharp(data, {raw: {width, height, channels:4}});
    img.toFile(path).then(() => {
        console.log("Saved "+path);
        if (deleteOldImages && latestSavedFile != null) {
            fs.unlink(latestSavedFile, () => {
                console.log("deleted "+latestSavedFile);
            });
        }
        latestSavedFile = path;
        numFramesSaved++;
    });
}


function saveJSON(path, obj) {
    var json = JSON.stringify(obj, null, 4);
    //console.log("saving JSON to " + path);
    fs.writeFile(path, json, (err) => {
        if (err) throw err;
        //console.log("Saved file "+path);
    });
}

function sendStats(sock, eventType) {
    //console.log("sendStats..."+eventType);
    obj = {
        bodyFrameNum, colorFrameNum, recording, viewing,
        eventType, recSession, compression
    };
    sock.emit('stats', obj);
}

//*******
//*** There seem to be two different ways a callback occurs.
//*** This is one.   The other is the kinect.on('bodyFrame',...)
function myBodyFrameCallback(data, sock) {
    //    console.log("bodyFrame", data);
    //    console.log("bodyFrame");
    bodyFrameNum++;
    //console.log("bodyFrame "+bodyFrameNum);
    if (recording) {
        var posePath = "bodyFrame" + bodyFrameNum + ".json";
        posePath = poseDir + "/" + posePath;
        saveJSON(posePath, data);
    }
    sock.emit('bodyFrame', data);
    sendStats(sock, 'bodyFrame');
}

function myOpenBodyReader(kinect) {
    console.log("myOpenBodyReader");
    kinect.openBodyReader();
    kinect.nativeKinect2.openBodyReader(data => myBodyFrameCallback(data, io.sockets));
}

function startRecording() {
    console.log("Start Recording");
    if (recording) {
        console.log("already recording");
        return;
    }
    recSession = getSession();
    recStartTime = getClockTime();
    numFramesSaved = 0;
    console.log("recSession: " + recSession);
    console.log("recDir: " + recDir);
    bodyFrameNum = 0;
    colorFrameNum = 0;
    recording = true;
}

function stopRecording() {
    console.log("Stop Recording");
    recording = false;
}

function startViewing() {
    console.log("Start Viewing");
    viewing = true;
}

function stopViewing() {
    console.log("Stop Recording");
    viewing = false;
}

if (kinect.open()) {
    var port = 8002;
    server.listen(port);
    console.log('Server listening on port ' + port);
    console.log('Point your browser to http://localhost:' + port);

    app.get('/', function (req, res) {
        res.sendFile(__dirname + '/public/index.html');
    });

    app.get('/latestImage.jpg', function (req, res) {
        //res.sendFile(__dirname + '/public/record.html');
        console.log("requested /latestImage.jpg ... sending "+latestSavedFile);
        res.sendFile(__dirname+ "/"+latestSavedFile);
    });

    app.get('/record', function (req, res) {
        res.sendFile(__dirname + '/public/record.html');
    });

    app.get('/startRecording', function (req, res) {
        startRecording();
        res.sendFile(__dirname + '/public/record.html');
    });

    app.get('/stopRecording', function (req, res) {
        stopRecording();
        res.sendFile(__dirname + '/public/record.html');
    });

    app.get('/startViewing', function (req, res) {
        startViewing();
        res.sendFile(__dirname + '/public/record.html');
    });

    app.get('/stopViewing', function (req, res) {
        stopViewing();
        res.sendFile(__dirname + '/public/record.html');
    });

    app.get('/sessions', function (req, resp) {
        console.log("/sessions path: " + req.path);
        var dirPath = req.path.slice("/dir/".length);
        dirPath = __dirname + "/recordings";
        getNames(dirPath).then((items) => {
            console.log("Names: " + items);
            var obj = { dir: dirPath, sessions: items };
            resp.send(obj);
        });
    });

    app.get('/handSessions', function (req, resp) {
        console.log("/sessions path: " + req.path);
        var dirPath = req.path.slice("/dir/".length);
        dirPath = __dirname + "/leapRecordings";
        getNames(dirPath).then((items) => {
            console.log("Names: " + items);
            var obj = { dir: dirPath, sessions: items };
            resp.send(obj);
        });
    });

    app.get('/color', function (req, res) {
        res.sendFile(__dirname + '/public/index.html');
    });

    app.get('/skel', function (req, res) {
        //res.sendFile(__dirname + '/public/index.html');
        res.sendFile(__dirname + '/public/skel.html');
    });

    app.get('/stop', function (req, res) {
        stopRecording();
        res.sendFile(__dirname + '/public/colorSkel.html');
    });

    app.get('/colorSkel', function (req, res) {
        res.sendFile(__dirname + '/public/colorSkel.html');
    });

    app.use(express.static(__dirname + '/public'));
    recsApp.use(express.static(__dirname + '/recordings'));
    handRecsApp.use(express.static(__dirname + '/leapRecordings'));
    app.use('/recs', recsApp);
    app.use('/hand/recs', handRecsApp);

    kinect.on('bodyFrame', function (bodyFrame) {
        //io.sockets.emit('bodyFrame', bodyFrame);
    });

    kinect.on('colorFrame', function (data) {
        colorFrameNum++;
        //console.log("colorFrame "+colorFrameNum);
        if (recording) {
            var imagePath = imageDir + "/image" + colorFrameNum + ".jpg";
            if (recording) {
                var t = getClockTime();
                var rt = t - recStartTime;
                var fps = numFramesSaved / rt;
                saveImage(imagePath, data, origWidth, origHeight);
                console.log("Frames saved: " + numFramesSaved + " t: " + rt + " FPS: " + fps);
            }
        }
    });

    kinect.openColorReader();
    //        kinect.openBodyReader();
    myOpenBodyReader(kinect);
}
