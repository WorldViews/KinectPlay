
var defaultRecId = "2019_01_17__15_17_07";
defaultRecId = null;
var player = null;
var viewer = null;
var kinClient = null;

/*
in the saved JSON file there are lists of joints.  It is saved
as vector of joint objects, but the index into the vector is not
the jointType.  This replaces those vectors with sparse vectors
where the index of each joint object is the jointType.
*/
function fixFrame(frame)
{
    frame.bodies.forEach(body => {
        jvec = [];
        body.joints.forEach(joint => {
            jvec[joint.jointType] = joint;
        });
        body.joints = jvec;
    });
    return frame;
}

function getJSON(url, handler, errFun)
{
    console.log("getJSON: "+url);
    $.ajax({
        url: url,
        dataType: 'text',
        success: function(str) {
            var data;
            try {
                data = JSON.parse(str);
            }
            catch (err) {
                console.log("err: "+err);
                alert("Error in json for: "+url+"\n"+err);
                errFun();
                return;
            }
            handler(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Failed to get JSON for "+url);
            errFun();
        }
    });
}

function loadSessions()
{
    var sessionsURL = "/sessions";
    console.log("loadSessions ****** "+sessionsURL);
    $.getJSON(sessionsURL).done((data, status) => {
        console.log("sess data: "+JSON.stringify(data,null,2));
        var sessions = data.sessions;
        sessions.forEach(session => {
            let sessItem = $('<a>', {
                text: session,
                href: "#",
                click: () => player.setSession(session)
            }).appendTo("#sessionList");
            $('<br>').appendTo("#sessionList");
        });
    }).fail(() => {
    });
}

function frameStats(frames)
{
    var prevT = null;
    var dtVec = [];
    for (var i=1; i<frames.length; i++) {
        var frame = frames[i];
        var t = frame.frameTime;
        if (prevT) {
            var dt = t - prevT;
            dtVec.push(dt);
        }
        prevT = t;
    }
    dtVec.sort((a,b) => { return a-b; });
    console.log("dtVec: ", dtVec);
    return dtVec;
}

class Controller {
    constructor(player) {
        this.player = player;
        player.setPlaySpeed(0);
        player.play();
        this.requestedTime = player.getPlayTime();
    }

    requestPlayTime(t) {
        this.requestedTime = t;
    }

    tick() {
        var w = .6;
        var p = this.player;
        var dt = this.requestedTime - p.getPlayTime();
        var speed = 3*dt;
        var s = w*speed + (1-w)*p.getPlaySpeed();
        p.setPlaySpeed(s);
       // p.setPlaySpeed(0.9*p.getPlaySpeed());
    }
}

class Player {
    constructor(recId) {
        this.setSession(recId);
        this.WT = 20;
        this.framesPerSec = 30.0;
        this.secondsBehind = 1;
        this.secondsAhead = 1;
        this.smoothNum = 7;
        this.Rx = 180;
        this.Ry = 0;
        this.Rz = 0;
        this.scale = 1.8;
        this.Tx = 642;
        this.Ty = 545;
        var inst = this;
        this.recsDir = "/recs/";
        this.currentImage = null;
        this.viewer = new Viewer(this);
        viewer = this.viewer; // put in global namespace for debugging
        this.pendingLoad = null;
        this.loadCollisions = 0; // times a new image is requested before old one loaded.
        var vj = {};
        vj[RHAND] = true;
        vj[LHAND] = true;
        this.viewer.kinectTracker.setVisibleJoints(vj);
        this.kinClient = null;
        this.useLiveTracker = false;
        this.showSkels = true;
        this.showLiveSkeletons = true;
        this.showRecordedSkeletons = true;
        this.showTrails = true;
        this.controlMode = "RightHand";
        this.playMode = "master";
        this.playSpeed = 1.0;
        this.playTime = 0;
        this.prevPlayTime = 0;
        this.prevClockTime = getClockTime();
        this.source = "remote";
        this.forceRedraw = false;

        //$("#useLiveTracker").click(() => { setUseTracker($("#useLiveTracker").is(':checked'); };
        $("#showTrails").click(() => { inst.showTrails = $("#showTrails").is(':checked')});
        $("#showSkels").click(() => {
            console.log("showSkels click");
            inst.showSkels = $("#showSkels").is(':checked');
            update();
        })
        setInterval(() => {inst.tick()}, 50);
    }

    setUseTracker(val)
    {
//        this.useLiveTracker = $("#useLiveTracker").is(':checked');
        this.useLiveTracker = val;
        let inst = this;
        console.log("useLiveTracker "+this.useLiveTracker);
        if (!this.kinClient) {
            console.log("Getting KinClient");
            this.kinClient = new KinClient();
        }
        if (this.useLiveTracker) {
            this.kinClient.poseWatcher = () => {
                inst.handlePose();
            };
        }
        else {
            this.kinClient.poseWatcher = null;
            this.liveBodyFrame = null;
        }    
    }

    handlePose() {
        //console.log("new pose");
        if (this.useLiveTracker && this.kinClient) {
            this.liveBodyFrame = this.kinClient.lastBodyFrame;
        }
        else {
            this.liveBodyFrame = null;           
        }
        this.redraw();
    }

    redraw() {
        this.viewer.resize()
        this.viewer.clearBackground(this.currentImage);
        this.viewer.draw(this.lastBodyFrame, this.lastHandFrame);
    }

    setSession(recId, stype, callback) {
        console.log("setSession "+recId+" "+stype);
        if (recId == null)
            return;
        if (stype == null) {
            stype = "body";
        }
        if (stype == "body")
            this.recsDir = "/recs/";
        else if (stype == "hand")
            this.recsDir = "/hand/recs/";
        else {
            alert("unrecognized session type "+stype);
        }
        this.recordingId = recId;
        $("#sessionName").html(recId+"...");
        $(document).attr('title', 'KVR '+recId);
        //this.frameType = "bmp";
        this.frameType = "jpg";
        this.frameNum = 0;
        this.numFrames = 0;
        this.duration = 0;
        this.prevFrameNum = 0;
        this.framesPerSec = 14.0;
        this.bodyFrames = [];
        this.handFrames = [];
        this.lastBodyFrame = null;
        this.lastHandFrame = null;
        this.loadIndex();
        this.playing = false;
        this.sessionCallback = callback;
    }

    seekIdx(idx) {
        if (idx <= 0)
            idx = 1;
        if (idx >= this.numFrames)
            idx = this.numFrames;
        this.frameNum = idx;
        this.prevFrame = null;
        this.playTime = this.getFrameTime(idx);   
        this.prevClockTime = getClockTime();
    }
    
    // This returns the time associated with a frame index.
    // However, this is a bit problematical, as frames are not
    // necessarily synchronous.
    getFrameTime(idx) {
        return idx / this.framesPerSec;
    }

    getFrameNum(t) {
        return Math.round(t*this.framesPerSec);
    }

    getCurrentIdx() {
        return this.frameNum;
    }

    getPlayTime() {
        return this.playTime;
        //return this.frameNum / this.framesPerSec;
    }
    
    setPlayTime(t) {
        this.frameNum = this.getFrameNum(t);
        this.playTime = t;
    }

    requestPlayTime(t) {
        console.log("requestPlayTime "+t);
        if (this.controller)
            this.controller.requestPlayTime(t);
        else
            this.setPlayTime(t);
    }

    getPlaySpeed() {
        return this.playSpeed;
    }

    setPlaySpeed(speed) {
        this.setPlayTime(this.getPlayTime()); // update hidden time bookeeping
        this.playSpeed = speed;
        $("#speed").html(sprintf("%.2f", player.playSpeed));
    }
    
    showTime() {
        if (this.numFrames == 0)
            return;
        //if (this.bodyFrames.length == 0)
        //    return;
        //var v = this.frameNum * 1000 / this.bodyFrames.length;
        var v = this.frameNum * 1000 / this.numFrames;
        $("#timeSlider").val(v);
        $("#time").html(sprintf("%.2f", this.getPlayTime()));
        $("#duration").html(sprintf("%.2f", this.duration));
    }

    loadIndex() {
        this.loading = true;
        this.bodyFrames = [];
        this.handFrames = [];
        //var url = "/recs/"+this.recordingId+"/rec.json";
        var url = this.recsDir+this.recordingId+"/rec.json";
        $("#stats").html("loading: "+url);
        var inst = this;
        getJSON(url,
               (data) => {
                   inst.handleIndex(data);
               },
                () => {
                    alert("Failed to load index "+url);
                }
               );
    }

    handleIndex(data)
    {
        this.numFrames = data.numFrames;
        this.duration = data.duration;
        this.sessionType = data.sessionType || "kinect";
        if (data.frames) {
            data.frames.forEach(frame => {
                frame = fixFrame(frame);
                this.bodyFrames[frame.frameNum] = frame;
            })
        }
        if (data.frameRecs) {
            var n = 1;
            data.frameRecs.forEach(rec => {
                this.handFrames[n] = rec;
                n++;
            })
        }
        this.loading = false;
        this.seekIdx(1);
        this.play();
        this.data = data;
        if (this.sessionCallback) {
            this.sessionCallback();
            this.sessionCallback = null;
        }
    }

    play() {
        this.playing = true;
        this.setPlayTime(this.getPlayTime());
    }

    pause() {
        this.playing = false;
    }

    setPlayMode(mode) {
        console.log("setPlayMode "+mode);
        if (mode == "shared")
            this.controller = new Controller(this);
        else
            this.controller = null;
    }

    setSource(source) {
        console.log("setSource "+source);
        this.source = source;
        this.forceRedraw = true;
    }

    tick() {
        //console.log("tick...");
        if (this.loading)
            return;
        if (this.recordingId == null)
            return;
        if (this.frameNum >= this.numFrames) {
            this.playing = false;
        }
        if (this.controller)
            this.controller.tick();
        var t = getClockTime();
        var dt = t - this.prevClockTime;
        this.prevClockTime = t;
        if (this.playing) {
            this.setPlayTime(this.playTime + dt*this.playSpeed);
        }
        if ((this.frameNum != this.prevFrameNum) || this.source == "local" || this.forceRedraw) {
            var url = this.recsDir+this.recordingId+"/image"+
                           this.frameNum+"."+this.frameType;
            if (this.source == "local")
                url = "/latestImage.jpg?t_="+t;
            $("#stats").html("url: "+url);
            if (this.pendingLoad) {
                console.log("load collision");
                this.loadCollisions++;
            }
            else {
                this.forceRedraw = false;
                this.newImage = new Image();
                this.pendingLoad = true;
                this.newImage.src = url;
                this.newImage.addEventListener('load', () => {
                    //console.log("newImage loaded");
                    this.currentImage = this.newImage;
                    this.pendingLoad = false;
                    this.redraw();
                });
                this.newImage.addEventListener('error', () => {
                    //console.log("newImage loaded");
                    //this.currentImage = this.newImage;
                    this.pendingLoad = false;
                    console.log("***************** Image Load Error *******");
                });
            }
            this.prevFrameNum = this.frameNum;
        }
        var frame = this.bodyFrames[this.frameNum];
        if (frame) {
            this.lastBodyFrame = frame;
        }
        if (this.handFrames) {
            this.lastHandFrame = this.handFrames[this.frameNum];
        }
        this.showTime();
    }
}


function update()
{
    console.log("update");
    if (viewer.leapTracker) {
        var p = player;
        viewer.leapTracker.setProps({
            euler: [p.Rx, p.Ry, p.Rz],
            translation: [p.Tx, p.Ty],
            scale: p.scale});
    }
    player.redraw();
    player.setPlaySpeed(player.playSpeed);
}

function updateControls()
{
    player.setUseTracker(player.controlMode != "Off");
    player.viewer.resetControls();
    update();
}

$(document).ready(()=> {
    console.log("************READY**********");
    var recId = getParameterByName("recId");
    if (!recId)
        recId = defaultRecId;
    player = new Player();
    player.setSession(recId, null, () => {
        console.log("************************");
        var t0 = getFloatParameterByName("playTime");
        if (t0 != null) {
            console.log("set initial playTime "+t0);
            player.setPlayTime(t0);
        }
        var speed = getFloatParameterByName("playSpeed");
        if (speed != null) {
            console.log("set initial playSpeed "+speed);
            player.setPlaySpeed(speed);
        }
        if (getParameterByName("paused")) {
            player.pause();
        }
    });

    $("#resetButton").click(() => { player.seekIdx(1); });
    $("#playButton").click(() => { player.play(); });
    $("#pauseButton").click(() => { player.pause(); });
    $("#timeSlider").on('input', () => {
        var val = $("#timeSlider").val();
        // console.log("slider: "+val);
        var rt = val/1000.0;
        var i = Math.round(rt*player.numFrames);
        var t = player.getFrameTime(i);
        //player.seekIdx(i);
        player.requestPlayTime(t);
    });
    $("#controlMode").click(() => {
        var mode = $("#controlMode").val();
        player.controlMode = mode;
        console.log("mode: "+mode);
        updateControls();
     })
     $("#videoSource").click(() => {
        var source = $("#videoSource").val();
        player.setSource(source);
        console.log("source: "+player.source);
     })
    //loadSessions();
    $(window).resize(e => {
        //console.log("window.resize");
        player.redraw();
    });

    var gui = new dat.GUI();
    gui.add(player, 'WT', 0, 100).onChange(update);
    gui.add(player, 'secondsBehind', 0, 5).onChange(update);
    gui.add(player, 'secondsAhead',  0, 5).onChange(update);
    gui.add(player, 'smoothNum',  [0,1,2,3,4,5,6,7,8,9,10]).onChange(update);
    gui.add(player, "playSpeed", -2, 4).onChange(update);
    gui.add(player, "playMode", ["master", "shared"]).onChange(() => {
        player.setPlayMode(player.playMode);
        update();
    });
    var lg = gui.addFolder("Leap");
    lg.add(player, 'Rx', 0, 360).onChange(update);
    lg.add(player, 'Ry', 0, 360).onChange(update);
    lg.add(player, 'Rz', 0, 360).onChange(update);
    lg.add(player, 'Tx', 0, 1000).onChange(update);
    lg.add(player, 'Ty', 0, 1000).onChange(update);
    lg.add(player, 'scale', 0.5, 2.5).onChange(update);
    lg.close();
    var kg = gui.addFolder("Kinect");
    kg.add(player, "showSkels").onChange(update);
//    kg.add(player, "controlMode", ["LeftHand", "RightHand", "BothHands"]).onChange(updateControls);
    kg.close();
    gui.close();
    player.gui = gui;
})
