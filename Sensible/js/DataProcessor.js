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
               

        cdata.forEach(function (d) {
            var found = false;
            var newDate = new Date(d.timestamp * 1000);
            var lastElem = results[0][results[0].length - 1];
            binData(d.timestamp, 0);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[0].push({ date: newDate, count: 1 });
        });

        sdata.forEach(function (d) {
            var found = false;
            var newDate = new Date(d.timestamp * 1000);
            var lastElem = results[1][results[1].length - 1];
            binData(d.timestamp, 1);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[1].push({ date: newDate, count: 1 });
        });

        bdata.forEach(function (d) {
            var found = false;
            var newDate = new Date(d.timestamp * 1000);
            var lastElem = results[2][results[2].length - 1];
            binData(d.timestamp, 2);
            if (lastElem && lastElem.date.toLocaleDateString() == newDate.toLocaleDateString()) {
                lastElem.count += 1;
            }
            else
                results[2].push({ date: newDate, count: 1 });
        });

        for (var i = 0; i < 3; i++) {
            bins[i].forEach(function (day) {
                day.slots.forEach(function (slot) {
                    if(maxes[i] != 0) slot.count /= maxes[i];
                });
            });
        }

        return { totals: results, bins: bins};

    };

    DataProcessor.parse_timeline_data = function (data) {

        var result = [[], [], []];


        data.data.forEach(function (d, i) {
            
            result[0].push({ date: new Date(d.date), x: i, y: d.callcount, y0: 0 });
            result[1].push({ date: new Date(d.date), x: i, y: d.smscount, y0: d.callcount });
            result[2].push({ date: new Date(d.date), x: i, y: d.btcount, y0: d.callcount + d.smscount });
        });

        return result;
    };


    DataProcessor.parse_loc_data = function (data, accuracy, realName) {
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

        data.forEach(function (d) {
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
        });

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
        var extractNumber = function (hash) {
            return hash.substring(17, hash.length - 2)
        }

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

            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "call", contact: [d.call.number] });
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

            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "sms", contact: [d.message.address] });
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
            results.data.push({ lon: closest.location.longitude, lat: closest.location.latitude, type: "bt", contact: name });
        });

        return results;
    };




    DataProcessor.gen_collective_data = function (btData, smsData, callData) {
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