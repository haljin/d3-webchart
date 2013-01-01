var BubbleChart, root;

BubbleChart = (function() {
	function BubbleChart(data) {	
		var max_amount;	
		this.zoomed = false;
		this.clicked = null;
		this.data = data;
		this.width = 940;
		this.height = 600;
		this.zoomed_radius=100;
		this.tooltip = CustomTooltip("gates_tooltip", 240);
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
		this.vis = null;
		this.nodes = [];
		this.force = null;
		this.circles = null;
		
		this.fill_color = d3.scale.ordinal().domain(["low", "medium", "high"]).range(["#d84b2a", "#beccae", "#7aa25c"]);
		
		max_amount = d3.max(this.data, function(d) {
			return parseInt(d.total_amount);
		});
		
		this.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, 85]);
		
		
		this.create_nodes();
		this.create_vis();
	}
	
	BubbleChart.prototype.create_nodes = function() {
		var _this = this;
		this.data.forEach(function(d) {
			var node;
			node = {
				id: d.id,
				radius: _this.radius_scale(parseInt(d.total_amount)),
				value: d.total_amount,
				name: d.grant_title,
				org: d.organization,
				group: d.group,
				year: d.start_year,
				x: Math.random() * 900,
				y: Math.random() * 800
			};
			return _this.nodes.push(node);
		});
		return this.nodes.sort(function(a, b) {
			return b.value - a.value;
		});
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
		this.zoomed = true;
		
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
				chart.draw_pie_chart(chart);
		});
	};
	
	BubbleChart.prototype.unzoom_circle = function(d) {	
		var chart = this;
		var other_circles = this.circles;
		var new_circle =  this.vis.selectAll("#zoomed");		
		
		this.zoomed = false;		
		
		other_circles.transition().duration(2000).attr("fill", function(d) {
			return d3.rgb(chart.fill_color(d.group));
		}).attr("stroke-width", 2).attr("stroke", function(d) {
			return d3.rgb(chart.fill_color(d.group)).darker();
		});		
		
		new_circle
		.transition()
		.attr("cx",this.clicked.x)
		.attr("cy",this.clicked.y)
		.attr("r", 0)
		.duration(2000)
		.each('end',function(){
			new_circle.remove();
		});
		
	};
	
	BubbleChart.prototype.draw_pie_chart = function(chart) {
		
		var radius = chart.zoomed_radius;

		var color = d3.scale.ordinal()
		.range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
		
		var arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(0);
		
		var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.population; });
		
		var svg = chart.vis
		.append("g")
		.attr("transform", "translate(" + this.center.x+ "," +this.center.y + ")");
		
		d3.csv("data/data.csv", function(data) {		
			data.forEach(function(d) {
				d.population = +d.population;
			});
			
			var g = svg.selectAll(".arc")
			.data(pie(data))
			.enter().append("g")
			.attr("class", "arc");
			
			g.append("path")
			.attr("d", arc)
			.style("fill", function(d) { return color(d.data.age); })
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
                }
              })
            .on("mouseout", function(d){
              // Mouseout effect if no transition has started                
              if(this._listenToEvents){
                d3.select(this).transition()
                  .duration(150).attr("transform", "translate(0,0)"); 
              }
            });
			
			g.append("text")
			.attr("x", 300)
			.attr("y",function(d,i){
				return 150+i*15;
				})
			.text(function(d) { 
				return d.data.age; 
			});
			
			g.append("circle")
			.attr("cx",290)
			.attr("cy",function(d,i){
				return 145+i*15;
				})
			.attr("r",5)
			.attr("stroke", "#000")
        	.attr("stroke-width", 1)
			.attr("fill", function(d) { return color(d.data.age); })
			;
		
		});
	};
	
	BubbleChart.prototype.charge = function(d) {
		return -Math.pow(d.radius, 2.0) / 8;
	};
	
	BubbleChart.prototype.start = function() {
		return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
	};
	
	BubbleChart.prototype.display_group_all = function() {
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
	};
	
	BubbleChart.prototype.move_towards_center = function(alpha) {
		var _this = this;
		return function(d) {
			d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
			return d.y = d.y + (_this.center.y - d.y) * (_this.damper + 0.02) * alpha;
		};
	};
	
	BubbleChart.prototype.display_by_year = function() {
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
			content = "<span class=\"name\">Title:</span><span class=\"value\"> " + data.name + "</span><br/>";
			content += "<span class=\"name\">Amount:</span><span class=\"value\"> $" + (addCommas(data.value)) + "</span><br/>";
			content += "<span class=\"name\">Year:</span><span class=\"value\"> " + data.year + "</span>";
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


 function tweenIn(data) {
      var interpolation = d3.interpolate({startAngle: 0, endAngle: 0}, data);
      this._current = interpolation(0);
      return function(t) {
          return arc(interpolation(t));
      };
    }
	
	
root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
	var chart, render_vis,
	_this = this;
	chart = null;
	render_vis = function(csv) {
		chart = new BubbleChart(csv);
		chart.start();
		return root.display_all();
	};
	root.display_all = function() {
		return chart.display_group_all();
	};
	root.display_year = function() {
		return chart.display_by_year();
	};
	root.toggle_view = function(view_type) {
		if (view_type === 'year') {
			return root.display_year();
		} 
		else {
			return root.display_all();
		}
	};
	return d3.csv("data/gates_money.csv", render_vis);
});
