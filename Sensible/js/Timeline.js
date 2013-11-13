var Timeline;

Timeline = (function () {
    function Timeline(timelineData, webchartRef) {
        this.width = 1200;
        this.height = 150;
        this.data = timelineData;
        this.svg = null;
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.baseUrl = "http://localhost:5777/Sensible/data";
        this.webchartRef = webchartRef;

        this.draw_calendar();
        

    };


    // calendar chart
    Timeline.prototype.draw_calendar = function () {
        var chart = this;
        this.svg = d3.select("#timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_timeline").style("display", "inline-block");
        var toLabel = ["call", "sms", "bt"]
        var barPadding = 1;
        var data = DataProcessor.parse_timeline_data(chart.data);
        //TODO: HARDCODED BLAST TO THE PAST
        var date = new Date(Date.now()), ending = new Date(Date.now());
        ending.setHours(0);
        ending.setMinutes(0);
        var starting = d3.min(data[0], function (d) { return d.date; });//new Date(date.setMonth(date.getMonth() - 7));
       // var starting = new Date(1349958465000), ending = new Date(1369239142000);

        var n = 3, // number of layers
           m = data[2].length; // number of samples per layer
        var w = 1200,
            h = 100;       
        var xscale = d3.time.scale().range([0, chart.width]).domain([d3.min(data[0], function (d) { return d.date; }), ending]);
        var yscale = d3.scale.linear().range([100, 0]).domain([0, d3.max(data[2].map(function (d) { return d.y + d.y0; }))]);
        var xAxis = d3.svg.axis().scale(xscale).orient("bottom");

        var brush = d3.svg.brush()
            .x(xscale)
            .on("brush", brushed)
            .on("brushend", brushend)
            .extent([starting, ending]);
       
        var my = d3.max(data, function (d) {
            return d3.max(d, function (d) {
                return d.y0 + d.y;
            });
        }),
            y0 = function (d) { return h - d.y0 * h / my; },
            y1 = function (d) { return h - (d.y + d.y0) * h / my; };

        var newDate = new Date();
        var barInterval = xscale(new Date()) - xscale((new Date()).setDate(newDate.getDate() - 1)) - 1;

        var layers = chart.svg.selectAll("g.layer")
            .data(data)
            .enter().append("svg:g")
            .style("fill", function (d, i) {
                return chart.colors[toLabel[i]];
            })
            .attr("class", "layer")
            .attr("transform", function (d) { return "translate(0,7)"; });

        var bars = layers.selectAll("g.bar")
            .data(function (d) { return d; })
            .enter().append("svg:g")
            .attr("class", "bar")
            .attr("transform", function (d) {
                return "translate(" + xscale(d.date) + ",0)";
            });

        bars.append("svg:rect")
            .attr("x", 0)
            .attr("width", barInterval)
            .attr("height", 0)
            .transition()
            .delay(function (d, i) { return i * 5; })
            .attr("y", y1)
            .attr("height", function (d) { return y0(d) - y1(d); });            

        chart.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + 110 + ")")
            .call(xAxis);

        chart.svg.append("g")
            .attr("class", "x brush")
            .call(brush)
          .selectAll("rect")
            .attr("y", 5)
            .attr("height", 100 + 7);

        var label = chart.svg.append("svg:text")
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


    return Timeline;
})();