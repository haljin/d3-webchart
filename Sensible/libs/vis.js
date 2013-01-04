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
        this.startTime = 0;
        this.endTime = 1357239686922;
        this.mode = 0;
        this.inTransition = false;

        this.load_data(this.startTime, this.endTime);
    }

    BubbleChart.prototype.load_data = function (start, end) {
        var chart = this;
        var remaining = 3;
        var runOnce = [false, false, false];
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
            if (d.call.name != "" && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                if (d.call.duration > 5) {
                    var node;
                    var exists = false;
                    chart.nodes.forEach(function (x) {
                        if (x.name == extractNumber(d.call.name)) {
                            x.callStat += d.call.duration;
                            exists = true;
                        }

                    });
                    if (!exists) {
                        node = createNode(currElem, extractNumber(d.call.number), d.call.duration, 0, 0);
                        node.callStat += d.call.duration;
                        currElem++;
                        return chart.nodes.push(node);
                    }
                }
            }

        });

        //Parse SMS data
        chart.smsData.forEach(function (d) {
            if (d.message.person != "" && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                var node;
                var exists = false;
                chart.nodes.forEach(function (x) {
                    if (x.name == extractNumber(d.message.person)) {
                        x.smsScore += 30;
                        x.smsStat += 1;
                        exists = true;
                    }

                });
                if (!exists) {
                    node = createNode(currElem, extractNumber(d.message.person), 0, 30, 0);
                    node.smsStat += 1;
                    currElem++;
                    return chart.nodes.push(node);
                }
            }
        });

        //Parse Bluetooth data
        chart.btData.forEach(function (d) {
            d.devices.forEach(function (x) {
                var lastContact = 0;
                if (x.sensible_user_id != "" && x.sensible_user_id != null && d.timestamp > chart.startTime && d.timestamp < chart.endTime) {
                    var node;
                    var exists = false;
                    chart.nodes.forEach(function (e) {
                        if (e.name == x.sensible_user_id) {
                            e.btScore += (e.lastContact - Date.now() > 300000) ? 300 : 30;
                            e.lastContact = d.timestamp;
                            e.btStat += 1;
                            exists = true;
                        }

                    });
                    if (!exists) {
                        node = createNode(currElem, x.sensible_user_id, 0, 0, 30);
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
        var max_radius = d3.scale.pow().exponent(0.5).domain([0, 120000]).range([100, 60]);
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

        this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
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
        var data = [{ value: 30, label: "Calls" }, { value: 30, label: "SMS" }, { value: 60, label: "Bluetooth"}];

        var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(100);
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
		    }
		});

        //Draw the legend labels
        g.append("text")
		.attr("x", function (d, i) {
		    return -80 + i * 70;
		})
		.attr("y", 350)
		.attr("id", function (d) {
		    return d.data.label;
		})
		.text(function (d) {
		    return d.data.label;
		});
        //Draw the legend circles
        g.append("circle")
		.attr("cy", 345)
		.attr("cx", function (d, i) {
		    return -90 + i * 70;
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
        var button = this.vis.append("rect")
		.attr("id", "unzoom")
		.attr("x", 290 + chart.center.x)
		.attr("y", 205 + chart.center.y)
		.attr("rx", 3)
		.attr("ry", 3)
		.attr("width", 10)
		.attr("height", 10)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 2)
		.on("click", function () {
		    chart.unzoom_circle();
		})
		.on("mouseover", function () {
		    button.attr("fill", "#ffffff");
		})
		.on("mouseout", function () {
		    button.attr("fill", "#dddddd");
		});
    };

    BubbleChart.prototype.undraw_pie_chart = function (chart) {
        var radius = chart.zoomed_radius;
        var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(100);
        var g = chart.vis.selectAll("path");


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
        value = 0.7;
        var scale = value >= 1 ?
							d3.scale.pow().exponent(0.5).domain([1, 2]).range([chart.center.x - 2, chart.center.x + 198]).clamp(true) :
							d3.scale.pow().exponent(0.5).domain([1, 0]).range([chart.center.x - 2, chart.center.x - 202]).clamp(true);

        var group = chart.vis.append("g")
		.attr("id", "ccscale");

        group.append("rect")
		.attr("x", chart.center.x - 200)
		.attr("y", chart.height - 47)
		.attr("width", 400)
		.attr("height", 10)
		.attr("fill", "#aaaaaa");

        group.append("rect")
		.attr("x", chart.center.x - 2)
		.attr("y", chart.height - 50)
		.attr("width", 4)
		.attr("height", 10)
		.attr("fill", "#000000")
		.transition()
		.attr("x", scale(value))
		.duration(1000);
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
        }).attr("y", 90).attr("text-anchor", "middle").text(function (d) {
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
                content += minutes.toString();
            if (rest < 10)
                content += ":0" + rest + " time in call.</span><br/>";
            else
                content += rest + " time in call.</span><br/>";

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

        var load_screen = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_load");
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

    return BubbleChart;


})();


root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
	var chart=null;
	var token = "32d74aa9-211e-4bbd-b99d-9af5aebb370d";

	chart = new BubbleChart(token);
	return chart.show_loading_screen();
});

