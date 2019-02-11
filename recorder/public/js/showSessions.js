
function loadSessions(handler, url)
{
    var sessionsURL = url || "/sessions";
    console.log("loadSessions ****** "+sessionsURL);
    $.getJSON(sessionsURL).done((data, status) => {
        console.log("sess data: "+JSON.stringify(data,null,2));
        var sessions = data.sessions;
        sessions.forEach(session => {
            let sessItem = $('<a>', {
                text: session,
                href: "#",
//                click: () => player.setSession(session)
                click: () => handler(session)
            }).appendTo("#sessionList");
            $('<br>').appendTo("#sessionList");
        });
    }).fail(() => {
    });
}

function loadSessionsNew(handler, url)
{
    var sessionsURL = url || "/getSessions";
    console.log("loadSessions ****** "+sessionsURL);
    $.getJSON(sessionsURL).done((data, status) => {
        console.log("sess data: "+JSON.stringify(data,null,2));
        var sessions = data.sessions;
        sessions.forEach(session => {
            if (session.type == "folder")
                return;
            let sessItem = $('<a>', {
                text: session.name,
                href: "#",
//                click: () => player.setSession(session)
                click: () => handler(session)
            }).appendTo("#sessionList");
            $("#sessionList").append(sprintf("dur: %.1f <br>", session.duration));
//            $('<br>').appendTo("#sessionList");
        });
    }).fail(() => {
    });
}
