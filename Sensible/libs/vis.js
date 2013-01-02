var BubbleChart, root;

BubbleChart = (function() {
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
		this.zoomed_radius=200;
		this.vis = null;
		this.force = null;
		this.colors = ["#d84b2a", "#beccae", "#7aa25c"];
		this.fill_color = d3.scale.ordinal().domain(["call", "sms", "bt"]).range(this.colors);
		this.radius_scale;
		
		//Data fields
		this.token = token;
		this.baseUrl = "http://localhost:8000/Sensible/data"
		this.callData;
		this.smsData;
		this.btData;
		this.nodes = [];
		
		//Control fields		
		this.zoomed = false;
		this.clicked = null;		
		this.tooltip = CustomTooltip("gates_tooltip", 240);		
		this.circles = null;	
		this.startTime;
		this.endTime;
		this.mode = 0;
			
		
		this.load_data(this.startTime, this.endTime);
	}
	
	BubbleChart.prototype.load_data = function(start, end){
		var chart = this;
		var remaining = 3;
		var runOnce = [false, false, false];
		//Load Call probe data
		d3.json(chart.baseUrl + "/call_log/" + chart.token,  function(data) { 
			if(!runOnce[0])
			{
				runOnce[0] = true;
				chart.callData = data;
				if (!--remaining )
					chart.create_nodes();
			}
		});		
		//Load SMS probe data
		d3.json(chart.baseUrl + "/sms/" + chart.token,  function(data) { 
			if(!runOnce[1])
			{
				runOnce[1] = true;
				chart.smsData = data;
				if (!--remaining )
					chart.create_nodes();
			}
		});			
		//Load Bluetooth probe data
		d3.json(chart.baseUrl + "/bluetooth/" + chart.token,  function(data) { 
			if(!runOnce[2])
			{
				runOnce[2] = true;
				chart.btData = data;
				if (!--remaining )
					chart.create_nodes();
			}
		});	
	};
	
	
	BubbleChart.prototype.create_nodes = function() {
		var chart = this;
		var currElem = 0;
		//Helper functions to parse data and create data nodes
		var extractNumber = function(hash) {
			return hash.substring(17, hash.length-2)
		}
		var createNode = function (id, name, cScore, smsScore, bScore)
		{
			return {
				id: id,
				radius: 0,
				value: 0,
				callScore: cScore,
				smsScore: smsScore,
				btScore: bScore,
				name: name,
				x: Math.random() * 900,
				y: Math.random() * 800
			}
		}
		
		//Parse Call data
		chart.callData.forEach(function(d) {
			if(d.call.duration > 0 && d.call.name != "")
			{
				var node;
				var exists = false;
				chart.nodes.forEach(function(x) {
					if( x.name == extractNumber(d.call.name))
					{
						exists = true;
					}
				
				});
				if (!exists)
				{
					node = createNode(currElem, extractNumber(d.call.number), d.call.duration, 0, 0);
					currElem++;
					return chart.nodes.push(node);
				}			
			}	
			
		});	
		
		//Parse SMS data
		chart.smsData.forEach(function(d) {
			if ( d.message.person != "")
			{
				var node;
				var exists = false;
				chart.nodes.forEach(function(x) {
					if( x.name == extractNumber(d.message.person))
					{
						x.smsScore += 1;
						exists = true;
					}
				
				});
				if (!exists)
				{
					node = createNode(currElem, extractNumber(d.message.person), 0, 1, 0);
					currElem++;
					return chart.nodes.push(node);
				}			
			}			
		});	
		
		//Parse Bluetooth data
		chart.btData.forEach(function(d) {
			d.devices.forEach(function(x){
				if ( x.sensible_user_id != "" && x.sensible_user_id != null)
				{
					var node;
					var exists = false;
					chart.nodes.forEach(function(e) {
						if( e.name == x.sensible_user_id)
						{
							e.btScore += 1;
							exists = true;
						}
					
					});
					if (!exists)
					{
						node = createNode(currElem, x.sensible_user_id, 0, 0, 1);
						currElem++;
						return chart.nodes.push(node);
					}			
				}	
			})			
		});		
		
		
		var max_amount = 0;
		//Calculate value ("final score") for each node
		chart.nodes.forEach(function(d) {
			var scores = [d.callScore, d.smsScore, d.btScore];
			var toLabel = ["call", "sms", "bt"]
			var maxIndex = 0, maxValue = 0;		
			for(var i = 0; i<3; ++i)
				if(scores[i] > maxValue)
				{
					maxIndex = i;
					maxValue = scores[i];
				}
			
			
			d.value = d.callScore/2 + 5 * d.smsScore + d.btScore;
			d.group = toLabel[maxIndex];
			
			if (d.callScore + d.smsScore > 1.5 * d.btScore)
				d.type = "cyborg";
			else if ((d.callScore + d.smsScore) * 1.5 < d.btScore)
				d.type = "caveman";
			else
				d.type = "balanced";
			
			max_amount = d.value > max_amount? d.value : max_amount;
				
		});

		chart.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, 85]);			
		chart.nodes.forEach(function(d) {
			d.radius = chart.radius_scale(d.value)
		});				
		chart.nodes.sort(function(a, b) {
			return b.value - a.value;
		});
		
		chart.create_vis();
		chart.start();
		return chart.display_group_all();
		
	};
	
	BubbleChart.prototype.create_vis = function() {
		var chart = this;
		
		this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
		this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
			return d.id;
		});
		
		this.circles.enter().append("circle").attr("r", 0).attr("fill", function(d) {
			return chart.fill_color(d.group);
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker();
		}).attr("id", function(d) {
			return "bubble_" + d.id;
		}).on("mouseover", function(d, i) {
			return chart.show_details(d, i, this);
		}).on("mouseout", function(d, i) {
			return chart.hide_details(d, i, this);
		}).on("click",function(d, i) {
			if(chart.zoomed==false){
				chart.zoomed = true;
				chart.hide_details(d, i, this);
				return chart.zoom_circle(d);
			}
			else {
				chart.zoomed = false;
				return chart.unzoom_circle();
			}
		});		
		
		//Draw the button that allows splitting		
		var button = this.vis.append("rect")
		.attr("id", "split")
		.attr("x", this.center.x - 50)
		.attr("y", this.height - 35)
		.attr("rx", 10)
		.attr("ry", 10)
		.attr("width", 100)
		.attr("height", 30)
		.attr("fill", "#dddddd")
		.attr("stroke", "#aaaaaa")
		.attr("stroke-width", 2)
		.on("click", function() {
			if(!chart.zoomed)
				if(chart.mode == 0)
					chart.display_by_year();
				else
					chart.display_group_all();
		})
		.on("mouseover", function() {
			if(!chart.zoomed)
				button.attr("fill", "#ffffff");
		})
		.on("mouseout", function() {
			button.attr("fill", "#dddddd");
		});
		

		return this.circles.transition().duration(2000).attr("r", function(d) {
			return d.radius;
		});
	
	};
	
	BubbleChart.prototype.zoom_circle = function(d) {
		var chart = this;
		var other_circles = this.circles;	
		var new_circle = this.circles
						.data([{id: "zoomed"}], function(d) {
							return d.id;
						})
						.enter();		
		this.clicked = d; 
		//Darken other circles
		other_circles.transition().duration(2000).attr("fill", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker().darker().darker();
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker().darker().darker().darker();
		});
		
		//Create new zoomed circle
		return	new_circle.append("circle").attr("r", 10).attr("id", "zoomed")
		.attr("cx", d.x)
		.attr("cy", d.y)
		.attr("fill",this.fill_color(d.group))
		.attr("stroke-width", 2)
		.attr("stroke", d3.rgb(this.fill_color(d.group)).darker())
		.transition()
		.ease("elastic")
		.attr("cx",this.center.x)
		.attr("cy",this.center.y)
		.duration(2000)
		.attr("r", chart.zoomed_radius)
		.each('end',function(){
				chart.draw_pie_chart(chart,d);
		});
	};
	
	BubbleChart.prototype.unzoom_circle = function() {	
		var chart = this;
		var other_circles = this.circles;
		var new_circle =  this.vis.selectAll("#zoomed");		
		//Lighten other circles
		other_circles.transition().duration(2000).attr("fill", function(d) {
			return d3.rgb(chart.fill_color(d.group));
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker();
		});		
		//Destroy the pie chart, unzoom the circle
		chart.undraw_pie_chart(chart).each('end', function(){
			new_circle
			.transition()
			.attr("cx",chart.clicked.x)
			.attr("cy",chart.clicked.y)
			.attr("r", 0)
			.duration(2000)
			.each('start', function(){
				chart.vis.selectAll("#pie").remove();
				chart.vis.selectAll("#unzoom").remove();
			})
			.each('end',function(){
				new_circle.remove();				
			});
		});
		
	};
	
	BubbleChart.prototype.draw_pie_chart = function(chart,d) {
		var chart = this;
		var radius = chart.zoomed_radius;
		var color = d3.scale.ordinal()
		.range(this.colors);		
		var data = [{value:30, label: "Calls"}, {value:30, label: "SMS"}, {value:30, label: "Bluetooth"}];
		
		var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(0);		
		var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.value; });
		var toLabel = ["call", "sms", "bt"]
		
		var svg = chart.vis
		.append("g")
		.attr("transform", "translate(" + this.center.x + "," + this.center.y + ")")
		.attr("id","pie");		
		
		var g = svg.selectAll(".arc")
		.data(pie(data))
		.enter().append("g")
		.attr("class", "arc");
		
		g.append("path")
		.attr("d", arc)
		.style("fill", function(d,i) { return color(toLabel[i]); })
		.transition().duration(1000).attrTween("d", function(data)
		{
			var interpolation = d3.interpolate({startAngle: 0, endAngle: 0}, data);
			this._current = interpolation(0);
			return function(t) {
				return arc(interpolation(t));
			};
		})
		.each("end", function(){
			this._listenToEvents = true;
		});
  
		var paths = g.selectAll("path");
		 
		
		paths
		.on("mouseover", function(d){ 
			// Mouseover effect if no transition has started                
			if(this._listenToEvents){
			// Calculate angle bisector
			var ang = d.startAngle + (d.endAngle - d.startAngle)/2; 
			// Transformate to SVG space
			ang = (ang - (Math.PI / 2) ) * -1;

			// Calculate a 10% radius displacement
			var x = Math.cos(ang) * radius * 0.1;
			var y = Math.sin(ang) * radius * -0.1;

			d3.select(this).transition()
			.duration(250).attr("transform", "translate("+x+","+y+")"); 
			
			chart.vis.selectAll("#" + d.data.label)
			.attr("stroke-width", 2)
			.attr("r",6)
			.style("font-weight","bold");
				
			}
		  })
		.on("mouseout", function(d){
			// Mouseout effect if no transition has started                
			if(this._listenToEvents){
				d3.select(this).transition()
				.duration(150).attr("transform", "translate(0,0)"); 
				
				chart.vis.selectAll("#" + d.data.label)
				.attr("stroke-width", 1)
				.attr("r",5)
				.style("font-weight","normal");
			}
		});
		
		//Draw the legend labels
		g.append("text")
		.attr("x", 300)
		.attr("y",function(d,i){
			return 150+i*15;
		})
		.attr("id",function(d){
			return d.data.label;
		})
		.text(function(d) { 
			return d.data.label; 
		});
		//Draw the legend circles
		g.append("circle")
		.attr("cx",290)
		.attr("cy",function(d,i){
			return 145+i*15;
		})
		.attr("r",5)
		.attr("id",function(d){
			return d.data.label;
		})
		.attr("stroke", "#000")
		.attr("stroke-width", 1)
		.attr("fill", function(d, i) { 
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
		.on("click", function() {
			chart.zoomed = false;
			chart.unzoom_circle();
		})
		.on("mouseover", function() {
			button.attr("fill", "#ffffff");
		})
		.on("mouseout", function() {
			button.attr("fill", "#dddddd");
		});
	};
	
	BubbleChart.prototype.undraw_pie_chart = function(chart) {		
		var radius = chart.zoomed_radius;
		var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(0);		
		var g = chart.vis.selectAll("path");	
		
		
		return g.transition()
		.duration(1000)
		.attrTween("d", function(data){
			 data.startAngle = data.endAngle = (2 * Math.PI);      
			 var interpolation = d3.interpolate(this._current, data);
			 this._current = interpolation(0);
			 return function(t) {
				return arc(interpolation(t));
			 };
		})
		.remove();		
	};		
		

	BubbleChart.prototype.charge = function(d) {
		return -Math.pow(d.radius, 2.0) / 8;
	};
	
	BubbleChart.prototype.start = function() {
		return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
	};
	
	BubbleChart.prototype.display_group_all = function() {
		var chart = this;
		chart.mode = 0;
		this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function(e) {
			return chart.circles.each(chart.move_towards_center(e.alpha)).attr("cx", function(d) {
				return d.x;
			}).attr("cy", function(d) {
				return d.y;
			});
		});
		this.force.start();
		return this.hide_years();
	};
	
	BubbleChart.prototype.move_towards_center = function(alpha) {
		var chart = this;
		return function(d) {
			d.x = d.x + (chart.center.x - d.x) * (chart.damper + 0.02) * alpha;
			return d.y = d.y + (chart.center.y - d.y) * (chart.damper + 0.02) * alpha;
		};
	};
	
	BubbleChart.prototype.display_by_year = function() {			
		var chart = this;
		chart.mode = 1;
		this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function(e) {
			return chart.circles.each(chart.move_towards_year(e.alpha)).attr("cx", function(d) {
				return d.x;
			}).attr("cy", function(d) {
				return d.y;
			});
		});
		this.force.start();
		return this.display_years();
	};
	
	BubbleChart.prototype.move_towards_year = function(alpha) {
		var chart = this;
		return function(d) {
			var target;
			target = chart.year_centers[d.type];
			d.x = d.x + (target.x - d.x) * (chart.damper + 0.02) * alpha * 1.1;
			return d.y = d.y + (target.y - d.y) * (chart.damper + 0.02) * alpha * 1.1;
		};
	};
	
	BubbleChart.prototype.display_years = function() {
		var years, years_data, years_x;
		years_x = {
			"Cyborg": 160,
			"Balanced": this.width / 2,
			"Caveman": this.width - 160
		};
		years_data = d3.keys(years_x);
		years = this.vis.selectAll(".years").data(years_data);
		return years.enter().append("text").attr("class", "years").attr("x", function(d) {
			return years_x[d];
		}).attr("y", 40).attr("text-anchor", "middle").text(function(d) {
			return d;
		});
	};
	
	BubbleChart.prototype.hide_years = function() {
		var years;
		return years = this.vis.selectAll(".years").remove();
	};
	
	BubbleChart.prototype.show_details = function(data, i, element) {
		if(!this.zoomed)
		{
			var content;
			d3.select(element).attr("stroke", "black");
			content = "<span class=\"name\">ID:</span><span class=\"value\"> " + data.name + "</span><br/>";
			content += "<span class=\"name\">Calls:</span><span class=\"value\">" + (addCommas(data.callScore)) + "</span><br/>";
			content += "<span class=\"name\">Sms:</span><span class=\"value\">" + (addCommas(data.smsScore)) + "</span><br/>";
			content += "<span class=\"name\">Bt:</span><span class=\"value\">" + (addCommas(data.btScore)) + "</span><br/>";
			return this.tooltip.showTooltip(content, d3.event);
		}
	};	
	
	BubbleChart.prototype.hide_details = function(data, i, element) {
		var chart = this;
		if(!this.zoomed)
		{
			d3.select(element).attr("stroke", function(d) {
				return d3.rgb(chart.fill_color(d.group)).darker();
			});
		}
		return this.tooltip.hideTooltip();
		};	
	return BubbleChart;

})();


root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
	var chart=null;
	var token = "cf6b8394-cd5c-4431-a5f0-cfeee033262e";

	chart = new BubbleChart(token);
});

