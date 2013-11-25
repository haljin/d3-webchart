var DataProcessor;

DataProcessor = (function () {

    DataProcessor = function () {

    };

    DataProcessor.parse_totals_data = function (cdata, sdata, bdata) {
        var maxes = [0, 0, 0];
        var binData = function (timestamp, type) {
            var date = new Date(timestamp * 1000);
            bins[type][date.getDay()].slots[DataProcessor.get_timeslot(timestamp)].count += 1;
            if (bins[type][date.getDay()].slots[DataProcessor.get_timeslot(timestamp)].count > maxes[type])
                maxes[type] += 1;
        };
        var genTables = function () {
            var gen = [];
            for (var i = 0; i < 3; i++) {
                gen.push([{ day: "Sun", slots: [] }, { day: "Mon", slots: [] },
                    { day: "Tue", slots: [] }, { day: "Wed", slots: [] },
                    { day: "Thu", slots: [] }, { day: "Fri", slots: [] },
                    { day: "Sat", slots: [] }]);
                for (var j = 0; j < 7; j++) {
                    gen[i][j].slots = ([{ time: "00:00-08:00", count: 0 },
                        { time: "08:00-12:00", count: 0 },
                        { time: "12:00-13:00", count: 0 },
                        { time: "13:00-17:00", count: 0 },
                        { time: "17:00-00:00", count: 0 }
                    ]);
                }
            }
            return gen;
        }
        var results = [[], [], []];
        var bins = genTables();


        for (var i = 0; i < cdata.length; i++) {
            var found = false;
            var newDate = new Date(cdata[i].timestamp * 1000);
            newDate.setHours(0, 0, 0, 0);
            var lastElem = results[0][results[0].length - 1];
            binData(cdata[i].timestamp, 0);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[0].push({ date: newDate, count: 1 });

        };

        for (var i = 0; i < sdata.length; i++) {

            var found = false;
            var newDate = new Date(sdata[i].timestamp * 1000);
            newDate.setHours(0, 0, 0, 0);
            var lastElem = results[1][results[1].length - 1];
            binData(sdata[i].timestamp, 1);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[1].push({ date: newDate, count: 1 });

        };

        for (var i = 0; i < bdata.length; i++) {
            var found = false;
            var newDate = new Date(bdata[i].timestamp * 1000);
            newDate.setHours(0, 0, 0, 0);
            var lastElem = results[2][results[2].length - 1];
            binData(bdata[i].timestamp, 2);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[2].push({ date: newDate, count: 1 });

        };

        for (var i = 0; i < 3; i++) {
            bins[i].forEach(function (day) {
                day.slots.forEach(function (slot) {
                    if (maxes[i] != 0) slot.count /= maxes[i];
                });
            });
        }

        return { totals: results, bins: bins };

    };

    DataProcessor.parse_nb_data = function (curr, neighbours, start, end) {
        var nbs = []
        var result = {}
        for (var i = 0; i < neighbours.length; i++) {
            if (neighbours[i].name != curr.name) {
                result[neighbours[i].name] = 0;
            }
        }

        for (var nbname in result) {
            var it = 0;
            while (curr.nbData[nbname] && it < curr.nbData[nbname].length && curr.nbData[nbname][it] < end) {
                if(curr.nbData[nbname][it] > start)
                    result[nbname] += 1;
                it++;
            }
        }
        return result;
    };

    DataProcessor.parse_timeline_data = function (data) {

        var result = [[], [], []];
        //maxc = maxs = maxb = 1;

        for (var i = 0; i < data.length; i++) {
            var theDate = new Date(data[i].date);
            theDate.setHours(0, 0, 0, 0);
            result[0].push({ date: theDate, x: i, y: data[i].callcount});
            result[1].push({ date: theDate, x: i, y: data[i].smscount});
            result[2].push({ date: theDate, x: i, y: data[i].btcount});
        }

        return result;
    };


    DataProcessor.get_timeslot = function (timestamp) {
        var date = new Date(timestamp*1000);
        if (date.getHours() < 8)
            return DAYSLOT.MORNING;
        else if (date.getHours() >= 8 && date.getHours() < 12)
            return DAYSLOT.EARLYCLASS;
        else if (date.getHours() >= 12 && date.getHours() < 13)
            return DAYSLOT.LUNCH;
        else if (date.getHours() >= 13 && date.getHours() < 17)
            return DAYSLOT.LATECLASS;
        else
            return DAYSLOT.AFTER;
    };

    DataProcessor.gen_collective_data = function (btData, smsData, callData) {
        var result = [];

        btData.forEach(function (d) {
            var theDate = new Date(d.timestamp * 1000);
            d.devices.forEach(function (x) {                
                if (result.length != 0 &&
                    theDate.getDate() == result[result.length - 1].date.getDate() &&
                    theDate.getMonth() == result[result.length - 1].date.getMonth() &&  
                    theDate.getYear() == result[result.length - 1].date.getYear()) {
                    result[result.length - 1].btcount += 1;
                }
                else {
                    result.push({ date: new Date(d.timestamp * 1000), btcount: 1, callcount: 0, smscount: 0 });
                }
            });
        });
        callData.forEach(function (d) {
            var added = false;
            var theDate = new Date(d.timestamp * 1000);
            result.forEach(function (e) {                
                if (
                    theDate.getDate() == e.date.getDate() &&
                    theDate.getMonth() == e.date.getMonth() &&  
                    theDate.getYear() == e.date.getYear()) {
                    e.callcount += 1;
                    added = true;
                }
            });
            if (added == false)
                result.push({ date: new Date(d.timestamp * 1000), btcount: 0, callcount: 1, smscount: 0 });

        });
        smsData.forEach(function (d) {
            var added = false;
            var theDate = new Date(d.timestamp * 1000);
            result.forEach(function (e) {                
                if (
                    theDate.getDate() == e.date.getDate() &&
                    theDate.getMonth() == e.date.getMonth() &&  
                    theDate.getYear() == e.date.getYear()) {
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