
var defaultRecId = "2019_01_17__15_17_07";
defaultRecId = null;
var player = null;
var kinClient = null;
var handDrawer = null;

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

class Player {
    constructor(recId) {
        this.setSession(recId);
        this.WT = 20;
        this.framesPerSec = 30.0;
        this.secondsBehind = 1;
        this.secondsAhead = 1;
        this.smoothNum = 1;
        this.Rx = 180;
        this.Ry = 0;
        this.Rz = 0;
        this.scale = 1.8;
        this.Tx = 642;
        this.Ty = 545;
        var inst = this;
        this.recsDir = "/recs/";
        this.currentImage = null;
        this.bodyDrawer = new Viewer(this);
        this.pendingLoad = null;
        this.loadCollisions = 0; // times a new image is requested before old one loaded.
        var vj = {};
        vj[RHAND] = true;
        vj[LHAND] = true;
        this.bodyDrawer.bodyGraphic.setVisibleJoints(vj);
        this.kinClient = null;
        this.runTracker = false;
        $("#runTracker").click(() => {
            this.runTracker = $("#runTracker").is(':checked');
            console.log("runTracker click "+this.runTracker);
            if (!this.kinClient) {
                console.log("Getting KinClient");
                this.kinClient = new KinClient();
            }
            if (this.runTracker) {
                this.kinClient.poseWatcher = () => {
                    //inst.redraw();
                    inst.handlePose();
                };
            }
            else {
                this.kinClient.poseWatcher = null;
            }
        });
        setInterval(() => {inst.tick()}, 50);
    }

    handlePose() {
        //console.log("new pose");
        if (this.runTracker && this.kinClient) {
            this.bodyDrawer.handleLive(this.kinClient.lastBodyFrame);
        }
    }

    redraw() {
        this.bodyDrawer.resize()
        this.bodyDrawer.clearBackground(this.currentImage);
        this.bodyDrawer.draw(this.lastBodyFrame);
        if (this.lastHandFrame) {
            var canvas = this.bodyDrawer.canvas;
            if (handDrawer == null) {
                handDrawer = new HandGraphic(canvas);
                handDrawer.setEuler([this.Rx, this.Ry, this.Rz]);
                handDrawer.setTranslation([this.Tx, this.Ty]);
                handDrawer.setScale(this.scale);
            }
            handDrawer.draw(this.lastHandFrame, false);
        }
    }

    setSession(recId, stype) {
        console.log("setSession "+recId+" "+stype);
        if (recId == null)
            return;
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
        this.prevFrameNum = 0;
        this.framesPerSec = 30.0;
        this.bodyFrames = [];
        this.handFrames = [];
        this.lastBodyFrame = null;
        this.lastHandFrame = null;
        this.loadIndex();
        this.playing = false;
    }

    seekIdx_(idx) {
        if (idx <= 0)
            idx = 1;
        if (idx >= this.numFrames)
            idx = this.numFrames;
        this.frameNum = idx;
        this.prevFrame = null;
    }
    
    seekIdx(idx) {
        this.seekIdx_(idx);
    }

    getCurrentIdx() {
        return this.frameNum;
    }

    getCurrentTime() {
        return this.frameNum / this.framesPerSec;
    }
    
    showTime() {
        if (this.numFrames == 0)
            return;
        //if (this.bodyFrames.length == 0)
        //    return;
        //var v = this.frameNum * 1000 / this.bodyFrames.length;
        var v = this.frameNum * 1000 / this.numFrames;
        $("#timeSlider").val(v);
        $("#time").html(sprintf("%.2f", this.getCurrentTime()));
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
    }

    loadIndex_() {
        this.frameNum++;
        var url = this.recsDir+this.recordingId+"/bodyFrame"+
            this.frameNum+".json";
        $("#stats").html("loading: "+url);
        var inst = this;
        getJSON(url,
               (data) => {
                   //console.log("status: "+this.frameNum+" "+status);
                   this.numFrames = this.frameNum;
                   this.bodyFrames[this.frameNum] = data;
                   inst.loadIndex_();
               },
                () => {
                    console.log("failed ... finished loading index");
                    this.loading = false;
                    this.seekIdx(1);
                    this.play();
                    $("#sessionName").html(this.recordingId);
                }
               );
    }

    play() {
        this.playing = true;
    }

    pause() {
        this.playing = false;
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
        if (this.playing) {
            this.frameNum++;
        }
        if (this.frameNum != this.prevFrameNum) {
            var url = this.recsDir+this.recordingId+"/image"+
                           this.frameNum+"."+this.frameType;
            $("#stats").html("url: "+url);
            if (this.pendingLoad) {
                console.log("load collision");
                this.loadCollisions++;
            }
            else {
                this.newImage = new Image();
                this.pendingLoad = true;
                this.newImage.src = url;
                this.newImage.addEventListener('load', () => {
                    //console.log("newImage loaded");
                    this.currentImage = this.newImage;
                    this.pendingLoad = false;
                    this.redraw();
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
    if (handDrawer) {
        var p = player;
        handDrawer.setProps({
            euler: [p.Rx, p.Ry, p.Rz],
            translation: [p.Tx, p.Ty],
            scale: p.scale});
        //handDrawer.setEuler([p.Rx, p.Ry, p.Rz]);
        //handDrawer.setTranslation([p.Tx, p.Ty]);
        //handDrawer.setScale([p.scale]);
    }
    player.redraw();
}

$(document).ready(()=> {
    console.log("************READY**********");
    var recId = getParameterByName("recId");
    if (!recId)
        recId = defaultRecId;
    player = new Player(recId);
    $("#resetButton").click(() => { player.seekIdx(1); });
    $("#playButton").click(() => { player.play(); });
    $("#pauseButton").click(() => { player.pause(); });
    $("#timeSlider").on('input', () => {
        var val = $("#timeSlider").val();
        // console.log("slider: "+val);
        var rt = val/1000.0;
        var i = Math.round(rt*player.numFrames);
        player.seekIdx(i);
    });
    //loadSessions();
    $(window).resize(e => {
        //console.log("window.resize");
        player.redraw();
    });

    var gui = new dat.GUI();
    gui.add(player, 'WT', 0, 100).onChange(update);
    gui.add(player, 'secondsBehind', 0, 5).onChange(update);
    gui.add(player, 'secondsAhead',  0, 5).onChange(update);
    gui.add(player, 'smoothNum',  [0,1,2,3,4,5,6,7]).onChange(update);
    var lg = gui.addFolder("Leap");
    lg.add(player, 'Rx', 0, 360).onChange(update);
    lg.add(player, 'Ry', 0, 360).onChange(update);
    lg.add(player, 'Rz', 0, 360).onChange(update);
    lg.add(player, 'Tx', 0, 1000).onChange(update);
    lg.add(player, 'Ty', 0, 1000).onChange(update);
    lg.add(player, 'scale', 0.5, 2.5).onChange(update);
    lg.close()
    gui.close();
    player.gui = gui;
})
