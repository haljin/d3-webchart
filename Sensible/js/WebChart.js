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

        //Web layour fields
        this.web = null;
        this.segments = 16;
        this.levels = 3;
        this.points = this.getPoints((this.width - 100) / 3.5, this.segments, this.levels);
        this.radius_scale;

        //Detailed view layour fields
        this.details = null;
        this.zoomed_loc = {
            x: this.width / 6 + 10,
            y: this.height / 4 + 30
        };
        this.zoomed_radius = 120;
        this.map = null;

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
        this.createNode = function (id, name, cScore, smsScore, bScore) {
            return {
                id: id,
                name: name,
                x: 0,
                y: 0,
                radius: 0,
                value: 0,
                callScore: cScore,
                smsScore: smsScore,
                btScore: bScore,
                callData: [],
                smsData: [],
                btData: [],
                totalsData: null,                               
                callStat: 0,
                smsStat: 0,
                btStat: 0,
                friendshipScore: 0,
                lastContact: 0
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
        var starting = date.setMonth(date.getMonth() - 7)

        setTimeout(function () {
            obj.load_data(starting, Date.now());
        }, 1000);
    };

    WebChart.prototype.load_data = function (start, end) {
        var chart = this;
        var remaining = 3;
        var runOnce = [false, false, false];
        this.startTime = start/1000;
        this.endTime = end/1000;
        //Load Call probe data
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

    WebChart.prototype.create_nodes = function () {
        var chart = this;
        var namesDict = {};
        //Helper functions to parse data and create data nodes
        var extractNumber = function (hash) {
            return hash.substring(17, hash.length - 2)
        }

        //Parse Call data
        chart.callData.forEach(function (d) {
            var name;
            fake.forEach(function (l) {
                if (l.number == extractNumber(d.call.number))
                    name = l.real_name;
            });
            if (name) {
                if (d.call.duration > 5) {
                    var node;
                    if (namesDict[name] == undefined)
                    {
                        node = chart.createNode(chart.nodes.length, name, 0, 0, 0);
                        node.callData.push({timestamp: d.timestamp, score: d.call.duration});
                        chart.nodes.push(node);
                        namesDict[name] = chart.nodes.length - 1;
                    }
                    else
                    {
                        chart.nodes[namesDict[name]].callData.push({ timestamp: d.timestamp, score: d.call.duration });
                    }
                }
            }
        });
        //Parse SMS data
        chart.smsData.forEach(function (d) {
            var name;
            fake.forEach(function (l) {
                if (l.number == extractNumber(d.message.address))
                    name = l.real_name;
            });
            if (name) {
                var node;
                if (namesDict[name] == undefined) {
                    node = chart.createNode(chart.nodes.length, name, 0, 0, 0);
                    node.smsData.push({ timestamp: d.timestamp, score: 1 });
                    chart.nodes.push(node);
                    namesDict[name] = chart.nodes.length - 1;
                }
                else {
                    chart.nodes[namesDict[name]].smsData.push({ timestamp: d.timestamp, score: 1 });
                }
            }
        });

        //Parse Bluetooth data
        chart.btData.forEach(function (d) {
            d.devices.forEach(function (x) {
                var name;
                fake.forEach(function (l) {
                    if (x.sensible_user_id == l.sensible_user_id)
                        name = l.real_name;
                });
                if (name) {
                    var node;
                    if (namesDict[name] == undefined) {
                        node = chart.createNode(chart.nodes.length, name, 0, 0, 0);
                        node.btData.push({ timestamp: d.timestamp, score: 5 });
                        chart.nodes.push(node);
                        namesDict[name] = chart.nodes.length - 1;
                    }
                    else {
                        var score = (chart.nodes[namesDict[name]].lastContact - d.timestamp > 300000) ? 300 : 5;
                        chart.nodes[namesDict[name]].btData.push({ timestamp: d.timestamp, score: score });
                    }
                    
                }
            })
        });

        chart.update_vis();

    };

    WebChart.prototype.update_vis = function()
    {
        var chart = this;
        var inWorkHours = function (timestamp) {
            var result = chart.get_timeslot(new Date(timestamp * 1000));
            return DAYSLOT.EARLYCLASS || DAYSLOT.LATECLASS;
        }

        chart.nodes.forEach(function (d) {
            for (var i = 0; i < d.callData.length; i++) {
                if (d.callData[i].timestamp > chart.endTime) break;                    
                if (d.callData[i].timestamp > chart.startTime) {
                    d.callScore += d.callData[i].score;
                    d.callStat += d.callData[i].score;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.callData[i].score : d.callData[i].score * 0.5;
                }
            }
            for (var i = 0; i < d.smsData.length; i++) {
                if (d.smsData[i].timestamp > chart.endTime) break;
                if (d.smsData[i].timestamp > chart.startTime) {
                    d.smsScore += d.smsData[i].score;
                    d.smsStat += d.smsData[i].score;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.smsData[i].score : d.smsData[i].score * 0.5;
                }
            }
            for (var i = 0; i < d.btData.length; i++) {
                if (d.btData[i].timestamp > chart.endTime) break;
                if (d.btData[i].timestamp > chart.startTime) {
                    d.btScore += d.btData[i].score;
                    d.btStat += d.btData[i].score;
                    d.friendshipScore += inWorkHours(d.timestamp) ? d.btData[i].score : d.btData[i].score * 0.5;
                }
            }
        });

        var max_amount = 0;
        chart.minFriendship = chart.nodes[0].friendshipScore;
        //Find the maximums to normalize
        chart.nodes.forEach(function (d) {
            chart.maxBtScore = d.btScore > chart.maxBtScore ? d.btScore : chart.maxBtScore;
            chart.maxCallScore = d.callScore > chart.maxCallScore ? d.callScore : chart.maxCallScore;
            chart.maxSmsScore = d.smsScore > chart.maxSmsScore ? d.smsScore : chart.maxSmsScore;
            chart.maxFriendship = d.friendshipScore > chart.maxFriendship ? d.friendshipScore : chart.maxFriendship;
            chart.minFriendship = d.friendshipScore < chart.minFriendship ? d.friendshipScore : chart.minFriendship;
        });
        //Calculate value ("final score") for each node
        chart.nodes.forEach(function (d) {         
            //Normalize            
            d.smsScore /= chart.maxSmsScore;
            d.btScore /= chart.maxBtScore;
            d.callScore /= chart.maxCallScore;

            var scores = [d.callScore, d.smsScore, d.btScore];
            var toLabel = ["call", "sms", "bt"]
            var maxIndex = 0;

            maxIndex = scores.indexOf(Math.max.apply(null, scores));
            d.value = d.callScore + d.smsScore + d.btScore;
            d.group = toLabel[maxIndex];

            chart.totalScore += d.callScore + d.smsScore + d.btScore;
            max_amount = d.value > max_amount ? d.value : max_amount;
        });

        var max_radius = d3.scale.pow().exponent(0.5).domain([0, 1500]).range([50, 30]);
        chart.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, max_radius(chart.totalScore)]);
        
        chart.nodes.sort(function (a, b) {
            return b.value - a.value;
        });
        chart.displayedNodes = chart.nodes.slice(0, 16);
        var dProcessor = new DataProcessor();
        chart.displayedNodes.forEach(function (d) {
            d.radius = chart.radius_scale(d.value)
            d.totalsData = dProcessor.parse_totals_data(d.callData, d.smsData, d.btData);
        });

       
        screen.hide_loading_screen();
        return chart.create_vis();
    };

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
            

        //dookola  
        for (level = 0; level < chart.levels; level++) {
            for (j = 0; j < chart.segments; j++) {
                var point = chart.points.byLevel[level][j]
                var nextIdx = j + 1 < chart.segments ? j + 1 : 0;
                var nextPoint = chart.points.byLevel[level][nextIdx];
                var nextPoint1Control = { x: 0, y: 0 }, nextPoint2Control = { x: 0, y: 0 };
                var getRandomArbitary= function(min, max) {
                    return Math.random() * (max - min) + min;
                }
                
                nextPoint1Control.x = point.x * getRandomArbitary(0.85, 0.97);
                nextPoint1Control.y = point.y * getRandomArbitary(0.85, 0.97);
                nextPoint2Control.x = nextPoint.x * getRandomArbitary(0.85, 0.97);
                nextPoint2Control.y = nextPoint.y * getRandomArbitary(0.85, 0.97);

                this.web.append("path")
                    .attr("d", " M " + point.x + "," + point.y + " C " + nextPoint1Control.x + "," + nextPoint1Control.y + " "
                    + nextPoint2Control.x + "," + nextPoint2Control.y + " " + nextPoint.x + "," + nextPoint.y)
                    .attr("fill","none")
                //.attr("d", "M " + point.x + " " + point.y + " L " + nextPoint.x + " " + nextPoint.y)
                .style("stroke", "#055");
            }
        }
  
        //wysokosc
        for (segment = 0; segment < chart.segments; segment++) {
            console.debug(chart.points.bySegment[segment]);
            var start = chart.points.bySegment[segment][0];
            var end = chart.points.bySegment[segment][chart.levels];
            this.web.append("path")
             
            .attr("d", "M" + start.x + " " + start.y + " L " + end.x + " " + end.y)
            .style("stroke", "#000");
        }
    
        var getPoints = function() {
            var result = [];
            for (var i = 0 ; i < chart.segments ; i++)
                result.push(d3.scale.linear().domain([chart.minFriendship, chart.maxFriendship]).range([chart.points.byLevel[1][i], chart.points.byLevel[chart.levels - 1][i]]));
            return result;
        };
        var friendScale = d3.scale.linear().range([0, chart.maxFriendship]);
        var points = getPoints();
        points.randomize();

        
        this.circles.enter().append("circle")
            .attr("r", 0)
            .attr("fill", function (d) {
                return chart.colors[d.group];
            })
            .attr("stroke-width", 2).attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker();
            }).attr("id", function (d) {
                return "bubble_" + d.id;
            }).attr("cx", function (d, i) {
                d.x = points[i](chart.maxFriendship).x
                return points[i](chart.maxFriendship).x;
            })
            .attr("cy", function (d, i) {
                d.y = points[i](chart.maxFriendship).y
                return points[i](chart.maxFriendship).y;
            })
            .on("mouseover", function (d, i) {
                return chart.show_details(d, i, this);
            }).on("mouseout", function (d, i) {
                return chart.hide_details(d, i, this);
            }).on("click", function (d, i) {
                if (!chart.inTransition && !chart.zoomed) {
                    chart.inTransition = true;
                    chart.hide_details(d, i, this);                    
                    return chart.zoom_circle(d);
                }
            });


        chart.web.append("image")
            .attr("id", "userAvatarMain")
            .attr("xlink:href", "data/unknown-person.gif")
            .attr("x", -60)
            .attr("y", -100)
            .attr("width", 120)
            .attr("height", 200);


        return this.circles.transition().duration(2000).attr("r", function (d) {
            return d.radius;
        }).each("end", function () {
            chart.circles.transition().duration(1000).attr("cx", function (d, i) {
                d.x = points[i](d.friendshipScore).x
                return points[i](d.friendshipScore).x;
            })
            .attr("cy", function (d, i) {
                d.y = points[i](d.friendshipScore).y
                return points[i](d.friendshipScore).y;
            });
        });
        
    };

   


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
            return "translate(50,50) scale(0.15)";
        });

        //Create new zoomed circle
        return new_circle.append("circle").attr("r", 10).attr("id", "circle-zoomed")
		.attr("cx", d.x)
		.attr("cy", d.y)
		.attr("fill", chart.colors[d.group])
		.attr("stroke-width", 2)
		.attr("stroke", d3.rgb(chart.colors[d.group]).darker())
        .attr("transform", "translate(" + chart.center.x  + ", " +chart.center.y  + ")")
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

    WebChart.prototype.unzoom_circle = function () {
        var chart = this;
        var other_circles = this.circles;
        var new_circle = this.vis.selectAll("#circle-zoomed");

        map.undraw_map();
        chart.undraw_multichart();

        //Lighten other circles
        other_circles.transition().duration(1000).attr("fill", function (d) {
            return d3.rgb(chart.colors[d.group]);
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.colors[d.group]).darker();
        });

        this.web.transition().duration(1000)
        .attr("transform", function (d) {
            return "translate(" + chart.center.x + ", " + (chart.center.y )+ ") scale(1)";
        });
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



  
    WebChart.prototype.draw_details = function (d) {
        map = new MapView(d);

        this.details.append("g").attr("id", "map");
        

        map.draw_map(chart.token);
        this.draw_multichart(d);
        //this.draw_barschart(d);
        this.draw_pie_chart(d);
    };

    WebChart.prototype.draw_barschart = function (d) {
        var chart = this;
        var g = chart.details.append("g").attr("id", "barschart").attr("transform", "translate(595,500)");



            var width = 600,
            height = 200;

            var parseDate = d3.time.format("%Y%m%d").parse;
            var width = 600,
             height = 200;

            var x0 = d3.scale.ordinal()
                .rangeRoundBands([0, width], .1);

            var x1 = d3.scale.ordinal();

            var y = d3.scale.linear()
                .range([height, 0]);

            var color = d3.scale.ordinal()
                .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

            var xAxis = d3.svg.axis()
                .scale(x0)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickFormat(d3.format(".2s"));

            

          

            x0.domain(data.map(function (d) { return d.date; }));
            x1.domain(d).rangeRoundBands([0, x0.rangeBand()]);//buckets
            y.domain([0, d3.max(data, function (d) { return d3.max(d, function (v) { return v.y; }); })]);
               
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
                .text("Population");

            var state = g.selectAll(".state")
                .data(data)
              .enter().append("g")
                .attr("class", "g")
                .attr("transform", function (d) { return "translate(" + x0(d.date) + ",0)"; });

            state.selectAll("rect")
                .data(function (d) { return d; })
              .enter().append("rect")
                .attr("width", x1.rangeBand())
                .attr("x", function (d) { return x1(d.x); })
                .attr("y", function (d) { return y(d.y); })
                .attr("height", function (d) { return height - y(d.x); })
                .style("fill", function (d) { return color(d.y); });

            var legend = g.selectAll(".legend")
                .data(d.slice().reverse())
              .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

            legend.append("rect")
                .attr("x", width - 18)
                .attr("width", 18)
                .attr("height", 18)
                .style("fill", color);

            legend.append("text")
                .attr("x", width - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function (d) { return d; });

 

       
    };

    WebChart.prototype.draw_multichart = function (d) {
        var chart = this;
        var g = chart.details.append("g").attr("id", "totalschart").attr("transform", "translate(595,100)");
        var toLabel = ["call", "sms", "bt"];

            var data = d.totalsData; 

            var width = 600,
            height = 200;

            var x = d3.time.scale()
                .range([0, width]).domain([new Date(chart.startTime * 1000), new Date(chart.endTime* 1000)]);//d3.extent(data[0], function (d) { return d.date; }));

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
                .transition().duration(2000).attr("width",width);

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
            .style("fill", "none");


            //city.append("text")
            //    .datum(function (d) { return { name: d.name, value: d.values[d.values.length - 1] }; })
            //    .attr("transform", function (d) { return "translate(" + x(d.value.date) + "," + y(d.value.temperature) + ")"; })
            //    .attr("x", 3)
            //    .attr("dy", ".35em")
            //    .text(function (d) { return d.name; });




    };

    WebChart.prototype.undraw_multichart= function () {
        return d3.select("#totalschart").remove();
    };


    WebChart.prototype.draw_pie_chart = function (d) {
        var chart = this;
        var data = [{ value: d.callScore, label: "Calls" }, { value: d.smsScore, label: "Sms" }, { value: d.btScore, label: "Bluetooth" }];

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
            .attr("x", 170)
            .attr("y", 120)
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

                    chart.details.append("text")
                        .attr("x", 170)
                        .attr("id", "numberOfConnections")
                        .attr("y", 420)
                        .style("font-family", "Segoe UI")
                        .style("font-size", "15px")
                        .style("font-variant", "small-caps")
                        .text(function () {
                            if (d.data.label == "Calls") {
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
                            }
                            else if (d.data.label == "Sms")
                                return chart.clicked.smsStat + " messages";
                            else if (d.data.label == "Bluetooth")
                                return chart.clicked.btStat + " connections";
                        });
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
                    chart.vis.select("#numberOfConnections").remove();
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

    WebChart.prototype.undraw_pie_chart = function () {
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
            content += "<span class=\"name\">Calls: </span><span class=\"value\">" + hours
            if (minutes < 10)
                content += ":0" + minutes;
            else
                content += ":" + minutes;
            if (rest < 10)
                content += ":0" + rest + " time in call.</span><br/>";
            else
                content += ":" + rest + " time in call.</span><br/>";

            content += "<span class=\"name\">Sms: </span><span class=\"value\">" + data.smsStat + " messages.</span><br/>";
            content += "<span class=\"name\">Bluetooth: </span><span class=\"value\">" + data.btStat + " connections.</span><br/>";
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
    
    WebChart.prototype.reset = function () {
        this.nodes = [];
        this.totalCyborgScore = 0;
        this.totalCavemanScore = 0;
        this.zoomed = false;
        this.clicked = null;
        this.mode = 0;
        this.inTransition = false;
    };

    //Auxiliary functions
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

    WebChart.prototype.get_timeslot = function (timestamp) {
        var date = new Date(timestamp);
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
       
    return WebChart;


})();

var parseResponse = function (data) { return data; };

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function () {
    chart = null; 

   chart = new WebChart(token);
    timeline = new Timeline(token);    
    screen = new LoadingScreen(1200/2, 750/2);

    return screen.show_loading_screen();    
});

