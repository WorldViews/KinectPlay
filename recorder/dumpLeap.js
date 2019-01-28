
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    WebSocket = require('ws'),
    fs = require('fs');


const ws = new WebSocket("ws://localhost:6437/v7.json");
ws.on('open', () => {
    console.log("**** open");
});

ws.on('message', data => {
    console.log("data: "+data);
    saveJSON("lastLeapFrame.json", JSON.parse(data));
});


function saveJSON(path, obj)
{
    var json = JSON.stringify(obj, null, 4);
    console.log("saving JSON to "+path);
    fs.writeFile(path, json, (err) => {
        if (err) throw err;
        //console.log("File saved");
    });
}

