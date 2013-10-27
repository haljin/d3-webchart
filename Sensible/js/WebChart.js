var WebChart;
var DAYSLOT = { MORNING: 0, EARLYCLASS: 1, LUNCH: 2, LATECLASS: 3, AFTER: 4 };

WebChart = (function () {
    function WebChart(token) {
        //Main layout fields
        this.vis = null;
        this.width = 1200;
        this.height = 750;
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

        //Web layour fields
        this.web = null;
        this.segments = 16;
        this.levels = 3;
        this.points = this.getPoints((this.width - 100) / 3.5, this.segments, this.levels);
        this.radius_scale;
        this.friendScales;
        this.unusedScales = [];
        this.colorScale = d3.scale.pow().exponent(0.95).range([0.1, 1]);//"#00000000", "#000000FF"]);
        this.strokeScale = d3.scale.pow().exponent(0.95).rangeRound([2, 4]).clamp(true);//"#00000000", "#000000FF"]);
        this.locationDictionary = {};

        //Detailed view layour fields
        this.details = null;
        this.zoomed_loc = {
            x: this.width / 6 + 10,
            y: this.height / 4 + 30
        };
        this.zoomed_radius = 120;
        this.map = null;
        this.bartype = 2;

        //Data fields
        this.token = token;
        this.baseUrl = "http://localhost:5777/Sensible/data"
        this.callData;
        this.smsData;
        this.btData;
        this.nodes = [];
        this.displayedNodes = [];
        this.maxCallScore = 0;
        this.maxSmsScore = 0;
        this.maxBtScore = 0;
        this.totalScore = 0;
        this.maxFriendship = 0;
        this.minFriendship = 0;
        this.createNode = function (id, name) {
            return {
                id: id,
                name: name,
                x: 0,
                y: 0,
                radius: 0,
                value: 0,               //Total score of node
                group: "bt",               //Which group the node belongs to (bt, call, sms)  
                cluster: 0,             //Which cluster within the network the node belongs to
                callScore: 0,           //Score awarded for calls in given timeframe
                smsScore: 0,            //Score awarded for sms in given timeframe
                btScore: 0,             //Score awarded for bt in given timeframe
                nbScores: {},           //Scores for ties between node and other nodes in given timeframe
                callData: [],           //Array with all calls made to that person 
                smsData: [],            //Array with all sms made to that person
                btData: [],             //Array with all bt connections to that person
                nbData: {},             //Dictionary with all bt connections that person made to others (data is array of timestamps)
                totalsData: null,
                binsData: null,
                callStat: 0,            //Total call statistic (sum of call duration)
                smsStat: 0,             //Total sms statistic
                btStat: 0,              //Total bt connection statistic
                friendshipScore: 0,     //Indicate how good of a friend is he
                lastContact: 0,
                friendScale: null,

            }
        }

        //Control fields		
        this.zoomed = false;
        this.clicked = null;
        this.tooltip = CustomTooltip("gates_tooltip", 300);
        this.circles = null;
        this.startTime;
        this.endTime;
        this.mode = 0;
        this.inTransition = false;

        var date = new Date(Date.now());
        var obj = this;
        //TODO: HARDCODED BLAST TO THE PAST
        var starting = new Date(1349958465000)//date.setMonth(date.getMonth() - 7)
                       


        setTimeout(function () {
            obj.load_data(starting, new Date(1369239142000));//Date.now());
        }, 1000);
    };

    /*******************************************************************************/
    /********************** WEB CHART VISUALIZATION ********************************/
    /*******************************************************************************/

    /********************************************************************************
    *   FUNCTION: load_data                                                         *
    *   Load the data for the visualization from the Sensible server                *            
    *   start - start timestamp to load data from                                   *            
    *   end - end timestamp to load data to                                         *
    ********************************************************************************/
    WebChart.prototype.load_data = function (start, end) {
        var chart = this;
        var remaining = 3;
        var runOnce = [false, false, false]; //In Chrome sometimes json would be loaded twice?
        this.startTime = start / 1000;
        this.endTime = end / 1000;
        //Load Call probe data. Load parallel rather than sequential
        d3.json(chart.baseUrl + "/call_log/" + chart.token, function (data) {
            if (!runOnce[0]) {
                runOnce[0] = true;
                chart.callData = data;
                if (! --remaining)
                    chart.create_nodes();
            }
        });
        //Load SMS probe data
        d3.json(chart.baseUrl + "/sms/" + chart.token, function (data) {
            if (!runOnce[1]) {
                runOnce[1] = true;
                chart.smsData = data;
                if (! --remaining)
                    chart.create_nodes();
            }
        });
        //Load Bluetooth probe data
        d3.json(chart.baseUrl + "/bluetooth/" + chart.token, function (data) {
            if (!runOnce[2]) {
                runOnce[2] = true;
                chart.btData = data;
                if (! --remaining)
                    chart.create_nodes();
            }
        });

    };

    /********************************************************************************
    *   FUNCTION: create_nodes                                                      *
    *   Create the data nodes from the loaded data. Perform all pre-computation.    *   
    ********************************************************************************/
    WebChart.prototype.create_nodes = function () {        
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
                if (l.number == extractNumber(d.call.number))
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
                        chart.nodes[namesDict[name]].callData.push({ timestamp: d.timestamp, score: d.call.duration, stat: d.call.duration});
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
                if (l.number == extractNumber(d.message.address))
                    name = l.real_name;
            });
            if (name) {
                var node;
                if (namesDict[name] == undefined) {
                    node = chart.createNode(chart.nodes.length, name);
                    node.smsData.push({ timestamp: d.timestamp, score: 10, stat: 1});
                    chart.nodes.push(node);
                    namesDict[name] = chart.nodes.length - 1;
                }
                else {
                    chart.nodes[namesDict[name]].smsData.push({ timestamp: d.timestamp, score: 10, stat: 1});
                }
            }
        }

        //Parse Bluetooth data
        for (var i = 0; i < chart.btData.length; i++) {
            var d = chart.btData[i];
            var neighbouring = [];
            for(var j = 0; j < d.devices.length; j++) {
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

        var getScales = function () {
            var result = [];
            for (var i = 0 ; i < chart.segments ; i++)
                result.push({
                    scale: d3.scale.linear().domain([chart.minFriendship, chart.maxFriendship]).range([chart.points.byLevel[chart.levels - 1][i], chart.points.byLevel[0][i]]),
                    pointa: chart.points.byLevel[chart.levels - 1][i], pointb: chart.points.byLevel[0][i]
                });
            return result;
        };

        chart.friendScales = getScales();


        chart.update_nodes();
        screen.hide_loading_screen();
        return chart.create_vis();
    };

    /********************************************************************************
    *   FUNCTION: update_nodes                                                      *
    *   Update the data nodes in regards to new displayed time period.              *   
    ********************************************************************************/
    WebChart.prototype.update_nodes = function () {
        var chart = this;        
        var inWorkHours = function (timestamp) {
            var d = new Date(timestamp * 1000);
            if (d.getDay() == 6 || d.getDay() == 5)
                return false;
            var result = DataProcessor.get_timeslot(d);
            return DAYSLOT.EARLYCLASS || DAYSLOT.LATECLASS;
        }       //Helper function to determine whether timestamp is within class hours

        chart.totalScore = 0;
        chart.maxBtScore = 0;
        chart.maxCallScore = 0;
        chart.maxSmsScore = 0;
        chart.maxFriendship = 0;
        chart.minFriendship = 0;
        var max_amount = 0;
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
            for (var j = 0; j < d.callData.length; j++) {
                if (d.callData[j].timestamp > chart.endTime) break;
                if (d.callData[j].timestamp > chart.startTime) {
                    d.callScore += d.callData[j].score;
                    d.callStat += d.callData[j].stat;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.callData[j].score * 0.5 : d.callData[j].score;
                }
            }
            for (var j = 0; j < d.smsData.length; j++) {
                if (d.smsData[j].timestamp > chart.endTime) break;
                if (d.smsData[j].timestamp > chart.startTime) {
                    d.smsScore += d.smsData[j].score;
                    d.smsStat += d.smsData[j].stat;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.smsData[j].score * 0.5 : d.smsData[j].score;
                }
            }
            for (var j = 0; j < d.btData.length; j++) {
                if (d.btData[j].timestamp > chart.endTime) break;
                if (d.btData[j].timestamp > chart.startTime) {
                    d.btScore += d.btData[j].score;
                    d.btStat += d.btData[j].stat;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.btData[j].score * 0.25 : d.btData[j].score;
                }
            }
            
            var scores = [d.callScore, d.smsScore, d.btScore];
            maxIndex = scores.indexOf(Math.max.apply(null, scores));
            d.value = d.callScore + d.smsScore + d.btScore;
            d.group = toLabel[maxIndex];

            chart.totalScore += d.callScore + d.smsScore + d.btScore;
            max_amount = d.value > max_amount ? d.value : max_amount;
            chart.maxBtScore = d.btScore > chart.maxBtScore ? d.btScore : chart.maxBtScore;
            chart.maxCallScore = d.callScore > chart.maxCallScore ? d.callScore : chart.maxCallScore;
            chart.maxSmsScore = d.smsScore > chart.maxSmsScore ? d.smsScore : chart.maxSmsScore;
            chart.maxFriendship = d.friendshipScore > chart.maxFriendship ? d.friendshipScore : chart.maxFriendship;
            chart.minFriendship = d.friendshipScore < chart.minFriendship ? d.friendshipScore : chart.minFriendship;
        }        

        //Update scales
        chart.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([10, 50]);
        chart.friendScales.forEach(function (d) {
            d.scale = d3.scale.linear().domain([chart.minFriendship, chart.maxFriendship]).range([d.pointa, d.pointb]);
        });

        chart.nodes.sort(function (a, b) {
            return b.value - a.value;
        });     

        //Cut off the top 16 nodes, less if there would be nodes of value 0
        var slice = 0
        for (var i = 0; i < 16; i++) {
            if (chart.nodes[i].value == 0) break;
            slice = i+1;
        }
        chart.displayedNodes = chart.nodes.slice(0, slice);

        for (var i = 0; i < chart.displayedNodes.length; i++) {
            var d = chart.displayedNodes[i];
            d.radius = chart.radius_scale(d.value)
            var parsed = DataProcessor.parse_totals_data(d.callData, d.smsData, d.btData, chart.startTime, chart.endTime);
            d.nbScores = DataProcessor.parse_nb_data(d, chart.displayedNodes, chart.startTime, chart.endTime);
            d.totalsData = parsed.totals;
            d.binsData = parsed.bins;
        }

        var clusters = clusterfck.hcluster(webchart.displayedNodes, function (a, b) { return 1 / a.nbScores[b.name] }, clusterfck.AVERAGE_LINKAGE)
        for (var i = 0; i < clusters.length; i++) {
            chart.parseClusters(clusters[i], i);
        }
        chart.displayedNodes = chart.placeGreedy();
        
        chart.displayedNodes.forEach(function (d, i) {
            d.friendScale = chart.friendScales[i];
            chart.locationDictionary[d.name] = { x: d.friendScale.scale(d.friendshipScore).x, y: d.friendScale.scale(d.friendshipScore).y};
        });


        //If the node that was zoomed disappeared from main vis, we need to calculate its deteailed data additionaly
        if (chart.zoomed) {
            var d = chart.clicked;
            var parsed = DataProcessor.parse_totals_data(d.callData, d.smsData, d.btData, chart.startTime, chart.endTime);
            d.totalsData = parsed.totals;
            d.binsData = parsed.bins;
        }
    };

    /********************************************************************************
    *   FUNCTION: create_vis                                                        *
    *   Draw the visualization itself, the first time it is displayed.              *   
    ********************************************************************************/
    WebChart.prototype.create_vis = function () {
        var chart = this;
        if (d3.select("#svg_vis").empty())
            this.vis = d3.select("#vis").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_vis").style("display", "inline-block").append("g").attr("id", "WebChart");
        else
            this.vis = d3.select("#svg_vis").append("g").attr("id", "WebChart");

        //In case no data has been loaded - error text
        if (!this.nodes.length) {
            this.vis.append("text")
            .attr("x", chart.center.x - 190)
            .attr("y", chart.center.y)
            .attr("size", 20)
            .style("font-family", "\"Segoe UI\", \"Segoe UI Web Regular\",\"Segoe UI Symbol\",\"Helvetica Neue\",\"BBAlpha Sans\",\"S60 Sans\",Arial,\"sans-serif\"")
		    .style("font-size", "30px")
		    .style("font-variant", "small-caps")
            .style("text-transform ", "uppercase")
            .text("No data for selected time period");
            return;
        }

        this.web = this.vis.append("g").attr("id", "Web");
        this.details = this.vis.append("g").attr("id", "Details");
        this.circles = this.web.selectAll("circle").data(this.displayedNodes, function (d) {
            return d.id;
        });
        this.web.attr("transform", "translate(" + chart.center.x + ", " + (chart.center.y) + ")").on("click", function (d, i) {
            if (!chart.inTransition)
                if (chart.zoomed) {
                    chart.inTransition = true;
                    return chart.unzoom_circle();
                }
        });
        //Clicking mask for unzoom
        this.web.append("rect").attr("x", -400).attr("y", -400).attr("height", 800).attr("width", 800).style("fill", "#ffffff");


        //Draw the help button
        var button,
            button_text,
            help = false;
        var group = this.details.append("g")
        .attr("id", "button-help")
		.on("click", function () {
		    if(help==false && !chart.zoomed)
		    {
		        chart.zoomed = true;
		        Help.draw_help();

		        help = true;
		        button_text.text("x");
		    }
		    else if (help == true)
		    {
		        chart.zoomed = false;
		        Help.undraw_help();
		        help = false;
		        button_text.text("?");
		    }
		})
		.on("mouseover", function () {
		    button.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button.attr("fill", "#dddddd");
		});

        button = group.append("rect")
            .attr("x", chart.width - 30)
            .attr("y", 10)
            .attr("width", 30)
            .attr("height", 30)
            .attr("fill", "#dddddd")
            .attr("stroke", "#aaaaaa")
            .attr("stroke-width", 0.25);

        button_text = group.append("text")
		.attr("x", chart.width - 20)
		.attr("y", 30)
		.style("cursor", "hand")
		.style("font-family", "Segoe UI")
		.style("font-size", "20px")
		.style("font-variant", "small-caps")
		.style("font-weight", "bold")
		.text("?");

    
        //Draw the web circles  
        //for (level = 0; level < chart.levels; level++) {
        //    for (j = 0; j < chart.segments; j++) {
        //        var point = chart.points.byLevel[level][j]
        //        var nextIdx = j + 1 < chart.segments ? j + 1 : 0;
        //        var nextPoint = chart.points.byLevel[level][nextIdx];
        //        var nextPoint1Control = { x: 0, y: 0 }, nextPoint2Control = { x: 0, y: 0 };
        //        var getRandomArbitary = function (min, max) {
        //            return Math.random() * (max - min) + min;
        //        }
        //        nextPoint1Control.x = point.x * getRandomArbitary(0.85, 0.97);
        //        nextPoint1Control.y = point.y * getRandomArbitary(0.85, 0.97);
        //        nextPoint2Control.x = nextPoint.x * getRandomArbitary(0.85, 0.97);
        //        nextPoint2Control.y = nextPoint.y * getRandomArbitary(0.85, 0.97);

        //        this.web.append("path")
        //            .attr("d", " M " + point.x + "," + point.y + " C " + nextPoint1Control.x + "," + nextPoint1Control.y + " "
        //            + nextPoint2Control.x + "," + nextPoint2Control.y + " " + nextPoint.x + "," + nextPoint.y)
        //            .attr("fill", "none")
        //            .style("stroke", "#055");
        //    }
        //}
        //Draw the web radial lines
        for (segment = 0; segment < chart.segments; segment++) {
            console.debug(chart.points.bySegment[segment]);
            var start = chart.points.bySegment[segment][0];
            var end = chart.points.bySegment[segment][chart.levels];
            this.web.append("path")
                .attr("d", "M" + start.x + " " + start.y + " L " + end.x + " " + end.y)
                .style("stroke-dasharray", "15 5")
                .style("stroke", "#000")
            .attr("opacity", 0.5);
        }
        chart.web.append("image")
            .attr("id", "userAvatarMain")
            .attr("xlink:href", "data/unknown-person.gif")
            .attr("x", -60)
            .attr("y", -100)
            .attr("width", 120)
            .attr("height", 200);

        this.circles.enter().append("circle")
            .attr("r", 0)
            .attr("fill", function (d) {
                //return chart.clusterColors[d.cluster];
                return chart.colors[d.group];
            })
            .attr("stroke-width", 2).attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker();
            }).attr("id", function (d) {
                return "bubble_" + d.id;
            }).attr("cx", function (d, i) {
                d.x = d.friendScale.scale(chart.minFriendship).x
                return d.x;
            })
            .attr("cy", function (d, i) {
                d.y = d.friendScale.scale(chart.minFriendship).y
                return d.y;
            })
            .on("mouseover", function (d, i) {
                var connected = [d.name];
                chart.web.selectAll(".connection").transition().duration(500)
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
                chart.web.selectAll("circle").transition().duration(500)
                .attr("opacity", function (circle) {
                    if (connected.indexOf(circle.name) > -1)
                        return 1;
                    else
                        return 0.05;
                });
                return chart.show_details(d, i, this);
            }).on("mouseout", function (d, i) {
                chart.web.selectAll(".connection").transition().duration(500)
                    .attr("stroke-width", function (c) {
                        return chart.strokeScale(c.score) + "px";
                    });
                chart.web.selectAll("circle").transition().duration(500)
                .attr("opacity", function (circle) {
                    return 1;                    
                });
                return chart.hide_details(d, i, this);
            }).on("click", function (d, i) {
                if (!chart.inTransition && !chart.zoomed) {
                    chart.inTransition = true;
                    chart.hide_details(d, i, this);
                    return chart.zoom_circle(d);
                }
            });

        return this.circles.transition().duration(500).attr("r", function (d) {
            return d.radius;
        })
        .each("end", function () {
            chart.circles.transition().duration(500).attr("cx", function (d, i) {
                d.x = d.friendScale.scale(d.friendshipScore).x
                return d.x;
            })
            .attr("cy", function (d, i) {
                d.y = d.friendScale.scale(d.friendshipScore).y
                return d.y;
            })
            .each("end", function () {
                //Reset pre-existing connections
                chart.web.selectAll(".connection").remove();

                chart.draw_connections();
            });
        });        
    };
   
    /********************************************************************************
    *   FUNCTION: update_vis                                                        *
    *   Update the drawn visualization, based on the time period change.            *   
    ********************************************************************************/
    WebChart.prototype.update_vis = function () {
        var chart = this;
        if(chart.zoomed)
            var oldtotals = this.clicked.totalsData;

        this.update_nodes();
        //Rescale the scales
        //this.friendScales.forEach(function (d) {
        //    d.scale = d3.scale.linear().domain([chart.minFriendship, chart.maxFriendship]).range([d.pointa, d.pointb]);
        //});
        this.circles = this.web.selectAll("circle").data(chart.displayedNodes, function (d) {
            return d.id;
        });
        this.circles.exit().transition().duration(500).attr("r", 0).remove();
        //Reset pre-existing connections
        this.web.selectAll(".connection").remove();
      

        chart.circles.enter().append("circle")
            .attr("r", 0)
            .attr("fill", function (d) {
                //return chart.clusterColors[d.cluster];
                return chart.colors[d.group];
            })
            .attr("stroke-width", 2).attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker();
            }).attr("id", function (d) {
                return "bubble_" + d.id;
            }).attr("cx", function (d, i) {
                d.x = d.friendScale.scale(chart.minFriendship).x
                return d.friendScale.scale(chart.minFriendship).x;
            })
            .attr("cy", function (d, i) {
                d.y = d.friendScale.scale(chart.minFriendship).y
                return d.friendScale.scale(chart.minFriendship).y;
            })
             .on("mouseover", function (d, i) {
                var connected = [d.name];
                chart.web.selectAll(".connection").transition().duration(500)
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
                chart.web.selectAll("circle").transition().duration(500)
                .attr("opacity", function (circle) {
                    if (connected.indexOf(circle.name) > -1)
                        return 1;
                    else
                        return 0.05;
                });
                return chart.show_details(d, i, this);
            }).on("mouseout", function (d, i) {
                chart.web.selectAll(".connection").transition().duration(500)
                    .attr("stroke-width", function (c) {
                        return chart.strokeScale(c.score) + "px";
                    });
                chart.web.selectAll("circle").transition().duration(500)
                .attr("opacity", function (circle) {
                    return 1;                    
                });
                return chart.hide_details(d, i, this);
            }).on("click", function (d, i) {
                if (!chart.inTransition && !chart.zoomed) {
                    chart.inTransition = true;
                    chart.hide_details(d, i, this);
                    return chart.zoom_circle(d);
                }
            });

        chart.circles.transition().duration(500)
            .attr("r", function (d) {
                return d.radius; })
            .each("end", function () {
                chart.circles.transition().duration(500)
                    .attr("cx", function (d) {
                        d.x = d.friendScale.scale(d.friendshipScore).x;
                        return d.friendScale.scale(d.friendshipScore).x; })
                    .attr("cy", function (d) {
                        d.y = d.friendScale.scale(d.friendshipScore).y
                        return d.friendScale.scale(d.friendshipScore).y; })
                    .attr("fill", function (d) {
                        if (chart.zoomed)
                            return d3.rgb(chart.colors[d.group]).darker().darker().darker();
                        else
                            //return chart.clusterColors[d.cluster];
                        return chart.colors[d.group]; 
                    })
                    .attr("stroke", function (d) {
                        return d3.rgb(chart.colors[d.group]).darker();
                    })
                .each("end", function () {
                    chart.draw_connections();
                });
            });     




        if (this.zoomed) {
            //Update zoomed views
            this.update_pie_chart();
            this.update_barschart();
            this.undraw_multichart();
            this.draw_multichart(chart.clicked);
            this.map.undraw_points();
            this.details.append("g").attr("id", "map");
            setTimeout(function () {
                chart.map.draw_points(chart.startTime, chart.endTime);
            }, 2500);
            chart.details.select("#numberOfConnectionsCall")
                           .text(function () {
                               var content = "";
                               var rest;
                               var hours = Math.floor(chart.clicked.callStat / 3600);
                               rest = chart.clicked.callStat % 3600;
                               var minutes = Math.floor(rest / 60);
                               rest = rest % 60;
                               content += hours;
                               if (minutes < 10)
                                   content += ":0" + minutes;
                               else
                                   content += ":" + minutes;
                               if (rest < 10)
                                   content += ":0" + rest + " time in call";
                               else
                                   content += ":" + rest + " time in call";
                               return content;
                           });

            chart.details.select("#numberOfConnectionsSms")
                .text(function () {
                    return chart.clicked.smsStat + " messages";
                });

            chart.details.select("#numberOfConnectionsBt")
             .style("font-variant", "small-caps")
             .text(function () {
                 return chart.clicked.btStat + " connections";
             });
        }


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
        

        this.web.selectAll(".connection").data(chart.getConnections(chart.displayedNodes)).enter()
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
            var parallel = { x: nextPoint.y - point.y, y: nextPoint.x - point.x };
            var dist = eucDist(nextPoint, point);
            parallel.x /= dist;
            parallel.y /= dist;
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
            //    chart.web.selectAll(".debug").data([1]).enter().append("circle").attr("cx", midPoint.x).attr("cy", midPoint.y).attr("r",5).attr("fill", "#FF0000");
            //else
            //    chart.web.selectAll(".debug").data([1]).enter().append("circle").attr("cx", midPoint2.x).attr("cy", midPoint2.y).attr("r",5).attr("fill", "#0000FF");


            return " M " + point.x + "," + point.y + " C " + nextPoint1Control.x + "," + nextPoint1Control.y + " "
                        + nextPoint2Control.x + "," + nextPoint2Control.y + " " + nextPoint.x + "," + nextPoint.y;
        })
        .transition().duration(500).attr("opacity", function (d) { 
            
            return chart.colorScale(d.score);; });
        //Put circles on top
        this.vis.select("#userAvatarMain").each(function () {
            this.parentNode.appendChild(this);
        });
        this.web.selectAll("circle").each(function () {
            this.parentNode.appendChild(this);
        });

    };

    /*******************************************************************************/
    /********************** DETAILS VISUALIZATIONS* ********************************/
    /*******************************************************************************/

    /********************************************************************************
    *   FUNCTION: zoom_circle                                                       *
    *   Zoom in the clicked circle.                                                 *
    ********************************************************************************/
    WebChart.prototype.zoom_circle = function (d) {
        var chart = this;
        chart.zoomed = true;
        var other_circles = this.circles;
        var new_circle = this.details.selectAll("circle")
						.data([{ id: "circle-zoomed" }], function (d) {
						    return d.id;
						})
						.enter();
        this.clicked = d;


        //Darken other circles
        other_circles.transition().duration(1000)
            .attr("fill", function (d) {
                return d3.rgb(chart.colors[d.group]).darker().darker().darker();
            })
            .attr("stroke-width", 2)
            .attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker().darker().darker().darker();
            });

        //Zoom out the rest of the visualization
        this.web.transition().duration(1000)
        .attr("transform", function (d) {
            return "translate(70,50) scale(0.15)";
        });

        //Create new zoomed circle
        return new_circle.append("circle").attr("r", 10).attr("id", "circle-zoomed")
		.attr("cx", d.x)
		.attr("cy", d.y)
		.attr("fill", chart.colors[d.group])
		.attr("stroke-width", 2)
		.attr("stroke", d3.rgb(chart.colors[d.group]).darker())
        .attr("transform", "translate(" + chart.center.x + ", " + chart.center.y + ")")
		.transition()
		.ease("elastic")
        .attr("transform", "translate(0,0)")
		.attr("cx", this.zoomed_loc.x)
		.attr("cy", this.zoomed_loc.y)
		.duration(1000)
		.attr("r", chart.zoomed_radius)
		.each('end', function () {
		    if (chart.zoomed)
		        chart.draw_details(d);
		});
    };

    /********************************************************************************
    *   FUNCTION: unzoom_circle                                                     *
    *   Destroy the details visualizations and unzoom circle.                       *
    ********************************************************************************/
    WebChart.prototype.unzoom_circle = function () {
        var chart = this;
        var other_circles = this.circles;
        var new_circle = this.vis.selectAll("#circle-zoomed");

        this.map.undraw_map();
        chart.undraw_barschart();
        chart.undraw_multichart();

        //Lighten other circles
        other_circles.transition().duration(1000).attr("fill", function (d) {
            return d3.rgb(chart.colors[d.group]);
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.colors[d.group]).darker();
        });

        this.web.transition().duration(1000)
        .attr("transform", function (d) {
            return "translate(" + chart.center.x + ", " + (chart.center.y) + ") scale(1)";
        });
        chart.details.select("#numberOfConnectionsCall").remove();
        chart.details.select("#numberOfConnectionsSms").remove();
        chart.details.select("#numberOfConnectionsBt").remove();
        //Destroy the pie chart, unzoom the circle
        chart.undraw_pie_chart().each('end', function () {
            new_circle
			.transition()
            .attr("transform", "translate(" + chart.center.x + ", " + chart.center.y + ")")
			.attr("cx", chart.clicked.x)
			.attr("cy", chart.clicked.y)
			.attr("r", 0)
			.duration(1000)
			.each('start', function () {
			    chart.vis.selectAll("#pie").remove();
			    chart.vis.selectAll("#button-unzoom").remove();
			})
			.each('end', function () {
			    new_circle.remove();
			    chart.zoomed = false;
			    chart.inTransition = false;
			});
        });

    };

    /********************************************************************************
    *   FUNCTION: draw_details                                                      *
    *   Draw the details visualizations                                             *
    ********************************************************************************/
    WebChart.prototype.draw_details = function (d) {
        this.map = new MapView(d);

        this.details.append("g").attr("id", "map");


        this.map.draw_map(this.token, this.startTime, this.endTime);
        this.draw_multichart(d);
        this.draw_barschart(d);
        this.draw_pie_chart(d);
    };

    WebChart.prototype.draw_barschart = function (d) {
        var chart = this;
        var type = chart.bartype;

        var g = chart.details.append("g").attr("id", "barschart").attr("transform", "translate(565,460)");//**

        var width = 600,
            height = 200;
        var data = d.binsData;
        var toLabel = ["call", "sms", "bt"];

        var parseDate = d3.time.format("%Y%m%d").parse;
        var width = 600,
            height = 200;

        var x0 = d3.scale.ordinal()
            .rangeRoundBands([0, width], .1);

        var x1 = d3.scale.ordinal();

        var y = d3.scale.linear()
            .range([height, 0]);
        var color = chart.colors[toLabel[type]];
        var colors = d3.scale.ordinal()
            .range([d3.rgb(color).darker().darker().darker(), d3.rgb(color).darker().darker(),
                d3.rgb(color).darker(),color, d3.rgb(color).brighter(0.8)]);

        var xAxis = d3.svg.axis()
            .scale(x0)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .tickFormat(d3.format(".2s"));
        var hourNames = ["00:00-08:00", "08:00-12:00", "12:00-13:00", "13:00-17:00", "17:00-00:00"];
        x0.domain(data[type].map(function (d) { return d.day; }));
        x1.domain(hourNames).rangeRoundBands([0, x0.rangeBand()]);//buckets
        y.domain([0, 1]);// d3.max(data[type], function (d) { return d3.max(d.slots, function (v) { return v.count; }); })]);

        g.append("g")
        .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        g.append("g")
        .attr("class", "Label name")
          .append("text")
            .attr("y", -6)
            .attr("x",230)
            .text("Comunication by time of day").attr("font-weight","bold");

        g.append("g")
        .attr("class", "y axis")
            .call(yAxis);
        var day = g.selectAll(".day")
            .data(data[type])
          .enter().append("g")
            .attr("class", "day")
            .attr("transform", function (d) { return "translate(" + x0(d.day) + ",0)"; });

        day.selectAll("rect")
            .data(function (d) { return d.slots; })
          .enter().append("rect")
            .attr("width", x1.rangeBand())
            .attr("x", function (d) { return x1(d.time); })
            .attr("y", height)
            .attr("height","0")
            .style("fill", function (d) { return colors(d.time); }).transition().duration(750)
      .delay(0)
      .attr("height", function (d) { return height - y(d.count); })
        .attr("y", function (d) {
            return y(d.count);
        });

        var legend = g.selectAll(".legend")
            .data(hourNames.slice())
          .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) { return "translate(" + (-450+i * 100) + ",230)"; });//**

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colors);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function (d) { return d; });

        var buttons = g.selectAll(".barbutton").data([0, 1, 2]).enter()
            .append("g")
            .attr("class", "barbutton")
            .on("mouseover", function (d) {
                d3.select(this).select("polyline").style("stroke-width", "3px");
                d3.select(this).select("rect").style("stroke-width", "1px").style("fill", "#dddddd");
            })
            .on("mouseout", function (d) {
                d3.select(this).select("polyline").style("stroke-width", "2px");
                d3.select(this).select("rect").style("stroke-width", "0px").style("fill",
                    function (d) { if (d == type) return "#eeeeee"; else return "#ffffff" });
            })
            .on("click", function (x) { 
                if (x != type) {
                    chart.undraw_barschart();
                    chart.bartype = x;
                    chart.draw_barschart(d);

                }
            });

        buttons.append("rect")
            .attr("x",601 )
            .attr("y", function (d, i) { return 36+ i * 37; })
            .attr("width", 31)
            .attr("height", 31)
            .style("fill", function (d) { if (d == type) return "#eeeeee"; else return "#ffffff"; });
        buttons.append("polyline")
            .attr("transform", function (d, i) {
                switch (i) {
                    case 0:
                        return "translate(605, 40)";
                    case 1:
                        return "translate(605, 80)";
                    case 2:
                        return "translate(609, 115)";
                }
            })
            .attr("stroke", function (d, i) {
                return chart.colors[toLabel[i]];
            })
            .style("stroke-width", "2px")
           .style("fill", "none")
            .attr("points", function (d, i) {
                return chart.shapes[toLabel[i]];
            });
    };

    WebChart.prototype.update_barschart = function () {
        var chart = this;
        var data = chart.clicked.binsData;
        var height = 200;
        var y = d3.scale.linear()
            .range([height, 0]);

        chart.details.select("#barschart").selectAll(".day")
            .data(data[chart.bartype])
            .selectAll("rect")
            .data(function (d) { return d.slots; })
            .transition().duration(750)
        .attr("height", function (d) { return height - y(d.count); })
        .attr("y", function (d) {
            return y(d.count);
        });
    };

    WebChart.prototype.undraw_barschart = function () {
        return this.details.select("#barschart").remove();
    };

    WebChart.prototype.draw_multichart = function (d) {
        var chart = this;
        var g = chart.details.append("g").attr("id", "totalschart").attr("transform", "translate(565,170)");//**
        var toLabel = ["call", "sms", "bt"];
        var data = d.totalsData;
        var width = 600,
        height = 200;

        var x = d3.time.scale()
            .range([0, width]).domain([new Date(chart.startTime * 1000), new Date(chart.endTime * 1000)]);//d3.extent(data[0], function (d) { return d.date; }));

        var y = d3.scale.linear()
            .range([height, 0]).domain([
            d3.min(data, function (c) { return d3.min(c, function (v) { return v.count; }); }),
            d3.max(data, function (c) { return d3.max(c, function (v) { return v.count; }); })
            ]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function (d) { return x(d.date); })
            .y(function (d) { return y(d.count); });

        g.append("g")
       .attr("class", "Label name")
         .append("text")
           .attr("y", -6)
           .attr("x", 235)
           .text("Amount of connection").attr("font-weight", "bold");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        g.append("g")
            .attr("class", "y axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Total count");
        g.append("clipPath").attr("id", "clipChart").append("rect").attr("x", 0).attr("y", 0).attr("width", 0).attr("height", height)
            .transition().duration(1000).attr("width", width);

        var totalsPaths = g.append("g").attr("id", "totalsPaths").selectAll(".contact")
            .data(data)
          .enter().append("g")
            .attr("class", "contact").attr("clip-path", "url(#clipChart)");

        totalsPaths.append("path")
            .attr("class", "line")
            .attr("d", function (d) {
                return line(d);
            })
            .style("stroke", function (d, i) {
                return chart.colors[toLabel[i]];
            })

        .style("stroke-width", "2px")//--
        .style("fill", "none");
    };

    WebChart.prototype.update_multichart = function (olddata) {
        var chart = this;
        var data = chart.clicked.totalsData;
        var width = 600,
        height = 200;

        var x = d3.time.scale()
            .range([0, width]).domain([new Date(chart.startTime * 1000), new Date(chart.endTime * 1000)]);//d3.extent(data[0], function (d) { return d.date; }));

        var y = d3.scale.linear()
            .range([height, 0]).domain([
            d3.min(data, function (c) { return d3.min(c, function (v) { return v.count; }); }),
            d3.max(data, function (c) { return d3.max(c, function (v) { return v.count; }); })
            ]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        var line = d3.svg.line()
            .interpolate("basis")
            .x(function (d) { return x(d.date); })
            .y(function (d) { return y(d.count); });


        var paths = chart.details.select("#totalsPaths").selectAll(".contact").data(data).selectAll(".line").transition().duration(750)
        .attrTween("d", function (data, i) {
            var interpolation = d3.interpolate(olddata[i], data);
            //this._current = interpolation(0);
            return function (t) {
                return line(interpolation(t));
            };
        });
    };

    WebChart.prototype.undraw_multichart = function () {
        return this.details.select("#totalschart").remove();
    };

    WebChart.prototype.draw_pie_chart = function (d) {
        var chart = this;
        var data = [{ value: d.callScore, label: "Calls" }, { value: d.smsScore, label: "Sms" }, { value: d.btScore, label: "Bluetooth" }];
        if (d.value == 0) data = [{ value: 1, label: "Calls" }, { value: 1, label: "Sms" }, { value: 1, label: "Bluetooth" }];
        var arc = d3.svg.arc()
            .outerRadius(chart.zoomed_radius)
            .innerRadius(chart.zoomed_radius - 40);
        var pie = d3.layout.pie()
            .sort(null)
            .value(function (d) { return d.value; });
        var toLabel = ["call", "sms", "bt"]

        var svg = chart.details
            .append("g")
            .attr("transform", "translate(" + this.zoomed_loc.x + "," + this.zoomed_loc.y + ")")
            .attr("id", "pie");

        var g = svg.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .attr("id", "piechart")
            .style("fill", function (d, i) {
                return chart.colors[toLabel[i]];
            })
            .attr("stroke", function (d, i) {
                return d3.rgb(chart.colors[toLabel[i]]).darker();
            })
            .style("stroke-width", "2px")
            .transition().duration(500).attrTween("d", function (data) {
                var interpolation = d3.interpolate({ startAngle: 0, endAngle: 0 }, data);
                this._current = interpolation(0);
                return function (t) {
                    return arc(interpolation(t));
                };
            })
            .each("end", function () {
                this._listenToEvents = true;
                chart.inTransition = false;
            });

        //Draw the symbols
        g.append("polyline")
            .attr("transform", function (d) {
                return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 30) +
                    "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 30) + ")";
            })
            .attr("stroke", function (d, i) {
                return chart.colors[toLabel[i]];
            })
            .attr("class", "symbol")
            .style("stroke-width", "2px")
            .style("fill", "none")
            .attr("points", function (d, i) {
                return chart.shapes[toLabel[i]];
            });

        var paths = g.selectAll("path");
        var text_scale = d3.scale.pow().domain([33, 50]).range([50, 30]).clamp(true);

        chart.details.append("image")
            .attr("id", "userAvatar")
            .attr("xlink:href", "data/unknown-person.gif")
            .attr("x", 160)
            .attr("y", 130)
            .attr("width", 100)
            .attr("height", 180);

        chart.details.append("text")
            .attr("x", 400)
            .attr("id", "userName")
            .attr("y", 60)
            .style("font-family", "Segoe UI")
            .style("font-variant", "small-caps")
            .text(function () { return chart.clicked.name; })
            .style("font-size", text_scale(chart.clicked.name.length));

        chart.details.append("text")
                       .attr("x", function (d) { return (400 + (chart.clicked.name.length * 18) / 2) - 150; })
                       .attr("id", "numberOfConnectionsCall")
                       .attr("y", 80)
                       .style("font-family", "Segoe UI")
                       .style("font-size", "15px")
                       .style("font-variant", "small-caps")
                       .text(function () {
                           var content = "";
                           var rest;
                           var hours = Math.floor(chart.clicked.callStat / 3600);
                           rest = chart.clicked.callStat % 3600;
                           var minutes = Math.floor(rest / 60);
                           rest = rest % 60;
                           content += hours;
                           if (minutes < 10)
                               content += ":0" + minutes;
                           else
                               content += ":" + minutes;
                           if (rest < 10)
                               content += ":0" + rest + " time in call";
                           else
                               content += ":" + rest + " time in call";
                           return content;                           
                       });

        chart.details.append("text")
            .attr("x", function (d) { return (400 + (chart.clicked.name.length * 18) / 2); })
            .attr("id", "numberOfConnectionsSms")
            .attr("y", 80)
            .style("font-family", "Segoe UI")
            .style("font-size", "15px")
            .style("font-variant", "small-caps")
            .text(function () {
                return chart.clicked.smsStat + " messages";   
            });

        chart.details.append("text")
         .attr("x", function (d) { return (400 + (chart.clicked.name.length * 18) / 2) +100; })
         .attr("id", "numberOfConnectionsBt")
         .attr("y", 80)
         .style("font-family", "Segoe UI")
         .style("font-size", "15px")
         .style("font-variant", "small-caps")
         .text(function () {
             return chart.clicked.btStat + " connections";
         });

        paths
            .on("mouseover", function (d) {
                if (this._listenToEvents) {
                    // Calculate angle bisector
                    var ang = d.startAngle + (d.endAngle - d.startAngle) / 2;
                    // Transformate to SVG space
                    ang = (ang - (Math.PI / 2)) * -1;
                    d3.select(this).transition()
                        .duration(150).attr("transform", "scale(1.2,1.2)");
                    chart.details.selectAll(".symbol").transition().duration(150).attr("transform", function (d) {
                        return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 50) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 45) + ")";
                    });
                    if (d.data.label == "Calls")
                        chart.details.select("#numberOfConnectionsCall").style("font-weight", "bold");
                    else if (d.data.label == "Sms")
                        chart.details.select("#numberOfConnectionsSms").style("font-weight", "bold");
                    else if (d.data.label == "Bluetooth")
                        chart.details.select("#numberOfConnectionsBt").style("font-weight", "bold");
                }
            })
            .on("mouseout", function (d) {
                if (this._listenToEvents) {
                    d3.select(this).transition()
                    .duration(150).attr("transform", "scale(1,1)");

                    chart.details.selectAll(".symbol").transition().duration(150).attr("transform", function (d) {
                        return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 30) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 30) + ")";
                    });
                    chart.details.selectAll("#" + d.data.label)
                    .attr("stroke-width", 1)
                    .attr("r", 5)
                    .style("font-weight", "normal");
                    chart.details.select("#numberOfConnectionsCall").style("font-weight", "normal");
                    chart.details.select("#numberOfConnectionsSms").style("font-weight", "normal");
                    chart.details.select("#numberOfConnectionsBt").style("font-weight", "normal");
                }
            });

        //Draw the unzoom button
        var button, button_text;
        var group = this.details.append("g")
        .attr("id", "button-unzoom")
		.on("click", function () {
		    chart.unzoom_circle();
		})
		.on("mouseover", function () {
		    button.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button.attr("fill", "#dddddd");
		});

        button = group.append("rect")
            .attr("x", chart.width - 30)
            .attr("y", 10)
            .attr("width", 30)
            .attr("height", 30)
            .attr("fill", "#dddddd")
            .attr("stroke", "#aaaaaa")
            .attr("stroke-width", 0.25);

        button_text = group.append("text")
		.attr("x", chart.width - 20)
		.attr("y", 30)
		.style("cursor", "hand")
		.style("font-family", "Segoe UI")
		.style("font-size", "20px")
		.style("font-variant", "small-caps")
		.style("font-weight", "bold")
		.text("x");
    };

    WebChart.prototype.update_pie_chart = function () {
        var chart = this;
        var newpie = [{ value: chart.clicked.callScore, label: "Calls" }, { value: chart.clicked.smsScore, label: "Sms" }, { value: chart.clicked.btScore, label: "Bluetooth" }];
        if (chart.clicked.value == 0) newpie = [{ value: 1, label: "Calls" }, { value: 1, label: "Sms" }, { value: 1, label: "Bluetooth" }];
        var pie = d3.layout.pie()
       .sort(null)
       .value(function (d) { return d.value; });

        var arc = d3.svg.arc()
        .outerRadius(chart.zoomed_radius)
        .innerRadius(chart.zoomed_radius - 40);

        chart.vis.selectAll("#piechart").data(pie(newpie)).transition()
        .duration(500)
        .attrTween("d", function (data) {
            var interpolation = d3.interpolate(this._current, data);
            this._current = interpolation(0);
            return function (t) {
                return arc(interpolation(t));
            };
        })

        chart.details.selectAll(".symbol").data(pie(newpie))
            .transition()
            .duration(500)
           .attr("transform", function (d,i) {
               return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 30) +
                   "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 30) + ")";
           });


    };

    WebChart.prototype.undraw_pie_chart = function () {
        var chart = this;
        var arc = d3.svg.arc()
		.outerRadius(chart.zoomed_radius)
		.innerRadius(chart.zoomed_radius - 40);
        var g = chart.vis.selectAll("#piechart");

        chart.vis.selectAll("#userAvatar").remove();
        chart.vis.selectAll("#userName").remove();
        return g.transition()
		.duration(500)
		.attrTween("d", function (data) {
		    data.startAngle = data.endAngle = (2 * Math.PI);
		    var interpolation = d3.interpolate(this._current, data);
		    this._current = interpolation(0);
		    return function (t) {
		        return arc(interpolation(t));
		    };
		})
		.remove();
    };

    WebChart.prototype.show_details = function (data, i, element) {
        if (!this.zoomed) {
            var content;
            var rest;
            var hours = Math.floor(data.callStat / 3600);
            rest = data.callStat % 3600;
            var minutes = Math.floor(rest / 60);
            rest = rest % 60;
            d3.select(element).attr("stroke", "black");
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
        var chart = this;
        if (!this.zoomed) {
            d3.select(element).attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker();
            });
        }
        return this.tooltip.hideTooltip();
    };

    /*******************************************************************************/
    /*************************** HELPER FUNCTIONS  *********************************/
    /*******************************************************************************/
    WebChart.prototype.getPoints = function (radius, segments, levels) {
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
                    x: r * Math.cos(theta),
                    y: r * Math.sin(theta),
                    level: i
                };
                point2 = {
                    r: r * randomnumber,
                    theta: theta,
                    x: (r + randomnumber) * Math.cos(theta),
                    y: (r + randomnumber) * Math.sin(theta),
                    level: i
                };
                points.all.push(point);
                points.byLevel[i].push(point2);
                points.bySegment[j].push(point);
            }
        }
        return points;
    };

    WebChart.prototype.parseClusters = function (cluster, number) {
        var node = cluster;
        var stack = [];

        stack.push(cluster);
        while (stack.length != 0) {
            var curr = stack.pop();
            if(curr.left == undefined && curr.right == undefined)
            {
                curr.canonical.cluster = number;
            }
            else
            {
                stack.push(curr.left);
                stack.push(curr.right);
            }
        }
    };

    WebChart.prototype.placeGreedy = function () {
        var positions = [];
        var chart= this; 
        var minPlacement = { index: 0, force: 0 };

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

    WebChart.prototype.placeClusters = function () {
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
            for (cut = 0; cut < conns.length; cut++) 
                if (conns[cut].score < avg) break;
            conns = conns.splice(0, cut);
            //for (var i = 0; i < conns.length; i++) {
            //    if (conns[i].score < avg)
            //        conns[i].score = 0;
                
            //}

            chart.colorScale.domain([avg, maxNbScore]);
            chart.strokeScale.domain([avg, maxNbScore]);

        }
        return conns;
    };


    return WebChart;
})();

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function () {
    webchart = null;

    webchart = new WebChart(token);
    timeline = new Timeline(token);
    screen = new LoadingScreen(1200 / 2, 750 / 2);

    return screen.show_loading_screen();
});

