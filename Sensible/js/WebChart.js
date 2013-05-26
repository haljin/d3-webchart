﻿var WebChart;

WebChart = (function () {
    function WebChart(token) {

        //Layout fields
        this.width = 1200;
        this.height = 800;
        this.center = {
            x: this.width / 2,
            y: this.height / 2
        };
        this.zoomed_loc = {
            x: this.width / 6 + 20,
            y: this.height / 4 + 20
        };

        this.layout_gravity = -0.01;
        this.damper = 0.1;
        this.zoomed_radius = 120;
        this.vis = null;
        this.web = null;
        this.details = null;
        this.force = null;
        this.radius_scale;
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.shapes = {
            call: "04,00 08,04 05,07 05,08 13,16 14,16 17,13 21,16 17,21 12,21 00,09 00,04 04,00",
            sms: "00,00 25,00 25,15 00,15 00,00 13,7 25,00",
            bt: "00,07 05,10 05,00 12,05 05,10 12,15 05,20 05,10 00,13"
        };

        

        //Data fields
        this.token = token;
        this.baseUrl = "http://localhost:5777/Sensible/data"
        this.callData;
        this.smsData;
        this.btData;
        this.nodes = [];
        this.maxCallScore = 0;
        this.maxSmsScore = 0;
        this.maxBtScore = 0;        
        this.totalScore = 0;

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
        date.setMonth(date.getMonth() - 1)
        this.load_data(0, Date.now());
    };

    WebChart.prototype.load_data = function (start, end) {
        var chart = this;
        var remaining = 3;
        var runOnce = [false, false, false];
        this.startTime = start;
        this.endTime = end;
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
        var currElem = 0;
        //Helper functions to parse data and create data nodes
        var extractNumber = function (hash) {
            return hash.substring(17, hash.length - 2)
        }
        var createNode = function (id, name, cScore, smsScore, bScore) {
            return {
                id: id,
                radius: 0,
                value: 0,
                callScore: cScore,
                smsScore: smsScore,
                btScore: bScore,
                name: name,
                x: Math.random() * 900,
                y: Math.random() * 800,
                callStat: 0,
                smsStat: 0,
                btStat: 0
            }
        }
        //Parse Call data
        chart.callData.forEach(function (d) {
            var name;
            fake.forEach(function (l) {
                if (l.number == extractNumber(d.call.number))
                    name = l.real_name;
            });
            if (name && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                if (d.call.duration > 5) {
                    var node;
                    var exists = false;
                    chart.nodes.forEach(function (x) {
                        if (x.name == name) {
                            x.callScore += d.call.duration;
                            x.callStat += d.call.duration;
                            exists = true;
                        }
                    });
                    if (!exists) {
                        node = createNode(currElem, name, d.call.duration, 0, 0);
                        node.callStat += d.call.duration;
                        currElem++;
                        return chart.nodes.push(node);
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
            if (name && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                var node;
                var exists = false;
                chart.nodes.forEach(function (x) {
                    if (x.name == name) {
                        x.smsScore += 1;
                        x.smsStat += 1;
                        exists = true;
                    }
                });
                if (!exists) {
                    node = createNode(currElem, name, 0, 1, 0);
                    node.smsStat += 1;
                    currElem++;
                    return chart.nodes.push(node);
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
                var lastContact = 0;
                if (name && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                    var node;
                    var exists = false;
                    chart.nodes.forEach(function (e) {
                        if (e.name == name) {
                            e.btScore += (e.lastContact - d.timestamp > 300000) ? 300 : 5;
                            e.lastContact = d.timestamp;
                            e.btStat += 1;
                            exists = true;
                        }
                    });
                    if (!exists) {
                        node = createNode(currElem, name, 0, 0, 1);
                        node.lastContact = d.timestamp;
                        node.btStat += 1;
                        currElem++;
                        return chart.nodes.push(node);
                    }
                }
            })
        });
        
        var max_amount = 0;       
        //Find the maximums to normalize
        chart.nodes.forEach(function (d) {
            chart.maxBtScore = d.btScore > chart.maxBtScore ? d.btScore : chart.maxBtScore;
            chart.maxCallScore = d.callScore > chart.maxCallScore ? d.callScore : chart.maxCallScore;
            chart.maxSmsScore = d.smsScore > chart.maxSmsScore ? d.smsScore : chart.maxSmsScore;
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
        chart.nodes.forEach(function (d) {
            d.radius = chart.radius_scale(d.value)
        });
        chart.nodes.sort(function (a, b) {
            return b.value - a.value;
        });
        
        chart.hide_loading_screen();
        chart.create_vis();
        chart.start();
        return chart.display_group_all();
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
            .style("font-family", "Segoe UI")
		    .style("font-size", "30px")
		    .style("font-variant", "small-caps")
            .text("No data for selected time period");
            return;
        }

        this.web = this.vis.append("g").attr("id", "Web");
        this.details = this.vis.append("g").attr("id", "Details");
        this.circles = this.web.selectAll("circle").data(this.nodes, function (d) {
            return d.id;
        });

        //Draw circles
        this.circles.enter().append("circle").attr("r", 0).attr("fill", function (d) {
            return chart.colors[d.group];
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.colors[d.group]).darker();
        }).attr("id", function (d) {
            return "bubble_" + d.id;
        }).on("mouseover", function (d, i) {
            return chart.show_details(d, i, this);
        }).on("mouseout", function (d, i) {
            return chart.hide_details(d, i, this);
        }).on("click", function (d, i) {
            if (!chart.inTransition)
                if (chart.zoomed == false) {
                    chart.inTransition = true;
                    chart.hide_details(d, i, this);
                    return chart.zoom_circle(d);
                }
                else {
                    chart.inTransition = true;
                    return chart.unzoom_circle();
                }
        });

        return this.circles.transition().duration(2000).attr("r", function (d) {
            return d.radius;
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
        other_circles.transition().duration(2000)
            .attr("fill", function (d) {
                return d3.rgb(chart.colors[d.group]).darker().darker().darker();
            })
            .attr("stroke-width", 2)
            .attr("stroke", function (d) {
                return d3.rgb(chart.colors[d.group]).darker().darker().darker().darker();
            });

        //Zoom out the rest of the visualization
        this.web.transition().duration(2000)
        .attr("transform", function (d) {
            return "scale(0.15)";
        });

        //Create new zoomed circle
        return new_circle.append("circle").attr("r", 10).attr("id", "circle-zoomed")
		.attr("cx", d.x)
		.attr("cy", d.y)
		.attr("fill", chart.colors[d.group])
		.attr("stroke-width", 2)
		.attr("stroke", d3.rgb(chart.colors[d.group]).darker())
		.transition()
		.ease("elastic")
		.attr("cx", this.zoomed_loc.x)
		.attr("cy", this.zoomed_loc.y)
		.duration(2000)
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
        //Lighten other circles
        other_circles.transition().duration(2000).attr("fill", function (d) {
            return d3.rgb(chart.colors[d.group]);
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.colors[d.group]).darker();
        });
        this.web.transition().duration(2000)
        .attr("transform", function (d) {
            return "scale(1)";
        });
        //Destroy the pie chart, unzoom the circle
        chart.undraw_pie_chart().each('end', function () {
            new_circle
			.transition()
			.attr("cx", chart.clicked.x)
			.attr("cy", chart.clicked.y)
			.attr("r", 0)
			.duration(2000)
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

        this.draw_pie_chart(d);
        


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
            .transition().duration(1000).attrTween("d", function (data) {
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
                return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 30) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 30) + ")";
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
            .attr("y", 130)
            .attr("width", 100)
            .attr("height", 180);

        chart.details.append("text")
            .attr("x", 400)
            .attr("id", "userName")
            .attr("y", 130)
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
                        return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (chart.zoomed_radius + 45) + "," + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (chart.zoomed_radius + 45) + ")";
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
        var radius = chart.zoomed_radius;
        var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(radius - 20);
        var g = chart.vis.selectAll("#piechart");

        chart.vis.selectAll("#userAvatar").remove();
        chart.vis.selectAll("#userName").remove();
        return g.transition()
		.duration(1000)
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

    WebChart.prototype.charge = function (d) {
        return -Math.pow(d.radius, 2.0) / 8;
    };

    WebChart.prototype.start = function () {
        return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
    };

    WebChart.prototype.display_group_all = function () {
        var chart = this;
        chart.mode = 0;
        this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function (e) {
            return chart.circles.each(chart.move_towards_center(e.alpha)).attr("cx", function (d) {
                return d.x;
            }).attr("cy", function (d) {
                return d.y;
            });
        });
        chart.vis.select("#button_text").text("Show scale").attr("x", this.center.x - 40);

        return this.force.start();
    };

    WebChart.prototype.move_towards_center = function (alpha) {
        var chart = this;
        return function (d) {
            d.x = d.x + (chart.center.x - d.x) * (chart.damper + 0.02) * alpha;
            return d.y = d.y + (chart.center.y - d.y) * (chart.damper + 0.02) * alpha;
        };
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


    WebChart.prototype.show_loading_screen = function () {
        var w = 460,
		h = 200,
		x = d3.scale.ordinal().domain(d3.range(3)).rangePoints([0, w], 2);
        var previous = {};
        var ascending = true;
        var fields =
		{ endAngle: 0.0, startAngle: 0.0 };

        var arc = d3.svg.arc()
		.innerRadius(50)
		.outerRadius(90)
		.startAngle(function (d) { return d.startAngle; })
		.endAngle(function (d) { return d.endAngle; });

        var load_screen = d3.select("#vis").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_load");
        var svg = load_screen
		.append("g")
		.attr("transform", "translate(" + this.center.x + "," + this.center.y + ")");

        setInterval(function () {
            previous = { endAngle: fields.endAngle, startAngle: fields.startAngle };
            if (fields.endAngle >= 2 * Math.PI) {
                ascending = false;
            }
            if (fields.startAngle >= 2 * Math.PI) {
                fields.startAngle = 0;
                fields.endAngle = 0;
                ascending = true;
            }
            else {
                if (ascending)
                    fields.endAngle += Math.PI / 10;
                else
                    fields.startAngle += Math.PI / 10;

                var path = svg.selectAll("path")
			.data([fields]);

                path.enter().append("path")
			.attr("id", "swizzle")
                //.attr("transform", function(d, i) { return "translate(" + x(i) + ",0)"; })
			.transition()
			.attrTween("d", arcTween);

                path.transition()
			.attrTween("d", arcTween);
            }
        }, 150);

        function arcTween(b) {
            var i = d3.interpolate(previous, b);
            this._current = i(0);
            return function (t) {
                return arc(i(t));
            };
        }
    };

    WebChart.prototype.hide_loading_screen = function () {
        d3.select("#svg_load").remove();
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

    return WebChart;


})();

var parseResponse = function (data) { return data; };

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function () {
    chart = null;
    var token = "32d74aa9-211e-4bbd-b99d-9af5aebb370d";// "32d74aa9-211e-4bbd-b99d-9af5aebb370d";
    var timeline = null;

    chart = new WebChart(token);
    return chart.show_loading_screen();
});

