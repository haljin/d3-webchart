var Timeline;

Timeline = (function () {
    function Timeline(timelineData, webchartRef) {
        this.width = 1100;
        this.height = 150;
        this.data = DataProcessor.parse_timeline_data(timelineData);
        this.svg = d3.select("#timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_timeline").style("display", "inline-block");
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.baseUrl = "http://localhost:5777/Sensible/data";
        this.webchartRef = webchartRef;
        this.shapes = {
            call: "04,00 08,04 05,07 05,08 13,16 14,16 17,13 21,16 17,21 12,21 00,09 00,04 04,00",
            sms: "00,00 25,00 25,15 00,15 00,00 13,7 25,00",
            bt: "00,07 05,10 05,00 12,05 05,10 12,15 05,20 05,10 00,13"
        };

        var date = new Date(Date.now());

        this.ending = new Date(Date.now());
        this.ending.setHours(0);
        this.ending.setMinutes(0);
        this.starting = new Date(date.setMonth(date.getMonth() - 3));
        this.mode = "bt";

        this.draw_buttons();
        this.draw_calendar(this.mode);
    };


    // calendar chart
    Timeline.prototype.draw_calendar = function (mode) {
        var chart = this;
        this.mode = mode;
        d3.selectAll("#timelineBars").remove();
        
        var toLabel = ["call", "sms", "bt"]
        var barPadding = 1;
        var dataToDraw;

        switch (mode) {
            case "bt":
                dataToDraw = chart.data[2];
                break;
            case "sms":
                dataToDraw = chart.data[1];
                break;
            case "call":
                dataToDraw = chart.data[0];
                break;
        }
        

        var n = 3, // number of layers
           m = this.data[0].length; // number of samples per layer
        var w = 1000,
            h = 100;       
        var xscale = d3.time.scale().range([0, chart.width]).domain([d3.min(dataToDraw, function (d) { return d.date; }), this.ending]);
        var yscale = d3.scale.linear().range([100, 0]).domain([0, d3.max(dataToDraw.map(function (d) { return d.y; }))]);
        var xAxis = d3.svg.axis().scale(xscale).orient("bottom");

        var brush = d3.svg.brush()
            .x(xscale)
            .on("brush", brushed)
            .on("brushend", brushend)
            .extent([this.starting, this.ending]);
       
        var my = d3.max(dataToDraw, function (d) {
            return d.y;
        }),
        y0 = function (d) { return h},
        y1 = function (d) { return h - (d.y /*+ d.y0*/) * h / my; };

        var newDate = new Date();
        var barInterval = xscale(new Date()) - xscale((new Date()).setDate(newDate.getDate() - 1)) - 1;


        var barGrp = chart.svg.append("g")
        .attr("id", "timelineBars")
        .attr("class", "barchart");

        barGrp.selectAll("rect")
            .data(dataToDraw)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("width", barInterval)
            .attr("class", "bar")
            .attr("transform", function (d) {
                return "translate(" + xscale(d.date) + ",7)";
            })
            .style("fill", function (d, i) {
                return chart.colors[mode];
            })
            .attr("height", 0)
            .transition()
            .delay(function (d, i) { return i * 5; })
            .attr("y", y1)
            .attr("height", function (d) {
                return h - y1(d);
            });

        barGrp.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + 110 + ")")
            .call(xAxis);

        barGrp.append("g")
            .attr("class", "x brush")
            .call(brush)
          .selectAll("rect")
            .attr("y", 5)
            .attr("height", 100 + 7);

        var label = barGrp.append("svg:text")
            .attr("x", 500)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .attr("id", "dates")
            .text(brush.extent()[0].toDateString().split(" ")[1] + " " + brush.extent()[0].toDateString().split(" ")[2]
                + "  -  " + brush.extent()[1].toDateString().split(" ")[1] + " " + brush.extent()[1].toDateString().split(" ")[2])
            .attr("transform", "translate(100," + 145 + ")");


        function brushed() {
            label.text(brush.extent()[0].toDateString().split(" ")[1] + " " + brush.extent()[0].toDateString().split(" ")[2]
                + "  -  " + brush.extent()[1].toDateString().split(" ")[1] + " " + brush.extent()[1].toDateString().split(" ")[2])
            .attr("transform", "translate(100," + 145 + ")");
        }

        function brushend() {
            chart.webchartRef.startTime = brush.extent()[0].valueOf() / 1000;
            chart.webchartRef.endTime = brush.extent()[1].valueOf() / 1000;
            chart.webchartRef.update_nodes();
        }

    };

    Timeline.prototype.draw_buttons = function () {
        var chart = this;
        var buttons = this.svg.selectAll(".barbutton").data(["call","sms","bt"]).enter()
            .append("g")
            .attr("class", "barbutton")
            .attr("transform", function (d, i) { return "translate(1120," + (i * 37) + ")";
            })
            .on("mouseover", function (d) {
                d3.select(this).select("polyline").style("stroke-width", "3px");
                d3.select(this).select("rect").style("stroke-width", "1px").style("fill", "#dddddd");
            })
            .on("mouseout", function (d) {
                d3.select(this).select("polyline").style("stroke-width", "2px");
                d3.select(this).select("rect").style("stroke-width", "0px").style("fill",
                    function (d) { if (d == chart.mode) return "#eeeeee"; else return "#ffffff" });
            })
            .on("click", function (x) {
                if (x != chart.mode) {
                    chart.draw_calendar(x);
                    buttons.selectAll("rect").style("fill", function (d) { if (d == chart.mode) return "#eeeeee"; else return "#ffffff"; });
                }
            });

        buttons.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 31)
            .attr("height", 31)
            .style("fill", function (d) { if (d == chart.mode) return "#eeeeee"; else return "#ffffff"; });
        buttons.append("polyline")
           .attr("transform", function (d, i) {
               switch (i) {
                   case 0:
                       return "translate(5, 5)";
                   case 1:
                       return "translate(3, 7)";
                   case 2:
                       return "translate(7, 4)";
               }
           })
            .attr("stroke", function (d) {
                return chart.colors[d];
            })
            .style("stroke-width", "2px")
           .style("fill", "none")
           .attr("points", function (d) {
               return chart.shapes[d];
           });

    }

    return Timeline;
})();