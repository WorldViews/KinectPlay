
var Kinect2 = require('../lib/kinect2'), //change to 'kinect2' in a project of your own
    express = require('express'),
    app = express(),
    recsApp = express(),
    handRecsApp = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    sharp = require('sharp');

var kinect = new Kinect2();
var recordingImages = false;
var recordingJSON = false;
var bodyFrameNum = 0;
var colorFrameNum = 0;
var numFramesSaved = 0;
var latestRequestTime = 0;
var latestSavedFile = null;
var noImagePath = "public/NoImage.jpg";
var recStartTime;
var recSession = null;
var recDir = null;
var imageDir = null;
var poseDir = null;
var deleteOldImages = true;
var savedFiles = [];
var numToKeep = 300; // about 10 seconds
var jsonRecs = [];
var mostRecentFrame = null;
var maxUnwatchedTime = 0;

// compression is used as a factor to resize the image
// the higher this number, the smaller the image
// make sure that the width and height (1920 x 1080) are dividable by this number
// also make sure the canvas size in the html matches the resized size
//var compression = 3;
var compression = 5;
var imageWidth = 1920;
var imageHeight = 1080;
var imageLength = 4 * imageWidth * imageHeight;


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


function loadSession(name, callback) {
    let session = {type: 'session', name: name};
    let sessionDir = __dirname+"/recordings/"+name;
    let sessionObjPath = sessionDir+"/session.json";
    let recObjPath = sessionDir+"/rec.json";
    if (fs.existsSync(sessionObjPath)) {
        // it is a session with a session object
        session.sessionObjPath = sessionObjPath;
        readJSON(sessionObjPath).then(obj => {
            callback(obj);
        });
        return;
    } else if (fs.existsSync(recObjPath)) {
        // it is a session with no session object, but with full recs.json
        session.recObjPath = recObjPath;
        readJSON(recObjPath).then(obj => {
            //console.log("Got Session rec: "+obj);
            console.log("numFrames "+obj.numFrames+" "+recObjPath);
            for (var key in obj) {
                if (key != "frames")
                    session[key] = obj[key];
            }
            session.numFrames = obj.numFrames;
            saveJSON(sessionObjPath, session); // cache for next time.
            callback(session);
        });
        //callback(session);
        return;
    }
    session.type = 'folder';
    callback(session);
}

function getSessions(dirPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirPath, function (err, names) {
            if (err) {
                console.log("err: " + err);
                reject(err);
                return;
            }
            var sessions = [];
            var n = names.length;
            names.forEach(name => {
                loadSession(name, session => {
                    console.log("loadSession got "+session+" "+n);
                    if (session)
                        sessions.push(session);
                    if (--n == 0) {
                        console.log("finished seeions: "+sessions);
                        resolve(sessions);
                    }
                });
            })
         });
    });
}

/*
function sendSessions(dirPath, req, resp) {
    console.log("sendSessions: dirPath: " + dirPath);
    getNames(dirPath).then((items) => {
        console.log("Names: " + items);
        var obj = { dir: dirPath, sessions: items };
        resp.send(obj);
    });
}
*/

function getSession(sessionId) {
    var m = new Date();
    if (!sessionId) {
        sessionId =
            m.getUTCFullYear() + "_" +
            (m.getUTCMonth() + 1) + "_" +
            m.getUTCDate() + "__" +
            m.getUTCHours() + "_" +
            m.getUTCMinutes() + "_" +
            m.getUTCSeconds();
    }
    recDir = "recordings/" + sessionId;
    verifyDir("recordings");
    verifyDir(recDir);
    imageDir = recDir;
    poseDir = recDir;
    return sessionId;
}

function saveImage(path, data, width, height) {
    //console.log("Saving (using sharp) image to "+path);
    var width = width || 1920;
    var height = height || 1080;
    var img = sharp(data, {raw: {width, height, channels:4}});
    img.toFile(path).then(() => {
        //console.log("Saved "+path);
        if (deleteOldImages &&  savedFiles.length >= numToKeep) {
            var fileToDelete = savedFiles.shift();
            fs.unlink(fileToDelete, () => {
                //console.log("deleted "+fileToDelete);
            });
        }
        latestSavedFile = path;
        if (deleteOldImages) {
            savedFiles.push(path);
            //console.log("savedFiles.length "+savedFiles.length);
        }
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

function readJSON(path) {
    console.log("readJSON "+path);
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                var obj = JSON.parse(data);
                resolve(obj);
            }
        })
    })
}

