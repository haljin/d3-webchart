var BubbleChart, root;

BubbleChart = (function () {
    function BubbleChart(token) {

        //Layout fields
        this.width = 940;
        this.height = 800;
        this.center = {
            x: this.width / 2,
            y: this.height / 2
        };
        this.year_centers = {
            "cyborg": {
                x: this.width / 3,
                y: this.height / 2
            },
            "balanced": {
                x: this.width / 2,
                y: this.height / 2
            },
            "caveman": {
                x: 2 * this.width / 3,
                y: this.height / 2
            }
        };

        this.layout_gravity = -0.01;
        this.damper = 0.1;
        this.zoomed_radius = 200;
        this.vis = null;
        this.force = null;
        this.colors = ["#b1f413", "#ffd314", "#7f1ac3"];
        this.fill_color = d3.scale.ordinal().domain(["call", "sms", "bt"]).range(this.colors);
        this.radius_scale;

        //Data fields
        this.token = token;
        this.baseUrl = "http://localhost:5777/Sensible/data"
        this.callData;
        this.smsData;
        this.btData;
        this.nodes = [];
        this.totalCyborgScore = 0;
        this.totalCavemanScore = 0;


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

    BubbleChart.prototype.load_data = function (start, end) {
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


    BubbleChart.prototype.create_nodes = function () {
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
                        x.smsScore += 30;
                        x.smsStat += 1;
                        exists = true;
                    }

                });
                if (!exists) {
                    node = createNode(currElem, name, 0, 30, 0);
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
                            e.btScore += (e.lastContact - Date.now() > 300000) ? 300 : 30;
                            e.lastContact = d.timestamp;
                            e.btStat += 1;
                            exists = true;
                        }

                    });
                    if (!exists) {
                        node = createNode(currElem, name, 0, 0, 30);
                        node.lastContact = d.timestamp;
                        node.btStat += 1;
                        currElem++;
                        return chart.nodes.push(node);
                    }
                }
            })
        });


        var max_amount = 0;
        //Calculate value ("final score") for each node
        chart.nodes.forEach(function (d) {
            d.callScore *= 10;
            d.smsScore *= 10;

            var scores = [d.callScore, d.smsScore, d.btScore];
            var toLabel = ["call", "sms", "bt"]
            var maxIndex = 0, maxValue = 0;
            for (var i = 0; i < 3; ++i)
                if (scores[i] > maxValue) {
                    maxIndex = i;
                    maxValue = scores[i];
                }


            d.value = d.callScore + d.smsScore + d.btScore;
            d.group = toLabel[maxIndex];

            if (d.callScore + d.smsScore > 1.5 * d.btScore)
                d.type = "cyborg";
            else if ((d.callScore + d.smsScore) * 1.5 < d.btScore)
                d.type = "caveman";
            else
                d.type = "balanced";
            chart.totalCyborgScore += d.callScore + d.smsScore;
            chart.totalCavemanScore += d.btScore;
            max_amount = d.value > max_amount ? d.value : max_amount;

        });
        var max_radius = d3.scale.pow().exponent(0.5).domain([0, 1000000]).range([100, 60]);
        chart.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, max_radius(chart.totalCyborgScore + chart.totalCavemanScore)]);
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

    BubbleChart.prototype.create_vis = function () {
        var chart = this;
        if (d3.select("#svg_vis").empty())
            this.vis = d3.select("#vis").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_vis").style("display", "inline-block").append("g").attr("id", "bubblechart");
        else
            this.vis = d3.select("#svg_vis").append("g").attr("id", "bubblechart");
        if (!this.nodes.length) {
            this.vis.append("text")
            .attr("x", chart.center.x - 190)
            .attr("y", chart.center.y)
            .attr("size", 20)
            .style("font-family", "Segoe UI")
		    .style("font-size", "30px")
		    .style("font-variant", "small-caps")
            .text("No data for selected time period");

        }
        this.circles = this.vis.selectAll("circle").data(this.nodes, function (d) {
            return d.id;
        });

        this.circles.enter().append("circle").attr("r", 0).attr("fill", function (d) {
            return chart.fill_color(d.group);
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.fill_color(d.group)).darker();
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

        //Draw the button that allows splitting		
        var button_text, button;
        var group = this.vis.append("g")
		.on("click", function () {
		    if (!chart.zoomed)
		        if (chart.mode == 0)
		            chart.display_by_year();
		        else
		            chart.display_group_all();
		})
		.on("mouseover", function () {
		    if (!chart.zoomed)
		        button.attr("fill", "#B1B1B1");
		})
		.on("mouseout", function () {
		    button.attr("fill", "#dddddd");
		});

        if (this.nodes.length) {
            button = group.append("rect")
		.attr("id", "split")
		.attr("x", this.center.x - 50)
		.attr("y", 10)
		.attr("width", 90)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25);

            button_text = group.append("text")
		.attr("id", "button_text")
		.attr("x", this.center.x - 40)
		.attr("y", 30)
		.style("cursor", "hand")
		.style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
		.text("Show scale");
        }
        return this.circles.transition().duration(2000).attr("r", function (d) {
            return d.radius;
        });

    };

    BubbleChart.prototype.zoom_circle = function (d) {
        var chart = this;
        chart.zoomed = true;
        var other_circles = this.circles;
        var new_circle = this.circles
						.data([{ id: "zoomed"}], function (d) {
						    return d.id;
						})
						.enter();
        this.clicked = d;


        //Darken other circles
        other_circles.transition().duration(2000).attr("fill", function (d) {
            return d3.rgb(chart.fill_color(d.group)).darker().darker().darker();
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.fill_color(d.group)).darker().darker().darker().darker();
        });

        //Create new zoomed circle
        return new_circle.append("circle").attr("r", 10).attr("id", "zoomed")
		.attr("cx", d.x)
		.attr("cy", d.y)
		.attr("fill", this.fill_color(d.group))
		.attr("stroke-width", 2)
		.attr("stroke", d3.rgb(this.fill_color(d.group)).darker())
		.transition()
		.ease("elastic")
		.attr("cx", this.center.x)
		.attr("cy", this.center.y)
		.duration(2000)
		.attr("r", chart.zoomed_radius)
		.each('end', function () {
		    if (chart.zoomed)
		        chart.draw_pie_chart(chart, d);

		});
    };

    BubbleChart.prototype.unzoom_circle = function () {
        var chart = this;
        var other_circles = this.circles;
        var new_circle = this.vis.selectAll("#zoomed");
        //Lighten other circles
        other_circles.transition().duration(2000).attr("fill", function (d) {
            return d3.rgb(chart.fill_color(d.group));
        }).attr("stroke-width", 2).attr("stroke", function (d) {
            return d3.rgb(chart.fill_color(d.group)).darker();
        });
        //Destroy the pie chart, unzoom the circle
        chart.undraw_pie_chart(chart).each('end', function () {
            new_circle
			.transition()
			.attr("cx", chart.clicked.x)
			.attr("cy", chart.clicked.y)
			.attr("r", 0)
			.duration(2000)
			.each('start', function () {
			    chart.vis.selectAll("#pie").remove();
			    chart.vis.selectAll("#unzoom").remove();
			    chart.vis.selectAll("#button_x").remove();
			})
			.each('end', function () {
			    new_circle.remove();
			    chart.zoomed = false;
			    chart.inTransition = false;
			});
        });

    };

    BubbleChart.prototype.draw_pie_chart = function (chart, d) {
        var chart = this;
        var radius = chart.zoomed_radius;
        var color = d3.scale.ordinal()
		.range(this.colors);
        var data = [{ value: d.callScore, label: "Calls" }, { value: d.smsScore, label: "Sms" }, { value: d.btScore, label: "Bluetooth"}];

        var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(130);
        var pie = d3.layout.pie()
		.sort(null)
		.value(function (d) { return d.value; });
        var toLabel = ["call", "sms", "bt"]

        var svg = chart.vis
		.append("g")
		.attr("transform", "translate(" + this.center.x + "," + this.center.y + ")")
		.attr("id", "pie");

        var g = svg.selectAll(".arc")
		.data(pie(data))
		.enter().append("g")
		.attr("class", "arc");

        g.append("path")
		.attr("d", arc)
        .attr("id", "piechart")
		.style("fill", function (d, i) { return color(toLabel[i]); })
		.attr("stroke", function (d, i) {
		    return d3.rgb(chart.fill_color(color(toLabel[i]))).darker();
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

        var paths = g.selectAll("path");
        var text_scale = d3.scale.pow().domain([33, 50]).range([13, 6]).clamp(true);
        var text_scale_change_pos = d3.scale.linear().domain([10, 50]).range([440, 350]).clamp(true);
        chart.vis.append("image")
                .attr("id", "image")
                .attr("xlink:href", "http://localhost:5777/Sensible/data/unknown-person.gif")
                .attr("x", 425)
                .attr("y", 280)
                .attr("width", 100)
                .attr("height", 180);

        chart.vis.append("text")
		        .attr("x", text_scale_change_pos(chart.clicked.name.length))
                .attr("id", "name")
		        .attr("y", 450)
                .style("font-family", "Segoe UI")
		        .style("font-variant", "small-caps")
		        .text(function () { return chart.clicked.name; })
         .style("font-size", text_scale(chart.clicked.name.length));


        paths
		.on("mouseover", function (d) {
		    // Mouseover effect if no transition has started                
		    if (this._listenToEvents) {
		        // Calculate angle bisector
		        var ang = d.startAngle + (d.endAngle - d.startAngle) / 2;
		        // Transformate to SVG space
		        ang = (ang - (Math.PI / 2)) * -1;

		        // Calculate a 10% radius displacement
		        var x = Math.cos(ang) * radius * 0.1;
		        var y = Math.sin(ang) * radius * -0.1;

		        d3.select(this).transition()
			    .duration(250).attr("transform", "translate(" + x + "," + y + ")");

		        chart.vis.selectAll("#" + d.data.label)
			    .attr("stroke-width", 2)
			    .attr("r", 6)
			    .style("font-weight", "bold");





		        chart.vis.append("text")
		        .attr("x", function () {
		            if (d.data.label == "Calls")
		                return 415;
		            else if (d.data.label == "Sms")
		                return 445;
		            else if (d.data.label == "Bluetooth")
		                return 435;

		        })
                .attr("id", "numberOfConnections")
		        .attr("y", 500)
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
		    // Mouseout effect if no transition has started                
		    if (this._listenToEvents) {
		        d3.select(this).transition()
				.duration(150).attr("transform", "translate(0,0)");

		        chart.vis.selectAll("#" + d.data.label)
				.attr("stroke-width", 1)
				.attr("r", 5)
				.style("font-weight", "normal");
		        chart.vis.select("#numberOfConnections").remove();
		    }
		});

        //Draw the legend labels
        g.append("text")
		.attr("x", function (d, i) {
		    return -80 + i * 60;
		})
		.attr("y", 80)
        .style("font-family", "Segoe UI")
		.style("font-size", "14px")
		.style("font-variant", "small-caps")
		.attr("id", function (d) {
		    return d.data.label;
		})
		.text(function (d) {
		    return d.data.label;
		});
        //Draw the legend circles
        g.append("circle")
		.attr("cy", 75)
		.attr("cx", function (d, i) {
		    return -90 + i * 60;
		})
		.attr("r", 5)
		.attr("id", function (d) {
		    return d.data.label;
		})
		.attr("stroke", "#000")
		.attr("stroke-width", 1)
		.attr("fill", function (d, i) {
		    return color(toLabel[i]);
		});
        //Draw the unzoom button

        var button, button_text;
        var group = this.vis.append("g")
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
		.attr("id", "unzoom")
	.attr("x", this.center.x + 250)
		.attr("y", 10)
		.attr("width", 30)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 0.25);

        button_text = group.append("text")
		.attr("id", "button_x")
		.attr("x", this.center.x + 260)
		.attr("y", 30)
		.style("cursor", "hand")
		.style("font-family", "Segoe UI")
		.style("font-size", "20px")
		.style("font-variant", "small-caps")
		.style("font-weight", "bold")
		.text("x");
    };

    BubbleChart.prototype.undraw_pie_chart = function (chart) {
        var radius = chart.zoomed_radius;
        var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(130);
        var g = chart.vis.selectAll("#piechart");

        chart.vis.selectAll("#image").remove();
        chart.vis.selectAll("#name").remove();
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

    BubbleChart.prototype.draw_scale = function () {
        var chart = this;
        var value = chart.totalCavemanScore / chart.totalCyborgScore;

        var scale = value >= 1 ?
							d3.scale.pow().exponent(0.5).domain([1, 2]).range([chart.center.x - 2, chart.center.x + 198]).clamp(true) :
							d3.scale.pow().exponent(0.5).domain([1, 0]).range([chart.center.x - 2, chart.center.x - 202]).clamp(true);

        var group = chart.vis.append("g")
		.attr("id", "ccscale");

        var gradient = group.append("defs")
  .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%")
    .attr("spreadMethod", "pad");

        gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ffd314")
    .attr("stop-opacity", 1);

        gradient.append("stop")
    .attr("offset", "30%")
    .attr("stop-color", "#b1f413")
    .attr("stop-opacity", 1);

        gradient.append("stop")
    .attr("offset", "80%")
    .attr("stop-color", "#7f1ac3")
    .attr("stop-opacity", 1);




        group.append("rect")
		.attr("x", chart.center.x - 200)
		.attr("y", chart.height - 47)
		.attr("width", 400)
		.attr("height", 10)
		.attr("fill", "url(#gradient)");

        //center marker
        group.append("rect")
		.attr("x", chart.center.x - 1)
		.attr("y", chart.height - 50)
		.attr("width", 3)
		.attr("height", 15)
		.attr("fill", "#b1b1b1");


        group.append("text").text("You")
        .attr("x", chart.center.x)
		.attr("y", chart.height - 62)
        .attr("transform", "translate(-12,0)")
        .style("font-family", "Segoe UI")
		.style("font-size", "15px")
		.style("font-variant", "small-caps")
        .transition()
        .duration(1000)
        .attr("x", scale(value));

        group.append("g").append("path")
        .attr("d", d3.svg.symbol()
        .size(function (d) { return 100; })
        .type(function (d) { return d3.svg.symbolTypes[4]; }))
        .attr("id", "triangle")
        .attr("transform", "translate(" + chart.center.x + ", " + (chart.height - 52) + ")")
        .style("fill", "b1b1b1")
        .transition()
        .duration(1000)
        .attr("transform", "translate(" + scale(value) + "," + (chart.height - 52) + ")");
    };

    BubbleChart.prototype.undraw_scale = function () {
        var chart = this;
        chart.vis.selectAll("#ccscale").remove();
    };

    BubbleChart.prototype.charge = function (d) {
        return -Math.pow(d.radius, 2.0) / 8;
    };

    BubbleChart.prototype.start = function () {
        return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
    };

    BubbleChart.prototype.display_group_all = function () {
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

        this.force.start();
        this.undraw_scale();
        return this.hide_years();
    };

    BubbleChart.prototype.move_towards_center = function (alpha) {
        var chart = this;
        return function (d) {
            d.x = d.x + (chart.center.x - d.x) * (chart.damper + 0.02) * alpha;
            return d.y = d.y + (chart.center.y - d.y) * (chart.damper + 0.02) * alpha;
        };
    };

    BubbleChart.prototype.display_by_year = function () {
        var chart = this;
        chart.mode = 1;
        this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function (e) {
            return chart.circles.each(chart.move_towards_year(e.alpha)).attr("cx", function (d) {
                return d.x;
            }).attr("cy", function (d) {
                return d.y;
            });
        });

        chart.vis.select("#button_text").text("Hide scale").attr("x", this.center.x - 35);

        this.force.start();
        this.draw_scale();
        return this.display_years();
    };

    BubbleChart.prototype.move_towards_year = function (alpha) {
        var chart = this;
        return function (d) {
            var target;
            target = chart.year_centers[d.type];
            d.x = d.x + (target.x - d.x) * (chart.damper + 0.02) * alpha * 1.1;
            return d.y = d.y + (target.y - d.y) * (chart.damper + 0.02) * alpha * 1.1;
        };
    };

    BubbleChart.prototype.display_years = function () {
        var years, years_data, years_x;
        years_x = {
            "Cyborg": 160,
            "Balanced": this.width / 2,
            "Caveman": this.width - 160
        };

        years_data = d3.keys(years_x);
        years = this.vis.selectAll(".years").data(years_data);
        return years.enter().append("text").attr("class", "years").attr("x", function (d) {
            return years_x[d];
        })
        .style("font-family", "Segoe UI")
		.style("font-size", "20px")
		.style("font-variant", "small-caps")
        .attr("y", 90).attr("text-anchor", "middle").text(function (d) {
            return d;
        });
    };

    BubbleChart.prototype.hide_years = function () {
        var years;
        return years = this.vis.selectAll(".years").remove();
    };

    BubbleChart.prototype.show_details = function (data, i, element) {
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

    BubbleChart.prototype.hide_details = function (data, i, element) {
        var chart = this;
        if (!this.zoomed) {
            d3.select(element).attr("stroke", function (d) {
                return d3.rgb(chart.fill_color(d.group)).darker();
            });
        }
        return this.tooltip.hideTooltip();
    };


    BubbleChart.prototype.show_loading_screen = function () {
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

    BubbleChart.prototype.hide_loading_screen = function () {
        d3.select("#svg_load").remove();
    };

    BubbleChart.prototype.reset = function () {
        this.nodes = [];
        this.totalCyborgScore = 0;
        this.totalCavemanScore = 0;
        this.zoomed = false;
        this.clicked = null;
        this.mode = 0;
        this.inTransition = false;
    };

    return BubbleChart;


})();


root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function () {
    chart = null;
    var token = "32d74aa9-211e-4bbd-b99d-9af5aebb370d";
    var timeline = null;
    
    chart = new BubbleChart(token);
    return chart.show_loading_screen();
});

