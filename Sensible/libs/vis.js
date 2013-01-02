var BubbleChart, root,blocked=false;

BubbleChart = (function() {
	function BubbleChart(token) {	
	
		//Layout fields
		this.width = 940;
		this.height = 600;
		this.center = {
			x: this.width / 2,
			y: this.height / 2
		};
		this.year_centers = {
			"2008": {
				x: this.width / 3,
				y: this.height / 2
			},
			"2009": {
				x: this.width / 2,
				y: this.height / 2
			},
			"2010": {
				x: 2 * this.width / 3,
				y: this.height / 2
			}
		};
		this.layout_gravity = -0.01;
		this.damper = 0.1;
		this.zoomed_radius=100;
		this.vis = null;
		this.force = null;
		this.colors = ["#d84b2a", "#beccae", "#7aa25c"];
		this.fill_color = d3.scale.ordinal().domain(["call", "sms", "bt"]).range(this.colors);
		this.radius_scale;
		
		//Data fields
		this.token = token;
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
			
		
		this.load_data(this.startTime, this.endTime);

	}
	
	BubbleChart.prototype.load_data = function(start, end){
		var chart = this;
		var remaining = 3;
		var runOnce = [false, false, false];
		
		d3.json("http://localhost:8000/Sensible/data/call_log/" + chart.token,  function(data) { 
			if(!runOnce[0])
			{
				runOnce[0] = true;
				chart.callData = data;
				if (!--remaining )
					chart.create_nodes();
			}
		});		
			
		d3.json("http://localhost:8000/Sensible/data/sms/" + chart.token,  function(data) { 
			if(!runOnce[1])
			{
				runOnce[1] = true;
				chart.smsData = data;
				if (!--remaining )
					chart.create_nodes();
			}
		});			
				
		d3.json("http://localhost:8000/Sensible/data/bluetooth/" + chart.token,  function(data) { 
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
		var extractNumber = function(hash) {
			return hash.substring(16, hash.length-2)
		}
		var createNode = function (id, name, cScore, smsScore, bScore)
		{
			return {
				id: id,
				radius: 0,//_this.radius_scale(parseInt(d.total_amount)),
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
		var that,
		_this = this;
		
		this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
		this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
			return d.id;
		});
		that = this;
		this.circles.enter().append("circle").attr("r", 0).attr("fill", function(d) {
			return _this.fill_color(d.group);
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(_this.fill_color(d.group)).darker();
		}).attr("id", function(d) {
			return "bubble_" + d.id;
		}).on("mouseover", function(d, i) {
			return that.show_details(d, i, this);
		}).on("mouseout", function(d, i) {
			return that.hide_details(d, i, this);
		}).on("click",function(d, i) {
			if(that.zoomed==false){
				that.zoomed = true;
				that.hide_details(d, i, this);
				return that.zoom_circle(d);
			}
			else 
			{
				that.zoomed = false;
				return that.unzoom_circle(d);
			}
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
		this.zoomed = true;
		
		other_circles.transition().duration(2000).attr("fill", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker().darker().darker();
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker().darker().darker().darker();
		});
		
		blocked=true;
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
	
	BubbleChart.prototype.unzoom_circle = function(d) {	
		var chart = this;
		var other_circles = this.circles;
		var new_circle =  this.vis.selectAll("#zoomed");		
		
		this.zoomed = false;		
		blocked=false;
		other_circles.transition().duration(2000).attr("fill", function(d) {
			return d3.rgb(chart.fill_color(d.group));
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker();
		});		
		
		chart.undraw_pie_chart(chart).each('end', function(){
			new_circle
			.transition()
			.attr("cx",chart.clicked.x)
			.attr("cy",chart.clicked.y)
			.attr("r", 0)
			.duration(2000)
			.each('start', function(){
				chart.vis.selectAll("#pie").remove();
			})
			.each('end',function(){
				new_circle.remove();				
			});
		});
		
	};
	
	BubbleChart.prototype.draw_pie_chart = function(chart,d) {
		
		var radius = chart.zoomed_radius;
		var color = d3.scale.ordinal()
		.range(this.colors);
		//var data = [d.callData, d.smsData, d.btData];
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
		.attr("fill", function(d, i) { return color(toLabel[i]); });		
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
		if(!this.zoomed){

			var _this = this;
			this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function(e) {
				return _this.circles.each(_this.move_towards_center(e.alpha)).attr("cx", function(d) {
					return d.x;
				}).attr("cy", function(d) {
					return d.y;
				});
			});
			this.force.start();
			return this.hide_years();
		}
	};
	
	BubbleChart.prototype.move_towards_center = function(alpha) {
		var _this = this;
		return function(d) {
			d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
			return d.y = d.y + (_this.center.y - d.y) * (_this.damper + 0.02) * alpha;
		};
	};
	
	BubbleChart.prototype.display_by_year = function() {
		if(!this.zoomed){

			var _this = this;
			this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", function(e) {
				return _this.circles.each(_this.move_towards_year(e.alpha)).attr("cx", function(d) {
					return d.x;
				}).attr("cy", function(d) {
					return d.y;
				});
			});
			this.force.start();
			return this.display_years();
		}
	};
	
	BubbleChart.prototype.move_towards_year = function(alpha) {
		var _this = this;
		return function(d) {
			var target;
			target = _this.year_centers[d.year];
			d.x = d.x + (target.x - d.x) * (_this.damper + 0.02) * alpha * 1.1;
			return d.y = d.y + (target.y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
		};
	};
	
	BubbleChart.prototype.display_years = function() {
		var years, years_data, years_x,
		_this = this;
		years_x = {
			"Bluetooth": 160,
			"Call": this.width / 2,
			"SMS": this.width - 160
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
		var _this = this;
		if(!this.zoomed)
		{
			d3.select(element).attr("stroke", function(d) {
				return d3.rgb(_this.fill_color(d.group)).darker();
			});
		}
		return this.tooltip.hideTooltip();
		};	
	return BubbleChart;

})();


root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
	var chart=null, render_vis;
	var token = "cf6b8394-cd5c-4431-a5f0-cfeee033262e";
	render_vis = function() {
		chart = new BubbleChart(token);
	};
	
	root.display_all = function() {
			return chart.display_group_all();
	};
	root.display_year = function() {
		return chart.display_by_year();
	};
	root.toggle_view = function(view_type) {
		if(!chart.zoomed)
		{
			if (view_type === 'year') {
				return root.display_year();
			} 
			else {
				return root.display_all();
			}
		}
	};
	render_vis();
});

$(document).ready(function() {
        $(document).ready(function() {
          $('#view_selection a').click(function() {
			  if(!blocked){
			  
				var view_type = $(this).attr('id');
				$('#view_selection a').removeClass('active');
				$(this).toggleClass('active');
				toggle_view(view_type);
				return false;
			  }
          });
        });
    });
