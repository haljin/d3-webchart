var DataProcessor;

DataProcessor = (function () {
    function DataProcessor() {

    };


    DataProcessor.prototype.generate_loc_data = function (btData, smsData, callData, locData) {
        var results = [];

        callData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;
            
            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = x;
                }
                else
                    break;
            };

            results.push({ lon: closest.location.longtitude, lat: closest.location.latitude, type: "call" });
        });

        smsData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;

            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = x;
                }
                else
                    break;
            };

            results.push({ lon: closest.location.longtitude, lat: closest.location.latitude, type: "sms" });
        });

        btData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;

            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = x;
                }
                else
                    break;
            };

            results.push({ lon: closest.location.longtitude, lat: closest.location.latitude, type: "bt" });
        });




    };

    return DataProcessor;
})();