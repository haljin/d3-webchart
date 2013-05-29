var DataProcessor;

DataProcessor = (function () {

    DataProcessor = function () {

    };

    DataProcessor.prototype.gen_timeline_date = function (btData, smsData, callData) {
        var result = [];

        btData.forEach(function (d) {
            d.devices.forEach(function (x) {
                if (result.length != 0 &&
                    (new Date(d.timestamp * 1000)).getDay() == result[result.length - 1].date.getDay()) {
                    result[result.length - 1].btcount += 1;
                }
                else {
                    result.push({ date: new Date(d.timestamp * 1000), btcount: 1, callcount: 0, smscount: 0 });
                }
            });
        });
        callData.forEach(function (d) {
            var added = false;
            result.forEach(function (e) {
                if ((new Date(d.timestamp * 1000)).getDay() == e.date.getDay()) {
                    e.callcount += 1;
                    added = true;
                }
            });
            if (added == false)
                result.push({ date: new Date(d.timestamp * 1000), btcount: 0, callcount: 1, smscount: 0 });

        });
        smsData.forEach(function (d) {
            var added = false;
            result.forEach(function (e) {
                if ((new Date(d.timestamp * 1000)).getDay() == e.date.getDay()) {
                    e.smscount += 1;
                    added = true;
                }
            });
            if (added == false)
                result.push({ date: new Date(d.timestamp * 1000), btcount: 0, callcount: 0, smscount: 1 });

        });

        result.sort(function (a, b) {
            return a.date - b.date;
        });
        return result;
    };

    return DataProcessor;
})();