function sendStats(sock, eventType) {
    //console.log("sendStats..."+eventType);
    obj = {
        bodyFrameNum, colorFrameNum, recordingImages, recordingJSON,
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
    data.frameTime = getClockTime();
    data.bodyFrameNum = bodyFrameNum;
    data.frameNum = bodyFrameNum;
    mostRecentFrame = data;
    if (recordingJSON) {
        var posePath = "bodyFrame" + bodyFrameNum + ".json";
        posePath = poseDir + "/" + posePath;
        saveJSON(posePath, data);
        //jsonRecs.push(data);
    }
    sock.emit('bodyFrame', data);
    sendStats(sock, 'bodyFrame');
}

function myOpenBodyReader(kinect) {
    console.log("myOpenBodyReader");
    kinect.openBodyReader();
    kinect.nativeKinect2.openBodyReader(data => myBodyFrameCallback(data, io.sockets));
}

function startRecording(sessionId) {
    console.log("Start Recording "+sessionId);
    if (recordingImages) {
        console.log("already recording -- close and start new recording");
        stopRecording();
    }
    recSession = getSession(sessionId);
    recStartTime = getClockTime();
    numFramesSaved = 0;
    console.log("recSession: " + recSession);
    console.log("recDir: " + recDir);
    bodyFrameNum = 0;
    colorFrameNum = 0;
    jsonRecs = [];
    maxUnwatchedTime = -1;
    recordingImages = true;
    recordingJSON = true;
    lastRequestTime = getClockTime();
    deleteOldImages = false;
}

function stopRecording() {
    console.log("Stop Recording "+recSession);
    var t = getClockTime();
    var duration = t - recStartTime;
    var sessionObj = {
        name: recSession,
        type: 'kinect',
        numFrames: colorFrameNum,
        startTime: recStartTime,
        duration: t-recStartTime,
        frames: jsonRecs
    }
    var sessionPath = recDir + "/rec.json";
    saveJSON(sessionPath, sessionObj);
    recordingImages = false;
    recordingJSON = false;
}

function startViewing() {
    console.log("Start Viewing");
    deleteOldImages = true;
    if (!recordingImages) {
        startRecording("TEMP_VIEW");
        recordingJSON = false;
        deleteOldImages = true;
        maxUnwatchedTime = 3;
    }
}

function stopViewing() {
    console.log("Stop Recording");
    stopRecording();
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
        if (!recordingImages)
            startViewing();
        lastRequestTime = getClockTime();
        //console.log("requested /latestImage.jpg ... sending "+latestSavedFile);
        var path = latestSavedFile || noImagePath;
        res.sendFile(__dirname+ "/"+path);
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

    app.get('/getSessions', function (req, resp) {
        console.log("/getSessions path: " + req.path);
        var dirPath = req.path.slice("/dir/".length);
        dirPath = __dirname + "/recordings";
        getSessions(dirPath).then((sessions) => {
            //console.log("Sessions: " + sessions);
            var obj = { dir: dirPath, sessions: sessions };
            console.log("Sessions: ", obj);
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
        if (recordingImages) {
            var imagePath = imageDir + "/image" + colorFrameNum + ".jpg";
            var t = getClockTime();
            var rt = t - recStartTime;
            var fps = numFramesSaved / rt;
            saveImage(imagePath, data, imageWidth, imageHeight);
            if (mostRecentFrame) {
                mostRecentFrame.frameNum = colorFrameNum;
                jsonRecs.push(mostRecentFrame);
            }
            if (numFramesSaved % 100 == 0)
                console.log("Frames saved: " + numFramesSaved + " t: " + rt + " FPS: " + fps);
            var timeSinceRequest = t - lastRequestTime;
            if (maxUnwatchedTime > 0 && timeSinceRequest > maxUnwatchedTime) {
                stopRecording();
            }
        }
    });

    kinect.openColorReader();
    //kinect.openBodyReader();
    myOpenBodyReader(kinect);
}
