var DataProcessor;

DataProcessor = (function () {

    DataProcessor = function () {

    };

    DataProcessor.parse_totals_data = function (cdata, sdata, bdata, start, end) {
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
               

        for(var i = 0; i < cdata.length; i++) {
            if (cdata[i].timestamp > end) break;
            if (cdata[i].timestamp > start) {
                var found = false;
                var newDate = new Date(cdata[i].timestamp * 1000);
                var lastElem = results[0][results[0].length - 1];
                binData(cdata[i].timestamp, 0);
                if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                    lastElem.count += 1;
                }
                else
                    results[0].push({ date: newDate, count: 1 });
            }
        };

        for (var i = 0; i < sdata.length; i++) {
            if (sdata[i].timestamp > end) break;
            if (sdata[i].timestamp > start) {
                var found = false;
                var newDate = new Date(sdata[i].timestamp * 1000);
                var lastElem = results[1][results[1].length - 1];
                binData(sdata[i].timestamp, 1);
                if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                    lastElem.count += 1;
                }
                else
                    results[1].push({ date: newDate, count: 1 });
            }
        };

        for (var i = 0; i < bdata.length; i++) {
            if (bdata[i].timestamp > end) break;
            if (bdata[i].timestamp > start) {
                var found = false;
                var newDate = new Date(bdata[i].timestamp * 1000);
                var lastElem = results[2][results[2].length - 1];
                binData(bdata[i].timestamp, 2);
                if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                    lastElem.count += 1;
                }
                else
                    results[2].push({ date: newDate, count: 1 });
            }
        };

        for (var i = 0; i < 3; i++) {
            bins[i].forEach(function (day) {
                day.slots.forEach(function (slot) {
                    if(maxes[i] != 0) slot.count /= maxes[i];
                });
            });
        }

        return { totals: results, bins: bins};

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
        var maxc = 0, maxb = 0, maxs = 0;
        for (var i = 0; i < data.length; i++) {
            maxc = data[i].callcount > maxc ? data[i].callcount : maxc;
            maxs = data[i].smscount > maxs ? data[i].smscount : maxs;
            maxb = data[i].btcount > maxb ? data[i].btcount : maxb;
        }
        //maxc = maxs = maxb = 1;

        for (var i = 0; i < data.length; i++) {
            var theDate = new Date(data[i].date);
            theDate.setHours(0, 0, 0, 0);
            result[0].push({ date: theDate, x: i, y: data[i].callcount / maxc, y0: 0 });
            result[1].push({ date: theDate, x: i, y: data[i].smscount / maxs, y0: data[i].callcount / maxc });
            result[2].push({ date: theDate, x: i, y: data[i].btcount / maxb, y0: data[i].callcount / maxc + data[i].smscount / maxs });
        }

        return result;
    };



    DataProcessor.parse_loc_data = function (data, accuracy, realName, start, end) {
        var result = [];
        var extractNumber = function (hash) {
            return hash.substring(17, hash.length - 2)
        }

        var thisUser = function (d) {
            var name;
            switch (d.type) {
                case "call":
                    fake.forEach(function (l) {
                        if (l.number == extractNumber(d.contact[0]))
                            name = l.real_name;
                    });
                    break;
                case "sms":
                    fake.forEach(function (l) {
                        if (l.number == extractNumber(d.contact[0]))
                            name = l.real_name;
                    });
                    break;
                case "bt":
                    d.contact.forEach(function (x) {
                        fake.forEach(function (l) {
                            if (x == l.sensible_user_id)
                                name = l.real_name;
                        });
                    });
                    break;
            }
            return name == realName;

        };

        for (var i = 0; i < data.length; i++)
        {
            if (data[i].timestamp > end) break;
            if (data[i].timestamp > start) {
                var d = data[i];
                var found = false;
                if (thisUser(d)) {
                    result.forEach(function (x) {
                        if (Math.abs(x.lon - d.lon) < accuracy && Math.abs(x.lat - d.lat) < accuracy && x.type == d.type) {
                            x.count += 1;
                            found = true;
                        }
                    });

                    if (!found) {
                        d["count"] = 1;
                        result.push(d);
                    }
                }
            }
        };

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






    DataProcessor.gen_loc_data = function (btData, smsData, callData, locData) {
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

            results.data.push({timestamp: d.timestamp, lon: closest.location.longitude, lat: closest.location.latitude, type: "call", contact: [d.call.number] });
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

            results.data.push({ timestamp: d.timestamp, lon: closest.location.longitude, lat: closest.location.latitude, type: "sms", contact: [d.message.address] });
        });

        btData.forEach(function (d) {
            var diff = locData[0].timestamp;
            var closest = null;
            var name = [];

            for (var i = 0; i < locData.length; i++) {
                if (Math.abs(locData[i].timestamp - d.timestamp) <= diff) {
                    diff = Math.abs(locData[i].timestamp - d.timestamp);
                    closest = locData[i];
                }
                else
                    break;
            };
            d.devices.forEach(function (x) {

                name.push(x.sensible_user_id);
            });
            results.data.push({ timestamp: d.timestamp, lon: closest.location.longitude, lat: closest.location.latitude, type: "bt", contact: name });
        });

        return results;
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