var WebChart;
var DAYSLOT = { MORNING: 0, EARLYCLASS: 1, LUNCH: 2, LATECLASS: 3, AFTER: 4 };

WebChart = (function () {
    function WebChart(btData, smsData, callData) {
        //Main layout fields
        this.vis = null;
        this.width = 1200;
        this.height = 550;
        this.center = {
            x: this.width / 2,
            y: this.height / 2
        };
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.shapes = {
            call: "04,00 08,04 05,07 05,08 13,16 14,16 17,13 21,16 17,21 12,21 00,09 00,04 04,00",
            sms: "00,00 25,00 25,15 00,15 00,00 13,7 25,00",
            bt: "00,07 05,10 05,00 12,05 05,10 12,15 05,20 05,10 00,13"
        };
        this.clusterColors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#880000", "#008800", "#000088", "#888800", "#880088", "#008888", "#000000", "#ffffff", "#888888", "#444444"];

        //Web layout fields
        this.web = { bt: null, call: null, sms: null };
        this.segments = 16;
        this.levels = 3;
        this.points = this.getPoints((this.width - 700) / 3.5, this.segments, this.levels);
        this.radius_scale;
        this.friendScales = [];
        this.unusedScales = [];
        this.colorScale = d3.scale.pow().exponent(0.95).range([0.1, 1]);//"#00000000", "#000000FF"]);
        this.strokeScale = d3.scale.pow().exponent(0.95).rangeRound([2, 4]).clamp(true);//"#00000000", "#000000FF"]);
        this.locationDictionary = {};

        //Data fields
        this.callData = callData;
        this.smsData = smsData;
        this.btData = btData;
        this.nodes = [];
        this.displayedNodes = [];
        this.maxScores = { call: 0, sms: 0, bt: 0, total: 0 };
        this.minScores = { call: 0, sms: 0, bt: 0, total: 0 };
        this.createNode = function (id, name) {
            return {
                id: id,
                name: name,
                x: 0,
                y: 0,
                radius: 10,
                cluster: 0,             //Which cluster within the network the node belongs to
                callScore: 0,           //Score awarded for calls in given timeframe
                smsScore: 0,            //Score awarded for sms in given timeframe
                btScore: 0,             //Score awarded for bt in given timeframe
                nbScores: {},           //Scores for ties between node and other nodes in given timeframe
                callData: [],           //Array with all calls made to that person 
                smsData: [],            //Array with all sms made to that person
                btData: [],             //Array with all bt connections to that person
                nbData: {},             //Dictionary with all bt connections that person made to others (data is array of timestamps)
                callStat: 0,            //Total call statistic (sum of call duration)
                smsStat: 0,             //Total sms statistic
                btStat: 0,              //Total bt connection statistic
                friendScales: null
            }
        }

        //Control fields	
        this.tooltip = CustomTooltip("gates_tooltip", 300);
        this.circles = { bt: null, call: null, sms: null };
        this.startTime;
        this.endTime;

        var date = new Date(Date.now());
        var obj = this;
        //TODO: HARDCODED BLAST TO THE PAST
        var starting = /*new Date(1349958465000);*/date.setMonth(date.getMonth() - 7);



        setTimeout(function () {
            obj.create_nodes(starting, /*new Date(1369239142000));*/Date.now());
        }, 1000);
    };

    /*******************************************************************************/
    /********************** WEB CHART VISUALIZATION ********************************/
    /*******************************************************************************/

    /********************************************************************************
    *   FUNCTION: create_nodes                                                      *
    *   Create the data nodes from the loaded data. Perform all pre-computation.    * 
    *   Modify this to fit data structure!                                          *
    ********************************************************************************/
    WebChart.prototype.create_nodes = function (start, end) {
        this.startTime = start / 1000;
        this.endTime = end / 1000;

        var chart = this;
        var namesDict = {};     //Dictionary to store indices of nodes in the array, for faster data insertion        
        var extractNumber = function (hash) {
            return hash.substring(17, hash.length - 2)
        }                       //Helper function to parse data and create data nodes

        //Parse Call data
        for (var i = 0; i < chart.callData.length; i++) {
            var d = chart.callData[i];
            var name;

            //TODO: Fake translate between sensible_user_id and phone numbers, must be replaced with real stuff
            fake.forEach(function (l) {
                if (d.call.number == l.sensible_user_id)
                    name = l.real_name;
            });
            if (name) {
                if (d.call.duration > 5) {
                    var node;
                    if (namesDict[name] == undefined) {
                        node = chart.createNode(chart.nodes.length, name);
                        node.callData.push({ timestamp: d.timestamp, score: d.call.duration, stat: d.call.duration });
                        chart.nodes.push(node);
                        namesDict[name] = chart.nodes.length - 1;
                    }
                    else {
                        chart.nodes[namesDict[name]].callData.push({ timestamp: d.timestamp, score: d.call.duration, stat: d.call.duration });
                    }
                }
            }
        }
        //Parse SMS data
        for (var i = 0; i < chart.smsData.length; i++) {
            var d = chart.smsData[i];
            var name;
            //TODO: Fake translate between sensible_user_id and phone numbers, must be replaced with real stuff
            fake.forEach(function (l) {
                if (d.message.address == l.sensible_user_id)
                    name = l.real_name;
            });
            if (name) {
                var node;
                if (namesDict[name] == undefined) {
                    node = chart.createNode(chart.nodes.length, name);
                    node.smsData.push({ timestamp: d.timestamp, score: 10, stat: 1 });
                    chart.nodes.push(node);
                    namesDict[name] = chart.nodes.length - 1;
                }
                else {
                    chart.nodes[namesDict[name]].smsData.push({ timestamp: d.timestamp, score: 10, stat: 1 });
                }
            }
        }

        //Parse Bluetooth data
        for (var i = 0; i < chart.btData.length; i++) {
            var d = chart.btData[i];
            var neighbouring = [];
            for (var j = 0; j < d.devices.length; j++) {
                var name;
                //TODO: Fake translate between sensible_user_id and phone numbers, must be replaced with real stuff
                fake.forEach(function (l) {
                    if (d.devices[j].sensible_user_id == l.sensible_user_id)
                        name = l.real_name;
                });
                if (name) {
                    var node;
                    if (namesDict[name] == undefined) {
                        node = chart.createNode(chart.nodes.length, name);
                        node.btData.push({ timestamp: d.timestamp, score: 5, stat: 1 });
                        chart.nodes.push(node);
                        namesDict[name] = chart.nodes.length - 1;
                    }
                    else {
                        var score = (chart.nodes[namesDict[name]].lastContact - d.timestamp > 300000) ? 300 : 5;
                        chart.nodes[namesDict[name]].btData.push({ timestamp: d.timestamp, score: score, stat: 1 });
                    }
                    neighbouring.push(name);
                }
            }
            //Add timestamps for each contact meeting another contact
            //Since we connect to several contacts simultanously we can infer they also connect to each other
            for (var curr = 0; curr < neighbouring.length; curr++) {
                for (var other = 0; other < neighbouring.length; other++) {
                    if (neighbouring[other] != neighbouring[curr]) {
                        if (chart.nodes[namesDict[neighbouring[curr]]].nbData[neighbouring[other]] == undefined)
                            chart.nodes[namesDict[neighbouring[curr]]].nbData[neighbouring[other]] = [];
                        chart.nodes[namesDict[neighbouring[curr]]].nbData[neighbouring[other]].push(d.timestamp);
                    }

                }
            }
        }


        for (var i = 0 ; i < chart.segments ; i++) {
            var pa = chart.points.byLevel[chart.levels-1][i], pb = chart.points.byLevel[0][i];
            chart.friendScales.push({
                bt: d3.scale.linear().range([pa, pb]),
                call: d3.scale.linear().range([pa, pb]),
                sms: d3.scale.linear().range([pa, pb]),
                pointa: pb,
                pointb: pb
            });
        }
        chart.create_vis();

        return chart.update_nodes();
    };

    /********************************************************************************
    *   FUNCTION: update_nodes                                                      *
    *   Update the data nodes in regards to new displayed time period.              *   
    ********************************************************************************/
    WebChart.prototype.update_nodes = function () {
        var chart = this;

        this.maxScores = { call: 0, sms: 0, bt: 0, total: 0 };
        this.minScores = { call: 0, sms: 0, bt: 0, total: 0 };


        //Calculate scores for all nodes
        for (var i = 0; i < chart.nodes.length; i++) {
            var d = chart.nodes[i];
            var toLabel = ["call", "sms", "bt"]
            var maxIndex = 0;
            
            //Clean the node of old data
            d.callScore = d.smsScore = d.btScore = 0;
            d.callStat = d.smsStat = d.btStat = 0;
            d.friendshipScore = 0;
            d.binsData = null;
            d.totalsData = null;
            var lastDate = new Date(1,1,1);
            for (var j = 0; j < d.callData.length; j++) {
                if (d.callData[j].timestamp > chart.endTime) break;
                if (d.callData[j].timestamp > chart.startTime) {
                    var curDate = new Date(d.callData[j].timestamp);
                    if (curDate.toDateString() != lastDate.toDateString)
                        d.callScore += 1;//d.callData[j].score;
                    d.callStat += d.callData[j].stat;
                }
            }
            for (var j = 0; j < d.smsData.length; j++) {
                if (d.smsData[j].timestamp > chart.endTime) break;
                if (d.smsData[j].timestamp > chart.startTime) {
                    var curDate = new Date(d.smsData[j].timestamp);
                    if (curDate.toDateString() != lastDate.toDateString)
                        d.smsScore += 1;//d.smsData[j].score;
                    d.smsStat += d.smsData[j].stat;
                }
            }
            for (var j = 0; j < d.btData.length; j++) {
                if (d.btData[j].timestamp > chart.endTime) break;
                if (d.btData[j].timestamp > chart.startTime) {
                    var curDate = new Date(d.btData[j].timestamp);
                    if (curDate.toDateString() != lastDate.toDateString)
                        d.btScore += 1;//d.btData[j].score;
                    d.btStat += d.btData[j].stat;
                }
            }

            var scores = [d.callScore, d.smsScore, d.btScore];
            maxIndex = scores.indexOf(Math.max.apply(null, scores));
            d.value = d.callScore + d.smsScore + d.btScore;

            chart.maxScores.total = d.value > chart.maxScores.total ? d.value : chart.maxScores.total;
            chart.minScores.total = (d.value < chart.minScores.total || i == 0) ? d.value : chart.minScores.total;
            chart.maxScores.bt = d.btScore > chart.maxScores.bt ? d.btScore : chart.maxScores.bt;
            chart.maxScores.call = d.callScore > chart.maxScores.call ? d.callScore : chart.maxScores.call;
            chart.maxScores.sms = d.smsScore > chart.maxScores.sms ? d.smsScore : chart.maxScores.sms;
            chart.minScores.bt = (d.btScore < chart.minScores.bt || i == 0) ? d.btScore : chart.minScores.bt;
            chart.minScores.call = (d.callScore < chart.minScores.call || i == 0) ? d.callScore : chart.minScores.call;
            chart.minScores.sms = (d.smsScore < chart.minScores.sms || i == 0) ? d.smsScore : chart.minScores.sms;
        }


        chart.nodes.sort(function (a, b) {
            return b.value - a.value;
        });

        //Cut off the top 16 nodes, less if there would be nodes of value 0
        var slice = 0
        for (var i = 0; i < 16; i++) {
            if (chart.nodes[i].value == 0) break;
            slice = i + 1;
        }
        chart.displayedNodes = chart.nodes.slice(0, slice);

        for (var i = 0; i < chart.displayedNodes.length; i++) {
            chart.displayedNodes[i].nbScores = DataProcessor.parse_nb_data(chart.displayedNodes[i], chart.displayedNodes, chart.startTime, chart.endTime);
        }

        chart.displayedNodes = chart.placeGreedy();

        

        chart.displayedNodes.forEach(function (d, i) {
            d.friendScales = chart.friendScales[i];
            d.friendScales.bt.domain([chart.minScores.bt, chart.maxScores.bt]);
            d.friendScales.call.domain([chart.minScores.call, chart.maxScores.call]);
            d.friendScales.sms.domain([chart.minScores.sms, chart.maxScores.sms]);
        });


        return chart.update_vis();
    };

    /********************************************************************************
    *   FUNCTION: create_vis                                                        *
    *   Draw the visualization base, the first time it is displayed.                *   
    ********************************************************************************/
    WebChart.prototype.create_vis = function () {
        var chart = this;
        if (d3.select("#svg_vis").empty())
            this.vis = d3.select("#vis").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_vis").style("display", "inline-block").append("g").attr("id", "WebChart");
        else
            this.vis = d3.select("#svg_vis").append("g").attr("id", "WebChart");

        var channels = { bt: {x:0, y: 0}, sms: {x:-400, y:0}, call: {x:400, y:0}};
        //Draw web for each channel
        for (channel in channels)
        {
            this.web[channel] = this.vis.append("g").attr("id", "Web-" + channel);
            
            this.web[channel].attr("transform", "translate(" + (chart.center.x + channels[channel].x) + ", " + (chart.center.y + channels[channel].y) + ")");

            //Draw the web radial lines
            for (segment = 0; segment < chart.segments; segment++) {
                //console.debug(chart.points.bySegment[segment]);
                var start = chart.points.bySegment[segment][0];
                var end = chart.points.bySegment[segment][chart.levels-1];
                this.web[channel].append("line")
                    .attr("x1", start.x)
                    .attr("y1", start.y)
                    .attr("x2", end.x)
                    .attr("y2", end.y)
                    .style("stroke-dasharray", "15 5")
                    .style("stroke", "#000")
                .attr("opacity", 0.5);
            }              
        }

        
    };

    /********************************************************************************
    *   FUNCTION: update_vis                                                        *
    *   Update the drawn visualization, based on the time period change.            *   
    ********************************************************************************/
    WebChart.prototype.update_vis = function () {
        var chart = this;

        var channels = { bt: { x: 0, y: -100 }, sms: { x: -300, y: 200 }, call: { x: 300, y: 200 } };
        //Draw web for each channel
        for (channel in channels) {
            this.circles[channel] = this.web[channel].selectAll("circle")
                   .data(this.displayedNodes, function (d) {
                       return d.id;
                   });

            this.circles[channel].exit().transition().duration(500).attr("r", 0).remove();

            this.circles[channel].enter()
                   .append("circle")
                   .attr("class", channel)
                   .attr("r", 0)
                   .attr("cx", function (d) {
                       return d.friendScales[channel](chart.minScores[channel]).x;
                   })
                   .attr("cy", function (d) {
                       return d.friendScales[channel](chart.minScores[channel]).y;
                   })
                   .attr("fill", function (d) {
                       //return chart.clusterColors[d.cluster];
                       return chart.colors[channel];
                   })
                   .attr("stroke-width", 2)
                   .attr("stroke", function (d) {
                       return d3.rgb(chart.colors[channel]).darker();
                   })
                   .attr("id", function (d) {
                       return "bubble_" + d.id;
                   })
                   .on("mouseover", function (d, i) {
                       var id = this.getAttribute("id");
                       chart.vis.selectAll("#" + id)
                           .attr("fill", function(d) {
                               return  d3.rgb(chart.colors[this.getAttribute("class")]).brighter();
                           })
                           .attr("stroke", function (d) {
                               return chart.colors[this.getAttribute("class")];
                           });
                       return chart.show_details(d, i, this);
                   })
                   .on("mouseout", function (d, i) {
                       var id = this.getAttribute("id");
                       chart.vis.selectAll("#" + id)
                           .attr("fill", function (d) {
                               return  chart.colors[this.getAttribute("class")];
                           })
                           .attr("stroke", function(d) {
                               return d3.rgb(chart.colors[this.getAttribute("class")]).darker();
                           });

                       return chart.hide_details(d, i, this);
                   });
        }



        this.circles.bt.transition().duration(500).attr("r", function (d) {
            return d.radius;
        }).each("end", function () {
            d3.select(this).transition().duration(500)
            .attr("cx", function (d) {
                return d.friendScales.bt(d.btScore).x;
            })
            .attr("cy", function (d) {
                return d.friendScales.bt(d.btScore).y;
            })
        });

        this.circles.call.transition().duration(500).attr("r", function (d) {
            return d.radius;
        }).each("end", function () {
            d3.select(this).transition().duration(500)
            .attr("cx", function (d) {
                return d.friendScales.call(d.callScore).x;
            })
            .attr("cy", function (d) {
                return d.friendScales.call(d.callScore).y;
            })
        });
        this.circles.sms.transition().duration(500).attr("r", function (d) {
            return d.radius;
        }).each("end", function () {
            d3.select(this).transition().duration(500)
            .attr("cx", function (d) {
                return d.friendScales.sms(d.smsScore).x;
            })
            .attr("cy", function (d) {
                return d.friendScales.sms(d.smsScore).y;
            })
        });
        
        //this.circles = this.web.bt.selectAll("circle").data(chart.displayedNodes, function (d) {
        //    return d.id;
        //});
        //this.circles.exit().transition().duration(500).attr("r", 0).remove();
        ////Reset pre-existing connections
        //this.web.bt.selectAll(".connection").remove();


     


    };

    /********************************************************************************
    *   FUNCTION: draw_connections                                                  *
    *   Draw the connections between the nodes.                                     *   
    ********************************************************************************/
    WebChart.prototype.draw_connections = function () {
        var chart = this;
        var getRandomArbitary = function (min, max) {
            return Math.random() * (max - min) + min;
        }
        var eucDist = function (a, b) {
            return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
        }


        this.web.bt.selectAll(".connection").data(chart.getConnections(chart.displayedNodes)).enter()
        .append("path")
        .attr("class", "connection")
        .attr("stroke", "#000000")
        .attr("opacity", 0)
        .attr("stroke-width", function (d) {
            //d["opacity"] = chart.strokeScale(d.score);
            return chart.strokeScale(d.score) + "px";
        })
        .attr("fill", "none")
        .attr("d", function (d) {
            var point = chart.locationDictionary[d.a];
            var nextPoint = chart.locationDictionary[d.b];
            var nextPoint1Control = { x: 0, y: 0 }, nextPoint2Control = { x: 0, y: 0 };
            var parallel = WebChart.getParallel(point, nextPoint);
            //var parallel = { x: nextPoint.y - point.y, y: nextPoint.x - point.x };
            //var dist = eucDist(nextPoint, point);
            //parallel.x /= dist;
            //parallel.y /= dist;
            var midPoint = { x: point.x + (nextPoint.x - point.x) / 2 - parallel.x, y: point.y + (nextPoint.y - point.y) / 2 + parallel.y },
                midPoint2 = { x: point.x + (nextPoint.x - point.x) / 2 + parallel.x, y: point.y + (nextPoint.y - point.y) / 2 - parallel.y };
            var modifier = 1;
            if (eucDist(midPoint, { x: 0, y: 0 }) > eucDist(midPoint2, { x: 0, y: 0 }))
                modifier = -1;

            nextPoint1Control.x = point.x + (nextPoint.x - point.x) / 3 - modifier * getRandomArbitary(20, 45) * parallel.x;
            nextPoint1Control.y = point.y + (nextPoint.y - point.y) / 3 + modifier * getRandomArbitary(20, 45) * parallel.y;
            nextPoint2Control.x = point.x + (nextPoint.x - point.x) / 3 * 2 - modifier * getRandomArbitary(20, 45) * parallel.x;
            nextPoint2Control.y = point.y + (nextPoint.y - point.y) / 3 * 2 + modifier * getRandomArbitary(20, 45) * parallel.y;
            //if (modifier == 1)
            //    chart.web.bt.selectAll(".debug").data([1]).enter().append("circle").attr("cx", midPoint.x).attr("cy", midPoint.y).attr("r",5).attr("fill", "#FF0000");
            //else
            //    chart.web.bt.selectAll(".debug").data([1]).enter().append("circle").attr("cx", midPoint2.x).attr("cy", midPoint2.y).attr("r",5).attr("fill", "#0000FF");


            return " M " + point.x + "," + point.y + " C " + nextPoint1Control.x + "," + nextPoint1Control.y + " "
                        + nextPoint2Control.x + "," + nextPoint2Control.y + " " + nextPoint.x + "," + nextPoint.y;
        })
        .transition().duration(500).attr("opacity", function (d) {

            return chart.colorScale(d.score);;
        });
        //Put circles on top
        this.vis.select("#userAvatarMain").each(function () {
            this.parentNode.appendChild(this);
        });
        this.web.bt.selectAll("circle").each(function () {
            this.parentNode.appendChild(this);
        });

    };


    WebChart.prototype.show_details = function (data, i, element) {
        if (!this.zoomed) {
            var content;
            var rest;
            var hours = Math.floor(data.callStat / 3600);
            rest = data.callStat % 3600;
            var minutes = Math.floor(rest / 60);
            rest = rest % 60;
            //d3.select(element).attr("stroke", "black");
            content = "<span class=\"name\">ID:</span><span class=\"value\"> " + data.name + "</span><br/>";
            //content += "<span class=\"name\">Calls: </span><span class=\"value\">" + hours
            //if (minutes < 10)
            //    content += ":0" + minutes;
            //else
            //    content += ":" + minutes;
            //if (rest < 10)
            //    content += ":0" + rest + " time in call.</span><br/>";
            //else
            //    content += ":" + rest + " time in call.</span><br/>";

            //content += "<span class=\"name\">Sms: </span><span class=\"value\">" + data.smsStat + " messages.</span><br/>";
            //content += "<span class=\"name\">Bluetooth: </span><span class=\"value\">" + data.btStat + " connections.</span><br/>";
            return this.tooltip.showTooltip(content, d3.event);
        }
    };

    WebChart.prototype.hide_details = function (data, i, element) {
        return this.tooltip.hideTooltip();
    };

    /*******************************************************************************/
    /*************************** HELPER FUNCTIONS  *********************************/
    /*******************************************************************************/
    WebChart.prototype.getPoints = function (radius, segments, levels/*, translate*/) {
        points = {
            all: [],
            byLevel: [],
            bySegment: [],
        };

        for (i = 0; i < levels + 1; i++) {
            r = (radius / levels) * (i + 1);
            points.byLevel[i] = []
            for (j = 0; j < segments; j++) {
                if (points.bySegment[j] == undefined) {
                    points.bySegment[j] = [];
                }
                var randomnumber = Math.floor(Math.random() * 25);
                theta = ((2 * Math.PI) / segments) * j;
                point = {
                    r: r,
                    theta: theta,
                    x: r * Math.cos(theta),// + translate.x,
                    y: r * Math.sin(theta),// + translate.y,
                    level: i
                };
                point2 = {
                    r: r * randomnumber,
                    theta: theta,
                    x: (r + randomnumber) * Math.cos(theta),// + translate.x,
                    y: (r + randomnumber) * Math.sin(theta),// + translate.y,
                    level: i
                };
                points.all.push(point);
                points.byLevel[i].push(point2);
                points.bySegment[j].push(point);
            }
        }
        return points;
    };


    WebChart.prototype.placeGreedy = function () {
        var positions = [];
        var chart = this;
        var minPlacement = { index: 0, force: 0 };
        if (chart.displayedNodes.length == 0)
            return chart.displayedNodes;

        for (var i = 0; i < chart.displayedNodes.length; i++) {
            var lastPosition = 0;
            var alreadyPlaced = [];
            positions.push([]);
            positions[i].push(chart.displayedNodes[i]);
            alreadyPlaced.push(chart.displayedNodes[i].name);

            while (alreadyPlaced.length != chart.displayedNodes.length) {
                var last = positions[i][positions[i].length - 1];
                var closest = { name: "", score: 0 };

                for (var nbname in last.nbScores) {
                    if (alreadyPlaced.indexOf(nbname) >= 0) continue;
                    if (last.nbScores[nbname] >= closest.score)
                        closest = { name: nbname, score: last.nbScores[nbname] };
                }

                for (var j = 0; j < chart.displayedNodes.length; j++) {
                    if (chart.displayedNodes[j].name == closest.name) {
                        positions[i].push(chart.displayedNodes[j]);
                        alreadyPlaced.push(closest.name);
                        break;
                    }
                }
            }
            if (i == 0)
                minPlacement = { index: 0, force: chart.evalPlacement(positions[i]) };
            else {
                var newForce = chart.evalPlacement(positions[i]);
                if (newForce < minPlacement.force)
                    minPlacement = { index: i, force: newForce };
            }
        }

        return positions[minPlacement.index];
    };


    WebChart.prototype.evalPlacement = function (placement) {
        var force = 0;
        for (var i = 0; i < placement.length; i++) {
            for (var j = i + 1; j < placement.length; j++) {
                force += (placement[i].nbScores[placement[j].name]) * Math.log((j - i) / 1);
            }
        }
        return force;
    };

    WebChart.prototype.getConnections = function (nodes) {
        var conns = [];
        var chart = this;

        for (var i = 0; i < nodes.length; i++) {
            for (var nb in nodes[i].nbScores) {
                var exists = false;
                for (var k = 0; k < conns.length; k++) {
                    if (conns[k].a == nb && conns[k].b == nodes[i].name) {
                        exists = true;
                        break;
                    }
                }
                if (!exists && nodes[i].nbScores[nb] > 0)
                    conns.push({ a: nodes[i].name, b: nb, score: nodes[i].nbScores[nb] });
            }
        }
        if (conns.length > 0) {
            var maxNbScore = 0, minNbScore = conns[0].score, avgNbScore = { score: 0, count: 0 };
            for (var i = 0; i < conns.length; i++) {
                if (conns[i].score > maxNbScore)
                    maxNbScore = conns[i].score;
                if (conns[i].score > 0) {
                    avgNbScore.score += conns[i].score;
                    avgNbScore.count++;
                }
            }

            var stdDev = 0, avg = avgNbScore.score / avgNbScore.count
            for (var i = 0; i < conns.length; i++) {
                if (conns[i].score > 0)
                    stdDev += Math.pow(conns[i].score - avg, 2);
            }
            stdDev *= (1 / (avgNbScore.count - 1))
            stdDev = Math.sqrt(stdDev);

            conns.sort(function (a, b) { return b.score - a.score });

            var cut;
            //TUTAJ ZMIENIC ZAKOMENTOWAC I DAC ZERA
            for (cut = 0; cut < conns.length; cut++)
                if (conns[cut].score < avg) break;
            conns = conns.splice(0, cut);

            chart.colorScale.domain([avg, maxNbScore]);
            chart.strokeScale.domain([avg, maxNbScore]);

        }
        return conns;
    };

    WebChart.euclideanDistance = function (a, b) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    };


    WebChart.getParallel = function (a, b) {
        var parallel = { x: b.y - a.y, y: -(b.x - a.x) };
        var dist = WebChart.euclideanDistance(b, a);
        parallel.x /= dist;
        parallel.y /= dist;

        return parallel;
    };


    return WebChart;
})();


