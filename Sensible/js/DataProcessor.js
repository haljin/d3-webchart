var DataProcessor;

DataProcessor = (function () {

    DataProcessor = function () {

    };


    DataProcessor.prototype.gen_timeline_data = function (data) {

        var result = [[], [], []];
       

        data.data.forEach(function (d, i) {
            result[0].push({ date: new Date(d.date), x: i, y: d.btcount, y0: 0 });
            result[1].push({ date: new Date(d.date), x: i, y: d.callcount, y0: d.btcount });
            result[2].push({ date: new Date(d.date), x: i, y: d.smscount, y0: d.callcount + d.btcount });
        });

        return result;
    };

    DataProcessor.prototype.parse_collective_data = function (btData, smsData, callData) {
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
        return window.open("data:text/json;charset=utf-8," + escape(JSON.stringify({ data: result }, null, 2)));
    };

    return DataProcessor;
})();