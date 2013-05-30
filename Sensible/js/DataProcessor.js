var DataProcessor;

DataProcessor = (function () {
    function DataProcessor() {

    };

    DataProcessor.prototype.parse_loc_date = function (data) {


    };

    DataProcessor.prototype.generate_loc_data = function (btData, smsData, callData, locData) {
        var results = { data: [] };

        callData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;
            
            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = locData[i];
                }
                else
                    break;
            };

            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "call" });
        });

        smsData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;

            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = locData[i];
                }
                else
                    break;
            };

            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "sms" });
        });
       
        btData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;

            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = locData[i];
                }
                else
                    break;
            };

            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "bt" });
        });

        return results;
    };

    return DataProcessor;
})();