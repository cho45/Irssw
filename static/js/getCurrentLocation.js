function getCurrentLocationMapLink (callback) {
    getCurrentLocation(function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        var q   = lat + ',+' + lon;
        var uri = 'http://maps.google.co.jp/maps?q=' + q + '&iwloc=A&hl=ja';
        callback(uri);
    });
}

function getCurrentLocation (callback) {
    var geo = navigator.geolocation || google.gears.factory.create('beta.geolocation');
    var dialog = createElementFromString(
        ['<div class="overlay">',
            '<div class="content">',
                '<span class="message">GPS Fixing...</span><input type="button" value="Cancel" class="cancel"/>',
             '</div>',
         '</div>'].join(''), {
            parent: document.body
        }
    );

    dialog.setAttribute('style', 'color: #fff; background: #000; opacity: 0.9; position: absolute; top: 0; left: 0;');
    dialog.style.height = Math.max(document.documentElement.scrollHeight, window.innerHeight) + 'px';
    dialog.style.width  = Math.max(document.documentElement.scrollWidth, window.innerWidth)  + 'px';

    dialog.content.setAttribute('style', 'position: absolute; text-align: center; vertical-align: 50%; width: 100%;');
    dialog.content.style.lineHeight = (window.innerHeight) + 'px';
    dialog.content.style.top        = (window.pageYOffset) + 'px';

    document.body.style.overflow = 'hidden';

    var timeout, id, lastPos;
    var finish = function () {
        geo.clearWatch(id);
        clearTimeout(timeout);
        callback(lastPos);
        dialog.parentNode.removeChild(dialog);
    };

    timeout = setTimeout(function () { finish() }, 30 * 1000);

    id = geo.watchPosition(
        function (pos) {
            lastPos = pos;
            if (pos.coords.accuracy < 500) { // 500meters
                finish();
            }
        },
        function (e) {
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0
        }
    );

    dialog.cancel.addEventListener('click', function (e) {
        document.body.style.overflow = 'visible';
        geo.clearWatch(id);
        dialog.parentNode.removeChild(dialog);
    }, false);

    dialog.cancel.focus();
}
