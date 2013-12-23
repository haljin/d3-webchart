﻿var WebChart;
var DAYSLOT = { MORNING: 0, EARLYCLASS: 1, LUNCH: 2, LATECLASS: 3, AFTER: 4 };

WebChart = (function () {
    function WebChart(btData, smsData, callData) {
        //Main layout fields
        this.vis = null;
        this.width = 1200;
        this.height = 450;
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
        this.clusterColors = d3.scale.category20();//["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#880000", "#008800", "#000088", "#888800", "#880088", "#008888", "#000000", "#ffffff", "#888888", "#444444"];
        //this.clusterColors = ["#467302", "#274001", "#172601", "#C9F235", "#8C2016", "#D9411E", "#F28322", "#F2B707", "#9C153A", "#DECED0", "#611255", "#3F1548", "#CCBDB8", "#999391", "#666261", "#333131"];

        //Web layout fields
        this.web = { bt: null, call: null, sms: null };
        this.segments = 16;
        this.levels = 3;
        this.points = this.getPoints((this.width - 700) / 3.5, this.segments, this.levels);
        this.radius_scale;
        this.friendScales = [];
        this.unusedScales = [];
        this.colorScale = d3.scale.pow().exponent(0.95).range([0.3, 1]);//"#00000000", "#000000FF"]);
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
                colData: null,
                callStat: 0,            //Total call statistic (sum of call duration)
                smsStat: 0,             //Total sms statistic
                btStat: 0,              //Total bt connection statistic
                friendScales: null,
                clicked: false
            }
        }

        //Control fields
        this.loaded = false;
        this.tooltip = CustomTooltip("gates_tooltip", 300);
        this.circles = { bt: null, call: null, sms: null };
        this.comms = { bt: null, call: null, sms: null };
        this.connections = { bt: null, call: null, sms: null };
        this.realStartTime;
        this.startTime;
        this.endTime;
        this.timelineRef;
        this.helpRef = null;

        var date = new Date(Date.now());
        var obj = this;
        //TODO: HARDCODED BLAST TO THE PAST
        var starting = /*new Date(1349958465000);*/date.setMonth(date.getMonth() - 3);
        date = new Date(Date.now());
        this.realStartTime = date.setMonth(date.getMonth() - 5);

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
                segment: i,
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

        for (var i = slice; i< chart.nodes; i++){
            if (chart.nodes[i].friendScales != null) {
                chart.friendsScales.push(chart.nodes[i].friendScales);
                chart.nodes[i].friendScales = null;
            }
            chart.nodes[i].clicked = false;
        }

        for (var i = 0; i < chart.displayedNodes.length; i++) {
            chart.displayedNodes[i].nbScores = DataProcessor.parse_nb_data(chart.displayedNodes[i], chart.displayedNodes, chart.startTime, chart.endTime);
            if( chart.displayedNodes[i].colData == null)
                chart.displayedNodes[i].colData = DataProcessor.parse_totals_data(chart.displayedNodes[i].callData, chart.displayedNodes[i].smsData, chart.displayedNodes[i].btData);
        }

        chart.connections.bt = this.getConnections(this.displayedNodes);
        var people = this.displayedNodes.map(function(d) {return d.name});
        chart.comms.bt = louvain.best_communities(new Graph(people, chart.connections.bt));

        chart.displayedNodes = chart.placeComms();

        chart.displayedNodes.forEach(function (d, i) {
            if(d.friendScales == null)
                d.friendScales = chart.friendScales.pop();
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
            
            this.web[channel].attr("transform", "translate(" + (chart.center.x + channels[channel].x) + ", " + (chart.center.y + channels[channel].y) + ") scale(1.1,1.1)");

            //Draw the web radial lines


            for (segment = 0; segment < chart.segments; segment++) {
                var start = chart.points.bySegment[segment][0];
                var end = chart.points.bySegment[segment][chart.levels - 1];
                var next = (segment == chart.segments - 1) ? chart.points.bySegment[0][chart.levels - 1] : chart.points.bySegment[segment + 1][chart.levels - 1];
                var prev = (segment == 0) ? chart.points.bySegment[chart.segments - 1][chart.levels - 1] : chart.points.bySegment[segment - 1][chart.levels - 1];
                var midPt1 = { x: (end.x + next.x) / 2 * 1.1, y: (end.y + next.y) / 2 * 1.1 }, midPt2 = { x: (end.x + prev.x) / 2 * 1.1, y: (end.y + prev.y) / 2 * 1.1 };

                this.web[channel].append("polygon")
                    .attr("points", 0 + "," + 0 + "," + midPt1.x + "," + midPt1.y + "," + midPt2.x + "," + midPt2.y)
                    .attr("id", "communitybg_" + segment)
                    .attr("opacity", 0.25)
                    .attr("class", "community")
                    .style("fill", "#ffffff");
                //start - srodek
                this.web[channel].append("line")
                    .attr("x1", start.x)
                    .attr("y1", start.y)
                    .attr("x2", end.x)
                    .attr("y2", end.y)
                    .style("stroke-dasharray", "15 5")
                    .style("stroke", "#000")
                    .attr("opacity", 0.5);
            }

            this.web[channel].append("image")
                .attr("id", "userAvatar-" + channel)
                .attr("class", "avatar")
                .attr("xlink:href", "data/unknown-person.gif")
                .attr("x", -25)
                .attr("y", -45)
                .attr("width", 50)
                .attr("height", 90);

            this.web[channel].append("polyline")
                .attr("transform", "translate(-150,-150)")
                .attr("stroke", function () {
                    return chart.colors[channel];
                })
                .style("stroke-width", "2px")
                .style("fill", "none")
                .attr("points", function () {
                    return chart.shapes[channel];
                });
        }
        this.helpRef = new ChartHelp(this.vis, this.width, this.height);
     
    };

    /********************************************************************************
    *   FUNCTION: update_vis                                                        *
    *   Update the drawn visualization, based on the time period change.            *   
    ********************************************************************************/
    WebChart.prototype.update_vis = function () {
        var chart = this;
		this.loaded = false;
        this.vis.selectAll(".connection").remove();
        this.vis.selectAll(".community").style("fill", "#ffffff");

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
                       if (!d.clicked)
                           return chart.colors[channel];
                       else
                           return "#ff9896"
                   })
                   .attr("stroke-width", 2)
                   .attr("stroke", function (d) {
                       if (!d.clicked)
                           return d3.rgb(chart.colors[channel]).darker();
                       else
                           return "#d62728";
                   })
                   .attr("id", function (d) {
                       return "bubble_" + d.id;
                   })
                   .on("mouseover", function (d, i) {
                       if (chart.loaded) {
                           var id = this.getAttribute("id");
                           var connected = [d.name];

                           chart.vis.selectAll(".connection").transition().duration(500)
                               .attr("stroke-width", function (c) {
                                   if (c.a == d.name)
                                       connected.push(c.b);
                                   else if (c.b == d.name)
                                       connected.push(c.a);
                                   else
                                       return 0 + "px";
                                   //return c.opacity * 2 + "px";
                                   return chart.strokeScale(c.score) + "px";
                               });
                           chart.vis.selectAll("circle").transition().duration(500)
                               .attr("opacity", function (circle) {
                                   if (connected.indexOf(circle.name) > -1)
                                       return 1;
                                   else
                                       return 0.2;
                               });
                           if (!d.clicked) {
                               chart.vis.selectAll("#" + id)
                                   .attr("fill", function (d) {
                                       return d3.rgb(chart.colors[this.getAttribute("class")]).brighter();
                                   })
                                   .attr("stroke", d3.rgb("#ff0000"));
                           }
                           else {
                               chart.vis.selectAll("#" + id)
                                   .attr("fill", d3.rgb("#ff9896").brighter())
                                   .attr("stroke", d3.rgb("#d62728").brighter());

                           }
                           return chart.show_details(d, i, this);
                       }
                    })
                    .on("mouseout", function (d, i) {
                        if (chart.loaded) {
                            chart.vis.selectAll(".connection").transition().duration(500)
                                           .attr("stroke-width", function (c) {
                                               return chart.strokeScale(c.score) + "px";
                                           });
                            chart.vis.selectAll("circle").transition().duration(500)
                                            .attr("opacity", function (circle) {
                                                return 1;
                                            });
                            var id = this.getAttribute("id");
                            if (!d.clicked) {
                                chart.vis.selectAll("#" + id)
                                    .attr("fill", function (d) {
                                        return chart.colors[this.getAttribute("class")];
                                    })
                                    .attr("stroke", function (d) {
                                        return d3.rgb(chart.colors[this.getAttribute("class")]).darker();
                                    });
                            }
                            else {
                                chart.vis.selectAll("#" + id)
                                    .attr("fill", d3.rgb("#ff9896"))
                                    .attr("stroke", d3.rgb("#d62728"));

                            }
                            return chart.hide_details(d, i, this);
                        }
                    })
                .on("click", function (d) {
                    if (chart.loaded) {
                        var id = this.getAttribute("id");

                        if (!d.clicked) {
                            chart.vis.selectAll("#" + id)
                                .attr("fill", "#ff9896")
                                .attr("stroke", "#d62728");

                            chart.timelineRef.addPerson(d.colData.totals);
                        }
                        else {
                            chart.vis.selectAll("#" + id)
                                    .attr("fill", function (d) {
                                        return chart.colors[this.getAttribute("class")];
                                    })
                                    .attr("stroke", function (d) {
                                        return d3.rgb(chart.colors[this.getAttribute("class")]).darker();
                                    });
                            chart.timelineRef.removePerson(d.colData.totals);
                        }
                        d.clicked = !d.clicked;
                    }
                });
        }

        var runonce = false;

        this.circles.bt.transition().duration(500).attr("r", function (d) {
            if (d.btScore == 0) return 0;
            return d.radius;
        }).each("end", function () {
            d3.select(this).transition().duration(500)
            .attr("cx", function (d) {
                chart.locationDictionary[d.name] = { x: d.friendScales.bt(d.btScore).x };
                return d.friendScales.bt(d.btScore).x;
            })
            .attr("cy", function (d) {
                chart.locationDictionary[d.name]["y"] = d.friendScales.bt(d.btScore).y;
                return d.friendScales.bt(d.btScore).y;
            }).each("end", function (d) {
                chart.web.bt.selectAll("#communitybg_" + d.friendScales.segment)
                .transition()
                .style("fill", chart.clusterColors(d.cluster));

                if (!runonce) {
                    runonce = true;
                    chart.draw_connections("bt");
                }
            });
        });

        this.circles.call.transition().duration(500).attr("r", function (d) {
            if (d.callScore == 0) return 0;
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
            if (d.smsScore == 0) return 0;
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
        

    };

    /********************************************************************************
    *   FUNCTION: draw_connections                                                  *
    *   Draw the connections between the nodes.                                     *   
    ********************************************************************************/
    WebChart.prototype.draw_connections = function (type) {
        var chart = this;
        var getRandomArbitary = function (min, max) {
            return Math.random() * (max - min) + min;
        }
        var eucDist = function (a, b) {
            return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
        }

        var data = this.connections.bt; 

        this.web[type].selectAll(".connection").data(data).enter()
        .append("path")
        .attr("class", "connection")
        .attr("stroke", "#000000")
        .attr("opacity", 0)
        .attr("stroke-width", function (d) {
            return "2px";
        })
        .attr("fill", "none")
        .attr("d", function (d) {
            var point = chart.locationDictionary[d.a];
            var nextPoint = chart.locationDictionary[d.b];
            var nextPoint1Control = { x: 0, y: 0 }, nextPoint2Control = { x: 0, y: 0 };
            var parallel = WebChart.getParallel(point, nextPoint);
            var midPoint = { x: point.x + (nextPoint.x - point.x) / 2 - parallel.x, y: point.y + (nextPoint.y - point.y) / 2 + parallel.y },
                midPoint2 = { x: point.x + (nextPoint.x - point.x) / 2 + parallel.x, y: point.y + (nextPoint.y - point.y) / 2 - parallel.y };
            var modifier = 1;
            if (eucDist(midPoint, { x: 0, y: 0 }) > eucDist(midPoint2, { x: 0, y: 0 }))
                modifier = -1;

            //Point in 1/3 of the way between start and end
            nextPoint1Control.x = point.x + (nextPoint.x - point.x) / 3 - modifier * getRandomArbitary(10, 25) * parallel.x;
            nextPoint1Control.y = point.y + (nextPoint.y - point.y) / 3 + modifier * getRandomArbitary(10, 25) * parallel.y;
            //Point in 2/3 of the way between start and end
            nextPoint2Control.x = point.x + (nextPoint.x - point.x) / 3 * 2 - modifier * getRandomArbitary(10, 25) * parallel.x;
            nextPoint2Control.y = point.y + (nextPoint.y - point.y) / 3 * 2 + modifier * getRandomArbitary(10, 25) * parallel.y;

            return " M " + point.x + "," + point.y + " C " + nextPoint1Control.x + "," + nextPoint1Control.y + " "
                        + nextPoint2Control.x + "," + nextPoint2Control.y + " " + nextPoint.x + "," + nextPoint.y;
        })
        .transition().duration(500).attr("opacity", function (d) {

            return chart.colorScale(d.score);;
        }).each("end", function () {
            if (!chart.loaded) chart.loaded = true;
        });
        //Put circles on top
        this.vis.select("#userAvatarMain").each(function () {
            this.parentNode.appendChild(this);
        });
        this.web[type].selectAll("circle").each(function () {
            this.parentNode.appendChild(this);
        });

    };
 
	/********************************************************************************
	*   FUNCTION: show_details                                                  	*
	*   Show the details (tooltip) of the given node.                              	*   
    ********************************************************************************/
    WebChart.prototype.show_details = function (data, i, element) {
        var chart = this;
        var content;
        content = "<span class=\"name\">ID:</span><span class=\"value\"> " + data.name + "</span><br/>";
        var channel = d3.select(element).attr("class");
        switch (channel) {
            case "bt":
                content += "<span class=\"name\">Bluetooth: </span><span class=\"value\">" + data.btStat + " connections with you.</span><br />";
				for(var i = 0; i<chart.connections.bt.length; i++)
				{
					var conn = chart.connections.bt[i];
					if(conn.a == data.name)
						content += "<span class=\"value\">" + conn.score + " connections with " + 
							conn.b + ".</span><br />";
					else if(conn.b == data.name)
						content += "<span class=\"value\">" + conn.score + " connections with " + 
							conn.a + ".</span><br />";
				}
                break;
            case "sms":
                content += "<span class=\"name\">Sms: </span><span class=\"value\">" + data.smsStat + " messages with you.</span><br />";
                break;
            case "call":
                var rest;
                var hours = Math.floor(data.callStat / 3600);
                rest = data.callStat % 3600;
                var minutes = Math.floor(rest / 60);
                rest = rest % 60;

                content += "<span class=\"name\">Calls: </span><span class=\"value\">" + hours;
                if (minutes < 10)
                    content += ":0" + minutes;
                else
                    content += ":" + minutes;
                if (rest < 10)
                    content += ":0" + rest + " time in call with you.</span><br/>";
                else
                    content += ":" + rest + " time in call with you.</span><br/>";
                break;
        }
        return this.tooltip.showTooltip(content, d3.event);
    };

	/********************************************************************************
	*   FUNCTION: hide_details                                                  	*
	*   Hide the tooltip. 					                                    	*   
    ********************************************************************************/
    WebChart.prototype.hide_details = function (data, i, element) {
        this.vis.select("#personBars").remove();
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
                    r: r ,
                    theta: theta,
                    x: (r ) * Math.cos(theta),// + translate.x,
                    y: (r ) * Math.sin(theta),// + translate.y,
                    level: i
                };
                points.all.push(point);
                points.byLevel[i].push(point2);
                points.bySegment[j].push(point);
            }
        }
        return points;
    };

    WebChart.prototype.placeComms = function () {
        var newPlacement = [];
        var aux = {};
        for (var i = 0; i < this.displayedNodes.length; i++) {
            var person = this.displayedNodes[i];
            if (aux[this.comms.bt[person.name]] === undefined)
                aux[this.comms.bt[person.name]] = [];
            aux[this.comms.bt[person.name]].push(person)
        }

        for (community in aux) {
            aux[community].forEach(function (d) {
                d.cluster = community;
                newPlacement.push(d);
            })
        }

        return newPlacement;

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
        var tresholded = WebChart.tresholdEdges(chart.displayedNodes, conns, 0.2);

        if (tresholded.length > 0) {
            var maxNbScore = 0, minNbScore = tresholded[0].score;
            for (var i = 0; i < tresholded.length; i++) {
                if (tresholded[i].score > maxNbScore)
                    maxNbScore = tresholded[i].score;
                else if (tresholded[i].score < minNbScore)
                    minNbScore = tresholded[i].score;
            }

            chart.colorScale.domain([minNbScore, maxNbScore]);
            chart.strokeScale.domain([minNbScore, maxNbScore]);

        }
        return tresholded;
    };

    WebChart.prototype.setTimelineRef = function (timelineRef) {
        this.timelineRef = timelineRef;
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

    WebChart.tresholdEdges = function (nodes, edges, alpha) {
        var __degree = function (edges, node, weighted) {
            var result = 0;
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].a == node || edges[i].b == node)
                    result +=  weighted ? edges[i].score : 1;
            };
            return result;
        };
        var __nbs = function (edges, node) {
            var result = [];
            for (var i = 0; i < edges.length; i++) {
                if (edges[i].a == node)
                    result.push({ nb: edges[i].b, score: edges[i].score });
                else if (edges[i].b == node)
                    result.push({ nb: edges[i].a, score: edges[i].score });
            };
            return result;
        };
        // integral of (1-x)^(k_n-2)
        var integral = function (x) {
            return -(Math.pow(1 - x, k_n - 1) / k_n - 1);
        };


        var tresholdedEdges = [];

        for (var i = 0; i < nodes.length; i++) {
            var k_n = __degree(edges, nodes[i].name, false);
            if (k_n > 1) {
                var sum_w = __degree(edges, nodes[i].name, true);
                var nbs = __nbs(edges, nodes[i].name);
                
                for (var j = 0; j < nbs.length; j++) {
                    var edgeW = nbs[j].score;
                    var p_ij = edgeW / sum_w;
                    var alpha_ij = 1 - (k_n - 1) * (integral(p_ij) - integral(0));
                    if (alpha_ij < alpha) {
                        var found = false;
                        for (var e = 0; e < tresholdedEdges.length; e++) {
                            if (tresholdedEdges[e].a == nbs[j].nb && tresholdedEdges[e].b == nodes[i].name)
                                found = true;
                        }
                        if (!found)
                            tresholdedEdges.push({
                                a: nodes[i].name,
                                b: nbs[j].nb,
                                score: nbs[j].score
                            });
                        
                    }
                }
            }
        }
        return tresholdedEdges;
    };

    var ChartHelp = (function () {
        function ChartHelp(svg, width, height) {
            this.parentSvg = svg;
            this.svg = svg.append("g").attr("id", "Help").style("opacity", 1);
            this.width = width;
            this.height = height;
            this.shown = true;
			
            this.create_help();
        };


        ChartHelp.prototype.create_help = function () {
            var help = this;
            var drawText = function (x, y, text) {
                return help.svg
                .append("text")
                .attr("class", "help")
                .attr("x", x)
                .attr("y", y)
                .style("font-family", "Segoe UI")
                .style("font-size", "16px")
                .style("font-variant", "small-caps")
                .style("font-weight", "bold")
                .style("opacity", 0.5)
                .text(text);

            }

            drawText(this.width / 2, this.height - 10, "Drag and resize me to change time period!");
            drawText(this.width / 2 - 240, this.height - 70, "Different backgrounds");
            drawText(this.width / 2 - 240, this.height - 50, "are different groups");
            drawText(this.width / 2 + 100, 30, "The closer the dot the more");
            drawText(this.width / 2 + 100, 50, "you communicate. Click it");      
            drawText(this.width / 2 + 100, 70, "to learn more!");

            var button, button_text;
            var group = this.svg.append("g")
                .attr("id", "button-clear")
                .attr("class", "antihelp")
                .attr("transform", "translate(1150, 10)")
				.style("opacity", 0)
                .on("click", function () {
					if(!help.shown)	
						help.show_help();
					else
						help.remove_help();
                })
                .on("mouseover", function () {
                    button.attr("fill", "#B1B1B1");
                })
                .on("mouseout", function () {
                    button.attr("fill", "#dddddd");
                });

            button = group.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 30)
                .attr("height", 30)
                .attr("fill", "#dddddd")
                .attr("stroke", "#aaaaaa")
                .attr("stroke-width", 0.25)
                .style("cursor", "hand");

            button_text = group.append("text")
                .attr("x", 10)
                .attr("y", 20)
                .style("cursor", "hand")
                .style("font-family", "Segoe UI")
                .style("font-size", "20px")
                .style("font-variant", "small-caps")
                .style("font-weight", "bold")
                .text("?");

            setTimeout(function () { 
				help.svg.selectAll(".antihelp").transition()
					.style("opacity", 1);
				help.remove_help();
				help.shown = false;
				}, 5000);
        };

        ChartHelp.prototype.show_help = function () {
            var help = this;
            this.svg.selectAll(".help").transition()
            .style("opacity", 0.5);
			this.shown = true;
        };

        ChartHelp.prototype.remove_help = function () {
            this.svg.selectAll(".help").transition()
            .style("opacity", 0);
			this.shown = false;
        };

        return ChartHelp;
    })();

    return WebChart;
})();


