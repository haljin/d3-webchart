var Timeline;

Timeline = (function () {
    function Timeline(token) {
        this.width = 1200;
        this.height = 150;
        this.token = token;
        this.data = null;
        this.svg = null;
        this.colors = { call: "#b1f413", sms: "#ffd314", bt: "#7f1ac3" };
        this.baseUrl = "http://localhost:5777/Sensible/data"
        this.load_data();

    };


    // calendar chart
    Timeline.prototype.draw_calendar = function () {
        var chart = this;
        this.svg = d3.select("#timeline").append("svg").attr("width", "100%").attr("height", "100%").attr("id", "svg_timeline").style("display", "inline-block");
        var toLabel = ["call", "sms", "bt"]
        var barPadding = 1;
        var dProcessor = new DataProcessor();
        var data = dProcessor.parse_timeline_data(chart.data);
        var n = 3, // number of layers
            m = data[0].length; // number of samples per layer
        var w = 1200,
            h = 100,
            my = d3.max(data, function (d) {
                return d3.max(d, function (d) {
                    return d.y0 + d.y;
                });
            }),
            mz = d3.max(data, function (d) {
                return d3.max(d, function (d) {
                    return d.y;
                });
            }),
            x = function (d) { return d.x * w / m; },
            y0 = function (d) { return h - d.y0 * h / my; },
            y1 = function (d) { return h - (d.y + d.y0) * h / my; },
            y2 = function (d) { return d.y * h / mz; }; // or `my` to not rescale



        var layers = chart.svg.selectAll("g.layer")
            .data(data)
          .enter().append("svg:g")
            .style("fill", function (d,i) {
                return chart.colors[toLabel[i]];
            })
            .attr("class", "layer")
            .attr("transform", function (d) { return "translate(" + "0,27)"; });

        var bars = layers.selectAll("g.bar")
            .data(function (d) { return d; })
          .enter().append("svg:g")
            .attr("class", "bar")
            .attr("transform", function (d, i) { return "translate(" + x(d, i) + ",0)"; });

        bars.append("svg:rect")
            .attr("width", x({ x: .9 }))
            .attr("height", 0)
          .transition()
            .delay(function (d, i) { return i * 5; })
            .attr("y", y1)
            .attr("height", function (d) { return y0(d) - y1(d); });     



        var xscale = d3.time.scale().range([0, chart.width]),
         yscale = d3.scale.linear().range([100, 0]);

        var xAxis = d3.svg.axis().scale(xscale).orient("bottom");

        var brush = d3.svg.brush()
            .x(xscale)
            .on("brush", brushed);

        //var date = new Date(Date.now()), ending = new Date(Date.now());
        //var starting = new Date(date.setMonth(date.getMonth() - 7))

        //brush.extent([starting,ending]);

        xscale.domain(/*[d3.min(data[0],function (d) { return d.date; }), ending]); */ d3.extent(data[0].map(function (d) { return d.date; })));
        yscale.domain([0, d3.max(data[0].map(function (d) { return d.y + d.y0; }))]);


        chart.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + 130 + ")")
            .call(xAxis);

        chart.svg.append("g")
            .attr("class", "x brush")
            .call(brush)
          .selectAll("rect")
            .attr("y", 20)
            .attr("height", 100 + 7);

        var label = chart.svg.append("svg:text")
        .attr("x", 500)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("id", "dates");

        function brushed() {
            label.text(brush.extent()[0].toDateString().split(" ")[1] + " " + brush.extent()[0].toDateString().split(" ")[2]
                + "  -  " + brush.extent()[1].toDateString().split(" ")[1] + " " + brush.extent()[1].toDateString().split(" ")[2]);
        }

    };


    Timeline.prototype.load_data = function () {
        var chart = this;
        var runOnce = false;

        //Load Call probe data
        d3.json(chart.baseUrl + "/collective/" + chart.token, function (data) {
            if (!runOnce) {
                runOnce = true;
                chart.data = data;
                chart.draw_calendar();
            }
        });
    };


    return Timeline;
})();