
function loadSessions(handler)
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
//                click: () => player.setSession(session)
                click: () => handler(session)
            }).appendTo("#sessionList");
            $('<br>').appendTo("#sessionList");
        });
    }).fail(() => {
    });
}
